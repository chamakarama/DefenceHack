// @vitest-environment jsdom
//
// Proves the domain-profile seam end-to-end: a card reads its title from the
// active ProfileConfig, so swapping the provider re-skins the UI vocabulary
// without touching the component. This is the frontend counterpart to the
// backend IPB_PROFILE swap.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TerrainEffectsCard from '../dashboard/briefing/TerrainEffectsCard';
import { MILITARY_PROFILE, ProfileProvider, type ProfileConfig } from '../profile';
import { useBboxStore } from '../store';

afterEach(() => {
  cleanup();
  useBboxStore.setState({ bbox: null, zoom: null });
});

function renderWithProfile(profile: ProfileConfig) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // No bbox → card renders its EmptyCard with the profile-driven short title,
  // without firing the (disabled) query.
  return render(
    <QueryClientProvider client={qc}>
      <ProfileProvider value={profile}>
        <TerrainEffectsCard />
      </ProfileProvider>
    </QueryClientProvider>,
  );
}

describe('profile seam', () => {
  it('renders the default military title', () => {
    renderWithProfile(MILITARY_PROFILE);
    expect(screen.getByText(MILITARY_PROFILE.briefing.terrainEffectsShort)).toBeInTheDocument();
  });

  it('re-skins the title when a different profile is provided', () => {
    const civil: ProfileConfig = {
      ...MILITARY_PROFILE,
      id: 'civil_engineering',
      briefing: { ...MILITARY_PROFILE.briefing, terrainEffectsShort: 'Site Suitability' },
    };
    renderWithProfile(civil);
    expect(screen.getByText('Site Suitability')).toBeInTheDocument();
    expect(screen.queryByText('Terrain Effects')).not.toBeInTheDocument();
  });
});
