import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig } from '@terminal/types';
import { OrderbookPanel } from '../../panels/OrderbookPanel.js';

/**
 * Wraps OrderbookPanel for use inside Dockview.
 */
export function OrderbookPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as unknown as PanelConfig;
  return <OrderbookPanel config={config} />;
}
