import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig } from '@terminal/types';
import { DepthChartPanel } from '../../panels/DepthChartPanel.js';

export function DepthChartPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as unknown as PanelConfig;
  return <DepthChartPanel config={config} />;
}
