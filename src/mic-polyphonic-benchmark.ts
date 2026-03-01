import { normalizeMicPolyphonicDetectorProvider } from './mic-polyphonic-detector';

interface MicPolyphonicBenchmarkInput {
  spectrum: Float32Array;
  timeDomainData: Float32Array;
  frameVolumeRms: number;
  timestampMs: number;
  sampleRate: number;
  fftSize: number;
  calibratedA4: number;
  lastDetectedChord: string;
  stableChordCounter: number;
  requiredStableFrames: number;
  targetChordNotes: string[];
  provider: string;
}

interface MicPolyphonicBenchmarkDetectionResult {
  detectedNotesText: string;
  nextStableChordCounter: number;
  isStableMatch: boolean;
  isStableMismatch: boolean;
  fallbackFrom?: string | null;
  warnings?: string[];
}

export interface MicPolyphonicBenchmarkSummary {
  provider: string;
  frames: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  fallbackFrames: number;
  warningFrames: number;
  stableMatchFrames: number;
  stableMismatchFrames: number;
  pendingFrames: number;
}

interface RunMicPolyphonicBenchmarkDeps {
  provider: string;
  detectMicPolyphonicFrame(input: MicPolyphonicBenchmarkInput): MicPolyphonicBenchmarkDetectionResult;
  now(): number;
}

const BENCHMARK_SAMPLE_RATE = 48_000;
const BENCHMARK_FFT_SIZE = 4096;
const BENCHMARK_SPECTRUM_LENGTH = BENCHMARK_FFT_SIZE / 2;
const BENCHMARK_TIME_DOMAIN_LENGTH = BENCHMARK_FFT_SIZE;
const BENCHMARK_REQUIRED_STABLE_FRAMES = 3;
const BENCHMARK_FRAMES_PER_SCENARIO = 90;
const BENCHMARK_TARGET_CHORD = ['C', 'E', 'G'];

function createSpectrum(fillValue = -120) {
  return new Float32Array(BENCHMARK_SPECTRUM_LENGTH).fill(fillValue);
}

function createTimeDomainData() {
  const data = new Float32Array(BENCHMARK_TIME_DOMAIN_LENGTH);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.sin((i / data.length) * Math.PI * 2) * 0.1;
  }
  return data;
}

function addPeak(spectrum: Float32Array, frequency: number, db: number) {
  const centerBin = Math.round((frequency * BENCHMARK_FFT_SIZE) / BENCHMARK_SAMPLE_RATE);
  for (let offset = -1; offset <= 1; offset += 1) {
    const bin = centerBin + offset;
    if (bin <= 0 || bin >= spectrum.length) continue;
    spectrum[bin] = Math.max(spectrum[bin], db - Math.abs(offset) * 3);
  }
}

function buildMatchSpectrum() {
  const spectrum = createSpectrum();
  for (const frequency of [130.81, 164.81, 196.0]) {
    addPeak(spectrum, frequency, -18);
    addPeak(spectrum, frequency * 2, -28);
    addPeak(spectrum, frequency * 3, -36);
  }
  return spectrum;
}

function buildNearMatchSpectrum() {
  const spectrum = buildMatchSpectrum();
  addPeak(spectrum, 174.61, -18.5); // F, strong near-match intruder
  addPeak(spectrum, 220.0, -27);
  return spectrum;
}

function buildMismatchSpectrum() {
  const spectrum = createSpectrum();
  for (const frequency of [146.83, 174.61, 220.0]) {
    addPeak(spectrum, frequency, -18);
    addPeak(spectrum, frequency * 2, -28);
  }
  return spectrum;
}

function buildScenarioFrames() {
  const sharedTimeDomain = createTimeDomainData();
  return [
    { spectrum: buildMatchSpectrum(), timeDomainData: sharedTimeDomain },
    { spectrum: buildNearMatchSpectrum(), timeDomainData: sharedTimeDomain },
    { spectrum: buildMismatchSpectrum(), timeDomainData: sharedTimeDomain },
  ];
}

function getProviderLabel(provider: string) {
  const normalized = normalizeMicPolyphonicDetectorProvider(provider);
  if (normalized === 'essentia_experimental') return 'Essentia Experimental';
  return 'Spectrum';
}

export function formatMicPolyphonicBenchmarkSummary(summary: MicPolyphonicBenchmarkSummary) {
  return (
    `Poly benchmark (${getProviderLabel(summary.provider)}): ${summary.frames} frames, ` +
    `avg ${summary.avgLatencyMs.toFixed(2)} ms, max ${summary.maxLatencyMs.toFixed(2)} ms, ` +
    `matches ${summary.stableMatchFrames}, mismatches ${summary.stableMismatchFrames}, ` +
    `pending ${summary.pendingFrames}` +
    (summary.fallbackFrames > 0 ? `, fallbacks ${summary.fallbackFrames}` : '') +
    (summary.warningFrames > 0 ? `, warnings ${summary.warningFrames}` : '') +
    '.'
  );
}

export function runMicPolyphonicBenchmark(
  deps: RunMicPolyphonicBenchmarkDeps
): MicPolyphonicBenchmarkSummary {
  const provider = normalizeMicPolyphonicDetectorProvider(deps.provider);
  const scenarios = buildScenarioFrames();
  let frames = 0;
  let totalLatencyMs = 0;
  let maxLatencyMs = 0;
  let fallbackFrames = 0;
  let warningFrames = 0;
  let stableMatchFrames = 0;
  let stableMismatchFrames = 0;
  let pendingFrames = 0;

  for (const scenario of scenarios) {
    let lastDetectedChord = '';
    let stableChordCounter = 0;

    for (let i = 0; i < BENCHMARK_FRAMES_PER_SCENARIO; i += 1) {
      const startedAt = deps.now();
      const result = deps.detectMicPolyphonicFrame({
        spectrum: scenario.spectrum,
        timeDomainData: scenario.timeDomainData,
        frameVolumeRms: 0.2,
        timestampMs: startedAt,
        sampleRate: BENCHMARK_SAMPLE_RATE,
        fftSize: BENCHMARK_FFT_SIZE,
        calibratedA4: 440,
        lastDetectedChord,
        stableChordCounter,
        requiredStableFrames: BENCHMARK_REQUIRED_STABLE_FRAMES,
        targetChordNotes: BENCHMARK_TARGET_CHORD,
        provider,
      });
      const latencyMs = Math.max(0, deps.now() - startedAt);
      frames += 1;
      totalLatencyMs += latencyMs;
      maxLatencyMs = Math.max(maxLatencyMs, latencyMs);
      if (result.fallbackFrom) fallbackFrames += 1;
      if ((result.warnings?.length ?? 0) > 0) warningFrames += 1;
      if (result.isStableMatch) {
        stableMatchFrames += 1;
      } else if (result.isStableMismatch) {
        stableMismatchFrames += 1;
      } else {
        pendingFrames += 1;
      }
      lastDetectedChord = result.detectedNotesText;
      stableChordCounter = result.nextStableChordCounter;
    }
  }

  return {
    provider,
    frames,
    avgLatencyMs: frames > 0 ? totalLatencyMs / frames : 0,
    maxLatencyMs,
    fallbackFrames,
    warningFrames,
    stableMatchFrames,
    stableMismatchFrames,
    pendingFrames,
  };
}
