import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig } from '@terminal/types';
import { OrderEntryPanel } from '../../panels/OrderEntryPanel.js';

export function OrderEntryPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as unknown as PanelConfig;
  return <OrderEntryPanel config={config} />;
}
