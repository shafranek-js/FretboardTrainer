import {
  detectMonophonicOctaveMismatch as detectMonophonicOctaveMismatchHelper,
  resolveWrongDetectedHighlight,
} from './detected-note-feedback';

type AppDom = typeof import('./dom').dom;
type AppState = typeof import('./state').state;

type OctaveMismatch = ReturnType<typeof import('./detected-note-feedback').detectMonophonicOctaveMismatch>;

interface DetectedNoteFeedbackRuntimeControllerDeps {
  dom: Pick<AppDom, 'trainingMode' | 'stringSelector'>;
  state: Pick<
    AppState,
    | 'wrongDetectedNote'
    | 'wrongDetectedString'
    | 'wrongDetectedFret'
    | 'currentInstrument'
    | 'inputSource'
    | 'relaxPerformanceOctaveCheck'
    | 'currentPrompt'
    | 'targetFrequency'
  >;
  getEnabledStrings: (selector: AppDom['stringSelector']) => Set<string>;
  redrawFretboard: () => void;
  freqToScientificNoteName: (frequency: number) => string | null;
  shouldIgnorePerformanceOctaveMismatch: typeof import('./performance-octave-policy').shouldIgnorePerformanceOctaveMismatch;
}

export function createDetectedNoteFeedbackRuntimeController(
  deps: DetectedNoteFeedbackRuntimeControllerDeps
) {
  function clearWrongDetectedHighlight(redraw = false) {
    const hadHighlight = deps.state.wrongDetectedNote !== null || deps.state.wrongDetectedString !== null;
    deps.state.wrongDetectedNote = null;
    deps.state.wrongDetectedString = null;
    deps.state.wrongDetectedFret = null;
    if (redraw && hadHighlight) {
      deps.redrawFretboard();
    }
  }

  function setWrongDetectedHighlight(detectedNote: string, detectedFrequency?: number | null) {
    const enabledStrings = deps.getEnabledStrings(deps.dom.stringSelector);
    const highlight = resolveWrongDetectedHighlight({
      detectedNote,
      detectedFrequency,
      enabledStrings,
      instrument: deps.state.currentInstrument,
      freqToScientificNoteName: deps.freqToScientificNoteName,
    });

    deps.state.wrongDetectedNote = highlight.wrongDetectedNote;
    deps.state.wrongDetectedString = highlight.wrongDetectedString;
    deps.state.wrongDetectedFret = highlight.wrongDetectedFret;
  }

  function detectMonophonicOctaveMismatch(
    detectedNote: string,
    detectedFrequency?: number | null
  ): OctaveMismatch {
    if (deps.dom.trainingMode.value === 'melody') {
      return null;
    }

    if (
      deps.shouldIgnorePerformanceOctaveMismatch({
        trainingMode: deps.dom.trainingMode.value,
        inputSource: deps.state.inputSource,
        relaxOctaveCheckEnabled: deps.state.relaxPerformanceOctaveCheck,
        promptTargetNote: deps.state.currentPrompt?.targetNote,
        detectedNote,
      })
    ) {
      return null;
    }

    return detectMonophonicOctaveMismatchHelper({
      prompt: deps.state.currentPrompt,
      targetFrequency: deps.state.targetFrequency,
      detectedNote,
      detectedFrequency,
      freqToScientificNoteName: deps.freqToScientificNoteName,
    });
  }

  return {
    clearWrongDetectedHighlight,
    setWrongDetectedHighlight,
    detectMonophonicOctaveMismatch,
  };
}
