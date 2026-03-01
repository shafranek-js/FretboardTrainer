import { describe, expect, it, vi } from 'vitest';
import type { MelodyEvent } from '../melody-library';
import { createMelodyDemoPresentationController } from './melody-demo-presentation-controller';

class FakeClassList {
  private values = new Set<string>();

  add(...tokens: string[]) {
    tokens.forEach((token) => this.values.add(token));
  }

  remove(...tokens: string[]) {
    tokens.forEach((token) => this.values.delete(token));
  }

  toggle(token: string, force?: boolean) {
    if (force === true) {
      this.values.add(token);
      return true;
    }
    if (force === false) {
      this.values.delete(token);
      return false;
    }
    if (this.values.has(token)) {
      this.values.delete(token);
      return false;
    }
    this.values.add(token);
    return true;
  }

  contains(token: string) {
    return this.values.has(token);
  }
}

function createInstrument() {
  return {
    name: 'Guitar',
    STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'],
    TUNING: {
      E: 82.41,
      A: 110,
      D: 146.83,
      G: 196,
      B: 246.94,
      e: 329.63,
    },
    FRETBOARD: {
      E: { C: 8, G: 3 },
      A: { C: 3, G: 10 },
      D: { C: 10, G: 5 },
      G: { C: 5, G: 0 },
      B: { C: 1, G: 8 },
      e: { C: 8, G: 3 },
    },
    getNoteWithOctave: (string: string, fret: number) => `${string}${fret}`,
  };
}

function createDeps(options?: { selectedMelody?: { id: string; name: string; events: MelodyEvent[] } | null }) {
  const dom = {
    melodyDemoBpm: { value: '500' } as HTMLInputElement,
    melodyDemoBpmValue: { textContent: '' } as HTMLElement,
    melodyDemoBtn: { textContent: '', classList: new FakeClassList() } as unknown as HTMLButtonElement,
    melodyPauseDemoBtn: { textContent: '', disabled: false, classList: new FakeClassList() } as unknown as HTMLButtonElement,
    melodyStepBackBtn: { disabled: false } as HTMLButtonElement,
    melodyStepForwardBtn: { disabled: false } as HTMLButtonElement,
    melodyLoopRange: { disabled: false } as HTMLInputElement,
    melodyPlaybackControls: { classList: new FakeClassList() } as unknown as HTMLElement,
    trainingMode: { value: 'melody' } as HTMLSelectElement,
    stringSelector: {} as HTMLElement,
  };
  const state = {
    melodyTimelinePreviewIndex: null as number | null,
    melodyTimelinePreviewLabel: null as string | null,
    currentInstrument: createInstrument(),
    calibratedA4: 440,
    audioContext: {
      state: 'running',
      resume: vi.fn(async () => {}),
    },
  };
  const deps = {
    dom,
    state,
    getSelectedMelody: vi.fn(() => options?.selectedMelody ?? null),
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'performance'),
    isDemoActive: vi.fn(() => false),
    isDemoPaused: vi.fn(() => false),
    syncLoopRangeDisplay: vi.fn(),
    loadInstrumentSoundfont: vi.fn(async () => {}),
    showNonBlockingError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
    getEnabledStrings: vi.fn(() => new Set(['E', 'A', 'D', 'G', 'B', 'e'])),
    playSound: vi.fn(),
    setPromptText: vi.fn(),
    drawFretboard: vi.fn(),
    redrawFretboard: vi.fn(),
    renderTimeline: vi.fn(),
    findPlayableStringForNote: vi.fn(() => 'A'),
  };
  return { deps, dom, state };
}

describe('melody-demo-presentation-controller', () => {
  it('clamps BPM, syncs the display, and renders button state', () => {
    const selectedMelody = {
      id: 'melody-1',
      name: 'Romanza',
      events: [{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }],
    };
    const { deps, dom } = createDeps({ selectedMelody });
    deps.isDemoActive.mockReturnValue(true);
    deps.isDemoPaused.mockReturnValue(true);
    const controller = createMelodyDemoPresentationController(deps);

    expect(controller.getClampedBpmFromInput()).toBe(220);

    controller.renderButtonState();

    expect(dom.melodyDemoBpm.value).toBe('220');
    expect(dom.melodyDemoBpmValue.textContent).toBe('220');
    expect(dom.melodyDemoBtn.textContent).toBe('Stop');
    expect(dom.melodyPauseDemoBtn.textContent).toBe('Resume');
    expect(dom.melodyPauseDemoBtn.disabled).toBe(false);
    expect(dom.melodyStepBackBtn.disabled).toBe(true);
    expect(dom.melodyPlaybackControls.classList.contains('hidden')).toBe(false);
    expect(deps.syncLoopRangeDisplay).toHaveBeenCalledTimes(1);
  });

  it('previews a monophonic event and plays the prompt audio', () => {
    const events: MelodyEvent[] = [{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }];
    const { deps, state } = createDeps();
    const controller = createMelodyDemoPresentationController(deps);

    controller.previewEvent(events, 'Romanza', events[0]!, 0, 1, { startIndex: 0, endIndex: 0 });

    expect(state.melodyTimelinePreviewIndex).toBe(0);
    expect(state.melodyTimelinePreviewLabel).toBe('Playback');
    expect(deps.setPromptText).toHaveBeenCalledWith('Playback [1/1]: C (A, fret 3) (Romanza)');
    expect(deps.drawFretboard).toHaveBeenCalledWith(
      false,
      null,
      null,
      [expect.objectContaining({ note: 'C', string: 'A', fret: 3, finger: 1 })]
    );
    expect(deps.playSound).toHaveBeenCalledWith('A3');
    expect(deps.renderTimeline).toHaveBeenCalledTimes(1);
  });

  it('previews a chord event with chord fingering and can skip autoplay', () => {
    const events: MelodyEvent[] = [
      {
        durationBeats: 1,
        notes: [
          { note: 'C', stringName: 'A', fret: 3 },
          { note: 'G', stringName: 'D', fret: 5 },
        ],
      },
    ];
    const { deps } = createDeps();
    const controller = createMelodyDemoPresentationController(deps);

    controller.previewEvent(events, 'Romanza', events[0]!, 0, 1, { startIndex: 0, endIndex: 0 }, { autoplaySound: false });

    expect(deps.drawFretboard).toHaveBeenCalledWith(
      false,
      null,
      null,
      [
        expect.objectContaining({ note: 'C', string: 'A', fret: 3 }),
        expect.objectContaining({ note: 'G', string: 'D', fret: 5 }),
      ]
    );
    expect(deps.playSound).not.toHaveBeenCalled();
  });

  it('initializes audio and reports non-blocking errors', async () => {
    const { deps, state } = createDeps();
    state.audioContext.state = 'suspended';
    const controller = createMelodyDemoPresentationController(deps);

    await controller.ensureAudioReady();

    expect(deps.loadInstrumentSoundfont).toHaveBeenCalledWith('Guitar');
    expect(state.audioContext.resume).toHaveBeenCalledTimes(1);

    deps.loadInstrumentSoundfont.mockRejectedValueOnce(new Error('boom'));
    await controller.ensureAudioReady();

    expect(deps.formatUserFacingError).toHaveBeenCalledWith(
      'Failed to initialize sound for melody playback',
      expect.any(Error)
    );
    expect(deps.showNonBlockingError).toHaveBeenCalledWith('Failed to initialize sound for melody playback');
  });
});
