import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { OHLCVCandle } from '@terminal/types';
import type { GridInfo } from '../renderers/grid-renderer.js';
import { useChart } from '../hooks/use-chart.js';

/** Props for the ChartPanel component. */
export interface ChartPanelProps {
  /** Unique panel identifier */
  panelId: string;
  /** Candle data to display (optional — chart shows loading state without data) */
  candles?: OHLCVCandle[];
}

/** Format a timestamp for the time axis label. */
function formatTimeLabel(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Format a price for the price axis label. */
function formatPriceLabel(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(1);
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

/** Right axis width in CSS pixels. */
const PRICE_AXIS_WIDTH = 64;
/** Bottom axis height in CSS pixels. */
const TIME_AXIS_HEIGHT = 20;

/**
 * React component that renders a WebGL candlestick chart.
 * Wraps a canvas element with the useChart hook.
 * Handles mouse events for pan, zoom, and crosshair.
 * Renders HTML overlay labels for price/time axes.
 */
export function ChartPanel({ panelId, candles }: ChartPanelProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { chartManager, isReady } = useChart(canvasRef);
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [gridInfo, setGridInfo] = useState<GridInfo>({ horizontalLines: [], verticalLines: [] });

  // Wire up grid info callback
  useEffect(() => {
    if (chartManager) {
      chartManager.onGridInfoUpdate = setGridInfo;
      return () => {
        chartManager.onGridInfoUpdate = null;
      };
    }
  }, [chartManager]);

  // Update candles when data changes
  useEffect(() => {
    if (chartManager && candles && candles.length > 0) {
      chartManager.setCandles(candles);
    }
  }, [chartManager, candles]);

  // Mouse move handler for crosshair and pan
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!chartManager) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isPanningRef.current) {
        const dx = x - lastMouseRef.current.x;
        const dy = y - lastMouseRef.current.y;
        chartManager.pan(dx, dy);
      } else {
        chartManager.setCursorPosition(x, y);
      }

      lastMouseRef.current = { x, y };
    },
    [chartManager]
  );

  // Mouse down — start pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 0) {
        isPanningRef.current = true;
        const rect = e.currentTarget.getBoundingClientRect();
        lastMouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        chartManager?.setCrosshairVisible(false);
      }
    },
    [chartManager]
  );

  // Mouse up — stop pan
  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // Mouse enter — show crosshair
  const handleMouseEnter = useCallback(() => {
    if (!isPanningRef.current) {
      chartManager?.setCrosshairVisible(true);
    }
  }, [chartManager]);

  // Mouse leave — hide crosshair, stop pan
  const handleMouseLeave = useCallback(() => {
    isPanningRef.current = false;
    chartManager?.setCrosshairVisible(false);
  }, [chartManager]);

  // Wheel — zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (!chartManager) return;
      e.preventDefault();

      const rect = e.currentTarget.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // Zoom factor from wheel delta
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      chartManager.zoom(factor, cx, cy);
    },
    [chartManager]
  );

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  return (
    <div
      data-panel-id={panelId}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0f0f14',
      }}
    >
      {/* Chart canvas area — leaves room for axes */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: `calc(100% - ${PRICE_AXIS_WIDTH}px)`,
          height: `calc(100% - ${TIME_AXIS_HEIGHT}px)`,
          cursor: isPanningRef.current ? 'grabbing' : 'crosshair',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />

      {/* Price axis (right side) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: PRICE_AXIS_WIDTH,
          bottom: TIME_AXIS_HEIGHT,
          borderLeft: '1px solid #222',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {gridInfo.horizontalLines.map((line, i) => (
          <span
            key={`p-${i}`}
            style={{
              position: 'absolute',
              right: 6,
              top: line.y / dpr - 7,
              fontSize: 10,
              color: '#666',
              whiteSpace: 'nowrap',
            }}
          >
            {formatPriceLabel(line.price)}
          </span>
        ))}
      </div>

      {/* Time axis (bottom) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: PRICE_AXIS_WIDTH,
          height: TIME_AXIS_HEIGHT,
          borderTop: '1px solid #222',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {gridInfo.verticalLines.map((line, i) => (
          <span
            key={`t-${i}`}
            style={{
              position: 'absolute',
              left: line.x / dpr - 16,
              top: 3,
              fontSize: 10,
              color: '#666',
              whiteSpace: 'nowrap',
            }}
          >
            {formatTimeLabel(line.time)}
          </span>
        ))}
      </div>

      {/* Loading overlay */}
      {!isReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            fontSize: '14px',
          }}
        >
          Loading...
        </div>
      )}
    </div>
  );
}
