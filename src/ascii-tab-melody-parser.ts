import type { IInstrument } from './instruments/instrument';

export interface ParsedAsciiTabMelodyStep {
  note: string;
  stringName: string | null;
  fret: number | null;
  stringNumber: number | null;
}

export interface ParsedAsciiTabMelodyEvent {
  column: number;
  notes: ParsedAsciiTabMelodyStep[];
}

interface ParsedTabEvent {
  stringNumber: number;
  fret: number;
  column: number;
}

interface ParsedTabLine {
  stringNumber: number;
  content: string;
}

function toNoteName(noteWithOctave: string) {
  return noteWithOctave.replace(/\d+$/, '');
}

function parseTabBlocks(tabText: string): ParsedTabLine[][] {
  const lines = tabText.replace(/\r/g, '').split('\n');
  const blocks: ParsedTabLine[][] = [];
  let currentBlock: ParsedTabLine[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\s*(?:струна|string)\s+(.*)$/i);
    if (!match) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      continue;
    }

    currentBlock.push({
      stringNumber: Number.parseInt(match[1], 10),
      content: match[2] ?? '',
    });
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function parseEventsFromBlock(block: ParsedTabLine[]): ParsedTabEvent[] {
  const maxLength = block.reduce((max, row) => Math.max(max, row.content.length), 0);
  const events: ParsedTabEvent[] = [];

  for (let column = 0; column < maxLength; column++) {
    for (const row of block) {
      const char = row.content[column] ?? ' ';
      if (!/\d/.test(char)) continue;

      const previousChar = row.content[column - 1] ?? '';
      if (/\d/.test(previousChar)) continue;

      let end = column + 1;
      while (end < row.content.length && /\d/.test(row.content[end] ?? '')) {
        end++;
      }

      const fretText = row.content.slice(column, end);
      const fret = Number.parseInt(fretText, 10);
      if (!Number.isFinite(fret)) continue;

      events.push({
        stringNumber: row.stringNumber,
        fret,
        column,
      });
    }
  }

  return events.sort((a, b) => (a.column - b.column) || (a.stringNumber - b.stringNumber));
}

export function parseAsciiTabMelodyEvents(tabText: string): ParsedTabEvent[] {
  const blocks = parseTabBlocks(tabText);
  if (blocks.length === 0) {
    throw new Error('No tab lines found. Use lines like "1 струна ..." / "2 string ...".');
  }

  return blocks.flatMap((block) => parseEventsFromBlock(block));
}

export function parseAsciiTabToMelodySteps(
  tabText: string,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
): ParsedAsciiTabMelodyStep[] {
  return parseAsciiTabToMelodyEvents(tabText, instrument).flatMap((event) => event.notes);
}

function mapParsedTabEventToMelodyStep(
  event: ParsedTabEvent,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
): ParsedAsciiTabMelodyStep {
  const stringName = instrument.STRING_ORDER[event.stringNumber - 1] ?? null;
  if (!stringName) {
    throw new Error(
      `Tab uses string #${event.stringNumber}, but current instrument has only ${instrument.STRING_ORDER.length} strings.`
    );
  }

  const noteWithOctave = instrument.getNoteWithOctave(stringName, event.fret);
  if (!noteWithOctave) {
    throw new Error(`Could not resolve note for string ${stringName}, fret ${event.fret}.`);
  }

  return {
    note: toNoteName(noteWithOctave),
    stringName,
    fret: event.fret,
    stringNumber: event.stringNumber,
  };
}

export function parseAsciiTabToMelodyEvents(
  tabText: string,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
): ParsedAsciiTabMelodyEvent[] {
  const blocks = parseTabBlocks(tabText);
  if (blocks.length === 0) {
    throw new Error('No tab lines found. Use lines like "1 струна ..." / "2 string ...".');
  }

  const groupedEvents: ParsedAsciiTabMelodyEvent[] = [];
  for (const block of blocks) {
    const events = parseEventsFromBlock(block);
    if (events.length === 0) continue;

    let currentColumn: number | null = null;
    let currentNotes: ParsedAsciiTabMelodyStep[] = [];

    const pushCurrent = () => {
      if (currentColumn === null || currentNotes.length === 0) return;
      groupedEvents.push({
        column: currentColumn,
        notes: currentNotes,
      });
    };

    for (const event of events) {
      if (currentColumn !== event.column) {
        pushCurrent();
        currentColumn = event.column;
        currentNotes = [];
      }
      currentNotes.push(mapParsedTabEventToMelodyStep(event, instrument));
    }

    pushCurrent();
  }

  if (groupedEvents.length === 0) {
    throw new Error('No playable notes found in the ASCII tab.');
  }

  return groupedEvents;
}
