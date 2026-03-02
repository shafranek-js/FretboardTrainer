import { describe, expect, it } from 'vitest';
import { resolveMelodyPlaybackTempoBpm, storeMelodyPlaybackTempoBpm } from './melody-playback-tempo';

describe('melody-playback-tempo', () => {
  it('prefers the melody source tempo over a generic fallback', () => {
    expect(
      resolveMelodyPlaybackTempoBpm({ id: 'builtin:ode', sourceTempoBpm: 92 }, {}, 120)
    ).toBe(92);
  });

  it('prefers a stored per-melody override over the source tempo', () => {
    expect(
      resolveMelodyPlaybackTempoBpm(
        { id: 'builtin:twinkle', sourceTempoBpm: 100 },
        { 'builtin:twinkle': 132 },
        90
      )
    ).toBe(132);
  });

  it('drops the stored override when the user returns to the melody source tempo', () => {
    expect(
      storeMelodyPlaybackTempoBpm(
        { 'builtin:twinkle': 132 },
        { id: 'builtin:twinkle', sourceTempoBpm: 100 },
        100
      )
    ).toEqual({
      bpm: 100,
      byId: {},
    });
  });

  it('keeps a user override when the melody tempo differs from the source tempo', () => {
    expect(
      storeMelodyPlaybackTempoBpm(
        {},
        { id: 'builtin:twinkle', sourceTempoBpm: 100 },
        116
      )
    ).toEqual({
      bpm: 116,
      byId: { 'builtin:twinkle': 116 },
    });
  });
});
