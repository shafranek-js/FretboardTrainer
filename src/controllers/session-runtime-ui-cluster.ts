import { createInteractionGuardsController } from './interaction-guards-controller';
import { createMelodyTimelineUiController } from './melody-timeline-ui-controller';
import { createSessionStartController } from './session-start-controller';

interface SessionRuntimeUiClusterDeps {
  melodyTimelineUi: Parameters<typeof createMelodyTimelineUiController>[0];
  sessionStart: Omit<Parameters<typeof createSessionStartController>[0], 'refreshMelodyTimelineUi'>;
  interactionGuards: Parameters<typeof createInteractionGuardsController>[0];
}

export function createSessionRuntimeUiCluster(deps: SessionRuntimeUiClusterDeps) {
  const melodyTimelineUiController = createMelodyTimelineUiController(deps.melodyTimelineUi);
  const sessionStartController = createSessionStartController({
    ...deps.sessionStart,
    refreshMelodyTimelineUi: () => melodyTimelineUiController.refreshUi(),
  });
  const interactionGuardsController = createInteractionGuardsController(deps.interactionGuards);

  return {
    melodyTimelineUiController,
    sessionStartController,
    interactionGuardsController,
  };
}

