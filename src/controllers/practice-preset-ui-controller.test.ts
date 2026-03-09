import { describe, expect, it } from 'vitest';
import { createPracticePresetUiController } from './practice-preset-ui-controller';

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

function createElement() {
  return {
    value: '',
    textContent: '',
    classList: new FakeClassList(),
  };
}

function createDeps(overrides?: Partial<{ onboarding: boolean; uiWorkflow: 'learn-notes' | 'practice'; custom: boolean }>) {
  const dom = {
    practiceInputPreset: createElement(),
    practiceInputPresetInfo: createElement(),
    practiceInputPresetRecommendedBadge: createElement(),
    practiceTimingPreset: createElement(),
    practiceTimingPresetInfo: createElement(),
    practiceTimingPresetRecommendedBadge: createElement(),
    workflowLearnNotesRecommendedBadge: createElement(),
    micDirectInputRecommendedBadge: createElement(),
    micDirectInputRecommendationText: createElement(),
  };

  return {
    dom,
    state: {
      micSensitivityPreset: overrides?.custom ? 'auto' : 'normal',
      micNoteAttackFilterPreset: overrides?.custom ? 'strong' : 'balanced',
      micNoteHoldFilterPreset: overrides?.custom ? '40ms' : '40ms',
      isDirectInputMode: true,
      performanceMicTolerancePreset: overrides?.custom ? 'forgiving' : 'strict',
      performanceTimingLeniencyPreset: overrides?.custom ? 'normal' : 'strict',
      uiWorkflow: overrides?.uiWorkflow ?? 'learn-notes',
    },
    hasCompletedOnboarding: () => overrides?.onboarding ?? false,
  };
}

describe('practice-preset-ui-controller', () => {
  it('syncs preset labels and recommended badges for matching settings', () => {
    const deps = createDeps();
    const controller = createPracticePresetUiController(deps as never);

    controller.syncPracticePresetUi();

    expect(deps.dom.practiceInputPreset.value).toBe('headphones_direct');
    expect(deps.dom.practiceTimingPreset.value).toBe('performance');
    expect(deps.dom.practiceInputPresetInfo.textContent.length).toBeGreaterThan(0);
    expect(deps.dom.practiceTimingPresetInfo.textContent.length).toBeGreaterThan(0);
    expect(deps.dom.practiceInputPresetRecommendedBadge.classList.contains('hidden')).toBe(true);
    expect(deps.dom.practiceTimingPresetRecommendedBadge.classList.contains('hidden')).toBe(true);
  });

  it('hides onboarding badges after onboarding but keeps practice workflow recommendation text', () => {
    const deps = createDeps({ onboarding: true, uiWorkflow: 'practice' });
    const controller = createPracticePresetUiController(deps as never);

    controller.syncPracticePresetUi();

    expect(deps.dom.practiceInputPresetRecommendedBadge.classList.contains('hidden')).toBe(true);
    expect(deps.dom.practiceTimingPresetRecommendedBadge.classList.contains('hidden')).toBe(true);
    expect(deps.dom.workflowLearnNotesRecommendedBadge.classList.contains('hidden')).toBe(true);
    expect(deps.dom.micDirectInputRecommendedBadge.classList.contains('hidden')).toBe(false);
    expect(deps.dom.micDirectInputRecommendationText.textContent.length).toBeGreaterThan(0);
  });

  it('falls back to custom copy when settings no longer match presets', () => {
    const deps = createDeps({ onboarding: true, custom: true, uiWorkflow: 'practice' });
    const controller = createPracticePresetUiController(deps as never);

    controller.syncPracticePresetUi();

    expect(deps.dom.practiceInputPreset.value).toBe('custom');
    expect(deps.dom.practiceTimingPreset.value).toBe('custom');
    expect(deps.dom.micDirectInputRecommendedBadge.classList.contains('hidden')).toBe(false);
    expect(deps.dom.micDirectInputRecommendationText.textContent.length).toBeGreaterThan(0);
  });
});
