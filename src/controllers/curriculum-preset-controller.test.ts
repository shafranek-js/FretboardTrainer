import { describe, expect, it, vi } from 'vitest';
import { createCurriculumPresetController } from './curriculum-preset-controller';

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

function createSelect(value: string, options: string[] = [value]) {
  return {
    value,
    options: options.map((option) => ({ value: option })),
  } as unknown as HTMLSelectElement;
}

function createDeps() {
  const deps = {
    dom: {
      curriculumPreset: createSelect('custom', ['custom', 'beginner_essentials']),
      curriculumPresetInfo: { textContent: '', classList: new FakeClassList() } as unknown as HTMLElement,
      sessionGoal: createSelect('none', ['none', 'correct_10']),
      scaleSelector: createSelect('C Major', ['C Major']),
      chordSelector: createSelect('C Major', ['C Major', 'G Major']),
      progressionSelector: createSelect('I-IV-V', ['I-IV-V']),
      arpeggioPatternSelector: createSelect('ascending', ['ascending']),
      rhythmTimingWindow: createSelect('normal', ['normal']),
      metronomeEnabled: { checked: false } as HTMLInputElement,
      metronomeBpm: { value: '90' } as HTMLInputElement,
      showAllNotes: { checked: false } as HTMLInputElement,
      trainingMode: createSelect('random', ['random', 'adaptive']),
      difficulty: createSelect('natural', ['natural', 'all']),
      startFret: { value: '0' } as HTMLInputElement,
      endFret: { value: '12' } as HTMLInputElement,
    },
    state: {
      currentInstrument: { STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] },
      showingAllNotes: false,
    },
    getClampedMetronomeBpmFromInput: vi.fn(() => 72),
    applyEnabledStrings: vi.fn(),
    handleModeChange: vi.fn(),
    redrawFretboard: vi.fn(),
    saveSettings: vi.fn(),
    setResultMessage: vi.fn(),
    isListening: vi.fn(() => false),
    stopListening: vi.fn(),
  };
  return deps;
}

describe('curriculum-preset-controller', () => {
  it('updates selection info from preset definition', () => {
    const deps = createDeps();
    const controller = createCurriculumPresetController(deps);

    controller.setSelection('beginner_essentials');

    expect(deps.dom.curriculumPreset.value).toBe('beginner_essentials');
    expect(deps.dom.curriculumPresetInfo.textContent.length).toBeGreaterThan(0);
    expect(deps.dom.curriculumPresetInfo.classList.contains('hidden')).toBe(false);
  });

  it('applies a preset and triggers side effects', () => {
    const deps = createDeps();
    const controller = createCurriculumPresetController(deps);

    controller.applyPreset('beginner_essentials');

    expect(deps.dom.trainingMode.value).toBe('random');
    expect(deps.dom.difficulty.value).toBe('natural');
    expect(deps.applyEnabledStrings).toHaveBeenCalled();
    expect(deps.handleModeChange).toHaveBeenCalledTimes(1);
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith(expect.stringContaining('Applied Step 1'));
  });
});
