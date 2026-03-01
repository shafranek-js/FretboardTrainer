import { describe, expect, it, vi } from 'vitest';
import { createMetronomeController } from './metronome-controller';

class FakeClassList {
  private values = new Set<string>();

  add(...tokens: string[]) {
    tokens.forEach((token) => this.values.add(token));
  }

  remove(...tokens: string[]) {
    tokens.forEach((token) => this.values.delete(token));
  }

  toggle(token: string, force?: boolean) {
    if (force === true) {
      this.values.add(token);
      return true;
    }
    if (force === false) {
      this.values.delete(token);
      return false;
    }
    if (this.values.has(token)) {
      this.values.delete(token);
      return false;
    }
    this.values.add(token);
    return true;
  }

  contains(token: string) {
    return this.values.has(token);
  }
}

function createDeps(overrides?: { trainingMode?: string; enabled?: boolean }) {
  const beatHandlers: Array<(payload: { beatInBar: number; accented: boolean }) => void> = [];
  const deps = {
    dom: {
      trainingMode: { value: overrides?.trainingMode ?? 'rhythm' } as HTMLSelectElement,
      metronomeEnabled: { checked: overrides?.enabled ?? false } as HTMLInputElement,
      metronomeBpm: { value: '91' } as HTMLInputElement,
      metronomeBpmValue: { textContent: '' } as HTMLElement,
      metronomeBeatLabel: { textContent: '' } as HTMLElement,
      metronomePulse: { classList: new FakeClassList() } as unknown as HTMLElement,
    },
    clampMetronomeBpm: vi.fn((value: number) => Math.max(40, Math.min(220, value))),
    startMetronome: vi.fn(async () => {}),
    stopMetronome: vi.fn(),
    setMetronomeTempo: vi.fn(async () => {}),
    subscribeMetronomeBeat: vi.fn((handler) => {
      beatHandlers.push(handler);
    }),
    saveSettings: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
    showNonBlockingError: vi.fn(),
  };
  return { deps, beatHandlers };
}

describe('metronome-controller', () => {
  it('ensures rhythm mode starts the metronome when disabled', async () => {
    const { deps } = createDeps({ trainingMode: 'rhythm', enabled: false });
    const controller = createMetronomeController(deps);

    const result = await controller.ensureRhythmModeMetronome();

    expect(result).toBe(true);
    expect(deps.dom.metronomeEnabled.checked).toBe(true);
    expect(deps.startMetronome).toHaveBeenCalledWith(91);
    expect(deps.dom.metronomeBpmValue.textContent).toBe('91');
  });

  it('stops and resets indicator when disabling metronome', async () => {
    const { deps } = createDeps({ enabled: false });
    const controller = createMetronomeController(deps);
    deps.dom.metronomeEnabled.checked = false;

    await controller.handleEnabledChange();

    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.stopMetronome).toHaveBeenCalledTimes(1);
    expect(deps.dom.metronomeBeatLabel.textContent).toBe('-');
  });

  it('updates tempo only when metronome is enabled', async () => {
    const { deps } = createDeps({ enabled: true });
    const controller = createMetronomeController(deps);

    await controller.handleBpmInput();

    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.setMetronomeTempo).toHaveBeenCalledWith(91);
  });
});
