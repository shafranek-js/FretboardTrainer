import { describe, expect, it, vi } from 'vitest';

type SessionEditorBootstrapGraphClusterDeps = Parameters<
  typeof import('./graph-cluster').createSessionEditorBootstrapGraphCluster
>[0];

const {
  createSessionEditorGraphCluster,
  createSessionBootstrapGraphCluster,
} = vi.hoisted(() => ({
  createSessionEditorGraphCluster: vi.fn(),
  createSessionBootstrapGraphCluster: vi.fn(),
}));

vi.mock('../session-editor', () => ({
  createSessionEditorGraphCluster,
}));
vi.mock('../session-bootstrap', () => ({
  createSessionBootstrapGraphCluster,
}));

describe('session-editor-bootstrap-graph-cluster', () => {
  it('injects editor graph controllers into bootstrap graph wiring', async () => {
    createSessionEditorGraphCluster.mockReturnValue({
      studyMelodyMicTuningController: { id: 'tuning' },
      melodyTimelineEditingController: { id: 'timelineEditing' },
      melodyEditingControlsController: { id: 'editing' },
      melodyPlaybackControlsController: { id: 'playback' },
      melodyLibraryControlsController: { id: 'library' },
    });
    createSessionBootstrapGraphCluster.mockReturnValue({
      sessionBootstrapController: { id: 'bootstrap' },
      registerSessionControls: vi.fn(),
    });

    const { createSessionEditorBootstrapGraphCluster } = await import('./graph-cluster');

    const result = createSessionEditorBootstrapGraphCluster({
      editorGraph: {} as SessionEditorBootstrapGraphClusterDeps['editorGraph'],
      bootstrapGraph: {
        bootstrap: {} as SessionEditorBootstrapGraphClusterDeps['bootstrapGraph']['bootstrap'],
        controllers: {
          melodyImportControlsController: { id: 'import' },
          workflowLayoutControlsController: { id: 'workflowLayout' },
          practicePresetControlsController: { id: 'practicePreset' },
          practiceSetupControlsController: { id: 'practiceSetup' },
          instrumentDisplayControlsController: { id: 'instrumentDisplay' },
          melodySetupControlsController: { id: 'melodySetup' },
          melodyPracticeControlsController: { id: 'melodyPractice' },
          sessionTransportControlsController: { id: 'transport' },
          audioInputControlsController: { id: 'audioInput' },
          metronomeControlsController: { id: 'metronomeControls' },
          metronomeController: { id: 'metronome' },
        },
        registrations:
          {} as SessionEditorBootstrapGraphClusterDeps['bootstrapGraph']['registrations'],
      },
    });

    const bootstrapArgs = createSessionBootstrapGraphCluster.mock.calls[0][0];

    expect(bootstrapArgs.controllers.studyMelodyMicTuningController.id).toBe('tuning');
    expect(bootstrapArgs.controllers.melodyEditingControlsController.id).toBe('editing');
    expect(bootstrapArgs.controllers.melodyPlaybackControlsController.id).toBe('playback');
    expect(bootstrapArgs.controllers.melodyLibraryControlsController.id).toBe('library');
    expect(result.sessionBootstrapController.id).toBe('bootstrap');
    expect(result.melodyTimelineEditingController.id).toBe('timelineEditing');
  });
});


