import { useEffect, useRef } from 'react';
import { useOrderStore } from '../stores/order-store.js';

/**
 * Keyboard shortcut definitions for the trading terminal.
 *
 * B           — Quick buy (market, default qty)
 * S           — Quick sell (market, default qty)
 * Escape      — Cancel all open orders
 * F           — Flatten position (close at market)
 */

const DEFAULT_QUICK_QTY = 0.01;
const DEFAULT_SYMBOL = 'BTC/USDT';

export function useHotkeys(): void {
  const handlerRef = useRef<(e: KeyboardEvent) => void>();

  useEffect(() => {
    handlerRef.current = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const store = useOrderStore.getState();

      switch (e.key.toLowerCase()) {
        case 'b': {
          // Quick buy
          e.preventDefault();
          store.placeOrder({
            symbol: DEFAULT_SYMBOL,
            side: 'buy',
            type: 'market',
            quantity: DEFAULT_QUICK_QTY,
          });
          break;
        }
        case 's': {
          // Quick sell
          e.preventDefault();
          store.placeOrder({
            symbol: DEFAULT_SYMBOL,
            side: 'sell',
            type: 'market',
            quantity: DEFAULT_QUICK_QTY,
          });
          break;
        }
        case 'escape': {
          // Cancel all orders
          store.cancelAllOrders();
          break;
        }
        case 'f': {
          // Flatten position
          e.preventDefault();
          const pos = store.positions.get(DEFAULT_SYMBOL);
          if (pos && Math.abs(pos.quantity) > 0.00000001) {
            store.placeOrder({
              symbol: DEFAULT_SYMBOL,
              side: pos.quantity > 0 ? 'sell' : 'buy',
              type: 'market',
              quantity: Math.abs(pos.quantity),
            });
          }
          break;
        }
      }
    };

    const handler = (e: KeyboardEvent) => handlerRef.current?.(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
