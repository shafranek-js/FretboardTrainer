import { describe, expect, it } from 'vitest';
import { detectPitchYin } from './pitch';

function generateSineWave(
  frequency: number,
  sampleRate: number,
  size: number,
  amplitude = 0.9
): Float32Array {
  const buffer = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    buffer[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return buffer;
}

function generateHarmonicTone(
  baseFrequency: number,
  sampleRate: number,
  size: number
): Float32Array {
  const buffer = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const t = i / sampleRate;
    // Rich but still harmonic timbre similar to plucked strings.
    buffer[i] =
      0.7 * Math.sin(2 * Math.PI * baseFrequency * t) +
      0.2 * Math.sin(2 * Math.PI * baseFrequency * 2 * t) +
      0.1 * Math.sin(2 * Math.PI * baseFrequency * 3 * t);
  }
  return buffer;
}

describe('detectPitchYin', () => {
  const sampleRate = 44100;
  const size = 4096;

  it('detects common guitar-range sine waves accurately', () => {
    const a2 = detectPitchYin(generateSineWave(110, sampleRate, size), sampleRate);
    const a3 = detectPitchYin(generateSineWave(220, sampleRate, size), sampleRate);
    const a4 = detectPitchYin(generateSineWave(440, sampleRate, size), sampleRate);

    expect(a2).toBeGreaterThan(108);
    expect(a2).toBeLessThan(112);
    expect(a3).toBeGreaterThan(218);
    expect(a3).toBeLessThan(222);
    expect(a4).toBeGreaterThan(438);
    expect(a4).toBeLessThan(442);
  });

  it('stays stable on harmonic-rich tones', () => {
    const detected = detectPitchYin(generateHarmonicTone(146.83, sampleRate, size), sampleRate);
    expect(detected).toBeGreaterThan(144);
    expect(detected).toBeLessThan(150);
  });

  it('returns 0 for silence', () => {
    const silence = new Float32Array(size);
    expect(detectPitchYin(silence, sampleRate)).toBe(0);
  });
});
