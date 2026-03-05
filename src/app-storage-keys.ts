export const PROFILES_KEY = 'fretflow-profiles';
export const ACTIVE_PROFILE_KEY = 'fretflow-active-profile';
export const STATS_KEY = 'fretflow-stats';
export const LAST_SESSION_STATS_KEY = 'fretflow-last-session-stats';
export const LAST_SESSION_ANALYSIS_BUNDLE_KEY = 'fretflow-last-session-analysis-bundle';
export const CUSTOM_MELODY_STORAGE_KEY = 'fretboardTrainer.customMelodies.v1';

export const APP_USER_DATA_STORAGE_KEYS = [
  PROFILES_KEY,
  ACTIVE_PROFILE_KEY,
  STATS_KEY,
  LAST_SESSION_STATS_KEY,
  LAST_SESSION_ANALYSIS_BUNDLE_KEY,
  CUSTOM_MELODY_STORAGE_KEY,
] as const;

export type AppUserDataStorageKey = (typeof APP_USER_DATA_STORAGE_KEYS)[number];
