import { createSignal } from './reactive/signal';
import type { UiWorkflow } from './training-workflows';
import type { UiMode } from './ui-mode';
import type { LastSessionViewModel, StatsViewModel } from './stats-view';
import type { LoadingViewState } from './ui-loading-view';
import type {
  CalibrationViewState,
  ModalVisibilityState,
  ProfileActionsState,
} from './ui-modal-views';
import type { TunerReadingState } from './ui-monitoring-view';
import type { InfoSlotsState, ResultViewState } from './ui-feedback-view';

export interface SessionButtonsState {
  startDisabled: boolean;
  stopDisabled: boolean;
  hintDisabled: boolean;
  playSoundDisabled: boolean;
}

export const defaultSessionButtonsState: SessionButtonsState = {
  startDisabled: false,
  stopDisabled: true,
  hintDisabled: true,
  playSoundDisabled: true,
};

export const statusTextSignal = createSignal('Ready');
export const promptTextSignal = createSignal('');
export const resultViewSignal = createSignal<ResultViewState>({ text: '', tone: 'neutral' });
export const volumeLevelSignal = createSignal(0);
export const statsViewSignal = createSignal<StatsViewModel>({
  highScoreText: '0',
  accuracyText: '0.0%',
  avgTimeText: '0.00s',
  problemNotes: [],
  lastSession: null,
});
export const sessionSummaryViewSignal = createSignal<LastSessionViewModel | null>(null);
export const timerValueSignal = createSignal('60');
export const scoreValueSignal = createSignal('0');
export const timedInfoVisibleSignal = createSignal(false);
export const sessionGoalProgressSignal = createSignal('');
export const practiceSetupCollapsedSignal = createSignal(false);
export const melodySetupCollapsedSignal = createSignal(false);
export const sessionToolsCollapsedSignal = createSignal(true);
export const layoutControlsExpandedSignal = createSignal(false);
export const practiceSetupSummarySignal = createSignal('');
export const melodySetupSummarySignal = createSignal('');
export const sessionToolsSummarySignal = createSignal('');
export const sessionButtonsSignal = createSignal<SessionButtonsState>(defaultSessionButtonsState);
export const tunerVisibleSignal = createSignal(false);
export const tunerReadingSignal = createSignal<TunerReadingState>({
  frequency: null,
  targetFrequency: null,
});
export const trainingModeUiSignal = createSignal('random');
export const uiWorkflowSignal = createSignal<UiWorkflow>('learn-notes');
export const uiModeSignal = createSignal<UiMode>('simple');
export const loadingViewSignal = createSignal<LoadingViewState>({
  isLoading: false,
  message: '',
});
export const modalVisibilitySignal = createSignal<ModalVisibilityState>({
  onboarding: false,
  settings: false,
  userData: false,
  help: false,
  quickHelp: false,
  sessionSummary: false,
  stats: false,
  guide: false,
  links: false,
  profileName: false,
  melodyImport: false,
});
export const profileActionsSignal = createSignal<ProfileActionsState>({
  updateDisabled: true,
  deleteDisabled: true,
});
export const calibrationViewSignal = createSignal<CalibrationViewState>({
  isVisible: false,
  progressPercent: 0,
  statusText: 'Listening...',
});
export const infoSlotsSignal = createSignal<InfoSlotsState>({ slot1: '', slot2: '', slot3: '' });

export interface UiSignalBindingRuntimeState {
  previousSessionActive: boolean;
  wasAutoCollapsedForSession: boolean;
  wasAutoCollapsedMelodySetupForSession: boolean;
  wasAutoCollapsedSessionToolsForSession: boolean;
}

export const uiSignalBindingRuntimeState: UiSignalBindingRuntimeState = {
  previousSessionActive: false,
  wasAutoCollapsedForSession: false,
  wasAutoCollapsedMelodySetupForSession: false,
  wasAutoCollapsedSessionToolsForSession: false,
};
