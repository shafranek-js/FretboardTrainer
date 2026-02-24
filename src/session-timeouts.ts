export interface ScheduleTrackedTimeoutInput {
  pendingTimeoutIds: Set<number>;
  delayMs: number;
  callback: () => void;
  context: string;
  onError: (context: string, error: unknown) => void;
  setTimeoutFn?: (callback: () => void, delayMs: number) => number;
}

export interface ScheduleTrackedCooldownInput extends Omit<ScheduleTrackedTimeoutInput, 'callback'> {
  callback: () => void;
  setCooldown: (value: boolean) => void;
}

export function scheduleTrackedTimeout({
  pendingTimeoutIds,
  delayMs,
  callback,
  context,
  onError,
  setTimeoutFn = (cb, ms) => window.setTimeout(cb, ms),
}: ScheduleTrackedTimeoutInput) {
  const timeoutId = setTimeoutFn(() => {
    pendingTimeoutIds.delete(timeoutId);
    try {
      callback();
    } catch (error) {
      onError(context, error);
    }
  }, delayMs);
  pendingTimeoutIds.add(timeoutId);
  return timeoutId;
}

export function scheduleTrackedCooldown({
  pendingTimeoutIds,
  delayMs,
  callback,
  context,
  onError,
  setCooldown,
  setTimeoutFn,
}: ScheduleTrackedCooldownInput) {
  setCooldown(true);
  scheduleTrackedTimeout({
    pendingTimeoutIds,
    delayMs,
    context,
    onError,
    setTimeoutFn,
    callback: () => {
      try {
        callback();
      } finally {
        setCooldown(false);
      }
    },
  });
}

export function clearTrackedTimeouts(
  pendingTimeoutIds: Set<number>,
  clearTimeoutFn: (id: number) => void = (id) => window.clearTimeout(id)
) {
  if (pendingTimeoutIds.size === 0) return;
  for (const timeoutId of pendingTimeoutIds) {
    clearTimeoutFn(timeoutId);
  }
  pendingTimeoutIds.clear();
}
