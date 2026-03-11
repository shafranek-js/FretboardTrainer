import type { Signal } from './reactive/signal';
import type { LastSessionViewModel, StatsViewModel } from './stats-view';
import type {
  CalibrationViewState,
  ModalVisibilityState,
  ProfileActionsState,
} from './ui-modal-views';
import type { TunerReadingState } from './ui-monitoring-view';
import type { InfoSlotsState, ResultViewState } from './ui-feedback-view';

interface BindUiRenderSignalsDeps {
  statusTextSignal: Signal<string>;
  promptTextSignal: Signal<string>;
  resultViewSignal: Signal<ResultViewState>;
  volumeLevelSignal: Signal<number>;
  statsViewSignal: Signal<StatsViewModel>;
  sessionSummaryViewSignal: Signal<LastSessionViewModel | null>;
  timerValueSignal: Signal<string>;
  scoreValueSignal: Signal<string>;
  tunerVisibleSignal: Signal<boolean>;
  tunerReadingSignal: Signal<TunerReadingState>;
  modalVisibilitySignal: Signal<ModalVisibilityState>;
  profileActionsSignal: Signal<ProfileActionsState>;
  calibrationViewSignal: Signal<CalibrationViewState>;
  sessionGoalProgressSignal: Signal<string>;
  infoSlotsSignal: Signal<InfoSlotsState>;
  practiceSetupSummarySignal: Signal<string>;
  melodySetupSummarySignal: Signal<string>;
  sessionToolsSummarySignal: Signal<string>;
  renderStatusText: (statusText: string) => void;
  renderResultView: (resultView: ResultViewState) => void;
  renderVolumeLevel: (volumeLevel: number) => void;
  renderStatsView: (statsView: StatsViewModel) => void;
  renderSessionSummaryView: (sessionSummary: LastSessionViewModel | null) => void;
  renderTimerValue: (timerValue: string) => void;
  renderScoreValue: (scoreValue: string) => void;
  renderTunerVisibility: (isVisible: boolean) => void;
  renderTunerReading: (reading: TunerReadingState) => void;
  syncModalUiState: (visibility: ModalVisibilityState) => void;
  syncProfileActionsUiState: (state: ProfileActionsState) => void;
  syncCalibrationUiState: (state: CalibrationViewState) => void;
  renderSessionGoalProgress: (text: string) => void;
  renderInfoSlots: (infoSlots: InfoSlotsState) => void;
  renderPracticeSetupSummary: (summaryText: string) => void;
  renderMelodySetupSummary: (summaryText: string) => void;
  renderSessionToolsSummary: (summaryText: string) => void;
}

export function bindUiRenderSignals({
  statusTextSignal,
  promptTextSignal: _promptTextSignal,
  resultViewSignal,
  volumeLevelSignal,
  statsViewSignal,
  sessionSummaryViewSignal,
  timerValueSignal,
  scoreValueSignal,
  tunerVisibleSignal,
  tunerReadingSignal,
  modalVisibilitySignal,
  profileActionsSignal,
  calibrationViewSignal,
  sessionGoalProgressSignal,
  infoSlotsSignal,
  practiceSetupSummarySignal,
  melodySetupSummarySignal,
  sessionToolsSummarySignal,
  renderStatusText,
  renderResultView,
  renderVolumeLevel,
  renderStatsView,
  renderSessionSummaryView,
  renderTimerValue,
  renderScoreValue,
  renderTunerVisibility,
  renderTunerReading,
  syncModalUiState,
  syncProfileActionsUiState,
  syncCalibrationUiState,
  renderSessionGoalProgress,
  renderInfoSlots,
  renderPracticeSetupSummary,
  renderMelodySetupSummary,
  renderSessionToolsSummary,
}: BindUiRenderSignalsDeps) {
  void _promptTextSignal;
  statusTextSignal.subscribe((statusText) => {
    renderStatusText(statusText);
  });

  resultViewSignal.subscribe((resultView) => {
    renderResultView(resultView);
  });

  volumeLevelSignal.subscribe((volumeLevel) => {
    renderVolumeLevel(volumeLevel);
  });

  statsViewSignal.subscribe((statsView) => {
    renderStatsView(statsView);
  });

  sessionSummaryViewSignal.subscribe((sessionSummary) => {
    renderSessionSummaryView(sessionSummary);
  });

  timerValueSignal.subscribe((timerValue) => {
    renderTimerValue(timerValue);
  });

  scoreValueSignal.subscribe((scoreValue) => {
    renderScoreValue(scoreValue);
  });

  tunerVisibleSignal.subscribe((isVisible) => {
    renderTunerVisibility(isVisible);
  });

  tunerReadingSignal.subscribe(({ frequency, targetFrequency }) => {
    renderTunerReading({ frequency, targetFrequency });
  });

  modalVisibilitySignal.subscribe((visibility) => {
    syncModalUiState(visibility);
  });

  profileActionsSignal.subscribe(({ updateDisabled, deleteDisabled }) => {
    syncProfileActionsUiState({ updateDisabled, deleteDisabled });
  });

  calibrationViewSignal.subscribe(({ isVisible, progressPercent, statusText }) => {
    syncCalibrationUiState({ isVisible, progressPercent, statusText });
  });

  sessionGoalProgressSignal.subscribe((text) => {
    renderSessionGoalProgress(text);
  });

  infoSlotsSignal.subscribe((infoSlots) => {
    renderInfoSlots(infoSlots);
  });

  practiceSetupSummarySignal.subscribe((summaryText) => {
    renderPracticeSetupSummary(summaryText);
  });

  melodySetupSummarySignal.subscribe((summaryText) => {
    renderMelodySetupSummary(summaryText);
  });

  sessionToolsSummarySignal.subscribe((summaryText) => {
    renderSessionToolsSummary(summaryText);
  });
}
