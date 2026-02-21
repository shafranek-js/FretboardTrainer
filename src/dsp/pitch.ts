export interface YinOptions {
  minFrequency?: number;
  maxFrequency?: number;
  threshold?: number;
}

const DEFAULT_YIN_OPTIONS: Required<YinOptions> = {
  minFrequency: 50,
  maxFrequency: 1200,
  threshold: 0.12,
};

/** Detects fundamental frequency using the YIN algorithm. Returns 0 when no stable pitch is found. */
export function detectPitchYin(
  buffer: Float32Array,
  sampleRate: number,
  options: YinOptions = {}
): number {
  const { minFrequency, maxFrequency, threshold } = { ...DEFAULT_YIN_OPTIONS, ...options };
  if (sampleRate <= 0 || buffer.length < 2) return 0;

  const maxTau = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(buffer.length / 2) - 1);
  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequency));

  if (maxTau <= minTau) return 0;

  const yinBuffer = new Float32Array(maxTau + 1);

  // Difference function
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < buffer.length - tau; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  // Cumulative mean normalized difference function (CMNDF)
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = runningSum === 0 ? 1 : (yinBuffer[tau] * tau) / runningSum;
  }

  // Absolute threshold
  let tauEstimate = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 <= maxTau && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  // Fallback to strongest minimum in the valid search band.
  if (tauEstimate === -1) {
    let minValue = Infinity;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (yinBuffer[tau] < minValue) {
        minValue = yinBuffer[tau];
        tauEstimate = tau;
      }
    }
    if (!Number.isFinite(minValue) || minValue > 0.35) {
      return 0;
    }
  }

  // Parabolic interpolation around tau for better precision.
  const x0 = tauEstimate > 1 ? tauEstimate - 1 : tauEstimate;
  const x2 = tauEstimate < maxTau ? tauEstimate + 1 : tauEstimate;

  let betterTau = tauEstimate;
  if (x0 !== tauEstimate && x2 !== tauEstimate) {
    const s0 = yinBuffer[x0];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[x2];
    const denominator = 2 * (2 * s1 - s2 - s0);
    if (denominator !== 0) {
      betterTau = tauEstimate + (s2 - s0) / denominator;
    }
  }

  if (!Number.isFinite(betterTau) || betterTau <= 0) return 0;
  const frequency = sampleRate / betterTau;

  if (!Number.isFinite(frequency) || frequency < minFrequency || frequency > maxFrequency) {
    return 0;
  }

  return frequency;
}
