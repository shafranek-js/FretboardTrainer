import type { IInstrument } from '../instruments/instrument';
import type { BuiltinMelodyEventSpec, BuiltinMonophonicStepSpec } from './types';

const BUILTIN_TAB_STEPS_PER_BEAT = 2;
const EPSILON = 1e-6;

const BUILTIN_STRING_ORDERS: Record<IInstrument['name'], string[]> = {
  guitar: ['e', 'B', 'G', 'D', 'A', 'E'],
  ukulele: ['A', 'E', 'C', 'G'],
};

export function buildMonophonicBuiltinEvents(steps: BuiltinMonophonicStepSpec[], beatsPerBar = 4): BuiltinMelodyEventSpec[] {
  const events: BuiltinMelodyEventSpec[] = [];
  let barIndex = 0;
  let beatInBar = 0;

  for (const [stringName, fret, durationBeats = 1] of steps) {
    if (!Number.isFinite(durationBeats) || durationBeats <= 0) {
      throw new Error(`Invalid built-in melody duration: ${durationBeats}`);
    }
    const nextBeatInBar = beatInBar + durationBeats;
    if (nextBeatInBar > beatsPerBar + EPSILON) {
      throw new Error(`Built-in melody step overflows bar ${barIndex + 1}.`);
    }
    events.push({
      barIndex,
      durationBeats,
      notes: [{ stringName, fret }],
    });
    beatInBar = nextBeatInBar;
    if (Math.abs(beatInBar - beatsPerBar) < EPSILON) {
      barIndex += 1;
      beatInBar = 0;
    }
  }

  if (Math.abs(beatInBar) >= EPSILON) {
    throw new Error('Built-in melody must end on a bar boundary.');
  }

  return events;
}

export function buildBuiltinStepsFromPattern(
  pattern: ReadonlyArray<readonly [noteKey: string, durationBeats?: number]>,
  noteMap: Readonly<Record<string, readonly [stringName: string, fret: number]>>
): BuiltinMonophonicStepSpec[] {
  return pattern.map(([noteKey, durationBeats = 1]) => {
    const position = noteMap[noteKey];
    if (!position) {
      throw new Error(`Missing built-in fingering for note "${noteKey}".`);
    }
    return [position[0], position[1], durationBeats];
  });
}

function formatTabBeatCell(fret: number | null) {
  if (fret === null) return '----';
  const fretText = String(fret);
  const dashCount = Math.max(0, 4 - fretText.length);
  return `${fretText}${'-'.repeat(dashCount)}`;
}

export function buildBuiltinAsciiTabFromEvents(
  instrumentName: IInstrument['name'],
  events: BuiltinMelodyEventSpec[],
  beatsPerBar = 4
) {
  const stringOrder = BUILTIN_STRING_ORDERS[instrumentName];
  const totalDurationSteps = events.reduce((sum, event) => sum + event.durationBeats * BUILTIN_TAB_STEPS_PER_BEAT, 0);
  if (!Number.isInteger(totalDurationSteps) || totalDurationSteps <= 0) {
    throw new Error(
      `Built-in melody for ${instrumentName} must have a positive number of beats aligned to ${BUILTIN_TAB_STEPS_PER_BEAT} subdivisions.`
    );
  }
  const stepsPerBar = beatsPerBar * BUILTIN_TAB_STEPS_PER_BEAT;
  if (totalDurationSteps % stepsPerBar !== 0) {
    throw new Error(`Built-in melody for ${instrumentName} must align to ${beatsPerBar}/4 bars.`);
  }

  const beatCells = new Map<string, string[]>(
    stringOrder.map((stringName) => [stringName, Array(totalDurationSteps).fill('----')])
  );
  let durationCursor = 0;
  for (const event of events) {
    const note = event.notes[0];
    if (!note) continue;
    const row = beatCells.get(note.stringName);
    if (!row) {
      throw new Error(`Unknown string "${note.stringName}" for ${instrumentName} built-in melody.`);
    }
    row[durationCursor] = formatTabBeatCell(note.fret);
    durationCursor += Math.round(event.durationBeats * BUILTIN_TAB_STEPS_PER_BEAT);
  }

  const renderBeatGrid = (cells: string[], separator: string) => {
    let output = '';
    for (let index = 0; index < cells.length; index++) {
      output += cells[index];
      if (index < cells.length - 1 && (index + 1) % stepsPerBar === 0) {
        output += separator;
      }
    }
    return output;
  };

  const countCells = Array.from({ length: totalDurationSteps }, (_, index) =>
    index % BUILTIN_TAB_STEPS_PER_BEAT === 0
      ? `${(Math.floor(index / BUILTIN_TAB_STEPS_PER_BEAT) % beatsPerBar) + 1}   `
      : '&   '
  );
  const countContent = renderBeatGrid(countCells, ' ');
  const rows = stringOrder.map((stringName) => `${stringName}|${renderBeatGrid(beatCells.get(stringName) ?? [], '|')}`);
  rows.push(`count ${countContent}`);
  return rows.join('\n');
}
