"""
ADRS Volume 6 ocean area definitions.

Replaces the old 3-preset ocean area system with ADRS (Admiralty Digital
Radio Signals) Volume 6 maritime areas used for professional operations.

Each area defines a bounding box for CMEMS field downloads and an optional
ice_bbox for ice-specific data (None for areas without sea ice).
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class ADRSArea:
    """One ADRS Volume 6 coverage area."""

    id: str
    label: str
    description: str
    bbox: Tuple[float, float, float, float]  # (lat_min, lat_max, lon_min, lon_max)
    ice_bbox: Optional[Tuple[float, float, float, float]]
    disabled: bool = False


# ---------------------------------------------------------------------------
# ADRS Volume 6 area registry
# ---------------------------------------------------------------------------

ADRS_AREAS: Dict[str, ADRSArea] = {
    "adrs_1_2": ADRSArea(
        id="adrs_1_2",
        label="ADRS 1+2: NW Europe",
        description="North Sea, Baltic, Norwegian Sea, NE Atlantic",
        bbox=(35.0, 72.0, -30.0, 30.0),
        ice_bbox=None,
    ),
    "adrs_4": ADRSArea(
        id="adrs_4",
        label="ADRS 4: Mediterranean",
        description="Mediterranean Sea and Black Sea",
        bbox=(28.0, 47.0, -10.0, 42.0),
        ice_bbox=None,
    ),
    "adrs_3": ADRSArea(
        id="adrs_3",
        label="ADRS 3: Arctic",
        description="Arctic Ocean",
        bbox=(60.0, 85.0, -180.0, 180.0),
        ice_bbox=(60.0, 85.0, -180.0, 180.0),
        disabled=True,
    ),
    "adrs_5": ADRSArea(
        id="adrs_5",
        label="ADRS 5: S. Atlantic & Indian",
        description="South Atlantic and Indian Ocean",
        bbox=(-60.0, 30.0, -70.0, 120.0),
        ice_bbox=None,
        disabled=True,
    ),
    "adrs_9": ADRSArea(
        id="adrs_9",
        label="ADRS 9: NW Atlantic",
        description="North America, Caribbean, Gulf of Mexico",
        bbox=(0.0, 55.0, -100.0, -30.0),
        ice_bbox=(45.0, 55.0, -100.0, -30.0),
        disabled=True,
    ),
}

# Which fields use area-specific bboxes vs global
AREA_SPECIFIC_FIELDS = {"waves", "swell", "currents", "ice", "sst"}
GLOBAL_FIELDS = {"wind", "visibility"}


def get_adrs_area(area_id: str) -> ADRSArea:
    """Look up an ADRS area by ID. Raises KeyError if not found."""
    return ADRS_AREAS[area_id]


def compute_union_bbox(
    area_ids: List[str],
) -> Optional[Tuple[float, float, float, float]]:
    """Compute the union bounding box of multiple ADRS areas.

    Returns (lat_min, lat_max, lon_min, lon_max) or None if no valid areas.
    """
    bboxes = []
    for aid in area_ids:
        area = ADRS_AREAS.get(aid)
        if area is not None:
            bboxes.append(area.bbox)
    if not bboxes:
        return None
    return (
        min(b[0] for b in bboxes),
        max(b[1] for b in bboxes),
        min(b[2] for b in bboxes),
        max(b[3] for b in bboxes),
    )


def compute_union_ice_bbox(
    area_ids: List[str],
) -> Optional[Tuple[float, float, float, float]]:
    """Compute the union ice bounding box of multiple ADRS areas.

    Returns (lat_min, lat_max, lon_min, lon_max) or None if no areas have ice.
    """
    bboxes = []
    for aid in area_ids:
        area = ADRS_AREAS.get(aid)
        if area is not None and area.ice_bbox is not None:
            bboxes.append(area.ice_bbox)
    if not bboxes:
        return None
    return (
        min(b[0] for b in bboxes),
        max(b[1] for b in bboxes),
        min(b[2] for b in bboxes),
        max(b[3] for b in bboxes),
    )
