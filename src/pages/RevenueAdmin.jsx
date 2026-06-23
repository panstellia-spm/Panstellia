import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where, startAfter } from 'firebase/firestore';


import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { DollarSign, Calendar, CreditCard, Search, ArrowUpDown, Loader2, AlertCircle } from 'lucide-react';


const PAGE_SIZE = 10;

function formatINRFromPaise(value) {

  try {
    const num = Number(value || 0);
    const rupees = num / 100;
    return `₹${rupees.toLocaleString('en-IN')}`;
  } catch {
    return '₹0';
  }
}


function safeToDate(maybeTs) {
  if (!maybeTs) return null;
  if (typeof maybeTs?.toDate === 'function') return maybeTs.toDate();
  const d = new Date(maybeTs);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isSameMonth(d, reference) {
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth();
}

function Badge({ variant, children }) {
  const cls =
    variant === 'paid'
      ? 'badge-success'
      : variant === 'failed'
        ? 'badge-error'
        : 'badge-warning';

  return (
    <span className={`badge ${cls}`}>
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return <Badge variant="paid">Paid</Badge>;
  if (s === 'failed') return <Badge variant="failed">Failed</Badge>;
  return <Badge variant="pending">Pending</Badge>;
}

export default function RevenueAdmin() {
  const { isAdmin } = useAuth();

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);

  const [payments, setPayments] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [search, setSearch] = useState('');
  const [sortKey] = useState('createdAt'); // latest date

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthRef = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    totalOrders: 0,
    successfulPayments: 0,
    successRate: 0,
  });

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    async function loadSummary() {
      setLoadingSummary(true);
      try {
        // For Spark-tier-friendly reads:
        // - We compute by fetching paid payments in two ranges for today and month.
        // - For total revenue and counts, we compute from paid + all payments up to a bounded limit.
        //   This keeps reads bounded while still being accurate in common usage.
        //
        // If you need strict totals across the entire collection, increase the fetch strategy (more reads).

        const paidRef = collection(db, 'payments');

        // Total revenue + counts: fetch last N payments (bounded)
        const latestQ = query(
          paidRef,
          orderBy('createdAt', 'desc'),
          limit(500)
        );
        const snapLatest = await getDocs(latestQ);
        const allDocs = snapLatest.docs.map(d => ({ id: d.id, ...d.data() }));

        const totalOrders = allDocs.length;
        const successfulPayments = allDocs.filter(p => (p.paymentStatus || '').toLowerCase() === 'paid').length;

        const totalRevenue = allDocs.reduce((sum, p) => {
          if ((p.paymentStatus || '').toLowerCase() === 'paid') return sum + Number(p.amount || 0);
          return sum;
        }, 0);

        // Fetch delivered paid orders (online payments) and add to revenue
        const ordersRef = collection(db, 'orders');
        const deliveredQ = query(
          ordersRef,
          where('status', '==', 'delivered'),
          where('paymentStatus', '==', 'paid'),
          limit(500)
        );
        const snapOrders = await getDocs(deliveredQ);
        const deliveredOrders = snapOrders.docs.map(d => ({ id: d.id, ...d.data() }));
        const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total || o.amount || 0), 0);
        const totalRevenueWithOrders = totalRevenue + deliveredRevenue;

        // Today revenue (payments only)
        const todayQ = query(
          paidRef,
          orderBy('createdAt', 'desc'),
          limit(500)
        );
        const snapToday = await getDocs(todayQ);
        const paidDocs = snapToday.docs.map(d => ({ id: d.id, ...d.data() }));
        const todayRevenue = paidDocs.reduce((sum, p) => {
          const d = safeToDate(p.createdAt);
          if (d && isSameDay(d, new Date())) return sum + Number(p.amount || 0);
          return sum;
        }, 0);

        // Month revenue (payments only)
        const monthRevenue = paidDocs.reduce((sum, p) => {
          const d = safeToDate(p.createdAt);
          if (d && isSameMonth(d, new Date())) return sum + Number(p.amount || 0);
          return sum;
        }, 0);

        // Use totalRevenueWithOrders for summary
        const finalTotalRevenue = totalRevenueWithOrders;

        const successRate = totalOrders > 0 ? Math.round((successfulPayments / totalOrders) * 100) : 0;

        if (!cancelled) {
          setSummary({
            totalRevenue: finalTotalRevenue,
            todayRevenue,
            monthRevenue,
            totalOrders,
            successfulPayments,
            successRate,
          });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) toast.error('Failed to load revenue summary');
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    }

    async function loadTable() {
      setLoadingTable(true);
      try {
        // Latest-first pagination
        const q = query(
          collection(db, 'payments'),
          orderBy(sortKey, 'desc'),
          limit(PAGE_SIZE)
        );
        const snap = await getDocs(q);
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPayments(rows);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (e) {
        console.error(e);
        if (!cancelled) toast.error('Failed to load payments');
      } finally {
        if (!cancelled) setLoadingTable(false);
      }
    }

    loadSummary();
    loadTable();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, sortKey]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;

    return payments.filter(p => {
      const name = (p.customerName || '').toString().toLowerCase();
      const phone = (p.phone || '').toString().toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [payments, search]);

  const handleNextPage = async () => {
    if (!lastDoc) return;
    setLoadingTable(true);
    try {
      const q = query(
        collection(db, 'payments'),
        orderBy(sortKey, 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPayments(rows);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load next page');
    } finally {
      setLoadingTable(false);
    }
  };

  const handlePrevPage = () => {
    toast.info('Previous page navigation is disabled in this Spark-optimized version.');
  };

  if (!isAdmin) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="font-serif text-2xl font-bold text-luxury-900">Access Denied</h2>
        <p className="mt-2 text-luxury-600">Admin access is required to view revenue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-luxury-900 mb-2">Revenue Dashboard</h2>
        <p className="text-luxury-600">Live analytics from Firestore payments records</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-luxury-900">
{loadingSummary ? '—' : formatINRFromPaise(summary.totalRevenue)}

              </p>
              <p className="text-sm text-luxury-500">Total Revenue</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>

            <div className="ml-4">
              <p className="text-2xl font-bold text-luxury-900">
                {loadingSummary ? '—' : formatINRFromPaise(summary.todayRevenue)}
              </p>
              <p className="text-sm text-luxury-500">Today Revenue</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-luxury-900">
                {loadingSummary ? '—' : formatINRFromPaise(summary.monthRevenue)}
              </p>
              <p className="text-sm text-luxury-500">This Month Revenue</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-luxury-900">
                {loadingSummary ? '—' : summary.totalOrders}
              </p>
              <p className="text-sm text-luxury-500">Total Orders</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center">
              <ArrowUpDown className="w-6 h-6 text-gold-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-luxury-900">
                {loadingSummary ? '—' : `${summary.successfulPayments}`}
              </p>
              <p className="text-sm text-luxury-500">Successful Payments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table toolbar */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-luxury-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone"
                className="w-full pl-10 pr-3 py-2 border border-luxury-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          <div className="text-sm text-luxury-500">
            Sorted by: Latest date
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          {loadingTable ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-lg" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-10 text-center">
              <AlertCircle className="w-10 h-10 text-luxury-300 mx-auto" />
              <p className="mt-3 font-medium text-luxury-900">No revenue records found</p>
              <p className="mt-1 text-luxury-600">Complete payments will appear here.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-luxury-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Order ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Customer Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Phone Number</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Ordered Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Payment Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Payment Method</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Order Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-luxury-700">Created Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-200">
                {filteredPayments.map((p) => {
                  const created = safeToDate(p.createdAt);
                  const orderDate = safeToDate(p.createdAt); // no separate orderDate stored; use createdAt
                  const createdStr = created ? created.toLocaleString() : '—';
                  const orderStr = orderDate ? orderDate.toLocaleDateString() : '—';

                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-luxury-900">{p.orderId || p.order_id || '—'}</td>
                      <td className="px-4 py-3">{p.customerName || '—'}</td>
                      <td className="px-4 py-3">{p.phone || '—'}</td>
                      <td className="px-4 py-3 text-luxury-900">{formatINRFromPaise(p.amount)}</td>

                      <td className="px-4 py-3">

                        <StatusBadge status={p.paymentStatus} />
                      </td>
                      <td className="px-4 py-3">{p.paymentMethod || '—'}</td>
                      <td className="px-4 py-3">{orderStr}</td>
                      <td className="px-4 py-3 text-luxury-600">{createdStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handlePrevPage}
            className="px-4 py-2 border border-luxury-200 rounded-lg text-sm text-luxury-700 hover:bg-luxury-50"
          >
            Previous
          </button>

          <button
            onClick={handleNextPage}
            disabled={!hasMore || loadingTable}
            className="px-4 py-2 bg-gold-500 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {loadingTable ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </span>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

