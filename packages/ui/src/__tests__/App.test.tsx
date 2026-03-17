import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';

// Mock regl since jsdom doesn't support WebGL
vi.mock('regl', () => {
  const mockBuffer = {
    destroy: vi.fn(),
    subdata: vi.fn(),
  };
  const mockCommand = vi.fn();
  const mockRegl = vi.fn(() => mockCommand);

  const reglInstance = Object.assign(mockRegl, {
    buffer: vi.fn(() => mockBuffer),
    clear: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    _gl: {},
    limits: {},
    stats: {},
  });

  return {
    default: vi.fn(() => reglInstance),
    __esModule: true,
  };
});

// Mock Worker since jsdom doesn't have Web Workers
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: ErrorEvent) => void) | null,
  onmessageerror: null as (() => void) | null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => true),
};
vi.stubGlobal('Worker', vi.fn(() => mockWorker));

// Mock ResizeObserver
vi.stubGlobal('ResizeObserver', class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
});

vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// Mock dockview-react since it requires full DOM
vi.mock('dockview-react', () => ({
  DockviewReact: vi.fn(({ onReady }: { onReady: (event: { api: Record<string, unknown> }) => void }) => {
    // Simulate the ready event with a mock API
    React.useEffect(() => {
      onReady({
        api: {
          addPanel: vi.fn(),
          fromJSON: vi.fn(),
          toJSON: vi.fn(() => ({})),
          onDidLayoutChange: vi.fn(() => ({ dispose: vi.fn() })),
        },
      });
    }, [onReady]);
    return React.createElement('div', { 'data-testid': 'dockview' }, 'Dockview Mock');
  }),
  themeAbyss: { name: 'abyss', className: 'dockview-theme-abyss' },
}));

import { App } from '../App.js';
import { resetWorkerBridge } from '../worker/worker-bridge.js';

describe('App', () => {
  afterEach(() => {
    resetWorkerBridge();
  });

  it('should render without crashing', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: ReactDOM.Root;
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<App />);
    });
    expect(container.textContent).toContain('BTC/USDT');
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
