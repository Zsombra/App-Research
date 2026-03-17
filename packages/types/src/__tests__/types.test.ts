import { describe, it, expect } from 'vitest';
import { ConnectionStatus } from '../index.js';

describe('@terminal/types', () => {
  it('should export ConnectionStatus enum with expected values', () => {
    expect(ConnectionStatus.Disconnected).toBe('disconnected');
    expect(ConnectionStatus.Connecting).toBe('connecting');
    expect(ConnectionStatus.Connected).toBe('connected');
    expect(ConnectionStatus.Reconnecting).toBe('reconnecting');
    expect(ConnectionStatus.Error).toBe('error');
  });

  it('should have all expected ConnectionStatus values', () => {
    const values = Object.values(ConnectionStatus);
    expect(values).toHaveLength(5);
    expect(values).toContain('disconnected');
    expect(values).toContain('connecting');
    expect(values).toContain('connected');
    expect(values).toContain('reconnecting');
    expect(values).toContain('error');
  });
});
