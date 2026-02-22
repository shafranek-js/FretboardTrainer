import { describe, expect, it } from 'vitest';
import { buildInputStatusText, compactInputDeviceLabel } from './input-source-status-format';

describe('input-source-status-format', () => {
  it('compacts long device labels and preserves short labels', () => {
    expect(compactInputDeviceLabel('USB Mic', 'Default')).toBe('USB Mic');
    expect(compactInputDeviceLabel('   ', 'Default')).toBe('Default');
    expect(compactInputDeviceLabel('A'.repeat(40), 'Default', 10)).toBe('AAAAAAAAA...');
  });

  it('builds microphone status text with fallback and full title text', () => {
    expect(buildInputStatusText('microphone', '')).toEqual({
      shortText: 'Mic: Default',
      fullText: 'Mic: Default',
    });

    expect(buildInputStatusText('microphone', 'Built-in Audio Analog Stereo')).toEqual({
      shortText: 'Mic: Built-in Audio Analog Stereo',
      fullText: 'Mic: Built-in Audio Analog Stereo',
    });
  });

  it('builds MIDI status text with compact short label and full tooltip text', () => {
    const longLabel = 'Very Long MIDI Keyboard Controller Device Name 88 Keys';
    const result = buildInputStatusText('midi', longLabel);

    expect(result.shortText).toMatch(/^MIDI: /);
    expect(result.shortText.length).toBeLessThan(result.fullText.length);
    expect(result.fullText).toBe(`MIDI: ${longLabel}`);
  });
});
