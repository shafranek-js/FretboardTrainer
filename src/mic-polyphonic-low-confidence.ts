export interface MicPolyphonicLowConfidenceLike {
  fallbackFrom?: string | null;
  warnings?: string[];
}

export function isLowConfidenceMicPolyphonicResult(result: MicPolyphonicLowConfidenceLike) {
  return Boolean(result.fallbackFrom) || (result.warnings?.length ?? 0) > 0;
}

export function buildLowConfidenceMicPolyphonicMessage() {
  return 'Low mic confidence. Reduce room noise, mute ringing strings, or switch detector provider.';
}
