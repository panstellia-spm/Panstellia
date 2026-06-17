/**
 * useAdminSearch.js
 * Centralized, reusable search + filter + sort hook for all admin modules.
 *
 * Usage:
 *   const { results, search, setSearch, filters, setFilter, sort, setSort, clearAll, activeFilterCount } =
 *     useAdminSearch(data, config);
 *
 * Config shape:
 * {
 *   searchFields: [{ key: 'name', weight: 2 }, { key: 'skuCode', weight: 1 }],
 *   filters: [
 *     { key: 'category', type: 'exact' },              // exact match
 *     { key: 'status', type: 'exact' },
 *     { key: 'price', type: 'range', min: 0, max: 50000 },  // { min, max }
 *     { key: 'createdAt', type: 'datePreset' },        // today/week/month
 *     { key: 'tier', type: 'custom', fn: (item, val) => ... },
 *   ],
 *   sorts: [
 *     { key: 'newest', label: 'Newest', fn: (a, b) => ... },
 *   ],
 *   defaultSort: 'newest',
 *   debounceMs: 300,
 * }
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { clientSearch } from '../utils/searchTokens';

function safeToDate(v) {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function getDatePresetStart(preset) {
  const now = new Date();
  switch (preset) {
    case 'today': {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    }
    case 'week': {
      const d = new Date(now); d.setDate(d.getDate() - 7); return d;
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    default: return null;
  }
}

export function useAdminSearch(data = [], config = {}) {
  const {
    searchFields = [],
    filters: filterDefs = [],
    sorts = [],
    defaultSort = '',
    debounceMs = 300,
  } = config;

  // ── State ─────────────────────────────────────────────────────────────────
  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterValues, setFilterValues] = useState(() => {
    const initial = {};
    filterDefs.forEach(f => {
      if (f.type === 'range') initial[f.key] = { min: f.min ?? 0, max: f.max ?? Infinity };
      else if (f.type === 'datePreset') initial[f.key] = 'all';
      else initial[f.key] = 'All';
    });
    return initial;
  });
  const [sort, setSort] = useState(defaultSort || sorts[0]?.key || '');

  // ── Debounce search ────────────────────────────────────────────────────────
  const debounceTimer = useRef(null);
  const setSearch = useCallback((val) => {
    setRawSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), debounceMs);
  }, [debounceMs]);
  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  // ── Set a single filter ────────────────────────────────────────────────────
  const setFilter = useCallback((key, value) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Clear all ──────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    setRawSearch('');
    setDebouncedSearch('');
    const reset = {};
    filterDefs.forEach(f => {
      if (f.type === 'range') reset[f.key] = { min: f.min ?? 0, max: f.max ?? Infinity };
      else if (f.type === 'datePreset') reset[f.key] = 'all';
      else reset[f.key] = 'All';
    });
    setFilterValues(reset);
    setSort(defaultSort || sorts[0]?.key || '');
  }, [filterDefs, defaultSort, sorts]);

  // ── Active filter count ────────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = debouncedSearch ? 1 : 0;
    filterDefs.forEach(f => {
      const val = filterValues[f.key];
      if (f.type === 'range') {
        if (val?.min !== (f.min ?? 0) || val?.max !== (f.max ?? Infinity)) count++;
      } else if (f.type === 'datePreset') {
        if (val !== 'all') count++;
      } else {
        if (val !== 'All') count++;
      }
    });
    return count;
  }, [debouncedSearch, filterValues, filterDefs]);

  // ── Apply filters + search + sort ─────────────────────────────────────────
  const results = useMemo(() => {
    let items = [...data];

    // 1. Apply each filter
    filterDefs.forEach(f => {
      const val = filterValues[f.key];

      if (f.type === 'exact') {
        if (val && val !== 'All') {
          items = items.filter(item => {
            const itemVal = String(item[f.key] || '').toLowerCase();
            return itemVal === val.toLowerCase();
          });
        }
      } else if (f.type === 'range') {
        const min = Number(val?.min ?? 0);
        const max = Number(val?.max ?? Infinity);
        items = items.filter(item => {
          const v = Number(item[f.key] || 0);
          return v >= min && v <= max;
        });
      } else if (f.type === 'datePreset') {
        const start = getDatePresetStart(val);
        if (start) {
          items = items.filter(item => {
            const d = safeToDate(item[f.key] || item.createdAt);
            return d && d >= start;
          });
        }
      } else if (f.type === 'custom' && f.fn) {
        if (val && val !== 'All') {
          items = items.filter(item => f.fn(item, val));
        }
      }
    });

    // 2. Apply search with weighted relevance scoring
    if (debouncedSearch.trim()) {
      items = clientSearch(items, debouncedSearch, searchFields);
    }

    // 3. Apply sort (skip if search is active — relevance order takes priority)
    if (!debouncedSearch.trim() && sort) {
      const sortDef = sorts.find(s => s.key === sort);
      if (sortDef?.fn) {
        items = [...items].sort(sortDef.fn);
      }
    }

    return items;
  }, [data, debouncedSearch, filterValues, sort, filterDefs, searchFields, sorts]);

  return {
    results,
    search: rawSearch,
    setSearch,
    filters: filterValues,
    setFilter,
    sort,
    setSort,
    clearAll,
    activeFilterCount,
  };
}
