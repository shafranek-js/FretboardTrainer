import { describe, expect, it, vi } from 'vitest';
import { createSelectedMelodyContextController } from './selected-melody-context-controller';

const defaultMeterProfile = {
  beatsPerBar: 4,
  beatUnitDenominator: 4,
  secondaryAccentBeatIndices: [],
};

function createDeps() {
  return {
    dom: {
      melodySelector: { value: '' },
      trainingMode: { value: 'study-melody' },
    },
    state: {
      currentInstrument: { name: 'guitar' },
    },
    getMelodyById: vi.fn((melodyId: string) =>
      melodyId === 'melody-1' ? { id: melodyId, events: [{}, {}, {}] } : null
    ),
    isMelodyWorkflowMode: vi.fn(() => true),
    defaultMeterProfile,
    resolveMelodyMetronomeMeterProfile: vi.fn((melody) => ({
      beatsPerBar: melody ? 3 : 4,
      beatUnitDenominator: 4,
      secondaryAccentBeatIndices: melody ? [1] : [],
    })),
    setMetronomeMeter: vi.fn(),
  };
}

describe('selected-melody-context-controller', () => {
  it('returns a trimmed selected melody id and resolves the melody for the current instrument', () => {
    const deps = createDeps();
    deps.dom.melodySelector.value = '  melody-1  ';
    const controller = createSelectedMelodyContextController(deps);

    expect(controller.getSelectedMelodyId()).toBe('melody-1');
    expect(controller.getSelectedMelody()).toEqual({ id: 'melody-1', events: [{}, {}, {}] });
    expect(deps.getMelodyById).toHaveBeenCalledWith('melody-1', deps.state.currentInstrument);
  });

  it('reports the selected melody event count when a melody is available', () => {
    const deps = createDeps();
    deps.dom.melodySelector.value = 'melody-1';
    const controller = createSelectedMelodyContextController(deps);

    expect(controller.getSelectedMelodyEventCount()).toBe(3);
  });

  it('falls back to the default metronome meter outside melody workflows', () => {
    const deps = createDeps();
    deps.isMelodyWorkflowMode.mockReturnValue(false);
    const controller = createSelectedMelodyContextController(deps);

    controller.syncMetronomeMeterFromSelectedMelody();

    expect(deps.setMetronomeMeter).toHaveBeenCalledWith(defaultMeterProfile);
    expect(deps.resolveMelodyMetronomeMeterProfile).not.toHaveBeenCalled();
  });

  it('syncs the metronome meter from the selected melody inside melody workflows', () => {
    const deps = createDeps();
    deps.dom.melodySelector.value = 'melody-1';
    const controller = createSelectedMelodyContextController(deps);

    controller.syncMetronomeMeterFromSelectedMelody();

    expect(deps.resolveMelodyMetronomeMeterProfile).toHaveBeenCalledWith({
      id: 'melody-1',
      events: [{}, {}, {}],
    });
    expect(deps.setMetronomeMeter).toHaveBeenCalledWith({
      beatsPerBar: 3,
      beatUnitDenominator: 4,
      secondaryAccentBeatIndices: [1],
    });
  });
});
