import { describe, expect, it } from 'vitest';
import {
  areChordNotesMatchingRobust,
  detectLikelyChordNotes,
  spectrumToNoteEnergies,
} from './chord';

function createSpectrum(length: number, fillValue = -120): Float32Array {
  return new Float32Array(length).fill(fillValue);
}

function addPeak(
  spectrum: Float32Array,
  sampleRate: number,
  fftSize: number,
  frequency: number,
  db: number
) {
  const centerBin = Math.round((frequency * fftSize) / sampleRate);
  for (let offset = -1; offset <= 1; offset++) {
    const bin = centerBin + offset;
    if (bin <= 0 || bin >= spectrum.length) continue;
    const shapedDb = db - Math.abs(offset) * 3;
    spectrum[bin] = Math.max(spectrum[bin], shapedDb);
  }
}

describe('chord spectrum detection', () => {
  const sampleRate = 48000;
  const fftSize = 4096;
  const spectrumLength = fftSize / 2;

  it('detects C major from synthetic fundamentals and harmonics', () => {
    const spectrum = createSpectrum(spectrumLength);
    const cMajorFundamentals = [130.81, 164.81, 196.0];

    for (const f of cMajorFundamentals) {
      addPeak(spectrum, sampleRate, fftSize, f, -18);
      addPeak(spectrum, sampleRate, fftSize, f * 2, -28);
      addPeak(spectrum, sampleRate, fftSize, f * 3, -35);
    }

    // Light unrelated noise.
    addPeak(spectrum, sampleRate, fftSize, 220, -48);
    addPeak(spectrum, sampleRate, fftSize, 247, -52);

    const energies = spectrumToNoteEnergies(spectrum, sampleRate, fftSize, 440);
    const notes = detectLikelyChordNotes(energies);

    expect(notes.has('C')).toBe(true);
    expect(notes.has('E')).toBe(true);
    expect(notes.has('G')).toBe(true);
    expect(areChordNotesMatchingRobust(energies, ['C', 'E', 'G'])).toBe(true);
  });

  it('rejects mismatched target chord notes', () => {
    const spectrum = createSpectrum(spectrumLength);
    const cMajorFundamentals = [130.81, 164.81, 196.0];
    for (const f of cMajorFundamentals) {
      addPeak(spectrum, sampleRate, fftSize, f, -20);
    }

    const energies = spectrumToNoteEnergies(spectrum, sampleRate, fftSize, 440);
    expect(areChordNotesMatchingRobust(energies, ['D', 'F#', 'A'])).toBe(false);
  });

  it('returns empty/false for silence', () => {
    const silence = createSpectrum(spectrumLength);
    const energies = spectrumToNoteEnergies(silence, sampleRate, fftSize, 440);
    expect(detectLikelyChordNotes(energies).size).toBe(0);
    expect(areChordNotesMatchingRobust(energies, ['C', 'E', 'G'])).toBe(false);
  });

  it('filters shoulder bins so neighboring notes do not receive fake energy', () => {
    const spectrum = createSpectrum(spectrumLength);
    spectrum[14] = -21; // ~164 Hz -> E
    spectrum[15] = -18; // ~176 Hz -> F
    spectrum[16] = -21; // ~188 Hz -> F#

    const energies = spectrumToNoteEnergies(spectrum, sampleRate, fftSize, 440);

    expect(energies.F).toBeGreaterThan(0);
    expect(energies.E).toBe(0);
    expect(energies['F#']).toBe(0);
  });

  it('ignores weak wiggle peaks that are not prominent above the local neighborhood', () => {
    const spectrum = createSpectrum(spectrumLength);
    spectrum[20] = -18.8;
    spectrum[21] = -17.4;
    spectrum[22] = -18.0;
    spectrum[23] = -17.9;

    const energies = spectrumToNoteEnergies(spectrum, sampleRate, fftSize, 440);

    expect(Object.values(energies).every((value) => value === 0)).toBe(true);
  });

  it('rejects chords with dominant non-target peaks even when target notes are present', () => {
    const energies = {
      C: 1.0,
      E: 0.92,
      G: 0.88,
      F: 0.97,
      A: 0.65,
    };

    expect(areChordNotesMatchingRobust(energies, ['C', 'E', 'G'])).toBe(false);
  });

  it('reinforces a fundamental note when its harmonic series is stronger than the direct fundamental', () => {
    const spectrum = createSpectrum(spectrumLength);

    // C3 fundamental is intentionally weak.
    addPeak(spectrum, sampleRate, fftSize, 130.81, -42);
    // Stronger second and third harmonics could otherwise over-emphasize G.
    addPeak(spectrum, sampleRate, fftSize, 261.62, -31);
    addPeak(spectrum, sampleRate, fftSize, 392.43, -18);

    const energies = spectrumToNoteEnergies(spectrum, sampleRate, fftSize, 440);

    expect(energies.C).toBeGreaterThan(energies.G);
  });

  it('clusters nearby spectral peaks so one smeared partial does not split into adjacent note classes', () => {
    const clusteredFftSize = 32768;
    const clusteredSpectrum = createSpectrum(clusteredFftSize / 2);

    clusteredSpectrum[114] = -15; // ~166.99 Hz -> E
    clusteredSpectrum[115] = -26; // valley between two close local peaks
    clusteredSpectrum[116] = -21; // ~169.92 Hz -> would round to F without clustering

    const energies = spectrumToNoteEnergies(clusteredSpectrum, sampleRate, clusteredFftSize, 440);

    expect(energies.E).toBeGreaterThan(0);
    expect(energies.F).toBe(0);
  });

  it('prefers a coherent harmonic stack over an isolated moderate non-target peak', () => {
    const spectrum = createSpectrum(spectrumLength);

    // A2 with weak direct fundamental but aligned upper harmonics.
    addPeak(spectrum, sampleRate, fftSize, 110, -40);
    addPeak(spectrum, sampleRate, fftSize, 220, -22);
    addPeak(spectrum, sampleRate, fftSize, 330, -19);

    // Single isolated E peak should not dominate the coherent A stack.
    addPeak(spectrum, sampleRate, fftSize, 164.81, -28);

    const energies = spectrumToNoteEnergies(spectrum, sampleRate, fftSize, 440);

    expect(energies.A).toBeGreaterThan(energies.E);
  });
});
