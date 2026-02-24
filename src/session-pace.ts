export type SessionPace = 'slow' | 'normal' | 'fast';

export function normalizeSessionPace(value: unknown): SessionPace {
  if (value === 'slow' || value === 'fast') return value;
  return 'normal';
}

export function getPromptAudioInputIgnoreMs(sessionPace: SessionPace): number {
  if (sessionPace === 'slow') return 700;
  if (sessionPace === 'fast') return 220;
  return 380;
}

export function getStandardSuccessDelayMs(sessionPace: SessionPace): number {
  if (sessionPace === 'slow') return 1500;
  if (sessionPace === 'fast') return 280;
  return 650;
}

export function getArpeggioCompleteDelayMs(sessionPace: SessionPace): number {
  if (sessionPace === 'slow') return 1500;
  if (sessionPace === 'fast') return 500;
  return 900;
}
