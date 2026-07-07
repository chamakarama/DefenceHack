import { create } from 'zustand';

// ---------- Timeline state ----------
const TIMELINE_RANGE_PAST_HOURS = 72;
const TIMELINE_RANGE_FUTURE_HOURS = 48;
const TIMELINE_STEP_MINUTES = 60;

const timelineNowMs = Date.now();

interface TimelineState {
  rangeStartMs: number;
  rangeEndMs: number;
  stepMinutes: number;
  // Live thumb position — updates on every slider onChange while dragging.
  selectedMs: number;
  // Debounced fetch trigger — only updates on slider release / commit.
  committedMs: number;
  setSelectedMs: (ms: number) => void;
  // Sets selectedMs AND immediately commits — for one-shot interactions
  // (datetime-local inputs, section buttons, programmatic moves).
  commitSelectedMs: (ms: number) => void;
  // Copies the current selectedMs into committedMs — for slider release.
  commitSelected: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  rangeStartMs: timelineNowMs - TIMELINE_RANGE_PAST_HOURS * 60 * 60 * 1000,
  rangeEndMs: timelineNowMs + TIMELINE_RANGE_FUTURE_HOURS * 60 * 60 * 1000,
  stepMinutes: TIMELINE_STEP_MINUTES,
  selectedMs: timelineNowMs,
  committedMs: timelineNowMs,
  setSelectedMs: (ms) => {
    const { rangeStartMs, rangeEndMs } = get();
    const clamped = Math.min(rangeEndMs, Math.max(rangeStartMs, ms));
    set({ selectedMs: clamped });
  },
  commitSelectedMs: (ms) => {
    const { rangeStartMs, rangeEndMs } = get();
    const clamped = Math.min(rangeEndMs, Math.max(rangeStartMs, ms));
    set({ selectedMs: clamped, committedMs: clamped });
  },
  commitSelected: () => set({ committedMs: get().selectedMs }),
}));
