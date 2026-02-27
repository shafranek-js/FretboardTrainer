import type { IInstrument } from './instruments/instrument';
import type { MelodyEvent } from './melody-library';
import {
  DEFAULT_TABLATURE_MAX_FRET,
  buildPositionCandidatesByMidi,
  chooseEventPositions,
  createFallbackEmptyAssignment,
  selectOptimalAssignmentPath,
  toPitchClassFromMidi,
  type EventMidiOccurrence,
} from './tablature-optimizer';

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

interface NormalizedMidiNote {
  midi: number;
  startTick: number;
  durationTicks: number;
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

function getTicksPerBar(ppq: number, header: MidiHeaderLike | undefined) {
  const ts = getPrimaryTimeSignature(header);
  const numerator = ts?.numerator ?? 4;
  const denominator = ts?.denominator ?? 4;
  const ticksPerBar = ppq * numerator * (4 / denominator);
  if (!Number.isFinite(ticksPerBar) || ticksPerBar <= 0) return null;
  return ticksPerBar;
}

function resolveBarIndexFromTick(startTick: number, ticksPerBar: number | null) {
  if (ticksPerBar === null || !Number.isFinite(ticksPerBar) || ticksPerBar <= 0) return undefined;
  return Math.max(0, Math.floor(startTick / ticksPerBar));
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
  const ticksPerBar = getTicksPerBar(ppq, midi.header);
  if (ticksPerBar === null) return null;

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
  const ticksPerBar = getTicksPerBar(ppq, midi.header);

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
  const importEvents = startTicks.map((startTick, i) => {
    const eventNotes = grouped.get(startTick) ?? [];
    const nextStartTick = startTicks[i + 1] ?? null;
    const maxEndTick = eventNotes.reduce((max, note) => {
      const endTick = startTick + Math.max(1, Math.round(Number(note.durationTicks) || 1));
      return Math.max(max, endTick);
    }, startTick + 1);
    const durationTicks = Math.max(1, (nextStartTick ?? maxEndTick) - startTick);
    const eventMidiOccurrences: EventMidiOccurrence[] = eventNotes
      .map((note, occurrenceIndex) => {
        const midi = Math.round(note.midi);
        if (!Number.isFinite(midi)) return null;
        return {
          midi,
          pitchClass: toPitchClassFromMidi(midi),
          occurrenceIndex,
        };
      })
      .filter((occurrence): occurrence is EventMidiOccurrence => occurrence !== null);

    const assignments = chooseEventPositions(eventMidiOccurrences, candidateMap);
    return {
      barIndex: resolveBarIndexFromTick(startTick, ticksPerBar),
      durationBeats: durationTicks / ppq,
      occurrences: eventMidiOccurrences,
      assignments:
        assignments.length > 0 ? assignments : [createFallbackEmptyAssignment(eventMidiOccurrences.length)],
    };
  });
  const assignmentPath = selectOptimalAssignmentPath(importEvents, { unresolvedPenalty: 28 });

  const events: MelodyEvent[] = [];
  let skippedUnresolvedNotesCount = 0;
  let skippedEmptyEventsCount = 0;

  if (assignmentPath.events.length > 0) {
    assignmentPath.events.forEach((event, eventIndex) => {
      const assignment = assignmentPath.selectedAssignments[eventIndex];
      skippedUnresolvedNotesCount += assignment.unresolvedCount;
      if (assignment.notes.length === 0) {
        skippedEmptyEventsCount++;
        return;
      }
      events.push({
        barIndex: event.barIndex,
        durationBeats: event.durationBeats,
        notes: assignment.notes,
      });
    });
  }

  if (events.length === 0) {
    throw new Error(
      `Selected MIDI track has note events, but none could be mapped to playable positions within fret 0-${DEFAULT_TABLATURE_MAX_FRET}.`
    );
  }

  if (skippedUnresolvedNotesCount > 0) {
    warnings.push(
      `Skipped ${skippedUnresolvedNotesCount} MIDI note${skippedUnresolvedNotesCount === 1 ? '' : 's'} outside the playable import range (frets 0-${DEFAULT_TABLATURE_MAX_FRET}).`
    );
  }
  if (skippedEmptyEventsCount > 0) {
    warnings.push(
      `Skipped ${skippedEmptyEventsCount} event${skippedEmptyEventsCount === 1 ? '' : 's'} because no playable fretboard positions were available.`
    );
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
