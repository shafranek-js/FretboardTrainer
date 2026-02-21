import { ALL_NOTES } from '../constants';
import { freqToNoteNameFromA4 } from '../music-theory';

export type NoteEnergies = Record<string, number>;

export interface SpectrumToNoteOptions {
  minFrequency?: number;
  maxFrequency?: number;
}

const DEFAULT_SPECTRUM_OPTIONS: Required<SpectrumToNoteOptions> = {
  minFrequency: 65,
  maxFrequency: 500,
};

function createEmptyNoteEnergies(): NoteEnergies {
  const energies: NoteEnergies = {};
  for (const note of ALL_NOTES) {
    energies[note] = 0;
  }
  return energies;
}

/** Aggregates spectrum bins into note-class energies. */
export function spectrumToNoteEnergies(
  spectrum: Float32Array,
  sampleRate: number,
  fftSize: number,
  a4Frequency = 440,
  options: SpectrumToNoteOptions = {}
): NoteEnergies {
  const energies = createEmptyNoteEnergies();
  if (!spectrum || spectrum.length === 0 || sampleRate <= 0 || fftSize <= 0) {
    return energies;
  }

  const { minFrequency, maxFrequency } = { ...DEFAULT_SPECTRUM_OPTIONS, ...options };
  const finiteValues = Array.from(spectrum).filter((db) => Number.isFinite(db));
  if (finiteValues.length === 0) return energies;

  const maxDb = Math.max(...finiteValues);
  if (maxDb < -80) return energies;

  const noiseFloor = maxDb - 60;

  for (let i = 1; i < spectrum.length; i++) {
    const db = spectrum[i];
    if (!Number.isFinite(db) || db < noiseFloor) continue;

    const freq = (i * sampleRate) / fftSize;
    if (freq < minFrequency || freq > maxFrequency) continue;

    const note = freqToNoteNameFromA4(freq, a4Frequency);
    if (!note) continue;

    const magnitude = Math.pow(10, db / 20);
    const lowFreqBoost = 1 / (1 + freq * 0.0025);
    energies[note] += magnitude * lowFreqBoost;
  }

  return energies;
}

/** Returns the most probable note classes in the spectrum. */
export function detectLikelyChordNotes(energies: NoteEnergies): Set<string> {
  const sorted = Object.entries(energies)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return new Set();

  const peak = sorted[0][1];
  const threshold = peak * 0.2;
  const selected = sorted
    .filter(([, value], index) => value >= threshold || index < 3)
    .slice(0, 5)
    .map(([note]) => note);

  return new Set(selected);
}

/** Checks whether target chord notes dominate detected spectral energy. */
export function areChordNotesMatchingRobust(
  energies: NoteEnergies,
  targetNotes: string[]
): boolean {
  const uniqueTargets = [...new Set(targetNotes)];
  if (uniqueTargets.length === 0) return false;

  const values = Object.values(energies).filter((value) => value > 0);
  if (values.length === 0) return false;

  const peak = Math.max(...values);
  const totalEnergy = values.reduce((sum, value) => sum + value, 0);
  const targetEnergy = uniqueTargets.reduce((sum, note) => sum + (energies[note] ?? 0), 0);

  const everyTargetPresent = uniqueTargets.every((note) => (energies[note] ?? 0) >= peak * 0.14);
  const targetRatio = totalEnergy > 0 ? targetEnergy / totalEnergy : 0;

  return everyTargetPresent && targetRatio >= 0.3;
}
