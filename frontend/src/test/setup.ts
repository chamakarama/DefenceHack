// Vitest global setup.
//
// jest-dom matchers are only meaningful in a DOM environment, so they are
// imported lazily by the RTL smoke tests themselves (which set
// `@vitest-environment jsdom`). This file holds setup shared by every test;
// keep it light so the fast node-environment store tests don't pull in jsdom.
import { afterEach } from 'vitest';

// Reset Zustand stores between tests so state doesn't leak across cases.
// Each store test re-seeds the state it needs via setState in a beforeEach,
// but this guards against accidental cross-test coupling.
afterEach(() => {
  // no-op placeholder; per-suite resets live in the suites themselves.
});
