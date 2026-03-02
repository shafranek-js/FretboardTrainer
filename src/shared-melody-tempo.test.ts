import { describe, expect, it } from 'vitest';
import { resolveSharedMelodyTempoBpm, shouldLinkMelodyTempoControls } from './shared-melody-tempo';

describe('shared-melody-tempo', () => {
  it('links controls only for melody workflows with metronome enabled', () => {
    expect(shouldLinkMelodyTempoControls('performance', true)).toBe(true);
    expect(shouldLinkMelodyTempoControls('melody', true)).toBe(true);
    expect(shouldLinkMelodyTempoControls('random', true)).toBe(false);
    expect(shouldLinkMelodyTempoControls('performance', false)).toBe(false);
  });

  it('normalizes a shared bpm that both controls can use', () => {
    expect(resolveSharedMelodyTempoBpm(30)).toEqual({
      melodyBpm: 40,
      metronomeBpm: 40,
    });
    expect(resolveSharedMelodyTempoBpm(180)).toEqual({
      melodyBpm: 180,
      metronomeBpm: 180,
    });
    expect(resolveSharedMelodyTempoBpm(260)).toEqual({
      melodyBpm: 220,
      metronomeBpm: 220,
    });
  });
});
