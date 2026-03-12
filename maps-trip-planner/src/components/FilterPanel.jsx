import { ALL_CATEGORIES } from '../utils/osmEnrichment'

const COST_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'free', label: 'Free' },
  { value: '$', label: '$' },
  { value: '$$', label: '$$' },
  { value: '$$$', label: '$$$' },
  { value: null, label: 'Unknown' },
]

export default function FilterPanel({ filters, onChange, totalCount, filteredCount }) {
  const toggleCategory = (cat) => {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat]
    onChange({ ...filters, categories: next })
  }

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-gray-200 p-5 overflow-y-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Showing {filteredCount} of {totalCount} places
        </p>
      </div>

      {/* ── Activity Type ── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Activity Type
        </h3>
        <div className="flex flex-col gap-1.5">
          {ALL_CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.categories.includes(cat)}
                onChange={() => toggleCategory(cat)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                {CATEGORY_EMOJI[cat]} {cat}
              </span>
            </label>
          ))}
        </div>
        {filters.categories.length > 0 && (
          <button
            onClick={() => onChange({ ...filters, categories: [] })}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Clear selection
          </button>
        )}
      </section>

      {/* ── Cost ── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Price Range
        </h3>
        <div className="flex flex-wrap gap-2">
          {COST_OPTIONS.map(({ value, label }) => {
            const active = filters.cost === value
            return (
              <button
                key={String(value)}
                onClick={() => onChange({ ...filters, cost: active ? 'all' : value })}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Hours ── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Hours
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => onChange({ ...filters, openNow: !filters.openNow })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              filters.openNow ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                filters.openNow ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="text-sm text-gray-700">Open now</span>
        </label>
        <p className="text-xs text-gray-400 mt-1.5">
          Based on OSM hours data — may be incomplete
        </p>
      </section>

      {/* ── Reset all ── */}
      <button
        onClick={() => onChange({ categories: [], cost: 'all', openNow: false })}
        className="mt-auto text-sm text-gray-500 hover:text-gray-800 underline text-left"
      >
        Reset all filters
      </button>
    </aside>
  )
}

const CATEGORY_EMOJI = {
  'Food & Drink':       '🍽️',
  'Museums & Galleries':'🖼️',
  'Temples & History':  '⛩️',
  'Culture & Sights':   '🏛️',
  'Nature & Trails':    '🏔️',
  'Parks & Gardens':    '🌳',
  'Shopping':           '🛍️',
  'Entertainment':      '🎡',
  'Accommodation':      '🏨',
  'Nightlife':          '🎉',
  'Wellness':           '🧘',
  'Transport':          '🚆',
  'Unknown':            '📍',
}
