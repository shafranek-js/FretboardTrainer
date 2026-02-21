import { dom } from './state';
import { createSignal } from './reactive/signal';
import { CENTS_TOLERANCE, CENTS_VISUAL_RANGE } from './constants';
import { computeTunerView } from './tuner-view';
import { getTrainingModeUiVisibility } from './training-mode-ui';
import type { StatsViewModel } from './stats-view';

const statusTextSignal = createSignal('Ready');
const promptTextSignal = createSignal('');
type ResultTone = 'neutral' | 'success' | 'error';
interface ResultViewState {
  text: string;
  tone: ResultTone;
}
const resultViewSignal = createSignal<ResultViewState>({ text: '', tone: 'neutral' });
const volumeLevelSignal = createSignal(0);
const statsViewSignal = createSignal<StatsViewModel>({
  highScoreText: '0',
  accuracyText: '0.0%',
  avgTimeText: '0.00s',
  problemNotes: [],
});
const timerValueSignal = createSignal('60');
const scoreValueSignal = createSignal('0');
const timedInfoVisibleSignal = createSignal(false);
interface SessionButtonsState {
  startDisabled: boolean;
  stopDisabled: boolean;
  hintDisabled: boolean;
  playSoundDisabled: boolean;
}
const defaultSessionButtonsState: SessionButtonsState = {
  startDisabled: false,
  stopDisabled: true,
  hintDisabled: true,
  playSoundDisabled: true,
};
const sessionButtonsSignal = createSignal<SessionButtonsState>(defaultSessionButtonsState);
const tunerVisibleSignal = createSignal(false);
interface TunerReadingState {
  frequency: number | null;
  targetFrequency: number | null;
}
const tunerReadingSignal = createSignal<TunerReadingState>({
  frequency: null,
  targetFrequency: null,
});
const trainingModeUiSignal = createSignal('random');
interface LoadingViewState {
  isLoading: boolean;
  message: string;
}
const loadingViewSignal = createSignal<LoadingViewState>({
  isLoading: false,
  message: '',
});
type ModalKey = 'settings' | 'stats' | 'guide' | 'links' | 'profileName';
type ModalVisibilityState = Record<ModalKey, boolean>;
const modalVisibilitySignal = createSignal<ModalVisibilityState>({
  settings: false,
  stats: false,
  guide: false,
  links: false,
  profileName: false,
});
interface ProfileActionsState {
  updateDisabled: boolean;
  deleteDisabled: boolean;
}
const profileActionsSignal = createSignal<ProfileActionsState>({
  updateDisabled: true,
  deleteDisabled: true,
});
interface CalibrationViewState {
  isVisible: boolean;
  progressPercent: number;
  statusText: string;
}
const calibrationViewSignal = createSignal<CalibrationViewState>({
  isVisible: false,
  progressPercent: 0,
  statusText: 'Listening...',
});
interface InfoSlotsState {
  slot1: string;
  slot2: string;
  slot3: string;
}
const infoSlotsSignal = createSignal<InfoSlotsState>({ slot1: '', slot2: '', slot3: '' });
let isBound = false;

export function bindUiSignals() {
  if (isBound) return;
  isBound = true;

  statusTextSignal.subscribe((statusText) => {
    dom.statusBar.textContent = statusText;
  });

  promptTextSignal.subscribe((promptText) => {
    dom.prompt.textContent = promptText;
  });

  resultViewSignal.subscribe((resultView) => {
    dom.result.textContent = resultView.text;
    dom.result.classList.remove('text-green-400', 'text-red-400');
    if (resultView.tone === 'success') {
      dom.result.classList.add('text-green-400');
    } else if (resultView.tone === 'error') {
      dom.result.classList.add('text-red-400');
    }
  });

  volumeLevelSignal.subscribe((volumeLevel) => {
    const clampedPercent = Math.max(0, Math.min(100, volumeLevel * 500));
    dom.volumeBar.style.height = `${clampedPercent}%`;
  });

  statsViewSignal.subscribe((statsView) => {
    dom.statsHighScore.textContent = statsView.highScoreText;
    dom.statsAccuracy.textContent = statsView.accuracyText;
    dom.statsAvgTime.textContent = statsView.avgTimeText;

    dom.statsProblemNotes.innerHTML = '';
    if (statsView.problemNotes.length > 0) {
      statsView.problemNotes.forEach((note) => {
        const li = document.createElement('li');
        li.className = 'bg-slate-600 p-2 rounded';
        li.textContent = `${note.label} (Acc: ${(note.accuracy * 100).toFixed(0)}%, Time: ${note.avgTime.toFixed(2)}s)`;
        dom.statsProblemNotes.appendChild(li);
      });
      return;
    }

    dom.statsProblemNotes.innerHTML =
      '<li class="bg-slate-600 p-2 rounded">No data yet. Play a few rounds!</li>';
  });

  timerValueSignal.subscribe((timerValue) => {
    dom.timer.textContent = timerValue;
  });

  scoreValueSignal.subscribe((scoreValue) => {
    dom.score.textContent = scoreValue;
  });

  sessionButtonsSignal.subscribe(
    ({ startDisabled, stopDisabled, hintDisabled, playSoundDisabled }) => {
      dom.startBtn.disabled = startDisabled || loadingViewSignal.get().isLoading;
      dom.stopBtn.disabled = stopDisabled;
      dom.hintBtn.disabled = hintDisabled;
      dom.playSoundBtn.disabled = playSoundDisabled;
    }
  );

  tunerVisibleSignal.subscribe((isVisible) => {
    if (isVisible) {
      dom.tunerDisplay.classList.add('visible');
      dom.tunerDisplay.classList.remove('invisible', 'opacity-0');
    } else {
      dom.tunerDisplay.classList.remove('visible');
      dom.tunerDisplay.classList.add('invisible', 'opacity-0');
    }
  });

  tunerReadingSignal.subscribe(({ frequency, targetFrequency }) => {
    const needle = dom.tunerNeedle;
    const view = computeTunerView(frequency, targetFrequency, CENTS_TOLERANCE, CENTS_VISUAL_RANGE);

    needle.classList.remove('bg-green-500', 'bg-cyan-500', 'bg-red-500', 'bg-yellow-400');
    if (view.tone === 'inTune') {
      needle.classList.add('bg-green-500');
    } else if (view.tone === 'flat') {
      needle.classList.add('bg-cyan-500');
    } else if (view.tone === 'sharp') {
      needle.classList.add('bg-red-500');
    }

    needle.style.transform = `translateX(-50%) translateY(${view.translationPercent}%)`;
    dom.tunerCents.textContent = view.centsText;
  });

  trainingModeUiSignal.subscribe((mode) => {
    const visibility = getTrainingModeUiVisibility(mode);

    dom.scaleSelectorContainer.classList.toggle('hidden', !visibility.showScaleSelector);
    dom.chordSelectorContainer.classList.toggle('hidden', !visibility.showChordSelector);
    dom.progressionSelectorContainer.classList.toggle('hidden', !visibility.showProgressionSelector);
    dom.arpeggioPatternContainer.classList.toggle(
      'hidden',
      !visibility.showArpeggioPatternSelector
    );
    dom.hintBtn.style.display = visibility.showHintButton ? 'inline-block' : 'none';
  });

  loadingViewSignal.subscribe(({ isLoading, message }) => {
    dom.startBtn.disabled = sessionButtonsSignal.get().startDisabled || isLoading;
    dom.instrumentSelector.disabled = isLoading;
    dom.settingsBtn.disabled = isLoading;

    if (isLoading) {
      dom.loadingMessage.textContent = message;
      dom.loadingOverlay.classList.remove('hidden');
      dom.loadingOverlay.classList.add('flex');
      dom.loadingOverlay.setAttribute('aria-hidden', 'false');
      document.body.style.cursor = 'wait';
    } else {
      dom.loadingOverlay.classList.add('hidden');
      dom.loadingOverlay.classList.remove('flex');
      dom.loadingOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.cursor = 'default';
    }
  });

  modalVisibilitySignal.subscribe((visibility) => {
    if (visibility.settings) {
      dom.settingsModal.classList.remove('hidden');
    } else {
      dom.settingsModal.classList.add('hidden');
    }

    if (visibility.stats) {
      dom.statsModal.classList.remove('hidden');
    } else {
      dom.statsModal.classList.add('hidden');
    }

    if (visibility.guide) {
      dom.guideModal.classList.remove('hidden');
    } else {
      dom.guideModal.classList.add('hidden');
    }

    if (visibility.links) {
      dom.linksModal.classList.remove('hidden');
    } else {
      dom.linksModal.classList.add('hidden');
    }

    if (visibility.profileName) {
      dom.profileNameModal.classList.remove('hidden');
    } else {
      dom.profileNameModal.classList.add('hidden');
    }
  });

  profileActionsSignal.subscribe(({ updateDisabled, deleteDisabled }) => {
    dom.updateProfileBtn.disabled = updateDisabled;
    dom.deleteProfileBtn.disabled = deleteDisabled;
  });

  calibrationViewSignal.subscribe(({ isVisible, progressPercent, statusText }) => {
    dom.calibrationProgress.style.width = `${Math.max(0, Math.min(100, progressPercent))}%`;
    dom.calibrationStatus.textContent = statusText;
    if (isVisible) {
      dom.calibrationModal.classList.remove('hidden');
    } else {
      dom.calibrationModal.classList.add('hidden');
    }
  });

  timedInfoVisibleSignal.subscribe((isVisible) => {
    if (isVisible) {
      dom.timedInfo.classList.remove('hidden');
    } else {
      dom.timedInfo.classList.add('hidden');
    }
  });

  infoSlotsSignal.subscribe(({ slot1, slot2, slot3 }) => {
    dom.infoSlot1.textContent = slot1;
    dom.infoSlot2.textContent = slot2;
    dom.infoSlot3.textContent = slot3;
  });
}

export function setStatusText(statusText: string) {
  statusTextSignal.set(statusText);
}

export function getStatusText() {
  return statusTextSignal.get();
}

export function setPromptText(promptText: string) {
  promptTextSignal.set(promptText);
}

export function getPromptText() {
  return promptTextSignal.get();
}

export function setResultMessage(text: string, tone: ResultTone = 'neutral') {
  resultViewSignal.set({ text, tone });
}

export function clearResultMessage() {
  resultViewSignal.set({ text: '', tone: 'neutral' });
}

export function setVolumeLevel(volumeLevel: number) {
  volumeLevelSignal.set(volumeLevel);
}

export function setStatsView(statsView: StatsViewModel) {
  statsViewSignal.set(statsView);
}

export function setTimerValue(timerValue: number | string) {
  timerValueSignal.set(String(timerValue));
}

export function setScoreValue(scoreValue: number | string) {
  scoreValueSignal.set(String(scoreValue));
}

export function setTimedInfoVisible(isVisible: boolean) {
  timedInfoVisibleSignal.set(isVisible);
}

export function setInfoSlots(slot1 = '', slot2 = '', slot3 = '') {
  infoSlotsSignal.set({ slot1, slot2, slot3 });
}

export function setSessionButtonsState(partialState: Partial<SessionButtonsState>) {
  const currentState = sessionButtonsSignal.get();
  const nextState = { ...currentState, ...partialState };
  const isSame =
    currentState.startDisabled === nextState.startDisabled &&
    currentState.stopDisabled === nextState.stopDisabled &&
    currentState.hintDisabled === nextState.hintDisabled &&
    currentState.playSoundDisabled === nextState.playSoundDisabled;
  if (isSame) return;
  sessionButtonsSignal.set(nextState);
}

export function resetSessionButtonsState() {
  sessionButtonsSignal.set(defaultSessionButtonsState);
}

export function setTunerVisible(isVisible: boolean) {
  tunerVisibleSignal.set(isVisible);
}

export function setTunerReading(frequency: number | null, targetFrequency: number | null) {
  const currentState = tunerReadingSignal.get();
  if (currentState.frequency === frequency && currentState.targetFrequency === targetFrequency) {
    return;
  }
  tunerReadingSignal.set({ frequency, targetFrequency });
}

export function setTrainingModeUi(mode: string) {
  trainingModeUiSignal.set(mode);
}

export function setLoadingUi(isLoading: boolean, message = '') {
  loadingViewSignal.set({ isLoading, message });
}

export function setModalVisible(modal: ModalKey, isVisible: boolean) {
  const currentVisibility = modalVisibilitySignal.get();
  if (currentVisibility[modal] === isVisible) return;
  modalVisibilitySignal.set({
    ...currentVisibility,
    [modal]: isVisible,
  });
}

export function setProfileActionsState(updateDisabled: boolean, deleteDisabled: boolean) {
  const currentState = profileActionsSignal.get();
  if (
    currentState.updateDisabled === updateDisabled &&
    currentState.deleteDisabled === deleteDisabled
  ) {
    return;
  }
  profileActionsSignal.set({ updateDisabled, deleteDisabled });
}

function setCalibrationView(partialState: Partial<CalibrationViewState>) {
  const currentState = calibrationViewSignal.get();
  const nextState = { ...currentState, ...partialState };
  const isSame =
    currentState.isVisible === nextState.isVisible &&
    currentState.progressPercent === nextState.progressPercent &&
    currentState.statusText === nextState.statusText;
  if (isSame) return;
  calibrationViewSignal.set(nextState);
}

export function showCalibrationModal(statusText = 'Listening...') {
  calibrationViewSignal.set({
    isVisible: true,
    progressPercent: 0,
    statusText,
  });
}

export function hideCalibrationModal() {
  setCalibrationView({ isVisible: false });
}

export function setCalibrationProgress(progressPercent: number) {
  setCalibrationView({ progressPercent });
}

export function setCalibrationStatus(statusText: string) {
  setCalibrationView({ statusText });
}
