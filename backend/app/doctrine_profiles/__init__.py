"""Doctrine profiles — swappable threshold rulesets.

A *profile* is a module that supplies every data table the classifier
functions in `app.doctrine` consume (slope bands, planning speeds, vehicle
classes, drone limits, terrain→MCOO mapping, road flow, …). `doctrine.py`
selects one at import time via the `IPB_PROFILE` env var (default
`military_atp`) and re-exports its tables, so the classifier functions and
every `doctrine.<TABLE>` consumer keep working unchanged.

This is the platform seam: a future `civil_engineering` profile (construction
slope limits, plant load classes, weather work-windows) drops in as a new
module here, selected with `IPB_PROFILE=civil_engineering`, with no change to
the classifiers or their callers.

The contract a profile must export is the set of UPPERCASE names listed in
`REQUIRED_TABLES`; `doctrine.py` validates this on load.
"""
from __future__ import annotations

REQUIRED_TABLES: tuple[str, ...] = (
    "SLOPE_MECHANIZED",
    "SLOPE_DISMOUNTED",
    "FOOT_SPEED_KMH",
    "MECH_SPEED_KMH",
    "VEHICLE_CLASSES",
    "DRONE_LIMITS",
    "COVER_PCT",
    "TARGET_ID_RANGE_M",
    "ENV_LIMITS",
    "ROAD_WIDTH_M",
    "ROAD_CAPACITY_VPH",
    "TERRAIN_PROFILES",
    "ROAD_FLOW_BY_CLASS",
)
