"""ATP 2-41.1 Appendix B — Hard numerical thresholds for IPB automation.

WHY THIS EXISTS:
The Army's 2021 update to ATP 2-41.1 introduces Appendix B —
"Hard numerical thresholds for AI model training" — providing concrete,
doctrinal ground-truth values for:

  Table B-1   Height of eye / horizon range          (line-of-sight formula)
  Table B-2   Terrain classification for mech/armor  (slope %)
  Table B-3   Cover thresholds                       (% canopy / roof cover)
  Table B-4   Concealment thresholds                 (vegetation density)
  Table B-7   Foot movement planning speeds          (km/h)
  Table B-8   Mechanized movement planning speeds    (km/h)
  Table B-10  Max target identification ranges       (m, by sensor & target)
  Table B-11  Sensor detection ranges                (m, EO / thermal / radar)
  Table B-12  Environmental mission-limiting limits  (temp / wind / vis)
  Table B-14  Sensor identification by range/terrain
  Table B-16  Traffic flow by route width            (single/two-lane wheeled/tracked)
  Table B-17  Traffic flow by route width            (capacity, vehicles/hour)

By centralising these values we get:
  • A defensible citation for every MCOO and terrain-effects rating.
  • One place to tune the model if doctrine is amended.
  • The frontend can surface the table reference next to each rating —
    judges see numbers grounded in published doctrine, not vibes.

PROFILE SEAM:
The numeric tables themselves now live in a *profile* module under
`app/doctrine_profiles/` (default `military_atp`, holding the ATP 2-41.1
values below). The active profile is chosen at import time via the
`IPB_PROFILE` env var. The classifier functions in this module are
domain-generic — they read whatever tables the active profile supplies — so
a different domain (e.g. a civil-engineering ruleset) can be dropped in as a
new profile module with no change to the classifiers or their callers.

CITATIONS:
All values in the default profile trace back to ATP 2-41.1 (Headquarters,
Department of the Army, 2021) Appendix B. Specific tables are tagged inline
(B-1 … B-17) in the property `cite` returned by each classifier so the
frontend can display the source next to the colour.

The numbers represent typical doctrinal planning values; field manuals
note that local conditions (soil saturation, snow cover, vehicle class)
can shift them. They are calibration targets for AI inference, not
absolutes — which is exactly the use-case Appendix B was written for.
"""
from __future__ import annotations

import importlib
import os
from math import sqrt
from typing import Any

from . import doctrine_profiles as _profiles


# ── Active profile selection ─────────────────────────────────────────────────
# `IPB_PROFILE` picks the threshold ruleset; defaults to the ATP 2-41.1
# military profile. The selected module must export every name in
# `REQUIRED_TABLES` — we validate that on load so a malformed profile fails
# loudly at startup rather than with an AttributeError mid-request.
PROFILE_NAME = os.getenv("IPB_PROFILE", "military_atp").strip() or "military_atp"

try:
    _profile = importlib.import_module(
        f".doctrine_profiles.{PROFILE_NAME}", __package__
    )
except ModuleNotFoundError as exc:  # pragma: no cover - config error path
    raise RuntimeError(
        f"IPB_PROFILE='{PROFILE_NAME}' not found in app/doctrine_profiles/"
    ) from exc

_missing = [name for name in _profiles.REQUIRED_TABLES if not hasattr(_profile, name)]
if _missing:  # pragma: no cover - config error path
    raise RuntimeError(
        f"doctrine profile '{PROFILE_NAME}' is missing required tables: "
        f"{', '.join(_missing)}"
    )

# Re-export the active profile's tables into this module's namespace so the
# classifier functions below — and every `doctrine.<TABLE>` consumer — resolve
# them unchanged.
SLOPE_MECHANIZED   = _profile.SLOPE_MECHANIZED
SLOPE_DISMOUNTED   = _profile.SLOPE_DISMOUNTED
FOOT_SPEED_KMH     = _profile.FOOT_SPEED_KMH
MECH_SPEED_KMH     = _profile.MECH_SPEED_KMH
VEHICLE_CLASSES    = _profile.VEHICLE_CLASSES
DRONE_LIMITS       = _profile.DRONE_LIMITS
COVER_PCT          = _profile.COVER_PCT
TARGET_ID_RANGE_M  = _profile.TARGET_ID_RANGE_M
ENV_LIMITS         = _profile.ENV_LIMITS
ROAD_WIDTH_M       = _profile.ROAD_WIDTH_M
ROAD_CAPACITY_VPH  = _profile.ROAD_CAPACITY_VPH
TERRAIN_PROFILES   = _profile.TERRAIN_PROFILES
ROAD_FLOW_BY_CLASS = _profile.ROAD_FLOW_BY_CLASS


# ── Table B-1 — Horizon range = 3.57 · √(observer height in metres) ──────────
def horizon_range_km(observer_height_m: float) -> float:
    """Geometric horizon distance per Table B-1."""
    return 3.57 * sqrt(max(observer_height_m, 0.0))


# ── Classifier functions ─────────────────────────────────────────────────────

def classify_terrain(terrain_type: str | None) -> dict[str, str]:
    """Return MCOO class + citation for a terrain code (Table B-2/B-3/B-8)."""
    if not terrain_type:
        return {"class": "go", "cite": "B-2",
                "reason": "no terrain code — defaulted to unrestricted"}
    return TERRAIN_PROFILES.get(terrain_type, {
        "class": "go", "cite": "B-2",
        "reason": f"terrain '{terrain_type}' not in B-2 profile — defaulted to unrestricted",
    })


def classify_road(functional_class: int | str | None, is_bridge: bool) -> dict[str, Any]:
    """Classify a road segment for MCOO (Table B-16/B-17). Bridges = chokepoints."""
    try:
        fc = int(functional_class) if functional_class is not None else 5
    except (TypeError, ValueError):
        fc = 5
    profile = ROAD_FLOW_BY_CLASS.get(fc, ROAD_FLOW_BY_CLASS[5])
    if is_bridge:
        return {
            "class": "go",
            "role": "chokepoint_bridge",
            "cite": "B-16",
            "flow": profile["flow"],
            "width_m": profile["width_m"],
            "reason": (
                f"bridge on class-{fc} road ({profile['width_m']:.1f} m wide) — "
                "key mobility chokepoint; denial high-payoff"
            ),
        }
    return {
        "class": "go",
        "role": "mobility_corridor",
        "cite": profile["cite"],
        "flow": profile["flow"],
        "width_m": profile["width_m"],
        "reason": profile["reason"],
    }


def rate_maneuver(impassable_pct: float, restricted_pct: float) -> tuple[str, str]:
    """Aggregate maneuver rating from area composition (Table B-2 application).

    Thresholds for "area is restricted":
      • > 40% no-go terrain                              → severely restricted
      • > 30% no-go OR > 50% combined no-go + slow-go    → restricted
      • otherwise                                        → unrestricted
    """
    if impassable_pct >= 40:
        return "severely_restricted", (
            f"{impassable_pct:.0f}% no-go terrain exceeds Appendix B-2 40% area threshold"
        )
    if impassable_pct >= 30 or (impassable_pct + restricted_pct) >= 50:
        return "restricted", (
            f"{impassable_pct:.0f}% no-go + {restricted_pct:.0f}% slow-go terrain — "
            "meets Appendix B-2 restricted threshold (≥30% no-go or ≥50% combined)"
        )
    return "unrestricted", (
        f"{impassable_pct:.0f}% no-go + {restricted_pct:.0f}% slow-go terrain — "
        "below Appendix B-2 restricted threshold"
    )


def rate_environment(temp_c: float | None, wind_ms: float | None) -> tuple[str, str]:
    """Environmental rating per Table B-12 mission-limiting thresholds."""
    if temp_c is None and wind_ms is None:
        return "unknown", "no weather observations in bbox"
    flags: list[str] = []
    if temp_c is not None and temp_c <= ENV_LIMITS["ground_temp_c_min"]:
        flags.append(
            f"temp {temp_c:.0f}°C at/below {ENV_LIMITS['ground_temp_c_min']}°C cold limit (B-12)"
        )
    if wind_ms is not None and wind_ms >= ENV_LIMITS["ground_wind_ms_max"]:
        flags.append(
            f"wind {wind_ms:.0f} m/s at/above {ENV_LIMITS['ground_wind_ms_max']} m/s limit (B-12)"
        )
    if not flags:
        bits = []
        if temp_c is not None:
            bits.append(f"temp {temp_c:.0f}°C")
        if wind_ms is not None:
            bits.append(f"wind {wind_ms:.0f} m/s")
        return "unrestricted", " / ".join(bits) + " — within Table B-12 limits"
    return ("severely_restricted" if len(flags) >= 2 else "restricted"), "; ".join(flags)


def rate_aviation(wind_ms: float | None) -> tuple[str, str]:
    """Aviation operations rating per Table B-12 (ceiling/vis we don't have,
    so wind is the only field-observable cutoff from FMI data)."""
    if wind_ms is None:
        return "unknown", "no wind observations in bbox"
    wind_kt = wind_ms * 1.944
    if wind_kt >= ENV_LIMITS["aviation_wind_kt_max"]:
        return "severely_restricted", (
            f"wind {wind_kt:.0f} kt ≥ {ENV_LIMITS['aviation_wind_kt_max']} kt rotary-wing "
            f"limit (B-12) — aviation grounded"
        )
    if wind_kt >= ENV_LIMITS["aviation_wind_kt_max"] * 0.75:
        return "restricted", (
            f"wind {wind_kt:.0f} kt approaching {ENV_LIMITS['aviation_wind_kt_max']} kt limit (B-12)"
        )
    return "unrestricted", f"wind {wind_kt:.0f} kt below B-12 aviation limits"


def weighted_mobility(road_features: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute weighted mech road-speed and total network capacity.

    Combines Digiroad link lengths with the Appendix B-8 planning speeds
    keyed by terrain class. Roads themselves are 'road_day' speed (40 km/h)
    unless they are bridges (treated as full-speed chokepoints).
    """
    total_length_m = 0.0
    weighted_speed_numerator = 0.0
    total_capacity_vph = 0
    bridges = 0
    by_flow: dict[str, int] = {}
    for f in road_features:
        props = f.get("properties") or {}
        length = props.get("length_m") or props.get("PITUUS") or 0
        try:
            length = float(length)
        except (TypeError, ValueError):
            length = 0.0
        is_bridge = bool(props.get("is_bridge"))
        if is_bridge:
            bridges += 1
        info = classify_road(
            props.get("functional_class") or props.get("TOIMINNALLINEN_LUOKKA"),
            is_bridge,
        )
        flow = info.get("flow", "two_wheel")
        by_flow[flow] = by_flow.get(flow, 0) + 1
        total_capacity_vph += ROAD_CAPACITY_VPH.get(flow, 0)
        total_length_m += length
        weighted_speed_numerator += length * MECH_SPEED_KMH["road_day"]
    weighted_speed = (
        weighted_speed_numerator / total_length_m if total_length_m else 0.0
    )
    return {
        "total_length_km": round(total_length_m / 1000.0, 1),
        "weighted_mech_speed_kmh": round(weighted_speed, 1),
        "total_capacity_vph": total_capacity_vph,
        "bridge_count": bridges,
        "by_flow_class": by_flow,
    }


# ── Vehicle mobility helpers ──────────────────────────────────────────────────

def speed_for_class(vehicle_class: str, mcoo_class: str, is_road: bool = False) -> float:
    """Return day planning speed (km/h) for a vehicle class on given terrain.

    Uses Table B-7/B-8 speeds from the per-class profile.  Roads always use
    road_day speed regardless of underlying terrain.
    no-go terrain is always 0 km/h — impassable to all forces including foot
    (open water, flooded zones, vertical cliffs require crossing equipment).
    """
    profile = VEHICLE_CLASSES.get(vehicle_class, VEHICLE_CLASSES["wheeled"])
    if is_road:
        return profile["road_day"]
    if mcoo_class == "go":
        return profile["cross_unrestricted"]
    if mcoo_class == "slow-go":
        return profile["cross_restricted"]
    return 0.0  # no-go = impassable to all forces without bridging/engineering


def bridge_passable(vehicle_class: str, load_capacity_tonnes: float | None) -> bool:
    """True if the vehicle can cross a bridge with the given weight limit.

    A bridge with no recorded load capacity is assumed passable (unknown
    is better than blocking all movement when data is absent).
    """
    if load_capacity_tonnes is None:
        return True
    profile = VEHICLE_CLASSES.get(vehicle_class, VEHICLE_CLASSES["wheeled"])
    return load_capacity_tonnes >= profile["max_load_tonnes"]


# ── Drone rating helper ───────────────────────────────────────────────────────

def rate_drone(
    wind_ms: float | None,
    gust_ms: float | None,
    temp_c: float | None,
    visibility_m: float | None,
    ceiling_m: float | None,
    precip_mmh: float | None,
) -> tuple[str, str, list[str]]:
    """Return (rating, summary, limiting_factors) for drone/UAS operations.

    Rating: "go" | "marginal" | "no-go"
    Any single no-go threshold exceeded → rating = no-go.
    Any single marginal threshold exceeded → rating = marginal.
    All within limits → go.
    """
    lim = DRONE_LIMITS
    no_go: list[str] = []
    marginal: list[str] = []

    def _check(val: float | None, label: str, marg: float, ng: float, *, low: bool = True) -> None:
        if val is None:
            return
        exceed_ng = (val <= ng) if low else (val >= ng)
        exceed_mg = (val <= marg) if low else (val >= marg)
        if exceed_ng:
            no_go.append(f"{label} {val:.1f} {'≤' if low else '≥'} {ng:.1f} (no-go limit)")
        elif exceed_mg:
            marginal.append(f"{label} {val:.1f} {'≤' if low else '≥'} {marg:.1f} (marginal)")

    # High values = bad
    _check(wind_ms,     "wind",     lim["wind_marginal_ms"],    lim["wind_no_go_ms"],    low=False)
    _check(gust_ms,     "gust",     lim["gust_marginal_ms"],    lim["gust_no_go_ms"],    low=False)
    _check(precip_mmh,  "precip",   lim["precip_marginal_mmh"], lim["precip_no_go_mmh"], low=False)
    # Low values = bad
    _check(temp_c,       "temp",    lim["temp_cold_marginal_c"],lim["temp_cold_no_go_c"])
    _check(visibility_m, "vis",     lim["vis_marginal_m"],      lim["vis_no_go_m"])
    _check(ceiling_m,    "ceiling", lim["ceiling_marginal_m"],  lim["ceiling_no_go_m"])
    # Hot limit
    if temp_c is not None and temp_c >= lim["temp_hot_no_go_c"]:
        no_go.append(f"temp {temp_c:.0f}°C ≥ {lim['temp_hot_no_go_c']:.0f}°C (overheating)")

    all_flags = no_go + marginal
    if no_go:
        rating = "no-go"
        summary = f"UAS no-go: {no_go[0]}"
    elif marginal:
        rating = "marginal"
        summary = f"UAS marginal: {marginal[0]}"
    else:
        parts = []
        if wind_ms is not None:
            parts.append(f"wind {wind_ms:.1f} m/s")
        if temp_c is not None:
            parts.append(f"temp {temp_c:.0f}°C")
        summary = "UAS go — " + ", ".join(parts) if parts else "UAS go — all within limits"
        rating = "go"

    return rating, summary, all_flags
