import { describe, expect, it, vi } from 'vitest';
import { createMelodyTimelineUiController } from './melody-timeline-ui-controller';

function createDeps() {
  return {
    renderMelodyTabTimeline: vi.fn(),
    syncMelodyTimelineEditingState: vi.fn(),
    isMelodyDemoPlaybackActive: vi.fn(() => false),
    stopMelodyDemoPlayback: vi.fn(),
    isListening: vi.fn(() => false),
    stopListening: vi.fn(),
    setResultMessage: vi.fn(),
  };
}

describe('melody-timeline-ui-controller', () => {
  it('refreshes the melody timeline and editing state together', () => {
    const deps = createDeps();
    const controller = createMelodyTimelineUiController(deps);

    controller.refreshUi();

    expect(deps.renderMelodyTabTimeline).toHaveBeenCalledTimes(1);
    expect(deps.syncMelodyTimelineEditingState).toHaveBeenCalledTimes(1);
  });

  it('stops active playback and listening before editing', () => {
    const deps = createDeps();
    deps.isMelodyDemoPlaybackActive.mockReturnValue(true);
    deps.isListening.mockReturnValue(true);
    const controller = createMelodyTimelineUiController(deps);

    controller.stopPlaybackForEditing();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({
      clearUi: true,
      message: 'Playback stopped to edit the melody.',
    });
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith('Session stopped to edit the melody.');
  });

  it('does nothing when playback and listening are already idle', () => {
    const deps = createDeps();
    const controller = createMelodyTimelineUiController(deps);

    controller.stopPlaybackForEditing();

    expect(deps.stopMelodyDemoPlayback).not.toHaveBeenCalled();
    expect(deps.stopListening).not.toHaveBeenCalled();
    expect(deps.setResultMessage).not.toHaveBeenCalled();
  });
});
