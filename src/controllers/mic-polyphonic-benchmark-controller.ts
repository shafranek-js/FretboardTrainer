import {
  formatMicPolyphonicBenchmarkSummary,
  runMicPolyphonicBenchmark,
} from '../mic-polyphonic-benchmark';

interface MicPolyphonicBenchmarkControllerDom {
  runMicPolyphonicBenchmarkBtn: HTMLButtonElement;
  micPolyphonicBenchmarkInfo: HTMLElement;
}

interface MicPolyphonicBenchmarkControllerState {
  isListening: boolean;
  micPolyphonicDetectorProvider: string;
}

interface MicPolyphonicBenchmarkControllerDeps {
  dom: MicPolyphonicBenchmarkControllerDom;
  state: MicPolyphonicBenchmarkControllerState;
  detectMicPolyphonicFrame: Parameters<typeof runMicPolyphonicBenchmark>[0]['detectMicPolyphonicFrame'];
  now(): number;
  setResultMessage(message: string, tone?: 'success' | 'error'): void;
  showNonBlockingError(message: string): void;
  formatUserFacingError(prefix: string, error: unknown): string;
}

export function createMicPolyphonicBenchmarkController(deps: MicPolyphonicBenchmarkControllerDeps) {
  function setIdleInfo(text = 'Poly benchmark: -') {
    deps.dom.micPolyphonicBenchmarkInfo.textContent = text;
  }

  async function runBenchmark() {
    if (deps.state.isListening) {
      deps.setResultMessage('Stop the current session before benchmarking the poly detector.', 'error');
      return;
    }

    const originalLabel = deps.dom.runMicPolyphonicBenchmarkBtn.textContent ?? 'Benchmark';
    deps.dom.runMicPolyphonicBenchmarkBtn.disabled = true;
    deps.dom.runMicPolyphonicBenchmarkBtn.textContent = 'Benchmarking...';
    deps.dom.micPolyphonicBenchmarkInfo.textContent = 'Running synthetic poly detector benchmark...';

    try {
      const summary = runMicPolyphonicBenchmark({
        provider: deps.state.micPolyphonicDetectorProvider,
        detectMicPolyphonicFrame: deps.detectMicPolyphonicFrame,
        now: deps.now,
      });
      const text = formatMicPolyphonicBenchmarkSummary(summary);
      deps.dom.micPolyphonicBenchmarkInfo.textContent = text;
      deps.setResultMessage('Poly detector benchmark complete.', 'success');
    } catch (error) {
      setIdleInfo();
      deps.showNonBlockingError(deps.formatUserFacingError('Failed to benchmark poly detector', error));
    } finally {
      deps.dom.runMicPolyphonicBenchmarkBtn.disabled = false;
      deps.dom.runMicPolyphonicBenchmarkBtn.textContent = originalLabel;
    }
  }

  return {
    setIdleInfo,
    runBenchmark,
  };
}
