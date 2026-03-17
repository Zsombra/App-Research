import React from 'react';

/**
 * Root application component.
 * Phase 0: Renders a placeholder indicating the terminal scaffold is working.
 */
export function App(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <h1>Trading Terminal - Phase 0</h1>
      <p style={{ color: '#888' }}>Monorepo scaffold complete. Ready for Phase 1.</p>
    </div>
  );
}
