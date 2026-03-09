import { describe, expect, it, vi } from 'vitest';
import { createMelodyPlaybackControlsController } from './melody-playback-controls-controller';

type Listener = (event?: unknown) => void | Promise<void>;

function createButton() {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  } as unknown as HTMLButtonElement & { listeners: Record<string, Listener> };
}

function createDocumentStub() {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  } as unknown as Pick<Document, 'addEventListener'> & { listeners: Record<string, Listener> };
}

function createTarget(matches: string[] = []) {
  return {
    closest: (selector: string) => (matches.includes(selector) ? ({} as object) : null),
  };
}

function createDeps() {
  const dom = {
    melodyDemoBtn: createButton(),
    melodyPauseDemoBtn: createButton(),
    melodyStepBackBtn: createButton(),
    melodyStepForwardBtn: createButton(),
  };

  return {
    dom,
    state: { isListening: false },
    setPracticeSetupCollapsed: vi.fn(),
    startMelodyDemoPlayback: vi.fn(async () => {}),
    pauseMelodyDemoPlayback: vi.fn(),
    resumeMelodyDemoPlayback: vi.fn(async () => {}),
    stopMelodyDemoPlayback: vi.fn(),
    stepMelodyPreview: vi.fn(async () => {}),
    isPlaying: vi.fn(() => false),
    isPaused: vi.fn(() => false),
    canHandleHotkeys: vi.fn(() => true),
    getTrainingMode: vi.fn(() => 'melody'),
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'performance'),
    isTextEntryElement: vi.fn(() => false),
    isAnyBlockingModalOpen: vi.fn(() => false),
  };
}

describe('melody-playback-controls-controller', () => {
  it('starts playback from the main demo button when idle', async () => {
    const deps = createDeps();
    const controller = createMelodyPlaybackControlsController(deps);
    const doc = createDocumentStub();

    controller.register(doc);
    await deps.dom.melodyDemoBtn.listeners.click();

    expect(deps.setPracticeSetupCollapsed).toHaveBeenCalledWith(true);
    expect(deps.startMelodyDemoPlayback).toHaveBeenCalledTimes(1);
  });

  it('stops playback from the demo button when already active', async () => {
    const deps = createDeps();
    deps.isPlaying = vi.fn(() => true);
    const controller = createMelodyPlaybackControlsController(deps);

    controller.register(createDocumentStub());
    await deps.dom.melodyDemoBtn.listeners.click();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true, message: 'Melody playback stopped.' });
    expect(deps.startMelodyDemoPlayback).not.toHaveBeenCalled();
  });

  it('pauses and resumes playback through the pause button', async () => {
    const deps = createDeps();
    const controller = createMelodyPlaybackControlsController(deps);

    controller.register(createDocumentStub());
    deps.isPlaying = vi.fn(() => true);
    await deps.dom.melodyPauseDemoBtn.listeners.click();
    deps.isPlaying = vi.fn(() => false);
    deps.isPaused = vi.fn(() => true);
    await deps.dom.melodyPauseDemoBtn.listeners.click();

    expect(deps.pauseMelodyDemoPlayback).toHaveBeenCalledTimes(1);
    expect(deps.resumeMelodyDemoPlayback).toHaveBeenCalledTimes(1);
  });

  it('handles hotkeys for start, toggle pause, and stop', async () => {
    const deps = createDeps();
    const doc = createDocumentStub();
    const controller = createMelodyPlaybackControlsController(deps);

    controller.register(doc);
    const enterEvent = { key: 'Enter', code: 'Enter', target: null, preventDefault: vi.fn() };
    await doc.listeners.keydown(enterEvent);

    deps.isPlaying = vi.fn(() => true);
    const spaceEvent = { key: ' ', code: 'Space', target: null, preventDefault: vi.fn() };
    await doc.listeners.keydown(spaceEvent);

    const escapeEvent = { key: 'Escape', code: 'Escape', target: null, preventDefault: vi.fn() };
    await doc.listeners.keydown(escapeEvent);

    expect(deps.startMelodyDemoPlayback).toHaveBeenCalledTimes(1);
    expect(deps.pauseMelodyDemoPlayback).toHaveBeenCalledTimes(1);
    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true, message: 'Melody playback stopped.' });
  });

  it('toggles playback from background clicks only when allowed', async () => {
    const deps = createDeps();
    const doc = createDocumentStub();
    const controller = createMelodyPlaybackControlsController(deps);

    controller.register(doc);
    deps.isPlaying = vi.fn(() => true);
    await doc.listeners.click({ target: createTarget(['.app-shell, .compact-section, .fretboard-area, .session-area']) });

    deps.isPlaying = vi.fn(() => false);
    deps.isPaused = vi.fn(() => true);
    await doc.listeners.click({ target: createTarget(['.app-shell, .compact-section, .fretboard-area, .session-area']) });

    await doc.listeners.click({ target: createTarget(['button']) });

    expect(deps.pauseMelodyDemoPlayback).toHaveBeenCalledTimes(1);
    expect(deps.resumeMelodyDemoPlayback).toHaveBeenCalledTimes(1);
  });
});
