import { useEffect, useRef, useState } from 'react';
import { ChartManager } from '../chart-manager.js';

/**
 * Return type of the useChart hook.
 */
export interface UseChartResult {
  /** The ChartManager instance, or null before initialization. */
  chartManager: ChartManager | null;
  /** Whether the chart is ready for interaction. */
  isReady: boolean;
}

/**
 * React hook that creates and manages a ChartManager bound to a canvas element.
 * Sets up ResizeObserver and cleans up on unmount.
 *
 * @param canvasRef - React ref to the canvas element
 * @returns Object with chartManager instance and readiness state
 */
export function useChart(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
): UseChartResult {
  const managerRef = useRef<ChartManager | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create ChartManager
    const manager = new ChartManager(canvas);
    managerRef.current = manager;
    setIsReady(true);

    return () => {
      manager.dispose();
      managerRef.current = null;
      setIsReady(false);
    };
  }, [canvasRef]);

  return {
    chartManager: managerRef.current,
    isReady,
  };
}
