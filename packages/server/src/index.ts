import Fastify from 'fastify';

/** Default server port when PORT env is not set. */
const DEFAULT_PORT = 3001;

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
  const parsed = Number(process.env['PORT']);
  const port = Number.isFinite(parsed) ? parsed : DEFAULT_PORT;
  const host = process.env['HOST'] || '127.0.0.1';

  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down gracefully…`);
    try {
      await server.close();
      process.exit(0);
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

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
