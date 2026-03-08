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
      ? 'Live Note Finder detects the played pitch, not the exact string. The fretboard highlights playable positions for that note.'
      : mode === 'rhythm'
        ? 'Play on the Click grades timing against the metronome. Play any note on each beat and the app will show whether you were early or late.'
        : mode === 'practice'
          ? 'Practice keeps the melody moving continuously so you can drill the full phrase or song repeatedly before a final Perform run.'
        : mode === 'performance'
          ? 'Play Through keeps the melody moving continuously. Each note is graded inside its timing window without pausing the run.'
        : mode === 'melody'
          ? 'Study Melody advances one note at a time. The next note appears only after you play the correct note.'
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
