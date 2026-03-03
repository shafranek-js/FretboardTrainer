import { describe, expect, it } from 'vitest';
import { resolveScrollingTabPanelRuntimeState } from './scrolling-tab-panel-runtime';
import type { MelodyDefinition } from './melody-library';

const melody: MelodyDefinition = {
  id: 'melody-1',
  name: 'Melody',
  source: 'custom',
  instrumentName: 'guitar',
  events: [
    { durationBeats: 1, notes: [{ note: 'E', stringName: 'e', fret: 0 }] },
    { durationBeats: 2, notes: [{ note: 'G', stringName: 'B', fret: 8 }] },
  ],
};

describe('scrolling-tab-panel-runtime', () => {
  it('resolves active demo playback time from the demo runtime cursor', () => {
    const runtime = resolveScrollingTabPanelRuntimeState({
      melody,
      bpm: 120,
      studyRange: { startIndex: 0, endIndex: 1 },
      trainingMode: 'melody',
      isListening: false,
      currentPrompt: null,
      promptStartedAtMs: 0,
      currentMelodyEventIndex: 0,
      melodyDemoRuntimeActive: true,
      melodyDemoRuntimePaused: false,
      melodyDemoRuntimeBaseTimeSec: 1.5,
      melodyDemoRuntimeAnchorStartedAtMs: 10_000,
      melodyDemoRuntimePausedOffsetSec: 0,
      performancePrerollLeadInVisible: false,
      performancePrerollStartedAtMs: null,
      performancePrerollDurationMs: 0,
      performanceRuntimeStartedAtMs: null,
      nowMs: 10_400,
    });

    expect(runtime.currentTimeSec).toBeCloseTo(1.9, 4);
    expect(runtime.leadInSec).toBe(0);
    expect(runtime.shouldAnimate).toBe(true);
  });

  it('resolves performance preroll time from the preroll clock', () => {
    const runtime = resolveScrollingTabPanelRuntimeState({
      melody,
      bpm: 120,
      studyRange: { startIndex: 0, endIndex: 1 },
      trainingMode: 'performance',
      isListening: true,
      currentPrompt: null,
      promptStartedAtMs: 0,
      currentMelodyEventIndex: 0,
      melodyDemoRuntimeActive: false,
      melodyDemoRuntimePaused: false,
      melodyDemoRuntimeBaseTimeSec: 0,
      melodyDemoRuntimeAnchorStartedAtMs: null,
      melodyDemoRuntimePausedOffsetSec: 0,
      performancePrerollLeadInVisible: true,
      performancePrerollStartedAtMs: 5_000,
      performancePrerollDurationMs: 2_000,
      performanceRuntimeStartedAtMs: null,
      nowMs: 5_600,
    });

    expect(runtime.currentTimeSec).toBeCloseTo(0.6, 4);
    expect(runtime.leadInSec).toBe(2);
    expect(runtime.shouldAnimate).toBe(true);
  });

  it('resolves performance time from a dedicated session runtime clock', () => {
    const runtime = resolveScrollingTabPanelRuntimeState({
      melody,
      bpm: 120,
      studyRange: { startIndex: 0, endIndex: 1 },
      trainingMode: 'performance',
      isListening: true,
      currentPrompt: { displayText: 'x', targetNote: 'G', targetString: 'B', targetChordNotes: [], targetChordFingering: [], targetMelodyEventNotes: [], baseChordName: null } as never,
      promptStartedAtMs: 20_000,
      currentMelodyEventIndex: 2,
      melodyDemoRuntimeActive: false,
      melodyDemoRuntimePaused: false,
      melodyDemoRuntimeBaseTimeSec: 0,
      melodyDemoRuntimeAnchorStartedAtMs: null,
      melodyDemoRuntimePausedOffsetSec: 0,
      performancePrerollLeadInVisible: false,
      performancePrerollStartedAtMs: null,
      performancePrerollDurationMs: 2_000,
      performanceRuntimeStartedAtMs: 20_000,
      nowMs: 20_300,
    });

    expect(runtime.currentTimeSec).toBeCloseTo(2.3, 4);
    expect(runtime.leadInSec).toBe(2);
    expect(runtime.shouldAnimate).toBe(true);
  });

  it('keeps the performance cursor animating between prompts instead of dropping to a stopped state', () => {
    const runtime = resolveScrollingTabPanelRuntimeState({
      melody,
      bpm: 120,
      studyRange: { startIndex: 0, endIndex: 1 },
      trainingMode: 'performance',
      isListening: true,
      currentPrompt: null,
      promptStartedAtMs: 20_000,
      currentMelodyEventIndex: 1,
      melodyDemoRuntimeActive: false,
      melodyDemoRuntimePaused: false,
      melodyDemoRuntimeBaseTimeSec: 0,
      melodyDemoRuntimeAnchorStartedAtMs: null,
      melodyDemoRuntimePausedOffsetSec: 0,
      performancePrerollLeadInVisible: false,
      performancePrerollStartedAtMs: null,
      performancePrerollDurationMs: 2_000,
      performanceRuntimeStartedAtMs: 20_000,
      nowMs: 20_300,
    });

    expect(runtime.currentTimeSec).toBeCloseTo(2.3, 4);
    expect(runtime.shouldAnimate).toBe(true);
    expect(runtime.leadInSec).toBe(2);
  });
});
