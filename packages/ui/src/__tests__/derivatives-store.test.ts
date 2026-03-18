import { describe, it, expect, beforeEach } from 'vitest';
import { useDerivativesStore } from '../stores/derivatives-store.js';
import type { LiquidationEvent } from '@terminal/types';

function makeLiquidation(overrides: Partial<LiquidationEvent> = {}): LiquidationEvent {
  return {
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    side: 'sell',
    price: 50000,
    amount: 1,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('derivatives-store', () => {
  beforeEach(() => {
    useDerivativesStore.setState({
      liquidations: new Map(),
      openInterestHistory: new Map(),
      currentOI: new Map(),
      fundingRates: new Map(),
    });
  });

  it('should add liquidation events', () => {
    const store = useDerivativesStore.getState();
    store.addLiquidation(makeLiquidation());

    const liqs = useDerivativesStore.getState().liquidations.get('BTC/USDT');
    expect(liqs).toHaveLength(1);
  });

  it('should maintain newest-first order for liquidations', () => {
    const store = useDerivativesStore.getState();
    store.addLiquidation(makeLiquidation({ timestamp: 1000 }));
    store.addLiquidation(makeLiquidation({ timestamp: 2000 }));

    const liqs = useDerivativesStore.getState().liquidations.get('BTC/USDT')!;
    expect(liqs[0]!.timestamp).toBe(2000);
    expect(liqs[1]!.timestamp).toBe(1000);
  });

  it('should update open interest with history', () => {
    const store = useDerivativesStore.getState();
    store.updateOpenInterest('BTC/USDT', 100000, 1000);
    store.updateOpenInterest('BTC/USDT', 110000, 2000);

    const state = useDerivativesStore.getState();
    expect(state.currentOI.get('BTC/USDT')).toBe(110000);

    const history = state.openInterestHistory.get('BTC/USDT')!;
    expect(history).toHaveLength(2);
    expect(history[1]!.change).toBe(10000); // 110000 - 100000
  });

  it('should update funding rate', () => {
    const store = useDerivativesStore.getState();
    store.updateFundingRate('BTC/USDT', 0.0001);

    expect(useDerivativesStore.getState().fundingRates.get('BTC/USDT')).toBe(0.0001);
  });

  it('should track per-symbol data', () => {
    const store = useDerivativesStore.getState();
    store.updateOpenInterest('BTC/USDT', 100000, 1000);
    store.updateOpenInterest('ETH/USDT', 50000, 1000);

    const state = useDerivativesStore.getState();
    expect(state.currentOI.get('BTC/USDT')).toBe(100000);
    expect(state.currentOI.get('ETH/USDT')).toBe(50000);
  });

  it('should trim old liquidations beyond limit', () => {
    const store = useDerivativesStore.getState();
    for (let i = 0; i < 250; i++) {
      store.addLiquidation(makeLiquidation({ timestamp: i }));
    }

    const liqs = useDerivativesStore.getState().liquidations.get('BTC/USDT')!;
    expect(liqs.length).toBeLessThanOrEqual(200);
  });
});
