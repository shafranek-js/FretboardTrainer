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
const MIN_LOCAL_PEAK_PROMINENCE_DB = 2;
const MAX_PEAK_CLUSTER_SPREAD_CENTS = 40;
const MAX_HARMONIC_CLUSTER_ORDER = 4;
const MIN_HARMONIC_CLUSTER_COUNT = 2;
const HARMONIC_CLUSTER_BLEND = 1.2;
const HARMONIC_PRODUCT_MATCH_TOLERANCE_CENTS = 35;
const MIN_HARMONIC_PRODUCT_MATCH_COUNT = 2;
const HARMONIC_PRODUCT_BLEND = 1.1;

interface SpectrumPeak {
  frequency: number;
  magnitude: number;
}

function createEmptyNoteEnergies(): NoteEnergies {
  const energies: NoteEnergies = {};
  for (const note of ALL_NOTES) {
    energies[note] = 0;
  }
  return energies;
}

function isLocalSpectrumPeak(spectrum: Float32Array, index: number) {
  const current = spectrum[index];
  const previous = spectrum[index - 1];
  const next = spectrum[index + 1];
  if (!Number.isFinite(current)) return false;
  return current > previous && current >= next;
}

function isProminentSpectrumPeak(spectrum: Float32Array, index: number) {
  const current = spectrum[index];
  if (!Number.isFinite(current)) return false;

  let strongestNeighbor = -Infinity;
  for (let offset = -2; offset <= 2; offset += 1) {
    if (offset === 0) continue;
    const neighbor = spectrum[index + offset];
    if (!Number.isFinite(neighbor)) continue;
    strongestNeighbor = Math.max(strongestNeighbor, neighbor);
  }

  if (!Number.isFinite(strongestNeighbor)) return true;
  return current - strongestNeighbor >= MIN_LOCAL_PEAK_PROMINENCE_DB;
}

function getHarmonicClusterWeight(harmonicOrder: number) {
  switch (harmonicOrder) {
    case 1:
      return 1;
    case 2:
      return 0.82;
    case 3:
      return 0.72;
    case 4:
      return 0.58;
    default:
      return 0;
  }
}

function getCentsDifference(fromFrequency: number, toFrequency: number) {
  if (fromFrequency <= 0 || toFrequency <= 0) return Infinity;
  return Math.abs(1200 * Math.log2(toFrequency / fromFrequency));
}

function clusterSpectrumPeaks(peaks: SpectrumPeak[]) {
  if (peaks.length <= 1) return peaks;

  const clusteredPeaks: SpectrumPeak[] = [];
  const sortedPeaks = [...peaks].sort((a, b) => a.frequency - b.frequency);
  let currentCluster: SpectrumPeak[] = [sortedPeaks[0]];

  const flushCluster = () => {
    if (currentCluster.length === 0) return;

    const totalMagnitude = currentCluster.reduce((sum, peak) => sum + peak.magnitude, 0);
    const weightedFrequency =
      totalMagnitude > 0
        ? currentCluster.reduce((sum, peak) => sum + peak.frequency * peak.magnitude, 0) /
          totalMagnitude
        : currentCluster[0].frequency;

    clusteredPeaks.push({
      frequency: weightedFrequency,
      magnitude: totalMagnitude,
    });
    currentCluster = [];
  };

  for (let index = 1; index < sortedPeaks.length; index += 1) {
    const peak = sortedPeaks[index];
    const currentClusterMagnitude = currentCluster.reduce((sum, item) => sum + item.magnitude, 0);
    const currentClusterCenter =
      currentClusterMagnitude > 0
        ? currentCluster.reduce((sum, item) => sum + item.frequency * item.magnitude, 0) /
          currentClusterMagnitude
        : currentCluster[0].frequency;

    if (
      getCentsDifference(currentClusterCenter, peak.frequency) <= MAX_PEAK_CLUSTER_SPREAD_CENTS
    ) {
      currentCluster.push(peak);
      continue;
    }

    flushCluster();
    currentCluster.push(peak);
  }

  flushCluster();
  return clusteredPeaks;
}

function accumulateHarmonicProductSupport(
  peaks: SpectrumPeak[],
  a4Frequency: number,
  options: Required<SpectrumToNoteOptions>
) {
  const support = createEmptyNoteEnergies();
  const candidateFundamentals: number[] = [];

  for (const peak of peaks) {
    for (let harmonicOrder = 1; harmonicOrder <= MAX_HARMONIC_CLUSTER_ORDER; harmonicOrder += 1) {
      const candidateFundamentalFrequency = peak.frequency / harmonicOrder;
      if (
        candidateFundamentalFrequency < options.minFrequency ||
        candidateFundamentalFrequency > options.maxFrequency
      ) {
        continue;
      }
      candidateFundamentals.push(candidateFundamentalFrequency);
    }
  }

  for (const candidateFundamentalFrequency of candidateFundamentals) {
    let harmonicProduct = 1;
    let harmonicMatchCount = 0;

    for (let harmonicOrder = 1; harmonicOrder <= MAX_HARMONIC_CLUSTER_ORDER; harmonicOrder += 1) {
      const targetFrequency = candidateFundamentalFrequency * harmonicOrder;
      const matchingMagnitude = peaks.reduce((bestMagnitude, peak) => {
        if (
          getCentsDifference(targetFrequency, peak.frequency) <=
          HARMONIC_PRODUCT_MATCH_TOLERANCE_CENTS
        ) {
          return Math.max(bestMagnitude, peak.magnitude);
        }
        return bestMagnitude;
      }, 0);

      if (matchingMagnitude <= 0) continue;

      harmonicProduct *= matchingMagnitude * getHarmonicClusterWeight(harmonicOrder);
      harmonicMatchCount += 1;
    }

    if (harmonicMatchCount < MIN_HARMONIC_PRODUCT_MATCH_COUNT) continue;

    const candidateNote = freqToNoteNameFromA4(candidateFundamentalFrequency, a4Frequency);
    if (!candidateNote) continue;

    const normalizedSupport = Math.pow(harmonicProduct, 1 / harmonicMatchCount);
    support[candidateNote] += normalizedSupport;
  }

  return support;
}

function accumulateHarmonicClusterSupport(
  peaks: SpectrumPeak[],
  a4Frequency: number,
  options: Required<SpectrumToNoteOptions>
) {
  const support = createEmptyNoteEnergies();
  const contributingHarmonics = new Map<string, Set<number>>();

  for (const peak of peaks) {
    const bestPeakSupportByNote = new Map<
      string,
      { support: number; harmonicOrder: number }
    >();

    for (let harmonicOrder = 1; harmonicOrder <= MAX_HARMONIC_CLUSTER_ORDER; harmonicOrder += 1) {
      const candidateFundamentalFrequency = peak.frequency / harmonicOrder;
      if (
        candidateFundamentalFrequency < options.minFrequency ||
        candidateFundamentalFrequency > options.maxFrequency
      ) {
        continue;
      }

      const candidateNote = freqToNoteNameFromA4(candidateFundamentalFrequency, a4Frequency);
      if (!candidateNote) continue;

      const candidateSupport = peak.magnitude * getHarmonicClusterWeight(harmonicOrder);
      const existingSupport = bestPeakSupportByNote.get(candidateNote);
      if (!existingSupport || candidateSupport > existingSupport.support) {
        bestPeakSupportByNote.set(candidateNote, {
          support: candidateSupport,
          harmonicOrder,
        });
      }
    }

    for (const [candidateNote, candidate] of bestPeakSupportByNote) {
      support[candidateNote] += candidate.support;
      const harmonicSet = contributingHarmonics.get(candidateNote) ?? new Set<number>();
      harmonicSet.add(candidate.harmonicOrder);
      contributingHarmonics.set(candidateNote, harmonicSet);
    }
  }

  for (const note of ALL_NOTES) {
    const harmonicCount = contributingHarmonics.get(note)?.size ?? 0;
    if (harmonicCount < MIN_HARMONIC_CLUSTER_COUNT) {
      support[note] = 0;
    }
  }

  return support;
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
  const rawPeaks: SpectrumPeak[] = [];

  for (let i = 1; i < spectrum.length; i++) {
    const db = spectrum[i];
    if (!Number.isFinite(db) || db < noiseFloor) continue;
    if (i < spectrum.length - 1 && !isLocalSpectrumPeak(spectrum, i)) continue;
    if (!isProminentSpectrumPeak(spectrum, i)) continue;

    const freq = (i * sampleRate) / fftSize;
    if (freq < minFrequency || freq > maxFrequency) continue;

    const magnitude = Math.pow(10, db / 20);
    const lowFreqBoost = 1 / (1 + freq * 0.0025);
    const weightedMagnitude = magnitude * lowFreqBoost;
    rawPeaks.push({ frequency: freq, magnitude: weightedMagnitude });
  }

  const peaks = clusterSpectrumPeaks(rawPeaks);

  for (const peak of peaks) {
    const note = freqToNoteNameFromA4(peak.frequency, a4Frequency);
    if (!note) continue;
    energies[note] += peak.magnitude;
  }

  const harmonicClusterSupport = accumulateHarmonicClusterSupport(
    peaks,
    a4Frequency,
    { minFrequency, maxFrequency }
  );
  const harmonicProductSupport = accumulateHarmonicProductSupport(
    peaks,
    a4Frequency,
    { minFrequency, maxFrequency }
  );

  for (const note of ALL_NOTES) {
    energies[note] += harmonicClusterSupport[note] * HARMONIC_CLUSTER_BLEND;
    energies[note] += harmonicProductSupport[note] * HARMONIC_PRODUCT_BLEND;
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
  const targetPeaks = uniqueTargets.map((note) => energies[note] ?? 0);
  const weakestTargetPeak = Math.min(...targetPeaks);
  const strongestNonTargetPeak = Object.entries(energies)
    .filter(([note, value]) => value > 0 && !uniqueTargets.includes(note))
    .reduce((max, [, value]) => Math.max(max, value), 0);

  const everyTargetPresent = uniqueTargets.every((note) => (energies[note] ?? 0) >= peak * 0.13);
  const targetRatio = totalEnergy > 0 ? targetEnergy / totalEnergy : 0;
  const hasDominantNonTargetPeak =
    strongestNonTargetPeak >= weakestTargetPeak * 1.1 && targetRatio < 0.72;

  return everyTargetPresent && targetRatio >= 0.3 && !hasDominantNonTargetPeak;
}
