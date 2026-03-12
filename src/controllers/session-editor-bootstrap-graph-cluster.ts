import { createSessionBootstrapGraphCluster } from './session-bootstrap-graph-cluster';
import { createSessionEditorGraphCluster } from './session-editor-graph-cluster';

interface SessionEditorBootstrapGraphClusterDeps {
  editorGraph: Parameters<typeof createSessionEditorGraphCluster>[0];
  bootstrapGraph: Omit<Parameters<typeof createSessionBootstrapGraphCluster>[0], 'controllers'> & {
    controllers: Omit<
      Parameters<typeof createSessionBootstrapGraphCluster>[0]['controllers'],
      | 'melodyEditingControlsController'
      | 'melodyPlaybackControlsController'
      | 'melodyLibraryControlsController'
      | 'studyMelodyMicTuningController'
    >;
  };
}

export function createSessionEditorBootstrapGraphCluster(
  deps: SessionEditorBootstrapGraphClusterDeps
) {
  const editorGraphCluster = createSessionEditorGraphCluster(deps.editorGraph);
  const bootstrapGraphCluster = createSessionBootstrapGraphCluster({
    ...deps.bootstrapGraph,
    controllers: {
      ...deps.bootstrapGraph.controllers,
      melodyEditingControlsController: editorGraphCluster.melodyEditingControlsController,
      melodyPlaybackControlsController: editorGraphCluster.melodyPlaybackControlsController,
      melodyLibraryControlsController: editorGraphCluster.melodyLibraryControlsController,
      studyMelodyMicTuningController: editorGraphCluster.studyMelodyMicTuningController,
    },
  });

  return {
    ...editorGraphCluster,
    ...bootstrapGraphCluster,
  };
}
