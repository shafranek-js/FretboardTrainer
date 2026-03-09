import { describe, expect, it, vi } from 'vitest';
import { createMelodyImportControlsController } from './melody-import-controls-controller';

type Listener = (event?: { target?: unknown }) => void;

function createButton(textContent = '') {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    textContent,
    disabled: false,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
    click: vi.fn(),
  } as unknown as HTMLButtonElement & { listeners: Record<string, Listener>; click: ReturnType<typeof vi.fn> };
}

function createInput(value = '') {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    value,
    files: null as FileList | null,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
    click: vi.fn(),
  } as unknown as HTMLInputElement & { listeners: Record<string, Listener>; click: ReturnType<typeof vi.fn> };
}

function createElement() {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  } as unknown as HTMLElement & { listeners: Record<string, Listener> };
}

function createDeps() {
  const dom = {
    closeMelodyImportBtn: createButton(),
    cancelMelodyImportBtn: createButton(),
    melodyImportModal: createElement(),
    melodyAsciiTabInput: createInput(),
    melodyNameInput: createInput(),
    openMelodyImportBtn: createButton(),
    editMelodyBtn: createButton(),
    importMelodyGpBtn: createButton('Import GP...'),
    importMelodyMidiBtn: createButton('Import MIDI/MSCZ...'),
    melodyGpFileInput: createInput(),
    melodyMidiFileInput: createInput(),
    melodyMidiTrackSelector: createInput() as unknown as HTMLSelectElement & { listeners: Record<string, Listener> },
    melodyMidiQuantize: createInput() as unknown as HTMLSelectElement & { listeners: Record<string, Listener> },
    saveMelodyMidiTrackBtn: createButton(),
    melodyGpTrackSelector: createInput() as unknown as HTMLSelectElement & { listeners: Record<string, Listener> },
    saveMelodyGpTrackBtn: createButton(),
    importMelodyBtn: createButton(),
  };

  const deps = {
    dom,
    stopMelodyDemoPlayback: vi.fn(),
    resetMelodyGpFileInput: vi.fn(),
    resetMelodyMidiFileInput: vi.fn(),
    melodyImportModalController: {
      open: vi.fn(() => true),
      close: vi.fn(),
    },
    melodyImportPreviewController: {
      schedulePreviewUpdate: vi.fn(),
      updatePreview: vi.fn(),
      loadGpImportDraftFromFile: vi.fn(async () => {}),
      loadMidiImportDraftFromFile: vi.fn(async () => {}),
      refreshMidiTrackPreviewFromSelection: vi.fn(),
      hasPendingMidiImport: vi.fn(() => true),
      refreshGpTrackPreviewFromSelection: vi.fn(),
    },
    savePendingMidiImportedTrack: vi.fn(),
    savePendingGpImportedTrack: vi.fn(),
    saveFromModal: vi.fn(),
    setResultMessage: vi.fn(),
    renderMelodyEditorPreviewError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
    showNonBlockingError: vi.fn(),
  };

  return { deps, dom };
}

describe('melody-import-controls-controller', () => {
  it('closes the modal from close, cancel, and backdrop clicks', () => {
    const { deps, dom } = createDeps();
    const controller = createMelodyImportControlsController(deps);

    controller.register();
    dom.closeMelodyImportBtn.listeners.click();
    dom.cancelMelodyImportBtn.listeners.click();
    dom.melodyImportModal.listeners.click({ target: dom.melodyImportModal });

    expect(deps.resetMelodyGpFileInput).toHaveBeenCalledTimes(3);
    expect(deps.resetMelodyMidiFileInput).toHaveBeenCalledTimes(3);
    expect(deps.melodyImportModalController.close).toHaveBeenCalledTimes(3);
  });

  it('wires preview inputs and open/edit modal actions', () => {
    const { deps, dom } = createDeps();
    const controller = createMelodyImportControlsController(deps);

    controller.register();
    dom.melodyAsciiTabInput.listeners.input();
    dom.melodyNameInput.value = 'Romanza';
    dom.melodyNameInput.listeners.input();
    dom.openMelodyImportBtn.listeners.click();
    dom.editMelodyBtn.listeners.click();

    expect(deps.melodyImportPreviewController.schedulePreviewUpdate).toHaveBeenCalledTimes(1);
    expect(deps.melodyImportPreviewController.updatePreview).toHaveBeenCalledTimes(1);
    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.melodyImportModalController.open).toHaveBeenNthCalledWith(1, { mode: 'create' });
    expect(deps.melodyImportModalController.open).toHaveBeenNthCalledWith(2, { mode: 'edit-custom' });
  });

  it('loads a gp import draft and restores button state', async () => {
    const { deps, dom } = createDeps();
    const controller = createMelodyImportControlsController(deps);
    dom.melodyGpFileInput.files = [new File(['gp'], 'demo.gp5')] as unknown as FileList;

    controller.register();
    dom.melodyGpFileInput.listeners.change();
    await Promise.resolve();
    await Promise.resolve();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.melodyImportPreviewController.loadGpImportDraftFromFile).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'GP file parsed. Review the preview, choose a track, then save.',
      'success'
    );
    expect(dom.importMelodyGpBtn.disabled).toBe(false);
    expect(dom.importMelodyGpBtn.textContent).toBe('Import GP...');
    expect(deps.resetMelodyGpFileInput).toHaveBeenCalledTimes(1);
  });

  it('labels museScore imports correctly', async () => {
    const { deps, dom } = createDeps();
    const controller = createMelodyImportControlsController(deps);
    dom.melodyMidiFileInput.files = [new File(['mscz'], 'score.mscz')] as unknown as FileList;

    controller.register();
    dom.melodyMidiFileInput.listeners.change();
    await Promise.resolve();
    await Promise.resolve();

    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'MuseScore file parsed. Review the preview, choose a track, then save.',
      'success'
    );
    expect(deps.resetMelodyMidiFileInput).toHaveBeenCalledTimes(1);
  });

  it('saves preview selections and modal ascii imports through delegated actions', () => {
    const { deps, dom } = createDeps();
    const controller = createMelodyImportControlsController(deps);

    controller.register();
    dom.saveMelodyMidiTrackBtn.listeners.click();
    dom.saveMelodyGpTrackBtn.listeners.click();
    dom.importMelodyBtn.listeners.click();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledTimes(3);
    expect(deps.savePendingMidiImportedTrack).toHaveBeenCalledTimes(1);
    expect(deps.savePendingGpImportedTrack).toHaveBeenCalledTimes(1);
    expect(deps.saveFromModal).toHaveBeenCalledTimes(1);
  });
});
