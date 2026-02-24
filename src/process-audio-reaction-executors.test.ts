import { describe, expect, it, vi } from 'vitest';
import {
  executeAudioMonophonicReaction,
  executeAudioPolyphonicReaction,
  executeCalibrationFrameReaction,
} from './process-audio-reaction-executors';

describe('executeAudioPolyphonicReaction', () => {
  it('does nothing for none', () => {
    const onSuccess = vi.fn();
    executeAudioPolyphonicReaction({
      reactionPlan: { kind: 'none' },
      detectedNotesText: '',
      onSuccess,
      onMismatchRecordAttempt: vi.fn(),
      setResultMessage: vi.fn(),
      drawHintFretboard: vi.fn(),
      scheduleCooldownRedraw: vi.fn(),
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('runs success callback for success plan', () => {
    const onSuccess = vi.fn();
    executeAudioPolyphonicReaction({
      reactionPlan: { kind: 'success' },
      detectedNotesText: 'C,E,G',
      onSuccess,
      onMismatchRecordAttempt: vi.fn(),
      setResultMessage: vi.fn(),
      drawHintFretboard: vi.fn(),
      scheduleCooldownRedraw: vi.fn(),
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('handles mismatch with optional hint draw', () => {
    const onMismatchRecordAttempt = vi.fn();
    const setResultMessage = vi.fn();
    const drawHintFretboard = vi.fn();
    const scheduleCooldownRedraw = vi.fn();

    executeAudioPolyphonicReaction({
      reactionPlan: { kind: 'mismatch', cooldownDelayMs: 1500, shouldDrawFretboardHint: true },
      detectedNotesText: 'C,D,G',
      onSuccess: vi.fn(),
      onMismatchRecordAttempt,
      setResultMessage,
      drawHintFretboard,
      scheduleCooldownRedraw,
    });

    expect(onMismatchRecordAttempt).toHaveBeenCalledTimes(1);
    expect(setResultMessage).toHaveBeenCalledWith('Heard: C,D,G [wrong]', 'error');
    expect(drawHintFretboard).toHaveBeenCalledTimes(1);
    expect(scheduleCooldownRedraw).toHaveBeenCalledWith(1500);
  });
});

describe('executeCalibrationFrameReaction', () => {
  it('ignores non-accepted reactions', () => {
    const pushCalibrationFrequency = vi.fn();
    executeCalibrationFrameReaction({
      reactionPlan: { kind: 'ignore' },
      acceptedFrequency: 440,
      pushCalibrationFrequency,
      setCalibrationProgress: vi.fn(),
      finishCalibration: vi.fn(),
    });
    expect(pushCalibrationFrequency).not.toHaveBeenCalled();
  });

  it('applies accepted sample and finishes when requested', () => {
    const pushCalibrationFrequency = vi.fn();
    const setCalibrationProgress = vi.fn();
    const finishCalibration = vi.fn();

    executeCalibrationFrameReaction({
      reactionPlan: {
        kind: 'accept_sample',
        progressPercent: 100,
        shouldFinishCalibration: true,
      },
      acceptedFrequency: 441,
      pushCalibrationFrequency,
      setCalibrationProgress,
      finishCalibration,
    });

    expect(pushCalibrationFrequency).toHaveBeenCalledWith(441);
    expect(setCalibrationProgress).toHaveBeenCalledWith(100);
    expect(finishCalibration).toHaveBeenCalledTimes(1);
  });
});

describe('executeAudioMonophonicReaction', () => {
  it('forwards stable notes only', () => {
    const onStableDetectedNote = vi.fn();
    executeAudioMonophonicReaction({
      reactionPlan: { kind: 'none' },
      onStableDetectedNote,
    });
    executeAudioMonophonicReaction({
      reactionPlan: { kind: 'stable_note', detectedNote: 'E' },
      onStableDetectedNote,
    });
    expect(onStableDetectedNote).toHaveBeenCalledTimes(1);
    expect(onStableDetectedNote).toHaveBeenCalledWith('E');
  });
});
