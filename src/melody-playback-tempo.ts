import type { MelodyDefinition } from './melody-library';
import { clampMelodyPlaybackBpm } from './melody-timeline-duration';

export function resolveMelodyPlaybackTempoBpm(
  melody: Pick<MelodyDefinition, 'id' | 'sourceTempoBpm'> | null | undefined,
  storedById: Record<string, number> | null | undefined,
  fallbackBpm: unknown
) {
  const fallback = clampMelodyPlaybackBpm(fallbackBpm);
  if (!melody) return fallback;

  const storedValue =
    storedById && Object.prototype.hasOwnProperty.call(storedById, melody.id)
      ? storedById[melody.id]
      : undefined;
  if (typeof storedValue === 'number' && Number.isFinite(storedValue)) {
    return clampMelodyPlaybackBpm(storedValue);
  }

  if (typeof melody.sourceTempoBpm === 'number' && Number.isFinite(melody.sourceTempoBpm)) {
    return clampMelodyPlaybackBpm(melody.sourceTempoBpm);
  }

  return fallback;
}

export function storeMelodyPlaybackTempoBpm(
  storedById: Record<string, number> | null | undefined,
  melody: Pick<MelodyDefinition, 'id' | 'sourceTempoBpm'> | null | undefined,
  bpm: unknown
) {
  const normalized = clampMelodyPlaybackBpm(bpm);
  const next = { ...(storedById ?? {}) };

  if (!melody) {
    return { bpm: normalized, byId: next };
  }

  const sourceTempo =
    typeof melody.sourceTempoBpm === 'number' && Number.isFinite(melody.sourceTempoBpm)
      ? clampMelodyPlaybackBpm(melody.sourceTempoBpm)
      : null;

  if (sourceTempo !== null && sourceTempo === normalized) {
    delete next[melody.id];
  } else {
    next[melody.id] = normalized;
  }

  return { bpm: normalized, byId: next };
}
