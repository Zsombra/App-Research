import React, { useCallback, useEffect, useRef } from 'react';
import type { OHLCVCandle } from '@terminal/types';
import { useChart } from '../hooks/use-chart.js';

/** Props for the ChartPanel component. */
export interface ChartPanelProps {
  /** Unique panel identifier */
  panelId: string;
  /** Candle data to display (optional — chart shows loading state without data) */
  candles?: OHLCVCandle[];
}

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
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: isPanningRef.current ? 'grabbing' : 'crosshair',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />

      {/* HTML overlay for axis labels (pointer-events: none so clicks pass through) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {/* Axis labels will be managed here by a future AxisLabelManager */}
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
