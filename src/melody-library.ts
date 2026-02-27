import type { IInstrument } from './instruments/instrument';
import { parseAsciiTabToMelodyEvents } from './ascii-tab-melody-parser';
import { resolveMelodyEventPositions } from './melody-position-resolver';

export interface MelodyEventNote {
  note: string;
  stringName: string | null;
  fret: number | null;
}

export interface MelodyEvent {
  column?: number;
  durationColumns?: number;
  durationCountSteps?: number;
  durationBeats?: number;
  notes: MelodyEventNote[];
}

export interface MelodyDefinition {
  id: string;
  name: string;
  source: 'builtin' | 'custom';
  instrumentName: IInstrument['name'] | 'any';
  events: MelodyEvent[];
  tabText?: string;
  createdAtMs?: number;
  sourceFormat?: 'ascii' | 'gp' | 'gp3' | 'gp4' | 'gp5' | 'gpx' | 'gp7' | 'midi';
  sourceFileName?: string;
  sourceTrackName?: string;
  sourceScoreTitle?: string;
  sourceTempoBpm?: number;
}

interface StoredCustomMelodyBase {
  id: string;
  name: string;
  instrumentName: IInstrument['name'];
  createdAtMs: number;
}

interface StoredCustomAsciiMelody extends StoredCustomMelodyBase {
  format?: 'ascii';
  tabText: string;
}

interface StoredCustomEventMelody extends StoredCustomMelodyBase {
  format: 'events';
  sourceFormat: 'gp' | 'gp3' | 'gp4' | 'gp5' | 'gpx' | 'gp7' | 'midi';
  sourceFileName?: string;
  sourceTrackName?: string;
  sourceScoreTitle?: string;
  sourceTempoBpm?: number;
  events: MelodyEvent[];
}

type StoredCustomMelody = StoredCustomAsciiMelody | StoredCustomEventMelody;

const CUSTOM_MELODY_STORAGE_KEY = 'fretboardTrainer.customMelodies.v1';

interface BuiltinAsciiTabMelodySpec {
  id: string;
  name: string;
  instrumentName: IInstrument['name'];
  tabText: string;
}

const BUILTIN_ASCII_TAB_MELODIES: BuiltinAsciiTabMelodySpec[] = [
  {
    id: 'builtin:guitar:ode_to_joy_intro',
    name: 'Ode to Joy (Theme)',
    instrumentName: 'guitar',
    tabText: [
      '2 string |7---------------8-------10------|10------8-------7---------------|',
      '3 string |--------------------------------|------------------------9-------|',
      '',
      '2 string |------------------------7-------|7-------------------------------|',
      '3 string |7-------7-------9---------------|------------9---9---------------|',
      '',
      '2 string |7-------7-------8-------10------|10------8-------7---------------|',
      '3 string |--------------------------------|------------------------9-------|',
      '',
      '2 string |------------------------7-------|--------------------------------|',
      '3 string |7-------7-------9---------------|9-----------7---7---------------|',
      '',
      '2 string |----------------7---------------|--------7---8---7---------------|',
      '3 string |9-----------------------7-------|9-----------------------7-------|',
      '',
      '2 string |--------7---8---7---------------|--------------------------------|',
      '3 string |9-----------------------9-------|7-------9-----------------------|',
      '4 string |--------------------------------|----------------7---------------|',
      '',
      '2 string |7-------7-------8-------10------|10------8-------7---------------|',
      '3 string |--------------------------------|------------------------9-------|',
      '',
      '2 string |------------------------7-------|--------------------------------|',
      '3 string |7-------7-------9---------------|9-----------7---7---------------|',
    ].join('\n'),
  },
  {
    id: 'builtin:guitar:twinkle_phrase',
    name: 'Twinkle Twinkle (Phrase)',
    instrumentName: 'guitar',
    tabText: [
      '3 string --------0---0---2---2---0-------------------------------',
      '4 string ----------------------------3---3---2---2---0---0-------',
      '5 string 3---3----------------------------------------------3---',
    ].join('\n'),
  },
  {
    id: 'builtin:ukulele:ode_to_joy_intro',
    name: 'Ode to Joy (Intro)',
    instrumentName: 'ukulele',
    // Intentionally low-position (0-3 frets) so beginners can play it comfortably.
    tabText: [
      `2 string ${[
        '0---',
        '0---',
        '2---',
        '3---',
        '3---',
        '2---',
        '0---',
        '----',
        '----',
        '----',
        '----',
        '0---',
        '0---',
        '----',
        '----',
      ].join('')}`,
      `3 string ${[
        '----',
        '----',
        '----',
        '----',
        '----',
        '----',
        '----',
        '2---',
        '0---',
        '0---',
        '2---',
        '----',
        '----',
        '2---',
        '2---',
      ].join('')}`,
    ].join('\n'),
  },
  {
    id: 'builtin:ukulele:twinkle_phrase',
    name: 'Twinkle Twinkle (Phrase)',
    instrumentName: 'ukulele',
    tabText: [
      `1 string ${['3---', '3---', '----', '----', '0---', '0---', '----', '----', '----', '----', '----', '----', '----', '----'].join('')}`,
      `2 string ${['----', '----', '3---', '3---', '----', '----', '3---', '1---', '1---', '0---', '0---', '----', '----', '----'].join('')}`,
      `3 string ${['----', '----', '----', '----', '----', '----', '----', '----', '----', '----', '----', '2---', '2---', '0---'].join('')}`,
    ].join('\n'),
  },
];

function readCustomMelodiesFromStorage(): StoredCustomMelody[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CUSTOM_MELODY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredCustomMelody => isStoredCustomMelody(item));
  } catch (error) {
    console.warn('Failed to read custom melody library:', error);
    return [];
  }
}

function writeCustomMelodiesToStorage(entries: StoredCustomMelody[]) {
  localStorage.setItem(CUSTOM_MELODY_STORAGE_KEY, JSON.stringify(entries));
}

function isMelodyEventNote(value: unknown): value is MelodyEventNote {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { note?: unknown }).note === 'string' &&
    (((value as { stringName?: unknown }).stringName === null) ||
      typeof (value as { stringName?: unknown }).stringName === 'string') &&
    (((value as { fret?: unknown }).fret === null) || typeof (value as { fret?: unknown }).fret === 'number')
  );
}

function isMelodyEvent(value: unknown): value is MelodyEvent {
  if (!value || typeof value !== 'object') return false;
  const notes = (value as { notes?: unknown }).notes;
  if (!Array.isArray(notes) || !notes.every((note) => isMelodyEventNote(note))) return false;

  const numericOptionalKeys: (keyof Pick<
    MelodyEvent,
    'column' | 'durationColumns' | 'durationCountSteps' | 'durationBeats'
  >)[] = ['column', 'durationColumns', 'durationCountSteps', 'durationBeats'];

  return numericOptionalKeys.every((key) => {
    const fieldValue = (value as Record<string, unknown>)[key];
    return typeof fieldValue === 'undefined' || typeof fieldValue === 'number';
  });
}

function isStoredCustomMelodyBase(value: unknown): value is StoredCustomMelodyBase {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { name?: unknown }).name === 'string' &&
    ((value as { instrumentName?: unknown }).instrumentName === 'guitar' ||
      (value as { instrumentName?: unknown }).instrumentName === 'ukulele') &&
    typeof (value as { createdAtMs?: unknown }).createdAtMs === 'number'
  );
}

function isStoredCustomMelody(value: unknown): value is StoredCustomMelody {
  if (!isStoredCustomMelodyBase(value)) return false;

  const format = (value as { format?: unknown }).format;
  if (format === 'events') {
    const sourceFormat = (value as { sourceFormat?: unknown }).sourceFormat;
    const events = (value as { events?: unknown }).events;
    const isSupportedSourceFormat =
      sourceFormat === 'gp' ||
      sourceFormat === 'gp3' ||
      sourceFormat === 'gp4' ||
      sourceFormat === 'gp5' ||
      sourceFormat === 'gpx' ||
      sourceFormat === 'gp7' ||
      sourceFormat === 'midi';
    return (
      isSupportedSourceFormat &&
      Array.isArray(events) &&
      events.every((event) => isMelodyEvent(event))
    );
  }

  // Backward-compatible ASCII entries may omit "format".
  return typeof (value as { tabText?: unknown }).tabText === 'string';
}

function cloneMelodyEvents(events: MelodyEvent[]): MelodyEvent[] {
  return events.map((event) => ({
    column: event.column,
    durationColumns: event.durationColumns,
    durationCountSteps: event.durationCountSteps,
    durationBeats: event.durationBeats,
    notes: event.notes.map((note) => ({
      note: note.note,
      stringName: note.stringName,
      fret: note.fret,
    })),
  }));
}

function mapStoredCustomMelodyToDefinition(
  entry: StoredCustomMelody,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
): MelodyDefinition | null {
  if (entry.instrumentName !== instrument.name) return null;
  try {
    if (entry.format === 'events') {
      const resolved = resolveMelodyEventPositions(cloneMelodyEvents(entry.events), instrument);
      return {
        id: entry.id,
        name: entry.name,
        source: 'custom',
        instrumentName: entry.instrumentName,
        events: resolved.events,
        createdAtMs: entry.createdAtMs,
        sourceFormat: entry.sourceFormat,
        sourceFileName: entry.sourceFileName,
        sourceTrackName: entry.sourceTrackName,
        sourceScoreTitle: entry.sourceScoreTitle,
        sourceTempoBpm: entry.sourceTempoBpm,
      };
    }

    const events = parseAsciiTabToMelodyEvents(entry.tabText, instrument).map((event) => ({
      column: event.column,
      durationColumns: event.durationColumns,
      durationCountSteps: event.durationCountSteps,
      durationBeats: event.durationBeats,
      notes: event.notes.map((step) => ({
        note: step.note,
        stringName: step.stringName,
        fret: step.fret,
      })),
    }));
    return {
      id: entry.id,
      name: entry.name,
      source: 'custom',
      instrumentName: entry.instrumentName,
      events,
      tabText: entry.tabText,
      createdAtMs: entry.createdAtMs,
      sourceFormat: 'ascii',
    };
  } catch (error) {
    console.warn(`Failed to parse stored custom melody "${entry.name}":`, error);
    return null;
  }
}

function mapBuiltinAsciiTabMelodyToDefinition(
  spec: BuiltinAsciiTabMelodySpec,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
): MelodyDefinition | null {
  if (spec.instrumentName !== instrument.name) return null;
  try {
    const events = parseAsciiTabToMelodyEvents(spec.tabText, instrument).map((event) => ({
      column: event.column,
      durationColumns: event.durationColumns,
      durationCountSteps: event.durationCountSteps,
      durationBeats: event.durationBeats,
      notes: event.notes.map((step) => ({
        note: step.note,
        stringName: step.stringName,
        fret: step.fret,
      })),
    }));
    return {
      id: spec.id,
      name: spec.name,
      source: 'builtin',
      instrumentName: spec.instrumentName,
      events,
      tabText: spec.tabText,
      sourceFormat: 'ascii',
    };
  } catch (error) {
    console.warn(`Failed to parse built-in melody "${spec.name}" for ${spec.instrumentName}:`, error);
    return null;
  }
}

export function listMelodiesForInstrument(
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const builtins = BUILTIN_ASCII_TAB_MELODIES
    .map((spec) => mapBuiltinAsciiTabMelodyToDefinition(spec, instrument))
    .filter((entry): entry is MelodyDefinition => entry !== null);

  const custom = readCustomMelodiesFromStorage()
    .map((entry) => mapStoredCustomMelodyToDefinition(entry, instrument))
    .filter((entry): entry is MelodyDefinition => entry !== null)
    .sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));

  return [...builtins, ...custom];
}

export function getMelodyById(
  melodyId: string,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  return listMelodiesForInstrument(instrument).find((melody) => melody.id === melodyId) ?? null;
}

export function saveCustomAsciiTabMelody(
  name: string,
  tabText: string,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const trimmedName = name.trim();
  const trimmedTabText = tabText.trim();
  if (!trimmedName) {
    throw new Error('Melody name is required.');
  }
  if (!trimmedTabText) {
    throw new Error('ASCII tab text is required.');
  }

  // Validate by parsing before persisting.
  parseAsciiTabToMelodyEvents(trimmedTabText, instrument);

  const entry: StoredCustomMelody = {
    id: `custom:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName,
    instrumentName: instrument.name,
    format: 'ascii',
    tabText: trimmedTabText,
    createdAtMs: Date.now(),
  };

  const current = readCustomMelodiesFromStorage();
  current.push(entry);
  writeCustomMelodiesToStorage(current);

  return entry.id;
}

export function deleteCustomMelody(melodyId: string) {
  if (!melodyId.startsWith('custom:')) return false;
  const current = readCustomMelodiesFromStorage();
  const next = current.filter((entry) => entry.id !== melodyId);
  if (next.length === current.length) return false;
  writeCustomMelodiesToStorage(next);
  return true;
}

export function isCustomMelodyId(melodyId: string) {
  return melodyId.startsWith('custom:');
}

export function saveCustomEventMelody(
  name: string,
  events: MelodyEvent[],
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>,
  options?: {
    sourceFormat?: StoredCustomEventMelody['sourceFormat'];
    sourceFileName?: string;
    sourceTrackName?: string;
    sourceScoreTitle?: string;
    sourceTempoBpm?: number;
  }
) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Melody name is required.');
  }
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('Imported melody must contain at least one note event.');
  }
  if (!events.every((event) => isMelodyEvent(event))) {
    throw new Error('Imported melody event data is invalid.');
  }
  const resolvedEvents = resolveMelodyEventPositions(cloneMelodyEvents(events), instrument).events;

  const entry: StoredCustomEventMelody = {
    id: `custom:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName,
    instrumentName: instrument.name,
    format: 'events',
    sourceFormat: options?.sourceFormat ?? 'gp5',
    sourceFileName: options?.sourceFileName,
    sourceTrackName: options?.sourceTrackName,
    sourceScoreTitle: options?.sourceScoreTitle,
    sourceTempoBpm:
      typeof options?.sourceTempoBpm === 'number' && Number.isFinite(options.sourceTempoBpm)
        ? Math.round(options.sourceTempoBpm)
        : undefined,
    events: resolvedEvents,
    createdAtMs: Date.now(),
  };

  const current = readCustomMelodiesFromStorage();
  current.push(entry);
  writeCustomMelodiesToStorage(current);
  return entry.id;
}

export function updateCustomAsciiTabMelody(
  melodyId: string,
  name: string,
  tabText: string,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  if (!isCustomMelodyId(melodyId)) {
    throw new Error('Only custom melodies can be edited.');
  }

  const trimmedName = name.trim();
  const trimmedTabText = tabText.trim();
  if (!trimmedName) {
    throw new Error('Melody name is required.');
  }
  if (!trimmedTabText) {
    throw new Error('ASCII tab text is required.');
  }

  // Validate edited content for the current instrument before persisting.
  parseAsciiTabToMelodyEvents(trimmedTabText, instrument);

  const current = readCustomMelodiesFromStorage();
  const targetIndex = current.findIndex((entry) => entry.id === melodyId);
  if (targetIndex < 0) {
    throw new Error('Custom melody not found.');
  }

  const target = current[targetIndex];
  if (target.format === 'events') {
    throw new Error('This imported melody cannot be edited as ASCII tab.');
  }
  if (target.instrumentName !== instrument.name) {
    throw new Error('Selected melody does not belong to the current instrument.');
  }

  current[targetIndex] = {
    ...target,
    name: trimmedName,
    tabText: trimmedTabText,
  };

  writeCustomMelodiesToStorage(current);
  return melodyId;
}
