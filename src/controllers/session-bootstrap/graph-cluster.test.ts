import { describe, expect, it } from 'vitest';
import { createSessionBootstrapGraphCluster } from './graph-cluster';

describe('session-bootstrap-graph-cluster', () => {
  it('creates bootstrap controller and register entry point from controller graph', () => {
    const cluster = createSessionBootstrapGraphCluster({
      bootstrap: {} as never,
      controllers: {
        melodyImportControlsController: { register() {} },
        workflowLayoutControlsController: { register() {} },
        melodyEditingControlsController: { register() {} },
        melodyPlaybackControlsController: { register() {} },
        melodyLibraryControlsController: { register() {} },
        practicePresetControlsController: { register() {} },
        practiceSetupControlsController: { register() {} },
        instrumentDisplayControlsController: { register() {} },
        melodySetupControlsController: { register() {} },
        melodyPracticeControlsController: { register() {} },
        sessionTransportControlsController: { register() {} },
        audioInputControlsController: { register() {} },
        studyMelodyMicTuningController: { register() {} },
        metronomeControlsController: { register() {} },
        metronomeController: { registerBeatIndicator() {} },
      },
      registrations: {
        registerModalControls() {},
        registerConfirmControls() {},
        registerProfileControls() {},
      },
    });

    expect(cluster.sessionBootstrapController).toBeTruthy();
    expect(typeof cluster.registerSessionControls).toBe('function');
  });
});
