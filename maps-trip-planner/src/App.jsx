import { useState, useEffect, useMemo } from 'react'
import FilterPanel from './components/FilterPanel'
import MapView from './components/MapView'
import ListView from './components/ListView'
import TripSelector from './components/TripSelector'
import { computeIsOpen } from './utils/osmEnrichment'

const DEFAULT_FILTERS = { categories: [], cost: 'all', openNow: false }

// ── Filter logic ──────────────────────────────────────────────────────────────

function applyFilters(places, filters) {
  return places.filter((p) => {
    if (filters.categories.length > 0 && !filters.categories.includes(p.category)) return false
    if (filters.cost !== 'all') {
      if (filters.cost === null && p.cost !== null) return false
      if (filters.cost !== null && p.cost !== filters.cost) return false
    }
    if (filters.openNow && p.isOpen !== true) return false
    return true
  })
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // Trip manifest
  const [trips, setTrips]           = useState([])
  const [tripsLoading, setTripsLoading] = useState(true)

  // Active trip
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [places, setPlaces]                 = useState([])
  const [tripLoading, setTripLoading]       = useState(false)
  const [tripError, setTripError]           = useState(null)

  // UI state
  const [filters, setFilters]   = useState(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState(null)
  const [view, setView]         = useState('split') // 'map' | 'list' | 'split'

  // ── Load manifest on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('trips/index.json')
      .then((r) => r.json())
      .then((data) => {
        setTrips(data)
        // Auto-select first trip
        if (data.length > 0) setSelectedTripId(data[0].id)
      })
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false))
  }, [])

  // ── Load trip data when selection changes ───────────────────────────────────
  useEffect(() => {
    if (!selectedTripId) return
    const trip = trips.find((t) => t.id === selectedTripId)
    if (!trip) return

    setTripLoading(true)
    setTripError(null)
    setPlaces([])
    setFilters(DEFAULT_FILTERS)   // reset filters on trip switch
    setSelectedId(null)

    fetch(trip.file)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((data) => setPlaces(data.places ?? []))
      .catch((err) => setTripError(err.message))
      .finally(() => setTripLoading(false))
  }, [selectedTripId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Compute isOpen in real-time from hours strings ──────────────────────────
  const placesWithOpenStatus = useMemo(
    () => places.map((p) => ({ ...p, isOpen: computeIsOpen(p.hours) })),
    [places]
  )

  const filteredPlaces = useMemo(
    () => applyFilters(placesWithOpenStatus, filters),
    [placesWithOpenStatus, filters]
  )

  const currentTrip = trips.find((t) => t.id === selectedTripId)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-gray-50 font-sans">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">🗺️</span>
          <h1 className="text-base font-semibold text-gray-900 hidden sm:block shrink-0">
            Trip Planner
          </h1>
          <TripSelector
            trips={trips}
            selectedId={selectedTripId}
            onChange={setSelectedTripId}
            loading={tripsLoading}
          />
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm shrink-0">
          {[['map', '🗺'], ['split', '⊞'], ['list', '☰']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 ${
                view === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Filters sidebar */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          totalCount={placesWithOpenStatus.length}
          filteredCount={filteredPlaces.length}
        />

        {/* Main content */}
        <main className="flex flex-1 overflow-hidden relative">

          {/* Loading overlay */}
          {tripLoading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <span className="text-3xl animate-spin">⟳</span>
                <span className="text-sm">Loading {currentTrip?.name}…</span>
              </div>
            </div>
          )}

          {/* Error state */}
          {tripError && !tripLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center text-red-600">
                <p className="text-2xl mb-2">⚠️</p>
                <p className="text-sm">Failed to load trip: {tripError}</p>
              </div>
            </div>
          )}

          {/* Empty / no trip selected */}
          {!selectedTripId && !tripsLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="text-sm">Select a trip above to get started</p>
                <p className="text-xs mt-1">
                  Add trips by running <code className="bg-gray-100 px-1 rounded">txt_to_places.py</code>
                </p>
              </div>
            </div>
          )}

          {/* Map */}
          {(view === 'map' || view === 'split') && places.length > 0 && (
            <div className={`${view === 'split' ? 'flex-1' : 'flex-1'} p-4`}>
              <MapView
                places={filteredPlaces}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          )}

          {/* List */}
          {(view === 'list' || view === 'split') && places.length > 0 && (
            <div className={`${view === 'split' ? 'w-80' : 'flex-1'} border-l border-gray-200 overflow-y-auto`}>
              <ListView
                places={filteredPlaces}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
