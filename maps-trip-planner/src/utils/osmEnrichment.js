/**
 * osmEnrichment.js
 *
 * Enrichment (category/cost/hours) is now handled offline by the Python
 * pipeline (migration/txt_to_places.py) and baked into the per-trip JSON files.
 * Only the runtime helpers below are still used by the React app.
 */

// ── Category list ─────────────────────────────────────────────────────────────
// Kept in sync with the categories produced by txt_to_places.py.

export const ALL_CATEGORIES = [
  'Food & Drink',
  'Museums & Galleries',
  'Temples & History',
  'Culture & Sights',
  'Nature & Trails',
  'Parks & Gardens',
  'Shopping',
  'Entertainment',
  'Accommodation',
  'Nightlife',
  'Wellness',
  'Transport',
  'Unknown',
]

// ── Opening hours helper ──────────────────────────────────────────────────────

/**
 * Given an OSM opening_hours string, returns true/false/null (null = unknown).
 * Uses the opening_hours.js library loaded from CDN in index.html.
 *
 * NOTE: opening_hours.js must be available as window.opening_hours.
 * Add to index.html:
 *   <script src="https://cdn.jsdelivr.net/npm/opening_hours@3.8.0/build/opening_hours.min.js"></script>
 */
export function computeIsOpen(hoursString) {
  if (!hoursString) return null
  try {
    const oh = new window.opening_hours(hoursString) // eslint-disable-line
    return oh.getState()
  } catch {
    return null
  }
}
