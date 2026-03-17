import React, { useMemo } from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig } from '@terminal/types';
import { OrderEntryPanel } from '../../panels/OrderEntryPanel.js';
import { useActiveSymbol } from '../../stores/symbol-store.js';

export function OrderEntryPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as unknown as PanelConfig;
  const activeSymbol = useActiveSymbol();
  const effectiveConfig = useMemo(
    () => ({ ...config, symbol: activeSymbol ?? config?.symbol ?? 'BTC/USDT' }),
    [config, activeSymbol]
  );
  return <OrderEntryPanel config={effectiveConfig} />;
}
