import { useState } from 'react'

const TAG_EMOJI = {
  'Food': '🍽️',
  'Bar': '🍺',
  'Cafe': '☕',
  'Museums & Galleries': '🖼️',
  'Temples & History': '⛩️',
  'Culture & Sights': '🏛️',
  'Nature & Trails': '🏔️',
  'Parks & Gardens': '🌳',
  'Shopping': '🛍️',
  'Entertainment': '🎡',
  'Accommodation': '🏨',
  'Nightlife': '🎉',
  'Wellness': '🧘',
  'Transport': '🚆',
  'Unknown': '📍',
}

function formatTripId(id) {
  return id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function FiltersPanel({
  // Trip
  trips,
  selectedTrip,
  onTripChange,
  // Submitter
  submitters,
  selectedSubmitter,
  onSubmitterChange,
  // Tags
  availableTags,
  selectedTags,
  onTagsChange,
}) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleTag = (tag) => {
    onTagsChange(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const activeCount =
    (selectedTrip ? 0 : 0) + // trip is always set, not counted as a "filter"
    (selectedSubmitter ? 1 : 0) +
    selectedTags.length

  const clearAll = () => {
    onSubmitterChange('')
    onTagsChange(() => [])
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">Filters</h2>
          {activeCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-lg leading-none">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">

          {/* Trip */}
          {trips.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trip</label>
              <select
                value={selectedTrip?.id || ''}
                onChange={(e) => {
                  const t = trips.find(t => t.id === e.target.value)
                  if (t) onTripChange(t)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {trips.map(t => (
                  <option key={t.id} value={t.id}>{formatTripId(t.id)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Submitter */}
          {submitters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Submitted by</label>
              <select
                value={selectedSubmitter}
                onChange={(e) => onSubmitterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Everyone</option>
                {submitters.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags <span className="text-gray-400 font-normal">(show any of)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {TAG_EMOJI[tag] ? `${TAG_EMOJI[tag]} ` : ''}{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear */}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
