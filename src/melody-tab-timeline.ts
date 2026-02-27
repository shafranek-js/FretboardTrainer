import { dom } from './state';
import type { MelodyDefinition } from './melody-library';
import { buildMelodyTabTimelineViewModel, type TimelineNoteChip } from './melody-tab-timeline-model';

const FINGER_COLORS: Record<number, string> = {
  0: '#9ca3af',
  1: '#f59e0b',
  2: '#a855f7',
  3: '#0ea5e9',
  4: '#ef4444',
};

let lastRenderKey = '';

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
  options: { modeLabel?: string | null } = {}
) {
  const modeLabel = options.modeLabel?.trim() ?? '';
  const model = buildMelodyTabTimelineViewModel(melody, stringOrder, activeEventIndex);
  const renderKey = [
    melody.id,
    melody.events.length,
    model.activeEventIndex ?? -1,
    modeLabel,
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
  dom.melodyTabTimelineMeta.textContent = modeLabel ? `${modeLabel} | ${stepText}` : stepText;

  clearGrid();
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
        empty.textContent = '·';
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
