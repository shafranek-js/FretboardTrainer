import { describe, expect, it } from 'vitest';
import { createSessionPromptPerformanceRuntimeCluster } from './session-prompt-performance-runtime-cluster';

describe('session-prompt-performance-runtime-cluster', () => {
  it('creates prompt/performance runtime controllers from grouped dependencies', () => {
    const cluster = createSessionPromptPerformanceRuntimeCluster({
      rhythmMode: {} as never,
      micMonophonicAttackTracking: {} as never,
      sessionPrompt: {} as never,
      performancePrompt: {} as never,
      performanceTransport: {} as never,
      nextPrompt: () => {},
    });

    expect(cluster.rhythmModeRuntimeController).toBeTruthy();
    expect(cluster.micMonophonicAttackTrackingController).toBeTruthy();
    expect(cluster.sessionPromptRuntimeController).toBeTruthy();
    expect(cluster.performancePromptController).toBeTruthy();
    expect(cluster.performanceTransportRuntimeController).toBeTruthy();
  });
});
