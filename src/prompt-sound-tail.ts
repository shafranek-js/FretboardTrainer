export const DEFAULT_PROMPT_SOUND_TAIL_MS = 450;
export const MIN_PROMPT_SOUND_TAIL_MS = 100;
export const MAX_PROMPT_SOUND_TAIL_MS = 2000;
export const PROMPT_SOUND_TAIL_STEP_MS = 25;

export function normalizePromptSoundTailMs(value: unknown) {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_PROMPT_SOUND_TAIL_MS;
  }

  const rounded = Math.round(numericValue / PROMPT_SOUND_TAIL_STEP_MS) * PROMPT_SOUND_TAIL_STEP_MS;
  return Math.max(MIN_PROMPT_SOUND_TAIL_MS, Math.min(MAX_PROMPT_SOUND_TAIL_MS, rounded));
}

export function formatPromptSoundTailMs(value: number) {
  return `${normalizePromptSoundTailMs(value)} ms`;
}

export function getPromptSoundTailDurationSec(value: number) {
  return normalizePromptSoundTailMs(value) / 1000;
}
