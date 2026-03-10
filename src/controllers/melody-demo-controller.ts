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
  getStepDelayMs(event: MelodyEvent, melodyEvents: MelodyEvent[]): number;
  getStudyRangeLength(studyRange: MelodyStudyRange, totalEvents: number): number;
  formatStudyRange(studyRange: MelodyStudyRange, totalEvents: number): string;
  clearUiPreview(): void;
  redrawFretboard(): void;
  onStateChange(): void;
  setResultMessage(message: string, type?: 'success' | 'error'): void;
  onBeforePlaybackStart?(playbackAnchorPerfMs: number): Promise<void> | void;
  onPlaybackCursorChange(cursor: {
    active: boolean;
    paused: boolean;
    baseTimeSec: number;
    anchorStartedAtMs: number | null;
    pausedOffsetSec: number;
  }): void;
  onPlaybackStopped(): void;
  onPlaybackCompleted?(): void;
  getPlaybackPromptLabel(): string;
  getPlaybackCompletedLabel(): string;
}

export function createMelodyDemoController(deps: MelodyDemoControllerDeps) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let runToken = 0;
  let isPlaying = false;
  let isPaused = false;
  let nextEventIndex = 0;
  let stepPreviewIndex: number | null = null;
  let seekResumeMode: 'playing' | 'paused' | null = null;
  let playbackBaseTimeSec = 0;
  let currentEventStartedAtMs: number | null = null;
  let currentEventDurationMs = 0;
  let pausedOffsetSec = 0;

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
    playbackBaseTimeSec = 0;
    currentEventStartedAtMs = null;
    pausedOffsetSec = 0;
    deps.onPlaybackStopped();
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
    pausedOffsetSec =
      currentEventStartedAtMs === null ? 0 : Math.max(0, (Date.now() - currentEventStartedAtMs) / 1000);
    currentEventStartedAtMs = null;
    isPlaying = false;
    isPaused = true;
    deps.onPlaybackCursorChange({
      active: true,
      paused: true,
      baseTimeSec: playbackBaseTimeSec,
      anchorStartedAtMs: null,
      pausedOffsetSec,
    });
    deps.onStateChange();
    deps.setResultMessage('Melody playback paused.');
  }

  async function resumePlayback(resumeAnchorPerfMs?: number) {
    const selection = deps.getSelection();
    if (!selection || !isPaused) return;

    await deps.ensureAudioReady();
    seekResumeMode = null;
    isPaused = false;
    isPlaying = true;
    currentEventStartedAtMs = Date.now();
    deps.onPlaybackCursorChange({
      active: true,
      paused: false,
      baseTimeSec: playbackBaseTimeSec,
      anchorStartedAtMs: currentEventStartedAtMs,
      pausedOffsetSec,
    });
    deps.onStateChange();
    deps.setResultMessage(`Resumed playback: ${selection.melody.name}`);
    startPlaybackFromIndex(selection, nextEventIndex, resumeAnchorPerfMs);
  }

  function getElapsedSecondsBeforeEvent(selection: MelodyDemoSelection, targetIndex: number) {
    let elapsedSec = 0;
    for (let index = selection.studyRange.startIndex; index < targetIndex; index += 1) {
      const event = selection.melody.events[index];
      if (!event) continue;
      elapsedSec += deps.getStepDelayMs(event, selection.melody.events) / 1000;
    }
    return elapsedSec;
  }

  function buildEventOffsetsFromIndexMs(selection: MelodyDemoSelection, startIndex: number) {
    const offsetsMs = [0];
    let elapsedMs = 0;
    for (let index = startIndex; index <= selection.studyRange.endIndex; index += 1) {
      const event = selection.melody.events[index];
      if (event) {
        elapsedMs += deps.getStepDelayMs(event, selection.melody.events);
      }
      offsetsMs.push(elapsedMs);
    }
    return offsetsMs;
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
    const playbackAnchorPerfMs = performance.now() + 20;
    await deps.onBeforePlaybackStart?.(playbackAnchorPerfMs);

    isPlaying = true;
    isPaused = false;
    nextEventIndex = studyRange.startIndex;
    deps.onStateChange();
    deps.setResultMessage(
      `Playing melody: ${melody.name} (${deps.formatStudyRange(studyRange, melody.events.length)}${
        deps.getLoopRangeEnabled() ? ', loop' : ''
      })`
    );
    startPlaybackFromIndex(selection, studyRange.startIndex, playbackAnchorPerfMs);
  }

  function startPlaybackFromIndex(
    selection: MelodyDemoSelection,
    startIndex: number,
    playbackAnchorPerfMsOverride?: number
  ) {
    const playbackToken = ++runToken;
    const { melody, studyRange } = selection;
    const totalEventsInRange = deps.getStudyRangeLength(studyRange, melody.events.length);
    const clampedStartIndex = Math.max(studyRange.startIndex, Math.min(studyRange.endIndex, startIndex));
    const baseElapsedBeforeStartSec = getElapsedSecondsBeforeEvent(selection, clampedStartIndex);
    const eventOffsetsFromStartMs = buildEventOffsetsFromIndexMs(selection, clampedStartIndex);
    const playbackAnchorPerfMs =
      typeof playbackAnchorPerfMsOverride === 'number' && Number.isFinite(playbackAnchorPerfMsOverride)
        ? playbackAnchorPerfMsOverride
        : performance.now();

    const playStep = (localIndex: number) => {
      if (!isPlaying || isPaused || playbackToken !== runToken) return;
      const index = clampedStartIndex + localIndex;

      if (index > studyRange.endIndex) {
        if (deps.getLoopRangeEnabled()) {
          timeoutId = null;
          nextEventIndex = studyRange.startIndex;
          startPlaybackFromIndex(selection, studyRange.startIndex);
          return;
        }
        timeoutId = null;
        nextEventIndex = studyRange.startIndex;
        isPlaying = false;
        isPaused = false;
        playbackBaseTimeSec = 0;
        currentEventStartedAtMs = null;
        pausedOffsetSec = 0;
        deps.onPlaybackStopped();
        deps.onStateChange();
        deps.clearUiPreview();
        deps.redrawFretboard();
        deps.onPlaybackCompleted?.();
        deps.setResultMessage(
          `${deps.getPlaybackCompletedLabel()}: ${melody.name} (${deps.formatStudyRange(studyRange, melody.events.length)})`,
          'success'
        );
        return;
      }

      nextEventIndex = index + 1;
      const event = melody.events[index];
      playbackBaseTimeSec = baseElapsedBeforeStartSec + (eventOffsetsFromStartMs[localIndex] ?? 0) / 1000;
      pausedOffsetSec = 0;
      currentEventStartedAtMs = Date.now();
      deps.onPlaybackCursorChange({
        active: true,
        paused: false,
        baseTimeSec: playbackBaseTimeSec,
        anchorStartedAtMs: currentEventStartedAtMs,
        pausedOffsetSec: 0,
      });
      deps.previewEvent(melody.events, melody.name, event, index, totalEventsInRange, studyRange, {
        label: deps.getPlaybackPromptLabel(),
        autoplaySound: true,
      });

      const nextLocalIndex = localIndex + 1;
      const nextStepTargetAtMs = playbackAnchorPerfMs + (eventOffsetsFromStartMs[nextLocalIndex] ?? 0);
      const stepDelayMs = Math.max(0, nextStepTargetAtMs - performance.now());
      timeoutId = setTimeout(() => {
        playStep(nextLocalIndex);
      }, stepDelayMs);
    };

    const firstStepDelayMs = Math.max(0, Math.round(playbackAnchorPerfMs - performance.now()));
    if (firstStepDelayMs <= 0) {
      playStep(0);
      return;
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      playStep(0);
    }, firstStepDelayMs);
  }

  function retimePlayback() {
    if (!isPlaying || currentEventStartedAtMs === null) return false;
    const selection = deps.getSelection();
    if (!selection) return false;

    const { melody, studyRange } = selection;
    const currentIndex = Math.max(
      studyRange.startIndex,
      Math.min(studyRange.endIndex, nextEventIndex - 1)
    );
    const currentEvent = melody.events[currentIndex];
    if (!currentEvent) return false;

    const previousDurationMs = Math.max(1, currentEventDurationMs || deps.getStepDelayMs(currentEvent, melody.events));
    const elapsedMs = Math.max(0, Date.now() - currentEventStartedAtMs);
    const progress = Math.max(0, Math.min(1, elapsedMs / previousDurationMs));
    currentEventDurationMs = deps.getStepDelayMs(currentEvent, melody.events);
    playbackBaseTimeSec = getElapsedSecondsBeforeEvent(selection, currentIndex);
    pausedOffsetSec = 0;
    currentEventStartedAtMs = Date.now() - Math.round(progress * currentEventDurationMs);

    deps.onPlaybackCursorChange({
      active: true,
      paused: false,
      baseTimeSec: playbackBaseTimeSec,
      anchorStartedAtMs: currentEventStartedAtMs,
      pausedOffsetSec: 0,
    });

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const remainingMs = Math.max(0, Math.round(currentEventDurationMs * (1 - progress)));
    const resumeToken = ++runToken;
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!isPlaying || isPaused || resumeToken !== runToken) return;
      startPlaybackFromIndex(selection, currentIndex + 1);
    }, remainingMs);
    return true;
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
    retimePlayback,
    shouldHandleHotkeys,
    isActive,
    isPlaying: () => isPlaying,
    isPaused: () => isPaused,
  };
}




