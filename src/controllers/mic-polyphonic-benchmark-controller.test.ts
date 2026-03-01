import { describe, expect, it, vi } from 'vitest';
import { createMicPolyphonicBenchmarkController } from './mic-polyphonic-benchmark-controller';

function createDeps() {
  return {
    dom: {
      runMicPolyphonicBenchmarkBtn: { disabled: false, textContent: 'Benchmark' } as HTMLButtonElement,
      micPolyphonicBenchmarkInfo: { textContent: '' } as HTMLElement,
    },
    state: {
      isListening: false,
      micPolyphonicDetectorProvider: 'spectrum',
    },
    detectMicPolyphonicFrame: vi.fn(() => ({
      detectedNotesText: 'C,E,G',
      nextStableChordCounter: 3,
      isStableMatch: true,
      isStableMismatch: false,
    })),
    now: vi.fn(() => Date.now()),
    setResultMessage: vi.fn(),
    showNonBlockingError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
  };
}

describe('mic-polyphonic-benchmark-controller', () => {
  it('blocks benchmarking while a session is running', async () => {
    const deps = createDeps();
    deps.state.isListening = true;
    const controller = createMicPolyphonicBenchmarkController(deps);

    await controller.runBenchmark();

    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'Stop the current session before benchmarking the poly detector.',
      'error'
    );
  });

  it('runs benchmark and writes summary text', async () => {
    const deps = createDeps();
    const controller = createMicPolyphonicBenchmarkController(deps);

    await controller.runBenchmark();

    expect(deps.dom.micPolyphonicBenchmarkInfo.textContent).toContain('Poly benchmark (Spectrum):');
    expect(deps.setResultMessage).toHaveBeenCalledWith('Poly detector benchmark complete.', 'success');
    expect(deps.dom.runMicPolyphonicBenchmarkBtn.disabled).toBe(false);
  });
});
