import React from 'react';
import { TerminalLayout } from './layout/TerminalLayout.js';
import { TickerBar } from './panels/TickerBar.js';

/**
 * Root application component.
 * Phase 1b: Dockview layout shell with WorkerBridge integration.
 */
export function App(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0a0a0e',
        color: '#ccc',
      }}
    >
      <TickerBar symbol="BTC/USDT" exchange="simulated" />
      <main style={{ flex: 1, minHeight: 0 }}>
        <TerminalLayout />
      </main>
    </div>
  );
}
