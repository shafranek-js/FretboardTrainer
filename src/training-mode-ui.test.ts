import { describe, expect, it } from 'vitest';
import { getTrainingModeUiVisibility } from './training-mode-ui';

describe('getTrainingModeUiVisibility', () => {
  it('shows scale selector for scales mode', () => {
    expect(getTrainingModeUiVisibility('scales')).toEqual({
      showMelodySelector: false,
      showScaleSelector: true,
      showChordSelector: false,
      showProgressionSelector: false,
      showArpeggioPatternSelector: false,
      showHintButton: true,
      helperText: '',
    });
  });

  it('shows chord and arpeggio selectors for arpeggio mode', () => {
    expect(getTrainingModeUiVisibility('arpeggios')).toEqual({
      showMelodySelector: false,
      showScaleSelector: false,
      showChordSelector: true,
      showProgressionSelector: false,
      showArpeggioPatternSelector: true,
      showHintButton: false,
      helperText: '',
    });
  });

  it('shows progression selector and hides hint for progressions mode', () => {
    expect(getTrainingModeUiVisibility('progressions')).toEqual({
      showMelodySelector: false,
      showScaleSelector: false,
      showChordSelector: false,
      showProgressionSelector: true,
      showArpeggioPatternSelector: false,
      showHintButton: false,
      helperText: '',
    });
  });

  it('hides advanced selectors for random mode', () => {
    expect(getTrainingModeUiVisibility('random')).toEqual({
      showMelodySelector: false,
      showScaleSelector: false,
      showChordSelector: false,
      showProgressionSelector: false,
      showArpeggioPatternSelector: false,
      showHintButton: true,
      helperText: '',
    });
  });

  it('hides hint button for timed mode', () => {
    expect(getTrainingModeUiVisibility('timed').showHintButton).toBe(false);
  });

  it('hides hint button for free mode', () => {
    expect(getTrainingModeUiVisibility('free').showHintButton).toBe(false);
  });

  it('shows explanatory helper text for free mode', () => {
    expect(getTrainingModeUiVisibility('free').helperText).toContain('detects pitch');
  });

  it('shows explanatory helper text and hides hint for rhythm mode', () => {
    const visibility = getTrainingModeUiVisibility('rhythm');
    expect(visibility.showHintButton).toBe(false);
    expect(visibility.helperText).toContain('timing against the click');
  });

  it('shows melody selector and helper text for melody mode', () => {
    const visibility = getTrainingModeUiVisibility('melody');
    expect(visibility.showMelodySelector).toBe(true);
    expect(visibility.showHintButton).toBe(true);
    expect(visibility.helperText).toContain('advances one note at a time');
  });
});
