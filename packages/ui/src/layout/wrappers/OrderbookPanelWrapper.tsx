import React, { useMemo } from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig } from '@terminal/types';
import { OrderbookPanel } from '../../panels/OrderbookPanel.js';
import { useActiveSymbol } from '../../stores/symbol-store.js';

export function OrderbookPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as unknown as PanelConfig;
  const activeSymbol = useActiveSymbol();
  const effectiveConfig = useMemo(
    () => ({ ...config, symbol: activeSymbol ?? config?.symbol ?? 'BTC/USDT' }),
    [config, activeSymbol]
  );
  return <OrderbookPanel config={effectiveConfig} />;
}
