import { describe, expect, it } from 'vitest';
import { createMicMonophonicAttackTrackingController } from './mic-monophonic-attack-tracking-controller';
import type { Prompt } from './types';

type MicMonophonicAttackTrackingState = Parameters<
  typeof createMicMonophonicAttackTrackingController
>[0]['state'];

function createState(): MicMonophonicAttackTrackingState {
  return {
    micMonophonicAttackTrackedNote: null,
    micMonophonicAttackPeakVolume: 0,
    micMonophonicAttackLastVolume: 0,
    micMonophonicFirstDetectedAtMs: null,
    micLastMonophonicDetectedAtMs: null,
    studyMelodyRepeatPromptRequiresFreshAttack: false,
    studyMelodyRepeatPromptSawSilence: false,
    startTime: 0,
    currentPrompt: null,
  };
}

describe('mic-monophonic-attack-tracking-controller', () => {
  it('starts tracking a new note and rearms the same note when the injected rule accepts it', () => {
    const state = createState();
    let currentNow = 100;
    const controller = createMicMonophonicAttackTrackingController({
      state,
      getTrainingMode: () => 'melody',
      isMelodyWorkflowMode: () => true,
      resolvePerformanceMicDropHoldMs: () => 120,
      shouldResetMicAttackTracking: () => false,
      shouldRearmMicOnsetForSameNote: ({ onsetAgeMs }) => onsetAgeMs !== null && onsetAgeMs >= 40,
      shouldResetStudyMelodyOnsetTrackingOnPromptChange: () => false,
      now: () => currentNow,
    });

    expect(controller.update('A3', 0.12)).toBe('started');
    expect(state.micMonophonicAttackTrackedNote).toBe('A3');
    expect(state.micMonophonicFirstDetectedAtMs).toBe(100);

    currentNow = 150;
    expect(controller.update('A3', 0.2)).toBe('rearmed');
    expect(state.micMonophonicAttackPeakVolume).toBe(0.2);
    expect(state.micMonophonicFirstDetectedAtMs).toBe(150);
  });

  it('marks silence and clears the fresh-attack guard only after a new post-start onset', () => {
    const state = createState();
    state.studyMelodyRepeatPromptRequiresFreshAttack = true;
    state.startTime = 500;
    state.micMonophonicFirstDetectedAtMs = 520;
    const controller = createMicMonophonicAttackTrackingController({
      state,
      getTrainingMode: () => 'melody',
      isMelodyWorkflowMode: () => true,
      resolvePerformanceMicDropHoldMs: () => 120,
      shouldResetMicAttackTracking: () => false,
      shouldRearmMicOnsetForSameNote: () => false,
      shouldResetStudyMelodyOnsetTrackingOnPromptChange: () => false,
    });

    controller.markSilenceDuringFreshAttackWait();
    controller.clearFreshAttackGuard('started');

    expect(state.studyMelodyRepeatPromptRequiresFreshAttack).toBe(false);
    expect(state.studyMelodyRepeatPromptSawSilence).toBe(false);
  });

  it('syncs prompt transitions and resets tracking only for repeated melody prompts', () => {
    const state = createState();
    state.micMonophonicAttackTrackedNote = 'E4';
    state.micMonophonicAttackPeakVolume = 0.3;
    state.micMonophonicAttackLastVolume = 0.25;
    state.micMonophonicFirstDetectedAtMs = 900;
    const controller = createMicMonophonicAttackTrackingController({
      state,
      getTrainingMode: () => 'melody',
      isMelodyWorkflowMode: () => true,
      resolvePerformanceMicDropHoldMs: () => 120,
      shouldResetMicAttackTracking: () => false,
      shouldRearmMicOnsetForSameNote: () => false,
      shouldResetStudyMelodyOnsetTrackingOnPromptChange: () => true,
    });

    controller.syncPromptTransition(
      { targetNote: 'E', targetString: 'A', displayText: 'Prev', targetChordNotes: [] } as Prompt,
      { targetNote: 'E', targetString: 'A', displayText: 'Next', targetChordNotes: [] } as Prompt
    );

    expect(state.studyMelodyRepeatPromptRequiresFreshAttack).toBe(true);
    expect(state.studyMelodyRepeatPromptSawSilence).toBe(false);
    expect(state.micMonophonicAttackTrackedNote).toBeNull();
    expect(state.micMonophonicAttackPeakVolume).toBe(0);
    expect(state.micMonophonicFirstDetectedAtMs).toBeNull();
  });
});
