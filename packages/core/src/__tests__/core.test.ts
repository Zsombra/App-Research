import { describe, it, expect } from 'vitest';
import { BaseExchangeAdapter } from '../adapters/base-adapter.js';
import { ConnectionStatus } from '@terminal/types';
import type { ExchangeId } from '@terminal/types';

class TestAdapter extends BaseExchangeAdapter {
  readonly exchangeId: ExchangeId = 'binance';

  async connect(): Promise<void> {
    this.setStatus(ConnectionStatus.Connected);
  }

  async disconnect(): Promise<void> {
    this.setStatus(ConnectionStatus.Disconnected);
  }

  subscribeTrades(_symbol: string): void {
    /* stub */
  }
  subscribeOrderbook(_symbol: string, _depth?: number): void {
    /* stub */
  }
  subscribeTicker(_symbol: string): void {
    /* stub */
  }
  subscribeLiquidations(_symbol: string): void {
    /* stub */
  }
  unsubscribeTrades(_symbol: string): void {
    /* stub */
  }
  unsubscribeOrderbook(_symbol: string): void {
    /* stub */
  }
  unsubscribeTicker(_symbol: string): void {
    /* stub */
  }
  unsubscribeLiquidations(_symbol: string): void {
    /* stub */
  }
}

describe('BaseExchangeAdapter', () => {
  it('should initialize with disconnected status', () => {
    const adapter = new TestAdapter();
    expect(adapter.status).toBe(ConnectionStatus.Disconnected);
  });

  it('should update status on connect', async () => {
    const adapter = new TestAdapter();
    await adapter.connect();
    expect(adapter.status).toBe(ConnectionStatus.Connected);
  });

  it('should invoke onConnectionStatusChange callback', async () => {
    const adapter = new TestAdapter();
    const statuses: ConnectionStatus[] = [];
    adapter.onConnectionStatusChange = (s) => statuses.push(s);
    await adapter.connect();
    expect(statuses).toEqual([ConnectionStatus.Connected]);
  });
});
