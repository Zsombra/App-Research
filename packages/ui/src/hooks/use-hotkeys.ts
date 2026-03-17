import { useEffect, useRef } from 'react';
import { useOrderStore } from '../stores/order-store.js';
import { useSymbolStore } from '../stores/symbol-store.js';

/**
 * Keyboard shortcut definitions for the trading terminal.
 *
 * B           — Quick buy (market, default qty) for active symbol
 * S           — Quick sell (market, default qty) for active symbol
 * Escape      — Cancel all open orders
 * F           — Flatten position (close at market) for active symbol
 */

const DEFAULT_QUICK_QTY = 0.01;

export function useHotkeys(): void {
  const handlerRef = useRef<(e: KeyboardEvent) => void>();

  useEffect(() => {
    handlerRef.current = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const orderStore = useOrderStore.getState();
      const activeSymbol = useSymbolStore.getState().activeSymbol;

      switch (e.key.toLowerCase()) {
        case 'b': {
          e.preventDefault();
          orderStore.placeOrder({
            symbol: activeSymbol,
            side: 'buy',
            type: 'market',
            quantity: DEFAULT_QUICK_QTY,
          });
          break;
        }
        case 's': {
          e.preventDefault();
          orderStore.placeOrder({
            symbol: activeSymbol,
            side: 'sell',
            type: 'market',
            quantity: DEFAULT_QUICK_QTY,
          });
          break;
        }
        case 'escape': {
          orderStore.cancelAllOrders();
          break;
        }
        case 'f': {
          e.preventDefault();
          const pos = orderStore.positions.get(activeSymbol);
          if (pos && Math.abs(pos.quantity) > 0.00000001) {
            orderStore.placeOrder({
              symbol: activeSymbol,
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
