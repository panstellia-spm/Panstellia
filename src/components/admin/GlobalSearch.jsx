/**
 * GlobalSearch.jsx — Ctrl+K Command Palette for the Admin Panel.
 * Searches products and orders with categorized results and keyboard navigation.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, ShoppingBag, Package, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../context/ProductContext';
import { clientSearch } from '../../utils/searchTokens';
import { db } from '../../services/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

const MAX_RESULTS_PER_CATEGORY = 4;
const HISTORY_KEY = 'panstellia_admin_search_history';

function getHistory() {
  try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveHistory(query) {
  if (!query?.trim()) return;
  try {
    const prev = getHistory().filter(q => q !== query);
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify([query, ...prev].slice(0, 6)));
  } catch {}
}

const PRODUCT_FIELDS = [
  { key: 'name', weight: 3 },
  { key: 'skuCode', weight: 2 },
  { key: 'category', weight: 1 },
];

export default function GlobalSearch() {
  const { products } = useProducts();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(false);
  const [queryStr, setQueryStr] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState(getHistory);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  // ── Fetch Orders on Demand ──────────────────────────────────────────────────

  const fetchOrders = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('GlobalSearch: Failed to fetch orders', err);
    }
  };

  // ── Open / Close ──────────────────────────────────────────────────────────

  const openPalette = useCallback(() => {
    setOpen(true);
    setQueryStr('');
    setSelectedIndex(0);
    setHistory(getHistory());
    fetchOrders(); // load orders dynamically on open
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQueryStr('');
    setSelectedIndex(0);
  }, []);

  // ── Keyboard shortcut: Ctrl+K / Cmd+K ────────────────────────────────────

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        open ? closePalette() : openPalette();
      }
      if (e.key === 'Escape' && open) closePalette();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, openPalette, closePalette]);

  // ── Focus input when opened ───────────────────────────────────────────────

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // ── Search results ────────────────────────────────────────────────────────

  const results = useMemo(() => {
    if (!queryStr.trim()) return { products: [], orders: [], total: 0 };

    const matchedProducts = clientSearch(products, queryStr, PRODUCT_FIELDS)
      .slice(0, MAX_RESULTS_PER_CATEGORY)
      .map(p => ({
        type: 'product',
        id: p.id,
        label: p.name,
        sub: `${p.category}${p.skuCode ? ` · SKU: ${p.skuCode}` : ''}`,
        path: '/admin/products',
        icon: Package,
        iconBg: 'bg-purple-50',
        iconColor: 'text-purple-600',
      }));

    const ORDER_FIELDS = [
      { key: 'customerName', weight: 3 },
      { key: 'name', weight: 2 },
      { key: 'phone', weight: 2 },
      { key: 'id', weight: 1 },
      { key: 'city', weight: 1 },
    ];
    const matchedOrders = clientSearch(orders, queryStr, ORDER_FIELDS)
      .slice(0, MAX_RESULTS_PER_CATEGORY)
      .map(o => ({
        type: 'order',
        id: o.id,
        label: `#${o.id?.slice(-8).toUpperCase()}`,
        sub: `${o.customerName || o.name || 'Customer'} · ₹${Number(o.total || 0).toLocaleString('en-IN')} · ${o.status || 'processing'}`,
        path: '/admin/orders',
        icon: ShoppingBag,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
      }));

    const allResults = [...matchedProducts, ...matchedOrders];
    return { products: matchedProducts, orders: matchedOrders, total: allResults.length };
  }, [queryStr, products, orders]);

  // ── Flat result list for keyboard nav ─────────────────────────────────────

  const flatResults = useMemo(() => [
    ...results.products,
    ...results.orders,
  ], [results]);

  // ── Keyboard navigation ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatResults[selectedIndex];
        if (item) handleNavigate(item);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flatResults, selectedIndex]);

  // ── Scroll selected item into view ────────────────────────────────────────

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // ── Navigate to result ────────────────────────────────────────────────────

  const handleNavigate = useCallback((item) => {
    saveHistory(queryStr);
    navigate(item.path);
    closePalette();
  }, [queryStr, navigate, closePalette]);

  const handleHistoryClick = useCallback((q) => {
    setQueryStr(q);
    setSelectedIndex(0);
  }, []);

  const clearHistory = () => {
    sessionStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const showHistory = !queryStr && history.length > 0;
  const showEmpty = queryStr && results.total === 0;

  return (
    <>
      {/* Trigger Button in Header */}
      <button
        onClick={openPalette}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-luxury-200 text-sm text-luxury-500 hover:text-luxury-800 hover:border-luxury-300 hover:bg-luxury-50 transition-all group"
        title="Search (Ctrl+K)"
      >
        <Search className="w-4 h-4" />
        <span className="text-xs text-luxury-400">Search...</span>
        <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-luxury-100 text-luxury-500 text-[10px] font-mono border border-luxury-200">
          ⌘K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={openPalette}
        className="sm:hidden p-2 rounded-xl text-luxury-500 hover:bg-luxury-100 transition-colors"
        title="Search"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Palette Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closePalette}
          />

          {/* Panel */}
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-luxury-200 overflow-hidden flex flex-col max-h-[70vh]">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-luxury-200">
              <Search className="w-5 h-5 text-luxury-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={queryStr}
                onChange={e => { setQueryStr(e.target.value); setSelectedIndex(0); }}
                placeholder="Search products or orders..."
                className="flex-1 text-sm text-luxury-900 placeholder:text-luxury-400 focus:outline-none bg-transparent"
              />
              {queryStr && (
                <button onClick={() => setQueryStr('')} className="text-luxury-400 hover:text-luxury-700 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:block px-2 py-1 rounded-lg bg-luxury-100 text-luxury-500 text-[11px] font-mono border border-luxury-200">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto flex-1 py-2">

              {/* History */}
              {showHistory && (
                <div>
                  <div className="flex items-center justify-between px-4 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-luxury-400">Recent</p>
                    <button onClick={clearHistory} className="text-[10px] text-luxury-400 hover:text-luxury-600 transition-colors">Clear</button>
                  </div>
                  {history.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleHistoryClick(q)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-luxury-50 transition-colors text-left"
                    >
                      <Clock className="w-4 h-4 text-luxury-400 flex-shrink-0" />
                      <span className="text-sm text-luxury-700">{q}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* No query — show quick nav */}
              {!queryStr && !history.length && (
                <div className="px-4 py-8 text-center">
                  <div className="w-12 h-12 bg-luxury-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-5 h-5 text-luxury-400" />
                  </div>
                  <p className="text-sm font-medium text-luxury-700">Search anything</p>
                  <p className="text-xs text-luxury-400 mt-1">Products, orders...</p>
                  <div className="flex items-center justify-center gap-2 mt-4 text-xs text-luxury-400">
                    <kbd className="px-2 py-1 rounded bg-luxury-100 border border-luxury-200 font-mono">↑↓</kbd>
                    <span>navigate</span>
                    <kbd className="px-2 py-1 rounded bg-luxury-100 border border-luxury-200 font-mono">↵</kbd>
                    <span>select</span>
                    <kbd className="px-2 py-1 rounded bg-luxury-100 border border-luxury-200 font-mono">ESC</kbd>
                    <span>close</span>
                  </div>
                </div>
              )}

              {/* Product results */}
              {results.products.length > 0 && (
                <ResultSection title="Products" count={results.products.length}>
                  {results.products.map((item, i) => (
                    <ResultItem
                      key={item.id}
                      item={item}
                      index={i}
                      selected={selectedIndex === i}
                      onSelect={handleNavigate}
                      totalOffset={0}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Order results */}
              {results.orders.length > 0 && (
                <ResultSection title="Orders" count={results.orders.length}>
                  {results.orders.map((item, i) => (
                    <ResultItem
                      key={item.id}
                      item={item}
                      index={results.products.length + i}
                      selected={selectedIndex === results.products.length + i}
                      onSelect={handleNavigate}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Empty state */}
              {showEmpty && (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-luxury-700">No results for "{queryStr}"</p>
                  <p className="text-xs text-luxury-400 mt-1">Try a different keyword or browse a module</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-luxury-100 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] text-luxury-400">
                <span><kbd className="font-mono bg-luxury-100 px-1.5 py-0.5 rounded border border-luxury-200">↑↓</kbd> Navigate</span>
                <span><kbd className="font-mono bg-luxury-100 px-1.5 py-0.5 rounded border border-luxury-200">↵</kbd> Open</span>
              </div>
              {results.total > 0 && (
                <span className="text-[11px] text-luxury-500">{results.total} result{results.total !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultSection({ title, count, children }) {
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between px-4 py-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-luxury-400">{title}</p>
        <span className="text-[10px] text-luxury-400">{count}</span>
      </div>
      {children}
    </div>
  );
}

function ResultItem({ item, index, selected, onSelect }) {
  const Icon = item.icon;
  return (
    <button
      data-idx={index}
      onClick={() => onSelect(item)}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
        ${selected ? 'bg-gold-50 border-l-2 border-gold-400' : 'hover:bg-luxury-50'}
      `}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
        <Icon className={`w-4 h-4 ${item.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-luxury-900 truncate">{item.label}</p>
        <p className="text-xs text-luxury-400 truncate">{item.sub}</p>
      </div>
      {selected && <ArrowRight className="w-4 h-4 text-gold-500 flex-shrink-0" />}
    </button>
  );
}
