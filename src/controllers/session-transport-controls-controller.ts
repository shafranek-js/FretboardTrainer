interface SessionTransportControlsDom {
  sessionToggleBtn: HTMLButtonElement;
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  editMelodyBtn: HTMLButtonElement;
  openMelodyImportBtn: HTMLButtonElement;
  playSoundBtn: HTMLButtonElement;
  hintBtn: HTMLButtonElement;
}

interface SessionTransportControlsState {
  isListening: boolean;
  uiWorkflow: string;
  currentPrompt: {
    targetMelodyEventNotes?: unknown[] | null;
    targetNote?: string | null;
    targetString?: string | null;
  } | null;
  cooldown: boolean;
}

export interface SessionTransportControlsControllerDeps {
  dom: SessionTransportControlsDom;
  state: SessionTransportControlsState;
  isMelodyDemoActive: () => boolean;
  stopMelodyDemoPlayback: (options: { clearUi: boolean; message?: string }) => void;
  applyUiWorkflow: (workflow: 'editor') => void;
  saveSettings: () => void;
  getSelectedMelodyId: () => string | null;
  stopListening: () => void;
  startSessionFromUi: () => Promise<void>;
  buildPromptAudioPlan: () => { notesToPlay: unknown[] };
  playSound: (notes: unknown[] | unknown) => void;
  clearResultMessage: () => void;
  drawHintFretboard: (options: {
    noteToShow: string | null;
    stringToShow: string | null;
    melodyNotes?: unknown[];
  }) => void;
  scheduleHintReset: (label: string) => void;
  findPlayableStringForNote: (note: string) => string | null;
  setResultMessage: (message: string, tone?: 'success' | 'error') => void;
}

export function createSessionTransportControlsController(deps: SessionTransportControlsControllerDeps) {
  function handlePlaySound() {
    const prompt = deps.state.currentPrompt;
    if (!prompt) return;

    const audioPlan = deps.buildPromptAudioPlan();
    if (audioPlan.notesToPlay.length === 1) {
      deps.playSound(audioPlan.notesToPlay[0]);
    } else if (audioPlan.notesToPlay.length > 1) {
      deps.playSound(audioPlan.notesToPlay);
    }
  }

  function handleHint() {
    const prompt = deps.state.currentPrompt;
    if (!prompt) return;

    deps.clearResultMessage();

    if ((prompt.targetMelodyEventNotes?.length ?? 0) >= 1) {
      deps.drawHintFretboard({
        noteToShow: null,
        stringToShow: null,
        melodyNotes: prompt.targetMelodyEventNotes ?? [],
      });
      deps.state.cooldown = true;
      deps.scheduleHintReset('melody poly hint cooldown redraw');
      return;
    }

    if (!prompt.targetNote) return;

    const noteToShow = prompt.targetNote;
    const stringToShow = prompt.targetString || deps.findPlayableStringForNote(noteToShow);

    if (stringToShow) {
      deps.drawHintFretboard({ noteToShow, stringToShow });
      deps.state.cooldown = true;
      deps.scheduleHintReset('hint cooldown redraw');
      return;
    }

    deps.setResultMessage(`Hint: The answer is ${noteToShow}`);
  }

  function register() {
    deps.dom.sessionToggleBtn.addEventListener('click', async () => {
      if (deps.isMelodyDemoActive()) {
        deps.stopMelodyDemoPlayback({ clearUi: true, message: 'Melody playback stopped.' });
        if (
          !deps.state.isListening &&
          (deps.state.uiWorkflow === 'study-melody' ||
            deps.state.uiWorkflow === 'practice' ||
            deps.state.uiWorkflow === 'perform')
        ) {
          await deps.startSessionFromUi();
        }
        return;
      }
      if (!deps.state.isListening && deps.state.uiWorkflow === 'library') {
        deps.stopMelodyDemoPlayback({ clearUi: true });
        deps.applyUiWorkflow('editor');
        deps.saveSettings();
        if (deps.getSelectedMelodyId()) {
          deps.dom.editMelodyBtn.click();
        } else {
          deps.dom.openMelodyImportBtn.click();
        }
        return;
      }
      if (!deps.state.isListening && deps.state.uiWorkflow === 'editor') {
        deps.dom.openMelodyImportBtn.click();
        return;
      }
      if (deps.state.isListening) {
        deps.stopListening();
        return;
      }

      await deps.startSessionFromUi();
    });

    deps.dom.startBtn.addEventListener('click', async () => {
      deps.stopMelodyDemoPlayback({ clearUi: true });
      await deps.startSessionFromUi();
    });

    deps.dom.stopBtn.addEventListener('click', () => {
      deps.stopListening();
    });

    deps.dom.playSoundBtn.addEventListener('click', () => {
      handlePlaySound();
    });

    deps.dom.hintBtn.addEventListener('click', () => {
      handleHint();
    });
  }

  return {
    register,
  };
}

