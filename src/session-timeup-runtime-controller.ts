import { buildSessionTimeUpPlan } from './session-timeup-plan';
import { executeSessionTimeUpPlan } from './session-timeup-executor';

type AppState = typeof import('./state').state;

interface SessionTimeUpRuntimeControllerDeps {
  state: Pick<AppState, 'currentScore' | 'stats' | 'timerId' | 'showSessionSummaryOnStop'>;
  clearInterval: (handle: number) => void;
  saveStats: () => void;
  stopListening: () => void;
  setResultMessage: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
}

export function createSessionTimeUpRuntimeController(deps: SessionTimeUpRuntimeControllerDeps) {
  function handleTimeUp() {
    const timeUpPlan = buildSessionTimeUpPlan({
      currentScore: deps.state.currentScore,
      currentHighScore: deps.state.stats.highScore,
    });

    executeSessionTimeUpPlan(timeUpPlan, {
      clearTimer: () => {
        if (deps.state.timerId) {
          deps.clearInterval(deps.state.timerId);
        }
        deps.state.timerId = null;
      },
      persistHighScore: (nextHighScore) => {
        deps.state.stats.highScore = nextHighScore;
        deps.saveStats();
      },
      requestSessionSummaryOnStop: () => {
        deps.state.showSessionSummaryOnStop = true;
      },
      stopListening: deps.stopListening,
      setResultMessage: deps.setResultMessage,
    });
  }

  return {
    handleTimeUp,
  };
}
