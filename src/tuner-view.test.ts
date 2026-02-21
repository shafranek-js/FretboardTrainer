import { describe, expect, it } from 'vitest';
import { computeTunerView } from './tuner-view';

const CENTS_TOLERANCE = 10;
const CENTS_VISUAL_RANGE = 50;

describe('computeTunerView', () => {
  it('returns neutral defaults when input frequencies are missing', () => {
    expect(computeTunerView(null, 440, CENTS_TOLERANCE, CENTS_VISUAL_RANGE)).toEqual({
      tone: 'neutral',
      centsText: '--',
      translationPercent: 0,
    });
    expect(computeTunerView(440, null, CENTS_TOLERANCE, CENTS_VISUAL_RANGE)).toEqual({
      tone: 'neutral',
      centsText: '--',
      translationPercent: 0,
    });
  });

  it('returns inTune for values within tolerance', () => {
    const view = computeTunerView(441, 440, CENTS_TOLERANCE, CENTS_VISUAL_RANGE);
    expect(view.tone).toBe('inTune');
    expect(view.centsText).toContain('cents');
  });

  it('returns flat and sharp with clamped translation', () => {
    const flat = computeTunerView(220, 440, CENTS_TOLERANCE, CENTS_VISUAL_RANGE);
    expect(flat.tone).toBe('flat');
    expect(flat.translationPercent).toBe(-50);

    const sharp = computeTunerView(880, 440, CENTS_TOLERANCE, CENTS_VISUAL_RANGE);
    expect(sharp.tone).toBe('sharp');
    expect(sharp.translationPercent).toBe(50);
  });
});
