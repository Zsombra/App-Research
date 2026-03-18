import React from 'react';
import { MarketplacePanel } from '../../panels/MarketplacePanel.js';

export default function MarketplacePanelWrapper(props: { panelId: string }): React.JSX.Element {
  return <MarketplacePanel panelId={props.panelId} />;
}
