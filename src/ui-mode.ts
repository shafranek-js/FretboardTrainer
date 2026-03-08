export type UiMode = 'simple' | 'advanced';

export function normalizeUiMode(value: unknown): UiMode {
  return value === 'advanced' ? 'advanced' : 'simple';
}
