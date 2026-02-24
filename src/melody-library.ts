import type { IInstrument } from './instruments/instrument';
import { parseAsciiTabToMelodyEvents } from './ascii-tab-melody-parser';

export interface MelodyEventNote {
  note: string;
  stringName: string | null;
  fret: number | null;
}

export interface MelodyEvent {
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
}

interface StoredCustomMelody {
  id: string;
  name: string;
  instrumentName: IInstrument['name'];
  tabText: string;
  createdAtMs: number;
}

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
    return parsed.filter((item): item is StoredCustomMelody => {
      return (
        !!item &&
        typeof item === 'object' &&
        typeof (item as { id?: unknown }).id === 'string' &&
        typeof (item as { name?: unknown }).name === 'string' &&
        ((item as { instrumentName?: unknown }).instrumentName === 'guitar' ||
          (item as { instrumentName?: unknown }).instrumentName === 'ukulele') &&
        typeof (item as { tabText?: unknown }).tabText === 'string' &&
        typeof (item as { createdAtMs?: unknown }).createdAtMs === 'number'
      );
    });
  } catch (error) {
    console.warn('Failed to read custom melody library:', error);
    return [];
  }
}

function writeCustomMelodiesToStorage(entries: StoredCustomMelody[]) {
  localStorage.setItem(CUSTOM_MELODY_STORAGE_KEY, JSON.stringify(entries));
}

function mapStoredCustomMelodyToDefinition(
  entry: StoredCustomMelody,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
): MelodyDefinition | null {
  if (entry.instrumentName !== instrument.name) return null;
  try {
    const events = parseAsciiTabToMelodyEvents(entry.tabText, instrument).map((event) => ({
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
