import { describe, expect, it, vi } from 'vitest';
import { createSessionStartController } from './session-start-controller';

describe('session-start-controller', () => {
  it('refreshes timeline UI before starting the session', async () => {
    const deps = {
      isListening: vi.fn(() => false),
      clearMelodyTimelinePreviewState: vi.fn(),
      refreshMelodyTimelineUi: vi.fn(),
      startListening: vi.fn(async () => {}),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn((prefix: string) => prefix),
    };
    const controller = createSessionStartController(deps);

    await controller.startSessionFromUi();

    expect(deps.clearMelodyTimelinePreviewState).toHaveBeenCalledTimes(1);
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(1);
    expect(deps.startListening).toHaveBeenCalledTimes(1);
    expect(deps.showNonBlockingError).not.toHaveBeenCalled();
  });

  it('does nothing while already listening and reports startup errors', async () => {
    const alreadyListening = {
      isListening: vi.fn(() => true),
      clearMelodyTimelinePreviewState: vi.fn(),
      refreshMelodyTimelineUi: vi.fn(),
      startListening: vi.fn(async () => {}),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn((prefix: string) => prefix),
    };

    await createSessionStartController(alreadyListening).startSessionFromUi();

    expect(alreadyListening.clearMelodyTimelinePreviewState).not.toHaveBeenCalled();
    expect(alreadyListening.startListening).not.toHaveBeenCalled();

    const failure = new Error('boom');
    const failingDeps = {
      isListening: vi.fn(() => false),
      clearMelodyTimelinePreviewState: vi.fn(),
      refreshMelodyTimelineUi: vi.fn(),
      startListening: vi.fn(async () => {
        throw failure;
      }),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn((prefix: string, error: unknown) => `${prefix}: ${(error as Error).message}`),
    };

    await createSessionStartController(failingDeps).startSessionFromUi();

    expect(failingDeps.showNonBlockingError).toHaveBeenCalledWith('Failed to start session: boom');
  });
});
