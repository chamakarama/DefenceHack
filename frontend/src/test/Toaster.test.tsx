// @vitest-environment jsdom
//
// RTL smoke test — validates the jsdom + Testing Library path end-to-end on a
// store-driven component that has no Leaflet-context dependency. Acts as the
// template for further component tests.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Toaster from '../dashboard/Toaster';
import { useToastStore } from '../store';

afterEach(() => {
  cleanup();
  useToastStore.setState({ toasts: [] });
});

describe('Toaster', () => {
  it('renders nothing when there are no toasts', () => {
    const { container } = render(<Toaster />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a toast pushed onto the store', () => {
    useToastStore.setState({ toasts: [{ id: 't1', kind: 'success', text: 'Plan saved' }] });
    render(<Toaster />);
    expect(screen.getByText('Plan saved')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
