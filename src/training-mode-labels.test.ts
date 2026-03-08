import { describe, expect, it } from 'vitest';
import { getTrainingModeLabel } from './training-mode-labels';

describe('training-mode-labels', () => {
  it('returns task-language labels for primary modes', () => {
    expect(getTrainingModeLabel('random')).toBe('Find the Note');
    expect(getTrainingModeLabel('adaptive')).toBe('Practice Weak Spots');
    expect(getTrainingModeLabel('melody')).toBe('Study Melody');
    expect(getTrainingModeLabel('practice')).toBe('Practice');
    expect(getTrainingModeLabel('performance')).toBe('Play Through');
    expect(getTrainingModeLabel('rhythm')).toBe('Play on the Click');
  });

  it('falls back to the raw mode key when unknown', () => {
    expect(getTrainingModeLabel('custom-mode')).toBe('custom-mode');
  });
});
