import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { OHLCVCandle } from '@terminal/types';
import type { GridInfo } from '../renderers/grid-renderer.js';
import type { LineSeries } from '../renderers/line-overlay-renderer.js';
import { useChart } from '../hooks/use-chart.js';
import { useIndicatorStore, useOverlaySeries, useSeparateSeries } from '../../stores/indicator-store.js';
import { IndicatorSelector } from '../../components/IndicatorSelector.js';

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

/** Parse a hex color string to RGBA tuple. */
function hexToRGBA(hex: string, alpha: number = 1): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, alpha];
}

/** Right axis width in CSS pixels. */
const PRICE_AXIS_WIDTH = 64;
/** Bottom axis height in CSS pixels. */
const TIME_AXIS_HEIGHT = 20;

/**
 * React component that renders a WebGL candlestick chart with indicator overlays.
 * Wraps a canvas element with the useChart hook.
 * Handles mouse events for pan, zoom, and crosshair.
 * Renders HTML overlay labels for price/time axes.
 */
export function ChartPanel({ panelId, candles }: ChartPanelProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { chartManager, isReady } = useChart(canvasRef);
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const prevCandleCountRef = useRef(0);
  const [gridInfo, setGridInfo] = useState<GridInfo>({ horizontalLines: [], verticalLines: [] });
  const [oscLabels, setOscLabels] = useState<{ value: number; pixelY: number }[]>([]);

  // Indicator series from store
  const overlaySeries = useOverlaySeries();
  const separateSeries = useSeparateSeries();

  // Wire up grid info callback
  useEffect(() => {
    if (chartManager) {
      chartManager.onGridInfoUpdate = setGridInfo;
      chartManager.onOscillatorInfoUpdate = setOscLabels;
      return () => {
        chartManager.onGridInfoUpdate = null;
        chartManager.onOscillatorInfoUpdate = null;
      };
    }
  }, [chartManager]);

  // Incremental candle updates: only setCandles on reset, otherwise update last candle
  useEffect(() => {
    if (!chartManager || !candles || candles.length === 0) return;

    const prevCount = prevCandleCountRef.current;

    if (prevCount === 0 || candles.length < prevCount) {
      // First load or data reset — full replacement
      chartManager.setCandles(candles);
    } else if (candles.length === prevCount) {
      // Same count — just update the last (forming) candle
      chartManager.updateLastCandle(candles[candles.length - 1]!);
    } else {
      // New candle(s) appeared — append new ones and update last
      for (let i = prevCount; i < candles.length - 1; i++) {
        chartManager.appendCandle(candles[i]!);
      }
      // The very last candle might be forming
      if (candles.length > prevCount) {
        chartManager.appendCandle(candles[candles.length - 1]!);
      }
    }

    prevCandleCountRef.current = candles.length;
  }, [chartManager, candles]);

  // Wire overlay indicators to chart manager
  useEffect(() => {
    if (!chartManager) return;

    if (overlaySeries.length === 0) {
      chartManager.setOverlaySeries([]);
      return;
    }

    const lines: LineSeries[] = [];

    for (const series of overlaySeries) {
      const config = series;
      // Look up color from indicator store
      const { indicators } = useIndicatorStore.getState();
      const indicatorConfig = indicators.get(config.id);
      const color = hexToRGBA(indicatorConfig?.color ?? '#FFD700');

      if (series.kind === 'bollinger') {
        // Bollinger: 3 lines (upper, middle, lower)
        const pts = series.points;
        lines.push({
          id: `${series.id}-upper`,
          color: [...color.slice(0, 3), 0.5] as [number, number, number, number],
          width: 1,
          points: pts.map((p) => ({ timestamp: p.timestamp, value: p.data.upper })),
        });
        lines.push({
          id: `${series.id}-middle`,
          color,
          width: 1.5,
          points: pts.map((p) => ({ timestamp: p.timestamp, value: p.data.middle })),
        });
        lines.push({
          id: `${series.id}-lower`,
          color: [...color.slice(0, 3), 0.5] as [number, number, number, number],
          width: 1,
          points: pts.map((p) => ({ timestamp: p.timestamp, value: p.data.lower })),
        });
      } else {
        // SMA/EMA: single line
        lines.push({
          id: series.id,
          color,
          width: 1.5,
          points: series.points.map((p) => ({
            timestamp: p.timestamp,
            value: (p.data as { value: number | null }).value,
          })),
        });
      }
    }

    chartManager.setOverlaySeries(lines);
  }, [chartManager, overlaySeries]);

  // Wire separate-pane indicators (RSI, MACD) to chart manager
  useEffect(() => {
    if (!chartManager) return;

    if (separateSeries.length === 0) {
      chartManager.clearOscillator();
      setOscLabels([]);
      return;
    }

    // Use the first separate indicator to configure the pane
    const first = separateSeries[0]!;
    const { indicators } = useIndicatorStore.getState();

    if (first.kind === 'rsi') {
      const indicatorConfig = indicators.get(first.id);
      const color = hexToRGBA(indicatorConfig?.color ?? '#FFD700');

      chartManager.setOscillatorData(
        {
          paneTopFraction: 0.75,
          paneHeightFraction: 0.25,
          yMin: 0,
          yMax: 100,
          referenceLines: [30, 70],
        },
        [{
          color,
          width: 1.5,
          points: first.points.map((p) => ({ timestamp: p.timestamp, value: p.data.value })),
        }]
      );
    } else if (first.kind === 'macd') {
      const indicatorConfig = indicators.get(first.id);
      const color = hexToRGBA(indicatorConfig?.color ?? '#00BCD4');

      // Find Y range from MACD data
      let yMin = 0;
      let yMax = 0;
      const histogram: { timestamp: number; value: number }[] = [];
      for (const pt of first.points) {
        if (pt.data.macd !== null) {
          yMin = Math.min(yMin, pt.data.macd, pt.data.signal ?? 0, pt.data.histogram ?? 0);
          yMax = Math.max(yMax, pt.data.macd, pt.data.signal ?? 0, pt.data.histogram ?? 0);
        }
        if (pt.data.histogram !== null) {
          histogram.push({ timestamp: pt.timestamp, value: pt.data.histogram });
        }
      }
      const padding = (yMax - yMin) * 0.1 || 1;

      chartManager.setOscillatorData(
        {
          paneTopFraction: 0.75,
          paneHeightFraction: 0.25,
          yMin: yMin - padding,
          yMax: yMax + padding,
          referenceLines: [0],
        },
        [
          {
            color,
            width: 1.5,
            points: first.points.map((p) => ({ timestamp: p.timestamp, value: p.data.macd })),
          },
          {
            color: hexToRGBA('#FF6EC7'),
            width: 1,
            points: first.points.map((p) => ({ timestamp: p.timestamp, value: p.data.signal })),
          },
        ],
        histogram
      );
    }
  }, [chartManager, separateSeries]);

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
      {/* Indicator selector (top-left corner) */}
      <div style={{ position: 'absolute', top: 4, left: 4, zIndex: 10 }}>
        <IndicatorSelector />
      </div>

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
        {/* Oscillator reference labels */}
        {oscLabels.map((label, i) => (
          <span
            key={`osc-${i}`}
            style={{
              position: 'absolute',
              right: 6,
              top: label.pixelY - 7,
              fontSize: 9,
              color: '#555',
              whiteSpace: 'nowrap',
            }}
          >
            {label.value}
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
