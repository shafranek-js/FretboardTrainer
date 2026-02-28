import { isHintDisabledMode, isMelodyWorkflowMode } from './training-mode-groups';

export interface TrainingModeUiVisibility {
  showMelodySelector: boolean;
  showScaleSelector: boolean;
  showChordSelector: boolean;
  showProgressionSelector: boolean;
  showArpeggioPatternSelector: boolean;
  showHintButton: boolean;
  showFretboardMonitoring: boolean;
  helperText: string;
}

export function getTrainingModeUiVisibility(mode: string): TrainingModeUiVisibility {
  const helperText =
    mode === 'free'
      ? 'Live Note Finder detects pitch (note name), not the exact string. The fretboard highlights all possible positions for the played note.'
      : mode === 'rhythm'
        ? 'Rhythm mode grades timing against the click. Play any note on each click; the app shows early/late timing in milliseconds.'
        : mode === 'performance'
          ? 'Performance mode plays through the selected melody continuously. Each event is graded inside its timing window without pausing the run.'
        : mode === 'melody'
          ? 'Melody mode advances one note at a time. The next note appears only after you play the correct note.'
        : '';

  return {
    showMelodySelector: isMelodyWorkflowMode(mode),
    showScaleSelector: mode === 'scales',
    showChordSelector: mode === 'chords' || mode === 'arpeggios',
    showProgressionSelector: mode === 'progressions',
    showArpeggioPatternSelector: mode === 'arpeggios',
    showHintButton: !isMelodyWorkflowMode(mode) && !isHintDisabledMode(mode),
    showFretboardMonitoring: !isMelodyWorkflowMode(mode),
    helperText,
  };
}
