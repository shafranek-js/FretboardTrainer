type AppState = typeof import('./state').state;

interface SessionTimeoutRuntimeControllerDeps {
  state: Pick<AppState, 'pendingTimeoutIds' | 'cooldown'>;
  scheduleTrackedTimeout: typeof import('./session-timeouts').scheduleTrackedTimeout;
  scheduleTrackedCooldown: typeof import('./session-timeouts').scheduleTrackedCooldown;
  onRuntimeError: (context: string, error: unknown) => void;
}

export function createSessionTimeoutRuntimeController(
  deps: SessionTimeoutRuntimeControllerDeps
) {
  function scheduleTimeout(delayMs: number, callback: () => void, context: string) {
    return deps.scheduleTrackedTimeout({
      pendingTimeoutIds: deps.state.pendingTimeoutIds,
      delayMs,
      callback,
      context,
      onError: deps.onRuntimeError,
    });
  }

  function scheduleCooldown(context: string, delayMs: number, callback: () => void) {
    deps.scheduleTrackedCooldown({
      pendingTimeoutIds: deps.state.pendingTimeoutIds,
      delayMs,
      callback,
      context,
      onError: deps.onRuntimeError,
      setCooldown: (value) => {
        deps.state.cooldown = value;
      },
    });
  }

  return {
    scheduleTimeout,
    scheduleCooldown,
  };
}
