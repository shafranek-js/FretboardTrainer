import { createSessionActivationRuntimeController } from './session-activation-runtime-controller';
import { createSessionDisplayResultRuntimeController } from './session-display-result-runtime-controller';
import { createSessionInputRuntimeController } from './session-input-runtime-controller';
import { createSessionNextPromptRuntimeController } from './session-next-prompt-runtime-controller';
import { createSessionSeekRuntimeController } from './session-seek-runtime-controller';
import { createSessionStartErrorRuntimeController } from './session-start-error-runtime-controller';
import { createSessionStartRuntimeController } from './session-start-runtime-controller';
import { createSessionStopRuntimeController } from './session-stop-runtime-controller';
import { createSessionTimeUpRuntimeController } from './session-timeup-runtime-controller';

interface SessionLifecycleRuntimeClusterDeps {
  stop: Parameters<typeof createSessionStopRuntimeController>[0];
  input: Parameters<typeof createSessionInputRuntimeController>[0];
  start: Omit<Parameters<typeof createSessionStartRuntimeController>[0], 'handleTimeUp'>;
  activation: Omit<Parameters<typeof createSessionActivationRuntimeController>[0], 'nextPrompt'>;
  startError: Omit<Parameters<typeof createSessionStartErrorRuntimeController>[0], 'stopListening'>;
  nextPrompt: Omit<Parameters<typeof createSessionNextPromptRuntimeController>[0], 'stopListening'>;
  displayResult: Omit<
    Parameters<typeof createSessionDisplayResultRuntimeController>[0],
    'stopListening' | 'nextPrompt'
  >;
  timeUp: Omit<Parameters<typeof createSessionTimeUpRuntimeController>[0], 'stopListening'>;
  seek: Omit<Parameters<typeof createSessionSeekRuntimeController>[0], 'nextPrompt'>;
}

export function createSessionLifecycleRuntimeCluster(deps: SessionLifecycleRuntimeClusterDeps) {
  const sessionStopRuntimeController = createSessionStopRuntimeController(deps.stop);

  function stopListening(keepStreamOpen = false) {
    sessionStopRuntimeController.stop(keepStreamOpen);
  }

  const sessionInputRuntimeController = createSessionInputRuntimeController(deps.input);

  function nextPrompt() {
    sessionNextPromptRuntimeController.advance();
  }

  function handleTimeUp() {
    sessionTimeUpRuntimeController.handleTimeUp();
  }

  const sessionStartRuntimeController = createSessionStartRuntimeController({
    ...deps.start,
    handleTimeUp,
  });

  const sessionActivationRuntimeController = createSessionActivationRuntimeController({
    ...deps.activation,
    nextPrompt,
  });

  const sessionStartErrorRuntimeController = createSessionStartErrorRuntimeController({
    ...deps.startError,
    stopListening,
  });

  const sessionNextPromptRuntimeController = createSessionNextPromptRuntimeController({
    ...deps.nextPrompt,
    stopListening,
  });

  const sessionDisplayResultRuntimeController = createSessionDisplayResultRuntimeController({
    ...deps.displayResult,
    stopListening,
    nextPrompt,
  });

  const sessionTimeUpRuntimeController = createSessionTimeUpRuntimeController({
    ...deps.timeUp,
    stopListening,
  });

  const sessionSeekRuntimeController = createSessionSeekRuntimeController({
    ...deps.seek,
    nextPrompt,
  });

  function displayResult(correct: boolean, elapsedSeconds: number) {
    sessionDisplayResultRuntimeController.handleResult(correct, elapsedSeconds);
  }

  function seekActiveMelodySessionToEvent(eventIndex: number) {
    return sessionSeekRuntimeController.seekToEvent(eventIndex);
  }

  return {
    sessionStopRuntimeController,
    sessionInputRuntimeController,
    sessionStartRuntimeController,
    sessionActivationRuntimeController,
    sessionStartErrorRuntimeController,
    sessionNextPromptRuntimeController,
    sessionDisplayResultRuntimeController,
    sessionTimeUpRuntimeController,
    sessionSeekRuntimeController,
    stopListening,
    nextPrompt,
    displayResult,
    handleTimeUp,
    seekActiveMelodySessionToEvent,
  };
}
