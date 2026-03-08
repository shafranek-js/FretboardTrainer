import { describe, expect, it } from 'vitest';
import { normalizeUiMode } from './ui-mode';

describe('ui-mode', () => {
  it('normalizes to simple by default', () => {
    expect(normalizeUiMode(undefined)).toBe('simple');
    expect(normalizeUiMode('anything-else')).toBe('simple');
  });

  it('accepts advanced mode', () => {
    expect(normalizeUiMode('advanced')).toBe('advanced');
  });
});
