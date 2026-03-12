import { useEffect, useRef } from 'react'
import L from 'leaflet'

// Fix Leaflet's broken default icon paths when bundled with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

function makeIcon(category, isSelected) {
  const emoji = CATEGORY_EMOJI[category] ?? '📍'
  const size = isSelected ? 32 : 24
  const shadow = isSelected
    ? 'drop-shadow(0 0 4px rgba(0,0,0,0.6))'
    : 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))'
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;filter:${shadow};">${emoji}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

export default function MapView({ places, selectedId, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})

  // Initialize map once
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
  }, [])

  // Sync markers whenever places change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const existingIds = new Set(Object.keys(markersRef.current))
    const newIds = new Set(places.map((p) => p.id))

    // Remove markers no longer in the filtered set
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
      }
    }

    // Add or update markers (skip places with no coordinates)
    for (const place of places) {
      if (place.lat == null || place.lng == null) continue

      const isSelected = place.id === selectedId
      const icon = makeIcon(place.category, isSelected)

      if (markersRef.current[place.id]) {
        markersRef.current[place.id].setIcon(icon)
      } else {
        const marker = L.marker([place.lat, place.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${place.name}</strong>${place.category ? `<br/><span style="color:#6b7280">${place.category}</span>` : ''}`
          )
        marker.on('click', () => onSelect(place.id))
        markersRef.current[place.id] = marker
      }
    }

    // Fit map to visible markers if we have any located places
    const locatedPlaces = places.filter((p) => p.lat != null && p.lng != null)
    if (locatedPlaces.length > 0) {
      const bounds = L.latLngBounds(locatedPlaces.map((p) => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [places, selectedId, onSelect])

  // Pan to selected marker
  useEffect(() => {
    if (!selectedId || !mapRef.current) return
    const marker = markersRef.current[selectedId]
    if (marker) {
      mapRef.current.panTo(marker.getLatLng(), { animate: true })
      marker.openPopup()
    }
  }, [selectedId])

  return <div ref={containerRef} className="h-full w-full rounded-lg" />
}
