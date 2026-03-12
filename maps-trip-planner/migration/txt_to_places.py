"""
txt_to_places.py
----------------
Converts a plain-text list of place names into a fully enriched JSON file
ready for use in the Trip Planner app.

Pipeline for each place:
  1. Nominatim (OSM geocoding) — name + region → lat/lng, address
  2. Overpass API               — lat/lng       → category, hours, cost

Both APIs are free with no key required.

Usage:
  python txt_to_places.py places.txt \\
      --region "Taipei, Taiwan" \\
      --trip   "Taipei" \\
      --output ../public/trips

The script will:
  · Write  ../public/trips/taipei.json
  · Update ../public/trips/index.json  (creates it if missing)

places.txt format — one place per line, blank lines and # comments ignored:
  Taipei 101
  Din Tai Fung (Xinyi Branch)
  Shilin Night Market
  # adding more soon
  National Palace Museum
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# ── Constants ─────────────────────────────────────────────────────────────────

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL  = "https://overpass-api.de/api/interpreter"
USER_AGENT    = "TripPlannerScript/1.0 (personal use)"

NOMINATIM_DELAY_S  = 1.2  # Nominatim ToS: max 1 req/sec
OVERPASS_DELAY_S   = 2.0  # conservative gap between Overpass calls
OVERPASS_RADIUS_M  = 100  # search radius around geocoded point
OVERPASS_TIMEOUT_S = 25   # server-side query timeout sent inside the Overpass query

# Retry settings for 429 (rate limit) and 504 (gateway timeout)
MAX_RETRIES    = 4
RETRY_BASE_S   = 5.0      # first retry waits 5s, then 10s, 20s, 40s

# ── Category mapping (same as frontend osmEnrichment.js) ─────────────────────

TAG_CATEGORY_RULES = [
    ({"amenity": ["restaurant","cafe","bar","pub","fast_food","food_court","ice_cream","bakery"]}, "Food & Drink"),
    ({"tourism": ["museum","gallery","attraction","artwork","viewpoint","monument","heritage"]},    "Culture & Sights"),
    ({"amenity": ["theatre","cinema","arts_centre","library"]},                                    "Culture & Sights"),
    ({"leisure": ["park","garden","nature_reserve","playground"]},                                 "Outdoors"),
    ({"natural": ["beach","peak","waterfall","hot_spring","cave_entrance"]},                       "Outdoors"),
    ({"tourism": ["camp_site","picnic_site"]},                                                     "Outdoors"),
    ({"shop":    True},                                                                            "Shopping"),
    ({"amenity": ["marketplace"]},                                                                 "Shopping"),
    ({"tourism": ["hotel","hostel","motel","guest_house","apartment"]},                            "Accommodation"),
    ({"amenity": ["nightclub","casino"]},                                                          "Nightlife"),
    ({"amenity": ["bus_station","ferry_terminal"]},                                                "Transport"),
    ({"railway": ["station","halt"]},                                                              "Transport"),
    ({"aeroway": ["terminal"]},                                                                    "Transport"),
    ({"leisure": ["spa","sauna","fitness_centre","swimming_pool"]},                                "Wellness"),
    ({"amenity": ["spa"]},                                                                         "Wellness"),
]

def tags_to_category(tags: dict) -> str:
    for rule, category in TAG_CATEGORY_RULES:
        for key, values in rule.items():
            tag_val = tags.get(key)
            if not tag_val:
                continue
            if values is True:
                return category
            if isinstance(values, list) and tag_val in values:
                return category
    return "Unknown"

def tags_to_cost(tags: dict) -> str | None:
    if tags.get("fee") == "no" or tags.get("charge") == "no":
        return "free"
    if tags.get("fee") == "yes":
        return "$"
    lvl = tags.get("price_level")
    if lvl:
        try:
            n = int(lvl)
            return ["$", "$$", "$$$"][min(n - 1, 2)]
        except ValueError:
            pass
    return None

# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _do_request(req: Request, timeout: int) -> dict | list | None:
    """
    Execute a urllib Request with exponential backoff on 429 and 504.
    Returns parsed JSON or None on permanent failure.
    """
    for attempt in range(MAX_RETRIES + 1):
        try:
            with urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode())

        except HTTPError as e:
            if e.code in (429, 504) and attempt < MAX_RETRIES:
                # 429 = rate limited, 504 = server overloaded — both are transient
                wait = RETRY_BASE_S * (2 ** attempt)
                # Honour Retry-After header if the server sends one
                retry_after = e.headers.get("Retry-After")
                if retry_after:
                    try:
                        wait = max(wait, float(retry_after))
                    except ValueError:
                        pass
                print(f"  ↻  HTTP {e.code} — retrying in {wait:.0f}s "
                      f"(attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(wait)
            else:
                print(f"  ⚠  HTTP error: {e}")
                return None

        except (URLError, json.JSONDecodeError) as e:
            print(f"  ⚠  HTTP error: {e}")
            return None

    return None


def http_get_json(url: str, params: dict | None = None) -> dict | list | None:
    full_url = url + ("?" + urlencode(params) if params else "")
    req = Request(full_url, headers={"User-Agent": USER_AGENT})
    return _do_request(req, timeout=10)


def http_post(url: str, body: str, timeout: int = 20) -> dict | None:
    data = ("data=" + body).encode()
    req = Request(url, data=data, headers={
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
    })
    return _do_request(req, timeout=timeout)

# ── Nominatim geocoding ───────────────────────────────────────────────────────

def geocode(name: str, region: str) -> dict | None:
    """Returns best Nominatim result or None."""
    # Try name + region first for best disambiguation
    for query in [f"{name}, {region}", name]:
        results = http_get_json(NOMINATIM_URL, {
            "q": query,
            "format": "json",
            "limit": 3,
            "addressdetails": 1,
        })
        time.sleep(NOMINATIM_DELAY_S)
        if results:
            return results[0]
    return None

# ── Overpass enrichment ───────────────────────────────────────────────────────

def enrich_with_overpass(lat: float, lng: float, name: str) -> dict:
    """Returns {category, cost, hours} from nearest OSM node/way."""
    query = f"""
    [out:json][timeout:{OVERPASS_TIMEOUT_S}];
    (
      node(around:{OVERPASS_RADIUS_M},{lat},{lng});
      way(around:{OVERPASS_RADIUS_M},{lat},{lng});
    );
    out tags center;
    """
    # HTTP timeout is slightly longer than the query timeout so the server
    # has time to return a proper error rather than us cutting it off first
    result = http_post(OVERPASS_URL, query, timeout=OVERPASS_TIMEOUT_S + 10)
    time.sleep(OVERPASS_DELAY_S)

    if not result:
        return {"category": "Unknown", "cost": None, "hours": None}

    elements = result.get("elements", [])
    match = find_best_osm_match(elements, name)
    if not match:
        return {"category": "Unknown", "cost": None, "hours": None}

    tags = match.get("tags", {})
    return {
        "category": tags_to_category(tags),
        "cost":     tags_to_cost(tags),
        "hours":    tags.get("opening_hours"),
    }

def find_best_osm_match(elements: list, name: str) -> dict | None:
    if not elements:
        return None
    name_lower = name.lower()
    # Exact match
    for el in elements:
        if (el.get("tags", {}).get("name", "")).lower() == name_lower:
            return el
    # Partial match
    for el in elements:
        osm_name = (el.get("tags", {}).get("name", "")).lower()
        if osm_name and (name_lower in osm_name or osm_name in name_lower):
            return el
    # First element with meaningful tags
    return next((el for el in elements if len(el.get("tags", {})) > 1), None)

# ── Stable ID (matches frontend kmlParser.js) ─────────────────────────────────

def stable_id(name: str, lat: float, lng: float) -> str:
    s = f"{name}|{lat:.5f}|{lng:.5f}"
    h = 0
    for ch in s:
        h = (31 * h + ord(ch)) & 0xFFFFFFFF
    return f"place_{h}"

# ── Address formatting ────────────────────────────────────────────────────────

def format_address(nominatim_result: dict) -> str:
    addr = nominatim_result.get("address", {})
    parts = []
    for key in ["road", "suburb", "city_district", "city", "town", "village", "state", "country"]:
        val = addr.get(key)
        if val and val not in parts:
            parts.append(val)
    return ", ".join(parts[:4])  # keep it concise

# ── Main pipeline ─────────────────────────────────────────────────────────────

def process_places(names: list[str], region: str) -> list[dict]:
    places = []
    total = len(names)

    for i, name in enumerate(names, 1):
        print(f"  [{i}/{total}] {name}")

        geo = geocode(name, region)
        if not geo:
            print(f"         ✗ Could not geocode — skipping")
            continue

        lat = float(geo["lat"])
        lng = float(geo["lon"])
        address = format_address(geo)
        print(f"         ✓ {lat:.4f}, {lng:.4f}  {address}")

        enriched = enrich_with_overpass(lat, lng, name)
        print(f"         ↳ {enriched['category']}"
              + (f"  {enriched['cost']}" if enriched["cost"] else "")
              + (f"  hours: {enriched['hours'][:30]}…" if enriched.get("hours") else ""))

        places.append({
            "id":       stable_id(name, lat, lng),
            "name":     name,
            "lat":      round(lat, 7),
            "lng":      round(lng, 7),
            "address":  address,
            "category": enriched["category"],
            "cost":     enriched["cost"],
            "hours":    enriched["hours"],
            "note":     "",
        })

    return places

# ── File I/O ──────────────────────────────────────────────────────────────────

def trip_id_from_name(name: str) -> str:
    """'Taipei & New Taipei' → 'taipei-new-taipei'"""
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def read_place_names(path: str) -> list[str]:
    names = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                names.append(line)
    return names

def update_manifest(index_path: Path, trip_id: str, trip_name: str, count: int):
    manifest = []
    if index_path.exists():
        with open(index_path) as f:
            manifest = json.load(f)

    # Replace existing entry for this trip_id or append
    existing = next((e for e in manifest if e["id"] == trip_id), None)
    entry = {"id": trip_id, "name": trip_name, "file": f"trips/{trip_id}.json", "count": count}
    if existing:
        manifest[manifest.index(existing)] = entry
    else:
        manifest.append(entry)

    # Sort alphabetically by name
    manifest.sort(key=lambda e: e["name"])

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\n  📋 Updated manifest: {index_path}")

# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Convert place names TXT → enriched trip JSON")
    parser.add_argument("input",          help="Path to .txt file with one place name per line")
    parser.add_argument("--region", "-r", required=True,
                        help='Region for geocoding disambiguation, e.g. "Taipei, Taiwan"')
    parser.add_argument("--trip",   "-t",
                        help='Display name for the trip, e.g. "Taipei". Defaults to region.')
    # Default output is always relative to this script file, not the working directory.
    # Script lives at maps-trip-planner/migration/ so one level up is maps-trip-planner/,
    # and the output goes to maps-trip-planner/public/trips/.
    default_output = str(Path(__file__).parent.parent / "public" / "trips")
    parser.add_argument("--output", "-o", default=default_output,
                        help="Output directory (default: maps-trip-planner/public/trips)")
    args = parser.parse_args()

    trip_name = args.trip or args.region.split(",")[0].strip()
    trip_id   = trip_id_from_name(trip_name)
    out_dir   = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n🗺️  Trip Planner — place enrichment pipeline")
    print(f"   Trip:   {trip_name}")
    print(f"   Region: {args.region}")
    print(f"   Output: {out_dir / (trip_id + '.json')}\n")

    names = read_place_names(args.input)
    if not names:
        print("No place names found in input file.")
        sys.exit(1)
    print(f"Found {len(names)} place(s). Starting geocoding + enrichment…\n")

    places = process_places(names, args.region)

    # Write trip JSON
    trip_file = out_dir / f"{trip_id}.json"
    payload = {
        "trip":      trip_name,
        "region":    args.region,
        "generated": datetime.now(timezone.utc).isoformat(),
        "places":    places,
    }
    with open(trip_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    # Update manifest
    update_manifest(out_dir / "index.json", trip_id, trip_name, len(places))

    skipped = len(names) - len(places)
    print(f"\n✅  Done: {len(places)} places enriched"
          + (f", {skipped} skipped (geocoding failed)" if skipped else ""))
    print(f"   → {trip_file}")
    print(f"\nNext: commit public/trips/ and push to deploy.")

if __name__ == "__main__":
    main()
