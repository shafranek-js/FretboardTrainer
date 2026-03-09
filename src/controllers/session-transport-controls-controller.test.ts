import { describe, expect, it, vi } from 'vitest';
import { createSessionTransportControlsController } from './session-transport-controls-controller';

type Listener = () => void | Promise<void>;

type MockControl = {
  listeners: Record<string, Listener>;
  click: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

function createControl(): MockControl {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    click: vi.fn(),
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  };
}

function createDeps() {
  return {
    dom: {
      sessionToggleBtn: createControl(),
      startBtn: createControl(),
      stopBtn: createControl(),
      editMelodyBtn: createControl(),
      openMelodyImportBtn: createControl(),
      playSoundBtn: createControl(),
      hintBtn: createControl(),
    },
    state: {
      isListening: false,
      uiWorkflow: 'library',
      currentPrompt: {
        targetMelodyEventNotes: null,
        targetNote: 'C4',
        targetString: null,
      },
      cooldown: false,
    },
    isMelodyDemoActive: vi.fn(() => false),
    stopMelodyDemoPlayback: vi.fn(),
    applyUiWorkflow: vi.fn(),
    saveSettings: vi.fn(),
    getSelectedMelodyId: vi.fn(() => 'melody-1'),
    stopListening: vi.fn(),
    startSessionFromUi: vi.fn(async () => {}),
    buildPromptAudioPlan: vi.fn(() => ({ notesToPlay: ['C4'] })),
    playSound: vi.fn(),
    clearResultMessage: vi.fn(),
    drawHintFretboard: vi.fn(),
    scheduleHintReset: vi.fn(),
    findPlayableStringForNote: vi.fn(() => 'E'),
    setResultMessage: vi.fn(),
  };
}

describe('session-transport-controls-controller', () => {
  it('routes library toggle clicks into editor workflow actions', async () => {
    const deps = createDeps();
    const controller = createSessionTransportControlsController(deps as never);

    controller.register();
    await deps.dom.sessionToggleBtn.listeners.click();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.applyUiWorkflow).toHaveBeenCalledWith('editor');
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.dom.editMelodyBtn.click).toHaveBeenCalledTimes(1);
  });


  it('stops preview and starts a study session in the same click', async () => {
    const deps = createDeps();
    deps.state.uiWorkflow = 'study-melody';
    deps.isMelodyDemoActive.mockReturnValue(true);
    const controller = createSessionTransportControlsController(deps as never);

    controller.register();
    await deps.dom.sessionToggleBtn.listeners.click();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({
      clearUi: true,
      message: 'Melody playback stopped.',
    });
    expect(deps.startSessionFromUi).toHaveBeenCalledTimes(1);
  });
  it('starts and stops the session through the shared handlers', async () => {
    const deps = createDeps();
    const controller = createSessionTransportControlsController(deps as never);

    controller.register();
    await deps.dom.startBtn.listeners.click();
    deps.state.isListening = true;
    await deps.dom.sessionToggleBtn.listeners.click();
    deps.dom.stopBtn.listeners.click();

    expect(deps.startSessionFromUi).toHaveBeenCalledTimes(1);
    expect(deps.stopListening).toHaveBeenCalledTimes(2);
  });

  it('plays prompt audio from the computed plan', () => {
    const deps = createDeps();
    const controller = createSessionTransportControlsController(deps as never);

    controller.register();
    deps.dom.playSoundBtn.listeners.click();

    expect(deps.buildPromptAudioPlan).toHaveBeenCalledTimes(1);
    expect(deps.playSound).toHaveBeenCalledWith('C4');
  });

  it('renders melody-note hints and schedules a reset', () => {
    const deps = createDeps();
    deps.state.currentPrompt = {
      targetMelodyEventNotes: [{ note: 'C4' }],
      targetNote: null,
      targetString: null,
    };
    const controller = createSessionTransportControlsController(deps as never);

    controller.register();
    deps.dom.hintBtn.listeners.click();

    expect(deps.clearResultMessage).toHaveBeenCalledTimes(1);
    expect(deps.drawHintFretboard).toHaveBeenCalledWith({
      noteToShow: null,
      stringToShow: null,
      melodyNotes: [{ note: 'C4' }],
    });
    expect(deps.state.cooldown).toBe(true);
    expect(deps.scheduleHintReset).toHaveBeenCalledWith('melody poly hint cooldown redraw');
  });

  it('renders single-note hints or falls back to a message', () => {
    const deps = createDeps();
    const controller = createSessionTransportControlsController(deps as never);

    controller.register();
    deps.dom.hintBtn.listeners.click();
    deps.findPlayableStringForNote.mockReturnValueOnce(null);
    deps.state.currentPrompt = {
      targetMelodyEventNotes: null,
      targetNote: 'D4',
      targetString: null,
    };
    deps.dom.hintBtn.listeners.click();

    expect(deps.drawHintFretboard).toHaveBeenCalledWith({ noteToShow: 'C4', stringToShow: 'E' });
    expect(deps.scheduleHintReset).toHaveBeenCalledWith('hint cooldown redraw');
    expect(deps.setResultMessage).toHaveBeenCalledWith('Hint: The answer is D4');
  });
});

