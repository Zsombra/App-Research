import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import { SettingsPanel } from '../../panels/SettingsPanel.js';

export default function SettingsPanelWrapper(_props: IDockviewPanelProps): React.JSX.Element {
  return <SettingsPanel />;
}
