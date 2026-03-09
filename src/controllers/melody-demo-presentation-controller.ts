import { buildPromptAudioPlan } from '../prompt-audio-plan';
import { getMelodyFingeredEvent } from '../melody-fingering';
import { getPlayableMelodyEventNotes } from '../melody-playable-event-notes';
import type { MelodyFingeringLevel, MelodyFingeringStrategy } from '../melody-fingering';
import type { MelodyStudyRange } from '../melody-study-range';
import {
  clampMelodyPlaybackBpm,
  getMelodyEventPlaybackDurationExactMs,
} from '../melody-timeline-duration';
import type { MelodyDefinition, MelodyEvent } from '../melody-library';
import type { IInstrument } from '../instruments/instrument';
import type { ChordNote, Prompt } from '../types';
import type { UiWorkflow } from '../training-workflows';

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
    melodyFingeringStrategy?: MelodyFingeringStrategy;
    melodyFingeringLevel?: MelodyFingeringLevel;
    currentInstrument: IInstrument;
    calibratedA4: number;
    audioContext: { state: string; resume(): Promise<void> } | null;
  };
  getSelectedMelody(): MelodyDefinition | null;
  isMelodyWorkflowMode(mode: string): boolean;
  getUiWorkflow(): UiWorkflow;
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
  getPlaybackActionLabel(workflow: UiWorkflow): string;
}

function buildMelodyDemoPrompt(
  melodyName: string,
  event: MelodyEvent,
  playableNotes: ChordNote[],
  options?: { label?: string }
): Prompt {
  const isPolyphonic = playableNotes.length > 1 || event.notes.length > 1;
  const firstPlayable = playableNotes[0] ?? null;
  const firstEventNote = event.notes[0] ?? null;
  const prefixLabel = options?.label ?? 'Playback';

  return {
    displayText: `${prefixLabel}: ${melodyName}`,
    targetNote: isPolyphonic ? null : (firstPlayable?.note ?? firstEventNote?.note ?? null),
    targetString: isPolyphonic ? null : (firstPlayable?.string ?? firstEventNote?.stringName ?? null),
    targetChordNotes: isPolyphonic ? [...new Set(event.notes.map((note) => note.note))] : [],
    targetChordFingering: isPolyphonic ? playableNotes : [],
    targetMelodyEventNotes: playableNotes,
    baseChordName: null,
  };
}

export function createMelodyDemoPresentationController(deps: MelodyDemoPresentationControllerDeps) {
  function buildPlaybackIconSvg(icon: 'play' | 'stop' | 'pause' | 'step-back' | 'step-forward') {
    const path =
      icon === 'play'
        ? '<path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.68L9.54 5.98A1 1 0 0 0 8 6.82Z" />'
        : icon === 'stop'
          ? '<path d="M7 7h10v10H7z" />'
          : icon === 'pause'
            ? '<path d="M8 6h3v12H8zM13 6h3v12h-3z" />'
            : icon === 'step-back'
              ? '<path d="M7 6h2v12H7zM17 6.82v10.36a1 1 0 0 1-1.54.84l-8.14-5.18a1 1 0 0 1 0-1.68l8.14-5.18A1 1 0 0 1 17 6.82Z" />'
              : '<path d="M15 6h2v12h-2zM7 6.82v10.36a1 1 0 0 0 1.54.84l8.14-5.18a1 1 0 0 0 0-1.68L8.54 5.98A1 1 0 0 0 7 6.82Z" />';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4" aria-hidden="true">${path}</svg>`;
  }

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
    const idlePlaybackActionLabel = deps.getPlaybackActionLabel(deps.getUiWorkflow());
    deps.dom.melodyDemoBtn.innerHTML = buildPlaybackIconSvg(isMelodyDemoActive ? 'stop' : 'play');
    deps.dom.melodyDemoBtn.setAttribute('aria-label', isMelodyDemoActive ? 'Stop playback' : idlePlaybackActionLabel);
    deps.dom.melodyDemoBtn.title = isMelodyDemoActive ? 'Stop playback' : idlePlaybackActionLabel;
    deps.dom.melodyDemoBtn.classList.toggle('bg-emerald-700', !isMelodyDemoActive);
    deps.dom.melodyDemoBtn.classList.toggle('hover:bg-emerald-600', !isMelodyDemoActive);
    deps.dom.melodyDemoBtn.classList.toggle('border-emerald-500', !isMelodyDemoActive);
    deps.dom.melodyDemoBtn.classList.toggle('bg-red-700', isMelodyDemoActive);
    deps.dom.melodyDemoBtn.classList.toggle('hover:bg-red-600', isMelodyDemoActive);
    deps.dom.melodyDemoBtn.classList.toggle('border-red-500', isMelodyDemoActive);
    deps.dom.melodyPauseDemoBtn.innerHTML = buildPlaybackIconSvg(deps.isDemoPaused() ? 'play' : 'pause');
    deps.dom.melodyPauseDemoBtn.setAttribute(
      'aria-label',
      deps.isDemoPaused() ? 'Resume playback' : 'Pause playback'
    );
    deps.dom.melodyPauseDemoBtn.title = deps.isDemoPaused() ? 'Resume playback' : 'Pause playback';
    deps.dom.melodyPauseDemoBtn.disabled = !isMelodyDemoActive;
    deps.dom.melodyPauseDemoBtn.classList.toggle('bg-amber-700', !deps.isDemoPaused());
    deps.dom.melodyPauseDemoBtn.classList.toggle('hover:bg-amber-600', !deps.isDemoPaused());
    deps.dom.melodyPauseDemoBtn.classList.toggle('border-amber-500', !deps.isDemoPaused());
    deps.dom.melodyPauseDemoBtn.classList.toggle('bg-cyan-700', deps.isDemoPaused());
    deps.dom.melodyPauseDemoBtn.classList.toggle('hover:bg-cyan-600', deps.isDemoPaused());
    deps.dom.melodyPauseDemoBtn.classList.toggle('border-cyan-500', deps.isDemoPaused());
    deps.dom.melodyStepBackBtn.innerHTML = buildPlaybackIconSvg('step-back');
    deps.dom.melodyStepForwardBtn.innerHTML = buildPlaybackIconSvg('step-forward');
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

  function getStepDelayMs(event: MelodyEvent, melodyEvents: MelodyEvent[]) {
    return getMelodyEventPlaybackDurationExactMs(event, getClampedBpmFromInput(), melodyEvents);
  }

  function previewEvent(
    melodyEvents: MelodyEvent[],
    melodyName: string,
    event: MelodyEvent,
    eventIndex: number,
    _totalEventsInRange: number,
    _studyRange: MelodyStudyRange,
    options?: { label?: string; autoplaySound?: boolean }
  ) {
    deps.state.melodyTimelinePreviewIndex = eventIndex;
    deps.state.melodyTimelinePreviewLabel = options?.label ?? 'Playback';
    const fingering = getMelodyFingeredEvent(melodyEvents, eventIndex, {
      strategy: deps.state.melodyFingeringStrategy ?? 'minimax',
      level: deps.state.melodyFingeringLevel ?? 'beginner',
    });
    const playableNotes = getPlayableMelodyEventNotes(event, fingering);
    const prompt = buildMelodyDemoPrompt(
      melodyName,
      event,
      playableNotes,
      { label: options?.label }
    );
    deps.setPromptText(prompt.displayText);
    if (playableNotes.length > 0) {
      deps.drawFretboard(false, null, null, playableNotes);
    } else {
      deps.drawFretboard(false, prompt.targetNote, prompt.targetString);
    }
    deps.redrawFretboard();
    deps.renderTimeline();

    if (options?.autoplaySound !== false) {
      playPromptAudioFromPrompt(prompt);
    }
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


