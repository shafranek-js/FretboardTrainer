import { dom } from './dom';
import { formatMusicText } from './note-display';
import type { LastSessionHeatmapView, LastSessionViewModel, StatsViewModel } from './stats-view';

function createHeatmapCellColor(intensity: number, hasErrors: boolean) {
  if (!hasErrors) return 'rgba(30, 41, 59, 0.55)';
  const alpha = 0.2 + Math.max(0, Math.min(1, intensity)) * 0.75;
  return `rgba(239, 68, 68, ${alpha})`;
}

function createProblemNoteListItem(text: string) {
  const li = document.createElement('li');
  li.className = 'bg-slate-600 p-2 rounded';
  li.textContent = text;
  return li;
}

export function renderLastSessionHeatmap(heatmap: LastSessionHeatmapView | null) {
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

export function renderStatsView(statsView: StatsViewModel) {
  dom.statsHighScore.textContent = statsView.highScoreText;
  dom.statsAccuracy.textContent = statsView.accuracyText;
  dom.statsAvgTime.textContent = statsView.avgTimeText;
  dom.repeatLastSessionBtn.disabled = !statsView.lastSession;

  dom.statsProblemNotes.innerHTML = '';
  if (statsView.problemNotes.length > 0) {
    statsView.problemNotes.forEach((note) => {
      dom.statsProblemNotes.appendChild(
        createProblemNoteListItem(
          formatMusicText(
            `${note.label} (Acc: ${(note.accuracy * 100).toFixed(0)}%, Time: ${note.avgTime.toFixed(2)}s)`
          )
        )
      );
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
    dom.statsLastSessionStarsCard.classList.toggle('hidden', !statsView.lastSession.starsText);
    dom.statsLastSessionStars.textContent = statsView.lastSession.starsText ?? '-';
    dom.statsLastSessionStarsDetail.textContent = statsView.lastSession.starsDetailText ?? '';
    dom.statsLastSessionCoachTip.textContent = formatMusicText(statsView.lastSession.coachTipText ?? '');

    dom.statsLastSessionWeakSpots.innerHTML = '';
    if (statsView.lastSession.weakSpots.length > 0) {
      statsView.lastSession.weakSpots.forEach((note) => {
        dom.statsLastSessionWeakSpots.appendChild(
          createProblemNoteListItem(
            formatMusicText(
              `${note.label} (Acc: ${(note.accuracy * 100).toFixed(0)}%, Time: ${note.avgTime.toFixed(2)}s)`
            )
          )
        );
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
    dom.statsLastSessionStarsCard.classList.add('hidden');
  }
}

export function renderSessionSummaryView(sessionSummary: LastSessionViewModel | null) {
  if (!sessionSummary) {
    dom.sessionSummaryMode.textContent = '-';
    dom.sessionSummaryInput.textContent = '-';
    dom.sessionSummaryDuration.textContent = '-';
    dom.sessionSummaryAccuracy.textContent = '-';
    dom.sessionSummaryOverallScoreLabel.textContent = 'Overall Score';
    dom.sessionSummaryOverallScore.textContent = '-';
    dom.sessionSummaryStarsCard.classList.add('hidden');
    dom.sessionSummaryStars.textContent = '-';
    dom.sessionSummaryStarsDetail.textContent = '-';
    dom.sessionSummaryCorrect.textContent = '-';
    dom.sessionSummaryWrong.textContent = '-';
    dom.sessionSummaryMissedNoInput.textContent = '-';
    dom.sessionSummaryTimingAccuracy.textContent = '-';
    dom.sessionSummaryTimingOffset.textContent = '-';
    dom.sessionSummaryTimingBreakdown.textContent = '-';
    dom.sessionSummaryAvgTime.textContent = '-';
    dom.sessionSummaryBestStreak.textContent = '-';
    dom.sessionSummaryCoachTip.textContent = '-';
    dom.sessionSummaryNextStep.textContent = '-';
    dom.sessionSummaryOverallScoreCard.classList.remove('hidden');
    dom.sessionSummaryWrongCard.classList.remove('hidden');
    dom.sessionSummaryMissedCard.classList.remove('hidden');
    dom.sessionSummaryTimingAccuracyCard.classList.remove('hidden');
    dom.sessionSummaryTimingOffsetCard.classList.remove('hidden');
    dom.sessionSummaryTimingBreakdownCard.classList.remove('hidden');
    dom.sessionSummaryWeakSpots.innerHTML =
      '<li class="bg-slate-600 p-2 rounded">No graded note attempts in the last session.</li>';
    return;
  }

  dom.sessionSummaryMode.textContent = formatMusicText(sessionSummary.modeLabel);
  dom.sessionSummaryInput.textContent = sessionSummary.inputText;
  dom.sessionSummaryInput.title = sessionSummary.inputText;
  dom.sessionSummaryDuration.textContent = sessionSummary.durationText;
  dom.sessionSummaryAccuracy.textContent = sessionSummary.accuracyText;
  dom.sessionSummaryOverallScoreLabel.textContent = sessionSummary.overallScoreLabel;
  dom.sessionSummaryOverallScore.textContent = sessionSummary.overallPerformanceScoreText;
  dom.sessionSummaryStarsCard.classList.toggle('hidden', !sessionSummary.starsText);
  dom.sessionSummaryStars.textContent = sessionSummary.starsText ?? '-';
  dom.sessionSummaryStarsDetail.textContent = sessionSummary.starsDetailText ?? '';
  dom.sessionSummaryCorrect.textContent = `${sessionSummary.correctAttemptsText} / ${sessionSummary.totalAttemptsText}`;
  dom.sessionSummaryWrong.textContent = sessionSummary.wrongAttemptsText;
  dom.sessionSummaryMissedNoInput.textContent = sessionSummary.missedNoInputAttemptsText;
  dom.sessionSummaryTimingAccuracy.textContent = sessionSummary.performanceTimingSummary?.timingAccuracyText ?? '-';
  dom.sessionSummaryTimingOffset.textContent = sessionSummary.performanceTimingSummary?.avgOffsetText ?? '-';
  dom.sessionSummaryTimingBreakdown.textContent = sessionSummary.performanceTimingSummary?.breakdownText ?? '-';
  dom.sessionSummaryOverallScoreCard.classList.toggle('hidden', !sessionSummary.showFormalPerformanceMetrics);
  dom.sessionSummaryWrongCard.classList.toggle('hidden', !sessionSummary.showFormalPerformanceMetrics);
  dom.sessionSummaryMissedCard.classList.toggle('hidden', !sessionSummary.showFormalPerformanceMetrics);
  dom.sessionSummaryTimingAccuracyCard.classList.toggle('hidden', !sessionSummary.showFormalPerformanceMetrics);
  dom.sessionSummaryTimingOffsetCard.classList.toggle('hidden', !sessionSummary.showFormalPerformanceMetrics);
  dom.sessionSummaryTimingBreakdownCard.classList.toggle('hidden', !sessionSummary.showFormalPerformanceMetrics);
  dom.sessionSummaryAvgTime.textContent = sessionSummary.avgTimeText;
  dom.sessionSummaryBestStreak.textContent = sessionSummary.bestStreakText;
  dom.sessionSummaryCoachTip.textContent = formatMusicText(sessionSummary.coachTipText ?? '');
  dom.sessionSummaryNextStep.textContent = formatMusicText(sessionSummary.nextStepText ?? '');

  dom.sessionSummaryWeakSpots.innerHTML = '';
  if (sessionSummary.weakSpots.length > 0) {
    sessionSummary.weakSpots.forEach((note) => {
      dom.sessionSummaryWeakSpots.appendChild(
        createProblemNoteListItem(
          formatMusicText(
            `${note.label} (Acc: ${(note.accuracy * 100).toFixed(0)}%, Time: ${note.avgTime.toFixed(2)}s)`
          )
        )
      );
    });
  } else {
    dom.sessionSummaryWeakSpots.innerHTML =
      '<li class="bg-slate-600 p-2 rounded">No graded note attempts in the last session.</li>';
  }
}
