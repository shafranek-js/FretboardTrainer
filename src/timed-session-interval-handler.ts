export interface TimedSessionIntervalHandlerDeps {
  decrementTimeLeft: () => number;
  setTimerValue: (value: number) => void;
  handleTimeUp: () => void;
  onRuntimeError: (context: string, error: unknown) => void;
}

export function createTimedSessionIntervalHandler(deps: TimedSessionIntervalHandlerDeps) {
  return () => {
    try {
      const nextTimeLeft = deps.decrementTimeLeft();
      deps.setTimerValue(nextTimeLeft);
      if (nextTimeLeft <= 0) {
        deps.handleTimeUp();
      }
    } catch (error) {
      deps.onRuntimeError('timed interval tick', error);
    }
  };
}
