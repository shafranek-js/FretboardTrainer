import { describe, expect, it, vi } from 'vitest';
import { createMelodyDemoRuntimeController } from './melody-demo-runtime-controller';
import { instruments } from '../instruments';
import type { MelodyDefinition } from '../melody-library';

function createClassList() {
  const classes = new Set<string>();
  return {
    toggle: vi.fn((className: string, force?: boolean) => {
      if (force === undefined) {
        if (classes.has(className)) {
          classes.delete(className);
        } else {
          classes.add(className);
        }
        return;
      }
      if (force) {
        classes.add(className);
      } else {
        classes.delete(className);
      }
    }),
    contains: (className: string) => classes.has(className),
  };
}

function createButton() {
  const attributes: Record<string, string> = {};
  return {
    innerHTML: '',
    disabled: false,
    title: '',
    classList: createClassList(),
    setAttribute: vi.fn((name: string, value: string) => {
      attributes[name] = value;
    }),
    getAttribute: (name: string) => attributes[name] ?? null,
  } as unknown as HTMLButtonElement;
}

function createDeps() {
  const dom = {
    melodySelector: { value: '' } as HTMLSelectElement,
    melodyTabTimelineGrid: { scrollLeft: 96 } as HTMLElement,
    melodyDemoBpm: { value: '120' } as HTMLInputElement,
    melodyDemoBpmValue: { textContent: '' } as HTMLElement,
    melodyDemoBtn: createButton(),
    melodyPauseDemoBtn: createButton(),
    melodyStepBackBtn: createButton(),
    melodyStepForwardBtn: createButton(),
    melodyLoopRange: { checked: false, disabled: false } as HTMLInputElement,
    melodyPlaybackControls: { classList: createClassList() } as HTMLElement,
    trainingMode: { value: 'melody' } as HTMLSelectElement,
    stringSelector: { enabledStrings: new Set(['B']) } as unknown as HTMLElement,
  };

  const melodies: Record<string, MelodyDefinition> = {
    melody1: {
      id: 'melody1',
      name: 'Test melody',
      source: 'builtin',
      instrumentName: 'guitar',
      sourceFormat: 'midi',
      events: [
        {
          notes: [{ note: 'E4', stringName: 'B', fret: 5 }],
          durationBeats: 1,
        },
      ],
    },
    empty: {
      id: 'empty',
      name: 'Empty melody',
      source: 'builtin',
      instrumentName: 'guitar',
      sourceFormat: 'midi',
      events: [],
    },
  };

  return {
    dom,
    state: {
      uiWorkflow: 'practice' as const,
      currentInstrument: instruments.guitar,
      melodyTransposeSemitones: 0,
      melodyStringShift: 0,
      melodyLoopRangeEnabled: false,
      isListening: false,
      currentMelodyId: null,
      currentMelodyEventIndex: 0,
      performanceActiveEventIndex: null,
      melodyTimelinePreviewIndex: null,
      melodyTimelinePreviewLabel: null,
      melodyDemoRuntimeActive: false,
      melodyDemoRuntimePaused: false,
      melodyDemoRuntimeBaseTimeSec: 0,
      melodyDemoRuntimeAnchorStartedAtMs: null,
      melodyDemoRuntimePausedOffsetSec: 0,
      melodyFingeringStrategy: 'minimax' as const,
      melodyFingeringLevel: 'beginner' as const,
      calibratedA4: 440,
      audioContext: null,
    },
    getSelectedMelodyId: () => dom.melodySelector.value || null,
    getMelodyById: vi.fn((melodyId: string) => melodies[melodyId] ?? null),
    getStoredMelodyStudyRange: vi.fn((_melodyId: string, totalEvents: number) => ({
      startIndex: 0,
      endIndex: Math.max(0, totalEvents - 1),
    })),
    getEnabledStrings: vi.fn((container: { enabledStrings: Set<string> }) => new Set(container.enabledStrings)),
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'performance'),
    setResultMessage: vi.fn(),
    setPromptText: vi.fn(),
    syncMelodyLoopRangeDisplay: vi.fn(),
    showNonBlockingError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
    scheduleTimelineRender: vi.fn(),
    drawFretboard: vi.fn(),
    redrawFretboard: vi.fn(),
    playSound: vi.fn(),
    loadInstrumentSoundfont: vi.fn(async () => {}),
    stopListening: vi.fn(),
    seekActiveMelodySessionToEvent: vi.fn(() => true),
    getStudyRangeLength: vi.fn((studyRange, _totalEvents: number) => studyRange.endIndex - studyRange.startIndex + 1),
    formatStudyRange: vi.fn((studyRange) => `${studyRange.startIndex + 1}-${studyRange.endIndex + 1}`),
    startMelodyMetronomeIfEnabled: vi.fn(async () => {}),
    syncMelodyMetronomeRuntime: vi.fn(async () => {}),
    updateScrollingTabPanelRuntime: vi.fn(),
    getPlaybackActionLabel: vi.fn(() => 'Play melody'),
    getPlaybackPromptLabel: vi.fn(() => 'Playback'),
    getPlaybackCompletedLabel: vi.fn(() => 'Completed'),
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }),
  };
}

describe('melody-demo-runtime-controller', () => {
  it('reports an error when playback starts without a selected melody', async () => {
    const deps = createDeps();
    const controller = createMelodyDemoRuntimeController(deps);

    await controller.startPlayback();

    expect(deps.setResultMessage).toHaveBeenCalledWith('Select a melody first.', 'error');
  });

  it('reports an error when the selected melody has no playable events', async () => {
    const deps = createDeps();
    deps.dom.melodySelector.value = 'empty';
    const controller = createMelodyDemoRuntimeController(deps);

    await controller.startPlayback();

    expect(deps.setResultMessage).toHaveBeenCalledWith('Selected melody has no playable notes.', 'error');
  });

  it('resets timeline scroll and syncs metronome runtime when stopping playback', () => {
    const deps = createDeps();
    const controller = createMelodyDemoRuntimeController(deps);

    controller.stopPlayback({ clearUi: true });

    expect(deps.dom.melodyTabTimelineGrid.scrollLeft).toBe(0);
    expect(deps.syncMelodyMetronomeRuntime).toHaveBeenCalledTimes(2);
  });

  it('finds the first playable note on enabled strings only', () => {
    const deps = createDeps();
    const controller = createMelodyDemoRuntimeController(deps);

    expect(controller.findPlayableStringForNote('E')).toBe('B');
    expect(controller.findPlayableStringForNote('H')).toBeNull();
  });
});

