// Pure-logic tests for the tactical drawing tool's mutual-exclusion state.
// Only one map tool may be active at a time; selecting one must clear the
// others. Pins behaviour moved into stores/tactical.ts by Workstream A.
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalStore } from '../store';

beforeEach(() =>
  useTacticalStore.setState({
    activeTool: null,
    pendingType: null,
    pendingDrawMode: null,
    pendingSymbol: null,
    isArrowMode: false,
    isDeleteMode: false,
  }),
);

describe('setActiveTool mutual exclusion', () => {
  it('activating arrow sets isArrowMode and clears delete/shape/symbol', () => {
    useTacticalStore.setState({ pendingType: 'NAI', isDeleteMode: true });
    useTacticalStore.getState().setActiveTool('arrow');
    const st = useTacticalStore.getState();
    expect(st.activeTool).toBe('arrow');
    expect(st.isArrowMode).toBe(true);
    expect(st.isDeleteMode).toBe(false);
    expect(st.pendingType).toBeNull();
    expect(st.pendingSymbol).toBeNull();
  });

  it('activating delete sets isDeleteMode and clears arrow', () => {
    useTacticalStore.getState().setActiveTool('arrow');
    useTacticalStore.getState().setActiveTool('delete');
    const st = useTacticalStore.getState();
    expect(st.isDeleteMode).toBe(true);
    expect(st.isArrowMode).toBe(false);
  });

  it('activating shape preserves the existing pendingType', () => {
    useTacticalStore.setState({ pendingType: 'TAI', pendingDrawMode: 'Polygon' });
    useTacticalStore.getState().setActiveTool('shape');
    expect(useTacticalStore.getState().pendingType).toBe('TAI');
  });
});

describe('setPending / setArrowMode / setDeleteMode', () => {
  it('setPending switches into shape mode and clears arrow/delete', () => {
    useTacticalStore.getState().setArrowMode(true);
    useTacticalStore.getState().setPending('ROUTE', 'Polyline');
    const st = useTacticalStore.getState();
    expect(st.activeTool).toBe('shape');
    expect(st.pendingType).toBe('ROUTE');
    expect(st.isArrowMode).toBe(false);
    expect(st.isDeleteMode).toBe(false);
  });

  it('toggling arrow mode off reverts activeTool when it was arrow', () => {
    useTacticalStore.getState().setArrowMode(true);
    expect(useTacticalStore.getState().activeTool).toBe('arrow');
    useTacticalStore.getState().setArrowMode(false);
    expect(useTacticalStore.getState().activeTool).toBeNull();
  });

  it('toggling delete mode off reverts activeTool when it was delete', () => {
    useTacticalStore.getState().setDeleteMode(true);
    expect(useTacticalStore.getState().activeTool).toBe('delete');
    useTacticalStore.getState().setDeleteMode(false);
    expect(useTacticalStore.getState().activeTool).toBeNull();
  });
});
