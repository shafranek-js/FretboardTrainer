import { detectPolyphonicFrame } from '../audio-detection-handlers';
import type { MicPolyphonicDetectorAdapter, MicPolyphonicFrameInput } from '../mic-polyphonic-detector';
import { freqToNoteNameFromA4 } from '../music-theory';

/**
 * Placeholder adapter for a future Essentia.js-based multi-pitch detector.
 * This file defines the integration seam without pulling Essentia.js yet.
 *
 * Planned targets:
 * - MultiPitchKlapuri
 * - MultiPitchMelodia
 *
 * Constraints to validate before enabling:
 * - AGPL-3.0 licensing compatibility
 * - CPU usage / latency on typical devices
 * - confidence/fallback UX in noisy rooms
 */
interface EssentiaExperimentalLoaderResult {
  moduleName: string;
  moduleValue: unknown;
}

interface EssentiaLikeInstance {
  MultiPitchKlapuri?: (...args: unknown[]) => unknown;
  MultiPitchMelodia?: (...args: unknown[]) => unknown;
  arrayToVector?: (values: number[] | Float32Array) => unknown;
  vectorToArray?: (vectorLike: unknown) => unknown;
}

interface EssentiaNamespaceLike {
  Essentia?: new (wasmModule: unknown) => EssentiaLikeInstance;
  EssentiaWASM?: (() => Promise<unknown>) | (() => unknown);
  default?: unknown;
}

interface EssentiaInitializedRuntime {
  instance: EssentiaLikeInstance;
  sourceLabel: string;
}

async function tryDynamicImport(specifier: string): Promise<unknown | null> {
  try {
    return await import(/* @vite-ignore */ specifier);
  } catch {
    return null;
  }
}

async function tryLoadEssentiaModule(): Promise<EssentiaExperimentalLoaderResult | null> {
  // Candidate package names are intentionally runtime-only so the build does not require them.
  const candidates = ['essentia.js'];
  for (const candidate of candidates) {
    const loaded = await tryDynamicImport(candidate);
    if (loaded) {
      return { moduleName: candidate, moduleValue: loaded };
    }
  }

  const globalCandidate = globalThis as {
    EssentiaWASM?: unknown;
    Essentia?: unknown;
  };
  if (globalCandidate.EssentiaWASM || globalCandidate.Essentia) {
    return {
      moduleName: 'globalThis.EssentiaWASM',
      moduleValue: globalCandidate.EssentiaWASM ?? globalCandidate.Essentia,
    };
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function unwrapNamespaceCandidates(moduleValue: unknown): unknown[] {
  const queue: unknown[] = [moduleValue];
  const seen = new Set<unknown>();
  const out: unknown[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    out.push(current);

    const rec = asRecord(current);
    if (!rec) continue;
    if (rec.default) queue.push(rec.default);
    if (rec.Essentia) queue.push(rec.Essentia);
    if (rec.EssentiaWASM) queue.push(rec.EssentiaWASM);
  }

  return out;
}

function looksLikeEssentiaInstance(value: unknown): value is EssentiaLikeInstance {
  const rec = asRecord(value);
  if (!rec) return false;
  return typeof rec.MultiPitchKlapuri === 'function' || typeof rec.MultiPitchMelodia === 'function';
}

async function tryInitializeEssentiaRuntime(
  loaded: EssentiaExperimentalLoaderResult
): Promise<EssentiaInitializedRuntime | null> {
  const candidates = unwrapNamespaceCandidates(loaded.moduleValue);

  for (const candidate of candidates) {
    if (looksLikeEssentiaInstance(candidate)) {
      return {
        instance: candidate,
        sourceLabel: `${loaded.moduleName} (pre-initialized instance)`,
      };
    }
  }

  for (const candidate of candidates) {
    const ns = asRecord(candidate) as EssentiaNamespaceLike | null;
    if (!ns) continue;
    const EssentiaCtor = typeof ns.Essentia === 'function' ? ns.Essentia : undefined;
    const EssentiaWASMFactory = typeof ns.EssentiaWASM === 'function' ? ns.EssentiaWASM : undefined;
    if (!EssentiaCtor || !EssentiaWASMFactory) continue;
    try {
      const wasmMaybePromise = EssentiaWASMFactory();
      const wasmModule =
        wasmMaybePromise && typeof (wasmMaybePromise as Promise<unknown>).then === 'function'
          ? await (wasmMaybePromise as Promise<unknown>)
          : wasmMaybePromise;
      const instance = new EssentiaCtor(wasmModule);
      if (looksLikeEssentiaInstance(instance)) {
        return {
          instance,
          sourceLabel: `${loaded.moduleName} (Essentia + EssentiaWASM)`,
        };
      }
    } catch (error) {
      console.warn('[mic-poly] Essentia experimental init attempt failed:', error);
    }
  }

  return null;
}

function toNumericArray(value: unknown, essentia: EssentiaLikeInstance): number[] {
  if (Array.isArray(value)) {
    return value.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  }
  if (ArrayBuffer.isView(value)) {
    return Array.from(value as ArrayLike<number>).filter((n) => Number.isFinite(n));
  }
  if (value && typeof essentia.vectorToArray === 'function') {
    try {
      const converted = essentia.vectorToArray(value);
      if (Array.isArray(converted)) {
        return converted.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
      }
      if (ArrayBuffer.isView(converted)) {
        return Array.from(converted as ArrayLike<number>).filter((n) => Number.isFinite(n));
      }
    } catch {
      // ignore and continue with structural fallbacks below
    }
  }
  const rec = asRecord(value);
  if (rec && typeof rec.size === 'number' && typeof rec.get === 'function') {
    const size = Math.max(0, Math.floor(rec.size));
    const values: number[] = [];
    for (let i = 0; i < size; i++) {
      const v = (rec.get as (index: number) => unknown)(i);
      if (typeof v === 'number' && Number.isFinite(v)) values.push(v);
    }
    return values;
  }
  return [];
}

function toSignalArg(frame: Float32Array, essentia: EssentiaLikeInstance): unknown {
  if (typeof essentia.arrayToVector === 'function') {
    try {
      return essentia.arrayToVector(frame);
    } catch {
      // Fall through to plain array
    }
  }
  return Array.from(frame);
}

function destroyVectorIfNeeded(vectorLike: unknown) {
  const rec = asRecord(vectorLike);
  if (rec && typeof rec.delete === 'function') {
    try {
      (rec.delete as () => void)();
    } catch {
      // ignore
    }
  }
}

function extractPitchHzFromEssentiaOutput(output: unknown, essentia: EssentiaLikeInstance): number[] {
  const rec = asRecord(output);
  if (!rec) return [];
  if ('pitch' in rec) {
    return toNumericArray(rec.pitch, essentia).filter((hz) => hz > 0);
  }
  return [];
}

function uniqueSortedPitchClassesFromHz(frequenciesHz: number[], calibratedA4: number): string[] {
  return [...new Set(frequenciesHz.map((hz) => freqToNoteNameFromA4(hz, calibratedA4)).filter(Boolean))].sort() as string[];
}

function arePitchClassSetsEqual(a: string[], b: string[]) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const note of sa) {
    if (!sb.has(note)) return false;
  }
  return true;
}

function buildStablePolyphonicResultFromDetectedNotes(input: MicPolyphonicFrameInput, detectedNoteNames: string[]) {
  const detectedNotesText = [...new Set(detectedNoteNames)].sort().join(',');
  const nextStableChordCounter =
    detectedNotesText.length > 0 && detectedNotesText === input.lastDetectedChord
      ? input.stableChordCounter + 1
      : 1;

  if (nextStableChordCounter < input.requiredStableFrames) {
    return {
      detectedNotesText,
      detectedNoteNames: [...new Set(detectedNoteNames)],
      nextStableChordCounter,
      isStableMatch: false,
      isStableMismatch: false,
    };
  }

  const targetUnique = [...new Set(input.targetChordNotes)];
  const isStableMatch = targetUnique.length > 0 && arePitchClassSetsEqual(detectedNoteNames, targetUnique);
  return {
    detectedNotesText,
    detectedNoteNames: [...new Set(detectedNoteNames)],
    nextStableChordCounter,
    isStableMatch,
    isStableMismatch: targetUnique.length > 0 ? !isStableMatch : false,
  };
}

function detectWithEssentiaRuntime(
  essentia: EssentiaLikeInstance,
  input: MicPolyphonicFrameInput
): Omit<ReturnType<typeof buildStablePolyphonicResultFromDetectedNotes>, never> | null {
  if (!input.timeDomainData || input.timeDomainData.length === 0) return null;

  const signalArg = toSignalArg(input.timeDomainData, essentia);
  try {
    if (typeof essentia.MultiPitchKlapuri === 'function') {
      const output = essentia.MultiPitchKlapuri(
        signalArg,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        input.sampleRate
      );
      const pitchHz = extractPitchHzFromEssentiaOutput(output, essentia);
      const detectedNoteNames = uniqueSortedPitchClassesFromHz(pitchHz, input.calibratedA4);
      return buildStablePolyphonicResultFromDetectedNotes(input, detectedNoteNames);
    }
    if (typeof essentia.MultiPitchMelodia === 'function') {
      const output = essentia.MultiPitchMelodia(
        signalArg,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        input.sampleRate
      );
      const pitchHz = extractPitchHzFromEssentiaOutput(output, essentia);
      const detectedNoteNames = uniqueSortedPitchClassesFromHz(pitchHz, input.calibratedA4);
      return buildStablePolyphonicResultFromDetectedNotes(input, detectedNoteNames);
    }
    return null;
  } finally {
    destroyVectorIfNeeded(signalArg);
  }
}

export async function createEssentiaExperimentalMicPolyphonicDetectorAdapter():
  Promise<MicPolyphonicDetectorAdapter | null> {
  const loaded = await tryLoadEssentiaModule();
  if (!loaded) return null;
  const runtime = await tryInitializeEssentiaRuntime(loaded);

  if (runtime) {
    console.info(`[mic-poly] Loaded experimental Essentia runtime via ${runtime.sourceLabel}.`);
  } else {
    console.info(
      `[mic-poly] Loaded experimental Essentia source (${loaded.moduleName}); failed to initialize runtime, using spectrum fallback.`
    );
  }

  return {
    detect(input: MicPolyphonicFrameInput) {
      const warnings: string[] = [];
      if (runtime) {
        try {
          const essentiaResult = detectWithEssentiaRuntime(runtime.instance, input);
          if (essentiaResult) {
            if (!input.timeDomainData || input.timeDomainData.length === 0) {
              warnings.push('Essentia provider selected, but no time-domain frame was supplied; using fallback behavior.');
            }
            return {
              ...essentiaResult,
              warnings: warnings.length > 0 ? warnings : undefined,
            };
          }
          warnings.push('Essentia runtime is available, but MultiPitchKlapuri/MultiPitchMelodia could not be executed for this frame.');
        } catch (error) {
          warnings.push(
            `Essentia detector error: ${error instanceof Error ? error.message : String(error)}. Using spectrum fallback for this frame.`
          );
        }
      } else {
        warnings.push('Essentia module source was found, but runtime initialization failed; using spectrum fallback.');
      }

      const hasTimeDomainFrame = Boolean(input.timeDomainData && input.timeDomainData.length > 0);
      const result = detectPolyphonicFrame(input);
      return {
        ...result,
        detectedNoteNames: result.detectedNotesText
          .split(',')
          .map((note) => note.trim())
          .filter(Boolean),
        warnings: [
          ...warnings,
          `Essentia experimental provider fallback path used${hasTimeDomainFrame ? ' (time-domain frame available)' : ''}.`,
        ],
      };
    },
  };
}
