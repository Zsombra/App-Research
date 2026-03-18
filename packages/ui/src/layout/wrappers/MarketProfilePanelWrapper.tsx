import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import { MarketProfilePanel } from '../../panels/MarketProfilePanel.js';

export default function MarketProfilePanelWrapper(_props: IDockviewPanelProps): React.JSX.Element {
  return <MarketProfilePanel />;
}
