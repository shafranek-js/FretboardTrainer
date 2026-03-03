import type { TimelineCell, TimelineNoteChip } from './melody-tab-timeline-model';
import type { PerformanceTimelineAttempt } from './performance-timeline-feedback';

const FINGER_COLORS: Record<number, string> = {
  0: '#9ca3af',
  1: '#f59e0b',
  2: '#a855f7',
  3: '#0ea5e9',
  4: '#ef4444',
};

export function getFingerColor(finger: number) {
  const normalized = Number.isFinite(finger) ? Math.max(0, Math.min(4, Math.round(finger))) : 0;
  return FINGER_COLORS[normalized] ?? FINGER_COLORS[0];
}

export function withAlpha(hexColor: string, alpha: number) {
  const sanitized = hexColor.replace('#', '');
  if (sanitized.length !== 6) return hexColor;
  const red = Number.parseInt(sanitized.slice(0, 2), 16);
  const green = Number.parseInt(sanitized.slice(2, 4), 16);
  const blue = Number.parseInt(sanitized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function scaleTimelinePixels(base: number, zoomScale: number, minimum: number) {
  return Math.max(minimum, Math.round(base * zoomScale));
}

export function createCellNoteChip(note: TimelineNoteChip, zoomScale: number) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className =
    'inline-flex items-center justify-center min-w-[18px] px-1 py-0 rounded-sm text-[10px] leading-4 font-semibold text-slate-50';
  chip.style.minWidth = `${scaleTimelinePixels(18, zoomScale, 14)}px`;
  chip.style.paddingLeft = `${scaleTimelinePixels(4, zoomScale, 2)}px`;
  chip.style.paddingRight = `${scaleTimelinePixels(4, zoomScale, 2)}px`;
  chip.style.fontSize = `${scaleTimelinePixels(10, zoomScale, 8)}px`;
  chip.style.lineHeight = `${scaleTimelinePixels(16, zoomScale, 12)}px`;
  const fingerColor = getFingerColor(note.finger);
  chip.style.backgroundColor =
    note.performanceStatus === 'correct'
      ? '#16a34a'
      : note.performanceStatus === 'wrong'
        ? '#dc2626'
        : note.performanceStatus === 'missed'
          ? '#991b1b'
          : fingerColor;
  if (note.performanceStatus) {
    chip.style.boxShadow = `inset 0 0 0 1px ${withAlpha(fingerColor, 0.92)}`;
  }
  chip.title = `${note.note} | fret ${note.fret} | finger ${note.finger}${
    note.performanceStatus ? ` | ${note.performanceStatus}` : ''
  }`;
  chip.textContent = String(note.fret);
  chip.dataset.timelineNoPan = 'true';
  chip.dataset.noteIndex = String(note.noteIndex);
  chip.dataset.eventIndex = '';
  return chip;
}

export function createPlayedFeedbackChip(attempt: PerformanceTimelineAttempt, zoomScale: number) {
  const chip = document.createElement('span');
  chip.className =
    'inline-flex items-center justify-center min-w-[14px] px-1 py-[1px] rounded text-[9px] leading-3 font-semibold text-white';
  chip.style.minWidth = `${scaleTimelinePixels(14, zoomScale, 11)}px`;
  chip.style.paddingLeft = `${scaleTimelinePixels(4, zoomScale, 2)}px`;
  chip.style.paddingRight = `${scaleTimelinePixels(4, zoomScale, 2)}px`;
  chip.style.paddingTop = `${scaleTimelinePixels(1, zoomScale, 1)}px`;
  chip.style.paddingBottom = `${scaleTimelinePixels(1, zoomScale, 1)}px`;
  chip.style.fontSize = `${scaleTimelinePixels(9, zoomScale, 8)}px`;
  chip.style.lineHeight = `${scaleTimelinePixels(12, zoomScale, 10)}px`;
  chip.style.backgroundColor =
    attempt.status === 'correct'
      ? '#16a34a'
      : attempt.status === 'missed'
        ? '#991b1b'
        : '#dc2626';
  chip.title = `${attempt.status === 'correct' ? 'Correct' : attempt.status === 'missed' ? 'Missed' : 'Wrong'}: ${attempt.note}${
    typeof attempt.fret === 'number' ? ` | fret ${attempt.fret}` : ''
  }`;
  chip.textContent = typeof attempt.fret === 'number' ? String(attempt.fret) : attempt.note;
  return chip;
}

export function getPrimaryCellFingerColor(notes: TimelineNoteChip[]) {
  if (notes.length === 0) return '#67e8f9';
  return getFingerColor(notes[0]?.finger ?? 0);
}

export function getClassicCellTextRaw(notes: TimelineNoteChip[]) {
  if (notes.length === 0) return '';
  return notes.map((note) => String(note.fret)).join('/');
}

export function getClassicPlayedCellTextRaw(attempts: PerformanceTimelineAttempt[]) {
  if (attempts.length === 0) return '';
  return attempts.map((attempt) => (typeof attempt.fret === 'number' ? String(attempt.fret) : attempt.note)).join('/');
}

export function getClassicCellText(notes: TimelineNoteChip[], width: number) {
  const raw = getClassicCellTextRaw(notes);
  if (!raw) return '-'.repeat(width);
  if (raw.length >= width) return raw;
  return `${raw}${'-'.repeat(width - raw.length)}`;
}

export function resolveClassicCellFeedbackTone(cell: TimelineCell) {
  if (cell.notes.some((note) => note.performanceStatus === 'correct')) return 'correct';
  if (cell.notes.some((note) => note.performanceStatus === 'wrong')) return 'wrong';
  if (cell.notes.some((note) => note.performanceStatus === 'missed')) return 'missed';
  if (cell.unmatchedPlayedNotes.some((attempt) => attempt.status === 'correct')) return 'correct';
  if (cell.unmatchedPlayedNotes.some((attempt) => attempt.status === 'wrong')) return 'wrong';
  if (cell.unmatchedPlayedNotes.some((attempt) => attempt.status === 'missed')) return 'missed';
  return null;
}

export function applyClassicCellFeedbackStyles(
  cellElement: HTMLElement,
  tone: 'correct' | 'wrong' | 'missed' | null,
  accentColor: string
) {
  if (tone === 'correct') {
    cellElement.style.backgroundColor = '#16a34a';
    cellElement.style.color = '#f0fdf4';
    cellElement.style.boxShadow = cellElement.style.boxShadow
      ? `${cellElement.style.boxShadow}, inset 0 0 0 1px #166534`
      : 'inset 0 0 0 1px #166534';
    return;
  }
  if (tone === 'wrong') {
    cellElement.style.backgroundColor = '#dc2626';
    cellElement.style.color = '#fef2f2';
    cellElement.style.boxShadow = cellElement.style.boxShadow
      ? `${cellElement.style.boxShadow}, inset 0 0 0 1px #991b1b`
      : 'inset 0 0 0 1px #991b1b';
    return;
  }
  if (tone === 'missed') {
    cellElement.style.backgroundColor = '#991b1b';
    cellElement.style.color = '#fef2f2';
    cellElement.style.boxShadow = cellElement.style.boxShadow
      ? `${cellElement.style.boxShadow}, inset 0 0 0 1px #7f1d1d`
      : 'inset 0 0 0 1px #7f1d1d';
    return;
  }
  if (cellElement.dataset.activeEvent === 'true') {
    cellElement.style.backgroundColor = withAlpha(accentColor, 0.28);
    cellElement.style.color = '#f8fafc';
  }
}
