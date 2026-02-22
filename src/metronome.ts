import { resolveAudioContextCtor } from './audio-runtime';

export const MIN_METRONOME_BPM = 40;
export const MAX_METRONOME_BPM = 240;
const DEFAULT_BEATS_PER_BAR = 4;

let metronomeAudioContext: AudioContext | null = null;
let metronomeTimerId: number | null = null;
let metronomeBeatIndex = 0;
let metronomeBpm = 80;
let metronomeLastBeatAtMs: number | null = null;
type MetronomeBeatListener = (payload: {
  beatInBar: number;
  beatIndex: number;
  timestampMs: number;
  accented: boolean;
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

function playMetronomeClick(audioContext: AudioContext, accented: boolean) {
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = accented ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(accented ? 1760 : 1320, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(accented ? 0.12 : 0.08, now + 0.005);
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
  const accented = metronomeBeatIndex % DEFAULT_BEATS_PER_BAR === 0;
  playMetronomeClick(metronomeAudioContext, accented);
  const beatInBar = (metronomeBeatIndex % DEFAULT_BEATS_PER_BAR) + 1;
  metronomeBeatListeners.forEach((listener) => {
    listener({
      beatInBar,
      beatIndex: metronomeBeatIndex,
      timestampMs: metronomeLastBeatAtMs!,
      accented,
    });
  });
  metronomeBeatIndex++;
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
    intervalMs: computeMetronomeIntervalMs(metronomeBpm),
    beatIndex: metronomeBeatIndex,
    lastBeatAtMs: metronomeLastBeatAtMs,
  };
}

export function subscribeMetronomeBeat(listener: MetronomeBeatListener) {
  metronomeBeatListeners.add(listener);
  return () => metronomeBeatListeners.delete(listener);
}

export async function startMetronome(nextBpm: number) {
  metronomeBpm = clampMetronomeBpm(nextBpm);
  await ensureMetronomeAudioContext();

  if (metronomeTimerId !== null) {
    clearInterval(metronomeTimerId);
    metronomeTimerId = null;
  }

  metronomeBeatIndex = 0;
  tickMetronome();

  metronomeTimerId = window.setInterval(() => {
    tickMetronome();
  }, computeMetronomeIntervalMs(metronomeBpm));
}

export function stopMetronome() {
  if (metronomeTimerId !== null) {
    clearInterval(metronomeTimerId);
    metronomeTimerId = null;
  }
  metronomeBeatIndex = 0;
  metronomeLastBeatAtMs = null;
}

export async function setMetronomeTempo(nextBpm: number) {
  metronomeBpm = clampMetronomeBpm(nextBpm);
  if (!isMetronomeRunning()) return metronomeBpm;

  await startMetronome(metronomeBpm);
  return metronomeBpm;
}
