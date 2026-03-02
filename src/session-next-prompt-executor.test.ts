import { describe, expect, it, vi } from 'vitest';
import type { Prompt } from './types';
import { executeSessionNextPromptPlan } from './session-next-prompt-executor';

const prompt: Prompt = {
  displayText: 'Find: E',
  targetNote: 'E',
  targetString: 'A',
  targetChordNotes: [],
  targetChordFingering: [],
  baseChordName: null,
};

function createDeps() {
  return {
    requestSessionSummaryOnStop: vi.fn(),
    stopListening: vi.fn(),
    showError: vi.fn(),
    updateTuner: vi.fn(),
    setTunerVisible: vi.fn(),
    applyPrompt: vi.fn(),
  };
}

describe('executeSessionNextPromptPlan', () => {
  it('stops session and reports error when plan requests stop', () => {
    const deps = createDeps();

    const result = executeSessionNextPromptPlan(
      {
        shouldStopListening: true,
        stopReason: 'missing_mode',
        errorMessage: 'Selected training mode is not available.',
        tunerVisible: false,
        shouldResetTuner: false,
      },
      null,
      deps
    );

    expect(result).toBe('stopped');
    expect(deps.requestSessionSummaryOnStop).not.toHaveBeenCalled();
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.showError).toHaveBeenCalledWith('Selected training mode is not available.');
    expect(deps.setTunerVisible).not.toHaveBeenCalled();
  });

  it('applies non-fatal error, tuner reset, and returns no_prompt when prompt is missing', () => {
    const deps = createDeps();

    const result = executeSessionNextPromptPlan(
      {
        shouldStopListening: false,
        stopReason: null,
        errorMessage: 'Soft warning',
        tunerVisible: true,
        shouldResetTuner: true,
      },
      null,
      deps
    );

    expect(result).toBe('no_prompt');
    expect(deps.showError).toHaveBeenCalledWith('Soft warning');
    expect(deps.requestSessionSummaryOnStop).not.toHaveBeenCalled();
    expect(deps.updateTuner).toHaveBeenCalledWith(null);
    expect(deps.setTunerVisible).toHaveBeenCalledWith(true);
    expect(deps.applyPrompt).not.toHaveBeenCalled();
  });

  it('requests session summary when the prompt stream is exhausted', () => {
    const deps = createDeps();

    const result = executeSessionNextPromptPlan(
      {
        shouldStopListening: true,
        stopReason: 'missing_prompt',
        errorMessage: null,
        tunerVisible: true,
        shouldResetTuner: true,
      },
      null,
      deps
    );

    expect(result).toBe('stopped');
    expect(deps.requestSessionSummaryOnStop).toHaveBeenCalledTimes(1);
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
  });

  it('applies prompt when plan allows continuing', () => {
    const deps = createDeps();

    const result = executeSessionNextPromptPlan(
      {
        shouldStopListening: false,
        stopReason: null,
        errorMessage: null,
        tunerVisible: true,
        shouldResetTuner: false,
      },
      prompt,
      deps
    );

    expect(result).toBe('prompt_applied');
    expect(deps.requestSessionSummaryOnStop).not.toHaveBeenCalled();
    expect(deps.setTunerVisible).toHaveBeenCalledWith(true);
    expect(deps.applyPrompt).toHaveBeenCalledWith(prompt);
  });
});
