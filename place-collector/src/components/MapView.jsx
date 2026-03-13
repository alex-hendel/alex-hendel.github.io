import { useEffect, useRef } from 'react'
import L from 'leaflet'

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

export default function MapView({ submissions }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([20, 0], 2)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current)
      // Force Leaflet to recalculate container dimensions after mount
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 0)
    }

    const map = mapInstanceRef.current

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    const locatedSubmissions = submissions.filter(s => s.lat && s.lng)

    if (locatedSubmissions.length === 0) return

    // Add markers
    locatedSubmissions.forEach(place => {
      const primaryTag = (place.tags || [])[0]
      const emoji = TAG_EMOJI[primaryTag] || TAG_EMOJI['Unknown']
      const tagBadges = (place.tags || [])
        .filter(t => t !== 'Unknown')
        .map(t => `<span style="background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-size:11px;">${t}</span>`)
        .join(' ')

      const marker = L.marker([place.lat, place.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="font-size:24px;line-height:1;">${emoji}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      })
        .bindPopup(`
          <div style="font-weight:600;">${place.name}</div>
          <div style="font-size:12px;color:#4b5563;">${place.address || 'Location unknown'}</div>
          ${tagBadges ? `<div style="margin-top:4px;">${tagBadges}</div>` : ''}
          ${place.submittedBy ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">Added by ${place.submittedBy}</div>` : ''}
          ${place.note ? `<div style="font-size:12px;color:#374151;margin-top:4px;font-style:italic;">"${place.note}"</div>` : ''}
        `)
        .addTo(map)

      markersRef.current.push(marker)
    })

    // Fit bounds to all markers
    const group = new L.featureGroup(markersRef.current)
    map.fitBounds(group.getBounds().pad(0.2))

    // Recalculate size in case the container reflowed
    setTimeout(() => map.invalidateSize(), 50)
  }, [submissions])

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '400px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
    />
  )
}
