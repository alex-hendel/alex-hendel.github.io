import PlaceCard from './PlaceCard'

export default function ListView({ places, selectedId, onSelect }) {
  if (!places.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <span className="text-4xl">🗺️</span>
        <p className="text-sm">No places match your filters</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto">
      {places.map((place) => (
        <PlaceCard
          key={place.id}
          place={place}
          isSelected={place.id === selectedId}
          onClick={() => onSelect(place.id === selectedId ? null : place.id)}
        />
      ))}
    </div>
  )
}
