export interface MicNoteReattackInput {
  performanceAdaptive: boolean;
  onsetAgeMs: number | null;
  currentVolume: number;
  previousVolume: number;
  peakVolume?: number;
  eventDurationMs?: number | null;
}

function sanitizeVolume(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeEventDurationMs(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function shouldRearmMicOnsetForSameNote(input: MicNoteReattackInput) {
  if (!input.performanceAdaptive) return false;

  const normalizedEventDurationMs = normalizeEventDurationMs(input.eventDurationMs);
  const minOnsetAgeMs =
    normalizedEventDurationMs === null
      ? 36
      : clamp(Math.round(normalizedEventDurationMs * 0.18), 24, 72);
  if (
    input.onsetAgeMs === null ||
    !Number.isFinite(input.onsetAgeMs) ||
    input.onsetAgeMs < minOnsetAgeMs
  ) {
    return false;
  }

  const currentVolume = sanitizeVolume(input.currentVolume);
  const previousVolume = sanitizeVolume(input.previousVolume);
  const peakVolume = sanitizeVolume(
    input.peakVolume ?? Math.max(currentVolume, previousVolume)
  );
  const decayFromPeak = Math.max(0, peakVolume - previousVolume);
  const requiredDecay = Math.max(0.0008, peakVolume * 0.14);
  if (decayFromPeak < requiredDecay) return false;

  if (currentVolume <= previousVolume) return false;

  const rise = currentVolume - previousVolume;
  const requiredRise = Math.max(0.0016, previousVolume * 0.12);
  return rise >= requiredRise;
}
