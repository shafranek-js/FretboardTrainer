import { describe, expect, it, vi } from 'vitest';
import { createSessionRuntimeUiCluster } from './session-runtime-ui-cluster';

function createDeps() {
  return {
    melodyTimelineUi: {
      renderMelodyTabTimeline: vi.fn(),
      syncMelodyTimelineEditingState: vi.fn(),
      isMelodyDemoPlaybackActive: vi.fn(() => false),
      stopMelodyDemoPlayback: vi.fn(),
      isListening: vi.fn(() => false),
      stopListening: vi.fn(),
      setResultMessage: vi.fn(),
    },
    sessionStart: {
      isListening: vi.fn(() => false),
      clearMelodyTimelinePreviewState: vi.fn(),
      refreshMelodyTimelineUi: vi.fn(),
      startListening: vi.fn(async () => undefined),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(() => 'error'),
    },
    interactionGuards: {
      blockingModals: [],
    },
  };
}

describe('session-runtime-ui-cluster', () => {
  it('creates timeline UI, session start, and interaction guards as one cluster', () => {
    const cluster = createSessionRuntimeUiCluster(createDeps() as never);

    expect(cluster.melodyTimelineUiController).toBeTruthy();
    expect(cluster.sessionStartController).toBeTruthy();
    expect(cluster.interactionGuardsController).toBeTruthy();
  });
});
