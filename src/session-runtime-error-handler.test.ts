import { describe, expect, it, vi } from 'vitest';
import { createSessionRuntimeErrorHandler } from './session-runtime-error-handler';

describe('createSessionRuntimeErrorHandler', () => {
  it('logs, stops the session, and reports user-facing messages', () => {
    const stopSession = vi.fn();
    const setStatusText = vi.fn();
    const setResultMessage = vi.fn();
    const logError = vi.fn();

    const handleError = createSessionRuntimeErrorHandler({
      stopSession,
      setStatusText,
      setResultMessage,
      logError,
    });

    const error = new Error('boom');
    handleError('processAudio', error);

    expect(logError).toHaveBeenCalledWith('[Session Runtime Error] processAudio:', error);
    expect(stopSession).toHaveBeenCalledTimes(1);
    expect(setStatusText).toHaveBeenCalledWith('Session stopped due to an internal error.');
    expect(setResultMessage).toHaveBeenCalledWith('Runtime error. Session stopped.', 'error');
  });

  it('logs stop-session failures without throwing', () => {
    const stopError = new Error('stop failed');
    const logError = vi.fn();

    const handleError = createSessionRuntimeErrorHandler({
      stopSession: () => {
        throw stopError;
      },
      setStatusText: vi.fn(),
      setResultMessage: vi.fn(),
      logError,
    });

    handleError('displayResult', new Error('inner'));

    expect(logError).toHaveBeenCalledWith(
      '[Session Runtime Error] Failed to stop session cleanly:',
      stopError
    );
  });

  it('prevents nested handling while already stopping a session', () => {
    const logError = vi.fn();
    let handleError: (context: string, error: unknown) => void = () => {};
    const stopSession = vi.fn(() => {
      handleError('nested', new Error('nested error'));
    });
    const setStatusText = vi.fn();
    const setResultMessage = vi.fn();

    handleError = createSessionRuntimeErrorHandler({
      stopSession,
      setStatusText,
      setResultMessage,
      logError,
    });

    handleError('outer', new Error('outer error'));

    expect(stopSession).toHaveBeenCalledTimes(1);
    expect(setStatusText).toHaveBeenCalledTimes(1);
    expect(setResultMessage).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith('[Session Runtime Error] nested:', expect.any(Error));
  });
});
