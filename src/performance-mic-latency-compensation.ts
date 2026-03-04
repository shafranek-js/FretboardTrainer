export function normalizePerformanceMicLatencyCompensationMs(value: unknown) {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(250, Math.round(numeric)));
}

export function resolveLatencyCompensatedPromptStartedAtMs(
  promptStartedAtMs: number | null | undefined,
  latencyCompensationMs: unknown
) {
  if (!Number.isFinite(promptStartedAtMs) || (promptStartedAtMs ?? 0) <= 0) {
    return promptStartedAtMs ?? null;
  }

  return (promptStartedAtMs ?? 0) - normalizePerformanceMicLatencyCompensationMs(latencyCompensationMs);
}
