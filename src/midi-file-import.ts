import type { IInstrument } from './instruments/instrument';
import type { MelodyEvent, MelodyEventNote } from './melody-library';

const DEFAULT_MIDI_IMPORT_MAX_FRET = 24;
const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

interface MidiHeaderLike {
  ppq?: number;
  tempos?: { bpm?: number }[];
  timeSignatures?: { ticks?: number; timeSignature?: number[] }[];
  keySignatures?: { key?: string; scale?: string }[];
  name?: string;
}

interface MidiNoteLike {
  midi?: number;
  ticks?: number;
  durationTicks?: number;
  name?: string;
}

interface MidiTrackLike {
  name?: string;
  channel?: number;
  instrument?: { percussion?: boolean; name?: string };
  notes?: MidiNoteLike[];
}

interface MidiFileLike {
  header?: MidiHeaderLike;
  name?: string;
  tracks?: MidiTrackLike[];
}

export interface MidiImportedMelody {
  suggestedName: string;
  events: MelodyEvent[];
  warnings: string[];
  metadata: {
    sourceFormat: 'midi';
    sourceFileName: string;
    midiName: string | null;
    trackName: string | null;
    tempoBpm: number | null;
  };
}

export type MidiImportQuantize = 'off' | '1/16' | '1/8';

export interface MidiImportConversionOptions {
  quantize?: MidiImportQuantize;
}

export interface MidiImportTrackOption {
  trackIndex: number;
  name: string;
  label: string;
  noteCount: number;
  isPercussion: boolean;
  noteRangeText: string | null;
  estimatedBars: number | null;
  endTick: number | null;
}

export interface LoadedMidiFile {
  midi: MidiFileLike;
  sourceFileName: string;
  midiName: string | null;
  tempoBpm: number | null;
  tempoChangesCount: number;
  timeSignatureText: string | null;
  keySignatureText: string | null;
  trackOptions: MidiImportTrackOption[];
  defaultTrackIndex: number | null;
}

interface PositionCandidate {
  stringName: string;
  fret: number;
  stringIndex: number;
}

interface NormalizedMidiNote {
  midi: number;
  startTick: number;
  durationTicks: number;
}

function parseScientificNoteToMidi(noteWithOctave: string): number | null {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(noteWithOctave.trim());
  if (!match) return null;
  const [, letter, sharp, octaveText] = match;
  const octave = Number.parseInt(octaveText, 10);
  if (!Number.isFinite(octave)) return null;
  const baseByLetter: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = baseByLetter[letter];
  if (!Number.isFinite(base)) return null;
  return (octave + 1) * 12 + base + (sharp ? 1 : 0);
}

function toPitchClassFromMidi(midi: number) {
  const normalized = ((Math.round(midi) % 12) + 12) % 12;
  return PITCH_CLASS_NAMES[normalized] ?? 'C';
}

function toScientificNameFromMidi(midi: number) {
  const rounded = Math.round(midi);
  const pitch = PITCH_CLASS_NAMES[((rounded % 12) + 12) % 12] ?? 'C';
  const octave = Math.floor(rounded / 12) - 1;
  return `${pitch}${octave}`;
}

export function normalizeMidiImportQuantize(value: string | null | undefined): MidiImportQuantize {
  return value === '1/16' || value === '1/8' ? value : 'off';
}

function getMidiQuantizeStepTicks(ppq: number, quantize: MidiImportQuantize) {
  if (quantize === 'off') return null;
  const denominator = quantize === '1/8' ? 8 : 16;
  const ticks = (ppq * 4) / denominator;
  if (!Number.isFinite(ticks) || ticks <= 0) return null;
  return ticks;
}

function quantizeTick(tick: number, stepTicks: number) {
  return Math.max(0, Math.round(tick / stepTicks) * stepTicks);
}

function normalizeMidiNotesForConversion(
  notes: MidiNoteLike[],
  ppq: number,
  quantize: MidiImportQuantize
): NormalizedMidiNote[] {
  const quantizeStepTicks = getMidiQuantizeStepTicks(ppq, quantize);
  const minimumDurationTicks = quantizeStepTicks !== null ? Math.max(1, Math.round(quantizeStepTicks)) : 1;

  return notes
    .filter((note) => Number.isFinite(note.midi) && Number.isFinite(note.ticks))
    .map((note) => {
      const midi = Math.round(Number(note.midi));
      const rawStartTick = Math.max(0, Math.round(Number(note.ticks)));
      const rawDurationTicks = Math.max(1, Math.round(Number(note.durationTicks ?? 0) || 1));

      if (quantizeStepTicks === null) {
        return { midi, startTick: rawStartTick, durationTicks: rawDurationTicks };
      }

      const rawEndTick = rawStartTick + rawDurationTicks;
      const quantizedStartTick = quantizeTick(rawStartTick, quantizeStepTicks);
      let quantizedEndTick = quantizeTick(rawEndTick, quantizeStepTicks);
      if (quantizedEndTick <= quantizedStartTick) {
        quantizedEndTick = quantizedStartTick + minimumDurationTicks;
      }

      return {
        midi,
        startTick: quantizedStartTick,
        durationTicks: Math.max(minimumDurationTicks, quantizedEndTick - quantizedStartTick),
      };
    })
    .sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
}

function buildSuggestedName(fileName: string, midiName: string | null, trackName: string | null) {
  const fileStem = fileName.replace(/\.[^.]+$/, '').trim();
  const primary = (midiName ?? '').trim() || fileStem || 'Imported MIDI Melody';
  const track = (trackName ?? '').trim();
  if (!track || track.toLowerCase() === primary.toLowerCase()) return primary;
  return `${primary} - ${track}`;
}

function getTrackDisplayName(track: MidiTrackLike, trackIndex: number) {
  const byName = track.name?.trim();
  if (byName) return byName;
  const instrumentName = track.instrument?.name?.trim();
  if (instrumentName) return instrumentName;
  return `Track ${trackIndex + 1}`;
}

function getPrimaryTimeSignature(header: MidiHeaderLike | undefined) {
  const first = header?.timeSignatures?.find(
    (item) =>
      Array.isArray(item?.timeSignature) &&
      typeof item.timeSignature?.[0] === 'number' &&
      typeof item.timeSignature?.[1] === 'number'
  );
  if (!first?.timeSignature) return null;
  const [numerator, denominator] = first.timeSignature;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return { numerator: Math.round(numerator), denominator: Math.round(denominator) };
}

function getPrimaryKeySignatureText(header: MidiHeaderLike | undefined) {
  const first = header?.keySignatures?.find(
    (item) => typeof item?.key === 'string' && item.key.trim().length > 0
  );
  if (!first?.key) return null;
  const key = first.key.trim();
  const scale = typeof first.scale === 'string' ? first.scale.trim().toLowerCase() : '';
  if (scale === 'minor') return `${key} minor`;
  if (scale === 'major') return `${key} major`;
  return key;
}

function estimateTrackBars(track: MidiTrackSelection, midi: MidiFileLike): number | null {
  if (track.notes.length === 0) return null;
  const ppq = Number.isFinite(midi.header?.ppq) && Number(midi.header?.ppq) > 0 ? Number(midi.header?.ppq) : 480;
  const ts = getPrimaryTimeSignature(midi.header);
  const numerator = ts?.numerator ?? 4;
  const denominator = ts?.denominator ?? 4;
  const ticksPerBar = ppq * numerator * (4 / denominator);
  if (!Number.isFinite(ticksPerBar) || ticksPerBar <= 0) return null;

  const endTick = track.notes.reduce((max, note) => {
    const start = Number.isFinite(note.ticks) ? Number(note.ticks) : 0;
    const duration = Number.isFinite(note.durationTicks) ? Number(note.durationTicks) : 0;
    return Math.max(max, start + Math.max(1, duration));
  }, 0);
  if (endTick <= 0) return null;
  return Math.max(1, Math.ceil(endTick / ticksPerBar));
}

function getTrackNoteRangeText(track: MidiTrackSelection) {
  const midiValues = track.notes
    .map((note) => (Number.isFinite(note.midi) ? Math.round(Number(note.midi)) : null))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (midiValues.length === 0) return null;
  return `${toScientificNameFromMidi(midiValues[0])} - ${toScientificNameFromMidi(midiValues[midiValues.length - 1])}`;
}

interface MidiTrackSelection {
  track: MidiTrackLike;
  index: number;
  notes: MidiNoteLike[];
  isPercussion: boolean;
}

function listMidiTrackSelections(midi: MidiFileLike): MidiTrackSelection[] {
  return (midi.tracks ?? [])
    .map((track, index) => ({
      track,
      index,
      notes: Array.isArray(track.notes) ? track.notes : [],
      isPercussion: Boolean(track.instrument?.percussion) || track.channel === 9,
    }))
    .filter((entry) => entry.notes.length > 0);
}

function pickMidiTrack(midi: MidiFileLike) {
  const warnings: string[] = [];
  const tracks = listMidiTrackSelections(midi);
  const melodic = tracks.filter((entry) => !entry.isPercussion);
  const pool = melodic.length > 0 ? melodic : tracks;
  if (pool.length === 0) {
    throw new Error('MIDI file does not contain note events.');
  }

  pool.sort((a, b) => b.notes.length - a.notes.length);
  const selected = pool[0];
  if (tracks.length > 1) {
    warnings.push(
      `Imported ${getTrackDisplayName(selected.track, selected.index)} (${selected.notes.length} notes) from ${tracks.length} MIDI tracks.`
    );
  }
  if (selected.isPercussion) {
    warnings.push('Selected track appears to be percussion; fretboard positions may be limited.');
  }
  return { selected, warnings };
}

function buildPositionCandidatesByMidi(
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  maxFret = DEFAULT_MIDI_IMPORT_MAX_FRET
) {
  const byMidi = new Map<number, PositionCandidate[]>();
  instrument.STRING_ORDER.forEach((stringName, stringIndex) => {
    for (let fret = 0; fret <= maxFret; fret++) {
      const noteWithOctave = instrument.getNoteWithOctave(stringName, fret);
      if (!noteWithOctave) continue;
      const midi = parseScientificNoteToMidi(noteWithOctave);
      if (midi === null) continue;
      const list = byMidi.get(midi) ?? [];
      list.push({ stringName, fret, stringIndex });
      byMidi.set(midi, list);
    }
  });
  byMidi.forEach((list) => list.sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex));
  return byMidi;
}

function chooseEventPositions(
  midiValues: number[],
  candidateMap: Map<number, PositionCandidate[]>,
  previousAssigned: PositionCandidate[]
) {
  const previousAvgFret =
    previousAssigned.length > 0
      ? previousAssigned.reduce((sum, item) => sum + item.fret, 0) / previousAssigned.length
      : 5;
  const previousAvgString =
    previousAssigned.length > 0
      ? previousAssigned.reduce((sum, item) => sum + item.stringIndex, 0) / previousAssigned.length
      : 0;

  const usedStrings = new Set<string>();
  const chosen = new Map<number, PositionCandidate>();
  const sortedUniqueMidi = [...new Set(midiValues)].sort((a, b) => b - a);

  for (const midi of sortedUniqueMidi) {
    const candidates = candidateMap.get(midi) ?? [];
    const ranked = candidates
      .filter((candidate) => !usedStrings.has(candidate.stringName))
      .sort((a, b) => {
        const scoreA =
          Math.abs(a.fret - previousAvgFret) + Math.abs(a.stringIndex - previousAvgString) * 1.5 + a.fret * 0.03;
        const scoreB =
          Math.abs(b.fret - previousAvgFret) + Math.abs(b.stringIndex - previousAvgString) * 1.5 + b.fret * 0.03;
        return scoreA - scoreB;
      });
    const selected = ranked[0] ?? candidates[0];
    if (!selected) continue;
    chosen.set(midi, selected);
    usedStrings.add(selected.stringName);
  }

  return chosen;
}

function convertMidiTrackSelectionToImportedMelody(
  midi: MidiFileLike,
  selection: MidiTrackSelection,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  sourceFileName: string,
  warnings: string[],
  options?: MidiImportConversionOptions
): MidiImportedMelody {
  const ppq = Number.isFinite(midi.header?.ppq) && Number(midi.header?.ppq) > 0 ? Number(midi.header?.ppq) : 480;
  const quantize = normalizeMidiImportQuantize(options?.quantize);
  const tempoBpm =
    typeof midi.header?.tempos?.[0]?.bpm === 'number' && Number.isFinite(midi.header.tempos[0].bpm)
      ? Math.round(midi.header.tempos[0].bpm)
      : null;
  const midiName = (midi.name ?? midi.header?.name ?? '').trim() || null;
  const trackName = getTrackDisplayName(selection.track, selection.index);

  const notes = normalizeMidiNotesForConversion(selection.notes, ppq, quantize);

  if (notes.length === 0) {
    throw new Error('Selected MIDI track has no note events.');
  }

  const grouped = new Map<number, NormalizedMidiNote[]>();
  for (const note of notes) {
    const list = grouped.get(note.startTick) ?? [];
    list.push(note);
    grouped.set(note.startTick, list);
  }

  const startTicks = [...grouped.keys()].sort((a, b) => a - b);
  const candidateMap = buildPositionCandidatesByMidi(instrument);
  let previousAssigned: PositionCandidate[] = [];
  const events: MelodyEvent[] = [];

  for (let i = 0; i < startTicks.length; i++) {
    const startTick = startTicks[i];
    const eventNotes = grouped.get(startTick) ?? [];
    const nextStartTick = startTicks[i + 1] ?? null;
    const maxEndTick = eventNotes.reduce((max, note) => {
      const endTick = startTick + Math.max(1, Math.round(Number(note.durationTicks) || 1));
      return Math.max(max, endTick);
    }, startTick + 1);
    const durationTicks = Math.max(1, (nextStartTick ?? maxEndTick) - startTick);

    const midiValues = eventNotes
      .map((note) => Math.round(note.midi))
      .filter((value) => Number.isFinite(value));
    const assignedMap = chooseEventPositions(midiValues, candidateMap, previousAssigned);

    const melodyNotes: MelodyEventNote[] = eventNotes.map((note) => {
      const midiValue = Math.round(note.midi);
      const assigned = assignedMap.get(midiValue);
      return {
        note: toPitchClassFromMidi(midiValue),
        stringName: assigned?.stringName ?? null,
        fret: typeof assigned?.fret === 'number' ? assigned.fret : null,
      };
    });

    events.push({
      durationBeats: durationTicks / ppq,
      notes: melodyNotes,
    });

    previousAssigned = [...assignedMap.values()];
  }

  return {
    suggestedName: buildSuggestedName(sourceFileName, midiName, trackName),
    events,
    warnings,
    metadata: {
      sourceFormat: 'midi',
      sourceFileName,
      midiName,
      trackName,
      tempoBpm,
    },
  };
}

export function convertParsedMidiToImportedMelody(
  midi: MidiFileLike,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  sourceFileName: string,
  options?: MidiImportConversionOptions
): MidiImportedMelody {
  const { selected, warnings } = pickMidiTrack(midi);
  return convertMidiTrackSelectionToImportedMelody(midi, selected, instrument, sourceFileName, warnings, options);
}

export function inspectMidiFileForImport(midi: MidiFileLike, sourceFileName: string): LoadedMidiFile {
  const trackSelections = listMidiTrackSelections(midi);
  const midiName = (midi.name ?? midi.header?.name ?? '').trim() || null;
  const tempoEvents = Array.isArray(midi.header?.tempos) ? midi.header.tempos : [];
  const tempoBpm =
    typeof tempoEvents[0]?.bpm === 'number' && Number.isFinite(tempoEvents[0].bpm)
      ? Math.round(tempoEvents[0].bpm)
      : null;
  const tempoChangesCount = tempoEvents.length;

  const primaryTimeSignature = getPrimaryTimeSignature(midi.header);
  const timeSignatureText = primaryTimeSignature
    ? `${primaryTimeSignature.numerator}/${primaryTimeSignature.denominator}`
    : null;
  const keySignatureText = getPrimaryKeySignatureText(midi.header);

  const trackOptions = trackSelections.map((selection) => ({
    trackIndex: selection.index,
    name: getTrackDisplayName(selection.track, selection.index),
    label: `${selection.index + 1}. ${getTrackDisplayName(selection.track, selection.index)} (${selection.notes.length} notes${selection.isPercussion ? ', percussion' : ''})`,
    noteCount: selection.notes.length,
    isPercussion: selection.isPercussion,
    noteRangeText: getTrackNoteRangeText(selection),
    estimatedBars: estimateTrackBars(selection, midi),
    endTick: selection.notes.reduce((max, note) => {
      const start = Number.isFinite(note.ticks) ? Number(note.ticks) : 0;
      const duration = Number.isFinite(note.durationTicks) ? Number(note.durationTicks) : 0;
      return Math.max(max, start + Math.max(1, duration));
    }, 0),
  }));

  const melodic = trackSelections.filter((selection) => !selection.isPercussion);
  const defaultTrackIndex =
    melodic.sort((a, b) => b.notes.length - a.notes.length)[0]?.index ??
    trackSelections.sort((a, b) => b.notes.length - a.notes.length)[0]?.index ??
    null;

  return {
    midi,
    sourceFileName,
    midiName,
    tempoBpm,
    tempoChangesCount,
    timeSignatureText,
    keySignatureText,
    trackOptions,
    defaultTrackIndex,
  };
}

export function convertLoadedMidiTrackToImportedMelody(
  loaded: LoadedMidiFile,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  trackIndex: number,
  options?: MidiImportConversionOptions
): MidiImportedMelody {
  const trackSelections = listMidiTrackSelections(loaded.midi);
  const selected = trackSelections.find((selection) => selection.index === trackIndex);
  if (!selected) {
    throw new Error('Selected MIDI track is not available.');
  }

  const warnings: string[] = [];
  if (trackSelections.length > 1) {
    warnings.push(
      `Imported ${getTrackDisplayName(selected.track, selected.index)} (${selected.notes.length} notes) from ${trackSelections.length} MIDI tracks.`
    );
  }
  if (selected.isPercussion) {
    warnings.push('Selected track appears to be percussion; fretboard positions may be limited.');
  }

  return convertMidiTrackSelectionToImportedMelody(
    loaded.midi,
    selected,
    instrument,
    loaded.sourceFileName,
    warnings,
    options
  );
}

export async function importMidiMelodyFromBytes(
  bytes: Uint8Array,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  sourceFileName: string,
  options?: MidiImportConversionOptions
): Promise<MidiImportedMelody> {
  if (!bytes.length) {
    throw new Error('Selected file is empty.');
  }
  const midiModule = await import('@tonejs/midi');
  const midi = new midiModule.Midi(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  return convertParsedMidiToImportedMelody(midi as unknown as MidiFileLike, instrument, sourceFileName, options);
}

export async function loadMidiFileFromBytes(bytes: Uint8Array, sourceFileName: string): Promise<LoadedMidiFile> {
  if (!bytes.length) {
    throw new Error('Selected file is empty.');
  }
  const midiModule = await import('@tonejs/midi');
  const midi = new midiModule.Midi(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  return inspectMidiFileForImport(midi as unknown as MidiFileLike, sourceFileName);
}
