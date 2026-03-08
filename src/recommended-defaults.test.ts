import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECOMMENDED_INPUT_PRESET,
  DEFAULT_RECOMMENDED_TIMING_PRESET,
  DEFAULT_RECOMMENDED_WORKFLOW,
  getDirectInputRecommendationText,
  isRecommendedInputPreset,
  isRecommendedTimingPreset,
  shouldShowRecommendedPresetBadge,
  shouldShowRecommendedWorkflowBadge,
} from './recommended-defaults';

describe('recommended-defaults', () => {
  it('keeps the product defaults explicit', () => {
    expect(DEFAULT_RECOMMENDED_WORKFLOW).toBe('learn-notes');
    expect(DEFAULT_RECOMMENDED_INPUT_PRESET).toBe('normal_room');
    expect(DEFAULT_RECOMMENDED_TIMING_PRESET).toBe('balanced');
  });

  it('highlights only the recommended default presets', () => {
    expect(isRecommendedInputPreset('normal_room')).toBe(true);
    expect(isRecommendedInputPreset('custom')).toBe(false);
    expect(isRecommendedTimingPreset('balanced')).toBe(true);
    expect(isRecommendedTimingPreset('performance')).toBe(false);
  });

  it('shows direct-input guidance only for practice and perform workflows', () => {
    expect(getDirectInputRecommendationText('learn-notes')).toBeNull();
    expect(getDirectInputRecommendationText('study-melody')).toBeNull();
    expect(getDirectInputRecommendationText('practice')).toContain('Practice and Perform');
    expect(getDirectInputRecommendationText('library')).toBeNull();
    expect(getDirectInputRecommendationText('perform')).toBe(
      'Recommended for Practice and Perform when you use headphones or a direct interface.'
    );
  });

  it('shows the Learn Notes recommendation only before onboarding is completed', () => {
    expect(shouldShowRecommendedWorkflowBadge(false)).toBe(true);
    expect(shouldShowRecommendedWorkflowBadge(true)).toBe(false);
  });

  it('shows preset recommendation badges only before onboarding is completed', () => {
    expect(shouldShowRecommendedPresetBadge(false, true)).toBe(true);
    expect(shouldShowRecommendedPresetBadge(true, true)).toBe(false);
    expect(shouldShowRecommendedPresetBadge(false, false)).toBe(false);
  });
});
