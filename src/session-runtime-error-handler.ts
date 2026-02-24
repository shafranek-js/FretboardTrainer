type ResultTone = 'neutral' | 'success' | 'error';

export interface SessionRuntimeErrorHandlerDeps {
  stopSession: () => void;
  setStatusText: (text: string) => void;
  setResultMessage: (text: string, tone: ResultTone) => void;
  logError?: (...args: unknown[]) => void;
}

export function createSessionRuntimeErrorHandler({
  stopSession,
  setStatusText,
  setResultMessage,
  logError = console.error,
}: SessionRuntimeErrorHandlerDeps) {
  let isHandlingRuntimeError = false;

  return (context: string, error: unknown) => {
    logError(`[Session Runtime Error] ${context}:`, error);
    if (isHandlingRuntimeError) return;

    isHandlingRuntimeError = true;
    try {
      stopSession();
      setStatusText('Session stopped due to an internal error.');
      setResultMessage('Runtime error. Session stopped.', 'error');
    } catch (stopError) {
      logError('[Session Runtime Error] Failed to stop session cleanly:', stopError);
    } finally {
      isHandlingRuntimeError = false;
    }
  };
}
