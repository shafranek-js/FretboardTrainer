import type { IInstrument } from './instruments/instrument';
import type { RhythmSessionStats } from './types';
import type { PerformanceMicTolerancePreset } from './performance-mic-tolerance';
import type { PerformanceTimingLeniencyPreset } from './performance-timing-forgiveness';
import type { MelodyFingeringLevel, MelodyFingeringStrategy } from './melody-fingering';
import { normalizePerformanceMicLatencyCompensationMs } from './performance-mic-latency-compensation';
import type { CurriculumPresetKey } from './curriculum-presets';
import { ACTIVE_PROFILE_KEY, PROFILES_KEY } from './app-storage-keys';
import {
  readStorageJson,
  readStorageString,
  removeStorageValue,
  writeStorageJson,
  writeStorageString,
} from './storage-schema';

type InstrumentName = IInstrument['name'];

export function normalizeStoredMelodyStudyRangeIndex(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }

  return 0;
}

export function createDefaultRhythmSessionStats(): RhythmSessionStats {
  return {
    totalJudged: 0,
    onBeat: 0,
    early: 0,
    late: 0,
    totalAbsOffsetMs: 0,
    bestAbsOffsetMs: null,
  };
}

export interface ProfileSettings {
  instrument?: InstrumentName;
  tuningPreset?: string;
  showAllNotes?: boolean;
  showStringToggles?: boolean;
  autoPlayPromptSound?: boolean;
  relaxPerformanceOctaveCheck?: boolean;
  performanceMicTolerancePreset?: PerformanceMicTolerancePreset;
  performanceTimingLeniencyPreset?: PerformanceTimingLeniencyPreset;
  performanceMicLatencyCompensationMs?: number;
  difficulty?: string;
  noteNaming?: 'sharps' | 'flats';
  melodyTimelineViewMode?: 'classic' | 'grid';
  melodyFingeringStrategy?: MelodyFingeringStrategy;
  melodyFingeringLevel?: MelodyFingeringLevel;
  showTimelineSteps?: boolean;
  showTimelineDetails?: boolean;
  inputSource?: 'microphone' | 'midi';
  audioInputDeviceId?: string | null;
  micSensitivityPreset?: 'quiet_room' | 'normal' | 'noisy_room' | 'auto';
  micNoteAttackFilter?: 'off' | 'balanced' | 'strong';
  micNoteHoldFilter?: 'off' | '40ms' | '80ms' | '120ms';
  isDirectInputMode?: boolean;
  micPolyphonicDetectorProvider?: string;
  micAutoNoiseFloorRms?: number | null;
  midiInputDeviceId?: string | null;
  startFret?: string;
  endFret?: string;
  enabledStrings?: Partial<Record<InstrumentName, string[]>>;
  trainingMode?: string;
  sessionGoal?: string;
  sessionPace?: 'slow' | 'normal' | 'fast' | 'ultra';
  practiceSetupCollapsed?: boolean;
  melodySetupCollapsed?: boolean;
  sessionToolsCollapsed?: boolean;
  metronomeEnabled?: boolean;
  metronomeBpm?: string;
  metronomeVolume?: string;
  rhythmTimingWindow?: string;
  selectedScale?: string;
  selectedChord?: string;
  randomizeChords?: boolean;
  selectedProgression?: string;
  arpeggioPattern?: string;
  curriculumPreset?: CurriculumPresetKey;
  selectedMelodyId?: string;
  melodyShowNote?: boolean;
  melodyShowTabTimeline?: boolean;
  melodyShowScrollingTab?: boolean;
  melodyTimelineZoomPercent?: number;
  scrollingTabZoomPercent?: number;
  melodyDemoBpm?: string;
  melodyPlaybackBpmById?: Record<string, number>;
  melodyTransposeById?: Record<string, number>;
  melodyStringShiftById?: Record<string, number>;
  melodyStudyRangeById?: Record<string, { startIndex: number; endIndex: number }>;
  melodyLoopRange?: boolean;
  melodyTransposeSemitones?: number;
  melodyStringShift?: number;
  calibratedA4?: number;
}

export type ProfilesMap = Record<string, ProfileSettings>;

export function getDefaultTrainingMode() {
  return 'melody';
}

export function getDefaultMelodyIdForInstrument(instrumentName: InstrumentName) {
  return instrumentName === 'ukulele'
    ? 'builtin:ukulele:ode_to_joy_intro'
    : 'builtin:guitar:ode_to_joy_intro';
}

export { normalizePerformanceMicLatencyCompensationMs };

export function getProfiles(): ProfilesMap {
  const profiles = readStorageJson(
    localStorage,
    PROFILES_KEY,
    (parsed): parsed is ProfilesMap => !!parsed && typeof parsed === 'object' && !Array.isArray(parsed),
    {},
    (error) => {
      console.warn('Failed to parse saved profiles. Resetting profiles storage.', error);
      removeStorageValue(localStorage, PROFILES_KEY);
    }
  );
  return profiles;
}

export function saveProfiles(profiles: ProfilesMap) {
  writeStorageJson(localStorage, PROFILES_KEY, profiles);
}

export function getActiveProfileName(): string {
  return readStorageString(localStorage, ACTIVE_PROFILE_KEY, '__default__') || '__default__';
}

export function setActiveProfileName(name: string) {
  writeStorageString(localStorage, ACTIVE_PROFILE_KEY, name);
}

export function resetSavedSettings() {
  removeStorageValue(localStorage, PROFILES_KEY);
  removeStorageValue(localStorage, ACTIVE_PROFILE_KEY);
}
