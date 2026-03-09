import { describe, expect, it, vi } from 'vitest';
import { createMelodyLibraryControlsController } from './melody-library-controls-controller';

type Listener = () => void | Promise<void>;

function createButton() {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  } as unknown as HTMLButtonElement & { listeners: Record<string, Listener> };
}

function createDeps() {
  const dom = {
    exportMelodyMidiBtn: createButton(),
    bakePracticeMelodyBtn: createButton(),
    deleteMelodyBtn: createButton(),
  };
  return {
    dom,
    state: { isListening: false },
    stopMelodyDemoPlayback: vi.fn(),
    stopListening: vi.fn(),
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'performance'),
    getTrainingMode: vi.fn(() => 'melody'),
    exportSelectedMelodyAsMidi: vi.fn(async () => {}),
    bakeSelectedPracticeAdjustedMelodyAsCustom: vi.fn(),
    getSelectedMelodyId: vi.fn(() => 'custom:1'),
    isCustomMelodyId: vi.fn((melodyId: string | null) => melodyId?.startsWith('custom:') ?? false),
    confirmUserAction: vi.fn(async () => true),
    deleteCustomMelody: vi.fn(() => true),
    refreshMelodyOptionsForCurrentInstrument: vi.fn(),
    markCurriculumPresetAsCustom: vi.fn(),
    updatePracticeSetupSummary: vi.fn(),
    saveSettings: vi.fn(),
    setResultMessage: vi.fn(),
    showNonBlockingError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
  };
}

describe('melody-library-controls-controller', () => {
  it('exports midi and stops active melody workflow session first', async () => {
    const deps = createDeps();
    deps.state.isListening = true;
    const controller = createMelodyLibraryControlsController(deps);

    controller.register();
    await deps.dom.exportMelodyMidiBtn.listeners.click();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.exportSelectedMelodyAsMidi).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith('MIDI file exported.', 'success');
  });

  it('bakes adjusted melody and reports failures through non-blocking errors', () => {
    const deps = createDeps();
    deps.bakeSelectedPracticeAdjustedMelodyAsCustom = vi.fn(() => {
      throw new Error('boom');
    });
    const controller = createMelodyLibraryControlsController(deps);

    controller.register();
    deps.dom.bakePracticeMelodyBtn.listeners.click();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.showNonBlockingError).toHaveBeenCalledWith('Failed to bake adjusted melody');
  });

  it('deletes a confirmed custom melody and refreshes dependent ui', async () => {
    const deps = createDeps();
    const controller = createMelodyLibraryControlsController(deps);

    controller.register();
    await deps.dom.deleteMelodyBtn.listeners.click();

    expect(deps.confirmUserAction).toHaveBeenCalledWith('Delete selected custom melody from the local library?');
    expect(deps.deleteCustomMelody).toHaveBeenCalledWith('custom:1');
    expect(deps.refreshMelodyOptionsForCurrentInstrument).toHaveBeenCalledTimes(1);
    expect(deps.markCurriculumPresetAsCustom).toHaveBeenCalledTimes(1);
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith('Custom melody deleted.');
  });

  it('ignores delete when the selected melody is not custom', async () => {
    const deps = createDeps();
    deps.getSelectedMelodyId = vi.fn(() => 'builtin:1');
    const controller = createMelodyLibraryControlsController(deps);

    controller.register();
    await deps.dom.deleteMelodyBtn.listeners.click();

    expect(deps.confirmUserAction).not.toHaveBeenCalled();
    expect(deps.deleteCustomMelody).not.toHaveBeenCalled();
  });
});
