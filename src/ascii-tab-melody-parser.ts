import type { IInstrument } from './instruments/instrument';

export interface ParsedAsciiTabMelodyStep {
  note: string;
  stringName: string | null;
  fret: number | null;
  stringNumber: number | null;
}

export interface ParsedAsciiTabMelodyEvent {
  column: number;
  durationColumns: number;
  durationCountSteps?: number;
  durationBeats?: number;
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

interface ParsedTabBlock {
  rows: ParsedTabLine[];
  countContent: string | null;
}

interface CountToken {
  text: string;
  startColumn: number;
}

function toNoteName(noteWithOctave: string) {
  return noteWithOctave.replace(/\d+$/, '');
}

function parseTabBlocks(tabText: string): ParsedTabBlock[] {
  const lines = tabText.replace(/\r/g, '').split('\n');
  const blocks: ParsedTabBlock[] = [];
  let currentBlock: ParsedTabLine[] = [];

  const pushCurrentBlock = (countContent: string | null = null) => {
    if (currentBlock.length === 0) return;
    blocks.push({ rows: currentBlock, countContent });
    currentBlock = [];
  };

  const extractCountContent = (line: string): string | null => {
    const firstDigitIndex = line.search(/\d/);
    if (firstDigitIndex < 0) return null;
    return line.slice(firstDigitIndex);
  };

  for (const line of lines) {
    // Accept both "string" and localized labels such as "??????" by allowing any word after the number.
    const match = line.match(/^\s*(\d+)\s*\S+\s+(.*)$/i);
    if (!match) {
      if (currentBlock.length > 0) {
        pushCurrentBlock(extractCountContent(line));
      }
      continue;
    }

    currentBlock.push({
      stringNumber: Number.parseInt(match[1], 10),
      content: match[2] ?? '',
    });
  }

  pushCurrentBlock(null);
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

  return events.sort((a, b) => a.column - b.column || a.stringNumber - b.stringNumber);
}

function parseCountTokens(countContent: string): CountToken[] {
  return Array.from(countContent.matchAll(/\S+/g)).map((match) => ({
    text: match[0] ?? '',
    startColumn: match.index ?? 0,
  }));
}

function inferCountStepsPerBeat(tokens: CountToken[]): number | null {
  const numericTokenIndexes = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => /^\d+$/.test(token.text))
    .map(({ index }) => index);

  if (numericTokenIndexes.length < 2) return null;

  const diffFrequency = new Map<number, number>();
  for (let i = 1; i < numericTokenIndexes.length; i++) {
    const diff = numericTokenIndexes[i] - numericTokenIndexes[i - 1];
    if (diff <= 0) continue;
    diffFrequency.set(diff, (diffFrequency.get(diff) ?? 0) + 1);
  }

  if (diffFrequency.size === 0) return null;

  return [...diffFrequency.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
}

function findNearestCountTokenIndex(tokens: CountToken[], column: number): number | null {
  if (tokens.length === 0) return null;

  let bestIndex = 0;
  let bestDistance = Math.abs(tokens[0].startColumn - column);
  for (let i = 1; i < tokens.length; i++) {
    const distance = Math.abs(tokens[i].startColumn - column);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function applyDurationColumns(events: ParsedAsciiTabMelodyEvent[], blockMaxLength: number) {
  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const next = events[i + 1];
    const rawDuration = next && next.column > current.column ? next.column - current.column : blockMaxLength - current.column;
    current.durationColumns = Math.max(1, rawDuration);
  }
}

function applyCountTiming(events: ParsedAsciiTabMelodyEvent[], blockMaxLength: number, countContent: string | null) {
  if (!countContent || events.length === 0) return;

  const countTokens = parseCountTokens(countContent);
  if (countTokens.length === 0) return;

  const countStepsPerBeat = inferCountStepsPerBeat(countTokens);

  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const next = events[i + 1];
    const currentTokenIndex = findNearestCountTokenIndex(countTokens, current.column);
    const nextColumn = next?.column ?? blockMaxLength;
    const nextTokenIndex = findNearestCountTokenIndex(countTokens, nextColumn);

    if (currentTokenIndex === null || nextTokenIndex === null) continue;

    const durationCountSteps = Math.max(1, nextTokenIndex - currentTokenIndex);
    current.durationCountSteps = durationCountSteps;
    if (countStepsPerBeat && countStepsPerBeat > 0) {
      current.durationBeats = durationCountSteps / countStepsPerBeat;
    }
  }
}

export function parseAsciiTabMelodyEvents(tabText: string): ParsedTabEvent[] {
  const blocks = parseTabBlocks(tabText);
  if (blocks.length === 0) {
    throw new Error('No tab lines found. Use lines like "1 string ..." or localized string labels.');
  }

  return blocks.flatMap((block) => parseEventsFromBlock(block.rows));
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
    throw new Error('No tab lines found. Use lines like "1 string ..." or localized string labels.');
  }

  const groupedEvents: ParsedAsciiTabMelodyEvent[] = [];
  for (const block of blocks) {
    const events = parseEventsFromBlock(block.rows);
    if (events.length === 0) continue;

    const blockMaxLength = block.rows.reduce((max, row) => Math.max(max, row.content.length), 0);
    const blockGroupedEvents: ParsedAsciiTabMelodyEvent[] = [];

    let currentColumn: number | null = null;
    let currentNotes: ParsedAsciiTabMelodyStep[] = [];

    const pushCurrent = () => {
      if (currentColumn === null || currentNotes.length === 0) return;
      blockGroupedEvents.push({
        column: currentColumn,
        durationColumns: 1,
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
    applyDurationColumns(blockGroupedEvents, blockMaxLength);
    applyCountTiming(blockGroupedEvents, blockMaxLength, block.countContent);

    groupedEvents.push(...blockGroupedEvents);
  }

  if (groupedEvents.length === 0) {
    throw new Error('No playable notes found in the ASCII tab.');
  }

  return groupedEvents;
}
