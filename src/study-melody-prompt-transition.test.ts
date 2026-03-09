import { describe, expect, it } from 'vitest';
import { shouldResetStudyMelodyOnsetTrackingOnPromptChange } from './study-melody-prompt-transition';

describe('study-melody-prompt-transition', () => {
  it('returns false outside study melody', () => {
    expect(
      shouldResetStudyMelodyOnsetTrackingOnPromptChange(
        'practice',
        { targetNote: 'E', targetString: 'e' },
        { targetNote: 'E', targetString: 'e' }
      )
    ).toBe(false);
  });

  it('returns true for identical consecutive single-note prompts', () => {
    expect(
      shouldResetStudyMelodyOnsetTrackingOnPromptChange(
        'melody',
        { targetNote: 'E', targetString: 'e' },
        { targetNote: 'E', targetString: 'e' }
      )
    ).toBe(true);
  });

  it('returns true for identical consecutive positioned melody events', () => {
    const eventNotes = [
      { note: 'E', string: 'e', fret: 0 },
      { note: 'B', string: 'b', fret: 0 },
    ];
    expect(
      shouldResetStudyMelodyOnsetTrackingOnPromptChange(
        'melody',
        { targetNote: null, targetString: null, targetMelodyEventNotes: eventNotes },
        { targetNote: null, targetString: null, targetMelodyEventNotes: [...eventNotes] }
      )
    ).toBe(true);
  });

  it('returns false for different prompts', () => {
    expect(
      shouldResetStudyMelodyOnsetTrackingOnPromptChange(
        'melody',
        { targetNote: 'E', targetString: 'e' },
        { targetNote: 'F', targetString: 'e' }
      )
    ).toBe(false);
  });
});
