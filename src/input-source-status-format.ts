import type { InputSourceKind } from './midi-runtime';

export interface InputStatusText {
  shortText: string;
  fullText: string;
}

export function compactInputDeviceLabel(label: string, fallback: string, maxLength = 28) {
  const normalized = label.trim();
  if (!normalized) return fallback;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 1))}...`;
}

export function buildInputStatusText(
  inputSource: InputSourceKind,
  deviceLabel: string,
  fallback = 'Default'
): InputStatusText {
  const prefix = inputSource === 'midi' ? 'MIDI' : 'Mic';
  const fullLabel = deviceLabel.trim() || fallback;
  const shortLabel = compactInputDeviceLabel(fullLabel, fallback);

  return {
    shortText: `${prefix}: ${shortLabel}`,
    fullText: `${prefix}: ${fullLabel}`,
  };
}
