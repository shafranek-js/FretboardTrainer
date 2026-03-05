export type SessionPace = 'slow' | 'normal' | 'fast' | 'ultra';

export function normalizeSessionPace(value: unknown): SessionPace {
  if (value === 'slow' || value === 'fast' || value === 'ultra') return value;
  return 'normal';
}

export function getPromptAudioInputIgnoreMs(
  sessionPace: SessionPace,
  eventDurationMs?: number | null
): number {
  let baseIgnoreMs = 380;
  if (sessionPace === 'slow') baseIgnoreMs = 700;
  else if (sessionPace === 'ultra') baseIgnoreMs = 120;
  else if (sessionPace === 'fast') baseIgnoreMs = 220;

  if (typeof eventDurationMs === 'number' && Number.isFinite(eventDurationMs) && eventDurationMs > 0) {
    const eventBoundedIgnoreMs = Math.max(0, Math.round(eventDurationMs * 0.42));
    return Math.min(baseIgnoreMs, eventBoundedIgnoreMs);
  }

  return baseIgnoreMs;
}

export function getStandardSuccessDelayMs(sessionPace: SessionPace): number {
  if (sessionPace === 'slow') return 1500;
  if (sessionPace === 'ultra') return 120;
  if (sessionPace === 'fast') return 280;
  return 650;
}

export function getArpeggioCompleteDelayMs(sessionPace: SessionPace): number {
  if (sessionPace === 'slow') return 1500;
  if (sessionPace === 'ultra') return 240;
  if (sessionPace === 'fast') return 500;
  return 900;
}
