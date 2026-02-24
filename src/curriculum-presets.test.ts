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
      'accidentals_position_1_5',
      'adaptive_full_fretboard',
      'scale_foundations',
      'chord_foundations',
      'arpeggio_foundations',
      'progression_foundations',
      'rhythm_foundations',
      'timed_challenge_intro',
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

  it('builds advanced curriculum steps with broader mode coverage', () => {
    const stringOrder = ['E', 'A', 'D', 'G', 'B', 'e'];

    const accidentals = buildCurriculumPresetPlan('accidentals_position_1_5', stringOrder);
    const adaptiveFull = buildCurriculumPresetPlan('adaptive_full_fretboard', stringOrder);
    const scales = buildCurriculumPresetPlan('scale_foundations', stringOrder);
    const chords = buildCurriculumPresetPlan('chord_foundations', stringOrder);
    const arpeggios = buildCurriculumPresetPlan('arpeggio_foundations', stringOrder);
    const progressions = buildCurriculumPresetPlan('progression_foundations', stringOrder);
    const rhythm = buildCurriculumPresetPlan('rhythm_foundations', stringOrder);
    const timed = buildCurriculumPresetPlan('timed_challenge_intro', stringOrder);

    expect(accidentals).toMatchObject({ trainingMode: 'random', difficulty: 'all', endFret: 5 });
    expect(accidentals?.sessionGoal).toBe('correct_10');
    expect(adaptiveFull).toMatchObject({
      trainingMode: 'adaptive',
      difficulty: 'all',
      endFret: 12,
      sessionGoal: 'correct_20',
    });
    expect(scales).toMatchObject({
      trainingMode: 'scales',
      endFret: 7,
      sessionGoal: 'correct_10',
      scaleValue: 'C Major',
    });
    expect(chords).toMatchObject({ trainingMode: 'chords', endFret: 5, sessionGoal: 'correct_10' });
    expect(chords?.chordValueCandidates?.length).toBeGreaterThan(0);
    expect(arpeggios).toMatchObject({
      trainingMode: 'arpeggios',
      endFret: 7,
      sessionGoal: 'correct_10',
      arpeggioPatternValue: 'ascending',
    });
    expect(progressions).toMatchObject({
      trainingMode: 'progressions',
      endFret: 5,
      sessionGoal: 'correct_10',
    });
    expect(progressions?.progressionValueCandidates?.length).toBeGreaterThan(0);
    expect(rhythm).toMatchObject({
      trainingMode: 'rhythm',
      endFret: 12,
      sessionGoal: 'correct_20',
      metronomeEnabled: true,
      metronomeBpm: 70,
      rhythmTimingWindow: 'normal',
    });
    expect(timed).toMatchObject({ trainingMode: 'timed', endFret: 12, sessionGoal: 'none' });

    expect(timed?.enabledStrings).toEqual(stringOrder);
  });

  it('returns null for custom preset', () => {
    expect(buildCurriculumPresetPlan('custom', ['E', 'A'])).toBeNull();
  });

  it('returns null for unknown keys at runtime', () => {
    expect(buildCurriculumPresetPlan('unknown' as CurriculumPresetKey, ['E', 'A'])).toBeNull();
  });
});

