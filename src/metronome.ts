import { resolveAudioContextCtor } from './audio-runtime';

export const MIN_METRONOME_BPM = 40;
export const MAX_METRONOME_BPM = 240;
export const MIN_METRONOME_VOLUME_PERCENT = 0;
export const MAX_METRONOME_VOLUME_PERCENT = 400;
export const MIN_METRONOME_BEATS_PER_BAR = 1;
export const MAX_METRONOME_BEATS_PER_BAR = 12;
export const DEFAULT_METRONOME_BEATS_PER_BAR = 4;
export const DEFAULT_METRONOME_BEAT_UNIT_DENOMINATOR = 4;

let metronomeAudioContext: AudioContext | null = null;
let metronomeTimerId: number | null = null;
let metronomeBeatIndex = 0;
let metronomeBpm = 80;
let metronomeVolumePercent = 100;
let metronomeBeatsPerBar = DEFAULT_METRONOME_BEATS_PER_BAR;
let metronomeBeatUnitDenominator = DEFAULT_METRONOME_BEAT_UNIT_DENOMINATOR;
let metronomeSecondaryAccentBeatIndices: number[] = [];
let metronomeLastBeatAtMs: number | null = null;
let metronomeNextTickAtMs: number | null = null;
const METRONOME_ALIGNMENT_TOLERANCE_MS = 1;
type MetronomeBeatListener = (payload: {
  beatInBar: number;
  beatIndex: number;
  timestampMs: number;
  accented: boolean;
  secondaryAccented?: boolean;
}) => void;
const metronomeBeatListeners = new Set<MetronomeBeatListener>();

export function clampMetronomeBpm(bpm: number) {
  if (!Number.isFinite(bpm)) return 80;
  return Math.max(MIN_METRONOME_BPM, Math.min(MAX_METRONOME_BPM, Math.round(bpm)));
}

export function computeMetronomeIntervalMs(bpm: number) {
  const clampedBpm = clampMetronomeBpm(bpm);
  return Math.round(60000 / clampedBpm);
}

export function clampMetronomeBeatsPerBar(beatsPerBar: number) {
  if (!Number.isFinite(beatsPerBar)) return DEFAULT_METRONOME_BEATS_PER_BAR;
  return Math.max(
    MIN_METRONOME_BEATS_PER_BAR,
    Math.min(MAX_METRONOME_BEATS_PER_BAR, Math.round(beatsPerBar))
  );
}

export function getMetronomeBeatsPerBar() {
  return metronomeBeatsPerBar;
}

export function setMetronomeBeatsPerBar(nextBeatsPerBar: number) {
  metronomeBeatsPerBar = clampMetronomeBeatsPerBar(nextBeatsPerBar);
  return metronomeBeatsPerBar;
}

function normalizeBeatUnitDenominator(denominator: number) {
  if (!Number.isFinite(denominator)) return DEFAULT_METRONOME_BEAT_UNIT_DENOMINATOR;
  const rounded = Math.round(denominator);
  if (rounded <= 0) return DEFAULT_METRONOME_BEAT_UNIT_DENOMINATOR;
  return rounded;
}

export function getMetronomeBeatUnitDenominator() {
  return metronomeBeatUnitDenominator;
}

export function setMetronomeBeatUnitDenominator(nextBeatUnitDenominator: number) {
  metronomeBeatUnitDenominator = normalizeBeatUnitDenominator(nextBeatUnitDenominator);
  return metronomeBeatUnitDenominator;
}

function normalizeSecondaryAccentBeatIndices(indices: number[]) {
  const unique = new Set<number>();
  indices.forEach((index) => {
    if (!Number.isFinite(index)) return;
    const rounded = Math.round(index);
    if (rounded <= 0 || rounded >= metronomeBeatsPerBar) return;
    unique.add(rounded);
  });
  return [...unique].sort((a, b) => a - b);
}

export function setMetronomeSecondaryAccentBeatIndices(indices: number[]) {
  metronomeSecondaryAccentBeatIndices = normalizeSecondaryAccentBeatIndices(indices);
  return [...metronomeSecondaryAccentBeatIndices];
}

export function setMetronomeMeter(options: {
  beatsPerBar: number;
  beatUnitDenominator?: number;
  secondaryAccentBeatIndices?: number[];
}) {
  setMetronomeBeatsPerBar(options.beatsPerBar);
  setMetronomeBeatUnitDenominator(options.beatUnitDenominator ?? DEFAULT_METRONOME_BEAT_UNIT_DENOMINATOR);
  setMetronomeSecondaryAccentBeatIndices(options.secondaryAccentBeatIndices ?? []);
}

export function clampMetronomeVolumePercent(volumePercent: number) {
  if (!Number.isFinite(volumePercent)) return 100;
  return Math.max(
    MIN_METRONOME_VOLUME_PERCENT,
    Math.min(MAX_METRONOME_VOLUME_PERCENT, Math.round(volumePercent))
  );
}

export function getMetronomeVolumePercent() {
  return metronomeVolumePercent;
}

export function setMetronomeVolume(nextVolumePercent: number) {
  metronomeVolumePercent = clampMetronomeVolumePercent(nextVolumePercent);
  return metronomeVolumePercent;
}

function playMetronomeClick(audioContext: AudioContext, accented: boolean) {
  const linearGain = metronomeVolumePercent / 100;
  if (linearGain <= 0) return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = accented ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(accented ? 1760 : 1320, now);

  const peakGain = (accented ? 0.12 : 0.08) * linearGain;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain), now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.06);

  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

async function ensureMetronomeAudioContext() {
  if (!metronomeAudioContext || metronomeAudioContext.state === 'closed') {
    const ctor = resolveAudioContextCtor(
      (window as Window & { webkitAudioContext?: typeof AudioContext }) satisfies Window & {
        webkitAudioContext?: typeof AudioContext;
      }
    );
    if (!ctor) {
      throw new Error('Web Audio API is not supported in this browser.');
    }
    metronomeAudioContext = new ctor();
  }

  if (metronomeAudioContext.state === 'suspended') {
    await metronomeAudioContext.resume();
  }

  return metronomeAudioContext;
}

function tickMetronome() {
  if (!metronomeAudioContext) return;
  metronomeLastBeatAtMs = Date.now();
  const beatZeroIndexed = metronomeBeatIndex % metronomeBeatsPerBar;
  const accented = beatZeroIndexed === 0;
  const secondaryAccented =
    !accented && metronomeSecondaryAccentBeatIndices.includes(beatZeroIndexed);
  playMetronomeClick(metronomeAudioContext, accented || secondaryAccented);
  const beatInBar = (metronomeBeatIndex % metronomeBeatsPerBar) + 1;
  metronomeBeatListeners.forEach((listener) => {
    listener({
      beatInBar,
      beatIndex: metronomeBeatIndex,
      timestampMs: metronomeLastBeatAtMs!,
      accented,
      secondaryAccented,
    });
  });
  metronomeBeatIndex++;
}

function getMetronomeIntervalExactMs(bpm: number) {
  const clampedBpm = clampMetronomeBpm(bpm);
  return (60000 / clampedBpm) * (4 / metronomeBeatUnitDenominator);
}

function clearMetronomeTimer() {
  if (metronomeTimerId !== null) {
    clearTimeout(metronomeTimerId);
    metronomeTimerId = null;
  }
}

function scheduleNextMetronomeTick() {
  clearMetronomeTimer();
  if (metronomeNextTickAtMs === null) {
    metronomeNextTickAtMs = performance.now();
  }
  const nowMs = performance.now();
  const delayMs = Math.max(0, Math.round(metronomeNextTickAtMs - nowMs));
  metronomeTimerId = window.setTimeout(() => {
    if (!metronomeAudioContext) return;
    tickMetronome();
    const intervalMs = getMetronomeIntervalExactMs(metronomeBpm);
    let nextTickAtMs = (metronomeNextTickAtMs ?? performance.now()) + intervalMs;
    const driftNowMs = performance.now();
    if (nextTickAtMs < driftNowMs - intervalMs) {
      const skippedTicks = Math.floor((driftNowMs - nextTickAtMs) / intervalMs);
      if (skippedTicks > 0) {
        metronomeBeatIndex += skippedTicks;
        nextTickAtMs += skippedTicks * intervalMs;
      }
    }
    metronomeNextTickAtMs = nextTickAtMs;
    scheduleNextMetronomeTick();
  }, delayMs);
}

export function isMetronomeRunning() {
  return metronomeTimerId !== null;
}

export function getMetronomeBpm() {
  return metronomeBpm;
}

export interface MetronomeTimingSnapshot {
  isRunning: boolean;
  bpm: number;
  intervalMs: number;
  beatIndex: number;
  lastBeatAtMs: number | null;
}

export function getMetronomeTimingSnapshot(): MetronomeTimingSnapshot {
  return {
    isRunning: isMetronomeRunning(),
    bpm: metronomeBpm,
    intervalMs: Math.round(getMetronomeIntervalExactMs(metronomeBpm)),
    beatIndex: metronomeBeatIndex,
    lastBeatAtMs: metronomeLastBeatAtMs,
  };
}

export function subscribeMetronomeBeat(listener: MetronomeBeatListener) {
  metronomeBeatListeners.add(listener);
  return () => metronomeBeatListeners.delete(listener);
}

export interface StartMetronomeOptions {
  alignToPerformanceTimeMs?: number | null;
  startBeatIndex?: number;
}

export async function startMetronome(nextBpm: number, options?: StartMetronomeOptions) {
  metronomeBpm = clampMetronomeBpm(nextBpm);
  await ensureMetronomeAudioContext();

  clearMetronomeTimer();

  const explicitStartBeatIndex = options?.startBeatIndex;
  if (typeof explicitStartBeatIndex === 'number' && Number.isFinite(explicitStartBeatIndex)) {
    metronomeBeatIndex = Math.max(0, Math.round(explicitStartBeatIndex));
  } else {
    metronomeBeatIndex = 0;
  }

  const nowMs = performance.now();
  const alignedStartMs =
    typeof options?.alignToPerformanceTimeMs === 'number' && Number.isFinite(options.alignToPerformanceTimeMs)
      ? options.alignToPerformanceTimeMs
      : null;
  if (alignedStartMs !== null && alignedStartMs > nowMs + METRONOME_ALIGNMENT_TOLERANCE_MS) {
    metronomeNextTickAtMs = alignedStartMs;
    scheduleNextMetronomeTick();
    return;
  }

  metronomeNextTickAtMs = nowMs;
  tickMetronome();
  metronomeNextTickAtMs += getMetronomeIntervalExactMs(metronomeBpm);
  scheduleNextMetronomeTick();
}

export function stopMetronome() {
  clearMetronomeTimer();
  metronomeBeatIndex = 0;
  metronomeLastBeatAtMs = null;
  metronomeNextTickAtMs = null;
}

export async function setMetronomeTempo(nextBpm: number) {
  const clampedBpm = clampMetronomeBpm(nextBpm);
  const bpmChanged = clampedBpm !== metronomeBpm;
  metronomeBpm = clampedBpm;
  if (!isMetronomeRunning()) return metronomeBpm;
  if (!bpmChanged) return metronomeBpm;

  metronomeNextTickAtMs = performance.now() + getMetronomeIntervalExactMs(metronomeBpm);
  scheduleNextMetronomeTick();
  return metronomeBpm;
}
