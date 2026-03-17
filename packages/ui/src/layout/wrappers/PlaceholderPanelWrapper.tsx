import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';

/**
 * Placeholder panel for types not yet implemented.
 */
export default function PlaceholderPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0e',
        color: '#555',
        fontSize: 14,
      }}
    >
      {props.params?.title ?? 'Panel'} (coming soon)
    </div>
  );
}
