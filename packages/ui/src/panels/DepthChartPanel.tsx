import React, { useRef, useEffect, useCallback } from 'react';
import type { PanelConfig, OrderbookSnapshot } from '@terminal/types';
import { useOrderbook } from '../stores/market-store.js';
import { useActiveSymbol } from '../stores/symbol-store.js';

interface DepthChartPanelProps {
  config: PanelConfig;
}

/** Colors matching the terminal theme */
const BID_COLOR = 'rgba(38, 166, 154, 0.6)';
const BID_LINE = '#26a69a';
const ASK_COLOR = 'rgba(239, 83, 80, 0.6)';
const ASK_LINE = '#ef5350';
const GRID_COLOR = '#1a1a22';
const TEXT_COLOR = '#555';
const MID_COLOR = '#5c6bc0';

interface CumulativeLevel {
  price: number;
  cumSize: number;
}

function buildCumulativeBids(ob: OrderbookSnapshot, maxLevels: number): CumulativeLevel[] {
  const result: CumulativeLevel[] = [];
  let cum = 0;
  const levels = ob.bids.slice(0, maxLevels);
  for (const level of levels) {
    cum += level.size;
    result.push({ price: level.price, cumSize: cum });
  }
  return result;
}

function buildCumulativeAsks(ob: OrderbookSnapshot, maxLevels: number): CumulativeLevel[] {
  const result: CumulativeLevel[] = [];
  let cum = 0;
  const levels = ob.asks.slice(0, maxLevels);
  for (const level of levels) {
    cum += level.size;
    result.push({ price: level.price, cumSize: cum });
  }
  return result;
}

function renderDepthChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ob: OrderbookSnapshot | undefined
): void {
  ctx.clearRect(0, 0, width, height);

  if (!ob || ob.bids.length === 0 || ob.asks.length === 0) {
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for orderbook data...', width / 2, height / 2);
    return;
  }

  const maxLevels = 40;
  const bids = buildCumulativeBids(ob, maxLevels);
  const asks = buildCumulativeAsks(ob, maxLevels);

  if (bids.length === 0 || asks.length === 0) return;

  const midPrice = (bids[0]!.price + asks[0]!.price) / 2;
  const maxCum = Math.max(bids[bids.length - 1]!.cumSize, asks[asks.length - 1]!.cumSize) || 1;
  const priceMin = bids[bids.length - 1]!.price;
  const priceMax = asks[asks.length - 1]!.price;
  const priceRange = priceMax - priceMin || 1;

  const pad = { top: 20, bottom: 24, left: 8, right: 8 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const priceToX = (p: number): number => pad.left + ((p - priceMin) / priceRange) * cw;
  const sizeToY = (s: number): number => pad.top + ch - (s / maxCum) * ch;

  // Grid lines (horizontal)
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();

    // Size labels
    const sizeVal = maxCum * (1 - i / 4);
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(sizeVal.toFixed(2), pad.left + 2, y - 2);
  }

  // Price labels on bottom
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  const priceTicks = 5;
  for (let i = 0; i <= priceTicks; i++) {
    const p = priceMin + (priceRange / priceTicks) * i;
    const x = priceToX(p);
    ctx.fillText(formatAxisPrice(p), x, height - pad.bottom + 14);
  }

  // Draw bid curve (right to left, filled)
  ctx.beginPath();
  ctx.moveTo(priceToX(bids[0]!.price), sizeToY(0));
  for (const lvl of bids) {
    ctx.lineTo(priceToX(lvl.price), sizeToY(lvl.cumSize));
  }
  // Close area
  ctx.lineTo(priceToX(bids[bids.length - 1]!.price), sizeToY(0));
  ctx.closePath();
  ctx.fillStyle = BID_COLOR;
  ctx.fill();

  // Bid line
  ctx.beginPath();
  ctx.moveTo(priceToX(bids[0]!.price), sizeToY(0));
  for (const lvl of bids) {
    ctx.lineTo(priceToX(lvl.price), sizeToY(lvl.cumSize));
  }
  ctx.strokeStyle = BID_LINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw ask curve (left to right, filled)
  ctx.beginPath();
  ctx.moveTo(priceToX(asks[0]!.price), sizeToY(0));
  for (const lvl of asks) {
    ctx.lineTo(priceToX(lvl.price), sizeToY(lvl.cumSize));
  }
  ctx.lineTo(priceToX(asks[asks.length - 1]!.price), sizeToY(0));
  ctx.closePath();
  ctx.fillStyle = ASK_COLOR;
  ctx.fill();

  // Ask line
  ctx.beginPath();
  ctx.moveTo(priceToX(asks[0]!.price), sizeToY(0));
  for (const lvl of asks) {
    ctx.lineTo(priceToX(lvl.price), sizeToY(lvl.cumSize));
  }
  ctx.strokeStyle = ASK_LINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Mid price marker
  const midX = priceToX(midPrice);
  ctx.strokeStyle = MID_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(midX, pad.top);
  ctx.lineTo(midX, height - pad.bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  // Mid price label
  ctx.fillStyle = MID_COLOR;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(formatAxisPrice(midPrice), midX, pad.top - 4);
}

function formatAxisPrice(p: number): string {
  if (p >= 10000) return p.toFixed(0);
  if (p >= 100) return p.toFixed(1);
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

export function DepthChartPanel({ config: _config }: DepthChartPanelProps): React.JSX.Element {
  const activeSymbol = useActiveSymbol();
  const symbol = activeSymbol ?? 'BTC/USDT';
  const orderbook = useOrderbook(symbol);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderDepthChart(ctx, w, h, orderbook);
  }, [orderbook]);

  useEffect(() => {
    paint();
  }, [paint]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => paint());
    ro.observe(container);
    return () => ro.disconnect();
  }, [paint]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#0a0a0e', position: 'relative' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
