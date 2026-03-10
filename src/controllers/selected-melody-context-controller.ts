interface MeterProfile {
  beatsPerBar: number;
  beatUnitDenominator: number;
  secondaryAccentBeatIndices: number[];
}

interface SelectedMelodyContextControllerDom {
  melodySelector: HTMLSelectElement;
  trainingMode: HTMLSelectElement;
}

interface SelectedMelodyContextControllerState<TInstrument> {
  currentInstrument: TInstrument;
}

export interface SelectedMelodyContextControllerDeps<
  TMelody extends TMeterMelody,
  TMeterMelody extends { events: unknown[] },
  TInstrument,
> {
  dom: SelectedMelodyContextControllerDom;
  state: SelectedMelodyContextControllerState<TInstrument>;
  getMelodyById: (melodyId: string, instrument: TInstrument) => TMelody | null;
  isMelodyWorkflowMode: (mode: string) => boolean;
  defaultMeterProfile: MeterProfile;
  resolveMelodyMetronomeMeterProfile: (melody: TMeterMelody | null) => MeterProfile;
  setMetronomeMeter: (profile: MeterProfile) => void;
}

export function createSelectedMelodyContextController<
  TMelody extends TMeterMelody,
  TMeterMelody extends { events: unknown[] },
  TInstrument,
>(deps: SelectedMelodyContextControllerDeps<TMelody, TMeterMelody, TInstrument>) {
  function getSelectedMelodyId() {
    const selectedMelodyId = deps.dom.melodySelector.value.trim();
    return selectedMelodyId.length > 0 ? selectedMelodyId : null;
  }

  function getSelectedMelody() {
    const selectedMelodyId = getSelectedMelodyId();
    return selectedMelodyId ? deps.getMelodyById(selectedMelodyId, deps.state.currentInstrument) : null;
  }

  function getSelectedMelodyEventCount() {
    return getSelectedMelody()?.events.length ?? null;
  }

  function syncMetronomeMeterFromSelectedMelody() {
    if (!deps.isMelodyWorkflowMode(deps.dom.trainingMode.value)) {
      deps.setMetronomeMeter(deps.defaultMeterProfile);
      return;
    }
    deps.setMetronomeMeter(deps.resolveMelodyMetronomeMeterProfile(getSelectedMelody()));
  }

  return {
    getSelectedMelodyId,
    getSelectedMelody,
    getSelectedMelodyEventCount,
    syncMetronomeMeterFromSelectedMelody,
  };
}
