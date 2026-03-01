import type { MelodyEvent } from '../melody-library';
import type { MelodyStudyRange } from '../melody-study-range';

export interface MelodyDemoSelection {
  melody: {
    id: string;
    name: string;
    events: MelodyEvent[];
  };
  studyRange: MelodyStudyRange;
}

interface MelodyDemoControllerDeps {
  getSelection(): MelodyDemoSelection | null;
  getLoopRangeEnabled(): boolean;
  isListening(): boolean;
  stopListening(): void;
  getTrainingMode(): string;
  isMelodyWorkflowMode(mode: string): boolean;
  seekActiveMelodySessionToEvent(eventIndex: number): boolean;
  ensureAudioReady(): Promise<void>;
  previewEvent(
    melodyEvents: MelodyEvent[],
    melodyName: string,
    event: MelodyEvent,
    eventIndex: number,
    totalEventsInRange: number,
    studyRange: MelodyStudyRange,
    options?: { label?: string; autoplaySound?: boolean }
  ): void;
  getStepDelayMs(event: MelodyEvent): number;
  getStudyRangeLength(studyRange: MelodyStudyRange, totalEvents: number): number;
  formatStudyRange(studyRange: MelodyStudyRange, totalEvents: number): string;
  clearUiPreview(): void;
  redrawFretboard(): void;
  onStateChange(): void;
  setResultMessage(message: string, type?: 'success' | 'error'): void;
}

export function createMelodyDemoController(deps: MelodyDemoControllerDeps) {
  let timeoutId: number | null = null;
  let runToken = 0;
  let isPlaying = false;
  let isPaused = false;
  let nextEventIndex = 0;
  let stepPreviewIndex: number | null = null;
  let seekResumeMode: 'playing' | 'paused' | null = null;

  function isActive() {
    return isPlaying || isPaused;
  }

  function stopPlayback(options?: { clearUi?: boolean; message?: string }) {
    runToken++;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    const wasPlaying = isPlaying;
    const wasPaused = isPaused;
    isPlaying = false;
    isPaused = false;
    nextEventIndex = 0;
    if (options?.clearUi) {
      seekResumeMode = null;
      stepPreviewIndex = null;
      deps.clearUiPreview();
      deps.redrawFretboard();
    }
    deps.onStateChange();

    if ((wasPlaying || wasPaused) && options?.message) {
      deps.setResultMessage(options.message);
    }
  }

  function clearPreviewState() {
    stepPreviewIndex = null;
    deps.clearUiPreview();
  }

  function pausePlayback() {
    if (!isPlaying) return;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    isPlaying = false;
    isPaused = true;
    deps.onStateChange();
    deps.setResultMessage('Melody playback paused.');
  }

  async function resumePlayback() {
    const selection = deps.getSelection();
    if (!selection || !isPaused) return;

    await deps.ensureAudioReady();
    seekResumeMode = null;
    isPaused = false;
    isPlaying = true;
    deps.onStateChange();
    deps.setResultMessage(`Resumed playback: ${selection.melody.name}`);
    startPlaybackFromIndex(selection, nextEventIndex);
  }

  function seekToEvent(eventIndex: number, options?: { commit?: boolean }) {
    const selection = deps.getSelection();
    if (!selection) return;

    const { melody, studyRange } = selection;
    const clampedIndex = Math.max(studyRange.startIndex, Math.min(studyRange.endIndex, Math.round(eventIndex)));
    const totalEventsInRange = deps.getStudyRangeLength(studyRange, melody.events.length);
    const event = melody.events[clampedIndex];
    if (!event) return;

    const isCommit = options?.commit === true;
    const wasPlaying = isPlaying || seekResumeMode === 'playing';
    const wasPaused = isPaused || seekResumeMode === 'paused';

    if (!isCommit && seekResumeMode === null) {
      if (isPlaying) {
        seekResumeMode = 'playing';
      } else if (isPaused) {
        seekResumeMode = 'paused';
      }
    }

    if (isPlaying || isPaused || seekResumeMode !== null) {
      stopPlayback();
      nextEventIndex = clampedIndex;
      stepPreviewIndex = clampedIndex;
      deps.previewEvent(melody.events, melody.name, event, clampedIndex, totalEventsInRange, studyRange, {
        label: wasPlaying ? 'Playback' : 'Pause',
        autoplaySound: false,
      });

      if (isCommit && wasPlaying) {
        isPlaying = true;
        isPaused = false;
        seekResumeMode = null;
        deps.onStateChange();
        startPlaybackFromIndex(selection, clampedIndex);
        return;
      }

      if (wasPaused) {
        isPaused = true;
        seekResumeMode = null;
        deps.onStateChange();
      }

      if (isCommit) {
        deps.setResultMessage(
          `${wasPaused ? 'Playback paused at' : 'Playback repositioned to'} step ${
            clampedIndex - studyRange.startIndex + 1
          }/${totalEventsInRange}.`
        );
      } else {
        deps.onStateChange();
      }
      return;
    }

    if (deps.isListening() && deps.isMelodyWorkflowMode(deps.getTrainingMode())) {
      if (!isCommit) return;
      if (deps.seekActiveMelodySessionToEvent(clampedIndex)) {
        deps.setResultMessage(`Positioned at step ${clampedIndex - studyRange.startIndex + 1}/${totalEventsInRange}.`);
      }
      seekResumeMode = null;
      return;
    }

    stepPreviewIndex = clampedIndex;
    deps.previewEvent(melody.events, melody.name, event, clampedIndex, totalEventsInRange, studyRange, {
      label: 'Seek',
      autoplaySound: isCommit,
    });
    if (isCommit) {
      deps.setResultMessage(`Preview step ${clampedIndex - studyRange.startIndex + 1}/${totalEventsInRange}.`);
    }
    seekResumeMode = null;
  }

  async function stepPreview(direction: -1 | 1) {
    const selection = deps.getSelection();
    if (!selection) return;
    const { melody, studyRange } = selection;
    const totalEventsInRange = deps.getStudyRangeLength(studyRange, melody.events.length);

    if (isPlaying) {
      deps.setResultMessage('Stop melody playback before manual stepping.', 'error');
      return;
    }

    if (deps.isListening()) {
      deps.stopListening();
    }

    await deps.ensureAudioReady();

    const nextIndex =
      stepPreviewIndex === null
        ? studyRange.startIndex
        : Math.max(studyRange.startIndex, Math.min(studyRange.endIndex, stepPreviewIndex + direction));
    stepPreviewIndex = nextIndex;

    const event = melody.events[nextIndex];
    deps.previewEvent(melody.events, melody.name, event, nextIndex, totalEventsInRange, studyRange, {
      label: 'Step',
      autoplaySound: true,
    });
    deps.setResultMessage(
      `Step ${nextIndex - studyRange.startIndex + 1}/${totalEventsInRange}: ${melody.name} (${deps.formatStudyRange(
        studyRange,
        melody.events.length
      )})`
    );
  }

  async function startPlayback() {
    const selection = deps.getSelection();
    if (!selection) return;
    const { melody, studyRange } = selection;

    if (deps.isListening()) {
      deps.stopListening();
    }
    stopPlayback();
    seekResumeMode = null;
    clearPreviewState();

    await deps.ensureAudioReady();

    isPlaying = true;
    isPaused = false;
    nextEventIndex = studyRange.startIndex;
    deps.onStateChange();
    deps.setResultMessage(
      `Playing melody: ${melody.name} (${deps.formatStudyRange(studyRange, melody.events.length)}${
        deps.getLoopRangeEnabled() ? ', loop' : ''
      })`
    );
    startPlaybackFromIndex(selection, studyRange.startIndex);
  }

  function startPlaybackFromIndex(selection: MelodyDemoSelection, startIndex: number) {
    const playbackToken = ++runToken;
    const { melody, studyRange } = selection;
    const totalEventsInRange = deps.getStudyRangeLength(studyRange, melody.events.length);

    const playStep = (index: number) => {
      if (!isPlaying || isPaused || playbackToken !== runToken) return;

      if (index > studyRange.endIndex) {
        if (deps.getLoopRangeEnabled()) {
          timeoutId = null;
          nextEventIndex = studyRange.startIndex;
          playStep(studyRange.startIndex);
          return;
        }
        timeoutId = null;
        nextEventIndex = studyRange.startIndex;
        isPlaying = false;
        isPaused = false;
        deps.onStateChange();
        deps.clearUiPreview();
        deps.redrawFretboard();
        deps.setResultMessage(
          `Playback complete: ${melody.name} (${deps.formatStudyRange(studyRange, melody.events.length)})`,
          'success'
        );
        return;
      }

      nextEventIndex = index + 1;
      const event = melody.events[index];
      deps.previewEvent(melody.events, melody.name, event, index, totalEventsInRange, studyRange, {
        label: 'Playback',
        autoplaySound: true,
      });

      const stepDelayMs = deps.getStepDelayMs(event);
      timeoutId = setTimeout(() => {
        playStep(index + 1);
      }, stepDelayMs);
    };

    playStep(Math.max(studyRange.startIndex, Math.min(studyRange.endIndex, startIndex)));
  }

  function shouldHandleHotkeys() {
    return isPlaying || isPaused;
  }

  return {
    stopPlayback,
    clearPreviewState,
    pausePlayback,
    resumePlayback,
    seekToEvent,
    stepPreview,
    startPlayback,
    shouldHandleHotkeys,
    isActive,
    isPlaying: () => isPlaying,
    isPaused: () => isPaused,
  };
}
