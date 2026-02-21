import { describe, expect, it } from 'vitest';
import { getTrainingModeUiVisibility } from './training-mode-ui';

describe('getTrainingModeUiVisibility', () => {
  it('shows scale selector for scales mode', () => {
    expect(getTrainingModeUiVisibility('scales')).toEqual({
      showScaleSelector: true,
      showChordSelector: false,
      showProgressionSelector: false,
      showArpeggioPatternSelector: false,
      showHintButton: true,
    });
  });

  it('shows chord and arpeggio selectors for arpeggio mode', () => {
    expect(getTrainingModeUiVisibility('arpeggios')).toEqual({
      showScaleSelector: false,
      showChordSelector: true,
      showProgressionSelector: false,
      showArpeggioPatternSelector: true,
      showHintButton: false,
    });
  });

  it('shows progression selector and hides hint for progressions mode', () => {
    expect(getTrainingModeUiVisibility('progressions')).toEqual({
      showScaleSelector: false,
      showChordSelector: false,
      showProgressionSelector: true,
      showArpeggioPatternSelector: false,
      showHintButton: false,
    });
  });

  it('hides advanced selectors for random mode', () => {
    expect(getTrainingModeUiVisibility('random')).toEqual({
      showScaleSelector: false,
      showChordSelector: false,
      showProgressionSelector: false,
      showArpeggioPatternSelector: false,
      showHintButton: true,
    });
  });

  it('hides hint button for timed mode', () => {
    expect(getTrainingModeUiVisibility('timed').showHintButton).toBe(false);
  });
});
