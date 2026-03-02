import type { IInstrument } from './instruments/instrument';
import type { MelodyDefinition, MelodyEvent } from './melody-library';

const ASCII_TAB_STEPS_PER_BEAT = 2;
const ASCII_TAB_BEATS_PER_BAR = 4;
const ASCII_TAB_EMPTY_CELL = '----';

function formatAsciiTabCell(fret: number | null) {
  if (fret === null) return ASCII_TAB_EMPTY_CELL;
  const fretText = String(fret);
  return `${fretText}${'-'.repeat(Math.max(0, ASCII_TAB_EMPTY_CELL.length - fretText.length))}`;
}

function getEventDurationSteps(event: MelodyEvent) {
  if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats) && event.durationBeats > 0) {
    return Math.max(1, Math.round(event.durationBeats * ASCII_TAB_STEPS_PER_BEAT));
  }
  if (
    typeof event.durationCountSteps === 'number' &&
    Number.isFinite(event.durationCountSteps) &&
    event.durationCountSteps > 0
  ) {
    return Math.max(1, Math.round(event.durationCountSteps));
  }
  if (
    typeof event.durationColumns === 'number' &&
    Number.isFinite(event.durationColumns) &&
    event.durationColumns > 0
  ) {
    return Math.max(1, Math.round(event.durationColumns));
  }
  return ASCII_TAB_STEPS_PER_BEAT;
}

function renderAsciiTabGrid(cells: string[], stepsPerBar: number) {
  let output = '';
  for (let index = 0; index < cells.length; index++) {
    output += cells[index];
    if (index < cells.length - 1 && (index + 1) % stepsPerBar === 0) {
      output += '|';
    }
  }
  return output;
}

export function exportMelodyToAsciiTab(
  melody: Pick<MelodyDefinition, 'events'>,
  instrument: Pick<IInstrument, 'STRING_ORDER'>
) {
  const stringOrder = instrument.STRING_ORDER;
  const stepDurations = melody.events.map((event) => getEventDurationSteps(event));
  const totalSteps = stepDurations.reduce((sum, value) => sum + value, 0);
  if (totalSteps <= 0) {
    return stringOrder.map((stringName) => `${stringName}|`).join('\n');
  }

  const stepsPerBar = ASCII_TAB_BEATS_PER_BAR * ASCII_TAB_STEPS_PER_BEAT;
  const cellsByString = new Map(
    stringOrder.map((stringName) => [stringName, Array(totalSteps).fill(ASCII_TAB_EMPTY_CELL)])
  );

  let cursor = 0;
  for (let eventIndex = 0; eventIndex < melody.events.length; eventIndex++) {
    const event = melody.events[eventIndex]!;
    for (const note of event.notes) {
      if (typeof note.stringName !== 'string') continue;
      if (typeof note.fret !== 'number' || !Number.isFinite(note.fret)) continue;
      const row = cellsByString.get(note.stringName);
      if (!row) continue;
      row[cursor] = formatAsciiTabCell(note.fret);
    }
    cursor += stepDurations[eventIndex]!;
  }

  const rows = stringOrder.map((stringName) => {
    const cells = cellsByString.get(stringName) ?? [];
    return `${stringName}|${renderAsciiTabGrid(cells, stepsPerBar)}`;
  });

  const hasBeatTiming = melody.events.some(
    (event) =>
      (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats) && event.durationBeats > 0) ||
      (typeof event.durationCountSteps === 'number' &&
        Number.isFinite(event.durationCountSteps) &&
        event.durationCountSteps > 0)
  );

  if (hasBeatTiming) {
    const countCells = Array.from({ length: totalSteps }, (_, index) =>
      index % ASCII_TAB_STEPS_PER_BEAT === 0
        ? `${(Math.floor(index / ASCII_TAB_STEPS_PER_BEAT) % ASCII_TAB_BEATS_PER_BAR) + 1}   `
        : '&   '
    );
    rows.push(`count ${renderAsciiTabGrid(countCells, stepsPerBar)}`);
  }

  return rows.join('\n');
}
