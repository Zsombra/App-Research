import React from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import { ScriptEditorPanel } from '../../panels/ScriptEditorPanel.js';

export default function ScriptEditorPanelWrapper(_props: IDockviewPanelProps): React.JSX.Element {
  return <ScriptEditorPanel />;
}
