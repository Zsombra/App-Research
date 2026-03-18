import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import { SLTPHeatmapPanel } from '../../panels/SLTPHeatmapPanel.js';

export default function SLHeatmapPanelWrapper(_props: IDockviewPanelProps): React.JSX.Element {
  return <SLTPHeatmapPanel mode="sl" />;
}
