/**
 * FilterBar.jsx — Reusable admin filter bar component.
 * Used across Orders, Products, Inventory, Customers, Activity Logs.
 */
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';

const inputCls = "px-3 py-2 border border-luxury-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all";

/**
 * @param {object} props
 * @param {string}   props.search            - current search value
 * @param {Function} props.onSearch          - search setter
 * @param {string}   props.placeholder       - search input placeholder
 * @param {Array}    props.selects           - [{ key, label, options: ['All','X','Y'], value, onChange }]
 * @param {Array}    props.sorts             - [{ key, label }] — pass empty [] to hide
 * @param {string}   props.currentSort       - current sort key
 * @param {Function} props.onSort            - sort setter
 * @param {number}   props.activeFilterCount - number of active filters
 * @param {Function} props.onClearAll        - clear all handler
 * @param {string}   props.resultCount       - result count label (e.g. "24 orders")
 * @param {node}     props.actions           - optional right-side action buttons (export etc.)
 * @param {Array}    props.ranges            - [{ key, label, min, max, value: {min,max}, onChange }]
 */
export default function FilterBar({
  search = '',
  onSearch,
  placeholder = 'Search...',
  selects = [],
  sorts = [],
  currentSort = '',
  onSort,
  activeFilterCount = 0,
  onClearAll,
  resultCount,
  actions,
  ranges = [],
}) {
  return (
    <div className="bg-white rounded-2xl border border-luxury-200 shadow-sm">
      {/* Top Row: Search + Selects + Sort + Actions */}
      <div className="flex flex-wrap items-center gap-2.5 p-3.5">
        {/* Search Input */}
        {onSearch && (
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-luxury-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-9 pr-8 py-2 border border-luxury-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
            />
            {search && (
              <button
                onClick={() => onSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-luxury-400 hover:text-luxury-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Select Filters */}
        {selects.map(sel => (
          <select
            key={sel.key}
            value={sel.value}
            onChange={e => sel.onChange(e.target.value)}
            className={inputCls}
            title={sel.label}
          >
            {sel.options.map(opt => (
              <option key={opt} value={opt}>
                {opt === 'All' ? sel.label : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        ))}

        {/* Sort Dropdown */}
        {sorts.length > 0 && onSort && (
          <div className="relative">
            <select
              value={currentSort}
              onChange={e => onSort(e.target.value)}
              className={`${inputCls} pr-8 appearance-none cursor-pointer`}
            >
              {sorts.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-luxury-400 pointer-events-none" />
          </div>
        )}

        {/* Active filter indicator + clear */}
        {activeFilterCount > 0 && onClearAll && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gold-50 text-gold-700 border border-gold-200 hover:bg-gold-100 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilterCount} active
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Result count */}
        {resultCount !== undefined && (
          <span className="text-sm text-luxury-500 ml-auto flex-shrink-0 hidden sm:block">
            {resultCount}
          </span>
        )}

        {/* Action buttons (export etc.) */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Range Filters Row (only shown if ranges are defined) */}
      {ranges.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 px-3.5 pb-3.5 border-t border-luxury-100 pt-3">
          {ranges.map(range => (
            <div key={range.key} className="flex items-center gap-2">
              <span className="text-xs font-medium text-luxury-600 flex-shrink-0">{range.label}:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={range.min}
                  max={range.value?.max ?? range.max}
                  value={range.value?.min ?? range.min}
                  onChange={e => range.onChange({ ...range.value, min: Number(e.target.value) })}
                  className="w-20 px-2 py-1 border border-luxury-200 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Min"
                />
                <span className="text-luxury-400 text-xs">–</span>
                <input
                  type="number"
                  min={range.value?.min ?? range.min}
                  max={range.max}
                  value={range.value?.max === Infinity ? range.max : (range.value?.max ?? range.max)}
                  onChange={e => range.onChange({ ...range.value, max: Number(e.target.value) })}
                  className="w-24 px-2 py-1 border border-luxury-200 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Max"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
          {search && (
            <FilterChip label={`Search: "${search}"`} onRemove={() => onSearch('')} />
          )}
          {selects.filter(s => s.value && s.value !== 'All').map(sel => (
            <FilterChip
              key={sel.key}
              label={`${sel.label}: ${sel.value}`}
              onRemove={() => sel.onChange('All')}
            />
          ))}
          {ranges.filter(r => r.value?.min !== r.min || (r.value?.max !== Infinity && r.value?.max !== r.max)).map(r => (
            <FilterChip
              key={r.key}
              label={`${r.label}: ₹${r.value?.min}–₹${r.value?.max === Infinity ? r.max : r.value?.max}`}
              onRemove={() => r.onChange({ min: r.min, max: r.max })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-luxury-100 text-luxury-700 border border-luxury-200">
      {label}
      <button onClick={onRemove} className="text-luxury-400 hover:text-luxury-700 transition-colors ml-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
