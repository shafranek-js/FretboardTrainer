import { dom, state } from '../state';
import { saveSettings } from '../storage';
import { handleModeChange, redrawFretboard, updateInstrumentUI, drawFretboard } from '../ui';
import { playSound, loadInstrumentSoundfont } from '../audio';
import { scheduleSessionTimeout, startListening, stopListening } from '../logic';
import { instruments } from '../instruments';
import { clearResultMessage, setResultMessage } from '../ui-signals';
import { getEnabledStrings } from '../fretboard-ui-state';
import { buildPromptAudioPlan } from '../prompt-audio-plan';

function findPlayableStringForNote(note: string): string | null {
  const instrumentData = state.currentInstrument;
  const enabledStrings = getEnabledStrings(dom.stringSelector);

  for (const stringName of instrumentData.STRING_ORDER) {
    if (!enabledStrings.has(stringName)) continue;
    const fret =
      instrumentData.FRETBOARD[stringName as keyof typeof instrumentData.FRETBOARD][
        note as keyof typeof instrumentData.FRETBOARD.e
      ];
    if (typeof fret === 'number') {
      return stringName;
    }
  }

  return null;
}

export function registerSessionControls() {
  // --- Main Session Controls ---
  dom.startBtn.addEventListener('click', async () => {
    if (await startListening()) {
      // Further logic is handled within startListening/nextPrompt
    }
  });

  dom.stopBtn.addEventListener('click', () => {
    stopListening();
  });

  // --- Top Control Bar Listeners ---
  dom.instrumentSelector.addEventListener('change', async () => {
    state.currentInstrument = instruments[dom.instrumentSelector.value];
    updateInstrumentUI(); // Redraw strings, fretboard, etc.
    await loadInstrumentSoundfont(state.currentInstrument.name);
    saveSettings();
  });

  dom.showAllNotes.addEventListener('change', (e) => {
    state.showingAllNotes = (e.target as HTMLInputElement).checked;
    saveSettings();
    redrawFretboard();
  });

  dom.trainingMode.addEventListener('change', () => {
    handleModeChange();
    saveSettings();
  });

  dom.startFret.addEventListener('input', () => {
    saveSettings();
    redrawFretboard();
  });
  dom.endFret.addEventListener('input', () => {
    saveSettings();
    redrawFretboard();
  });
  dom.difficulty.addEventListener('change', saveSettings);
  dom.scaleSelector.addEventListener('change', saveSettings);
  dom.chordSelector.addEventListener('change', saveSettings);
  dom.randomizeChords.addEventListener('change', saveSettings);
  dom.progressionSelector.addEventListener('change', saveSettings);
  dom.arpeggioPatternSelector.addEventListener('change', saveSettings);
  // String selector listeners are added dynamically in updateInstrumentUI.

  dom.playSoundBtn.addEventListener('click', () => {
    const prompt = state.currentPrompt;
    if (!prompt) return;

    const audioPlan = buildPromptAudioPlan({
      prompt,
      trainingMode: dom.trainingMode.value,
      instrument: state.currentInstrument,
      calibratedA4: state.calibratedA4,
      enabledStrings: getEnabledStrings(dom.stringSelector),
    });

    if (audioPlan.notesToPlay.length === 1) {
      playSound(audioPlan.notesToPlay[0]);
    } else if (audioPlan.notesToPlay.length > 1) {
      playSound(audioPlan.notesToPlay);
    }
  });

  dom.hintBtn.addEventListener('click', () => {
    const prompt = state.currentPrompt;
    if (!prompt || !prompt.targetNote) return;

    clearResultMessage();

    const noteToShow = prompt.targetNote;
    const stringToShow = prompt.targetString || findPlayableStringForNote(noteToShow);

    if (stringToShow) {
      drawFretboard(false, noteToShow, stringToShow);
      state.cooldown = true;
      scheduleSessionTimeout(
        2000,
        () => {
          redrawFretboard();
          state.cooldown = false;
        },
        'hint cooldown redraw'
      );
    } else {
      setResultMessage(`Hint: The answer is ${noteToShow}`);
    }
  });
}
