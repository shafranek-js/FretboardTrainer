import { describe, expect, it } from 'vitest';
import {
  applyTuningPresetToInstrument,
  buildPitchClassFretboardFromTuning,
  getDefaultTuningPresetKey,
  getTuningPreset,
  isChordCompatibleTuning,
} from './tuning-presets';

describe('tuning-presets', () => {
  it('builds pitch-class fretboard from tuning', () => {
    const fretboard = buildPitchClassFretboardFromTuning({ E: 'E2' }, ['E']);
    expect(fretboard.E.E).toBe(0);
    expect(fretboard.E.F).toBe(1);
    expect(fretboard.E['F#']).toBe(2);
    expect(fretboard.E.D).toBe(10);
  });

  it('returns defaults and preset metadata', () => {
    expect(getDefaultTuningPresetKey('guitar')).toBe('standard');
    expect(getDefaultTuningPresetKey('ukulele')).toBe('high_g');
    expect(getTuningPreset('guitar', 'drop_d')?.tuning.E).toBe('D2');
    expect(isChordCompatibleTuning('guitar', 'drop_d')).toBe(false);
    expect(isChordCompatibleTuning('ukulele', 'high_g')).toBe(true);
  });

  it('applies tuning preset to mutable instrument object', () => {
    const instrument = {
      name: 'guitar' as const,
      STRING_ORDER: ['e', 'B', 'G', 'D', 'A', 'E'],
      TUNING: {} as Record<string, string>,
      FRETBOARD: {} as Record<string, Record<string, number>>,
    };

    const preset = applyTuningPresetToInstrument(instrument, 'drop_d');
    expect(preset?.key).toBe('drop_d');
    expect(instrument.TUNING.E).toBe('D2');
    expect(instrument.FRETBOARD.E.D).toBe(0);
    expect(instrument.FRETBOARD.E.E).toBe(2);
  });
});

