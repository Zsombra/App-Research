import { describe, it, expect } from 'vitest';
import { buildServer } from '../index.js';

describe('@terminal/server', () => {
  it('should respond to health check', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { status: string; timestamp: number };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('number');
    await server.close();
  });

  it('should return a recent timestamp in health check', async () => {
    const server = buildServer();
    const before = Date.now();
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });
    const after = Date.now();

    const body = JSON.parse(response.body) as { status: string; timestamp: number };
    expect(body.timestamp).toBeGreaterThanOrEqual(before);
    expect(body.timestamp).toBeLessThanOrEqual(after);
    await server.close();
  });

  it('should return 404 for unknown routes', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'GET',
      url: '/nonexistent',
    });

    expect(response.statusCode).toBe(404);
    await server.close();
  });

  it('should return 404 for POST to health endpoint', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'POST',
      url: '/health',
    });

    expect(response.statusCode).toBe(404);
    await server.close();
  });

  it('should set correct content-type for health check', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.headers['content-type']).toContain('application/json');
    await server.close();
  });
});

describe('buildServer', () => {
  it('should create independent server instances', async () => {
    const server1 = buildServer();
    const server2 = buildServer();

    const res1 = await server1.inject({ method: 'GET', url: '/health' });
    const res2 = await server2.inject({ method: 'GET', url: '/health' });

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);

    await server1.close();
    await server2.close();
  });
});
