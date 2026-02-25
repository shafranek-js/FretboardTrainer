import { describe, expect, it } from 'vitest';
import {
  resolveMicPolyphonicDetectorProviderFromUrlSearch,
  shouldAttemptOptionalMicPolyphonicProviderRegistration,
} from './mic-polyphonic-detector-flags';

describe('mic-polyphonic-detector-flags', () => {
  it('parses provider override from supported query params', () => {
    expect(resolveMicPolyphonicDetectorProviderFromUrlSearch('?micPolyProvider=essentia')).toBe(
      'essentia_experimental'
    );
    expect(
      resolveMicPolyphonicDetectorProviderFromUrlSearch('?polyphonicMicProvider=essentia-experimental')
    ).toBe('essentia_experimental');
    expect(resolveMicPolyphonicDetectorProviderFromUrlSearch('?mic_poly_provider=spectrum')).toBe(
      'spectrum'
    );
  });

  it('returns null when no override is present', () => {
    expect(resolveMicPolyphonicDetectorProviderFromUrlSearch('')).toBeNull();
    expect(resolveMicPolyphonicDetectorProviderFromUrlSearch('?foo=bar')).toBeNull();
  });

  it('attempts optional registration only for experimental providers', () => {
    expect(shouldAttemptOptionalMicPolyphonicProviderRegistration('spectrum')).toBe(false);
    expect(shouldAttemptOptionalMicPolyphonicProviderRegistration('essentia_experimental')).toBe(true);
    expect(shouldAttemptOptionalMicPolyphonicProviderRegistration(null)).toBe(false);
  });
});

