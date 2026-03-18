// @ts-expect-error - not in standard TS lib
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock Worker BEFORE all imports
vi.stubGlobal('Worker', vi.fn(() => ({
  postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null,
  addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
})));

import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';

// Mock worker-bridge so market-store doesn't instantiate a real Worker
vi.mock('../worker/worker-bridge.js', () => ({
  getWorkerBridge: vi.fn(() => ({
    send: vi.fn(),
    start: vi.fn(),
    terminate: vi.fn(),
    onMessage: vi.fn(),
    offMessage: vi.fn(),
    onError: vi.fn(),
    offError: vi.fn(),
    isRunning: false,
  })),
  resetWorkerBridge: vi.fn(),
  WorkerBridge: vi.fn(),
}));

// Mock indicator-store to provide stable (non-infinitely-looping) hooks.
// useIndicatorConfigs returns a new array reference each render when using
// [...Map.values()] which triggers Zustand's useSyncExternalStore infinite loop.
vi.mock('../stores/indicator-store.js', async () => {
  const { create } = await import('zustand');
  const stableStore = create(() => ({
    indicators: new Map(),
    series: new Map(),
    addIndicator: vi.fn(),
    removeIndicator: vi.fn(),
    updateParams: vi.fn(),
    recompute: vi.fn(),
  }));
  // Stable selector: returns same empty array reference every time
  const EMPTY: never[] = [];
  return {
    useIndicatorStore: stableStore,
    useIndicatorConfigs: () => stableStore((s: { indicators: Map<string, unknown> }) => {
      if (s.indicators.size === 0) return EMPTY;
      return Array.from(s.indicators.values());
    }),
    useOverlaySeries: () => EMPTY,
    useSeparateSeries: () => EMPTY,
  };
});

import { IndicatorSelector } from '../components/IndicatorSelector.js';
import { TimeframeSelector } from '../components/TimeframeSelector.js';
import { resetWorkerBridge } from '../worker/worker-bridge.js';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

function removeContainer(container: HTMLDivElement): void {
  document.body.removeChild(container);
}

// ──────────────────────────────────────────────────────────────────────────────
// IndicatorSelector tests
// ──────────────────────────────────────────────────────────────────────────────

describe('IndicatorSelector', () => {
  afterEach(() => {
    resetWorkerBridge();
  });

  it('renders without crashing', () => {
    const container = createContainer();
    let root: ReactDOM.Root;
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<IndicatorSelector />);
    });
    expect(container.firstChild).not.toBeNull();
    act(() => { root.unmount(); });
    removeContainer(container);
  });

  it('shows "Indicators" button text', () => {
    const container = createContainer();
    let root: ReactDOM.Root;
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<IndicatorSelector />);
    });
    expect(container.textContent).toContain('Indicators');
    act(() => { root.unmount(); });
    removeContainer(container);
  });

  it('shows indicator list when button is clicked (ADD INDICATOR text)', () => {
    const container = createContainer();
    let root: ReactDOM.Root;
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<IndicatorSelector />);
    });

    // Panel is not open yet
    expect(container.textContent).not.toContain('ADD INDICATOR');

    // Click the toggle button
    const button = container.querySelector('button') as HTMLButtonElement;
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Panel should now be open
    expect(container.textContent).toContain('ADD INDICATOR');

    act(() => { root.unmount(); });
    removeContainer(container);
  });

  it('shows all available indicators after clicking the button', () => {
    const container = createContainer();
    let root: ReactDOM.Root;
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<IndicatorSelector />);
    });

    const button = container.querySelector('button') as HTMLButtonElement;
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const text = container.textContent ?? '';
    expect(text).toContain('SMA');
    expect(text).toContain('EMA');
    expect(text).toContain('RSI');
    expect(text).toContain('MACD');
    expect(text).toContain('Bollinger');
    expect(text).toContain('CVD');
    expect(text).toContain('VWAP');
    expect(text).toContain('VWAP Anchored');
    expect(text).toContain('VWAP Rolling');

    act(() => { root.unmount(); });
    removeContainer(container);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// TimeframeSelector tests
// ──────────────────────────────────────────────────────────────────────────────

describe('TimeframeSelector', () => {
  afterEach(() => {
    resetWorkerBridge();
  });

  it('renders without crashing', () => {
    const container = createContainer();
    let root: ReactDOM.Root;
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<TimeframeSelector symbol="BTC/USDT" />);
    });
    expect(container.firstChild).not.toBeNull();
    act(() => { root.unmount(); });
    removeContainer(container);
  });

  it('shows timeframe buttons (1m, 5m, 1h, etc.)', () => {
    const container = createContainer();
    let root: ReactDOM.Root;
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<TimeframeSelector symbol="BTC/USDT" />);
    });

    const text = container.textContent ?? '';
    expect(text).toContain('1m');
    expect(text).toContain('5m');
    expect(text).toContain('1h');
    expect(text).toContain('4h');
    expect(text).toContain('1d');

    act(() => { root.unmount(); });
    removeContainer(container);
  });

  it('shows custom bar type buttons (Tick, Vol, Range)', () => {
    const container = createContainer();
    let root: ReactDOM.Root;
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<TimeframeSelector symbol="BTC/USDT" />);
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Tick');
    expect(text).toContain('Vol');
    expect(text).toContain('Range');

    act(() => { root.unmount(); });
    removeContainer(container);
  });

  it('shows separator between time and custom bar buttons', () => {
    const container = createContainer();
    let root: ReactDOM.Root;
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<TimeframeSelector symbol="BTC/USDT" />);
    });

    // The separator is a <span> containing "|"
    const separator = container.querySelector('span');
    expect(separator).not.toBeNull();
    expect(separator?.textContent).toContain('|');

    act(() => { root.unmount(); });
    removeContainer(container);
  });
});
