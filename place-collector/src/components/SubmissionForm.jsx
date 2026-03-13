import { useState, useEffect } from 'react'

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

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatTripId(id) {
  return id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function SubmissionForm({ trip, trips = [], onSubmissionSuccess, workerUrl }) {
  const [isOpen, setIsOpen] = useState(false)
  const [locationName, setLocationName] = useState('')
  const [userName, setUserName] = useState('')
  const [notes, setNotes] = useState('')

  // Trip selection — 'existing' uses dropdown, 'new' shows free-text input
  const [tripMode, setTripMode] = useState(trips.length > 0 ? 'existing' : 'new')
  const [selectedTripId, setSelectedTripId] = useState(trip?.id || trips[0]?.id || '')
  const [newTripName, setNewTripName] = useState('')

  const [selectedTags, setSelectedTags] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Sync dropdown when the parent updates selectedTrip
  useEffect(() => {
    if (trip?.id) setSelectedTripId(trip.id)
  }, [trip?.id])

  // When trips go from empty to non-empty, switch to existing mode
  useEffect(() => {
    if (trips.length > 0 && tripMode === 'new' && !newTripName) {
      setTripMode('existing')
      setSelectedTripId(trips[0].id)
    }
  }, [trips.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch allowed tags from Worker on mount
  useEffect(() => {
    fetch(`${workerUrl}/tags`)
      .then(res => res.json())
      .then(tags => setAvailableTags(tags))
      .catch(() => setAvailableTags([]))
  }, [workerUrl])

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const resolvedTripId = tripMode === 'existing' ? selectedTripId : slugify(newTripName)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    if (!resolvedTripId) {
      setError(tripMode === 'new' ? 'Please enter a trip name.' : 'Please select a trip.')
      setLoading(false)
      return
    }

    try {
      const body = {
        locationName: locationName.trim(),
        tripId: resolvedTripId,
        userName: userName.trim(),
        notes: notes.trim(),
      }
      // Only include tags if the user explicitly selected some.
      // If omitted, the Worker auto-detects via Overpass.
      if (selectedTags.length > 0) {
        body.tags = selectedTags
      }

      const response = await fetch(`${workerUrl}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Submission failed')
      }

      const enrichedPlace = await response.json()
      onSubmissionSuccess(enrichedPlace, resolvedTripId)

      // Reset fields, keep trip selection
      setLocationName('')
      setUserName('')
      setNotes('')
      setSelectedTags([])
      setNewTripName('')
      // Switch back to existing-trip mode after creating a new one
      if (tripMode === 'new') setTripMode('existing')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit =
    !loading &&
    locationName.trim() &&
    userName.trim() &&
    resolvedTripId

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <h2 className="text-base font-semibold text-gray-900">Add a Location</h2>
        <span className="text-gray-400 text-lg leading-none">{isOpen ? '−' : '+'}</span>
      </button>

      {!isOpen ? null : (
      <div className="px-4 pb-4">
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Trip selection */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Trip *</label>
            {trips.length > 0 && (
              <button
                type="button"
                onClick={() => setTripMode(m => m === 'new' ? 'existing' : 'new')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                disabled={loading}
              >
                {tripMode === 'new' ? '← Back to existing' : '+ New Trip'}
              </button>
            )}
          </div>

          {tripMode === 'existing' && trips.length > 0 ? (
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              {trips.map(t => (
                <option key={t.id} value={t.id}>{formatTripId(t.id)}</option>
              ))}
            </select>
          ) : (
            <div>
              <input
                type="text"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="e.g., Japan Spring 2026"
                required={tripMode === 'new'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
              {newTripName && (
                <p className="text-xs text-gray-400 mt-1">ID: {slugify(newTripName)}</p>
              )}
            </div>
          )}
        </div>

        {/* Location Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location Name *
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g., Shilin Night Market"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        {/* User Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name *
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g., Sofia"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        {/* Tags */}
        {availableTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags <span className="text-gray-400 font-normal">(optional — auto-detected if omitted)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  disabled={loading}
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
            {selectedTags.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedTags.length} selected — these will override auto-detection
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share details about this location..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors text-sm"
        >
          {loading ? 'Adding...' : 'Add Location'}
        </button>
      </form>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          ✓ Location added successfully!
        </div>
      )}
      </div>
      )}
    </div>
  )
}
