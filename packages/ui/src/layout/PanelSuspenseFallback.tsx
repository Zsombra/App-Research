import React from 'react';

/**
 * Loading spinner shown while a lazy-loaded panel chunk is fetched.
 */
export function PanelSuspenseFallback(): React.JSX.Element {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: '#0a0a0e',
      color: '#555',
      fontSize: 11,
    }}>
      Loading panel...
    </div>
  );
}
