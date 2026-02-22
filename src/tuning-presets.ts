import { ALL_NOTES } from './constants';
import type { IInstrument } from './instruments/instrument';

export type InstrumentName = IInstrument['name'];

export interface TuningPreset {
  key: string;
  label: string;
  description: string;
  tuning: Record<string, string>;
  chordCompatible: boolean;
}

const TUNING_PRESETS: Record<InstrumentName, TuningPreset[]> = {
  guitar: [
    {
      key: 'standard',
      label: 'Standard (E A D G B e)',
      description: 'Standard guitar tuning. Full feature support including chord modes.',
      tuning: {
        e: 'E4',
        B: 'B3',
        G: 'G3',
        D: 'D3',
        A: 'A2',
        E: 'E2',
      },
      chordCompatible: true,
    },
    {
      key: 'drop_d',
      label: 'Drop D (D A D G B e)',
      description:
        'Low E string tuned down to D. Chord training modes are disabled because stored chord shapes/labels assume standard tuning.',
      tuning: {
        e: 'E4',
        B: 'B3',
        G: 'G3',
        D: 'D3',
        A: 'A2',
        E: 'D2',
      },
      chordCompatible: false,
    },
  ],
  ukulele: [
    {
      key: 'high_g',
      label: 'Standard High G (g C E A)',
      description: 'Re-entrant ukulele tuning (high G). Full feature support including chord modes.',
      tuning: {
        A: 'A4',
        E: 'E4',
        C: 'C4',
        G: 'G4',
      },
      chordCompatible: true,
    },
    {
      key: 'low_g',
      label: 'Low G (G C E A)',
      description:
        'Low G ukulele tuning. Chord training modes are disabled because stored chord note labels assume high G.',
      tuning: {
        A: 'A4',
        E: 'E4',
        C: 'C4',
        G: 'G3',
      },
      chordCompatible: false,
    },
  ],
};

function parseTuningNote(tuningNote: string) {
  const match = /^([A-G]#?)(-?\d+)$/.exec(tuningNote);
  if (!match) return null;
  return {
    noteName: match[1],
    octave: Number.parseInt(match[2], 10),
  };
}

export function buildPitchClassFretboardFromTuning(
  tuning: Record<string, string>,
  stringOrder: string[]
): Record<string, Record<string, number>> {
  const fretboard: Record<string, Record<string, number>> = {};

  for (const stringName of stringOrder) {
    const parsed = parseTuningNote(tuning[stringName] ?? '');
    if (!parsed) continue;

    const openNoteIndex = ALL_NOTES.indexOf(parsed.noteName);
    if (openNoteIndex === -1) continue;

    const notesForString: Record<string, number> = {};
    for (let fret = 0; fret <= 11; fret++) {
      const noteIndex = (openNoteIndex + fret) % 12;
      notesForString[ALL_NOTES[noteIndex]] = fret;
    }
    fretboard[stringName] = notesForString;
  }

  return fretboard;
}

export function getTuningPresetsForInstrument(instrumentName: InstrumentName) {
  return TUNING_PRESETS[instrumentName] ?? [];
}

export function getDefaultTuningPresetKey(instrumentName: InstrumentName) {
  return getTuningPresetsForInstrument(instrumentName)[0]?.key ?? 'standard';
}

export function getTuningPreset(instrumentName: InstrumentName, presetKey: string) {
  const presets = getTuningPresetsForInstrument(instrumentName);
  return (
    presets.find((preset) => preset.key === presetKey) ??
    presets.find((preset) => preset.key === getDefaultTuningPresetKey(instrumentName)) ??
    null
  );
}

export function isChordCompatibleTuning(instrumentName: InstrumentName, presetKey: string) {
  return getTuningPreset(instrumentName, presetKey)?.chordCompatible ?? true;
}

export function applyTuningPresetToInstrument(instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'TUNING' | 'FRETBOARD'>, presetKey: string) {
  const preset = getTuningPreset(instrument.name, presetKey);
  if (!preset) return null;

  instrument.TUNING = { ...preset.tuning };
  instrument.FRETBOARD = buildPitchClassFretboardFromTuning(instrument.TUNING, instrument.STRING_ORDER);
  return preset;
}

