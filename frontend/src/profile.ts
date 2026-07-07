// Domain profile seam (frontend counterpart of backend app/doctrine_profiles).
//
// The UI carries domain-specific language — "MCOO", "warfighting functions",
// "UAS / Drone Conditions". A future civil-engineering or emergency-management
// build of this tool re-skins those strings without forking components. This
// module is the single place that language lives: components read it through
// `useProfile()` instead of hard-coding literals.
//
// This is a *seam*, demonstrated on the briefing-card titles — not yet a full
// sweep of every string. New strings should follow the same pattern: add a
// field here, read it via useProfile() in the component.
import { createContext, createElement, useContext, type ReactNode } from 'react';

export interface ProfileConfig {
  /** Stable id. Mirrors the backend IPB_PROFILE where the domains line up. */
  id: string;
  /** Human label for the active domain. */
  label: string;
  /** Domain terminology — swap to re-skin the UI for another domain. */
  terms: {
    /** Combined-obstacle overlay product name (military: "MCOO"). */
    mcoo: string;
    /** Five-function analysis label (military: "Warfighting Functions"). */
    functionsLabel: string;
  };
  /** Briefing-card titles. `*Short` variants are used in skeleton/empty states. */
  briefing: {
    terrainEffects: string;
    terrainEffectsShort: string;
    weather: string;
    weatherShort: string;
    drone: string;
    satellites: string;
    astronomy: string;
    astronomyShort: string;
  };
}

/** Default profile — the ATP 2-41.1 military domain this tool shipped with. */
export const MILITARY_PROFILE: ProfileConfig = {
  id: 'military_atp',
  label: 'Military IPB (ATP 2-41.1)',
  terms: {
    mcoo: 'MCOO',
    functionsLabel: 'Warfighting Functions',
  },
  briefing: {
    terrainEffects: 'Terrain Effects Matrix',
    terrainEffectsShort: 'Terrain Effects',
    weather: 'Weather · FMI observations',
    weatherShort: 'Weather (FMI)',
    drone: 'UAS / Drone Conditions',
    satellites: 'Starlink overhead',
    astronomy: 'Astronomy · sun / moon / twilight',
    astronomyShort: 'Astronomy',
  },
};

const ProfileContext = createContext<ProfileConfig>(MILITARY_PROFILE);

/**
 * Provide the active domain profile to the tree. Defaults to MILITARY_PROFILE,
 * so components using useProfile() work whether or not this wraps them — the
 * provider exists so a future build can swap the whole UI vocabulary in one place.
 */
export function ProfileProvider({
  value,
  children,
}: {
  value?: ProfileConfig;
  children: ReactNode;
}) {
  return createElement(
    ProfileContext.Provider,
    { value: value ?? MILITARY_PROFILE },
    children,
  );
}

export function useProfile(): ProfileConfig {
  return useContext(ProfileContext);
}
