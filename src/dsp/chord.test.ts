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
});
