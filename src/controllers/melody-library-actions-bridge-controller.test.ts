import { describe, expect, it, vi } from 'vitest';
import { createMelodyLibraryActionsBridgeController } from './melody-library-actions-bridge-controller';

describe('melody-library-actions-bridge-controller', () => {
  it('delegates import save and library action flows', async () => {
    const deps = {
      savePendingMidiImportedTrack: vi.fn(),
      savePendingGpImportedTrack: vi.fn(),
      saveFromModal: vi.fn(),
      exportSelectedMelodyAsMidi: vi.fn(async () => {}),
      bakeSelectedPracticeAdjustedMelodyAsCustom: vi.fn(),
    };

    const controller = createMelodyLibraryActionsBridgeController(deps);

    controller.savePendingMidiImportedTrack();
    controller.savePendingGpImportedTrack();
    controller.saveFromModal();
    await controller.exportSelectedMelodyAsMidi();
    controller.bakeSelectedPracticeAdjustedMelodyAsCustom();

    expect(deps.savePendingMidiImportedTrack).toHaveBeenCalledTimes(1);
    expect(deps.savePendingGpImportedTrack).toHaveBeenCalledTimes(1);
    expect(deps.saveFromModal).toHaveBeenCalledTimes(1);
    expect(deps.exportSelectedMelodyAsMidi).toHaveBeenCalledTimes(1);
    expect(deps.bakeSelectedPracticeAdjustedMelodyAsCustom).toHaveBeenCalledTimes(1);
  });
});
