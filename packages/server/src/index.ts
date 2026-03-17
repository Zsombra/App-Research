import Fastify from 'fastify';

/**
 * Creates and configures the Fastify server instance.
 * Phase 0: Only a health endpoint is registered.
 */
export function buildServer() {
  const server = Fastify({
    logger: true,
  });

  /** Health check endpoint for liveness probes */
  server.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  return server;
}

/**
 * Starts the server on the configured port.
 * Only runs when this file is executed directly (e.g., `node dist/index.js`).
 */
async function main() {
  const server = buildServer();
  const port = Number(process.env['PORT']) || 3001;
  const host = process.env['HOST'] || '127.0.0.1';

  try {
    await server.listen({ port, host });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Use Node.js standard entry point detection for ESM
import { fileURLToPath } from 'node:url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
