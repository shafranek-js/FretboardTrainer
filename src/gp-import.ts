import type { IInstrument } from './instruments/instrument';
import type { MelodyEvent, MelodyEventNote } from './melody-library';

const ALPHATAB_TICKS_PER_QUARTER = 960;
const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

interface AlphaTabNoteLike {
  fret?: number;
  string?: number;
  tone?: number;
  octave?: number;
  isTieDestination?: boolean;
}

interface AlphaTabBeatLike {
  notes?: AlphaTabNoteLike[];
  isRest?: boolean;
  absolutePlaybackStart?: number;
  playbackStart?: number;
  playbackDuration?: number;
}

interface AlphaTabVoiceLike {
  beats?: AlphaTabBeatLike[];
}

interface AlphaTabBarLike {
  voices?: AlphaTabVoiceLike[];
}

interface AlphaTabTuningLike {
  tunings?: number[];
  name?: string;
}

interface AlphaTabStaffLike {
  bars?: AlphaTabBarLike[];
  isPercussion?: boolean;
  isStringed?: boolean;
  stringTuning?: AlphaTabTuningLike | null;
  tuningName?: string;
}

interface AlphaTabTrackLike {
  name?: string;
  isPercussion?: boolean;
  staves?: AlphaTabStaffLike[];
}

interface AlphaTabScoreLike {
  title?: string;
  tempo?: number;
  tracks?: AlphaTabTrackLike[];
}

interface TrackSelection {
  track: AlphaTabTrackLike;
  staff: AlphaTabStaffLike;
  trackIndex: number;
  stringCount: number;
}

interface GpImportMetadata {
  sourceFormat: 'gp' | 'gp3' | 'gp4' | 'gp5' | 'gpx' | 'gp7';
  sourceFileName: string;
  scoreTitle: string | null;
  trackName: string | null;
  tempoBpm: number | null;
}

export interface GpImportedMelody {
  suggestedName: string;
  events: MelodyEvent[];
  warnings: string[];
  metadata: GpImportMetadata;
}

function toPitchClassName(tone: number | undefined) {
  if (!Number.isFinite(tone)) return null;
  const normalized = ((Number(tone) % 12) + 12) % 12;
  return PITCH_CLASS_NAMES[normalized] ?? null;
}

function stripOctave(noteWithOctave: string) {
  return noteWithOctave.replace(/\d+$/, '');
}

function parseScientificNoteToMidi(noteWithOctave: string): number | null {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(noteWithOctave.trim());
  if (!match) return null;
  const [, letter, sharp, octaveText] = match;
  const octave = Number.parseInt(octaveText, 10);
  if (!Number.isFinite(octave)) return null;
  const baseByLetter: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  const base = baseByLetter[letter];
  if (!Number.isFinite(base)) return null;
  const semitone = base + (sharp ? 1 : 0);
  return (octave + 1) * 12 + semitone;
}

function getInstrumentTuningMidiTopToBottom(
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'TUNING'>
): number[] | null {
  const midiValues = instrument.STRING_ORDER.map((stringName) => {
    const tuning = instrument.TUNING[stringName];
    return typeof tuning === 'string' ? parseScientificNoteToMidi(tuning) : null;
  });
  return midiValues.every((value) => typeof value === 'number')
    ? (midiValues as number[])
    : null;
}

function detectGpSourceFormat(fileName: string): GpImportMetadata['sourceFormat'] {
  const extension = fileName.trim().split('.').pop()?.toLowerCase();
  if (extension === 'gp3' || extension === 'gp4' || extension === 'gp5' || extension === 'gpx') {
    return extension;
  }
  if (extension === 'gp') return 'gp';
  if (extension === 'gp7') return 'gp7';
  return 'gp';
}

function buildSuggestedMelodyName(
  fileName: string,
  scoreTitle: string | undefined,
  trackName: string | undefined
) {
  const cleanedFileName = fileName.replace(/\.[^.]+$/, '').trim();
  const scorePart = (scoreTitle ?? '').trim() || cleanedFileName || 'Imported Melody';
  const trackPart = (trackName ?? '').trim();
  if (!trackPart) return scorePart;
  if (trackPart.toLowerCase() === scorePart.toLowerCase()) return scorePart;
  return `${scorePart} — ${trackPart}`;
}

function isStringedStaff(staff: AlphaTabStaffLike | undefined | null): staff is AlphaTabStaffLike {
  if (!staff) return false;
  if (staff.isPercussion) return false;
  const tuningCount = staff.stringTuning?.tunings?.length ?? 0;
  return Boolean(staff.isStringed || tuningCount > 0);
}

function pickTrackForInstrument(
  score: AlphaTabScoreLike,
  instrument: Pick<IInstrument, 'STRING_ORDER'>
): { selection: TrackSelection | null; warnings: string[] } {
  const warnings: string[] = [];
  const targetStringCount = instrument.STRING_ORDER.length;
  const candidates: TrackSelection[] = [];

  (score.tracks ?? []).forEach((track, trackIndex) => {
    if (!track || track.isPercussion) return;
    const staff = (track.staves ?? []).find((item) => isStringedStaff(item));
    if (!staff) return;
    const stringCount = staff.stringTuning?.tunings?.length ?? 0;
    if (stringCount <= 0) return;
    candidates.push({ track, staff, trackIndex, stringCount });
  });

  if (candidates.length === 0) {
    return { selection: null, warnings: ['No stringed non-percussion track was found in this Guitar Pro file.'] };
  }

  const exact = candidates.find((candidate) => candidate.stringCount === targetStringCount) ?? null;
  const selection = exact ?? candidates[0] ?? null;
  if (!selection) {
    return { selection: null, warnings: ['No importable track was found.'] };
  }

  if (selection.stringCount !== targetStringCount) {
    warnings.push(
      `Imported track has ${selection.stringCount} strings, but current instrument expects ${targetStringCount}. Some notes may be skipped.`
    );
  }

  if ((score.tracks?.length ?? 0) > 1) {
    warnings.push(
      `Imported track ${selection.trackIndex + 1} of ${score.tracks?.length ?? 1}: ${selection.track.name?.trim() || `Track ${selection.trackIndex + 1}`}.`
    );
  }

  return { selection, warnings };
}

function detectTuningMismatchWarning(
  selection: TrackSelection,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'TUNING'>
) {
  const instrumentTuningMidi = getInstrumentTuningMidiTopToBottom(instrument);
  const trackTuning = selection.staff.stringTuning?.tunings ?? [];
  if (!instrumentTuningMidi) return null;
  if (trackTuning.length !== instrumentTuningMidi.length) return null;
  const sameTuning = trackTuning.every((value, index) => value === instrumentTuningMidi[index]);
  if (sameTuning) return null;
  const trackTuningName = selection.staff.tuningName ?? selection.staff.stringTuning?.name ?? 'custom';
  return `Track tuning (${trackTuningName}) differs from the current instrument tuning. Imported fingering is preserved, but note labels/playback use the current app tuning.`;
}

function convertAlphaTabNoteToMelodyNote(
  note: AlphaTabNoteLike,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
): MelodyEventNote | null {
  if (note.isTieDestination) return null;
  if (!Number.isFinite(note.fret) || !Number.isFinite(note.string)) return null;
  const fret = Number(note.fret);
  const alphaTabString = Number(note.string);
  if (fret < 0 || alphaTabString < 1) return null;

  const topToBottomIndex = instrument.STRING_ORDER.length - alphaTabString;
  const stringName = instrument.STRING_ORDER[topToBottomIndex] ?? null;
  if (!stringName) return null;

  const noteWithOctave = instrument.getNoteWithOctave(stringName, fret);
  const noteName = noteWithOctave ? stripOctave(noteWithOctave) : toPitchClassName(note.tone);
  if (!noteName) return null;

  return { note: noteName, stringName, fret };
}

function dedupeMelodyNotes(notes: MelodyEventNote[]) {
  const seen = new Set<string>();
  const unique: MelodyEventNote[] = [];
  for (const note of notes) {
    const key = `${note.note}|${note.stringName ?? '?'}|${note.fret ?? -1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(note);
  }
  return unique;
}

function convertTrackSelectionToMelodyEvents(
  selection: TrackSelection,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const grouped = new Map<number, { endTick: number; notes: MelodyEventNote[] }>();

  for (const bar of selection.staff.bars ?? []) {
    for (const voice of bar.voices ?? []) {
      for (const beat of voice.beats ?? []) {
        const beatNotes = (beat.notes ?? [])
          .map((note) => convertAlphaTabNoteToMelodyNote(note, instrument))
          .filter((note): note is MelodyEventNote => note !== null);

        if (beatNotes.length === 0 || beat.isRest) {
          continue;
        }

        const startTickRaw = Number.isFinite(beat.absolutePlaybackStart)
          ? Number(beat.absolutePlaybackStart)
          : Number.isFinite(beat.playbackStart)
            ? Number(beat.playbackStart)
            : 0;
        const durationTickRaw = Number.isFinite(beat.playbackDuration) ? Number(beat.playbackDuration) : 0;
        const startTick = Math.max(0, Math.round(startTickRaw));
        const durationTicks = Math.max(1, Math.round(durationTickRaw || ALPHATAB_TICKS_PER_QUARTER));
        const endTick = startTick + durationTicks;

        const existing = grouped.get(startTick);
        if (existing) {
          existing.endTick = Math.max(existing.endTick, endTick);
          existing.notes.push(...beatNotes);
        } else {
          grouped.set(startTick, { endTick, notes: [...beatNotes] });
        }
      }
    }
  }

  const starts = [...grouped.keys()].sort((a, b) => a - b);
  const events: MelodyEvent[] = [];

  for (let i = 0; i < starts.length; i++) {
    const startTick = starts[i];
    const entry = grouped.get(startTick);
    if (!entry) continue;
    const nextStartTick = starts[i + 1] ?? null;
    const durationTicks =
      nextStartTick !== null ? Math.max(1, nextStartTick - startTick) : Math.max(1, entry.endTick - startTick);

    const notes = dedupeMelodyNotes(entry.notes);
    if (notes.length === 0) continue;

    events.push({
      durationBeats: durationTicks / ALPHATAB_TICKS_PER_QUARTER,
      notes,
    });
  }

  return events;
}

export function convertAlphaTabScoreToImportedMelody(
  score: AlphaTabScoreLike,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'TUNING' | 'getNoteWithOctave'>,
  sourceFileName: string
): GpImportedMelody {
  const { selection, warnings } = pickTrackForInstrument(score, instrument);
  if (!selection) {
    throw new Error('No importable stringed track was found in the Guitar Pro file.');
  }

  const tuningWarning = detectTuningMismatchWarning(selection, instrument);
  if (tuningWarning) warnings.push(tuningWarning);

  const events = convertTrackSelectionToMelodyEvents(selection, instrument);
  if (events.length === 0) {
    throw new Error('Imported track does not contain playable note events.');
  }

  const scoreTitle = typeof score.title === 'string' && score.title.trim() ? score.title.trim() : null;
  const trackName =
    typeof selection.track.name === 'string' && selection.track.name.trim()
      ? selection.track.name.trim()
      : `Track ${selection.trackIndex + 1}`;
  const tempoBpm =
    typeof score.tempo === 'number' && Number.isFinite(score.tempo) && score.tempo > 0
      ? Math.round(score.tempo)
      : null;

  return {
    suggestedName: buildSuggestedMelodyName(sourceFileName, scoreTitle ?? undefined, trackName ?? undefined),
    events,
    warnings,
    metadata: {
      sourceFormat: detectGpSourceFormat(sourceFileName),
      sourceFileName,
      scoreTitle,
      trackName,
      tempoBpm,
    },
  };
}

export async function importGpMelodyFromBytes(
  bytes: Uint8Array,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'TUNING' | 'getNoteWithOctave'>,
  sourceFileName: string
): Promise<GpImportedMelody> {
  if (!bytes.length) {
    throw new Error('Selected file is empty.');
  }

  const alphaTabModule = await import('@coderline/alphatab');
  const score = alphaTabModule.importer.ScoreLoader.loadScoreFromBytes(bytes) as unknown as AlphaTabScoreLike;
  return convertAlphaTabScoreToImportedMelody(score, instrument, sourceFileName);
}

