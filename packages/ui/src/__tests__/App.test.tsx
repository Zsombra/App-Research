import { describe, it, expect, vi } from 'vitest';
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

// Mock ResizeObserver
vi.stubGlobal('ResizeObserver', class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
});

vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

import { App } from '../App.js';

describe('App', () => {
  it('should render without crashing', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: ReactDOM.Root;
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<App />);
    });
    expect(container.textContent).toContain('Trading Terminal - Phase 1c');
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
