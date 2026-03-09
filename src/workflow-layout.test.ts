import { describe, expect, it } from 'vitest';
import { resolveWorkflowLayout } from './workflow-layout';

describe('workflow-layout', () => {
  it('keeps learn-notes focused on practice setup and session tools', () => {
    const layout = resolveWorkflowLayout({
      workflow: 'learn-notes',
      trainingMode: 'random',
    });

    expect(layout.showPracticeSetup).toBe(true);
    expect(layout.showMelodySetup).toBe(false);
    expect(layout.showPlaybackControls).toBe(false);
    expect(layout.showDisplayControls).toBe(true);
    expect(layout.showSessionTools).toBe(true);
    expect(layout.sessionTools.showPlanSection).toBe(true);
    expect(layout.sessionTools.showShowStringTogglesRow).toBe(true);
    expect(layout.showAnyZoomControl).toBe(false);
  });

  it('tracks melody workflow layout and dependent zoom controls together', () => {
    const layout = resolveWorkflowLayout({
      workflow: 'study-melody',
      trainingMode: 'melody',
      showTabTimeline: false,
      showScrollingTab: true,
    });

    expect(layout.showMelodySetup).toBe(true);
    expect(layout.showPlaybackControls).toBe(true);
    expect(layout.showDisplayControls).toBe(true);
    expect(layout.showPlaybackQuickControls).toBe(true);
    expect(layout.showMelodyNoteHintDisplayControl).toBe(true);
    expect(layout.showTimelineZoomControl).toBe(false);
    expect(layout.showScrollingZoomControl).toBe(true);
    expect(layout.showAnyZoomControl).toBe(true);
  });

  it('keeps editor workflow focused on authoring affordances', () => {
    const layout = resolveWorkflowLayout({
      workflow: 'editor',
      trainingMode: 'melody',
    });

    expect(layout.showMelodySetup).toBe(true);
    expect(layout.showPlaybackControls).toBe(true);
    expect(layout.showMelodyActionControls).toBe(true);
    expect(layout.showEditingToolsControls).toBe(true);
    expect(layout.showPlaybackQuickControls).toBe(false);
    expect(layout.showPlaybackPromptSoundControl).toBe(false);
    expect(layout.showSessionTools).toBe(false);
  });

  it('hides session tools for rhythm-driven perform runs', () => {
    const layout = resolveWorkflowLayout({
      workflow: 'perform',
      trainingMode: 'rhythm',
    });

    expect(layout.showSessionTools).toBe(false);
    expect(layout.showSessionToolsContent).toBe(false);
    expect(layout.sessionTools.showAutoPlayPromptSoundRow).toBe(true);
  });
});