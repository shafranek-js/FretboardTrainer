import {
  normalizeMicPolyphonicDetectorProvider,
  type MicPolyphonicDetectorProvider,
} from './mic-polyphonic-detector';

const QUERY_PARAM_KEYS = ['micPolyProvider', 'mic_poly_provider', 'polyphonicMicProvider'] as const;

export function resolveMicPolyphonicDetectorProviderFromUrlSearch(
  search: string
): MicPolyphonicDetectorProvider | null {
  const normalizedSearch = typeof search === 'string' ? search : '';
  if (!normalizedSearch) return null;

  const params = new URLSearchParams(normalizedSearch.startsWith('?') ? normalizedSearch : `?${normalizedSearch}`);
  for (const key of QUERY_PARAM_KEYS) {
    const raw = params.get(key);
    if (!raw) continue;
    return normalizeMicPolyphonicDetectorProvider(raw);
  }
  return null;
}

export function shouldAttemptOptionalMicPolyphonicProviderRegistration(
  provider: MicPolyphonicDetectorProvider | null | undefined
) {
  return provider === 'essentia_experimental';
}

