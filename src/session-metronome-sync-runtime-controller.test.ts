import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionMetronomeSyncRuntimeController } from './session-metronome-sync-runtime-controller';

function createDeps() {
  const melody = {
    id: 'builtin:guitar:test',
    events: [{ durationBeats: 1 }],
    sourceTimeSignature: '6/8',
  };
  const state = {
    isListening: true,
    performanceRuntimeStartedAtMs: 1000,
    performancePrerollLeadInVisible: false,
  };
  const dom = {
    trainingMode: { value: 'melody' } as HTMLSelectElement,
    metronomeEnabled: { checked: true } as HTMLInputElement,
    melodyDemoBpm: { value: '132' } as HTMLInputElement,
  };
  const deps = {
    dom,
    state,
    isMelodyWorkflowMode: vi.fn((trainingMode: string) => trainingMode === 'melody' || trainingMode === 'performance'),
    isPerformanceStyleMode: vi.fn((trainingMode: string) => trainingMode === 'performance'),
    getSelectedAdjustedMelody: vi.fn(() => melody),
    resolveMelodyMetronomeMeterProfile: vi.fn(() => ({
      beatsPerBar: 6,
      beatUnitDenominator: 8,
      secondaryAccentBeatIndices: [3],
    })),
    setMetronomeMeter: vi.fn(),
    isMetronomeRunning: vi.fn(() => false),
    stopMetronome: vi.fn(),
    getMetronomeBpm: vi.fn(() => 120),
    setMetronomeTempo: vi.fn(async () => {}),
    startMetronome: vi.fn(async () => {}),
    clampMelodyPlaybackBpm: vi.fn(() => 132),
    showNonBlockingError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
  };

  return { melody, state, dom, deps };
}

describe('session-metronome-sync-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts the metronome with the selected melody meter profile', async () => {
    const { melody, deps } = createDeps();
    const controller = createSessionMetronomeSyncRuntimeController(deps);

    await controller.syncToPromptStart();

    expect(deps.getSelectedAdjustedMelody).toHaveBeenCalledTimes(1);
    expect(deps.resolveMelodyMetronomeMeterProfile).toHaveBeenCalledWith(melody);
    expect(deps.setMetronomeMeter).toHaveBeenCalledWith({
      beatsPerBar: 6,
      beatUnitDenominator: 8,
      secondaryAccentBeatIndices: [3],
    });
    expect(deps.clampMelodyPlaybackBpm).toHaveBeenCalledWith('132');
    expect(deps.startMetronome).toHaveBeenCalledWith(132);
  });

  it('stops a running metronome when disabled', async () => {
    const { dom, deps } = createDeps();
    dom.metronomeEnabled.checked = false;
    deps.isMetronomeRunning.mockReturnValue(true);
    const controller = createSessionMetronomeSyncRuntimeController(deps);

    await controller.syncToPromptStart();

    expect(deps.stopMetronome).toHaveBeenCalledTimes(1);
    expect(deps.startMetronome).not.toHaveBeenCalled();
  });

  it('retimes a running metronome when bpm changes', async () => {
    const { deps } = createDeps();
    deps.isMetronomeRunning.mockReturnValue(true);
    deps.getMetronomeBpm.mockReturnValue(90);
    const controller = createSessionMetronomeSyncRuntimeController(deps);

    await controller.syncToPromptStart();

    expect(deps.setMetronomeTempo).toHaveBeenCalledWith(132);
    expect(deps.startMetronome).not.toHaveBeenCalled();
  });

  it('skips runtime sync during performance preroll before the clock starts', async () => {
    const { dom, state, deps } = createDeps();
    dom.trainingMode.value = 'performance';
    state.performanceRuntimeStartedAtMs = null;
    const controller = createSessionMetronomeSyncRuntimeController(deps);

    await controller.syncToPromptStart();

    expect(deps.setMetronomeMeter).toHaveBeenCalledTimes(1);
    expect(deps.startMetronome).not.toHaveBeenCalled();
    expect(deps.setMetronomeTempo).not.toHaveBeenCalled();
  });

  it('reports synchronization failures as non-blocking errors', async () => {
    const { deps } = createDeps();
    deps.startMetronome.mockRejectedValue(new Error('boom'));
    const controller = createSessionMetronomeSyncRuntimeController(deps);

    await controller.syncToPromptStart();

    expect(deps.formatUserFacingError).toHaveBeenCalledWith(
      'Failed to synchronize metronome timing',
      expect.any(Error)
    );
    expect(deps.showNonBlockingError).toHaveBeenCalledWith('Failed to synchronize metronome timing');
  });
});
