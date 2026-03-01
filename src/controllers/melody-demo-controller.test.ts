import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MelodyEvent } from '../melody-library';
import type { MelodyStudyRange } from '../melody-study-range';
import { createMelodyDemoController, type MelodyDemoSelection } from './melody-demo-controller';

function createSelection(events: MelodyEvent[], studyRange: MelodyStudyRange): MelodyDemoSelection {
  return {
    melody: {
      id: 'melody-1',
      name: 'Demo melody',
      events,
    },
    studyRange,
  };
}

function createDeps(options?: { selection?: MelodyDemoSelection | null; loop?: boolean; listening?: boolean }) {
  let listening = options?.listening ?? false;
  const deps = {
    getSelection: vi.fn(() => options?.selection ?? null),
    getLoopRangeEnabled: vi.fn(() => options?.loop ?? false),
    isListening: vi.fn(() => listening),
    stopListening: vi.fn(() => {
      listening = false;
    }),
    getTrainingMode: vi.fn(() => 'melody'),
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'performance'),
    seekActiveMelodySessionToEvent: vi.fn(() => true),
    ensureAudioReady: vi.fn(async () => {}),
    previewEvent: vi.fn(),
    getStepDelayMs: vi.fn(() => 120),
    getStudyRangeLength: vi.fn((studyRange: MelodyStudyRange) => studyRange.endIndex - studyRange.startIndex + 1),
    formatStudyRange: vi.fn(() => 'Steps 1-2'),
    clearUiPreview: vi.fn(),
    redrawFretboard: vi.fn(),
    onStateChange: vi.fn(),
    setResultMessage: vi.fn(),
  };
  return deps;
}

describe('melody-demo-controller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts playback from the study range start and previews the first event', async () => {
    const events: MelodyEvent[] = [
      { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
      { durationBeats: 1, notes: [{ note: 'D', stringName: 'A', fret: 5 }] },
    ];
    const deps = createDeps({
      selection: createSelection(events, { startIndex: 0, endIndex: 1 }),
    });
    const controller = createMelodyDemoController(deps);

    await controller.startPlayback();

    expect(deps.ensureAudioReady).toHaveBeenCalledTimes(1);
    expect(deps.onStateChange).toHaveBeenCalled();
    expect(deps.previewEvent).toHaveBeenCalledWith(
      events,
      'Demo melody',
      events[0],
      0,
      2,
      { startIndex: 0, endIndex: 1 },
      { label: 'Demo', autoplaySound: true }
    );
    expect(controller.isPlaying()).toBe(true);
  });

  it('stops playback and clears UI preview when requested', async () => {
    const events: MelodyEvent[] = [{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }];
    const deps = createDeps({
      selection: createSelection(events, { startIndex: 0, endIndex: 0 }),
    });
    const controller = createMelodyDemoController(deps);

    await controller.startPlayback();
    controller.stopPlayback({ clearUi: true, message: 'Stopped.' });

    expect(controller.isActive()).toBe(false);
    expect(deps.clearUiPreview).toHaveBeenCalled();
    expect(deps.redrawFretboard).toHaveBeenCalled();
    expect(deps.setResultMessage).toHaveBeenCalledWith('Stopped.');
  });

  it('seeks within active playback and resumes demo from the selected event on commit', async () => {
    const events: MelodyEvent[] = [
      { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
      { durationBeats: 1, notes: [{ note: 'D', stringName: 'A', fret: 5 }] },
      { durationBeats: 1, notes: [{ note: 'E', stringName: 'A', fret: 7 }] },
    ];
    const deps = createDeps({
      selection: createSelection(events, { startIndex: 0, endIndex: 2 }),
    });
    const controller = createMelodyDemoController(deps);

    await controller.startPlayback();
    deps.previewEvent.mockClear();

    controller.seekToEvent(2, { commit: true });

    expect(controller.isPlaying()).toBe(true);
    expect(deps.previewEvent).toHaveBeenCalledWith(
      events,
      'Demo melody',
      events[2],
      2,
      3,
      { startIndex: 0, endIndex: 2 },
      { label: 'Demo', autoplaySound: false }
    );
  });

  it('steps preview manually when demo is not playing', async () => {
    const events: MelodyEvent[] = [
      { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
      { durationBeats: 1, notes: [{ note: 'D', stringName: 'A', fret: 5 }] },
    ];
    const deps = createDeps({
      selection: createSelection(events, { startIndex: 0, endIndex: 1 }),
      listening: true,
    });
    const controller = createMelodyDemoController(deps);

    await controller.stepPreview(1);

    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.previewEvent).toHaveBeenCalledWith(
      events,
      'Demo melody',
      events[0],
      0,
      2,
      { startIndex: 0, endIndex: 1 },
      { label: 'Step', autoplaySound: true }
    );
    expect(deps.setResultMessage).toHaveBeenCalledWith('Step 1/2: Demo melody (Steps 1-2)');
  });
});
