import { describe, expect, it } from 'vitest';
import { resolveSessionToolsVisibility } from './session-tools-visibility';

describe('session-tools-visibility', () => {
  it('keeps note-learning controls visible in learn-notes workflow', () => {
    const view = resolveSessionToolsVisibility('random', 'learn-notes');

    expect(view.showPlanSection).toBe(true);
    expect(view.showDisplaySection).toBe(true);
    expect(view.showActiveStringsSection).toBe(true);
    expect(view.showShowAllNotesRow).toBe(true);
    expect(view.showShowStringTogglesRow).toBe(true);
    expect(view.showAutoPlayPromptSoundRow).toBe(true);
    expect(view.showPitchMatchRow).toBe(false);
  });

  it('keeps string controls visible for string-scoped learn-notes modes', () => {
    const modes = ['adaptive', 'free', 'intervals', 'scales', 'timed'];

    modes.forEach((mode) => {
      const view = resolveSessionToolsVisibility(mode, 'learn-notes');
      expect(view.showActiveStringsSection).toBe(true);
      expect(view.showShowStringTogglesRow).toBe(true);
    });
  });

  it('hides string controls for chord-based learn-notes modes', () => {
    const modes = ['chords', 'arpeggios', 'progressions'];

    modes.forEach((mode) => {
      const view = resolveSessionToolsVisibility(mode, 'learn-notes');
      expect(view.showActiveStringsSection).toBe(false);
      expect(view.showShowStringTogglesRow).toBe(false);
    });
  });

  it('hides note-planning controls in study-melody workflow', () => {
    const view = resolveSessionToolsVisibility('melody', 'study-melody');

    expect(view.showPlanSection).toBe(false);
    expect(view.showActiveStringsSection).toBe(false);
    expect(view.showShowAllNotesRow).toBe(false);
    expect(view.showShowStringTogglesRow).toBe(false);
    expect(view.showAutoPlayPromptSoundRow).toBe(true);
    expect(view.showPitchMatchRow).toBe(false);
    expect(view.showMicLatencyRow).toBe(false);
  });

  it('keeps learning path hidden outside learn-notes workflows', () => {
    expect(resolveSessionToolsVisibility('practice', 'practice').showPlanSection).toBe(false);
    expect(resolveSessionToolsVisibility('performance', 'perform').showPlanSection).toBe(false);
    expect(resolveSessionToolsVisibility('melody', 'library').showPlanSection).toBe(false);
    expect(resolveSessionToolsVisibility('melody', 'editor').showPlanSection).toBe(false);
  });

  it('keeps performance grading controls out of the perform panel', () => {
    const view = resolveSessionToolsVisibility('performance', 'perform');

    expect(view.showPlanSection).toBe(false);
    expect(view.showActiveStringsSection).toBe(false);
    expect(view.showAutoPlayPromptSoundRow).toBe(true);
    expect(view.showRelaxPerformanceOctaveRow).toBe(false);
    expect(view.showPitchMatchRow).toBe(false);
    expect(view.showTimingWindowRow).toBe(false);
    expect(view.showMicLatencyRow).toBe(false);
  });

  it('keeps performance grading controls out of the practice panel', () => {
    const view = resolveSessionToolsVisibility('practice', 'practice');

    expect(view.showPlanSection).toBe(false);
    expect(view.showAutoPlayPromptSoundRow).toBe(true);
    expect(view.showRelaxPerformanceOctaveRow).toBe(false);
    expect(view.showPitchMatchRow).toBe(false);
    expect(view.showTimingWindowRow).toBe(false);
    expect(view.showMicLatencyRow).toBe(false);
  });

  it('hides prompt sound control in library and editor workflows', () => {
    expect(resolveSessionToolsVisibility('melody', 'library').showAutoPlayPromptSoundRow).toBe(false);
    expect(resolveSessionToolsVisibility('melody', 'editor').showAutoPlayPromptSoundRow).toBe(false);
  });

  it('keeps free play minimal', () => {
    const view = resolveSessionToolsVisibility('free', 'learn-notes');

    expect(view.showPlanSection).toBe(false);
    expect(view.showShowAllNotesRow).toBe(false);
    expect(view.showShowStringTogglesRow).toBe(true);
    expect(view.dimPrimaryControls).toBe(true);
  });
});
