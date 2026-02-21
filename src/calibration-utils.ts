export interface OpenATuningInfo {
  expectedFrequency: number;
  octave: number;
}

const DEFAULT_OPEN_A_TUNING_INFO: OpenATuningInfo = {
  expectedFrequency: 440,
  octave: 4,
};

export function getOpenATuningInfoFromTuning(tuning: Record<string, string>): OpenATuningInfo {
  const openA = tuning.A;
  if (typeof openA !== 'string') return DEFAULT_OPEN_A_TUNING_INFO;

  const match = /^A(-?\d+)$/.exec(openA);
  if (!match) return DEFAULT_OPEN_A_TUNING_INFO;

  const octave = Number(match[1]);
  if (!Number.isFinite(octave)) return DEFAULT_OPEN_A_TUNING_INFO;

  return {
    expectedFrequency: 440 * Math.pow(2, octave - 4),
    octave,
  };
}

export function computeCalibratedA4FromSamples(samples: number[], openAOctave: number): number | null {
  if (!samples.length) return null;

  const finiteSamples = samples.filter((value) => Number.isFinite(value) && value > 0);
  if (!finiteSamples.length) return null;

  const averageFrequency = finiteSamples.reduce((sum, value) => sum + value, 0) / finiteSamples.length;
  return averageFrequency * Math.pow(2, 4 - openAOctave);
}
