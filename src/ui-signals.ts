import { dom } from './state';
import { createSignal } from './reactive/signal';
import { CENTS_TOLERANCE, CENTS_VISUAL_RANGE } from './constants';
import { computeTunerView } from './tuner-view';
import { getTrainingModeUiVisibility } from './training-mode-ui';
import { isMelodyWorkflowMode } from './training-mode-groups';
import type { LastSessionHeatmapView, StatsViewModel } from './stats-view';
import { formatMusicText } from './note-display';

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
  lastSession: null,
});
const timerValueSignal = createSignal('60');
const scoreValueSignal = createSignal('0');
const timedInfoVisibleSignal = createSignal(false);
const sessionGoalProgressSignal = createSignal('');
const practiceSetupCollapsedSignal = createSignal(false);
const melodySetupCollapsedSignal = createSignal(false);
const sessionToolsCollapsedSignal = createSignal(true);
const practiceSetupSummarySignal = createSignal('');
const melodySetupSummarySignal = createSignal('');
const sessionToolsSummarySignal = createSignal('');
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
type ModalKey = 'settings' | 'stats' | 'guide' | 'links' | 'profileName' | 'melodyImport';
type ModalVisibilityState = Record<ModalKey, boolean>;
const modalVisibilitySignal = createSignal<ModalVisibilityState>({
  settings: false,
  stats: false,
  guide: false,
  links: false,
  profileName: false,
  melodyImport: false,
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
let previousSessionActive = false;
let wasAutoCollapsedForSession = false;
let wasAutoCollapsedMelodySetupForSession = false;
let wasAutoCollapsedSessionToolsForSession = false;

function renderPromptText(promptText: string) {
  dom.prompt.textContent = formatMusicText(promptText);
}

function renderResultView(resultView: ResultViewState) {
  dom.result.textContent = formatMusicText(resultView.text);
  dom.result.classList.remove('text-green-400', 'text-red-400');
  if (resultView.tone === 'success') {
    dom.result.classList.add('text-green-400');
  } else if (resultView.tone === 'error') {
    dom.result.classList.add('text-red-400');
  }
  syncSessionInlineFeedbackDividerVisibility();
}

function renderInfoSlots({ slot1, slot2, slot3 }: InfoSlotsState) {
  dom.infoSlot1.textContent = formatMusicText(slot1);
  dom.infoSlot2.textContent = formatMusicText(slot2);
  dom.infoSlot3.textContent = formatMusicText(slot3);
  syncSessionInlineFeedbackDividerVisibility();
}

function syncSessionInlineFeedbackDividerVisibility() {
  const hasResultText = (dom.result.textContent?.trim().length ?? 0) > 0;
  const hasInfoText = [
    dom.infoSlot1.textContent,
    dom.infoSlot2.textContent,
    dom.infoSlot3.textContent,
  ].some((text) => (text?.trim().length ?? 0) > 0);
  const hasAnyText = hasResultText || hasInfoText;

  // Show the divider only when both sides have content.
  dom.sessionInlineDivider.classList.toggle('hidden', !hasResultText || !hasInfoText);
  dom.sessionInlineFeedback.classList.toggle('opacity-60', !hasAnyText);
}

function setPanelToggleVisualState(button: HTMLButtonElement, expanded: boolean) {
  button.classList.toggle('bg-slate-700', expanded);
  button.classList.toggle('text-white', expanded);
  button.classList.toggle('shadow-inner', expanded);
  button.classList.toggle('shadow-black/20', expanded);
  button.classList.toggle('bg-transparent', !expanded);
  button.classList.toggle('text-slate-300', !expanded);
  button.classList.toggle('hover:bg-slate-800/70', !expanded);
}

function renderPracticeSetupCollapsed(collapsed: boolean) {
  dom.practiceSetupPanel.classList.toggle('hidden', collapsed);
  dom.practiceSetupPanel.style.display = collapsed ? 'none' : 'flex';
  dom.practiceSetupToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  dom.practiceSetupChevron.textContent = collapsed ? '>' : 'v';
  setPanelToggleVisualState(dom.practiceSetupToggleBtn, !collapsed);
}

function renderMelodySetupCollapsed(collapsed: boolean) {
  if (dom.melodySetupToggleBtn.classList.contains('hidden')) {
    dom.melodySetupPanel.classList.add('hidden');
    dom.melodySetupPanel.style.display = 'none';
    dom.melodySetupToggleBtn.setAttribute('aria-expanded', 'false');
    dom.melodySetupChevron.textContent = '>';
    setPanelToggleVisualState(dom.melodySetupToggleBtn, false);
    return;
  }
  dom.melodySetupPanel.classList.toggle('hidden', collapsed);
  dom.melodySetupPanel.style.display = collapsed ? 'none' : 'flex';
  dom.melodySetupToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  dom.melodySetupChevron.textContent = collapsed ? '>' : 'v';
  setPanelToggleVisualState(dom.melodySetupToggleBtn, !collapsed);
}

function renderSessionToolsCollapsed(collapsed: boolean) {
  if (dom.sessionToolsToggleBtn.classList.contains('hidden')) {
    dom.sessionToolsPanel.classList.add('hidden');
    dom.sessionToolsPanel.style.display = 'none';
    dom.sessionToolsToggleBtn.setAttribute('aria-expanded', 'false');
    dom.sessionToolsChevron.textContent = '>';
    setPanelToggleVisualState(dom.sessionToolsToggleBtn, false);
    return;
  }
  dom.sessionToolsPanel.classList.toggle('hidden', collapsed);
  dom.sessionToolsPanel.style.display = collapsed ? 'none' : 'flex';
  dom.sessionToolsToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  dom.sessionToolsChevron.textContent = collapsed ? '>' : 'v';
  setPanelToggleVisualState(dom.sessionToolsToggleBtn, !collapsed);
}

function renderSessionToolsModeVisibility(mode: string) {
  const hideSessionTools = mode === 'rhythm';
  const hideShowAllNotes = mode === 'free' || mode === 'rhythm';
  dom.sessionToolsToggleBtn.classList.toggle('hidden', hideSessionTools);
  dom.sessionToolsSummary.style.display =
    hideSessionTools || sessionToolsSummarySignal.get().length === 0 ? 'none' : '';
  if (hideSessionTools) {
    dom.sessionToolsPanel.classList.add('hidden');
    dom.sessionToolsPanel.style.display = 'none';
    dom.sessionToolsToggleBtn.setAttribute('aria-expanded', 'false');
    dom.sessionToolsChevron.textContent = '>';
    setPanelToggleVisualState(dom.sessionToolsToggleBtn, false);
  }

  dom.sessionToolsShowAllNotesRow.classList.toggle('hidden', hideShowAllNotes);
  dom.sessionToolsActiveStringsSection.classList.toggle('hidden', false);
  dom.sessionToolsPrimaryControls.classList.toggle('opacity-80', mode === 'free');
}

function renderMelodySetupModeVisibility(mode: string) {
  const showMelodySetup = isMelodyWorkflowMode(mode);
  dom.melodySetupToggleBtn.classList.toggle('hidden', !showMelodySetup);
  dom.melodySetupSummary.style.display =
    !showMelodySetup || melodySetupSummarySignal.get().length === 0 ? 'none' : '';
  if (!showMelodySetup) {
    dom.melodySetupPanel.classList.add('hidden');
    dom.melodySetupPanel.style.display = 'none';
    dom.melodySetupToggleBtn.setAttribute('aria-expanded', 'false');
    dom.melodySetupChevron.textContent = '>';
    setPanelToggleVisualState(dom.melodySetupToggleBtn, false);
  }
}

function renderPracticeSetupSummary(summaryText: string) {
  dom.practiceSetupSummary.textContent = summaryText;
  dom.practiceSetupSummary.title = summaryText;
  dom.practiceSetupSummary.removeAttribute('title');
  dom.practiceSetupToggleBtn.dataset.summaryTooltip = summaryText;
  dom.practiceSetupPanel.dataset.summaryTooltip = summaryText;
  dom.practiceSetupToggleBtn.removeAttribute('title');
  dom.practiceSetupPanel.removeAttribute('title');
}

function renderMelodySetupSummary(summaryText: string) {
  dom.melodySetupSummary.textContent = summaryText;
  dom.melodySetupSummary.title = summaryText;
  dom.melodySetupSummary.removeAttribute('title');
  dom.melodySetupToggleBtn.dataset.summaryTooltip = summaryText;
  dom.melodySetupPanel.dataset.summaryTooltip = summaryText;
  dom.melodySetupToggleBtn.removeAttribute('title');
  dom.melodySetupPanel.removeAttribute('title');
  dom.melodySetupSummary.style.display =
    dom.melodySetupToggleBtn.classList.contains('hidden') || summaryText.length === 0 ? 'none' : '';
}

function renderSessionToolsSummary(summaryText: string) {
  dom.sessionToolsSummary.textContent = summaryText;
  dom.sessionToolsSummary.title = summaryText;
  dom.sessionToolsSummary.removeAttribute('title');
  dom.sessionToolsToggleBtn.dataset.summaryTooltip = summaryText;
  dom.sessionToolsPanel.dataset.summaryTooltip = summaryText;
  dom.sessionToolsToggleBtn.removeAttribute('title');
  dom.sessionToolsPanel.removeAttribute('title');
  dom.sessionToolsSummary.style.display =
    dom.sessionToolsToggleBtn.classList.contains('hidden') || summaryText.length === 0 ? 'none' : '';
}

function createHeatmapCellColor(intensity: number, hasErrors: boolean) {
  if (!hasErrors) return 'rgba(30, 41, 59, 0.55)'; // slate-800-ish
  const alpha = 0.2 + Math.max(0, Math.min(1, intensity)) * 0.75;
  return `rgba(239, 68, 68, ${alpha})`; // red-500 ramp
}

function renderLastSessionHeatmap(heatmap: LastSessionHeatmapView | null) {
  if (!heatmap) {
    dom.statsLastSessionHeatmap.innerHTML =
      '<div class="text-center text-xs text-slate-400">Heatmap appears after string-specific note practice.</div>';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'inline-grid gap-1 min-w-max';
  wrapper.style.gridTemplateColumns = `auto repeat(${heatmap.frets.length}, minmax(22px, 1fr))`;

  const corner = document.createElement('div');
  corner.className = 'w-8 h-6';
  wrapper.appendChild(corner);

  for (const fret of heatmap.frets) {
    const headerCell = document.createElement('div');
    headerCell.className =
      'h-6 min-w-[22px] text-[10px] leading-6 text-center text-slate-400 font-semibold';
    headerCell.textContent = String(fret);
    wrapper.appendChild(headerCell);
  }

  for (const stringName of heatmap.strings) {
    const rowLabel = document.createElement('div');
    rowLabel.className =
      'w-8 h-6 text-[10px] leading-6 text-right pr-1 text-slate-300 font-semibold';
    rowLabel.textContent = stringName;
    wrapper.appendChild(rowLabel);

    for (const fret of heatmap.frets) {
      const key = `${stringName}:${fret}`;
      const cell = heatmap.cells[key];
      const incorrect = cell?.incorrect ?? 0;
      const attempts = cell?.attempts ?? 0;
      const hasErrors = incorrect > 0;

      const heatCell = document.createElement('div');
      heatCell.className =
        'w-[22px] h-[22px] rounded-[4px] border border-slate-600/80 flex items-center justify-center text-[9px] font-semibold';
      heatCell.style.backgroundColor = createHeatmapCellColor(cell?.intensity ?? 0, hasErrors);
      heatCell.style.color = hasErrors ? '#fee2e2' : attempts > 0 ? '#cbd5e1' : '#64748b';
      heatCell.textContent = attempts > 0 ? String(incorrect) : '';

      if (cell) {
        const accuracyPercent = (cell.accuracy * 100).toFixed(0);
        heatCell.title = `${stringName} string, fret ${fret}: ${cell.correct}/${cell.attempts} correct (${accuracyPercent}% accuracy)`;
      } else {
        heatCell.title = `${stringName} string, fret ${fret}: not targeted in last session`;
      }

      wrapper.appendChild(heatCell);
    }
  }

  dom.statsLastSessionHeatmap.innerHTML = '';
  dom.statsLastSessionHeatmap.appendChild(wrapper);

  const legend = document.createElement('div');
  legend.className = 'mt-2 text-[10px] text-slate-400 text-center';
  legend.textContent =
    heatmap.maxIncorrect > 0
      ? `Cell number = wrong attempts for that target position (max ${heatmap.maxIncorrect}).`
      : 'No mistakes in targeted string-specific positions for the last session.';
  dom.statsLastSessionHeatmap.appendChild(legend);
}

function renderStatsView(statsView: StatsViewModel) {
  dom.statsHighScore.textContent = statsView.highScoreText;
  dom.statsAccuracy.textContent = statsView.accuracyText;
  dom.statsAvgTime.textContent = statsView.avgTimeText;
  dom.repeatLastSessionBtn.disabled = !statsView.lastSession;

  dom.statsProblemNotes.innerHTML = '';
  if (statsView.problemNotes.length > 0) {
    statsView.problemNotes.forEach((note) => {
      const li = document.createElement('li');
      li.className = 'bg-slate-600 p-2 rounded';
      li.textContent = formatMusicText(
        `${note.label} (Acc: ${(note.accuracy * 100).toFixed(0)}%, Time: ${note.avgTime.toFixed(2)}s)`
      );
      dom.statsProblemNotes.appendChild(li);
    });
  } else {
    dom.statsProblemNotes.innerHTML =
      '<li class="bg-slate-600 p-2 rounded">No data yet. Play a few rounds!</li>';
  }

  if (statsView.lastSession) {
    dom.statsLastSessionSection.classList.remove('hidden');
    dom.statsLastSessionMode.textContent = formatMusicText(statsView.lastSession.modeLabel);
    dom.statsLastSessionInput.textContent = statsView.lastSession.inputText;
    dom.statsLastSessionInput.title = statsView.lastSession.inputText;
    dom.statsLastSessionDuration.textContent = statsView.lastSession.durationText;
    dom.statsLastSessionAttempts.textContent = statsView.lastSession.attemptsText;
    dom.statsLastSessionAccuracy.textContent = statsView.lastSession.accuracyText;
    dom.statsLastSessionAvgTime.textContent = statsView.lastSession.avgTimeText;
    dom.statsLastSessionBestStreak.textContent = statsView.lastSession.bestStreakText;
    dom.statsLastSessionCoachTip.textContent = formatMusicText(statsView.lastSession.coachTipText ?? '');

    dom.statsLastSessionWeakSpots.innerHTML = '';
    if (statsView.lastSession.weakSpots.length > 0) {
      statsView.lastSession.weakSpots.forEach((note) => {
        const li = document.createElement('li');
        li.className = 'bg-slate-600 p-2 rounded';
        li.textContent = formatMusicText(
          `${note.label} (Acc: ${(note.accuracy * 100).toFixed(0)}%, Time: ${note.avgTime.toFixed(2)}s)`
        );
        dom.statsLastSessionWeakSpots.appendChild(li);
      });
    } else {
      dom.statsLastSessionWeakSpots.innerHTML =
        '<li class="bg-slate-600 p-2 rounded">No graded note attempts in the last session.</li>';
    }

    if (statsView.lastSession.rhythmSummary) {
      dom.statsLastSessionRhythmSummary.classList.remove('hidden');
      dom.statsRhythmOnBeat.textContent = statsView.lastSession.rhythmSummary.onBeatText;
      dom.statsRhythmEarly.textContent = statsView.lastSession.rhythmSummary.earlyText;
      dom.statsRhythmLate.textContent = statsView.lastSession.rhythmSummary.lateText;
      dom.statsRhythmAvgOffset.textContent = statsView.lastSession.rhythmSummary.avgOffsetText;
      dom.statsRhythmBestOffset.textContent = statsView.lastSession.rhythmSummary.bestOffsetText;
    } else {
      dom.statsLastSessionRhythmSummary.classList.add('hidden');
    }
    renderLastSessionHeatmap(statsView.lastSession.heatmap);
  } else {
    dom.statsLastSessionSection.classList.add('hidden');
    dom.statsLastSessionRhythmSummary.classList.add('hidden');
  }
}

function syncSessionToggleButton() {
  const { startDisabled, stopDisabled } = sessionButtonsSignal.get();
  const { isLoading } = loadingViewSignal.get();
  const isStopMode = !stopDisabled;

  dom.sessionToggleBtn.textContent = isStopMode ? 'Stop Session' : 'Start Session';
  dom.sessionToggleBtn.setAttribute(
    'aria-label',
    isStopMode ? 'Stop current session' : 'Start a new session'
  );
  dom.sessionToggleBtn.disabled = isStopMode ? stopDisabled : startDisabled || isLoading;
  dom.sessionToggleBtn.classList.toggle('bg-red-600', isStopMode);
  dom.sessionToggleBtn.classList.toggle('hover:bg-red-700', isStopMode);
  dom.sessionToggleBtn.classList.toggle('bg-blue-600', !isStopMode);
  dom.sessionToggleBtn.classList.toggle('hover:bg-blue-700', !isStopMode);
}

export function bindUiSignals() {
  if (isBound) return;
  isBound = true;

  statusTextSignal.subscribe((statusText) => {
    dom.statusBar.textContent = statusText;
  });

  promptTextSignal.subscribe((promptText) => {
    renderPromptText(promptText);
  });

  resultViewSignal.subscribe((resultView) => {
    renderResultView(resultView);
  });

  volumeLevelSignal.subscribe((volumeLevel) => {
    const clampedPercent = Math.max(0, Math.min(100, volumeLevel * 500));
    dom.volumeBar.style.height = `${clampedPercent}%`;
  });

  statsViewSignal.subscribe((statsView) => {
    renderStatsView(statsView);
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

      const sessionActive = !stopDisabled;
      const isCurrentlyCollapsed = practiceSetupCollapsedSignal.get();
      const isMelodySetupCollapsed = melodySetupCollapsedSignal.get();
      const isSessionToolsCollapsed = sessionToolsCollapsedSignal.get();
      if (sessionActive && !previousSessionActive) {
        if (!isCurrentlyCollapsed) {
          wasAutoCollapsedForSession = true;
          practiceSetupCollapsedSignal.set(true);
        } else {
          wasAutoCollapsedForSession = false;
        }
        if (
          !dom.melodySetupToggleBtn.classList.contains('hidden') &&
          !isMelodySetupCollapsed
        ) {
          wasAutoCollapsedMelodySetupForSession = true;
          melodySetupCollapsedSignal.set(true);
        } else {
          wasAutoCollapsedMelodySetupForSession = false;
        }
        if (!isSessionToolsCollapsed) {
          wasAutoCollapsedSessionToolsForSession = true;
          sessionToolsCollapsedSignal.set(true);
        } else {
          wasAutoCollapsedSessionToolsForSession = false;
        }
      } else if (!sessionActive && previousSessionActive) {
        if (wasAutoCollapsedForSession) {
          practiceSetupCollapsedSignal.set(false);
        }
        if (wasAutoCollapsedMelodySetupForSession) {
          melodySetupCollapsedSignal.set(false);
        }
        if (wasAutoCollapsedSessionToolsForSession) {
          sessionToolsCollapsedSignal.set(false);
        }
        wasAutoCollapsedForSession = false;
        wasAutoCollapsedMelodySetupForSession = false;
        wasAutoCollapsedSessionToolsForSession = false;
      }
      previousSessionActive = sessionActive;

      syncSessionToggleButton();
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

    dom.melodySelectorContainer.classList.toggle('hidden', !visibility.showMelodySelector);
    dom.melodySelectorContainer.style.display = visibility.showMelodySelector ? 'flex' : 'none';
    dom.melodyPlaybackControls.classList.toggle('hidden', !visibility.showMelodySelector);
    dom.melodyDemoQuickControls.classList.toggle('hidden', !visibility.showMelodySelector);
    dom.scaleSelectorContainer.classList.toggle('hidden', !visibility.showScaleSelector);
    dom.chordSelectorContainer.classList.toggle('hidden', !visibility.showChordSelector);
    dom.progressionSelectorContainer.classList.toggle('hidden', !visibility.showProgressionSelector);
    dom.arpeggioPatternContainer.classList.toggle(
      'hidden',
      !visibility.showArpeggioPatternSelector
    );
    dom.hintBtn.style.display = visibility.showHintButton ? 'inline-block' : 'none';
    dom.volumeSection.classList.toggle('hidden', !visibility.showFretboardMonitoring);
    dom.tunerSection.classList.toggle('hidden', !visibility.showFretboardMonitoring);
    dom.metronomeQuickControls.classList.toggle('hidden', mode !== 'rhythm');
    renderMelodySetupModeVisibility(mode);
    renderSessionToolsModeVisibility(mode);
    dom.trainingModeField.dataset.fieldHint =
      visibility.helperText.length > 0 ? `Mode. ${visibility.helperText}` : 'Mode';
    dom.modeHelpText.textContent = visibility.helperText;
    dom.modeHelpText.classList.add('hidden');
    dom.modeHelpText.setAttribute('aria-hidden', 'true');
  });

  loadingViewSignal.subscribe(({ isLoading, message }) => {
    dom.startBtn.disabled = sessionButtonsSignal.get().startDisabled || isLoading;
    dom.instrumentSelector.disabled = isLoading;
    dom.settingsBtn.disabled = isLoading;
    syncSessionToggleButton();

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

    if (visibility.melodyImport) {
      dom.melodyImportModal.classList.remove('hidden');
    } else {
      dom.melodyImportModal.classList.add('hidden');
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

  sessionGoalProgressSignal.subscribe((text) => {
    dom.sessionGoalProgress.textContent = text;
    dom.sessionGoalProgress.classList.toggle('hidden', text.length === 0);
  });

  infoSlotsSignal.subscribe((infoSlots) => {
    renderInfoSlots(infoSlots);
  });

  practiceSetupCollapsedSignal.subscribe((collapsed) => {
    renderPracticeSetupCollapsed(collapsed);
  });

  melodySetupCollapsedSignal.subscribe((collapsed) => {
    renderMelodySetupCollapsed(collapsed);
  });

  sessionToolsCollapsedSignal.subscribe((collapsed) => {
    renderSessionToolsCollapsed(collapsed);
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

  syncSessionToggleButton();
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

export function setSessionGoalProgress(text: string) {
  sessionGoalProgressSignal.set(text);
}

export function clearSessionGoalProgress() {
  sessionGoalProgressSignal.set('');
}

export function setPracticeSetupCollapsed(collapsed: boolean) {
  practiceSetupCollapsedSignal.set(collapsed);
}

export function togglePracticeSetupCollapsed() {
  practiceSetupCollapsedSignal.set(!practiceSetupCollapsedSignal.get());
}

export function setMelodySetupCollapsed(collapsed: boolean) {
  melodySetupCollapsedSignal.set(collapsed);
}

export function toggleMelodySetupCollapsed() {
  melodySetupCollapsedSignal.set(!melodySetupCollapsedSignal.get());
}

export function setSessionToolsCollapsed(collapsed: boolean) {
  sessionToolsCollapsedSignal.set(collapsed);
}

export function toggleSessionToolsCollapsed() {
  sessionToolsCollapsedSignal.set(!sessionToolsCollapsedSignal.get());
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

export function refreshDisplayFormatting() {
  renderPromptText(promptTextSignal.get());
  renderResultView(resultViewSignal.get());
  renderInfoSlots(infoSlotsSignal.get());
  renderStatsView(statsViewSignal.get());
  renderPracticeSetupSummary(practiceSetupSummarySignal.get());
  renderMelodySetupSummary(melodySetupSummarySignal.get());
  renderSessionToolsSummary(sessionToolsSummarySignal.get());
  const goalProgressText = formatMusicText(sessionGoalProgressSignal.get());
  dom.sessionGoalProgress.textContent = goalProgressText;
  dom.sessionGoalProgress.classList.toggle('hidden', goalProgressText.length === 0);
}
