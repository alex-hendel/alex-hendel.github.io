import { useState, useEffect } from 'react'
import SubmissionForm from './components/SubmissionForm'
import FiltersPanel from './components/FiltersPanel'
import MapView from './components/MapView'
import SubmissionList from './components/SubmissionList'
import './App.css'

const WORKER_URL = 'https://placecollector-worker.alexhendel.workers.dev'

export default function App() {
  const [trips, setTrips] = useState([])
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [submitterFilter, setSubmitterFilter] = useState('')
  const [tagFilter, setTagFilter] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loadingTrips, setLoadingTrips] = useState(true)

  // Load trips from Worker once on mount (stale until page refresh)
  useEffect(() => {
    const loadTrips = async () => {
      setLoadingTrips(true)
      try {
        const response = await fetch(`${WORKER_URL}/trips`)
        if (!response.ok) throw new Error('Failed to load trips')
        const tripIds = await response.json()

        const tripObjects = tripIds.map(id => ({ id }))
        setTrips(tripObjects)
        if (tripObjects.length > 0) setSelectedTrip(tripObjects[0])
      } catch (err) {
        console.error('Error loading trips:', err)
        setError('Failed to connect to submissions API')
      } finally {
        setLoadingTrips(false)
      }
    }

    loadTrips()
  }, [])

  // Load submissions when selected trip or submitter filter changes
  useEffect(() => {
    if (!selectedTrip) return

    const loadSubmissions = async () => {
      setLoading(true)
      setError(null)
      try {
        const url = new URL(`${WORKER_URL}/places`)
        url.searchParams.set('tripId', selectedTrip.id)
        if (submitterFilter) {
          url.searchParams.set('submitterName', submitterFilter)
        }

        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to load submissions')
        const data = await response.json()
        setSubmissions(data || [])
      } catch (err) {
        console.error('Error loading submissions:', err)
        setError('Failed to load submissions')
      } finally {
        setLoading(false)
      }
    }

    loadSubmissions()
  }, [selectedTrip, submitterFilter])

  // Clear tag filter when trip changes
  useEffect(() => {
    setTagFilter([])
  }, [selectedTrip])

  const handleSubmissionSuccess = (newPlace, tripId) => {
    const submittedTrip = trips.find(t => t.id === tripId) || { id: tripId }

    if (!trips.find(t => t.id === tripId)) {
      setTrips(prev => [...prev, submittedTrip])
    }

    setSelectedTrip(prev => {
      if (prev?.id === tripId) {
        setSubmissions(s => [newPlace, ...s])
        return prev
      }
      return submittedTrip
    })
  }

  // Client-side tag filtering applied on top of server-side submitter filter
  const filteredSubmissions = tagFilter.length > 0
    ? submissions.filter(p => (p.tags || []).some(t => tagFilter.includes(t)))
    : submissions

  const uniqueSubmitters = [...new Set(submissions.map(s => s.submittedBy))].sort()
  const availableTags = [...new Set(submissions.flatMap(s => s.tags || []))].sort()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Place Collector</h1>
          <p className="mt-1 text-sm text-gray-600">Save trip itineraries for later</p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {loadingTrips ? (
          <div className="text-center text-gray-500">Loading trips...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left sidebar */}
            <div className="lg:col-span-1 space-y-3">
              <SubmissionForm
                trip={selectedTrip}
                trips={trips}
                onSubmissionSuccess={handleSubmissionSuccess}
                workerUrl={WORKER_URL}
              />

              <FiltersPanel
                trips={trips}
                selectedTrip={selectedTrip}
                onTripChange={(t) => { setSelectedTrip(t); setSubmitterFilter('') }}
                submitters={uniqueSubmitters}
                selectedSubmitter={submitterFilter}
                onSubmitterChange={setSubmitterFilter}
                availableTags={availableTags}
                selectedTags={tagFilter}
                onTagsChange={setTagFilter}
              />
            </div>

            {/* Right side: Map + List */}
            <div className="lg:col-span-2 space-y-6">
              {filteredSubmissions.length > 0 && (
                <MapView submissions={filteredSubmissions} />
              )}

              {selectedTrip ? (
                <SubmissionList
                  submissions={filteredSubmissions}
                  loading={loading}
                  isEmpty={filteredSubmissions.length === 0}
                  tripId={selectedTrip.id}
                />
              ) : (
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-500">
                  <p className="text-lg">No trips yet</p>
                  <p className="text-sm mt-1">Open "Add a Location" on the left to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
