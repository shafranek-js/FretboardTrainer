import { unzipSync } from 'fflate';
import type { IInstrument } from './instruments/instrument';
import type { MelodyEvent, MelodyEventNote } from './melody-library';
import { normalizeMidiImportQuantize, type MidiImportQuantize, type MidiImportTrackOption } from './midi-file-import';

const MUSESCORE_PPQ = 480;
const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

type MusescoreSourceFormat = 'mscx' | 'mscz';
type MuseStringNumberBase = 'one-based' | 'zero-based';

interface ParsedMusescoreNote {
  note: string;
  stringName: string | null;
  fret: number | null;
  midi: number | null;
}

interface ParsedMusescoreChordEvent {
  barIndex: number;
  startTick: number;
  durationTicks: number;
  notes: ParsedMusescoreNote[];
}

interface ParsedMusescoreTrack {
  trackIndex: number;
  name: string;
  noteEvents: ParsedMusescoreChordEvent[];
  isTablature: boolean;
  noteCount: number;
  hasAnyStringFret: boolean;
  averageNotesPerEvent: number;
  noteRangeText: string | null;
  estimatedBars: number | null;
  endTick: number | null;
}

export interface LoadedMusescoreFile {
  midi: null;
  sourceFileName: string;
  sourceFormat: MusescoreSourceFormat;
  midiName: string | null;
  tempoBpm: number | null;
  tempoChangesCount: number;
  timeSignatureText: string | null;
  keySignatureText: string | null;
  trackOptions: MidiImportTrackOption[];
  defaultTrackIndex: number | null;
  tracks: ParsedMusescoreTrack[];
}

export interface MusescoreImportedMelody {
  suggestedName: string;
  events: MelodyEvent[];
  warnings: string[];
  metadata: {
    sourceFormat: MusescoreSourceFormat;
    sourceFileName: string;
    midiName: string | null;
    trackName: string | null;
    tempoBpm: number | null;
    timeSignatureText: string | null;
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripXmlTags(value: string) {
  return value.replace(/<[^>]+>/g, '').trim();
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getFirstTagContent(xml: string, tagName: string) {
  const pattern = new RegExp(`<${escapeRegex(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegex(tagName)}>`, 'i');
  const match = pattern.exec(xml);
  if (!match) return null;
  return decodeXmlEntities(stripXmlTags(match[1] ?? ''));
}

function getTagInt(xml: string, tagName: string) {
  const text = getFirstTagContent(xml, tagName);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAttributeInt(attributes: string, name: string) {
  const match = new RegExp(`\\b${escapeRegex(name)}\\s*=\\s*"(-?\\d+)"`, 'i').exec(attributes);
  if (!match) return null;
  const parsed = Number.parseInt(match[1] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPitchClassNameFromMidi(midi: number) {
  const normalized = ((Math.round(midi) % 12) + 12) % 12;
  return PITCH_CLASS_NAMES[normalized] ?? 'C';
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
  return (octave + 1) * 12 + base + (sharp ? 1 : 0);
}

function toScientificNameFromMidi(midi: number) {
  const rounded = Math.round(midi);
  const pitch = PITCH_CLASS_NAMES[((rounded % 12) + 12) % 12] ?? 'C';
  const octave = Math.floor(rounded / 12) - 1;
  return `${pitch}${octave}`;
}

function getNoteRangeText(midiValues: number[]) {
  if (midiValues.length === 0) return null;
  const sorted = [...midiValues].sort((a, b) => a - b);
  return `${toScientificNameFromMidi(sorted[0])}-${toScientificNameFromMidi(sorted[sorted.length - 1])}`;
}

function parseDurationTicks(block: string, defaultBeatsPerBar: number) {
  const durationTag = getTagInt(block, 'duration');
  if (durationTag !== null && durationTag > 0) {
    return Math.max(1, durationTag);
  }

  const durationType = (getFirstTagContent(block, 'durationType') ?? '').toLowerCase();
  const dots = Math.max(0, getTagInt(block, 'dots') ?? 0);
  const beatsByType: Record<string, number> = {
    long: 16,
    breve: 8,
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    '8th': 0.5,
    '16th': 0.25,
    '32nd': 0.125,
    '64th': 0.0625,
    '128th': 0.03125,
    measure: defaultBeatsPerBar,
  };
  let beats = beatsByType[durationType] ?? 1;
  if (!Number.isFinite(beats) || beats <= 0) beats = 1;
  let dottedMultiplier = 1;
  for (let i = 0; i < dots; i++) {
    dottedMultiplier += 1 / (2 ** (i + 1));
  }
  return Math.max(1, Math.round(beats * dottedMultiplier * MUSESCORE_PPQ));
}

function buildSuggestedMelodyName(sourceFileName: string, scoreTitle: string | null, trackName: string | null) {
  const fileStem = sourceFileName.replace(/\.[^.]+$/, '').trim();
  const left = scoreTitle?.trim() || fileStem || 'Imported MuseScore Melody';
  const right = trackName?.trim();
  if (!right) return left;
  if (right.toLowerCase() === left.toLowerCase()) return left;
  return `${left} - ${right}`;
}

function extractTimeSignature(xml: string) {
  const timeSigMatch = /<TimeSig\b[^>]*>([\s\S]*?)<\/TimeSig>/i.exec(xml);
  if (!timeSigMatch) return { text: null as string | null, beatsPerBar: 4 };
  const body = timeSigMatch[1] ?? '';
  const numerator = getTagInt(body, 'sigN');
  const denominator = getTagInt(body, 'sigD');
  if (!numerator || !denominator || denominator <= 0) {
    return { text: null as string | null, beatsPerBar: 4 };
  }
  return {
    text: `${numerator}/${denominator}`,
    beatsPerBar: Math.max(0.25, (numerator * 4) / denominator),
  };
}

function extractTempoBpm(xml: string) {
  const tempoBlockMatch = /<Tempo\b[^>]*>([\s\S]*?)<\/Tempo>/i.exec(xml);
  if (!tempoBlockMatch) return null;
  const tempoRaw = Number.parseFloat((getFirstTagContent(tempoBlockMatch[1] ?? '', 'tempo') ?? '').trim());
  if (!Number.isFinite(tempoRaw) || tempoRaw <= 0) return null;
  return tempoRaw <= 20 ? Math.round(tempoRaw * 60) : Math.round(tempoRaw);
}

function extractScoreTitle(xml: string) {
  const metaTagRegex = /<metaTag\b[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/metaTag>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaTagRegex.exec(xml))) {
    const key = (match[1] ?? '').trim().toLowerCase();
    const value = decodeXmlEntities(stripXmlTags(match[2] ?? '')).trim();
    if (!value) continue;
    if (key === 'worktitle' || key === 'movementtitle' || key === 'title') {
      return value;
    }
  }
  return (
    getFirstTagContent(xml, 'workTitle') ??
    getFirstTagContent(xml, 'movementTitle') ??
    getFirstTagContent(xml, 'title') ??
    null
  );
}

function extractPartDisplayName(partBody: string, partIndex: number) {
  const instrumentTrackMatch = /<Instrument\b[^>]*>[\s\S]*?<trackName\b[^>]*>([\s\S]*?)<\/trackName>/i.exec(partBody);
  const instrumentTrackName = instrumentTrackMatch
    ? decodeXmlEntities(stripXmlTags(instrumentTrackMatch[1] ?? '')).trim()
    : null;
  return (
    instrumentTrackName ||
    getFirstTagContent(partBody, 'trackName') ||
    getFirstTagContent(partBody, 'longName') ||
    getFirstTagContent(partBody, 'partName') ||
    `Part ${partIndex + 1}`
  );
}

function detectMusescoreSourceFormat(sourceFileName: string): MusescoreSourceFormat {
  return sourceFileName.trim().toLowerCase().endsWith('.mscz') ? 'mscz' : 'mscx';
}

function extractMscxTextFromMscz(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  const names = Object.keys(files)
    .filter((name) => name.toLowerCase().endsWith('.mscx'))
    .sort((a, b) => a.localeCompare(b));
  if (names.length === 0) {
    throw new Error('MSCZ file does not contain an MSCX score document.');
  }
  const preferred = names.find((name) => name.toLowerCase().endsWith('/score.mscx')) ??
    names.find((name) => name.toLowerCase() === 'score.mscx') ??
    names[0];
  const payload = files[preferred];
  if (!payload || payload.length === 0) {
    throw new Error('MSCZ score document is empty.');
  }
  return new TextDecoder('utf-8').decode(payload);
}

function isTieContinuationNote(noteXmlBody: string) {
  return /<Spanner\b[^>]*type\s*=\s*"Tie"[^>]*>[\s\S]*?<prev\b/i.test(noteXmlBody);
}

function mapStringIndexToInstrumentString(
  instrument: Pick<IInstrument, 'STRING_ORDER'>,
  index: number
) {
  return index >= 0 && index < instrument.STRING_ORDER.length ? instrument.STRING_ORDER[index] : null;
}

function buildStringIndexCandidates(museStringNumber: number, base: MuseStringNumberBase) {
  const primary = base === 'zero-based' ? museStringNumber : museStringNumber - 1;
  const secondary = base === 'zero-based' ? museStringNumber - 1 : museStringNumber;
  return [...new Set([primary, secondary])];
}

function mapMuseStringToInstrumentString(
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  museStringNumber: number,
  options: {
    base: MuseStringNumberBase;
    fret: number | null;
    midiPitch: number | null;
  }
) {
  const candidateIndexes = buildStringIndexCandidates(museStringNumber, options.base);
  let firstValid: string | null = null;
  for (const index of candidateIndexes) {
    const stringName = mapStringIndexToInstrumentString(instrument, index);
    if (!stringName) continue;
    if (firstValid === null) {
      firstValid = stringName;
    }
    if (options.fret === null || options.midiPitch === null) continue;
    const noteWithOctave = instrument.getNoteWithOctave(stringName, options.fret);
    if (!noteWithOctave) continue;
    const resolvedMidi = parseScientificNoteToMidi(noteWithOctave);
    if (resolvedMidi !== null && resolvedMidi === options.midiPitch) {
      return stringName;
    }
  }
  return firstValid;
}

function parseChordNotes(
  block: string,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  stringNumberBase: MuseStringNumberBase
): ParsedMusescoreNote[] {
  const noteRegex = /<Note\b[^>]*>([\s\S]*?)<\/Note>/gi;
  const parsed: ParsedMusescoreNote[] = [];
  let match: RegExpExecArray | null;
  while ((match = noteRegex.exec(block))) {
    const noteBody = match[1] ?? '';
    if (isTieContinuationNote(noteBody)) {
      continue;
    }
    const museString = getTagInt(noteBody, 'String');
    const fret = getTagInt(noteBody, 'Fret');
    const pitch = getTagInt(noteBody, 'pitch');
    const roundedPitch = Number.isFinite(pitch) ? Math.round(pitch as number) : null;
    const safeFret = fret !== null && fret >= 0 ? fret : null;

    let stringName = museString !== null
      ? mapMuseStringToInstrumentString(instrument, museString, {
        base: stringNumberBase,
        fret: safeFret,
        midiPitch: roundedPitch,
      })
      : null;
    let noteName: string | null = null;
    let midi: number | null = roundedPitch;

    if (stringName !== null && safeFret !== null) {
      const noteWithOctave = instrument.getNoteWithOctave(stringName, safeFret);
      if (noteWithOctave) {
        const resolvedMidi = parseScientificNoteToMidi(noteWithOctave);
        // For tablature import, string/fret is the source of truth.
        // MuseScore pitch metadata can differ from tab due to transposition or score encoding quirks.
        noteName = stripOctave(noteWithOctave);
        midi = resolvedMidi ?? midi;
      }
    }
    if (!noteName && midi !== null) {
      noteName = toPitchClassNameFromMidi(midi);
    }
    if (!noteName) continue;

    parsed.push({
      note: noteName,
      stringName,
      fret: stringName === null ? null : safeFret,
      midi,
    });
  }
  return parsed;
}

function dedupeEventNotes(notes: ParsedMusescoreNote[]) {
  const seen = new Set<string>();
  const unique: ParsedMusescoreNote[] = [];
  for (const note of notes) {
    const key = `${note.note}|${note.stringName ?? '?'}|${note.fret ?? -1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(note);
  }
  return unique;
}

function parseStaffTrack(
  xmlStaffBody: string,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
): ParsedMusescoreChordEvent[] {
  const eventsByTick = new Map<number, { barIndex: number; endTick: number; notes: ParsedMusescoreNote[] }>();
  const measureRegex = /<Measure\b[^>]*>([\s\S]*?)<\/Measure>/gi;
  const voiceRegex = /<voice\b[^>]*>([\s\S]*?)<\/voice>/gi;
  const tokenRegex = /<(tick|Chord|Rest)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const { beatsPerBar } = extractTimeSignature(xmlStaffBody);
  const stringNumberBase: MuseStringNumberBase =
    /<string>\s*0\s*<\/string>/i.test(xmlStaffBody) ? 'zero-based' : 'one-based';
  let measureStartTick = 0;

  let measureMatch: RegExpExecArray | null;
  let measureIndex = 0;
  while ((measureMatch = measureRegex.exec(xmlStaffBody))) {
    const measureBody = measureMatch[1] ?? '';
    const voices: string[] = [];
    let voiceMatch: RegExpExecArray | null;
    while ((voiceMatch = voiceRegex.exec(measureBody))) {
      voices.push(voiceMatch[1] ?? '');
    }
    if (voices.length === 0) {
      voices.push(measureBody);
    }

    let measureEndTick = measureStartTick;
    voices.forEach((voiceBody, voiceIndex) => {
      let currentTick = measureStartTick;
      let tokenMatch: RegExpExecArray | null;
      while ((tokenMatch = tokenRegex.exec(voiceBody))) {
        const token = (tokenMatch[1] ?? '').toLowerCase();
        const tokenBody = tokenMatch[2] ?? '';
        if (token === 'tick') {
          const absoluteTick = Number.parseInt(stripXmlTags(tokenBody), 10);
          if (Number.isFinite(absoluteTick) && absoluteTick >= 0) {
            currentTick = absoluteTick;
          }
          continue;
        }

        const durationTicks = parseDurationTicks(tokenBody, beatsPerBar);
        if (token === 'rest') {
          currentTick += durationTicks;
          continue;
        }

        const notes = dedupeEventNotes(parseChordNotes(tokenBody, instrument, stringNumberBase));
        if (notes.length > 0) {
          const existing = eventsByTick.get(currentTick);
          const endTick = currentTick + durationTicks;
          if (existing) {
            existing.barIndex = Math.min(existing.barIndex, measureIndex);
            existing.endTick = Math.max(existing.endTick, endTick);
            existing.notes.push(...notes);
          } else {
            eventsByTick.set(currentTick, {
              barIndex: measureIndex,
              endTick,
              notes: [...notes],
            });
          }
        }
        currentTick += durationTicks;
      }
      measureEndTick = Math.max(measureEndTick, currentTick);
    });
    measureStartTick = measureEndTick;
    measureIndex += 1;
  }

  return [...eventsByTick.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([startTick, value]) => ({
      barIndex: value.barIndex,
      startTick,
      durationTicks: Math.max(1, value.endTick - startTick),
      notes: dedupeEventNotes(value.notes),
    }))
    .filter((event) => event.notes.length > 0);
}

function parseMusescoreTracks(
  xml: string,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const partRegex = /<Part\b[^>]*>([\s\S]*?)<\/Part>/gi;
  const partStaffMeta = new Map<number, { name: string; isTablature: boolean }>();
  const partStaffMetaByOrder: Array<{ name: string; isTablature: boolean }> = [];
  let partMatch: RegExpExecArray | null;
  let partIndex = 0;
  while ((partMatch = partRegex.exec(xml))) {
    const partBody = partMatch[1] ?? '';
    const partName = extractPartDisplayName(partBody, partIndex);
    const partStaffRegex = /<Staff\b([^>]*)>([\s\S]*?)<\/Staff>|<Staff\b([^>]*)\/>/gi;
    let partStaffMatch: RegExpExecArray | null;
    let partStaffIndex = 0;
    while ((partStaffMatch = partStaffRegex.exec(partBody))) {
      const attrs = partStaffMatch[1] ?? partStaffMatch[3] ?? '';
      const body = partStaffMatch[2] ?? '';
      const staffId = getAttributeInt(attrs, 'id');
      const isTablature = /group\s*=\s*"(?:fretted|tablature)"/i.test(attrs) ||
        /group\s*=\s*"(?:fretted|tablature)"/i.test(body);
      const staffMeta = {
        name: partStaffIndex === 0 ? partName : `${partName} (${partStaffIndex + 1})`,
        isTablature,
      };
      if (staffId !== null) {
        partStaffMeta.set(staffId, staffMeta);
      }
      partStaffMetaByOrder.push(staffMeta);
      partStaffIndex += 1;
    }
    partIndex += 1;
  }

  const tracks: ParsedMusescoreTrack[] = [];
  const runtimeStaffRegex = /<Staff\b([^>]*)>([\s\S]*?)<\/Staff>/gi;
  let runtimeMatch: RegExpExecArray | null;
  let runtimeStaffOrder = 0;
  while ((runtimeMatch = runtimeStaffRegex.exec(xml))) {
    const attrs = runtimeMatch[1] ?? '';
    const body = runtimeMatch[2] ?? '';
    if (!/<Measure\b/i.test(body)) continue;
    const staffId = getAttributeInt(attrs, 'id');
    if (staffId === null) continue;
    const parsedEvents = parseStaffTrack(body, instrument);
    const meta = partStaffMeta.get(staffId) ?? partStaffMetaByOrder[runtimeStaffOrder] ?? null;
    runtimeStaffOrder += 1;
    const midiValues = parsedEvents
      .flatMap((event) => event.notes.map((note) => note.midi))
      .filter((value): value is number => Number.isFinite(value));

    tracks.push({
      trackIndex: tracks.length,
      name: meta?.name ?? `Staff ${staffId}`,
      noteEvents: parsedEvents,
      isTablature: meta?.isTablature ?? false,
      noteCount: parsedEvents.reduce((sum, event) => sum + event.notes.length, 0),
      hasAnyStringFret: parsedEvents.some((event) =>
        event.notes.some((note) => note.stringName !== null && note.fret !== null)
      ),
      averageNotesPerEvent:
        parsedEvents.length > 0
          ? parsedEvents.reduce((sum, event) => sum + event.notes.length, 0) / parsedEvents.length
          : Number.POSITIVE_INFINITY,
      noteRangeText: getNoteRangeText(midiValues),
      estimatedBars:
        parsedEvents.length > 0
          ? Math.max(...parsedEvents.map((event) => event.barIndex)) + 1
          : null,
      endTick:
        parsedEvents.length > 0
          ? Math.max(...parsedEvents.map((event) => event.startTick + Math.max(1, event.durationTicks)))
          : null,
    });
  }
  return tracks;
}

function quantizeTick(tick: number, stepTicks: number) {
  return Math.max(0, Math.round(tick / stepTicks) * stepTicks);
}

function getQuantizeStepTicks(quantize: MidiImportQuantize) {
  if (quantize === 'off') return null;
  return quantize === '1/8' ? MUSESCORE_PPQ / 2 : MUSESCORE_PPQ / 4;
}

function normalizeTrackEventsForImport(
  noteEvents: ParsedMusescoreChordEvent[],
  quantize: MidiImportQuantize
) {
  const stepTicks = getQuantizeStepTicks(quantize);
  const grouped = new Map<number, { endTick: number; barIndex: number; notes: ParsedMusescoreNote[] }>();
  for (const event of noteEvents) {
    const startTick = stepTicks ? quantizeTick(event.startTick, stepTicks) : event.startTick;
    const minDuration = stepTicks ? Math.max(1, Math.round(stepTicks)) : 1;
    const rawEndTick = event.startTick + Math.max(1, event.durationTicks);
    const endTickQuantized = stepTicks ? Math.max(startTick + minDuration, quantizeTick(rawEndTick, stepTicks)) : rawEndTick;
    const existing = grouped.get(startTick);
    if (existing) {
      existing.endTick = Math.max(existing.endTick, endTickQuantized);
      existing.barIndex = Math.min(existing.barIndex, event.barIndex);
      existing.notes.push(...event.notes);
    } else {
      grouped.set(startTick, {
        endTick: endTickQuantized,
        barIndex: event.barIndex,
        notes: [...event.notes],
      });
    }
  }
  return [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([startTick, value]) => ({
      startTick,
      barIndex: value.barIndex,
      endTick: value.endTick,
      notes: dedupeEventNotes(value.notes),
    }))
    .filter((event) => event.notes.length > 0);
}

export async function loadMusescoreFileFromBytes(
  bytes: Uint8Array,
  sourceFileName: string,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>
): Promise<LoadedMusescoreFile> {
  if (!bytes.length) {
    throw new Error('Selected file is empty.');
  }
  const sourceFormat = detectMusescoreSourceFormat(sourceFileName);
  const xmlText =
    sourceFormat === 'mscz'
      ? extractMscxTextFromMscz(bytes)
      : new TextDecoder('utf-8').decode(bytes);
  if (!/<museScore\b/i.test(xmlText) && !/<mScore\b/i.test(xmlText)) {
    throw new Error('Unsupported MuseScore score format.');
  }

  const tracks = parseMusescoreTracks(xmlText, instrument).filter((track) => track.noteCount > 0);
  if (tracks.length === 0) {
    throw new Error('MuseScore file does not contain importable note tracks.');
  }

  const trackOptions: MidiImportTrackOption[] = tracks.map((track) => ({
    trackIndex: track.trackIndex,
    name: track.name,
    label: `${track.trackIndex + 1}. ${track.name} (${track.noteCount} notes${track.isTablature || track.hasAnyStringFret ? ', tablature' : ''})`,
    noteCount: track.noteCount,
    isPercussion: false,
    noteRangeText: track.noteRangeText,
    estimatedBars: track.estimatedBars,
    endTick: track.endTick,
  }));

  const defaultTrackIndex =
    [...tracks]
      .sort((a, b) => {
        if (a.hasAnyStringFret !== b.hasAnyStringFret) return a.hasAnyStringFret ? -1 : 1;
        if (a.isTablature !== b.isTablature) return a.isTablature ? -1 : 1;
        if (a.averageNotesPerEvent !== b.averageNotesPerEvent) {
          return a.averageNotesPerEvent - b.averageNotesPerEvent;
        }
        return b.noteCount - a.noteCount;
      })[0]?.trackIndex ?? null;

  return {
    midi: null,
    sourceFileName,
    sourceFormat,
    midiName: extractScoreTitle(xmlText),
    tempoBpm: extractTempoBpm(xmlText),
    tempoChangesCount: 1,
    timeSignatureText: extractTimeSignature(xmlText).text,
    keySignatureText: null,
    trackOptions,
    defaultTrackIndex,
    tracks,
  };
}

export function convertLoadedMusescoreTrackToImportedMelody(
  loaded: LoadedMusescoreFile,
  _instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  trackIndex: number,
  options?: { quantize?: MidiImportQuantize }
): MusescoreImportedMelody {
  const track = loaded.tracks.find((entry) => entry.trackIndex === trackIndex);
  if (!track) {
    throw new Error('Selected MuseScore track is not available.');
  }
  const quantize = normalizeMidiImportQuantize(options?.quantize);
  const normalizedEvents = normalizeTrackEventsForImport(track.noteEvents, quantize);
  if (normalizedEvents.length === 0) {
    throw new Error('Selected MuseScore track does not contain playable note events.');
  }

  const melodyEvents: MelodyEvent[] = [];
  for (let i = 0; i < normalizedEvents.length; i++) {
    const current = normalizedEvents[i];
    const next = normalizedEvents[i + 1];
    const durationTicks = next
      ? Math.max(1, next.startTick - current.startTick)
      : Math.max(1, current.endTick - current.startTick);
    const notes: MelodyEventNote[] = current.notes.map((note) => ({
      note: note.note,
      stringName: note.stringName,
      fret: note.fret,
    }));
    melodyEvents.push({
      barIndex: current.barIndex,
      durationBeats: durationTicks / MUSESCORE_PPQ,
      notes,
    });
  }

  const warnings: string[] = [];
  if (!track.hasAnyStringFret) {
    warnings.push('Track does not contain tablature string/fret data; positions were auto-resolved from pitch.');
  }

  return {
    suggestedName: buildSuggestedMelodyName(loaded.sourceFileName, loaded.midiName, track.name),
    events: melodyEvents,
    warnings,
    metadata: {
      sourceFormat: loaded.sourceFormat,
      sourceFileName: loaded.sourceFileName,
      midiName: loaded.midiName,
      trackName: track.name,
      tempoBpm: loaded.tempoBpm,
      timeSignatureText: loaded.timeSignatureText,
    },
  };
}
