import React, { useEffect } from 'react';
import type { PanelConfig, Position, Order } from '@terminal/types';
import { useAllPositions, useOrders, useOrderStore } from '../stores/order-store.js';
import { COLOR_BULLISH, COLOR_BEARISH } from '../theme-colors.js';

/** Maximum number of orders to display in the panel. */
const MAX_DISPLAYED_ORDERS = 20;

/** Interval in ms for updating mark prices from market data. */
const MARK_PRICE_UPDATE_INTERVAL_MS = 1000;

interface PositionsPanelProps {
  config: PanelConfig;
}

const PositionRow = React.memo(function PositionRow({ pos }: { pos: Position }) {
  const isLong = pos.quantity > 0;
  const sideColor = isLong ? COLOR_BULLISH : COLOR_BEARISH;
  const pnlColor = pos.unrealizedPnl >= 0 ? COLOR_BULLISH : COLOR_BEARISH;

  return (
    <div style={{ display: 'flex', padding: '3px 8px', gap: 4, alignItems: 'center' }}>
      <span style={{ width: 80, fontWeight: 600 }}>{pos.symbol}</span>
      <span style={{ width: 50, color: sideColor, fontWeight: 600 }}>
        {isLong ? 'LONG' : 'SHORT'}
      </span>
      <span style={{ width: 60, textAlign: 'right' }}>{Math.abs(pos.quantity).toFixed(4)}</span>
      <span style={{ width: 70, textAlign: 'right' }}>{pos.entryPrice.toFixed(2)}</span>
      <span style={{ width: 70, textAlign: 'right' }}>{pos.markPrice.toFixed(2)}</span>
      <span style={{ width: 70, textAlign: 'right', color: pnlColor, fontWeight: 600 }}>
        {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)}
      </span>
    </div>
  );
});

const OrderRow = React.memo(function OrderRow({ order }: { order: Order }) {
  const cancelOrder = useOrderStore((s) => s.cancelOrder);
  const sideColor = order.side === 'buy' ? COLOR_BULLISH : COLOR_BEARISH;

  return (
    <div style={{ display: 'flex', padding: '3px 8px', gap: 4, alignItems: 'center' }}>
      <span style={{ width: 80 }}>{order.symbol}</span>
      <span style={{ width: 40, color: sideColor, fontWeight: 600 }}>
        {order.side.toUpperCase()}
      </span>
      <span style={{ width: 50 }}>{order.type}</span>
      <span style={{ width: 60, textAlign: 'right' }}>{order.quantity.toFixed(4)}</span>
      <span style={{ width: 70, textAlign: 'right' }}>
        {order.price ? order.price.toFixed(2) : 'MKT'}
      </span>
      <span style={{ width: 60, color: '#888', fontSize: 10 }}>{order.status}</span>
      {order.status === 'open' && (
        <button
          onClick={() => cancelOrder(order.id)}
          style={{
            padding: '1px 6px',
            background: 'transparent',
            border: `1px solid ${COLOR_BEARISH}`,
            color: COLOR_BEARISH,
            cursor: 'pointer',
            fontSize: 10,
            borderRadius: 2,
          }}
        >
          Cancel
        </button>
      )}
    </div>
  );
});

/**
 * Displays open positions, PnL, and order history.
 * Auto-updates mark prices from the market store.
 */
export function PositionsPanel({ config }: PositionsPanelProps): React.JSX.Element {
  const positions = useAllPositions();
  const orders = useOrders(config.symbol);
  const updateMarkPrices = useOrderStore((s) => s.updatePositionMarkPrices);

  // Update mark prices every second
  useEffect(() => {
    const interval = setInterval(updateMarkPrices, MARK_PRICE_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [updateMarkPrices]);

  const recentOrders = orders.slice(0, MAX_DISPLAYED_ORDERS);

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0a0a0e', color: '#ccc', fontSize: 12 }}>
      {/* Positions section */}
      <div style={{ borderBottom: '1px solid #222' }}>
        <div style={{ padding: '4px 8px', fontWeight: 700, color: '#888', fontSize: 11, textTransform: 'uppercase' }}>
          Positions
        </div>
        <div style={{ display: 'flex', padding: '2px 8px', color: '#555', fontSize: 10, gap: 4 }}>
          <span style={{ width: 80 }}>Symbol</span>
          <span style={{ width: 50 }}>Side</span>
          <span style={{ width: 60, textAlign: 'right' }}>Qty</span>
          <span style={{ width: 70, textAlign: 'right' }}>Entry</span>
          <span style={{ width: 70, textAlign: 'right' }}>Mark</span>
          <span style={{ width: 70, textAlign: 'right' }}>uPnL</span>
        </div>
        {positions.length === 0 ? (
          <div style={{ padding: '8px 8px', color: '#444', textAlign: 'center' }}>No open positions</div>
        ) : (
          positions.map((pos) => <PositionRow key={pos.symbol} pos={pos} />)
        )}
      </div>

      {/* Orders section */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '4px 8px', fontWeight: 700, color: '#888', fontSize: 11, textTransform: 'uppercase' }}>
          Orders
        </div>
        <div style={{ display: 'flex', padding: '2px 8px', color: '#555', fontSize: 10, gap: 4 }}>
          <span style={{ width: 80 }}>Symbol</span>
          <span style={{ width: 40 }}>Side</span>
          <span style={{ width: 50 }}>Type</span>
          <span style={{ width: 60, textAlign: 'right' }}>Qty</span>
          <span style={{ width: 70, textAlign: 'right' }}>Price</span>
          <span style={{ width: 60 }}>Status</span>
        </div>
        {recentOrders.length === 0 ? (
          <div style={{ padding: '8px 8px', color: '#444', textAlign: 'center' }}>No orders</div>
        ) : (
          recentOrders.map((order) => <OrderRow key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
