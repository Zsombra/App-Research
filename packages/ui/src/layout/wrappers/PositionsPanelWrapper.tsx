import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig } from '@terminal/types';
import { PositionsPanel } from '../../panels/PositionsPanel.js';

export function PositionsPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as unknown as PanelConfig;
  return <PositionsPanel config={config} />;
}
