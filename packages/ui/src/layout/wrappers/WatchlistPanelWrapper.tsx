import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig } from '@terminal/types';
import { WatchlistPanel } from '../../panels/WatchlistPanel.js';

export function WatchlistPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as unknown as PanelConfig;
  return <WatchlistPanel config={config} />;
}
