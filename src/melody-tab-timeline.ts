import { dom } from './state';
import type { MelodyDefinition } from './melody-library';
import { buildMelodyTabTimelineViewModel, type TimelineNoteChip } from './melody-tab-timeline-model';

const DEFAULT_TIMELINE_BEATS_PER_BAR = 4;

const FINGER_COLORS: Record<number, string> = {
  0: '#9ca3af',
  1: '#f59e0b',
  2: '#a855f7',
  3: '#0ea5e9',
  4: '#ef4444',
};

let lastRenderKey = '';

interface TimelineBarGrouping {
  hasBeatTiming: boolean;
  beatsPerBar: number;
  totalBars: number | null;
  barStartEventIndexes: Set<number>;
}

function getFingerColor(finger: number) {
  const normalized = Number.isFinite(finger) ? Math.max(0, Math.min(4, Math.round(finger))) : 0;
  return FINGER_COLORS[normalized] ?? FINGER_COLORS[0];
}

function createCellNoteChip(note: TimelineNoteChip) {
  const chip = document.createElement('span');
  chip.className =
    'inline-flex items-center justify-center min-w-[18px] px-1 py-0 rounded-sm text-[10px] leading-4 font-semibold text-slate-50';
  chip.style.backgroundColor = getFingerColor(note.finger);
  chip.title = `${note.note} | fret ${note.fret} | finger ${note.finger}`;
  chip.textContent = String(note.fret);
  return chip;
}

function clearGrid() {
  dom.melodyTabTimelineGrid.innerHTML = '';
}

function normalizePositiveNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function getEventDurationBeats(event: MelodyDefinition['events'][number]) {
  const fromBeats = normalizePositiveNumber(event.durationBeats);
  if (fromBeats !== null) return fromBeats;
  const countSteps = normalizePositiveNumber(event.durationCountSteps);
  if (countSteps !== null) return countSteps / 2;
  return null;
}

function buildTimelineBarGrouping(melody: Pick<MelodyDefinition, 'events'>): TimelineBarGrouping {
  const durations = melody.events.map((event) => getEventDurationBeats(event));
  const hasBeatTiming = durations.every((duration) => duration !== null);
  if (!hasBeatTiming || durations.length === 0) {
    return {
      hasBeatTiming: false,
      beatsPerBar: DEFAULT_TIMELINE_BEATS_PER_BAR,
      totalBars: null,
      barStartEventIndexes: new Set<number>(),
    };
  }

  const beatsPerBar = DEFAULT_TIMELINE_BEATS_PER_BAR;
  const barStartEventIndexes = new Set<number>();
  const epsilon = 1e-6;
  let accumulatedBeats = 0;

  for (let eventIndex = 0; eventIndex < durations.length; eventIndex++) {
    if (eventIndex > 0) {
      const remainder = ((accumulatedBeats % beatsPerBar) + beatsPerBar) % beatsPerBar;
      if (remainder < epsilon || Math.abs(remainder - beatsPerBar) < epsilon) {
        barStartEventIndexes.add(eventIndex);
      }
    }
    accumulatedBeats += durations[eventIndex]!;
  }

  const totalBars = Math.max(1, Math.ceil((accumulatedBeats + epsilon) / beatsPerBar));
  return {
    hasBeatTiming: true,
    beatsPerBar,
    totalBars,
    barStartEventIndexes,
  };
}

function getClassicCellTextRaw(notes: TimelineNoteChip[]) {
  if (notes.length === 0) return '';
  return notes.map((note) => String(note.fret)).join('/');
}

function getClassicCellText(notes: TimelineNoteChip[], width: number) {
  const raw = getClassicCellTextRaw(notes);
  if (!raw) return '-'.repeat(width);
  if (raw.length >= width) return raw;
  return `${raw}${'-'.repeat(width - raw.length)}`;
}

function renderGridTimeline(model: ReturnType<typeof buildMelodyTabTimelineViewModel>) {
  const table = document.createElement('table');
  table.className = 'min-w-max border-separate border-spacing-px text-[10px] font-mono text-slate-200';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const corner = document.createElement('th');
  corner.className =
    'sticky left-0 z-[3] bg-slate-900/95 text-slate-300 px-1.5 py-0.5 border border-slate-600 rounded text-left';
  corner.textContent = 'Str';
  headerRow.appendChild(corner);

  for (let eventIndex = 0; eventIndex < model.totalEvents; eventIndex++) {
    const step = document.createElement('th');
    step.dataset.eventIndex = String(eventIndex);
    step.className =
      'px-1.5 py-0.5 border rounded text-center min-w-7 ' +
      (model.activeEventIndex === eventIndex
        ? 'border-cyan-300 bg-cyan-700/35 text-cyan-100'
        : 'border-slate-600 bg-slate-800/85 text-slate-300');
    step.textContent = String(eventIndex + 1);
    headerRow.appendChild(step);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  model.rows.forEach((row) => {
    const tr = document.createElement('tr');
    const label = document.createElement('th');
    label.className =
      'sticky left-0 z-[2] bg-slate-900/95 text-cyan-200 px-1.5 py-0.5 border border-slate-600 rounded text-left';
    label.textContent = row.stringName;
    tr.appendChild(label);

    row.cells.forEach((cell) => {
      const td = document.createElement('td');
      td.className =
        'min-w-7 h-6 border rounded text-center align-middle ' +
        (cell.isActive ? 'border-cyan-300 bg-cyan-950/55' : 'border-slate-700 bg-slate-900/45');

      if (cell.notes.length === 0) {
        const empty = document.createElement('span');
        empty.className = cell.isActive ? 'text-cyan-400/70' : 'text-slate-600';
        empty.textContent = '.';
        td.appendChild(empty);
      } else if (cell.notes.length === 1) {
        td.appendChild(createCellNoteChip(cell.notes[0]));
      } else {
        const stack = document.createElement('div');
        stack.className = 'flex flex-col items-center justify-center gap-px py-0';
        cell.notes.forEach((note) => {
          stack.appendChild(createCellNoteChip(note));
        });
        td.appendChild(stack);
      }

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  dom.melodyTabTimelineGrid.appendChild(table);
}

function renderClassicTimeline(
  model: ReturnType<typeof buildMelodyTabTimelineViewModel>,
  barGrouping: TimelineBarGrouping
) {
  const wrapper = document.createElement('div');
  wrapper.className = 'min-w-max text-[11px] leading-5 font-mono text-slate-200';

  const eventWidths = Array.from({ length: model.totalEvents }, (_, eventIndex) => {
    const widestRaw = Math.max(
      0,
      ...model.rows.map((row) => getClassicCellTextRaw(row.cells[eventIndex]?.notes ?? []).length)
    );
    return Math.max(3, widestRaw);
  });

  const buildLine = (labelText: string, segments: string[], isHeader = false) => {
    const line = document.createElement('div');
    line.className = 'flex items-center whitespace-nowrap';

    const label = document.createElement('span');
    label.className = `inline-block w-7 shrink-0 ${isHeader ? 'text-slate-400' : 'text-cyan-200'}`;
    label.textContent = labelText;
    line.appendChild(label);

    const startPipe = document.createElement('span');
    startPipe.className = 'text-slate-500';
    startPipe.textContent = '|';
    line.appendChild(startPipe);

    segments.forEach((segment, eventIndex) => {
      if (barGrouping.barStartEventIndexes.has(eventIndex)) {
        const barPipe = document.createElement('span');
        barPipe.className = 'text-slate-500';
        barPipe.textContent = '|';
        line.appendChild(barPipe);
      }

      const cell = document.createElement('span');
      cell.dataset.eventIndex = String(eventIndex);
      cell.className =
        'inline-block px-[1px] rounded-sm ' +
        (model.activeEventIndex === eventIndex
          ? 'bg-cyan-700/40 text-cyan-100'
          : isHeader
            ? 'text-slate-400'
            : 'text-slate-200');
      cell.style.minWidth = `${eventWidths[eventIndex]}ch`;
      cell.style.width = `${eventWidths[eventIndex]}ch`;
      cell.textContent = segment;
      line.appendChild(cell);
    });

    const endPipe = document.createElement('span');
    endPipe.className = 'text-slate-500';
    endPipe.textContent = '|';
    line.appendChild(endPipe);

    return line;
  };

  const headerSegments = eventWidths.map((width, eventIndex) => String(eventIndex + 1).padEnd(width, ' '));
  wrapper.appendChild(buildLine('Stp', headerSegments, true));

  model.rows.forEach((row) => {
    const segments = row.cells.map((cell, eventIndex) => getClassicCellText(cell.notes, eventWidths[eventIndex]));
    wrapper.appendChild(buildLine(row.stringName, segments));
  });

  dom.melodyTabTimelineGrid.appendChild(wrapper);
}

export function hideMelodyTabTimeline() {
  dom.melodyTabTimelinePanel.classList.add('hidden');
  dom.melodyTabTimelineMeta.textContent = '';
  clearGrid();
  lastRenderKey = '';
}

export function renderMelodyTabTimeline(
  melody: MelodyDefinition,
  stringOrder: string[],
  activeEventIndex: number | null,
  options: { modeLabel?: string | null; viewMode?: 'classic' | 'grid' } = {}
) {
  const modeLabel = options.modeLabel?.trim() ?? '';
  const viewMode = options.viewMode ?? 'classic';
  const model = buildMelodyTabTimelineViewModel(melody, stringOrder, activeEventIndex);
  const barGrouping = buildTimelineBarGrouping(melody);
  const renderKey = [
    melody.id,
    melody.events.length,
    model.activeEventIndex ?? -1,
    modeLabel,
    viewMode,
    barGrouping.totalBars ?? -1,
    barGrouping.hasBeatTiming ? 1 : 0,
    stringOrder.join(','),
  ].join('|');
  if (renderKey === lastRenderKey && dom.melodyTabTimelineGrid.childElementCount > 0) {
    return;
  }
  lastRenderKey = renderKey;

  dom.melodyTabTimelinePanel.classList.remove('hidden');
  const stepText =
    model.activeEventIndex === null
      ? `Step -/${model.totalEvents}`
      : `Step ${model.activeEventIndex + 1}/${model.totalEvents}`;
  const viewLabel = viewMode === 'classic' ? 'Classic TAB' : 'Grid';
  const barText =
    barGrouping.hasBeatTiming && typeof barGrouping.totalBars === 'number'
      ? ` | ${barGrouping.totalBars} bar${barGrouping.totalBars === 1 ? '' : 's'} (${barGrouping.beatsPerBar}/4)`
      : '';
  dom.melodyTabTimelineMeta.textContent = modeLabel
    ? `${modeLabel} | ${viewLabel} | ${stepText}${barText}`
    : `${viewLabel} | ${stepText}${barText}`;

  clearGrid();
  if (viewMode === 'grid') {
    renderGridTimeline(model);
  } else {
    renderClassicTimeline(model, barGrouping);
  }

  if (model.activeEventIndex !== null) {
    const activeHeader = dom.melodyTabTimelineGrid.querySelector<HTMLElement>(
      `[data-event-index="${model.activeEventIndex}"]`
    );
    if (activeHeader) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      activeHeader.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  }
}
