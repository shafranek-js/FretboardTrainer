type ResultTone = 'neutral' | 'success' | 'error';

interface PwaUpdateControllerDeps {
  isSessionActive(): boolean;
  setStatusText(text: string): void;
  setResultMessage(text: string, tone?: ResultTone): void;
  applyUpdate(): void;
  scheduleCheck(callback: () => void, delayMs: number): number;
  cancelScheduledCheck(handle: number): void;
}

const PENDING_UPDATE_STATUS = 'Update ready.';
const PENDING_UPDATE_MESSAGE = 'A new version is ready. It will load automatically after the current session stops.';
const APPLYING_UPDATE_STATUS = 'Updating...';
const APPLYING_UPDATE_MESSAGE = 'A new version is ready. Reloading now...';
const PENDING_UPDATE_RETRY_MS = 2000;

export function createPwaUpdateController(deps: PwaUpdateControllerDeps) {
  let pendingUpdate = false;
  let scheduledCheckHandle: number | null = null;

  function clearScheduledCheck() {
    if (scheduledCheckHandle === null) return;
    deps.cancelScheduledCheck(scheduledCheckHandle);
    scheduledCheckHandle = null;
  }

  function tryApplyPendingUpdate() {
    if (!pendingUpdate || deps.isSessionActive()) return false;
    clearScheduledCheck();
    pendingUpdate = false;
    deps.setStatusText(APPLYING_UPDATE_STATUS);
    deps.setResultMessage(APPLYING_UPDATE_MESSAGE);
    deps.applyUpdate();
    return true;
  }

  function scheduleRetry() {
    clearScheduledCheck();
    scheduledCheckHandle = deps.scheduleCheck(() => {
      scheduledCheckHandle = null;
      if (!tryApplyPendingUpdate() && pendingUpdate) {
        scheduleRetry();
      }
    }, PENDING_UPDATE_RETRY_MS);
  }

  function handleNeedRefresh() {
    pendingUpdate = true;
    if (tryApplyPendingUpdate()) return;
    deps.setStatusText(PENDING_UPDATE_STATUS);
    deps.setResultMessage(PENDING_UPDATE_MESSAGE);
    scheduleRetry();
  }

  function checkPendingUpdate() {
    tryApplyPendingUpdate();
  }

  return {
    handleNeedRefresh,
    checkPendingUpdate,
    hasPendingUpdate: () => pendingUpdate,
  };
}

