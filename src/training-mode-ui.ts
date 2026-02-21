import { isHintDisabledMode } from './training-mode-groups';

export interface TrainingModeUiVisibility {
  showScaleSelector: boolean;
  showChordSelector: boolean;
  showProgressionSelector: boolean;
  showArpeggioPatternSelector: boolean;
  showHintButton: boolean;
}

export function getTrainingModeUiVisibility(mode: string): TrainingModeUiVisibility {
  return {
    showScaleSelector: mode === 'scales',
    showChordSelector: mode === 'chords' || mode === 'arpeggios',
    showProgressionSelector: mode === 'progressions',
    showArpeggioPatternSelector: mode === 'arpeggios',
    showHintButton: !isHintDisabledMode(mode),
  };
}
