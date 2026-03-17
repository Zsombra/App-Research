import React from 'react';
import { TerminalLayout } from './layout/TerminalLayout.js';
import { TickerBar } from './panels/TickerBar.js';
import { ExchangeSelector } from './panels/ExchangeSelector.js';
import { useHotkeys } from './hooks/use-hotkeys.js';
import { useActiveSymbol } from './stores/symbol-store.js';
import './styles/terminal.css';

/**
 * Root application component.
 * Dockview layout shell with multi-exchange data feeds and keyboard shortcuts.
 */
export function App(): React.JSX.Element {
  useHotkeys();
  const activeSymbol = useActiveSymbol();

  return (
    <div
      className="terminal-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #1a1a22' }}>
        <div style={{ flex: 1 }}>
          <TickerBar symbol={activeSymbol} exchange="simulated" />
        </div>
        <div style={{ borderLeft: '1px solid #1a1a22', display: 'flex', alignItems: 'center' }}>
          <ExchangeSelector />
        </div>
      </div>
      <main style={{ flex: 1, minHeight: 0 }}>
        <TerminalLayout />
      </main>
    </div>
  );
}
