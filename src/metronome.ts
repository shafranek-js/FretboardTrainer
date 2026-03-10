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
let metronomeNextBeatTimeSec: number | null = null;
let metronomeAudioPerfOffsetMs: number | null = null;
const METRONOME_ALIGNMENT_TOLERANCE_MS = 1;
const METRONOME_SCHEDULER_LOOKAHEAD_MS = 25;
const METRONOME_SCHEDULE_AHEAD_SEC = 0.1;
type MetronomeBeatListener = (payload: {
  beatInBar: number;
  beatIndex: number;
  timestampMs: number;
  accented: boolean;
  secondaryAccented?: boolean;
}) => void;
const metronomeBeatListeners = new Set<MetronomeBeatListener>();
type ScheduledMetronomeClick = {
  source: AudioBufferSourceNode | null;
  gain: GainNode | null;
  startTimeSec: number;
  uiTimeoutId: number | null;
};
const scheduledMetronomeClicks = new Set<ScheduledMetronomeClick>();
let metronomeAccentedClickBuffer: AudioBuffer | null = null;
let metronomeRegularClickBuffer: AudioBuffer | null = null;

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

function resetMetronomeClickBuffers() {
  metronomeAccentedClickBuffer = null;
  metronomeRegularClickBuffer = null;
}

function createMetronomeClickBuffer(audioContext: AudioContext, accented: boolean) {
  const durationSec = 0.06;
  const frameCount = Math.max(1, Math.round(audioContext.sampleRate * durationSec));
  const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
  const channel = buffer.getChannelData(0);
  const baseFrequency = accented ? 1760 : 1320;
  const peakAmplitude = accented ? 0.12 : 0.08;

  for (let index = 0; index < frameCount; index += 1) {
    const timeSec = index / audioContext.sampleRate;
    const envelope = Math.exp(-timeSec * 52);
    channel[index] = Math.sin(2 * Math.PI * baseFrequency * timeSec) * peakAmplitude * envelope;
  }

  return buffer;
}

function getMetronomeClickBuffer(audioContext: AudioContext, accented: boolean) {
  if (accented) {
    if (!metronomeAccentedClickBuffer || metronomeAccentedClickBuffer.sampleRate !== audioContext.sampleRate) {
      metronomeAccentedClickBuffer = createMetronomeClickBuffer(audioContext, true);
    }
    return metronomeAccentedClickBuffer;
  }
  if (!metronomeRegularClickBuffer || metronomeRegularClickBuffer.sampleRate !== audioContext.sampleRate) {
    metronomeRegularClickBuffer = createMetronomeClickBuffer(audioContext, false);
  }
  return metronomeRegularClickBuffer;
}

function playMetronomeClick(audioContext: AudioContext, accented: boolean, startTimeSec = audioContext.currentTime) {
  const linearGain = metronomeVolumePercent / 100;
  if (linearGain <= 0) {
    return { source: null, gain: null };
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = getMetronomeClickBuffer(audioContext, accented);
  gain.gain.setValueAtTime(linearGain, startTimeSec);
  source.connect(gain);
  gain.connect(audioContext.destination);
  source.start(startTimeSec);

  return { source, gain };
}

export async function playMetronomeCue(accented = false) {
  const audioContext = await ensureMetronomeAudioContext();
  playMetronomeClick(audioContext, accented);
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
    resetMetronomeClickBuffers();
  }

  if (metronomeAudioContext.state === 'suspended') {
    await metronomeAudioContext.resume();
  }

  return metronomeAudioContext;
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

function clearScheduledMetronomeClicks(options?: { keepStarted?: boolean }) {
  const cutoffSec = metronomeAudioContext?.currentTime ?? 0;
  scheduledMetronomeClicks.forEach((click) => {
    if (options?.keepStarted && click.startTimeSec < cutoffSec) {
      return;
    }
    if (click.uiTimeoutId !== null) {
      clearTimeout(click.uiTimeoutId);
    }
    if (click.source) {
      try {
        click.source.onended = null;
        click.source.stop();
      } catch {
        // Ignore clicks that already ended.
      }
      click.source.disconnect();
    }
    click.gain?.disconnect();
    scheduledMetronomeClicks.delete(click);
  });
}

function syncMetronomeAudioPerfOffset(audioContext: AudioContext) {
  metronomeAudioPerfOffsetMs = performance.now() - audioContext.currentTime * 1000;
}

function getMetronomeAudioPerfOffset(audioContext: AudioContext) {
  if (metronomeAudioPerfOffsetMs === null) {
    syncMetronomeAudioPerfOffset(audioContext);
  }
  return metronomeAudioPerfOffsetMs;
}

function toPerformanceTimeMs(audioContext: AudioContext, audioTimeSec: number) {
  return audioTimeSec * 1000 + getMetronomeAudioPerfOffset(audioContext);
}

function emitScheduledMetronomeBeat(beatIndex: number, timestampMs: number) {
  metronomeLastBeatAtMs = timestampMs;
  const beatZeroIndexed = beatIndex % metronomeBeatsPerBar;
  const accented = beatZeroIndexed === 0;
  const secondaryAccented =
    !accented && metronomeSecondaryAccentBeatIndices.includes(beatZeroIndexed);
  const beatInBar = beatZeroIndexed + 1;
  metronomeBeatListeners.forEach((listener) => {
    listener({
      beatInBar,
      beatIndex,
      timestampMs,
      accented,
      secondaryAccented,
    });
  });
}

function scheduleMetronomeBeat(audioContext: AudioContext, beatIndex: number, beatTimeSec: number) {
  const beatZeroIndexed = beatIndex % metronomeBeatsPerBar;
  const accented = beatZeroIndexed === 0;
  const secondaryAccented =
    !accented && metronomeSecondaryAccentBeatIndices.includes(beatZeroIndexed);
  const clickNodes = playMetronomeClick(audioContext, accented || secondaryAccented, beatTimeSec);
  const beatTimePerfMs = toPerformanceTimeMs(audioContext, beatTimeSec);
  const uiDelayMs = Math.max(0, Math.round(beatTimePerfMs - performance.now()));
  const scheduledClick: ScheduledMetronomeClick = {
    source: clickNodes.source,
    gain: clickNodes.gain,
    startTimeSec: beatTimeSec,
    uiTimeoutId: null,
  };
  scheduledMetronomeClicks.add(scheduledClick);
  scheduledClick.uiTimeoutId = window.setTimeout(() => {
    scheduledClick.uiTimeoutId = null;
    emitScheduledMetronomeBeat(beatIndex, beatTimePerfMs);
  }, uiDelayMs);

  if (!clickNodes.source) {
    return;
  }

  clickNodes.source.onended = () => {
    if (scheduledClick.uiTimeoutId !== null) {
      clearTimeout(scheduledClick.uiTimeoutId);
      scheduledClick.uiTimeoutId = null;
    }
    clickNodes.source.disconnect();
    clickNodes.gain?.disconnect();
    scheduledMetronomeClicks.delete(scheduledClick);
  };
}

function scheduleNextMetronomeTick() {
  clearMetronomeTimer();
  if (!metronomeAudioContext || metronomeNextBeatTimeSec === null) {
    return;
  }

  const audioContext = metronomeAudioContext;
  const intervalSec = getMetronomeIntervalExactMs(metronomeBpm) / 1000;
  const nowSec = audioContext.currentTime;

  while (metronomeNextBeatTimeSec < nowSec - intervalSec) {
    metronomeBeatIndex += 1;
    metronomeNextBeatTimeSec += intervalSec;
  }

  while (metronomeNextBeatTimeSec < nowSec + METRONOME_SCHEDULE_AHEAD_SEC) {
    scheduleMetronomeBeat(audioContext, metronomeBeatIndex, metronomeNextBeatTimeSec);
    metronomeBeatIndex += 1;
    metronomeNextBeatTimeSec += intervalSec;
  }

  metronomeTimerId = window.setTimeout(() => {
    if (!metronomeAudioContext) return;
    scheduleNextMetronomeTick();
  }, METRONOME_SCHEDULER_LOOKAHEAD_MS);
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
  const audioContext = await ensureMetronomeAudioContext();

  clearMetronomeTimer();
  clearScheduledMetronomeClicks();
  syncMetronomeAudioPerfOffset(audioContext);

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
    metronomeNextBeatTimeSec = (alignedStartMs - getMetronomeAudioPerfOffset(audioContext)) / 1000;
  } else {
    metronomeNextBeatTimeSec = audioContext.currentTime;
  }

  scheduleNextMetronomeTick();
}

export function stopMetronome() {
  clearMetronomeTimer();
  clearScheduledMetronomeClicks();
  metronomeBeatIndex = 0;
  metronomeLastBeatAtMs = null;
  metronomeNextBeatTimeSec = null;
  metronomeAudioPerfOffsetMs = null;
}

export async function setMetronomeTempo(nextBpm: number) {
  const clampedBpm = clampMetronomeBpm(nextBpm);
  const bpmChanged = clampedBpm !== metronomeBpm;
  metronomeBpm = clampedBpm;
  if (!isMetronomeRunning()) return metronomeBpm;
  if (!bpmChanged) return metronomeBpm;

  if (metronomeAudioContext) {
    clearScheduledMetronomeClicks({ keepStarted: true });
    metronomeNextBeatTimeSec = metronomeAudioContext.currentTime + getMetronomeIntervalExactMs(metronomeBpm) / 1000;
  }
  scheduleNextMetronomeTick();
  return metronomeBpm;
}





