"""
Default weather coverage bounding boxes.

Replaces the ADRS area system with a single fixed coverage region
covering NE Atlantic, Europe, and the Mediterranean.  Users fetch
additional areas by panning the map — the per-layer viewport resync
(POST /api/weather/{field}/resync) handles on-demand downloads.
"""

# (lat_min, lat_max, lon_min, lon_max)
DEFAULT_COVERAGE_BBOX: tuple[float, float, float, float] = (25.0, 72.0, -50.0, 45.0)
DEFAULT_ICE_BBOX: tuple[float, float, float, float] = (55.0, 80.0, -50.0, 45.0)
