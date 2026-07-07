// Pure-logic tests for the open-files / command-hierarchy store.
//
// These pin the rank/authority rules, tab lifecycle, phase switching, and
// overlay/merge behaviour that Workstream A moves into stores/openFiles.ts.
// Importing from the ./store barrel keeps them valid before and after the split.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  useOpenFilesStore,
  selectOverlayDrawnLayers,
} from '../store';
import type { Rank } from '../api/types';
import { makeContent, makeLive, makePhase } from './factories';

const reset = () =>
  useOpenFilesStore.setState({ tabs: [], activeTabId: null, overlayTabIds: [] });

beforeEach(reset);

describe('canCommand — rank & ancestry authority', () => {
  it('grants authority on higher rank', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'bn', rank: 5 as Rank }));
    s.openTab(makeContent({ id: 'co', rank: 4 as Rank }));
    expect(useOpenFilesStore.getState().canCommand('bn', 'co')).toBe(true);
    expect(useOpenFilesStore.getState().canCommand('co', 'bn')).toBe(false);
  });

  it('denies between equal-rank peers with no ancestry link', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'a', rank: 4 as Rank }));
    s.openTab(makeContent({ id: 'b', rank: 4 as Rank }));
    expect(useOpenFilesStore.getState().canCommand('a', 'b')).toBe(false);
    expect(useOpenFilesStore.getState().canCommand('b', 'a')).toBe(false);
  });

  it('grants authority via ancestry even when ranks are equal', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'parent', rank: 4 as Rank }));
    s.openTab(makeContent({ id: 'child', rank: 4 as Rank, parent_file_id: 'parent' }));
    expect(useOpenFilesStore.getState().canCommand('parent', 'child')).toBe(true);
  });

  it('grants authority via deep (transitive) ancestry', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'gp', rank: 2 as Rank }));
    s.openTab(makeContent({ id: 'p', rank: 2 as Rank, parent_file_id: 'gp' }));
    s.openTab(makeContent({ id: 'c', rank: 2 as Rank, parent_file_id: 'p' }));
    expect(useOpenFilesStore.getState().canCommand('gp', 'c')).toBe(true);
  });

  it('returns false for self and unknown ids', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'a' }));
    expect(useOpenFilesStore.getState().canCommand('a', 'a')).toBe(false);
    expect(useOpenFilesStore.getState().canCommand('a', 'ghost')).toBe(false);
  });

  it('does not infinite-loop on a cyclic parent graph', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'x', rank: 3 as Rank, parent_file_id: 'y' }));
    s.openTab(makeContent({ id: 'y', rank: 3 as Rank, parent_file_id: 'x' }));
    // Should terminate and return a boolean, not hang.
    expect(typeof useOpenFilesStore.getState().canCommand('x', 'y')).toBe('boolean');
  });
});

describe('rankRelation', () => {
  it('labels self / commands / commandedBy / peer / unrelated', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'bn', rank: 5 as Rank }));
    s.openTab(makeContent({ id: 'co', rank: 4 as Rank }));
    s.openTab(makeContent({ id: 'co2', rank: 4 as Rank }));
    const st = useOpenFilesStore.getState();
    expect(st.rankRelation('bn', 'bn')).toBe('self');
    expect(st.rankRelation('bn', 'co')).toBe('commands');
    expect(st.rankRelation('co', 'bn')).toBe('commandedBy');
    expect(st.rankRelation('co', 'co2')).toBe('peer');
  });
});

describe('tab lifecycle', () => {
  it('opens a new tab as active', () => {
    useOpenFilesStore.getState().openTab(makeContent({ id: 'a' }));
    const st = useOpenFilesStore.getState();
    expect(st.tabs).toHaveLength(1);
    expect(st.activeTabId).toBe('a');
  });

  it('focuses an already-open tab instead of duplicating it', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'a' }));
    s.openTab(makeContent({ id: 'b' }));
    s.openTab(makeContent({ id: 'a' }));
    const st = useOpenFilesStore.getState();
    expect(st.tabs).toHaveLength(2);
    expect(st.activeTabId).toBe('a');
  });

  it('captures outgoing live state into the prior active tab on switch', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'a' }));
    s.openTab(
      makeContent({ id: 'b' }),
      makeLive({ zoom: 11, activeLayers: ['mml'] }),
    );
    const tabA = useOpenFilesStore.getState().getTab('a')!;
    const phase = tabA.phases.find((p) => p.id === tabA.activePhaseId)!;
    expect(phase.zoom).toBe(11);
    expect(phase.active_layers).toEqual(['mml']);
    expect(tabA.isDirty).toBe(true);
  });

  it('promotes the left neighbour when closing the active tab', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'a' }));
    s.openTab(makeContent({ id: 'b' }));
    s.openTab(makeContent({ id: 'c' }));
    const next = useOpenFilesStore.getState().closeTab('c');
    expect(next).toBe('b');
    expect(useOpenFilesStore.getState().activeTabId).toBe('b');
  });

  it('returns null active id when the last tab is closed', () => {
    useOpenFilesStore.getState().openTab(makeContent({ id: 'a' }));
    expect(useOpenFilesStore.getState().closeTab('a')).toBeNull();
    expect(useOpenFilesStore.getState().tabs).toHaveLength(0);
  });
});

describe('setTabPhase', () => {
  it('switches phase and captures outgoing phase from live state', () => {
    const content = makeContent({
      id: 'a',
      phases: [makePhase({ id: 1 }), makePhase({ id: 2 })],
    });
    const s = useOpenFilesStore.getState();
    s.openTab(content);
    const result = useOpenFilesStore
      .getState()
      .setTabPhase('a', 2, makeLive({ zoom: 9 }));
    expect(result?.id).toBe(2);
    const tab = useOpenFilesStore.getState().getTab('a')!;
    expect(tab.activePhaseId).toBe(2);
    // Phase 1 (the outgoing one) should have captured the live zoom.
    expect(tab.phases.find((p) => p.id === 1)!.zoom).toBe(9);
  });

  it('returns null for a non-existent phase', () => {
    useOpenFilesStore.getState().openTab(makeContent({ id: 'a' }));
    expect(useOpenFilesStore.getState().setTabPhase('a', 99)).toBeNull();
  });
});

describe('overlay & merge', () => {
  it('only adds an overlay when the active tab has authority', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'bn', rank: 5 as Rank }));
    s.openTab(makeContent({ id: 'co', rank: 4 as Rank }));
    // active tab is now 'co' (last opened) — cannot overlay its superior.
    useOpenFilesStore.getState().addOverlay('bn');
    expect(useOpenFilesStore.getState().overlayTabIds).toEqual([]);
    // switch active to 'bn', which outranks 'co'.
    useOpenFilesStore.getState().setActiveTab('bn');
    useOpenFilesStore.getState().addOverlay('co');
    expect(useOpenFilesStore.getState().overlayTabIds).toEqual(['co']);
  });

  it('switching the active tab clears overlays', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'co', rank: 4 as Rank }));
    s.openTab(makeContent({ id: 'bn', rank: 5 as Rank }));
    useOpenFilesStore.getState().addOverlay('co');
    expect(useOpenFilesStore.getState().overlayTabIds).toEqual(['co']);
    useOpenFilesStore.getState().setActiveTab('co');
    expect(useOpenFilesStore.getState().overlayTabIds).toEqual([]);
  });

  it('merges a subordinate phase into the commander phase with provenance tags', () => {
    const subFeature = {
      type: 'Feature' as const,
      id: 'sf1',
      geometry: { type: 'Point' as const, coordinates: [1, 2] },
      properties: { feature_type: 'NAI' },
    };
    const s = useOpenFilesStore.getState();
    s.openTab(
      makeContent({
        id: 'co',
        rank: 4 as Rank,
        unit: 'Alpha Coy',
        phases: [makePhase({ id: 1, drawn_features: { type: 'FeatureCollection', features: [subFeature] } })],
      }),
    );
    s.openTab(makeContent({ id: 'bn', rank: 5 as Rank }));
    useOpenFilesStore.getState().addOverlay('co');
    const merged = useOpenFilesStore.getState().mergeOverlayIntoActivePhase('co');
    expect(merged).toHaveLength(1);
    expect(merged![0].properties._source_unit).toBe('Alpha Coy');
    expect(merged![0].properties._source_rank).toBe(4);
    // Commander tab now holds the merged feature and is dirty.
    const bn = useOpenFilesStore.getState().getTab('bn')!;
    const phase = bn.phases.find((p) => p.id === bn.activePhaseId)!;
    expect(phase.drawn_features.features).toHaveLength(1);
    expect(bn.isDirty).toBe(true);
  });

  it('refuses to merge without authority', () => {
    const s = useOpenFilesStore.getState();
    s.openTab(makeContent({ id: 'bn', rank: 5 as Rank }));
    s.openTab(makeContent({ id: 'co', rank: 4 as Rank }));
    // active = 'co', cannot command 'bn'
    expect(useOpenFilesStore.getState().mergeOverlayIntoActivePhase('bn')).toBeNull();
  });
});

describe('selectOverlayDrawnLayers', () => {
  it('returns overlay features with provenance metadata', () => {
    const feat = {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [0, 0] },
      properties: {},
    };
    const s = useOpenFilesStore.getState();
    s.openTab(
      makeContent({
        id: 'co',
        rank: 4 as Rank,
        unit: 'Bravo',
        phases: [makePhase({ id: 1, drawn_features: { type: 'FeatureCollection', features: [feat] } })],
      }),
    );
    s.openTab(makeContent({ id: 'bn', rank: 5 as Rank }));
    useOpenFilesStore.getState().addOverlay('co');
    const layers = selectOverlayDrawnLayers(useOpenFilesStore.getState());
    expect(layers).toHaveLength(1);
    expect(layers[0].unit).toBe('Bravo');
    expect(layers[0].features).toHaveLength(1);
  });
});
