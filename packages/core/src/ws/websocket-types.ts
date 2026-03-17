/**
 * Minimal WebSocket type declarations for environments
 * where DOM lib is not available (e.g., Node.js, Web Worker builds).
 *
 * These types mirror the subset of the WebSocket API that the
 * WebSocketManager and adapters use.
 */

export interface WSMessageEvent {
  data: string | ArrayBuffer | Blob;
}

export interface WSCloseEvent {
  code: number;
  reason: string;
}

export interface WSEvent {
  type?: string;
}

export interface IWebSocket {
  readonly readyState: number;
  onopen: ((event: WSEvent) => void) | null;
  onclose: ((event: WSCloseEvent) => void) | null;
  onerror: ((event: WSEvent) => void) | null;
  onmessage: ((event: WSMessageEvent) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface IWebSocketConstructor {
  new (url: string): IWebSocket;
  readonly CONNECTING: number;
  readonly OPEN: number;
  readonly CLOSING: number;
  readonly CLOSED: number;
}

/**
 * Gets the WebSocket constructor from the global scope.
 * Works in both browser, Web Worker, and Node.js (with ws package) contexts.
 */
export function getWebSocketConstructor(): IWebSocketConstructor {
  const g = globalThis as Record<string, unknown>;
  if (g['WebSocket']) {
    return g['WebSocket'] as IWebSocketConstructor;
  }
  throw new Error('WebSocket is not available in this environment');
}

/** WebSocket readyState constants */
export const WS_CONNECTING = 0;
export const WS_OPEN = 1;
export const WS_CLOSING = 2;
export const WS_CLOSED = 3;
