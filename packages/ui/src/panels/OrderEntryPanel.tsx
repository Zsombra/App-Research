import React, { useState, useCallback } from 'react';
import type { PanelConfig, OrderSide, OrderType } from '@terminal/types';
import { useTicker } from '../stores/market-store.js';
import { useOrderStore, usePosition } from '../stores/order-store.js';

interface OrderEntryPanelProps {
  config: PanelConfig;
}

const QUICK_SIZES = [0.001, 0.01, 0.1, 0.5, 1.0];

/**
 * Order entry form with market/limit order support.
 * Shows current position and provides quick-size buttons.
 */
export function OrderEntryPanel({ config }: OrderEntryPanelProps): React.JSX.Element {
  const symbol = config.symbol;
  const ticker = useTicker(symbol);
  const position = usePosition(symbol);
  const placeOrder = useOrderStore((s) => s.placeOrder);

  const [orderType, setOrderType] = useState<OrderType>('market');
  const [_side, setSide] = useState<OrderSide>('buy');
  const [quantity, setQuantity] = useState('0.01');
  const [limitPrice, setLimitPrice] = useState('');

  const handleSubmitWithSide = useCallback((submitSide: OrderSide) => {
    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;

    const params: Parameters<typeof placeOrder>[0] = {
      symbol,
      side: submitSide,
      type: orderType,
      quantity: qty,
    };

    if (orderType === 'limit') {
      const price = parseFloat(limitPrice);
      if (!Number.isFinite(price) || price <= 0) return;
      params.price = price;
    }

    setSide(submitSide);
    placeOrder(params);
  }, [symbol, orderType, quantity, limitPrice, placeOrder]);

  const handleSetMarketPrice = useCallback(() => {
    if (ticker) {
      setLimitPrice(ticker.lastPrice.toFixed(2));
    }
  }, [ticker]);

  const posQty = position?.quantity ?? 0;
  const posColor = posQty > 0 ? '#26a69a' : posQty < 0 ? '#ef5350' : '#888';

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0a0a0e', color: '#ccc', fontSize: 12, padding: 8 }}>
      {/* Symbol & price */}
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{symbol}</span>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
          {ticker ? ticker.lastPrice.toFixed(2) : '—'}
        </span>
      </div>

      {/* Order type tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
        {(['market', 'limit'] as OrderType[]).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            style={{
              flex: 1,
              padding: '4px 0',
              background: orderType === t ? '#1e1e2e' : 'transparent',
              border: `1px solid ${orderType === t ? '#444' : '#222'}`,
              color: orderType === t ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: 11,
              textTransform: 'uppercase',
              borderRadius: 2,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Limit price input */}
      {orderType === 'limit' && (
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', color: '#888', marginBottom: 2 }}>Price</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="number"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="Limit price"
              style={{
                flex: 1,
                padding: '4px 6px',
                background: '#111',
                border: '1px solid #333',
                color: '#fff',
                fontSize: 12,
                borderRadius: 2,
                outline: 'none',
              }}
            />
            <button
              onClick={handleSetMarketPrice}
              style={{
                padding: '4px 8px',
                background: '#1e1e2e',
                border: '1px solid #333',
                color: '#888',
                cursor: 'pointer',
                fontSize: 10,
                borderRadius: 2,
              }}
            >
              MKT
            </button>
          </div>
        </div>
      )}

      {/* Quantity input */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', color: '#888', marginBottom: 2 }}>Quantity</label>
        <input
          type="number"
          step="0.001"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 6px',
            background: '#111',
            border: '1px solid #333',
            color: '#fff',
            fontSize: 12,
            borderRadius: 2,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Quick size buttons */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
        {QUICK_SIZES.map((size) => (
          <button
            key={size}
            onClick={() => setQuantity(size.toString())}
            style={{
              flex: 1,
              padding: '3px 0',
              background: quantity === size.toString() ? '#1e1e2e' : 'transparent',
              border: '1px solid #222',
              color: '#888',
              cursor: 'pointer',
              fontSize: 10,
              borderRadius: 2,
            }}
          >
            {size}
          </button>
        ))}
      </div>

      {/* Buy / Sell buttons */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        <button
          onClick={() => handleSubmitWithSide('buy')}
          style={{
            flex: 1,
            padding: '8px 0',
            background: '#26a69a',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 3,
          }}
        >
          BUY
        </button>
        <button
          onClick={() => handleSubmitWithSide('sell')}
          style={{
            flex: 1,
            padding: '8px 0',
            background: '#ef5350',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 3,
          }}
        >
          SELL
        </button>
      </div>

      {/* Current position */}
      <div style={{ borderTop: '1px solid #222', paddingTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#888' }}>Position</span>
          <span style={{ color: posColor, fontWeight: 600 }}>
            {posQty !== 0 ? `${posQty > 0 ? '+' : ''}${posQty.toFixed(4)}` : 'Flat'}
          </span>
        </div>
        {position && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: '#666' }}>Entry</span>
              <span>{position.entryPrice.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: '#666' }}>uPnL</span>
              <span style={{ color: position.unrealizedPnl >= 0 ? '#26a69a' : '#ef5350' }}>
                {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnl.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>rPnL</span>
              <span style={{ color: position.realizedPnl >= 0 ? '#26a69a' : '#ef5350' }}>
                {position.realizedPnl >= 0 ? '+' : ''}{position.realizedPnl.toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
