import React from 'react';
import { TerminalLayout } from './layout/TerminalLayout.js';
import { TickerBar } from './panels/TickerBar.js';
import './styles/terminal.css';

/**
 * Root application component.
 * Dockview layout shell with WorkerBridge integration and simulated data feed.
 */
export function App(): React.JSX.Element {
  return (
    <div
      className="terminal-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <TickerBar symbol="BTC/USDT" exchange="simulated" />
      <main style={{ flex: 1, minHeight: 0 }}>
        <TerminalLayout />
      </main>
    </div>
  );
}
