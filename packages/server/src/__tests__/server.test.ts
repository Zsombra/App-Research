import { describe, it, expect, afterEach } from 'vitest';
import { buildServer } from '../index.js';

describe('@terminal/server', () => {
  const server = buildServer();

  afterEach(async () => {
    await server.close();
  });

  it('should respond to health check', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { status: string; timestamp: number };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('number');
  });
});
