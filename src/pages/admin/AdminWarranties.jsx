import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, Copy, Eye, EyeOff, Award, Shield, CheckCircle, 
  Calendar, Archive, RotateCcw, Settings, Layers, Activity, X, 
  Search, Check, ExternalLink, Sparkles, AlertCircle, RefreshCw, Info, HelpCircle
} from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { getCategoryLabel } from '../../utils/categoryLabels';
import { 
  saveWarranty, 
  deleteWarranty, 
  archiveWarranty, 
  restoreWarranty, 
  duplicateWarranty,
  saveWarrantyAssignment,
  deleteWarrantyAssignment
} from '../../services/warrantyService';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const DURATIONS = ['No Warranty', '1 Month', '3 Months', '6 Months', '12 Months', 'Lifetime'];
const ICONS = ['ShieldCheck', 'Award', 'CheckCircle', 'Sparkles', 'Shield', 'Layers'];
const COLORS = [
  { value: 'gold', label: 'Luxury Gold', bg: 'bg-gold-50 border-gold-200 text-gold-700', badge: 'bg-gold-500 text-white' },
  { value: 'silver', label: 'Platinum Silver', bg: 'bg-slate-50 border-slate-200 text-slate-700', badge: 'bg-slate-500 text-white' },
  { value: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', badge: 'bg-emerald-500 text-white' },
  { value: 'blue', label: 'Royal Blue', bg: 'bg-blue-50 border-blue-200 text-blue-700', badge: 'bg-blue-500 text-white' },
  { value: 'rose', label: 'Rose Gold', bg: 'bg-rose-50 border-rose-200 text-rose-700', badge: 'bg-rose-500 text-white' },
  { value: 'dark', label: 'Luxury Black', bg: 'bg-luxury-900 border-luxury-900 text-white', badge: 'bg-luxury-950 text-gold-400' }
];

const CATEGORIES = ['Gold', 'Silver', 'Lux Wear', 'Party Wear', 'Elegant Spark'];

const EMPTY_WARRANTY = {
  name: '',
  duration: '3 Months',
  coverage: '',
  exclusions: '',
  terms: '',
  replacementPolicy: '',
  repairPolicy: '',
  eligibility: '',
  badge: '',
  icon: 'ShieldCheck',
  color: 'gold',
  priority: 0,
  status: 'active',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  displayOrder: 0
};

const EMPTY_ASSIGNMENT = {
  warrantyId: '',
  type: 'category',
  target: 'Lux Wear',
  enabled: true
};

export default function AdminWarranties() {
  const { warranties, warrantyAssignments, products } = useProducts();
  const { user, isAdmin } = useAuth();
  
  const [activeTab, setActiveTab] = useState('templates');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState(EMPTY_WARRANTY);
  const [changeReason, setChangeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Assignment states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGNMENT);
  const [assignReason, setAssignReason] = useState('');

  // History/Audit states
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [assignSearchQuery, setAssignSearchQuery] = useState('');

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistoryLogs();
    }
  }, [activeTab]);

  const loadHistoryLogs = async () => {
    setHistoryLoading(true);
    try {
      const q = query(collection(db, 'warranty_history'), orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      const logs = [];
      snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
      setHistoryLogs(logs);
    } catch (err) {
      console.error('Failed to load history logs:', err);
      toast.error('Failed to load audit logs.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const adminInfo = useMemo(() => {
    if (!user) return null;
    return {
      id: user.uid,
      email: user.email,
      name: user.displayName || user.email.split('@')[0]
    };
  }, [user]);

  // Unique collections list from products
  const productCollections = useMemo(() => {
    const colls = new Set();
    products.forEach(p => {
      const name = p.collectionName || p.collection;
      if (name && name.trim()) colls.add(name.trim());
    });
    return Array.from(colls);
  }, [products]);

  // Unique brands list from products
  const productBrands = useMemo(() => {
    const brands = new Set();
    products.forEach(p => {
      const name = p.brand || p.brandName;
      if (name && name.trim()) brands.add(name.trim());
    });
    return Array.from(brands);
  }, [products]);

  // Filter templates list
  const filteredTemplates = useMemo(() => {
    return warranties.filter(w => {
      const q = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.duration.toLowerCase().includes(q) ||
        (w.coverage || '').toLowerCase().includes(q)
      );
    });
  }, [warranties, searchQuery]);

  // Filter assignments list
  const filteredAssignments = useMemo(() => {
    return warrantyAssignments.filter(a => {
      const q = assignSearchQuery.toLowerCase();
      const warName = warranties.find(w => w.id === a.warrantyId)?.name || '';
      return (
        a.target.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        warName.toLowerCase().includes(q)
      );
    });
  }, [warrantyAssignments, warranties, assignSearchQuery]);

  // --- TEMPLATE CRUD ACTIONS ---

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(EMPTY_WARRANTY);
    setChangeReason('');
    setShowTemplateModal(true);
  };

  const openEditTemplate = (w) => {
    setEditingTemplate(w);
    setTemplateForm({
      ...EMPTY_WARRANTY,
      ...w
    });
    setChangeReason('');
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!changeReason.trim()) {
      toast.warning('Please provide a reason for this change for the audit log.');
      return;
    }
    setSubmitting(true);
    try {
      await saveWarranty(templateForm, adminInfo, changeReason.trim());
      toast.success(editingTemplate ? 'Warranty template updated!' : 'Warranty template created!');
      setShowTemplateModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save warranty template.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveTemplate = async (w) => {
    const reason = window.prompt(`Archive "${w.name}"? Enter archive reason:`);
    if (reason === null) return;
    if (!reason.trim()) {
      toast.warning('Archive reason is required.');
      return;
    }
    try {
      await archiveWarranty(w.id, adminInfo, reason.trim());
      toast.success(`Warranty "${w.name}" archived.`);
    } catch (err) {
      toast.error('Failed to archive warranty.');
    }
  };

  const handleRestoreTemplate = async (w) => {
    const reason = window.prompt(`Restore "${w.name}"? Enter restore reason:`);
    if (reason === null) return;
    if (!reason.trim()) {
      toast.warning('Restore reason is required.');
      return;
    }
    try {
      await restoreWarranty(w.id, adminInfo, reason.trim());
      toast.success(`Warranty "${w.name}" restored.`);
    } catch (err) {
      toast.error('Failed to restore warranty.');
    }
  };

  const handleDeleteTemplate = async (w) => {
    if (!window.confirm(`Permanently delete "${w.name}"? This will clear all product, category, and collection mappings referencing this warranty. This cannot be undone.`)) return;
    const reason = window.prompt('Enter deletion reason for audit history:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.warning('Deletion reason is required.');
      return;
    }
    try {
      await deleteWarranty(w.id, adminInfo, reason.trim());
      toast.success(`Warranty "${w.name}" permanently deleted.`);
    } catch (err) {
      toast.error('Failed to delete warranty.');
    }
  };

  const handleDuplicateTemplate = async (w) => {
    const reason = `Duplicated from template "${w.name}"`;
    try {
      const dupId = await duplicateWarranty(w.id, adminInfo, reason);
      toast.success(`Duplicated warranty created successfully.`);
    } catch (err) {
      toast.error('Failed to duplicate warranty.');
    }
  };

  // --- ASSIGNMENT ACTIONS ---

  const openAddAssignment = () => {
    const activeWarrs = warranties.filter(w => w.status === 'active');
    if (activeWarrs.length === 0) {
      toast.warning('Please create and publish an active warranty template first.');
      return;
    }
    setAssignForm({
      ...EMPTY_ASSIGNMENT,
      warrantyId: activeWarrs[0].id
    });
    setAssignReason('');
    setShowAssignModal(true);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!assignReason.trim()) {
      toast.warning('Please provide a reason for this assignment.');
      return;
    }
    try {
      await saveWarrantyAssignment(assignForm, adminInfo, assignReason.trim());
      toast.success('Warranty assignment created!');
      setShowAssignModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save assignment.');
    }
  };

  const handleDeleteAssignment = async (a) => {
    if (!window.confirm(`Remove warranty assignment targeting ${a.type} "${a.target}"?`)) return;
    const reason = window.prompt('Enter deletion reason for audit history:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.warning('Reason is required.');
      return;
    }
    try {
      await deleteWarrantyAssignment(a.id, adminInfo, reason.trim());
      toast.success('Assignment deleted.');
    } catch (err) {
      toast.error('Failed to delete assignment.');
    }
  };

  // --- HELPER RENDERS ---

  const getWarrantyIcon = (iconName) => {
    switch (iconName) {
      case 'ShieldCheck': return Shield;
      case 'Award': return Award;
      case 'CheckCircle': return CheckCircle;
      case 'Sparkles': return Sparkles;
      case 'Shield': return Shield;
      case 'Layers': return Layers;
      default: return Shield;
    }
  };

  const getSelectedColorStyles = (colorName) => {
    const c = COLORS.find(col => col.value === colorName) || COLORS[0];
    return c;
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-gold-500" />
            Warranty Details CMS
          </h1>
          <p className="text-sm text-luxury-500 mt-0.5">
            Manage warranty terms, policies, and target mapping rules. Fully database driven.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'templates' && (
            <button onClick={openAddTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:scale-102">
              <Plus className="w-4 h-4" /> Create Warranty Template
            </button>
          )}
          {activeTab === 'assignments' && (
            <button onClick={openAddAssignment} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:scale-102">
              <Plus className="w-4 h-4" /> Map Warranty Scope
            </button>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-luxury-200 bg-white p-1 rounded-xl shadow-sm max-w-md">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'templates'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <Award className="w-4 h-4" />
          Templates ({warranties.length})
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'assignments'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Scope Mapping ({warrantyAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'history'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          Audit Trail
        </button>
      </div>

      {/* ────────────────── 1. TEMPLATES TAB ────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-luxury-200 max-w-sm">
            <Search className="w-4 h-4 text-luxury-400" />
            <input 
              type="text" 
              placeholder="Search templates..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm outline-none bg-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(w => {
              const colorInfo = getSelectedColorStyles(w.color);
              const IconComp = getWarrantyIcon(w.icon);
              return (
                <div key={w.id} className={`flex flex-col bg-white border border-luxury-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative ${w.status === 'archived' ? 'opacity-65' : ''}`}>
                  {/* Color Banner */}
                  <div className={`h-2 w-full ${colorInfo.badge}`} />
                  
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorInfo.bg} border`}>
                            <IconComp className="w-4.5 h-4.5" />
                          </div>
                          <span className="font-semibold text-sm text-luxury-900 leading-tight">{w.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                          w.status === 'active' ? 'bg-green-100 text-green-800' : w.status === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {w.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 border-t border-luxury-100 pt-3">
                        <p className="text-xs text-luxury-600">
                          <strong className="text-luxury-900 font-bold">Duration:</strong> {w.duration}
                        </p>
                        <p className="text-xs text-luxury-600 line-clamp-2">
                          <strong className="text-luxury-900 font-bold">Coverage:</strong> {w.coverage || '—'}
                        </p>
                        {w.badge && (
                          <span className="inline-block mt-1 text-[10px] font-bold bg-luxury-100 text-luxury-800 px-2 py-0.5 rounded">
                            🏷️ Badge: {w.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-luxury-150 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEditTemplate(w)} className="p-2 rounded-lg border border-luxury-200 hover:border-gold-500 hover:text-gold-600 transition-colors" title="Edit Template">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDuplicateTemplate(w)} className="p-2 rounded-lg border border-luxury-200 hover:border-blue-500 hover:text-blue-600 transition-colors" title="Duplicate Template">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        {w.status === 'archived' ? (
                          <button onClick={() => handleRestoreTemplate(w)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-slate-700 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </button>
                        ) : (
                          <button onClick={() => handleArchiveTemplate(w)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 border hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-lg text-luxury-600 transition-all">
                            <Archive className="w-3.5 h-3.5" /> Archive
                          </button>
                        )}
                        <button onClick={() => handleDeleteTemplate(w)} className="p-2 text-red-500 hover:bg-red-55 rounded-lg transition-colors" title="Permanently Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTemplates.length === 0 && (
              <div className="col-span-full py-16 text-center text-luxury-400 bg-white border rounded-2xl">
                <Award className="w-10 h-10 mx-auto mb-2 text-luxury-300" />
                <p className="text-sm font-semibold">No templates found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────── 2. ASSIGNMENTS TAB ────────────────── */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-luxury-200 max-w-sm">
            <Search className="w-4 h-4 text-luxury-400" />
            <input 
              type="text" 
              placeholder="Search mappings..." 
              value={assignSearchQuery}
              onChange={(e) => setAssignSearchQuery(e.target.value)}
              className="w-full text-sm outline-none bg-transparent"
            />
          </div>

          <div className="bg-white border border-luxury-250 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-luxury-50 border-b border-luxury-200">
                  <tr className="text-xs font-bold text-luxury-600 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Target Range</th>
                    <th className="px-5 py-3.5">Assigned Warranty</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-luxury-100 text-sm">
                  {filteredAssignments.map(a => {
                    const matchedWarranty = warranties.find(w => w.id === a.warrantyId);
                    return (
                      <tr key={a.id} className="hover:bg-luxury-50/50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-gold-100 border border-gold-200 text-gold-700">
                              {a.type}
                            </span>
                            <span className="font-semibold text-luxury-900">{getCategoryLabel(a.target)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {matchedWarranty ? (
                            <div>
                              <p className="font-medium text-luxury-800">{matchedWarranty.name}</p>
                              <p className="text-[10px] text-luxury-400">Duration: {matchedWarranty.duration}</p>
                            </div>
                          ) : (
                            <span className="text-red-500 font-medium">Inactive Reference (ID: {a.warrantyId})</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                            a.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {a.enabled ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={() => handleDeleteAssignment(a)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete mapping">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-luxury-400 text-xs">
                        No warranty mappings configured. Map templates to apply them.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── 3. AUDIT TRAIL TAB ────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white border border-luxury-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-luxury-150 flex items-center justify-between">
            <h3 className="text-sm font-bold text-luxury-900">Warranty History & Logs</h3>
            <button onClick={loadHistoryLogs} className="p-2 rounded-lg border hover:bg-luxury-50 text-luxury-600 transition-colors" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-luxury-50 border-b border-luxury-150">
                <tr className="text-xs font-bold text-luxury-650 uppercase tracking-wider">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Admin</th>
                  <th className="px-5 py-3">Change Details</th>
                  <th className="px-5 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-100 text-xs">
                {historyLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-luxury-400">Loading history logs...</td></tr>
                ) : historyLogs.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-luxury-400">No logs found.</td></tr>
                ) : historyLogs.map(log => (
                  <tr key={log.id} className="hover:bg-luxury-50/40">
                    <td className="px-5 py-3 whitespace-nowrap text-luxury-500 font-medium">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-luxury-100 text-luxury-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-luxury-800">{log.adminName}</p>
                      <p className="text-[10px] text-luxury-400">{log.adminEmail}</p>
                    </td>
                    <td className="px-5 py-3 max-w-[320px] truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="px-5 py-3 font-medium text-luxury-700 italic max-w-[200px] truncate" title={log.reason}>
                      {log.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── TEMPLATE EDITOR MODAL ────────────────── */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row">
            
            {/* Form Section */}
            <form onSubmit={handleSaveTemplate} className="flex-1 p-6 space-y-4 border-r border-luxury-100">
              <div className="flex items-center justify-between pb-3 border-b border-luxury-150">
                <h2 className="text-lg font-bold text-luxury-900">
                  {editingTemplate ? 'Edit Warranty Template' : 'Create Warranty Template'}
                </h2>
                <button type="button" onClick={() => setShowTemplateModal(false)} className="p-1 rounded-lg text-luxury-400 hover:text-luxury-700 hover:bg-luxury-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Warranty Name*</label>
                  <input
                    type="text"
                    required
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g. 3 Months Brand Warranty"
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 focus:border-transparent bg-white text-luxury-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Duration*</label>
                  <select
                    value={templateForm.duration}
                    onChange={(e) => setTemplateForm({ ...templateForm, duration: e.target.value })}
                    className="w-full px-3 py-2.5 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800"
                  >
                    {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="12 Months">12 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={templateForm.badge}
                    onChange={(e) => setTemplateForm({ ...templateForm, badge: e.target.value })}
                    placeholder="e.g. Elite Brand Warranty"
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Icon</label>
                    <select
                      value={templateForm.icon}
                      onChange={(e) => setTemplateForm({ ...templateForm, icon: e.target.value })}
                      className="w-full px-3 py-2.5 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800"
                    >
                      {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Color Theme</label>
                    <select
                      value={templateForm.color}
                      onChange={(e) => setTemplateForm({ ...templateForm, color: e.target.value })}
                      className="w-full px-3 py-2.5 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800"
                    >
                      {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Priority</label>
                  <input
                    type="number"
                    value={templateForm.priority}
                    onChange={(e) => setTemplateForm({ ...templateForm, priority: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Display Order</label>
                  <input
                    type="number"
                    value={templateForm.displayOrder}
                    onChange={(e) => setTemplateForm({ ...templateForm, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Coverage Description</label>
                  <textarea
                    rows={2}
                    value={templateForm.coverage}
                    onChange={(e) => setTemplateForm({ ...templateForm, coverage: e.target.value })}
                    placeholder="e.g. Manufacturing defects only (plating fading, lock damage, etc.)"
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Exclusions</label>
                  <textarea
                    rows={1.5}
                    value={templateForm.exclusions}
                    onChange={(e) => setTemplateForm({ ...templateForm, exclusions: e.target.value })}
                    placeholder="e.g. Accidental damage, water damage, chemical fading"
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Terms & Conditions</label>
                  <textarea
                    rows={1.5}
                    value={templateForm.terms}
                    onChange={(e) => setTemplateForm({ ...templateForm, terms: e.target.value })}
                    placeholder="e.g. Invoice copy must be supplied to redeem warranty claim"
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Replacement Policy</label>
                    <input
                      type="text"
                      value={templateForm.replacementPolicy}
                      onChange={(e) => setTemplateForm({ ...templateForm, replacementPolicy: e.target.value })}
                      placeholder="e.g. Eligible for 10-day replacement"
                      className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm bg-white text-luxury-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Repair Policy</label>
                    <input
                      type="text"
                      value={templateForm.repairPolicy}
                      onChange={(e) => setTemplateForm({ ...templateForm, repairPolicy: e.target.value })}
                      placeholder="e.g. Free repair within 30 days"
                      className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm bg-white text-luxury-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Eligibility Rules</label>
                  <input
                    type="text"
                    value={templateForm.eligibility}
                    onChange={(e) => setTemplateForm({ ...templateForm, eligibility: e.target.value })}
                    placeholder="e.g. Original purchaser only, undamaged from external stress"
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm bg-white text-luxury-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-luxury-100">
                <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Reason for change (Required)*</label>
                <input
                  type="text"
                  required
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g. Initial setup / added exclusion clause"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-red-500 bg-white text-luxury-800"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Template'}
                </button>
                <button type="button" onClick={() => setShowTemplateModal(false)} className="px-6 py-2.5 rounded-xl border border-luxury-200 text-luxury-700 text-sm hover:bg-luxury-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>

            {/* Preview Section */}
            <div className="w-full md:w-80 bg-luxury-50 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-luxury-500 uppercase tracking-wider mb-4 pb-2 border-b">Live Preview Card</h3>
                
                {/* Visual Warranty Preview Simulation */}
                <div className={`p-4 rounded-xl border bg-white ${getSelectedColorStyles(templateForm.color).bg} transition-all`}>
                  <div className="flex items-start gap-2.5">
                    {(() => {
                      const IconComp = getWarrantyIcon(templateForm.icon);
                      return <IconComp className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />;
                    })()}
                    <div>
                      <p className="font-serif text-sm font-bold text-luxury-900 leading-tight">
                        {templateForm.name || 'Brand Warranty'}
                      </p>
                      {templateForm.badge && (
                        <span className="inline-block text-[8px] font-extrabold tracking-wide uppercase bg-gold-100 text-gold-800 px-1.5 py-0.5 rounded-full mt-1.5 border border-gold-200">
                          {templateForm.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between border-b border-luxury-50/50 pb-1.5">
                      <span className="font-bold text-luxury-500">Duration:</span>
                      <span className="font-semibold text-luxury-800">{templateForm.duration}</span>
                    </div>
                    {templateForm.coverage && (
                      <div className="space-y-0.5">
                        <span className="font-bold text-luxury-500 block">Coverage:</span>
                        <span className="text-luxury-800 text-[11px] leading-relaxed block">{templateForm.coverage}</span>
                      </div>
                    )}
                    {templateForm.exclusions && (
                      <div className="space-y-0.5">
                        <span className="font-bold text-luxury-500 block">Exclusions:</span>
                        <span className="text-luxury-850 text-[10px] leading-relaxed block">{templateForm.exclusions}</span>
                      </div>
                    )}
                    {templateForm.terms && (
                      <div className="space-y-0.5 pt-1.5 border-t border-luxury-50/50">
                        <span className="font-bold text-luxury-500 block">Terms & Rules:</span>
                        <span className="text-luxury-850 text-[10px] leading-relaxed block">{templateForm.terms}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 leading-relaxed flex gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This visual preview shows how the warranty information card will layout in your product details spec shelf.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ────────────────── ASSIGNMENT MODAL ────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveAssignment} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-luxury-150">
              <h2 className="text-lg font-bold text-luxury-900">Map Warranty Scope</h2>
              <button type="button" onClick={() => setShowAssignModal(false)} className="p-1 rounded-lg text-luxury-400 hover:text-luxury-700 hover:bg-luxury-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Select Active Warranty Template*</label>
                <select
                  required
                  value={assignForm.warrantyId}
                  onChange={(e) => setAssignForm({ ...assignForm, warrantyId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-luxury-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 bg-white text-luxury-800"
                >
                  {warranties.filter(w => w.status === 'active').map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.duration})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Assignment Scope*</label>
                <select
                  value={assignForm.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    let target = '';
                    if (type === 'category') target = CATEGORIES[0];
                    else if (type === 'collection') target = productCollections[0] || '';
                    else if (type === 'product') target = products[0]?.id || '';
                    else if (type === 'brand') target = productBrands[0] || 'PANSTELLIA';
                    
                    setAssignForm({
                      ...assignForm,
                      type,
                      target
                    });
                  }}
                  className="w-full px-3 py-2.5 border border-luxury-200 rounded-lg text-sm bg-white text-luxury-800"
                >
                  <option value="category">Entire Category</option>
                  <option value="collection">Entire Collection</option>
                  <option value="brand">Entire Brand</option>
                  <option value="product">Specific Product</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Select / Specify Target*</label>
                {assignForm.type === 'category' && (
                  <select
                    value={assignForm.target}
                    onChange={(e) => setAssignForm({ ...assignForm, target: e.target.value })}
                    className="w-full px-3 py-2.5 border border-luxury-200 rounded-lg text-sm bg-white text-luxury-800"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
                  </select>
                )}

                {assignForm.type === 'collection' && (
                  <select
                    value={assignForm.target}
                    onChange={(e) => setAssignForm({ ...assignForm, target: e.target.value })}
                    className="w-full px-3 py-2.5 border border-luxury-200 rounded-lg text-sm bg-white text-luxury-800"
                  >
                    {productCollections.map(c => <option key={c} value={c}>{c}</option>)}
                    {productCollections.length === 0 && <option value="">No collections found in products</option>}
                  </select>
                )}

                {assignForm.type === 'brand' && (
                  <input
                    type="text"
                    required
                    value={assignForm.target}
                    onChange={(e) => setAssignForm({ ...assignForm, target: e.target.value })}
                    placeholder="e.g. PANSTELLIA"
                    className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm bg-white text-luxury-800"
                  />
                )}

                {assignForm.type === 'product' && (
                  <select
                    value={assignForm.target}
                    onChange={(e) => setAssignForm({ ...assignForm, target: e.target.value })}
                    className="w-full px-3 py-2.5 border border-luxury-200 rounded-lg text-sm bg-white text-luxury-800"
                  >
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>)}
                  </select>
                )}
              </div>

              <div className="pt-2">
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={assignForm.enabled}
                    onChange={(e) => setAssignForm({ ...assignForm, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-luxury-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-luxury-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                  <span className="ml-3 text-xs font-bold text-luxury-700 uppercase tracking-wider">Mapping Enabled</span>
                </label>
              </div>

              <div className="pt-2 border-t border-luxury-100">
                <label className="block text-xs font-bold text-luxury-700 uppercase tracking-wider mb-1">Reason for assignment mapping*</label>
                <input
                  type="text"
                  required
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  placeholder="e.g. Mapping elite warranty to Lux Wear category"
                  className="w-full px-3 py-2 border border-luxury-200 rounded-lg text-sm bg-white text-luxury-800"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-luxury-100">
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all">
                Save Assignment Mapping
              </button>
              <button type="button" onClick={() => setShowAssignModal(false)} className="px-6 py-2.5 rounded-xl border border-luxury-200 text-luxury-700 text-sm hover:bg-luxury-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
