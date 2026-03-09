interface ElementLike {
  closest(selector: string): ElementLike | null;
}

interface MelodyPlaybackControlsDom {
  melodyDemoBtn: HTMLButtonElement;
  melodyPauseDemoBtn: HTMLButtonElement;
  melodyStepBackBtn: HTMLButtonElement;
  melodyStepForwardBtn: HTMLButtonElement;
}

interface MelodyPlaybackControlsState {
  isListening: boolean;
}

export interface MelodyPlaybackControlsControllerDeps {
  dom: MelodyPlaybackControlsDom;
  state: MelodyPlaybackControlsState;
  setPracticeSetupCollapsed: (collapsed: boolean) => void;
  startMelodyDemoPlayback: () => Promise<void>;
  pauseMelodyDemoPlayback: () => void;
  resumeMelodyDemoPlayback: () => Promise<void>;
  stopMelodyDemoPlayback: (options?: { clearUi?: boolean; message?: string }) => void;
  stepMelodyPreview: (direction: -1 | 1) => Promise<void>;
  isPlaying: () => boolean;
  isPaused: () => boolean;
  canHandleHotkeys: () => boolean;
  getTrainingMode: () => string;
  isMelodyWorkflowMode: (mode: string) => boolean;
  isTextEntryElement: (target: EventTarget | null) => boolean;
  isAnyBlockingModalOpen: () => boolean;
}

function isElementLike(target: unknown): target is ElementLike {
  return typeof target === 'object' && target !== null && 'closest' in target && typeof (target as { closest?: unknown }).closest === 'function';
}

export function createMelodyPlaybackControlsController(deps: MelodyPlaybackControlsControllerDeps) {
  function shouldHandleMelodyDemoHotkeys(event: KeyboardEvent) {
    if (!deps.isMelodyWorkflowMode(deps.getTrainingMode())) return false;
    if (deps.isTextEntryElement(event.target)) return false;
    if (deps.isAnyBlockingModalOpen()) return false;
    return deps.canHandleHotkeys();
  }

  function shouldToggleMelodyPlaybackFromBackgroundClick(target: ElementLike) {
    if (deps.state.isListening) return false;
    if (!(deps.isPlaying() || deps.isPaused())) return false;
    if (
      target.closest(
        'button, input, select, textarea, a, label, summary, [role="button"], .timeline-context-menu, [data-note-index], [data-event-index], [data-timeline-range-ui="true"], .modal-panel, [aria-modal="true"]'
      )
    ) {
      return false;
    }
    return Boolean(target.closest('.app-shell, .compact-section, .fretboard-area, .session-area'));
  }

  function register(doc: Pick<Document, 'addEventListener'> = document) {
    deps.dom.melodyDemoBtn.addEventListener('click', async () => {
      if (deps.isPlaying() || deps.isPaused()) {
        deps.stopMelodyDemoPlayback({ clearUi: true, message: 'Melody playback stopped.' });
        return;
      }
      deps.setPracticeSetupCollapsed(true);
      await deps.startMelodyDemoPlayback();
    });

    deps.dom.melodyPauseDemoBtn.addEventListener('click', async () => {
      if (deps.isPlaying()) {
        deps.pauseMelodyDemoPlayback();
        return;
      }
      if (deps.isPaused()) {
        await deps.resumeMelodyDemoPlayback();
      }
    });

    deps.dom.melodyStepBackBtn.addEventListener('click', async () => {
      await deps.stepMelodyPreview(-1);
    });

    deps.dom.melodyStepForwardBtn.addEventListener('click', async () => {
      await deps.stepMelodyPreview(1);
    });

    doc.addEventListener('keydown', async (event) => {
      if (!shouldHandleMelodyDemoHotkeys(event as KeyboardEvent)) return;
      const keyboardEvent = event as KeyboardEvent;

      if (keyboardEvent.key === 'Enter') {
        keyboardEvent.preventDefault();
        deps.setPracticeSetupCollapsed(true);
        await deps.startMelodyDemoPlayback();
        return;
      }

      if (keyboardEvent.code === 'Space') {
        keyboardEvent.preventDefault();
        if (deps.isPlaying()) {
          deps.pauseMelodyDemoPlayback();
        } else if (deps.isPaused()) {
          await deps.resumeMelodyDemoPlayback();
        }
        return;
      }

      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        deps.stopMelodyDemoPlayback({ clearUi: true, message: 'Melody playback stopped.' });
      }
    });

    doc.addEventListener('click', async (event) => {
      const target = (event as MouseEvent).target;
      if (!isElementLike(target)) return;
      if (!shouldToggleMelodyPlaybackFromBackgroundClick(target)) return;

      if (deps.isPlaying()) {
        deps.pauseMelodyDemoPlayback();
        return;
      }
      if (deps.isPaused()) {
        await deps.resumeMelodyDemoPlayback();
      }
    });
  }

  return { register };
}
