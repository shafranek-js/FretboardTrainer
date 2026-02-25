import { detectPolyphonicFrame, type PolyphonicDetectionInput } from './audio-detection-handlers';

export type MicPolyphonicDetectorProvider = 'spectrum' | 'essentia_experimental';

export interface MicPolyphonicFrameInput extends PolyphonicDetectionInput {
  provider?: MicPolyphonicDetectorProvider;
  // Raw time-domain frame from AnalyserNode.getFloatTimeDomainData() for advanced providers (e.g., Essentia.js).
  timeDomainData?: Float32Array;
  // Optional metadata useful for future adaptive/CPU-aware providers.
  frameVolumeRms?: number;
  timestampMs?: number;
}

export interface MicPolyphonicDetectorAdapter {
  detect: (input: MicPolyphonicFrameInput) => Omit<MicPolyphonicDetectionResult, 'provider'>;
}

const detectorAdapters = new Map<MicPolyphonicDetectorProvider, MicPolyphonicDetectorAdapter>();

export interface MicPolyphonicDetectionResult {
  detectedNotesText: string;
  detectedNoteNames: string[];
  nextStableChordCounter: number;
  isStableMatch: boolean;
  isStableMismatch: boolean;
  provider: MicPolyphonicDetectorProvider;
  requestedProvider?: MicPolyphonicDetectorProvider;
  fallbackFrom?: MicPolyphonicDetectorProvider;
  warnings?: string[];
}

export function listMicPolyphonicDetectorProviders(): MicPolyphonicDetectorProvider[] {
  return ['spectrum', 'essentia_experimental'];
}

export function registerMicPolyphonicDetectorAdapter(
  provider: MicPolyphonicDetectorProvider,
  adapter: MicPolyphonicDetectorAdapter
) {
  if (provider === 'spectrum') {
    throw new Error('The built-in "spectrum" mic polyphonic detector provider cannot be overridden.');
  }
  detectorAdapters.set(provider, adapter);
}

export function unregisterMicPolyphonicDetectorAdapter(provider: MicPolyphonicDetectorProvider) {
  if (provider === 'spectrum') return;
  detectorAdapters.delete(provider);
}

export function normalizeMicPolyphonicDetectorProvider(
  value: string | null | undefined
): MicPolyphonicDetectorProvider {
  if (value === 'essentia' || value === 'essentia-experimental' || value === 'essentia_experimental') {
    return 'essentia_experimental';
  }
  return value === 'spectrum' ? value : 'spectrum';
}

function parseDetectedNotesText(detectedNotesText: string): string[] {
  if (!detectedNotesText.trim()) return [];
  return [...new Set(detectedNotesText.split(',').map((note) => note.trim()).filter(Boolean))];
}

export function detectMicPolyphonicFrame(
  input: MicPolyphonicFrameInput
): MicPolyphonicDetectionResult {
  const requestedProvider = normalizeMicPolyphonicDetectorProvider(input.provider);

  // Baseline provider: current target-conditioned spectrum note-energy detector.
  if (requestedProvider !== 'spectrum') {
    const adapter = detectorAdapters.get(requestedProvider);
    if (adapter) {
      const adapted = adapter.detect(input);
      return {
        ...adapted,
        provider: requestedProvider,
        requestedProvider,
      };
    }
  }

  const result = detectPolyphonicFrame(input);
  return {
    ...result,
    detectedNoteNames: parseDetectedNotesText(result.detectedNotesText),
    provider: 'spectrum',
    requestedProvider,
    fallbackFrom: requestedProvider !== 'spectrum' ? requestedProvider : undefined,
    warnings:
      requestedProvider !== 'spectrum'
        ? [`Mic polyphonic detector provider "${requestedProvider}" is not available; using "spectrum".`]
        : undefined,
  };
}
