import { buildPromptAudioPlan } from '../prompt-audio-plan';
import { getMelodyFingeredEvent } from '../melody-fingering';
import { formatMelodyStudyStepLabel, type MelodyStudyRange } from '../melody-study-range';
import { clampMelodyPlaybackBpm, getMelodyEventPlaybackDurationMs } from '../melody-timeline-duration';
import type { MelodyDefinition, MelodyEvent } from '../melody-library';
import type { IInstrument } from '../instruments/instrument';
import type { ChordNote, Prompt } from '../types';

interface MelodyDemoPresentationControllerDeps {
  dom: {
    melodyDemoBpm: HTMLInputElement;
    melodyDemoBpmValue: HTMLElement;
    melodyDemoBtn: HTMLButtonElement;
    melodyPauseDemoBtn: HTMLButtonElement;
    melodyStepBackBtn: HTMLButtonElement;
    melodyStepForwardBtn: HTMLButtonElement;
    melodyLoopRange: HTMLInputElement;
    melodyPlaybackControls: HTMLElement;
    trainingMode: HTMLSelectElement;
    stringSelector: HTMLElement;
  };
  state: {
    melodyTimelinePreviewIndex: number | null;
    melodyTimelinePreviewLabel: string | null;
    currentInstrument: IInstrument;
    calibratedA4: number;
    audioContext: { state: string; resume(): Promise<void> } | null;
  };
  getSelectedMelody(): MelodyDefinition | null;
  isMelodyWorkflowMode(mode: string): boolean;
  isDemoActive(): boolean;
  isDemoPaused(): boolean;
  syncLoopRangeDisplay(): void;
  loadInstrumentSoundfont(instrumentName: string): Promise<void>;
  showNonBlockingError(message: string): void;
  formatUserFacingError(prefix: string, error: unknown): string;
  getEnabledStrings(container: HTMLElement): Set<string>;
  playSound(noteOrNotes: string | string[]): void;
  setPromptText(text: string): void;
  drawFretboard(
    showAllNotes?: boolean,
    targetNote?: string | null,
    targetString?: string | null,
    chordFingering?: ChordNote[] | null
  ): void;
  redrawFretboard(): void;
  renderTimeline(): void;
  findPlayableStringForNote(note: string): string | null;
}

function formatMelodyDemoEventHint(event: MelodyEvent) {
  return event.notes
    .map((note) => {
      if (note.stringName !== null && typeof note.fret === 'number') {
        return `${note.note} (${note.stringName}, fret ${note.fret})`;
      }
      return note.note;
    })
    .join(' + ');
}

function buildMelodyDemoPrompt(
  melodyName: string,
  event: MelodyEvent,
  eventIndexInRange: number,
  totalEventsInRange: number,
  studyRange: MelodyStudyRange,
  totalMelodyEvents: number,
  fingering: ChordNote[],
  options?: { label?: string }
): Prompt {
  const isPolyphonic = event.notes.length > 1;
  const first = event.notes[0] ?? null;
  const stepLabel = formatMelodyStudyStepLabel(
    eventIndexInRange,
    totalEventsInRange,
    studyRange,
    totalMelodyEvents
  );
  const prefixLabel = options?.label ?? 'Playback';

  return {
    displayText: `${prefixLabel} ${stepLabel}: ${formatMelodyDemoEventHint(event)} (${melodyName})`,
    targetNote: isPolyphonic ? null : (first?.note ?? null),
    targetString: isPolyphonic ? null : (first?.stringName ?? null),
    targetChordNotes: isPolyphonic ? [...new Set(event.notes.map((note) => note.note))] : [],
    targetChordFingering: isPolyphonic ? fingering : [],
    targetMelodyEventNotes: fingering,
    baseChordName: null,
  };
}

export function createMelodyDemoPresentationController(deps: MelodyDemoPresentationControllerDeps) {
  function syncBpmDisplay() {
    deps.dom.melodyDemoBpmValue.textContent = deps.dom.melodyDemoBpm.value;
  }

  function getClampedBpmFromInput() {
    const clamped = clampMelodyPlaybackBpm(Number.parseInt(deps.dom.melodyDemoBpm.value, 10));
    deps.dom.melodyDemoBpm.value = String(clamped);
    syncBpmDisplay();
    return clamped;
  }

  function renderButtonState() {
    const isMelodyDemoActive = deps.isDemoActive();
    deps.dom.melodyDemoBtn.textContent = isMelodyDemoActive ? 'Stop' : 'Play Melody';
    deps.dom.melodyDemoBtn.classList.toggle('bg-emerald-700', !isMelodyDemoActive);
    deps.dom.melodyDemoBtn.classList.toggle('hover:bg-emerald-600', !isMelodyDemoActive);
    deps.dom.melodyDemoBtn.classList.toggle('border-emerald-500', !isMelodyDemoActive);
    deps.dom.melodyDemoBtn.classList.toggle('bg-red-700', isMelodyDemoActive);
    deps.dom.melodyDemoBtn.classList.toggle('hover:bg-red-600', isMelodyDemoActive);
    deps.dom.melodyDemoBtn.classList.toggle('border-red-500', isMelodyDemoActive);
    deps.dom.melodyPauseDemoBtn.textContent = deps.isDemoPaused() ? 'Resume' : 'Pause';
    deps.dom.melodyPauseDemoBtn.disabled = !isMelodyDemoActive;
    deps.dom.melodyPauseDemoBtn.classList.toggle('bg-amber-700', !deps.isDemoPaused());
    deps.dom.melodyPauseDemoBtn.classList.toggle('hover:bg-amber-600', !deps.isDemoPaused());
    deps.dom.melodyPauseDemoBtn.classList.toggle('border-amber-500', !deps.isDemoPaused());
    deps.dom.melodyPauseDemoBtn.classList.toggle('bg-cyan-700', deps.isDemoPaused());
    deps.dom.melodyPauseDemoBtn.classList.toggle('hover:bg-cyan-600', deps.isDemoPaused());
    deps.dom.melodyPauseDemoBtn.classList.toggle('border-cyan-500', deps.isDemoPaused());
    const melody = deps.getSelectedMelody();
    deps.dom.melodyPlaybackControls.classList.toggle('hidden', !deps.isMelodyWorkflowMode(deps.dom.trainingMode.value));
    const canStep = Boolean(melody) && !isMelodyDemoActive;
    deps.dom.melodyStepBackBtn.disabled = !canStep;
    deps.dom.melodyStepForwardBtn.disabled = !canStep;
    deps.dom.melodyLoopRange.disabled = !melody;
    deps.syncLoopRangeDisplay();
  }

  async function ensureAudioReady() {
    try {
      await deps.loadInstrumentSoundfont(deps.state.currentInstrument.name);
      if (deps.state.audioContext?.state === 'suspended') {
        await deps.state.audioContext.resume();
      }
    } catch (error) {
      deps.showNonBlockingError(
        deps.formatUserFacingError('Failed to initialize sound for melody playback', error)
      );
    }
  }

  function playPromptAudioFromPrompt(prompt: Prompt) {
    const audioPlan = buildPromptAudioPlan({
      prompt,
      trainingMode: 'melody',
      autoPlayPromptSoundEnabled: true,
      instrument: deps.state.currentInstrument,
      calibratedA4: deps.state.calibratedA4,
      enabledStrings: deps.getEnabledStrings(deps.dom.stringSelector),
    });

    if (audioPlan.notesToPlay.length === 1) {
      deps.playSound(audioPlan.notesToPlay[0]!);
    } else if (audioPlan.notesToPlay.length > 1) {
      deps.playSound(audioPlan.notesToPlay);
    }
  }

  function getStepDelayMs(event: MelodyEvent) {
    return getMelodyEventPlaybackDurationMs(event, getClampedBpmFromInput());
  }

  function previewEvent(
    melodyEvents: MelodyEvent[],
    melodyName: string,
    event: MelodyEvent,
    eventIndex: number,
    totalEventsInRange: number,
    studyRange: MelodyStudyRange,
    options?: { label?: string; autoplaySound?: boolean }
  ) {
    deps.state.melodyTimelinePreviewIndex = eventIndex;
    deps.state.melodyTimelinePreviewLabel = options?.label ?? 'Playback';
    const fingering = getMelodyFingeredEvent(melodyEvents, eventIndex);
    const prompt = buildMelodyDemoPrompt(
      melodyName,
      event,
      eventIndex - studyRange.startIndex,
      totalEventsInRange,
      studyRange,
      melodyEvents.length,
      fingering,
      { label: options?.label }
    );
    deps.setPromptText(prompt.displayText);

    if ((prompt.targetMelodyEventNotes?.length ?? 0) >= 1) {
      deps.drawFretboard(false, null, null, prompt.targetMelodyEventNotes ?? []);
    } else if (prompt.targetNote) {
      deps.drawFretboard(
        false,
        prompt.targetNote,
        prompt.targetString || deps.findPlayableStringForNote(prompt.targetNote)
      );
    } else {
      deps.redrawFretboard();
    }

    if (options?.autoplaySound !== false) {
      playPromptAudioFromPrompt(prompt);
    }

    deps.renderTimeline();
  }

  return {
    syncBpmDisplay,
    getClampedBpmFromInput,
    renderButtonState,
    ensureAudioReady,
    getStepDelayMs,
    previewEvent,
  };
}
