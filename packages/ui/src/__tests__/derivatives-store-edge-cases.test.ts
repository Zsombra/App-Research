import { describe, it, expect, beforeEach } from 'vitest';
import { useDerivativesStore } from '../stores/derivatives-store.js';
import type { LiquidationEvent } from '@terminal/types';

function makeLiquidation(overrides: Partial<LiquidationEvent> = {}): LiquidationEvent {
  return {
    exchange: 'simulated', symbol: 'BTC/USDT', side: 'sell',
    price: 50000, amount: 1, timestamp: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  useDerivativesStore.setState({
    liquidations: new Map(),
    openInterestHistory: new Map(),
    currentOI: new Map(),
    fundingRates: new Map(),
  });
});

describe('derivatives-store edge cases', () => {
  // -------------------------------------------------------------------------
  // Open interest edge cases
  // -------------------------------------------------------------------------
  describe('open interest', () => {
    it('first OI update has change = 0 (no previous value)', () => {
      useDerivativesStore.getState().updateOpenInterest('BTC/USDT', 100000, 1000);

      const history = useDerivativesStore.getState().openInterestHistory.get('BTC/USDT')!;
      expect(history).toHaveLength(1);
      expect(history[0]!.change).toBe(0); // prevOI defaults to current oi
    });

    it('OI decrease results in negative change', () => {
      useDerivativesStore.getState().updateOpenInterest('BTC/USDT', 100000, 1000);
      useDerivativesStore.getState().updateOpenInterest('BTC/USDT', 80000, 2000);

      const history = useDerivativesStore.getState().openInterestHistory.get('BTC/USDT')!;
      expect(history[1]!.change).toBe(-20000);
    });

    it('OI history trims at 500 points', () => {
      for (let i = 0; i < 550; i++) {
        useDerivativesStore.getState().updateOpenInterest('BTC/USDT', 100000 + i, i * 1000);
      }

      const history = useDerivativesStore.getState().openInterestHistory.get('BTC/USDT')!;
      expect(history.length).toBeLessThanOrEqual(500);
    });

    it('OI history trimming does not mutate previous array reference (slice not splice)', () => {
      // Fill to capacity
      for (let i = 0; i < 500; i++) {
        useDerivativesStore.getState().updateOpenInterest('BTC/USDT', 1000 + i, i);
      }
      const historyBefore = useDerivativesStore.getState().openInterestHistory.get('BTC/USDT')!;
      const lengthBefore = historyBefore.length;

      // Trigger trim
      useDerivativesStore.getState().updateOpenInterest('BTC/USDT', 2000, 501);

      // Previous reference should be unchanged (immutable)
      expect(historyBefore.length).toBe(lengthBefore);
    });

    it('zero OI is a valid value', () => {
      useDerivativesStore.getState().updateOpenInterest('BTC/USDT', 100000, 1000);
      useDerivativesStore.getState().updateOpenInterest('BTC/USDT', 0, 2000);

      expect(useDerivativesStore.getState().currentOI.get('BTC/USDT')).toBe(0);
      const history = useDerivativesStore.getState().openInterestHistory.get('BTC/USDT')!;
      expect(history[1]!.change).toBe(-100000);
    });

    it('per-symbol OI tracking is independent', () => {
      useDerivativesStore.getState().updateOpenInterest('BTC/USDT', 100000, 1000);
      useDerivativesStore.getState().updateOpenInterest('ETH/USDT', 50000, 1000);
      useDerivativesStore.getState().updateOpenInterest('BTC/USDT', 110000, 2000);

      expect(useDerivativesStore.getState().currentOI.get('BTC/USDT')).toBe(110000);
      expect(useDerivativesStore.getState().currentOI.get('ETH/USDT')).toBe(50000);

      const btcHistory = useDerivativesStore.getState().openInterestHistory.get('BTC/USDT')!;
      const ethHistory = useDerivativesStore.getState().openInterestHistory.get('ETH/USDT')!;
      expect(btcHistory).toHaveLength(2);
      expect(ethHistory).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Funding rate edge cases
  // -------------------------------------------------------------------------
  describe('funding rate', () => {
    it('handles negative funding rate', () => {
      useDerivativesStore.getState().updateFundingRate('BTC/USDT', -0.0005);
      expect(useDerivativesStore.getState().fundingRates.get('BTC/USDT')).toBe(-0.0005);
    });

    it('handles zero funding rate', () => {
      useDerivativesStore.getState().updateFundingRate('BTC/USDT', 0);
      expect(useDerivativesStore.getState().fundingRates.get('BTC/USDT')).toBe(0);
    });

    it('overwrites previous funding rate', () => {
      useDerivativesStore.getState().updateFundingRate('BTC/USDT', 0.0001);
      useDerivativesStore.getState().updateFundingRate('BTC/USDT', 0.0003);
      expect(useDerivativesStore.getState().fundingRates.get('BTC/USDT')).toBe(0.0003);
    });

    it('per-symbol funding rates are independent', () => {
      useDerivativesStore.getState().updateFundingRate('BTC/USDT', 0.0001);
      useDerivativesStore.getState().updateFundingRate('ETH/USDT', -0.0002);

      expect(useDerivativesStore.getState().fundingRates.get('BTC/USDT')).toBe(0.0001);
      expect(useDerivativesStore.getState().fundingRates.get('ETH/USDT')).toBe(-0.0002);
    });
  });

  // -------------------------------------------------------------------------
  // Liquidation edge cases
  // -------------------------------------------------------------------------
  describe('liquidation edge cases', () => {
    it('handles buy-side liquidations', () => {
      useDerivativesStore.getState().addLiquidation(makeLiquidation({ side: 'buy' }));
      const liqs = useDerivativesStore.getState().liquidations.get('BTC/USDT')!;
      expect(liqs[0]!.side).toBe('buy');
    });

    it('per-symbol liquidations are independent', () => {
      useDerivativesStore.getState().addLiquidation(makeLiquidation({ symbol: 'BTC/USDT' }));
      useDerivativesStore.getState().addLiquidation(makeLiquidation({ symbol: 'ETH/USDT' }));

      expect(useDerivativesStore.getState().liquidations.get('BTC/USDT')).toHaveLength(1);
      expect(useDerivativesStore.getState().liquidations.get('ETH/USDT')).toHaveLength(1);
    });

    it('trims to 200 per symbol, not globally', () => {
      for (let i = 0; i < 250; i++) {
        useDerivativesStore.getState().addLiquidation(makeLiquidation({ symbol: 'BTC/USDT' }));
        useDerivativesStore.getState().addLiquidation(makeLiquidation({ symbol: 'ETH/USDT' }));
      }

      const btcLiqs = useDerivativesStore.getState().liquidations.get('BTC/USDT')!;
      const ethLiqs = useDerivativesStore.getState().liquidations.get('ETH/USDT')!;
      expect(btcLiqs.length).toBeLessThanOrEqual(200);
      expect(ethLiqs.length).toBeLessThanOrEqual(200);
    });

    it('very small liquidation amount is stored', () => {
      useDerivativesStore.getState().addLiquidation(makeLiquidation({ amount: 0.00001 }));
      const liqs = useDerivativesStore.getState().liquidations.get('BTC/USDT')!;
      expect(liqs[0]!.amount).toBe(0.00001);
    });

    it('liquidation with very large price is stored', () => {
      useDerivativesStore.getState().addLiquidation(makeLiquidation({ price: 999999999 }));
      const liqs = useDerivativesStore.getState().liquidations.get('BTC/USDT')!;
      expect(liqs[0]!.price).toBe(999999999);
    });
  });
});
