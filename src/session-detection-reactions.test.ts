import { describe, expect, it } from 'vitest';
import {
  buildAudioMonophonicReactionPlan,
  buildAudioPolyphonicReactionPlan,
  buildCalibrationFrameReactionPlan,
  buildMidiPolyphonicReactionPlan,
  buildStableMonophonicReactionPlan,
} from './session-detection-reactions';

describe('buildStableMonophonicReactionPlan', () => {
  it('routes free mode to live highlight', () => {
    expect(
      buildStableMonophonicReactionPlan({
        trainingMode: 'free',
        detectedNote: 'E',
        hasCurrentPrompt: true,
        promptTargetNote: 'A',
        promptTargetString: 'E',
        showingAllNotes: false,
      })
    ).toEqual({ kind: 'free_highlight' });
  });

  it('routes rhythm mode to rhythm feedback', () => {
    expect(
      buildStableMonophonicReactionPlan({
        trainingMode: 'rhythm',
        detectedNote: 'E',
        hasCurrentPrompt: true,
        promptTargetNote: null,
        promptTargetString: null,
        showingAllNotes: false,
      })
    ).toEqual({ kind: 'rhythm_feedback' });
  });

  it('returns success for matching target note', () => {
    expect(
      buildStableMonophonicReactionPlan({
        trainingMode: 'random',
        detectedNote: 'E',
        hasCurrentPrompt: true,
        promptTargetNote: 'E',
        promptTargetString: 'A',
        showingAllNotes: false,
      })
    ).toEqual({ kind: 'success' });
  });

  it('ignores when no prompt exists', () => {
    expect(
      buildStableMonophonicReactionPlan({
        trainingMode: 'random',
        detectedNote: 'E',
        hasCurrentPrompt: false,
        promptTargetNote: null,
        promptTargetString: null,
        showingAllNotes: false,
      })
    ).toEqual({ kind: 'ignore_no_prompt' });
  });

  it('returns mismatch plan and draw hint settings', () => {
    expect(
      buildStableMonophonicReactionPlan({
        trainingMode: 'random',
        detectedNote: 'D',
        hasCurrentPrompt: true,
        promptTargetNote: 'E',
        promptTargetString: 'A',
        showingAllNotes: false,
      })
    ).toEqual({
      kind: 'mismatch',
      shouldDrawTargetFretboard: true,
      targetNote: 'E',
      targetString: 'A',
      cooldownDelayMs: 1500,
    });

    expect(
      buildStableMonophonicReactionPlan({
        trainingMode: 'random',
        detectedNote: 'D',
        hasCurrentPrompt: true,
        promptTargetNote: 'E',
        promptTargetString: 'A',
        showingAllNotes: true,
      })
    ).toMatchObject({
      kind: 'mismatch',
      shouldDrawTargetFretboard: false,
    });
  });
});

describe('buildMidiPolyphonicReactionPlan', () => {
  it('ignores invalid/no-target states', () => {
    expect(
      buildMidiPolyphonicReactionPlan({
        hasPrompt: false,
        targetChordNotes: ['C', 'E', 'G'],
        eventKind: 'noteon',
        heldNoteNames: ['C'],
        matchesTargetChord: false,
      })
    ).toEqual({ kind: 'ignore' });

    expect(
      buildMidiPolyphonicReactionPlan({
        hasPrompt: true,
        targetChordNotes: [],
        eventKind: 'noteon',
        heldNoteNames: ['C'],
        matchesTargetChord: false,
      })
    ).toEqual({ kind: 'ignore' });
  });

  it('ignores all-notes-released noteoff', () => {
    expect(
      buildMidiPolyphonicReactionPlan({
        hasPrompt: true,
        targetChordNotes: ['C', 'E', 'G'],
        eventKind: 'noteoff',
        heldNoteNames: [],
        matchesTargetChord: false,
      })
    ).toEqual({ kind: 'ignore' });
  });

  it('returns success on chord match', () => {
    expect(
      buildMidiPolyphonicReactionPlan({
        hasPrompt: true,
        targetChordNotes: ['C', 'E', 'G'],
        eventKind: 'noteon',
        heldNoteNames: ['C', 'E', 'G'],
        matchesTargetChord: true,
      })
    ).toEqual({ kind: 'success' });
  });

  it('waits for more notes before mismatching', () => {
    expect(
      buildMidiPolyphonicReactionPlan({
        hasPrompt: true,
        targetChordNotes: ['C', 'E', 'G'],
        eventKind: 'noteon',
        heldNoteNames: ['C', 'E'],
        matchesTargetChord: false,
      })
    ).toEqual({ kind: 'wait_for_more_notes' });
  });

  it('returns mismatch once enough unique notes are held and chord is wrong', () => {
    expect(
      buildMidiPolyphonicReactionPlan({
        hasPrompt: true,
        targetChordNotes: ['C', 'E', 'G'],
        eventKind: 'noteon',
        heldNoteNames: ['C', 'D', 'G'],
        matchesTargetChord: false,
      })
    ).toEqual({ kind: 'mismatch', cooldownDelayMs: 1200 });
  });
});

describe('buildAudioPolyphonicReactionPlan', () => {
  it('returns success for stable match', () => {
    expect(
      buildAudioPolyphonicReactionPlan({
        isStableMatch: true,
        isStableMismatch: false,
        showingAllNotes: false,
      })
    ).toEqual({ kind: 'success' });
  });

  it('returns none when frame is not yet a stable outcome', () => {
    expect(
      buildAudioPolyphonicReactionPlan({
        isStableMatch: false,
        isStableMismatch: false,
        showingAllNotes: false,
      })
    ).toEqual({ kind: 'none' });
  });

  it('returns mismatch plan with draw hint rules', () => {
    expect(
      buildAudioPolyphonicReactionPlan({
        isStableMatch: false,
        isStableMismatch: true,
        showingAllNotes: false,
      })
    ).toEqual({
      kind: 'mismatch',
      cooldownDelayMs: 1500,
      shouldDrawFretboardHint: true,
    });

    expect(
      buildAudioPolyphonicReactionPlan({
        isStableMatch: false,
        isStableMismatch: true,
        showingAllNotes: true,
      })
    ).toEqual({
      kind: 'mismatch',
      cooldownDelayMs: 1500,
      shouldDrawFretboardHint: false,
    });
  });
});

describe('buildAudioMonophonicReactionPlan', () => {
  it('returns none when note is missing or not stable yet', () => {
    expect(
      buildAudioMonophonicReactionPlan({
        detectedNote: null,
        nextStableNoteCounter: 3,
        requiredStableFrames: 3,
      })
    ).toEqual({ kind: 'none' });

    expect(
      buildAudioMonophonicReactionPlan({
        detectedNote: 'E',
        nextStableNoteCounter: 2,
        requiredStableFrames: 3,
      })
    ).toEqual({ kind: 'none' });
  });

  it('returns stable_note when threshold is reached', () => {
    expect(
      buildAudioMonophonicReactionPlan({
        detectedNote: 'E',
        nextStableNoteCounter: 3,
        requiredStableFrames: 3,
      })
    ).toEqual({ kind: 'stable_note', detectedNote: 'E' });
  });
});

describe('buildCalibrationFrameReactionPlan', () => {
  it('returns ignore for rejected samples', () => {
    expect(
      buildCalibrationFrameReactionPlan({
        accepted: false,
        progressPercent: 0,
        isComplete: false,
      })
    ).toEqual({ kind: 'ignore' });
  });

  it('returns accepted plan with progress and completion flag', () => {
    expect(
      buildCalibrationFrameReactionPlan({
        accepted: true,
        progressPercent: 60,
        isComplete: false,
      })
    ).toEqual({
      kind: 'accept_sample',
      progressPercent: 60,
      shouldFinishCalibration: false,
    });

    expect(
      buildCalibrationFrameReactionPlan({
        accepted: true,
        progressPercent: 100,
        isComplete: true,
      })
    ).toEqual({
      kind: 'accept_sample',
      progressPercent: 100,
      shouldFinishCalibration: true,
    });
  });
});
