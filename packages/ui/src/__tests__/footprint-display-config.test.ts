import { describe, it, expect, beforeEach } from 'vitest';
import { useFootprintStore } from '../stores/footprint-store.js';
import { DEFAULT_FOOTPRINT_DISPLAY_CONFIG } from '@terminal/types';

describe('footprint-store display config', () => {
  beforeEach(() => {
    useFootprintStore.setState({
      enabled: false,
      displayConfig: { ...DEFAULT_FOOTPRINT_DISPLAY_CONFIG },
      footprints: new Map(),
    });
  });

  it('should initialize with default display config', () => {
    const { displayConfig } = useFootprintStore.getState();
    expect(displayConfig.mode).toBe('bid-ask');
    expect(displayConfig.showLabels).toBe(false);
    expect(displayConfig.highlightImbalances).toBe(true);
    expect(displayConfig.imbalanceThreshold).toBe(3.0);
    expect(displayConfig.showPOC).toBe(true);
    expect(displayConfig.showCumulativeDelta).toBe(true);
  });

  it('should set display mode via setDisplayMode', () => {
    useFootprintStore.getState().setDisplayMode('delta');
    expect(useFootprintStore.getState().displayConfig.mode).toBe('delta');

    useFootprintStore.getState().setDisplayMode('total-volume');
    expect(useFootprintStore.getState().displayConfig.mode).toBe('total-volume');

    useFootprintStore.getState().setDisplayMode('bid-ask-delta');
    expect(useFootprintStore.getState().displayConfig.mode).toBe('bid-ask-delta');

    useFootprintStore.getState().setDisplayMode('bid-ask');
    expect(useFootprintStore.getState().displayConfig.mode).toBe('bid-ask');
  });

  it('should update individual display config keys', () => {
    useFootprintStore.getState().updateDisplayConfig('showLabels', true);
    expect(useFootprintStore.getState().displayConfig.showLabels).toBe(true);
    // Other fields unchanged
    expect(useFootprintStore.getState().displayConfig.mode).toBe('bid-ask');

    useFootprintStore.getState().updateDisplayConfig('imbalanceThreshold', 5.0);
    expect(useFootprintStore.getState().displayConfig.imbalanceThreshold).toBe(5.0);
  });

  it('should preserve other display config fields when changing mode', () => {
    useFootprintStore.getState().updateDisplayConfig('showLabels', true);
    useFootprintStore.getState().setDisplayMode('delta');

    const { displayConfig } = useFootprintStore.getState();
    expect(displayConfig.mode).toBe('delta');
    expect(displayConfig.showLabels).toBe(true);
  });
});
