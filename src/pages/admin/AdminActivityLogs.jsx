import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity, RefreshCw, Download, X, Calendar,
  ShoppingBag, Package, Warehouse, Users,
  BarChart3, LayoutDashboard, Shield, AlertTriangle,
  CheckCircle2, XCircle, Clock, Eye,
} from 'lucide-react';
import {
  collection, query, orderBy, limit, startAfter,
  getDocs, where, Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import FilterBar from '../../components/admin/FilterBar';

const PAGE_SIZE = 25;

// ─── Config Maps ──────────────────────────────────────────────────────────────

const MODULE_CONFIG = {
  Orders: { icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  Products: { icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  Inventory: { icon: Warehouse, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  Customers: { icon: Users, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  Reports: { icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  Dashboard: { icon: LayoutDashboard, color: 'text-luxury-600', bg: 'bg-luxury-50', border: 'border-luxury-200' },
  System: { icon: Shield, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
};

const STATUS_CONFIG = {
  success: { label: 'Success', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
  security: { label: 'Security', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle },
};

const ACTION_LABELS = {
  ORDER_STATUS_CHANGED: 'Status Changed',
  ORDER_CANCELLED: 'Order Cancelled',
  ORDER_DELETED: 'Order Deleted',
  PRODUCT_CREATED: 'Product Created',
  PRODUCT_UPDATED: 'Product Updated',
  PRODUCT_DELETED: 'Product Deleted',
  PRODUCT_STATUS_CHANGED: 'Status Changed',
  STOCK_STATUS_CHANGED: 'Stock Updated',
  REPORT_EXPORTED: 'Report Exported',
  ADMIN_LOGIN: 'Admin Login',
  ADMIN_LOGOUT: 'Admin Logout',
  FAILED_ACTION: 'Failed Action',
  SECURITY_EVENT: 'Security Event',
};

const ALL_MODULES = ['All', 'Orders', 'Products', 'Inventory', 'Customers', 'Reports', 'Dashboard', 'System'];
const ALL_STATUSES = ['All', 'success', 'failed', 'security'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeToDate(v) {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatTs(date) {
  if (!date) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function getDateRangeStart(preset) {
  const now = new Date();
  const p = String(preset || '').toLowerCase();
  if (p === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (p === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (p === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconBg, iconColor, value, label, loading }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      {loading
        ? <div className="skeleton h-7 w-12 rounded-lg mb-1" />
        : <p className="text-2xl font-bold text-luxury-900">{value}</p>
      }
      <p className="text-xs text-luxury-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Module Badge ─────────────────────────────────────────────────────────────

function ModuleBadge({ module }) {
  const cfg = MODULE_CONFIG[module] || MODULE_CONFIG.System;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {module}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.success;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Detail Side Panel ────────────────────────────────────────────────────────

function DetailPanel({ log, onClose }) {
  if (!log) return null;
  const ts = safeToDate(log.timestamp);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-luxury-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-gold-500" />
            <h2 className="text-base font-bold text-luxury-900">Activity Detail</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-luxury-400 hover:text-luxury-700 hover:bg-luxury-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Description */}
          <div className="p-4 rounded-2xl bg-luxury-50 border border-luxury-200">
            <p className="text-sm font-semibold text-luxury-900">{log.description || '—'}</p>
            <p className="text-xs text-luxury-500 mt-1">{formatTs(ts)}</p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <ModuleBadge module={log.module} />
            <StatusBadge status={log.status} />
            {log.action && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-luxury-200 bg-white text-luxury-700">
                {ACTION_LABELS[log.action] || log.action}
              </span>
            )}
          </div>

          {/* Admin Info */}
          <Section title="Admin Information">
            <Row label="Name" value={log.adminName || '—'} />
            <Row label="Email" value={log.adminEmail || '—'} />
            <Row label="Admin ID" value={log.adminId || '—'} mono />
          </Section>

          {/* Record Info */}
          {(log.targetId || log.targetType) && (
            <Section title="Record Affected">
              {log.targetType && <Row label="Type" value={log.targetType} />}
              {log.targetId && <Row label="ID" value={log.targetId} mono />}
            </Section>
          )}

          {/* Value Changes */}
          {(log.oldValue || log.newValue) && (
            <Section title="Value Changes">
              {log.oldValue && (
                <div>
                  <p className="text-xs font-semibold text-luxury-500 mb-1">Previous Value</p>
                  <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 font-mono break-all">
                    {log.oldValue}
                  </div>
                </div>
              )}
              {log.newValue && (
                <div>
                  <p className="text-xs font-semibold text-luxury-500 mb-1 mt-3">New Value</p>
                  <div className="px-3 py-2 rounded-xl bg-green-50 border border-green-100 text-xs text-green-700 font-mono break-all">
                    {log.newValue}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Session / Device */}
          {log.metadata && (
            <Section title="Session Information">
              {log.metadata.sessionId && <Row label="Session" value={log.metadata.sessionId} mono />}
              {log.metadata.platform && <Row label="Platform" value={log.metadata.platform} />}
              {log.metadata.userAgent && (
                <div>
                  <p className="text-xs text-luxury-500 mb-0.5">User Agent</p>
                  <p className="text-xs text-luxury-700 font-mono break-all leading-relaxed">{log.metadata.userAgent}</p>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold text-luxury-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="border border-luxury-200 rounded-xl divide-y divide-luxury-100 bg-white">
        <div className="p-3 space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-luxury-500 w-20 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-xs text-luxury-900 font-medium flex-1 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminActivityLogs() {
  const { isAdmin, user } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Stats
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, failed: 0, security: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState('week');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Detail panel
  const [selectedLog, setSelectedLog] = useState(null);

  // ── Fetch Stats ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [todaySnap, weekSnap, monthSnap, failedSnap, secSnap] = await Promise.all([
        getDocs(query(collection(db, 'activity_logs'), where('timestamp', '>=', Timestamp.fromDate(todayStart)), limit(500))),
        getDocs(query(collection(db, 'activity_logs'), where('timestamp', '>=', Timestamp.fromDate(weekStart)), limit(500))),
        getDocs(query(collection(db, 'activity_logs'), where('timestamp', '>=', Timestamp.fromDate(monthStart)), limit(500))),
        getDocs(query(collection(db, 'activity_logs'), where('status', '==', 'failed'), limit(100))),
        getDocs(query(collection(db, 'activity_logs'), where('status', '==', 'security'), limit(100))),
      ]);

      setStats({
        today: todaySnap.size,
        week: weekSnap.size,
        month: monthSnap.size,
        failed: failedSnap.size,
        security: secSnap.size,
      });
    } catch {
      // Stats fail gracefully
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Build Query ──────────────────────────────────────────────────────────

  const buildQuery = useCallback((afterDoc = null) => {
    const constraints = [orderBy('timestamp', 'desc')];

    const start = getDateRangeStart(datePreset);
    if (start) constraints.push(where('timestamp', '>=', Timestamp.fromDate(start)));
    if (moduleFilter !== 'All') constraints.push(where('module', '==', moduleFilter));
    if (statusFilter !== 'All') constraints.push(where('status', '==', statusFilter));

    if (afterDoc) constraints.push(startAfter(afterDoc));
    constraints.push(limit(PAGE_SIZE));

    return query(collection(db, 'activity_logs'), ...constraints);
  }, [datePreset, moduleFilter, statusFilter]);

  // ── Initial Fetch ────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setLastDoc(null);
    try {
      const snap = await getDocs(buildQuery());
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch {
      toast.error('Failed to load activity logs. Check Firestore rules.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  // ── Load More ────────────────────────────────────────────────────────────

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const snap = await getDocs(buildQuery(lastDoc));
      const newLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLogs(prev => [...prev, ...newLogs]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch {
      toast.error('Failed to load more logs');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchLogs();
  }, [fetchLogs, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStats();
  }, [fetchStats, isAdmin]);

  // ── Client-side Search ───────────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(l =>
      (l.description || '').toLowerCase().includes(q) ||
      (l.adminName || '').toLowerCase().includes(q) ||
      (l.adminEmail || '').toLowerCase().includes(q) ||
      (l.targetId || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.module || '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  // ── CSV Export ───────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const rows = [
      ['Timestamp', 'Admin Name', 'Admin Email', 'Module', 'Action', 'Description', 'Target ID', 'Old Value', 'New Value', 'Status'],
      ...filteredLogs.map(l => {
        const ts = safeToDate(l.timestamp);
        return [
          ts ? ts.toLocaleString('en-IN') : '—',
          l.adminName || '—',
          l.adminEmail || '—',
          l.module || '—',
          l.action || '—',
          l.description || '—',
          l.targetId || '—',
          l.oldValue || '—',
          l.newValue || '—',
          l.status || '—',
        ];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} records`);
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-luxury-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-gold-500" />
            Activity Logs
          </h1>
          <p className="text-sm text-luxury-500 mt-0.5">Complete audit trail of all admin actions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchLogs(); fetchStats(); }}
            disabled={loading}
            className="p-2 rounded-xl border border-luxury-200 text-luxury-500 hover:bg-luxury-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-luxury-200 text-sm text-luxury-600 hover:bg-luxury-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Calendar} iconBg="bg-luxury-50" iconColor="text-luxury-600"
          value={stats.today} label="Today" loading={statsLoading} />
        <StatCard icon={Activity} iconBg="bg-blue-50" iconColor="text-blue-600"
          value={stats.week} label="This Week" loading={statsLoading} />
        <StatCard icon={BarChart3} iconBg="bg-purple-50" iconColor="text-purple-600"
          value={stats.month} label="This Month" loading={statsLoading} />
        <StatCard icon={XCircle} iconBg="bg-red-50" iconColor="text-red-600"
          value={stats.failed} label="Failed Actions" loading={statsLoading} />
        <StatCard icon={AlertTriangle} iconBg="bg-orange-50" iconColor="text-orange-600"
          value={stats.security} label="Security Events" loading={statsLoading} />
      </div>

      {/* Reusable Filter Bar */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search description, admin, record ID..."
        selects={[
          {
            key: 'module',
            label: 'All Modules',
            options: ALL_MODULES,
            value: moduleFilter,
            onChange: setModuleFilter,
          },
          {
            key: 'status',
            label: 'All Statuses',
            options: ALL_STATUSES,
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            key: 'datePreset',
            label: 'Date Filter',
            options: ['today', 'week', 'month', 'all'],
            value: datePreset,
            onChange: setDatePreset,
          },
        ]}
        sorts={[]} // Audit logs are strictly newest first
        activeFilterCount={(search ? 1 : 0) + (datePreset !== 'week' ? 1 : 0) + (moduleFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0)}
        onClearAll={() => {
          setSearch('');
          setDatePreset('week');
          setModuleFilter('All');
          setStatusFilter('All');
        }}
        resultCount={`${filteredLogs.length} record${filteredLogs.length !== 1 ? 's' : ''}`}
      />

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-luxury-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-luxury-50 border-b border-luxury-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Module</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-luxury-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-luxury-600 uppercase tracking-wider">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-luxury-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="skeleton h-5 rounded-lg" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Activity className="w-10 h-10 text-luxury-300 mx-auto mb-3" />
                    <p className="font-semibold text-luxury-700">No activity logs found</p>
                    <p className="text-sm text-luxury-400 mt-1">
                      Logs appear here after admin actions are performed.
                      {logs.length === 0 && ' Make sure Firebase rules are deployed.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const ts = safeToDate(log.timestamp);
                  const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.success;
                  const rowBg = log.status === 'failed'
                    ? 'hover:bg-red-50/30'
                    : log.status === 'security'
                    ? 'hover:bg-orange-50/30'
                    : 'hover:bg-luxury-50/50';

                  return (
                    <tr
                      key={log.id}
                      className={`${rowBg} transition-colors cursor-pointer`}
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-medium text-luxury-900">
                          {ts ? ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                        </p>
                        <p className="text-xs text-luxury-400">
                          {ts ? ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                        </p>
                      </td>

                      {/* Admin */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {(log.adminName?.[0] || 'A').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-luxury-900 truncate max-w-28">{log.adminName || 'Admin'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Module */}
                      <td className="px-4 py-3">
                        <ModuleBadge module={log.module} />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-luxury-700 font-medium">
                          {ACTION_LABELS[log.action] || log.action || '—'}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-luxury-700 truncate">{log.description || '—'}</p>
                        {log.targetId && (
                          <p className="text-[10px] text-luxury-400 font-mono mt-0.5 truncate">
                            ID: {log.targetId}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>

                      {/* View */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedLog(log); }}
                          className="p-1.5 rounded-lg text-luxury-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                          title="View detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {hasMore && !loading && (
          <div className="px-4 py-4 border-t border-luxury-100 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 rounded-xl border border-luxury-200 text-sm text-luxury-600 hover:bg-luxury-50 transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : `Load More (${PAGE_SIZE} per page)`}
            </button>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedLog && (
        <DetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
