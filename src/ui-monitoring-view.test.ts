import { describe, expect, it, vi } from 'vitest';

function createClassListState() {
  const classes = new Set<string>();
  return {
    add: vi.fn((...values: string[]) => {
      values.forEach((value) => classes.add(value));
    }),
    remove: vi.fn((...values: string[]) => {
      values.forEach((value) => classes.delete(value));
    }),
    toggle: vi.fn((value: string, force?: boolean) => {
      if (force === undefined) {
        if (classes.has(value)) {
          classes.delete(value);
          return false;
        }
        classes.add(value);
        return true;
      }
      if (force) {
        classes.add(value);
        return true;
      }
      classes.delete(value);
      return false;
    }),
    contains: (value: string) => classes.has(value),
  };
}

function createElementStub() {
  return {
    classList: createClassListState(),
    style: { height: '', transform: '' },
    textContent: '',
  };
}

const harness = vi.hoisted(() => ({
  dom: {
    volumeBar: createElementStub(),
    tunerDisplay: createElementStub(),
    tunerNeedle: createElementStub(),
    tunerCents: createElementStub(),
  },
}));

vi.mock('./dom', () => ({
  dom: harness.dom,
}));

import {
  renderTunerReading,
  renderTunerVisibility,
  renderVolumeLevel,
} from './ui-monitoring-view';

describe('ui-monitoring-view', () => {
  it('renders clamped volume bar height', () => {
    renderVolumeLevel(0.3);
    expect(harness.dom.volumeBar.style.height).toBe('100%');

    renderVolumeLevel(0.05);
    expect(harness.dom.volumeBar.style.height).toBe('25%');
  });

  it('toggles tuner visibility classes', () => {
    renderTunerVisibility(true);
    expect(harness.dom.tunerDisplay.classList.contains('visible')).toBe(true);
    expect(harness.dom.tunerDisplay.classList.contains('invisible')).toBe(false);
    expect(harness.dom.tunerDisplay.classList.contains('opacity-0')).toBe(false);

    renderTunerVisibility(false);
    expect(harness.dom.tunerDisplay.classList.contains('visible')).toBe(false);
    expect(harness.dom.tunerDisplay.classList.contains('invisible')).toBe(true);
    expect(harness.dom.tunerDisplay.classList.contains('opacity-0')).toBe(true);
  });

  it('renders tuner needle color, transform and cents text', () => {
    renderTunerReading({ frequency: 430, targetFrequency: 440 });

    expect(harness.dom.tunerNeedle.classList.contains('bg-cyan-500')).toBe(true);
    expect(harness.dom.tunerNeedle.style.transform).toContain('translateX(-50%) translateY(');
    expect(harness.dom.tunerCents.textContent).toContain('cents');

    renderTunerReading({ frequency: null, targetFrequency: 440 });
    expect(harness.dom.tunerCents.textContent).toBe('--');
  });
});
