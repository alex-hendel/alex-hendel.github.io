const CATEGORY_EMOJI = {
  'Food & Drink': '🍽️',
  'Culture & Sights': '🏛️',
  'Outdoors': '🌿',
  'Shopping': '🛍️',
  'Accommodation': '🏨',
  'Nightlife': '🎉',
  'Transport': '🚆',
  'Wellness': '🧘',
  'Unknown': '📍',
}

const COST_LABEL = {
  free: 'Free',
  $: '$',
  $$: '$$',
  $$$: '$$$',
}

export default function PlaceCard({ place, onClick, isSelected }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`
  const osmUrl = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Name + category */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900 text-sm leading-snug">{place.name}</h3>
        <span className="shrink-0 text-base" title={place.category}>
          {CATEGORY_EMOJI[place.category] ?? '📍'}
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {place.category && place.category !== 'Unknown' && (
          <Badge color="blue">{place.category}</Badge>
        )}
        {place.cost && (
          <Badge color="green">{COST_LABEL[place.cost] ?? place.cost}</Badge>
        )}
        {place.isOpen === true && <Badge color="emerald">Open now</Badge>}
        {place.isOpen === false && <Badge color="red">Closed</Badge>}
        {!place.enriched && (
          <Badge color="gray">Information not found</Badge>
        )}
      </div>

      {/* Hours string */}
      {place.hours && (
        <p className="text-xs text-gray-500 mt-2 truncate" title={place.hours}>
          🕐 {place.hours}
        </p>
      )}

      {/* Note from My Maps */}
      {place.note && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{place.note}</p>
      )}

      {/* Links */}
      <div className="flex gap-3 mt-3">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-blue-600 hover:underline"
        >
          Google Maps ↗
        </a>
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-gray-500 hover:underline"
        >
          Edit on OSM ↗
        </a>
      </div>
    </div>
  )
}

function Badge({ color, children }) {
  const styles = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[color]}`}>
      {children}
    </span>
  )
}
