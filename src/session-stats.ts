import type { IInstrument } from './instruments/instrument';
import type { NoteStat, Prompt, RhythmSessionStats, SessionStats } from './types';

function ensureNoteStat(map: Record<string, NoteStat>, key: string) {
  if (!map[key]) {
    map[key] = { attempts: 0, correct: 0, totalTime: 0 };
  }
  return map[key];
}

function createEmptyRhythmStats(): RhythmSessionStats {
  return {
    totalJudged: 0,
    onBeat: 0,
    early: 0,
    late: 0,
    totalAbsOffsetMs: 0,
    bestAbsOffsetMs: null,
  };
}

interface CreateSessionStatsInput {
  modeKey: string;
  modeLabel: string;
  instrumentName?: string;
  tuningPresetKey?: string;
  inputSource?: 'microphone' | 'midi';
  inputDeviceLabel?: string;
  stringOrder?: string[];
  enabledStrings?: string[];
  minFret?: number;
  maxFret?: number;
  startedAtMs?: number;
}

interface TargetZone {
  stringName: string;
  fret: number;
}

function buildTargetZoneKey(zone: TargetZone) {
  return `${zone.stringName}:${zone.fret}`;
}

function resolvePromptTargetZone(prompt: Prompt | null, instrument: Pick<IInstrument, 'FRETBOARD'> | null) {
  if (!prompt || !instrument || !prompt.targetNote || !prompt.targetString) return null;
  const fret = instrument.FRETBOARD[prompt.targetString]?.[prompt.targetNote];
  if (typeof fret !== 'number') return null;
  return {
    stringName: prompt.targetString,
    fret,
  } satisfies TargetZone;
}

export function createSessionStats({
  modeKey,
  modeLabel,
  instrumentName = '',
  tuningPresetKey = '',
  inputSource = 'microphone',
  inputDeviceLabel = '',
  stringOrder = [],
  enabledStrings = [],
  minFret = 0,
  maxFret = 12,
  startedAtMs = Date.now(),
}: CreateSessionStatsInput): SessionStats {
  return {
    modeKey,
    modeLabel,
    startedAtMs,
    endedAtMs: null,
    instrumentName,
    tuningPresetKey,
    inputSource,
    inputDeviceLabel,
    stringOrder: [...stringOrder],
    enabledStrings: [...enabledStrings],
    minFret,
    maxFret,
    totalAttempts: 0,
    correctAttempts: 0,
    totalTime: 0,
    currentCorrectStreak: 0,
    bestCorrectStreak: 0,
    noteStats: {},
    targetZoneStats: {},
    rhythmStats: createEmptyRhythmStats(),
  };
}

export function buildSessionStatsNoteKey(prompt: Prompt | null): string | null {
  if (!prompt) return null;
  const { baseChordName, targetNote, targetString } = prompt;

  if (baseChordName) return `${baseChordName}-CHORD`;
  if (targetNote && targetString) return `${targetNote}-${targetString}`;
  if (targetNote) return targetNote;
  return null;
}

export function recordSessionAttempt(
  sessionStats: SessionStats | null,
  prompt: Prompt | null,
  isCorrect: boolean,
  elapsedSeconds = 0,
  instrument: Pick<IInstrument, 'FRETBOARD'> | null = null
) {
  if (!sessionStats) return;

  const noteKey = buildSessionStatsNoteKey(prompt);
  const targetZone = resolvePromptTargetZone(prompt, instrument);
  if (!noteKey && !targetZone) return;

  sessionStats.totalAttempts++;
  if (!isCorrect) {
    sessionStats.currentCorrectStreak = 0;
  }
  if (noteKey) {
    const noteStat = ensureNoteStat(sessionStats.noteStats, noteKey);
    noteStat.attempts++;
  }
  if (targetZone) {
    const zoneStat = ensureNoteStat(sessionStats.targetZoneStats, buildTargetZoneKey(targetZone));
    zoneStat.attempts++;
  }

  if (!isCorrect) return;

  sessionStats.correctAttempts++;
  sessionStats.totalTime += elapsedSeconds;
  sessionStats.currentCorrectStreak++;
  sessionStats.bestCorrectStreak = Math.max(
    sessionStats.bestCorrectStreak,
    sessionStats.currentCorrectStreak
  );
  if (noteKey) {
    const noteStat = ensureNoteStat(sessionStats.noteStats, noteKey);
    noteStat.correct++;
    noteStat.totalTime += elapsedSeconds;
  }
  if (targetZone) {
    const zoneStat = ensureNoteStat(sessionStats.targetZoneStats, buildTargetZoneKey(targetZone));
    zoneStat.correct++;
    zoneStat.totalTime += elapsedSeconds;
  }
}

export function finalizeSessionStats(sessionStats: SessionStats | null, endedAtMs = Date.now()) {
  if (!sessionStats) return null;
  return {
    ...sessionStats,
    endedAtMs,
    noteStats: { ...sessionStats.noteStats },
    targetZoneStats: { ...sessionStats.targetZoneStats },
    rhythmStats: { ...sessionStats.rhythmStats },
    stringOrder: [...sessionStats.stringOrder],
    enabledStrings: [...sessionStats.enabledStrings],
  } satisfies SessionStats;
}

export function recordRhythmTimingAttempt(
  sessionStats: SessionStats | null,
  signedOffsetMs: number,
  absOffsetMs: number,
  isOnBeat: boolean
) {
  if (!sessionStats) return;

  sessionStats.totalAttempts++;
  sessionStats.rhythmStats.totalJudged++;
  sessionStats.rhythmStats.totalAbsOffsetMs += absOffsetMs;
  if (!isOnBeat) {
    sessionStats.currentCorrectStreak = 0;
  }
  sessionStats.rhythmStats.bestAbsOffsetMs =
    sessionStats.rhythmStats.bestAbsOffsetMs === null
      ? absOffsetMs
      : Math.min(sessionStats.rhythmStats.bestAbsOffsetMs, absOffsetMs);

  if (isOnBeat) {
    sessionStats.correctAttempts++;
    sessionStats.currentCorrectStreak++;
    sessionStats.bestCorrectStreak = Math.max(
      sessionStats.bestCorrectStreak,
      sessionStats.currentCorrectStreak
    );
    sessionStats.rhythmStats.onBeat++;
    return;
  }

  if (signedOffsetMs < 0) {
    sessionStats.rhythmStats.early++;
  } else {
    sessionStats.rhythmStats.late++;
  }
}
