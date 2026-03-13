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

export default function SubmissionList({ submissions, loading, isEmpty }) {
  const formatDate = (isoString) => {
    if (!isoString) return ''
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-500">
        Loading submissions...
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
        <p className="text-gray-600">No submissions yet</p>
        <p className="text-sm text-gray-500 mt-1">Be the first to add a location!</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Places <span className="text-sm font-normal text-gray-400">({submissions.length})</span>
      </h2>

      {/* Scrollable list — max height keeps map visible above */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {submissions.map(place => (
          <div
            key={place.id}
            className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              {/* Primary emoji */}
              <div className="text-2xl flex-shrink-0 mt-0.5">
                {TAG_EMOJI[(place.tags || [])[0]] || TAG_EMOJI['Unknown']}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base leading-tight">{place.name}</h3>

                {place.address && (
                  <p className="text-sm text-gray-500 mt-0.5">{place.address}</p>
                )}

                {/* Tag badges */}
                {(place.tags || []).filter(t => t !== 'Unknown').length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(place.tags || []).filter(t => t !== 'Unknown').map(tag => (
                      <span key={tag} className="inline-flex items-center bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-100">
                        {TAG_EMOJI[tag] ? `${TAG_EMOJI[tag]} ` : ''}{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Cost + Hours row */}
                {(place.cost || place.hours) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {place.cost && (
                      <span className="text-sm text-gray-700">
                        💰 <span className="font-medium">{place.cost}</span>
                      </span>
                    )}
                    {place.hours && (
                      <span className="text-sm text-gray-700">
                        🕐 <span className="font-mono text-xs">{place.hours}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Note */}
                {place.note && (
                  <p className="mt-2 text-sm text-gray-600 italic border-l-2 border-gray-200 pl-2">
                    "{place.note}"
                  </p>
                )}

                {/* Meta + links */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span>Added by <strong className="text-gray-600">{place.submittedBy}</strong></span>
                  {place.submittedAt && (
                    <>
                      <span>·</span>
                      <span>{formatDate(place.submittedAt)}</span>
                    </>
                  )}
                  {place.lat && place.lng && (
                    <>
                      <span>·</span>
                      <a
                        href={`https://maps.google.com/?q=${place.lat},${place.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Google Maps
                      </a>
                      <span>·</span>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}&zoom=17`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        OSM
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
