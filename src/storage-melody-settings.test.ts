import { describe, expect, it } from 'vitest';
import {
  applyStoredMelodySettings,
  resolveStoredMelodySettings,
} from './storage-melody-settings';

describe('storage-melody-settings', () => {
  it('normalizes stored melody maps and falls back to instrument default melody', () => {
    const resolved = resolveStoredMelodySettings(
      {
        melodyTimelineZoomPercent: 155,
        scrollingTabZoomPercent: 135,
        melodyDemoBpm: '132',
        melodyPlaybackBpmById: {
          ' song-a ': 500,
          ' ': 70,
        },
        melodyTransposeById: {
          ' song-a ': '2',
        },
        melodyStringShiftById: {
          ' song-a ': '-1',
        },
        melodyStudyRangeById: {
          ' song-a ': { startIndex: '3', endIndex: 8.2 },
        },
        melodyLoopRange: true,
        melodyTransposeSemitones: '4',
        melodyStringShift: '-2',
      },
      {
        name: 'guitar',
        STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'],
        getNoteWithOctave: () => null,
      },
      () => 'builtin:guitar:ode_to_joy_intro'
    );

    expect(resolved).toEqual({
      preferredMelodyId: 'builtin:guitar:ode_to_joy_intro',
      melodyTimelineZoomPercent: 155,
      scrollingTabZoomPercent: 135,
      melodyDemoBpm: '132',
      melodyPlaybackBpmById: { 'song-a': 220 },
      melodyTransposeById: { 'song-a': 2 },
      melodyStringShiftById: { 'song-a': -1 },
      melodyStudyRangeById: { 'song-a': { startIndex: 3, endIndex: 8 } },
      melodyLoopRangeEnabled: true,
      melodyTransposeSemitones: 4,
      melodyStringShift: -2,
    });
  });

  it('applies resolved melody settings into dom and state targets', () => {
    const dom = {
      melodyTimelineZoom: { value: '' },
      melodyTimelineZoomValue: { textContent: '' },
      scrollingTabZoom: { value: '' },
      scrollingTabZoomValue: { textContent: '' },
      melodyDemoBpm: { value: '' },
      melodyDemoBpmValue: { textContent: '' },
      melodyLoopRange: { checked: false },
      melodyTranspose: { value: '' },
      melodyTransposeValue: { textContent: '' },
      melodyStringShift: { value: '' },
      melodyStringShiftValue: { textContent: '' },
    };
    const state = {
      preferredMelodyId: null,
      melodyTimelineZoomPercent: 100,
      scrollingTabZoomPercent: 100,
      melodyPlaybackBpmById: {},
      melodyTransposeById: {},
      melodyStringShiftById: {},
      melodyStudyRangeById: {},
      melodyStudyRangeStartIndex: 99,
      melodyStudyRangeEndIndex: 99,
      melodyLoopRangeEnabled: false,
      melodyTransposeSemitones: 0,
      melodyStringShift: 0,
    };

    applyStoredMelodySettings(
      {
        preferredMelodyId: 'song-a',
        melodyTimelineZoomPercent: 145,
        scrollingTabZoomPercent: 120,
        melodyDemoBpm: '108',
        melodyPlaybackBpmById: { 'song-a': 108 },
        melodyTransposeById: { 'song-a': 3 },
        melodyStringShiftById: { 'song-a': -1 },
        melodyStudyRangeById: { 'song-a': { startIndex: 2, endIndex: 9 } },
        melodyLoopRangeEnabled: true,
        melodyTransposeSemitones: 3,
        melodyStringShift: -1,
      },
      dom,
      state
    );

    expect(state).toMatchObject({
      preferredMelodyId: 'song-a',
      melodyTimelineZoomPercent: 145,
      scrollingTabZoomPercent: 120,
      melodyPlaybackBpmById: { 'song-a': 108 },
      melodyTransposeById: { 'song-a': 3 },
      melodyStringShiftById: { 'song-a': -1 },
      melodyStudyRangeById: { 'song-a': { startIndex: 2, endIndex: 9 } },
      melodyStudyRangeStartIndex: 0,
      melodyStudyRangeEndIndex: 0,
      melodyLoopRangeEnabled: true,
      melodyTransposeSemitones: 3,
      melodyStringShift: -1,
    });
    expect(dom).toMatchObject({
      melodyTimelineZoom: { value: '145' },
      melodyTimelineZoomValue: { textContent: '145%' },
      scrollingTabZoom: { value: '120' },
      scrollingTabZoomValue: { textContent: '120%' },
      melodyDemoBpm: { value: '108' },
      melodyDemoBpmValue: { textContent: '108' },
      melodyLoopRange: { checked: true },
      melodyTranspose: { value: '3' },
      melodyTransposeValue: { textContent: '+3 st' },
      melodyStringShift: { value: '-1' },
      melodyStringShiftValue: { textContent: '-1 str' },
    });
  });
});
