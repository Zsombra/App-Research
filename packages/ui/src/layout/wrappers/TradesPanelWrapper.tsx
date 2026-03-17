import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig } from '@terminal/types';
import { TradesPanel } from '../../panels/TradesPanel.js';

/**
 * Wraps TradesPanel for use inside Dockview.
 */
export function TradesPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as unknown as PanelConfig;
  return <TradesPanel config={config} />;
}
