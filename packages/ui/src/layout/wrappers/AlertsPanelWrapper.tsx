import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import { AlertsPanel } from '../../panels/AlertsPanel.js';

export default function AlertsPanelWrapper(_props: IDockviewPanelProps): React.JSX.Element {
  return <AlertsPanel />;
}
