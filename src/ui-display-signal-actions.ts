import { renderSessionSummaryView, renderStatsView } from './ui-session-results-view';
import {
  renderFormattedSessionGoalProgress,
  renderMelodySetupSummary,
  renderPracticeSetupSummary,
  renderSessionToolsSummary,
} from './ui-session-display-view';
import { renderInfoSlots, renderPromptText, renderResultView, type ResultTone } from './ui-feedback-view';
import {
  infoSlotsSignal,
  melodySetupSummarySignal,
  practiceSetupSummarySignal,
  promptTextSignal,
  resultViewSignal,
  scoreValueSignal,
  sessionGoalProgressSignal,
  sessionSummaryViewSignal,
  sessionToolsSummarySignal,
  statsViewSignal,
  statusTextSignal,
  timerValueSignal,
  tunerReadingSignal,
  tunerVisibleSignal,
  volumeLevelSignal,
} from './ui-signal-store';
import type { LastSessionViewModel, StatsViewModel } from './stats-view';

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

export function setSessionSummaryView(sessionSummary: LastSessionViewModel | null) {
  sessionSummaryViewSignal.set(sessionSummary);
}

export function setTimerValue(timerValue: number | string) {
  timerValueSignal.set(String(timerValue));
}

export function setScoreValue(scoreValue: number | string) {
  scoreValueSignal.set(String(scoreValue));
}

export function setSessionGoalProgress(text: string) {
  sessionGoalProgressSignal.set(text);
}

export function clearSessionGoalProgress() {
  sessionGoalProgressSignal.set('');
}

export function setPracticeSetupSummary(summaryText: string) {
  practiceSetupSummarySignal.set(summaryText);
}

export function setMelodySetupSummary(summaryText: string) {
  melodySetupSummarySignal.set(summaryText);
}

export function setSessionToolsSummary(summaryText: string) {
  sessionToolsSummarySignal.set(summaryText);
}

export function setInfoSlots(slot1 = '', slot2 = '', slot3 = '') {
  infoSlotsSignal.set({ slot1, slot2, slot3 });
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

export function refreshDisplayFormatting() {
  renderPromptText(promptTextSignal.get());
  renderResultView(resultViewSignal.get());
  renderInfoSlots(infoSlotsSignal.get());
  renderStatsView(statsViewSignal.get());
  renderSessionSummaryView(sessionSummaryViewSignal.get());
  renderPracticeSetupSummary(practiceSetupSummarySignal.get());
  renderMelodySetupSummary(melodySetupSummarySignal.get());
  renderSessionToolsSummary(sessionToolsSummarySignal.get());
  renderFormattedSessionGoalProgress(sessionGoalProgressSignal.get());
  void timerValueSignal;
  void scoreValueSignal;
  void tunerVisibleSignal;
  void tunerReadingSignal;
}
