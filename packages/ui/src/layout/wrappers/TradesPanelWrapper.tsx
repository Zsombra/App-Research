import React, { useMemo } from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import type { PanelConfig } from '@terminal/types';
import { TradesPanel } from '../../panels/TradesPanel.js';
import { useActiveSymbol } from '../../stores/symbol-store.js';

export default function TradesPanelWrapper(props: IDockviewPanelProps): React.JSX.Element {
  const config = props.params as PanelConfig;
  const activeSymbol = useActiveSymbol();
  const effectiveConfig = useMemo(
    () => ({ ...config, symbol: activeSymbol ?? config?.symbol ?? 'BTC/USDT' }),
    [config, activeSymbol]
  );
  return <TradesPanel config={effectiveConfig} />;
}
