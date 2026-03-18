import { describe, it, expect } from 'vitest';
import { DEFAULT_SLTP_CONFIG } from '../market/sl-tp-heatmap.js';
import type { SLTPConfig, SLTPCluster, EstimatedPosition } from '../market/sl-tp-heatmap.js';

describe('SL/TP Heatmap types', () => {
  it('should have valid DEFAULT_SLTP_CONFIG', () => {
    expect(DEFAULT_SLTP_CONFIG.algorithms).toHaveLength(6);
    expect(DEFAULT_SLTP_CONFIG.leverageLevels).toContain(10);
    expect(DEFAULT_SLTP_CONFIG.leverageLevels).toContain(100);
    expect(DEFAULT_SLTP_CONFIG.dbscanEps).toBeGreaterThan(0);
    expect(DEFAULT_SLTP_CONFIG.dbscanMinPoints).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_SLTP_CONFIG.swingStrength).toBeGreaterThanOrEqual(1);
  });

  it('should include all 6 algorithms in default config', () => {
    const algos = DEFAULT_SLTP_CONFIG.algorithms;
    expect(algos).toContain('liquidation-math');
    expect(algos).toContain('swing-cluster');
    expect(algos).toContain('round-number');
    expect(algos).toContain('historical-sweep');
    expect(algos).toContain('dbscan');
    expect(algos).toContain('composite');
  });

  it('should have weights summing to ~1.0 (excluding composite)', () => {
    const weights = DEFAULT_SLTP_CONFIG.weights;
    const sum = weights['liquidation-math']
      + weights['swing-cluster']
      + weights['round-number']
      + weights['historical-sweep']
      + weights['dbscan'];
    expect(sum).toBeCloseTo(1.0, 1);
  });

  it('should type-check SLTPCluster structure', () => {
    const cluster: SLTPCluster = {
      price: 50000,
      width: 100,
      intensity: 0.8,
      sources: ['liquidation-math', 'swing-cluster'],
      type: 'stop-loss',
      side: 'long',
    };
    expect(cluster.price).toBe(50000);
    expect(cluster.sources).toHaveLength(2);
    expect(cluster.type).toBe('stop-loss');
  });

  it('should type-check EstimatedPosition structure', () => {
    const pos: EstimatedPosition = {
      entryPrice: 50000,
      leverage: 10,
      side: 'long',
      size: 1000,
    };
    expect(pos.entryPrice).toBe(50000);
    expect(pos.leverage).toBe(10);
  });
});
