/**
 * Web Worker entry point.
 * Vite bundles this as a separate chunk when imported via:
 *   new Worker(new URL('./data-worker-entry.ts', import.meta.url), { type: 'module' })
 */
import { initializeWorker } from '@terminal/core';

initializeWorker();
