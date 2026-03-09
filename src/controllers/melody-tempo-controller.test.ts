import { describe, expect, it, vi } from 'vitest';
import { createMelodyTempoController } from './melody-tempo-controller';

class FakeClassList {
  private values = new Set<string>();

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

function createDeps() {
  return {
    dom: {
      trainingMode: { value: 'study-melody' } as HTMLSelectElement,
      metronomeEnabled: { checked: true } as HTMLInputElement,
      metronomeBpm: { value: '90' } as HTMLInputElement,
      metronomeBpmValue: { textContent: '' } as HTMLElement,
      metronomeToggleBtn: {
        classList: new FakeClassList(),
        setAttribute: vi.fn(),
        title: '',
      } as unknown as HTMLButtonElement,
      melodyDemoBpm: { value: '92' } as HTMLInputElement,
      melodyTimelineZoom: { value: '150' } as HTMLInputElement,
      melodyTimelineZoomValue: { textContent: '' } as HTMLElement,
      scrollingTabZoom: { value: '140' } as HTMLInputElement,
      scrollingTabZoomValue: { textContent: '' } as HTMLElement,
    },
    state: {
      isListening: true,
      performanceRuntimeStartedAtMs: null,
      performancePrerollLeadInVisible: false,
      melodyPlaybackBpmById: {},
      melodyTimelineZoomPercent: 100,
      scrollingTabZoomPercent: 100,
    },
    getSelectedMelody: vi.fn(() => ({ id: 'melody-a', sourceTempoBpm: 110 })),
    syncMelodyDemoBpmDisplay: vi.fn(),
    syncMetronomeMeterFromSelectedMelody: vi.fn(),
    getClampedMetronomeBpmFromInput: vi.fn(() => 90),
    startMetronome: vi.fn(async () => {}),
    stopMetronome: vi.fn(),
    setMetronomeTempo: vi.fn(async () => {}),
    isMetronomeRunning: vi.fn(() => true),
    resetMetronomeVisualIndicator: vi.fn(),
    showNonBlockingError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
    isMelodyDemoPlaying: vi.fn(() => false),
    isMelodyWorkflowMode: vi.fn(() => true),
    isPerformanceStyleMode: vi.fn(() => false),
  };
}

describe('melody-tempo-controller', () => {
  it('hydrates and persists melody bpm through the shared tempo model', () => {
    const deps = createDeps();
    const controller = createMelodyTempoController(deps as never);

    controller.hydrateMelodyTempoForSelectedMelody();
    controller.persistSelectedMelodyTempoOverride();

    expect(deps.syncMelodyDemoBpmDisplay).toHaveBeenCalled();
    expect(deps.state.melodyPlaybackBpmById).toBeDefined();
    expect(deps.dom.metronomeBpmValue.textContent?.length).toBeGreaterThan(0);
  });

  it('syncs metronome runtime when the melody transport is active', async () => {
    const deps = createDeps();
    const controller = createMelodyTempoController(deps as never);

    await controller.syncMelodyMetronomeRuntime();

    expect(deps.syncMetronomeMeterFromSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.setMetronomeTempo).toHaveBeenCalledWith(90);
  });

  it('stops and resets the metronome when transport should not drive it', async () => {
    const deps = createDeps();
    deps.state.isListening = false;
    const controller = createMelodyTempoController(deps as never);

    await controller.syncMelodyMetronomeRuntime();

    expect(deps.stopMetronome).toHaveBeenCalledTimes(1);
    expect(deps.resetMetronomeVisualIndicator).toHaveBeenCalledTimes(1);
  });

  it('updates metronome toggle and zoom displays', () => {
    const deps = createDeps();
    const controller = createMelodyTempoController(deps as never);

    controller.renderMetronomeToggleButton();
    controller.syncMelodyTimelineZoomDisplay();
    controller.syncScrollingTabZoomDisplay();

    expect((deps.dom.metronomeToggleBtn as unknown as { title: string }).title).toContain('Metronome on');
    expect(deps.dom.melodyTimelineZoomValue.textContent).toContain('%');
    expect(deps.dom.scrollingTabZoomValue.textContent).toContain('%');
  });
});
