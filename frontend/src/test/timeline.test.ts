// Pure-logic tests for the timeline slider's selected/committed split and
// range clamping. Pins behaviour moved into stores/timeline.ts by Workstream A.
import { describe, expect, it, beforeEach } from 'vitest';
import { useTimelineStore } from '../store';

beforeEach(() => {
  const { rangeStartMs } = useTimelineStore.getState();
  useTimelineStore.setState({ selectedMs: rangeStartMs, committedMs: rangeStartMs });
});

describe('setSelectedMs', () => {
  it('clamps below range to rangeStartMs and does not commit', () => {
    const { rangeStartMs, committedMs } = useTimelineStore.getState();
    useTimelineStore.getState().setSelectedMs(rangeStartMs - 10_000_000);
    const st = useTimelineStore.getState();
    expect(st.selectedMs).toBe(rangeStartMs);
    expect(st.committedMs).toBe(committedMs); // unchanged
  });

  it('clamps above range to rangeEndMs', () => {
    const { rangeEndMs } = useTimelineStore.getState();
    useTimelineStore.getState().setSelectedMs(rangeEndMs + 10_000_000);
    expect(useTimelineStore.getState().selectedMs).toBe(rangeEndMs);
  });

  it('keeps an in-range value as-is', () => {
    const { rangeStartMs, rangeEndMs } = useTimelineStore.getState();
    const mid = Math.round((rangeStartMs + rangeEndMs) / 2);
    useTimelineStore.getState().setSelectedMs(mid);
    expect(useTimelineStore.getState().selectedMs).toBe(mid);
  });
});

describe('commitSelectedMs', () => {
  it('sets both selected and committed, clamped to range', () => {
    const { rangeEndMs } = useTimelineStore.getState();
    useTimelineStore.getState().commitSelectedMs(rangeEndMs + 1);
    const st = useTimelineStore.getState();
    expect(st.selectedMs).toBe(rangeEndMs);
    expect(st.committedMs).toBe(rangeEndMs);
  });
});

describe('commitSelected', () => {
  it('copies the live selectedMs into committedMs', () => {
    const { rangeStartMs, rangeEndMs } = useTimelineStore.getState();
    const mid = Math.round((rangeStartMs + rangeEndMs) / 2);
    useTimelineStore.getState().setSelectedMs(mid); // drag, not committed yet
    expect(useTimelineStore.getState().committedMs).not.toBe(mid);
    useTimelineStore.getState().commitSelected(); // slider release
    expect(useTimelineStore.getState().committedMs).toBe(mid);
  });
});
