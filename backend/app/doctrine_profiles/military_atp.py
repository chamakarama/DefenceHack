"""Military doctrine profile — ATP 2-41.1 Appendix B thresholds.

This is the default profile. Every value here traces back to ATP 2-41.1
(Headquarters, Department of the Army, 2021) Appendix B; the originating
table (B-1 … B-17) is named in the `cite` field of the classifier output and
in the section comments below. These are the numbers that were previously
inlined in `app.doctrine`; they live here so the ruleset can be swapped for a
different domain (see `app.doctrine_profiles`) without touching the classifier
logic that reads them.
"""
from __future__ import annotations

from typing import Any


# ── Table B-2 — Terrain classification by slope (%) ──────────────────────────
# Mechanized / armored forces.
SLOPE_MECHANIZED = {
    "unrestricted":         (0.0, 30.0),
    "restricted":           (30.0, 45.0),
    "severely_restricted":  (45.0, float("inf")),
}
# Foot / dismounted forces — wider tolerance.
SLOPE_DISMOUNTED = {
    "unrestricted":         (0.0, 45.0),
    "restricted":           (45.0, 60.0),
    "severely_restricted":  (60.0, float("inf")),
}


# ── Table B-7 / B-8 — Planning speeds (km/h) ─────────────────────────────────
FOOT_SPEED_KMH = {
    "road_day":             5.0,
    "road_night":           3.2,
    "cross_unrestricted":   2.4,
    "cross_restricted":     1.6,
    "cross_severe":         0.8,
}
MECH_SPEED_KMH = {
    "road_day":             40.0,
    "road_night":           25.0,
    "cross_unrestricted":   20.0,
    "cross_restricted":     8.0,
    "cross_severe":         0.0,   # treated as no-go
}

# ── Vehicle class profiles (Table B-7/B-8 extended) ──────────────────────────
# Speeds in km/h. max_load_tonnes is the vehicle's own combat weight for
# bridge_passable() checks. Typical Finnish Army / NATO partner vehicles.
VEHICLE_CLASSES: dict[str, dict] = {
    "tank": {
        "label": "Main Battle Tank (Leopard 2A6)",
        "road_day":           40.0,
        "road_night":         25.0,
        "cross_unrestricted": 20.0,
        "cross_restricted":    8.0,
        "cross_severe":        0.0,
        "max_load_tonnes":    68.0,
    },
    "tracked": {
        "label": "Tracked IFV (CV9030 / Pasi)",
        "road_day":           40.0,
        "road_night":         25.0,
        "cross_unrestricted": 25.0,
        "cross_restricted":   10.0,
        "cross_severe":        0.0,
        "max_load_tonnes":    30.0,
    },
    "wheeled": {
        "label": "Wheeled APC (Patria AMV)",
        "road_day":           50.0,
        "road_night":         35.0,
        "cross_unrestricted": 30.0,
        "cross_restricted":   12.0,
        "cross_severe":        0.0,
        "max_load_tonnes":    26.0,
    },
    "logistics": {
        "label": "Heavy Logistics (Sisu E13TP 8×8)",
        "road_day":           80.0,
        "road_night":         50.0,
        "cross_unrestricted": 20.0,
        "cross_restricted":    5.0,
        "cross_severe":        0.0,
        "max_load_tonnes":    16.0,   # payload — bridges rated for GVW ~32t
    },
    "foot": {
        "label": "Dismounted Infantry",
        "road_day":            5.0,
        "road_night":          3.2,
        "cross_unrestricted":  2.4,
        "cross_restricted":    1.6,
        "cross_severe":        0.8,
        "max_load_tonnes":     0.0,
    },
}

# ── Drone (UAS) operating limits ─────────────────────────────────────────────
# Tactical class UAS — quadrotor reconnaissance / small fixed-wing.
# Representative of DJI Matrice 300 / Schiebel Camcopter S-100 class.
# "marginal" = degraded performance / reduced endurance / extra risk.
# "no_go" = operations not recommended by manufacturer / safety regulations.
DRONE_LIMITS: dict[str, float] = {
    "wind_marginal_ms":       8.0,
    "wind_no_go_ms":         12.0,
    "gust_marginal_ms":      10.0,
    "gust_no_go_ms":         15.0,
    "temp_cold_marginal_c":   0.0,   # battery degradation onset
    "temp_cold_no_go_c":    -15.0,   # most batteries cease to function
    "temp_hot_no_go_c":      45.0,
    "vis_marginal_m":       3000.0,
    "vis_no_go_m":          1000.0,
    "ceiling_marginal_m":    300.0,  # cloud base
    "ceiling_no_go_m":       100.0,
    "precip_marginal_mmh":    2.0,   # light rain — many drones IP43 rated
    "precip_no_go_mmh":       5.0,   # moderate rain — risk of motor failure
}


# ── Table B-3 / B-4 — Cover & concealment thresholds (% canopy or roof) ──────
COVER_PCT = {
    "full":     75.0,
    "partial":  25.0,
    "none":     0.0,
}


# ── Table B-10 / B-11 — Detection & identification ranges (m) ────────────────
# (sensor, target) → (detect_m, identify_m)
TARGET_ID_RANGE_M: dict[tuple[str, str], tuple[int, int]] = {
    ("naked_eye",  "personnel"): (1000, 300),
    ("naked_eye",  "vehicle"):   (1500, 500),
    ("binoculars", "personnel"): (3000, 1000),
    ("binoculars", "vehicle"):   (6000, 2000),
    ("thermal",    "personnel"): (2000, 1000),
    ("thermal",    "vehicle"):   (4500, 2500),
}


# ── Table B-12 — Environmental mission-limiting thresholds ───────────────────
ENV_LIMITS = {
    "aviation_ceiling_ft_min":    700,   # below = no rotary-wing
    "aviation_vis_mi_min":        1.0,   # below = no rotary-wing
    "aviation_wind_kt_max":       35,    # above = no rotary-wing
    "ground_temp_c_min":          -20,   # below = cold-weather restricted ops
    "ground_wind_ms_max":         25,    # above = artillery accuracy degraded
    "precip_mm_per_hr_threshold": 5.0,   # above = ground movement degraded
}


# ── Table B-16 / B-17 — Traffic flow by route width (m) ──────────────────────
ROAD_WIDTH_M = {
    "single_wheel":  5.0,
    "two_wheel":     7.0,
    "two_track":     9.0,
}
# Vehicles/hour capacity (Table B-17).
ROAD_CAPACITY_VPH = {
    "single_wheel":  200,
    "two_wheel":     600,
    "two_track":     1200,
}


# ── Terrain → MCOO mapping with doctrinal citations ──────────────────────────
# Each profile gives the MCOO class, the table that justifies it, and a
# one-sentence rationale that names the doctrinal threshold being applied.
TERRAIN_PROFILES: dict[str, dict[str, str]] = {
    # MML codes (terrain_type from mml provider)
    "Jarvi":          {"class": "no-go",   "cite": "B-2",
                       "reason": "open water — impassable to wheeled/tracked forces"},
    "Virtavesialue":  {"class": "no-go",   "cite": "B-2",
                       "reason": "river course — requires crossing means; impassable otherwise"},
    "Meriaalue":      {"class": "no-go",   "cite": "B-2",
                       "reason": "sea — impassable to ground forces"},
    "Suo":            {"class": "slow-go", "cite": "B-2/B-8",
                       "reason": "swamp — soil bearing capacity caps mech speed at ≤ 8 km/h (B-8 restricted)"},
    "KallioAlue":     {"class": "slow-go", "cite": "B-2",
                       "reason": "bedrock — slope variability typically in 30–45% restricted band (B-2)"},
    "HiekkaSoraAlue": {"class": "slow-go", "cite": "B-8",
                       "reason": "sand/gravel — reduced traction; planning speed ≤ 10 km/h"},
    # MML OGC v1 English terrain aliases used by the updated provider.
    "lake":           {"class": "no-go",   "cite": "B-2",
                       "reason": "open water — impassable to wheeled/tracked forces"},
    "river":          {"class": "no-go",   "cite": "B-2",
                       "reason": "river course — requires crossing means; impassable otherwise"},
    "sea":            {"class": "no-go",   "cite": "B-2",
                       "reason": "sea — impassable to ground forces"},
    "swamp":          {"class": "slow-go", "cite": "B-2/B-8",
                       "reason": "swamp — soil bearing capacity caps mech speed at ≤ 8 km/h (B-8 restricted)"},
    "bedrock":        {"class": "slow-go", "cite": "B-2",
                       "reason": "bedrock — slope variability typically in 30–45% restricted band (B-2)"},
    "sand":           {"class": "slow-go", "cite": "B-8",
                       "reason": "soft sand — reduced traction (B-8 restricted band)"},
    # OSM landuse codes
    "forest":         {"class": "slow-go", "cite": "B-3/B-4",
                       "reason": "≥ 75% canopy = full concealment (B-3) but restricts mounted maneuver"},
    "wood":           {"class": "slow-go", "cite": "B-3/B-4",
                       "reason": "see forest — ≥ 75% canopy threshold (B-3)"},
    "scrub":          {"class": "slow-go", "cite": "B-3/B-4",
                       "reason": "25–75% canopy = partial concealment band (B-3); restricted maneuver"},
    "wetland":        {"class": "slow-go", "cite": "B-2",
                       "reason": "saturated soil — restricted to mech (B-2), passable foot"},
    "farmland":       {"class": "go",      "cite": "B-2",
                       "reason": "open cultivated terrain — slope < 30%, unrestricted mech"},
    "meadow":         {"class": "go",      "cite": "B-2",
                       "reason": "open vegetation — < 30% slope, unrestricted"},
    "grass":          {"class": "go",      "cite": "B-2",
                       "reason": "open vegetation — < 30% slope, unrestricted"},
    "grassland":      {"class": "go",      "cite": "B-2",
                       "reason": "open vegetation — < 30% slope, unrestricted"},
    "residential":    {"class": "slow-go", "cite": "B-2",
                       "reason": "built-up area — restricted lanes, frequent obstacles"},
    "commercial":     {"class": "slow-go", "cite": "B-2",
                       "reason": "built-up area — restricted lanes"},
    "industrial":     {"class": "slow-go", "cite": "B-2",
                       "reason": "built-up area — restricted lanes"},
    "retail":         {"class": "slow-go", "cite": "B-2",
                       "reason": "built-up area — restricted lanes"},
    "military":       {"class": "slow-go", "cite": "B-2",
                       "reason": "fixed military installation — access restricted"},
    "beach":          {"class": "slow-go", "cite": "B-8",
                       "reason": "soft sand — reduced traction (B-8 restricted band)"},
    "sand":           {"class": "slow-go", "cite": "B-8",
                       "reason": "soft sand — reduced traction (B-8 restricted band)"},
    "cliff":          {"class": "no-go",   "cite": "B-2",
                       "reason": "vertical relief > 60% slope — severely restricted / impassable"},
    "building":       {"class": "no-go",   "cite": "B-2",
                       "reason": "structure footprint — obstacle to mounted movement"},
}


# ── Road traffic-flow profiles by Digiroad functional class ──────────────────
# Digiroad TOIMINNALLINEN_LUOKKA runs 1 (motorway) … 7 (track).
ROAD_FLOW_BY_CLASS: dict[int, dict[str, Any]] = {
    1: {"width_m": 14.0, "cite": "B-16/B-17", "flow": "two_track",
        "reason": "motorway ≥ 14 m — two-lane tracked traffic, ~1200 vph capacity"},
    2: {"width_m": 11.0, "cite": "B-16/B-17", "flow": "two_track",
        "reason": "main road ~11 m — two-lane tracked traffic"},
    3: {"width_m":  9.0, "cite": "B-16/B-17", "flow": "two_track",
        "reason": "regional road ~9 m — two-lane tracked traffic (B-16)"},
    4: {"width_m":  7.0, "cite": "B-16/B-17", "flow": "two_wheel",
        "reason": "connecting road ~7 m — two-lane wheeled or single-lane tracked"},
    5: {"width_m":  6.0, "cite": "B-17", "flow": "two_wheel",
        "reason": "local road ~6 m — two-lane wheeled, ~600 vph"},
    6: {"width_m":  4.5, "cite": "B-17", "flow": "single_wheel",
        "reason": "minor road < 5 m — single-lane wheeled only (B-17)"},
    7: {"width_m":  3.5, "cite": "B-17", "flow": "single_wheel",
        "reason": "track/path < 5 m — single-lane wheeled, off-road class"},
}
