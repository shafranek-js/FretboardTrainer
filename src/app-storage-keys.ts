export const PROFILES_KEY = 'fretflow-profiles';
export const ACTIVE_PROFILE_KEY = 'fretflow-active-profile';
export const STATS_KEY = 'fretflow-stats';
export const LAST_SESSION_STATS_KEY = 'fretflow-last-session-stats';
export const LAST_SESSION_ANALYSIS_BUNDLE_KEY = 'fretflow-last-session-analysis-bundle';
export const PERFORMANCE_STAR_RESULTS_KEY = 'fretflow-performance-star-results';
export const CUSTOM_MELODY_STORAGE_KEY = 'fretboardTrainer.customMelodies.v1';
export const BUILTIN_MELODY_STORAGE_KEY = 'fretboardTrainer.builtinMelodies.v1';
export const BUILTIN_MIDI_LIBRARY_SYNC_KEY = 'fretboardTrainer.builtinMidiLibrarySync.v1';
export const ONBOARDING_COMPLETED_KEY = 'fretboardTrainer.onboardingCompleted.v1';

export const APP_USER_DATA_STORAGE_KEYS = [
  PROFILES_KEY,
  ACTIVE_PROFILE_KEY,
  STATS_KEY,
  LAST_SESSION_STATS_KEY,
  LAST_SESSION_ANALYSIS_BUNDLE_KEY,
  PERFORMANCE_STAR_RESULTS_KEY,
  CUSTOM_MELODY_STORAGE_KEY,
  BUILTIN_MELODY_STORAGE_KEY,
  BUILTIN_MIDI_LIBRARY_SYNC_KEY,
] as const;

export type AppUserDataStorageKey = (typeof APP_USER_DATA_STORAGE_KEYS)[number];
