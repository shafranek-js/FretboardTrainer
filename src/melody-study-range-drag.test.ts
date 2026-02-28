import { describe, expect, it } from 'vitest';
import {
  computeDraggedMelodyStudyRange,
  resolveTimelineStepIndexFromX,
  type TimelineStepMetric,
} from './melody-study-range-drag';

const METRICS: TimelineStepMetric[] = [
  { index: 0, left: 0, right: 20 },
  { index: 1, left: 20, right: 40 },
  { index: 2, left: 40, right: 60 },
  { index: 3, left: 60, right: 80 },
];

describe('melody-study-range-drag', () => {
  it('resolves the nearest timeline step from pointer x', () => {
    expect(resolveTimelineStepIndexFromX(METRICS, -5)).toBe(0);
    expect(resolveTimelineStepIndexFromX(METRICS, 9)).toBe(0);
    expect(resolveTimelineStepIndexFromX(METRICS, 31)).toBe(2);
    expect(resolveTimelineStepIndexFromX(METRICS, 79)).toBe(3);
    expect(resolveTimelineStepIndexFromX(METRICS, 120)).toBe(3);
  });

  it('drags the start handle without crossing the end', () => {
    expect(
      computeDraggedMelodyStudyRange('start', { startIndex: 1, endIndex: 3 }, 2, 8)
    ).toEqual({
      startIndex: 2,
      endIndex: 3,
    });
  });

  it('drags the end handle without crossing the start', () => {
    expect(
      computeDraggedMelodyStudyRange('end', { startIndex: 1, endIndex: 3 }, 0, 8)
    ).toEqual({
      startIndex: 0,
      endIndex: 1,
    });
  });

  it('moves the whole range while preserving its size', () => {
    expect(
      computeDraggedMelodyStudyRange('move', { startIndex: 2, endIndex: 4 }, 5, 8, 1)
    ).toEqual({
      startIndex: 4,
      endIndex: 6,
    });
  });
});
