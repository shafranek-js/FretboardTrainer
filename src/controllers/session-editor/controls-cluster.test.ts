import { describe, expect, it, vi } from 'vitest';

vi.mock('../study-melody-mic-tuning-controller', () => ({
  createStudyMelodyMicTuningController: () => ({ register: vi.fn() }),
}));

vi.mock('../melody-timeline-editing-controller', () => ({
  createMelodyTimelineEditingController: () => ({
    handleHotkey: vi.fn(),
    clearSelection: vi.fn(),
  }),
}));

vi.mock('../session-melody', () => ({
  createSessionMelodyControlsCluster: () => ({
    melodyEditingControlsController: { register: vi.fn() },
    melodyPlaybackControlsController: { register: vi.fn() },
    melodyLibraryControlsController: { register: vi.fn() },
  }),
}));

import { createSessionEditorControlsCluster } from './controls-cluster';

describe('session-editor-controls-cluster', () => {
  it('creates study tuning, timeline editing, and melody control controllers', () => {
    const cluster = createSessionEditorControlsCluster({
      studyMelodyMicTuning: {} as never,
      melodyTimelineEditing: {} as never,
      melodyControls: {
        melodyEditingControls: {} as never,
        melodyPlaybackControls: {} as never,
        melodyLibraryControls: {} as never,
      },
    });

    expect(cluster.studyMelodyMicTuningController).toBeTruthy();
    expect(cluster.melodyTimelineEditingController).toBeTruthy();
    expect(cluster.melodyEditingControlsController).toBeTruthy();
    expect(cluster.melodyPlaybackControlsController).toBeTruthy();
    expect(cluster.melodyLibraryControlsController).toBeTruthy();
  });
});

