import { useRef, useEffect } from 'react';

/**
 * Development-only hook that logs slow renders.
 * Measures time between render start and commit (useEffect).
 * Only logs if render exceeds the threshold.
 */
export function useRenderPerf(componentName: string, thresholdMs = 16): void {
  const startRef = useRef(performance.now());

  // Mark render start
  startRef.current = performance.now();

  useEffect(() => {
    const elapsed = performance.now() - startRef.current;
    if (elapsed > thresholdMs) {
      console.warn(`[Perf] ${componentName} slow render: ${elapsed.toFixed(1)}ms`);
    }
  });
}

/**
 * Tracks FPS using requestAnimationFrame.
 * Returns cleanup function. Logs warning when FPS drops below threshold.
 */
export function startFpsMonitor(warnBelowFps = 30): () => void {
  let frameCount = 0;
  let lastTime = performance.now();
  let rafId: number;

  const tick = (): void => {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastTime;

    if (elapsed >= 1000) {
      const fps = Math.round((frameCount * 1000) / elapsed);
      if (fps < warnBelowFps) {
        console.warn(`[Perf] Low FPS: ${fps}`);
      }
      frameCount = 0;
      lastTime = now;
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}
