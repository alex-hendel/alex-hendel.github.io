export default function TripSelector({ trips, selectedId, onChange, loading }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="animate-spin">⟳</span> Loading trips…
      </div>
    )
  }

  if (!trips.length) {
    return (
      <span className="text-sm text-gray-400 italic">
        No trips found — run txt_to_places.py to add one
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 hidden sm:inline">Trip:</span>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="" disabled>Select a trip…</option>
        {trips.map((trip) => (
          <option key={trip.id} value={trip.id}>
            {trip.name} ({trip.count})
          </option>
        ))}
      </select>
    </div>
  )
}
