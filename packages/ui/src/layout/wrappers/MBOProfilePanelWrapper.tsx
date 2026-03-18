import React from 'react';
import { MBOProfilePanel } from '../../panels/MBOProfilePanel.js';

export default function MBOProfilePanelWrapper(props: { panelId: string }): React.JSX.Element {
  return <MBOProfilePanel panelId={props.panelId} />;
}
