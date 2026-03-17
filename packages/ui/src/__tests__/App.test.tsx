import { describe, it, expect } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
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
    expect(container.textContent).toContain('Trading Terminal - Phase 0');
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
