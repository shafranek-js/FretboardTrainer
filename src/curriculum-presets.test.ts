import { describe, expect, it } from 'vitest';
import {
  buildCurriculumPresetPlan,
  getCurriculumPresetDefinitions,
  type CurriculumPresetKey,
} from './curriculum-presets';

describe('curriculum-presets', () => {
  it('exposes preset definitions including custom', () => {
    const keys = getCurriculumPresetDefinitions().map((preset) => preset.key);
    expect(keys).toEqual([
      'custom',
      'beginner_essentials',
      'position_1_5',
      'interval_foundations',
    ]);
  });

  it('builds beginner essentials plan with reduced string set', () => {
    const plan = buildCurriculumPresetPlan('beginner_essentials', ['E', 'A', 'D', 'G', 'B', 'e']);
    expect(plan).not.toBeNull();
    expect(plan?.trainingMode).toBe('random');
    expect(plan?.difficulty).toBe('natural');
    expect(plan?.startFret).toBe(0);
    expect(plan?.endFret).toBe(5);
    expect(plan?.enabledStrings).toEqual(['E', 'A']);
  });

  it('builds position and intervals presets across all strings', () => {
    const stringOrder = ['G', 'C', 'E', 'A'];
    const position = buildCurriculumPresetPlan('position_1_5', stringOrder);
    const intervals = buildCurriculumPresetPlan('interval_foundations', stringOrder);

    expect(position?.trainingMode).toBe('adaptive');
    expect(position?.enabledStrings).toEqual(stringOrder);
    expect(position?.startFret).toBe(1);
    expect(position?.endFret).toBe(5);

    expect(intervals?.trainingMode).toBe('intervals');
    expect(intervals?.enabledStrings).toEqual(stringOrder);
    expect(intervals?.difficulty).toBe('natural');
  });

  it('returns null for custom preset', () => {
    expect(buildCurriculumPresetPlan('custom', ['E', 'A'])).toBeNull();
  });

  it('returns null for unknown keys at runtime', () => {
    expect(buildCurriculumPresetPlan('unknown' as CurriculumPresetKey, ['E', 'A'])).toBeNull();
  });
});

