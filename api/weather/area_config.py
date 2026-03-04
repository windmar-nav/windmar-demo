"""
Persistence for selected ADRS ocean areas.

Stores selected area IDs in ``data/area_config.json`` which lives inside the
Docker volume and survives container restarts.
"""

import json
import logging
from pathlib import Path
from typing import List

from api.weather.adrs_areas import ADRS_AREAS

logger = logging.getLogger(__name__)

_CONFIG_PATH = Path("data/area_config.json")
_DEFAULT_AREAS = ["adrs_1_2"]


def get_selected_areas() -> List[str]:
    """Return the list of currently selected ADRS area IDs."""
    if not _CONFIG_PATH.exists():
        return list(_DEFAULT_AREAS)
    try:
        data = json.loads(_CONFIG_PATH.read_text())
        areas = data.get("selected_areas", _DEFAULT_AREAS)
        # Validate all IDs exist
        return [a for a in areas if a in ADRS_AREAS]
    except Exception:
        logger.warning("Could not read area config, using defaults")
        return list(_DEFAULT_AREAS)


def set_selected_areas(areas: List[str]) -> None:
    """Validate and persist the selected ADRS area list."""
    validated = []
    for area_id in areas:
        if area_id not in ADRS_AREAS:
            raise ValueError(f"Unknown ADRS area: {area_id}")
        area = ADRS_AREAS[area_id]
        if area.disabled:
            raise ValueError(f"Area {area_id} is disabled")
        validated.append(area_id)

    if not validated:
        raise ValueError("At least one area must be selected")

    _CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    _CONFIG_PATH.write_text(
        json.dumps({"selected_areas": validated}, indent=2) + "\n"
    )
    logger.info("Selected areas updated: %s", validated)
