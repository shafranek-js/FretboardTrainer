import { describe, expect, it } from 'vitest';
import {
  formatMelodyTimelineZoomPercent,
  getMelodyTimelineZoomScale,
  normalizeMelodyTimelineZoomPercent,
} from './melody-timeline-zoom';

describe('melody timeline zoom helpers', () => {
  it('clamps invalid values to the default zoom', () => {
    expect(normalizeMelodyTimelineZoomPercent(undefined)).toBe(100);
    expect(normalizeMelodyTimelineZoomPercent('')).toBe(100);
  });

  it('clamps values to the supported range', () => {
    expect(normalizeMelodyTimelineZoomPercent(20)).toBe(70);
    expect(normalizeMelodyTimelineZoomPercent(260)).toBe(250);
  });

  it('formats and scales normalized values', () => {
    expect(formatMelodyTimelineZoomPercent(115)).toBe('115%');
    expect(getMelodyTimelineZoomScale('125')).toBe(1.25);
  });
});
