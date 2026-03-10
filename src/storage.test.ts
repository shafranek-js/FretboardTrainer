import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIVE_PROFILE_KEY, PROFILES_KEY } from './app-storage-keys';

const mocked = vi.hoisted(() => {
  class FakeClassList {
    private classes = new Set<string>();

    toggle(name: string, force?: boolean) {
      if (force === undefined) {
        if (this.classes.has(name)) {
          this.classes.delete(name);
          return false;
        }
        this.classes.add(name);
        return true;
      }

      if (force) {
        this.classes.add(name);
        return true;
      }

      this.classes.delete(name);
      return false;
    }

    contains(name: string) {
      return this.classes.has(name);
    }
  }

  function createSelect(value: string, optionValues: string[]) {
    const options = optionValues.map((optionValue) => ({
      value: optionValue,
      disabled: false,
    }));
    const select = {
      value,
      options,
      selectedIndex: Math.max(
        0,
        options.findIndex((option) => option.value === value)
      ),
    } as {
      value: string;
      options: Array<{ value: string; disabled: boolean }>;
      selectedIndex: number;
      selectedOptions?: Array<{ value: string; disabled: boolean }>;
    };
    Object.defineProperty(select, 'selectedOptions', {
      get() {
        return select.options.filter((option) => option.value === select.value);
      },
    });
    return select;
  }

  const dom = {
    stringSelector: { classList: new FakeClassList(), style: {}, hidden: false } as unknown as HTMLElement,
    showAllNotes: { checked: false } as HTMLInputElement,
    showStringToggles: { checked: false } as HTMLInputElement,
    autoPlayPromptSound: { checked: true } as HTMLInputElement,
    promptSoundTail: { value: '450' } as HTMLInputElement,
    promptSoundTailValue: { textContent: '450 ms' } as HTMLElement,
    relaxPerformanceOctaveCheck: { checked: true } as HTMLInputElement,
    performanceMicTolerancePreset: createSelect('normal', ['strict', 'normal', 'forgiving']) as unknown as HTMLSelectElement,
    performanceTimingLeniencyPreset: createSelect('normal', ['strict', 'normal', 'forgiving']) as unknown as HTMLSelectElement,
    performanceMicLatencyCompensation: { value: '0' } as HTMLInputElement,
    performanceMicLatencyCompensationExact: { value: '0' } as HTMLInputElement,
    performanceMicLatencyCompensationValue: { textContent: '' } as HTMLElement,
    instrumentSelector: createSelect('guitar', ['guitar', 'ukulele']) as unknown as HTMLSelectElement,
    tuningPreset: createSelect('standard', ['standard']) as unknown as HTMLSelectElement,
    difficulty: createSelect('natural', ['natural', 'all']) as unknown as HTMLSelectElement,
    noteNaming: createSelect('sharps', ['sharps', 'flats']) as unknown as HTMLSelectElement,
    timelineViewMode: createSelect('classic', ['classic', 'grid']) as unknown as HTMLSelectElement,
    melodyFingeringStrategy: createSelect('minimax', ['heuristic', 'minimax']) as unknown as HTMLSelectElement,
    melodyFingeringLevel: createSelect('beginner', ['beginner', 'intermediate', 'advanced']) as unknown as HTMLSelectElement,
    showTimelineSteps: { checked: false } as HTMLInputElement,
    showTimelineDetails: { checked: false } as HTMLInputElement,
    micSensitivityPreset: createSelect('normal', ['quiet_room', 'normal', 'noisy_room', 'auto']) as unknown as HTMLSelectElement,
    micNoteAttackFilter: createSelect('balanced', ['off', 'balanced', 'strong']) as unknown as HTMLSelectElement,
    micNoteHoldFilter: createSelect('40ms', ['off', '40ms', '80ms', '120ms']) as unknown as HTMLSelectElement,
    micDirectInputMode: { checked: false } as HTMLInputElement,
    micPolyphonicDetectorProvider: createSelect('auto', ['auto', 'basic']) as unknown as HTMLSelectElement,
    startFret: { value: '0' } as HTMLInputElement,
    endFret: { value: '20' } as HTMLInputElement,
    trainingMode: createSelect('random', ['random', 'performance', 'melody']) as unknown as HTMLSelectElement,
    sessionGoal: createSelect('none', ['none', 'correct_10']) as unknown as HTMLSelectElement,
    sessionPace: createSelect('normal', ['slow', 'normal', 'fast', 'ultra']) as unknown as HTMLSelectElement,
    metronomeEnabled: { checked: false } as HTMLInputElement,
    metronomeBpm: { value: '80' } as HTMLInputElement,
    metronomeBpmValue: { textContent: '' } as HTMLElement,
    metronomeVolume: { value: '100' } as HTMLInputElement,
    metronomeVolumeValue: { textContent: '100%' } as HTMLElement,
    rhythmTimingWindow: createSelect('normal', ['strict', 'normal', 'loose']) as unknown as HTMLSelectElement,
    scaleSelector: createSelect('C Major', ['C Major']) as unknown as HTMLSelectElement,
    chordSelector: createSelect('C', ['C']) as unknown as HTMLSelectElement,
    randomizeChords: { checked: false } as HTMLInputElement,
    progressionSelector: createSelect('I-IV-V', ['I-IV-V']) as unknown as HTMLSelectElement,
    arpeggioPatternSelector: createSelect('ascending', ['ascending']) as unknown as HTMLSelectElement,
    curriculumPreset: createSelect('custom', ['custom', 'beginner_essentials']) as unknown as HTMLSelectElement,
    curriculumPresetInfo: {
      textContent: '',
      classList: new FakeClassList(),
    } as unknown as HTMLElement,
    melodySelector: createSelect('', ['', 'ode-to-joy']) as unknown as HTMLSelectElement,
    melodyShowNote: { checked: true } as HTMLInputElement,
    melodyShowTabTimeline: { checked: true } as HTMLInputElement,
    melodyShowScrollingTab: { checked: true } as HTMLInputElement,
    melodyTimelineZoom: { value: '100' } as HTMLInputElement,
    melodyTimelineZoomValue: { textContent: '' } as HTMLElement,
    scrollingTabZoom: { value: '100' } as HTMLInputElement,
    scrollingTabZoomValue: { textContent: '' } as HTMLElement,
    melodyDemoBpm: { value: '90' } as HTMLInputElement,
    melodyDemoBpmValue: { textContent: '' } as HTMLElement,
    melodyFingeringStrategyQuick: createSelect('minimax', ['heuristic', 'minimax']) as unknown as HTMLSelectElement,
    melodyLoopRange: { checked: false } as HTMLInputElement,
    melodyTranspose: { value: '0' } as HTMLInputElement,
    melodyTransposeValue: { textContent: '' } as HTMLElement,
    melodyStringShift: { value: '0' } as HTMLInputElement,
    melodyStringShiftValue: { textContent: '' } as HTMLElement,
    studyMelodyMicGatePercent: { value: '85' } as HTMLInputElement,
    studyMelodyMicGatePercentValue: { textContent: '' } as HTMLElement,
    studyMelodyMicNoiseGuardPercent: { value: '100' } as HTMLInputElement,
    studyMelodyMicNoiseGuardPercentValue: { textContent: '' } as HTMLElement,
    studyMelodyMicSilenceResetFrames: { value: '0' } as HTMLInputElement,
    studyMelodyMicSilenceResetFramesValue: { textContent: '' } as HTMLElement,
    studyMelodyMicStableFrames: { value: '0' } as HTMLInputElement,
    studyMelodyMicStableFramesValue: { textContent: '' } as HTMLElement,
    studyMelodyPreEmphasisFrequencyHz: { value: '300' } as HTMLInputElement,
    studyMelodyPreEmphasisFrequencyHzValue: { textContent: '' } as HTMLElement,
    studyMelodyPreEmphasisGainDb: { value: '5' } as HTMLInputElement,
    studyMelodyPreEmphasisGainDbValue: { textContent: '' } as HTMLElement,
  };

  const state = {
    currentInstrument: { name: 'guitar', STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] },
    currentTuningPresetKey: 'standard',
    melodyTimelineViewMode: 'classic',
    melodyFingeringStrategy: 'minimax',
    melodyFingeringLevel: 'beginner',
    showMelodyTimelineSteps: false,
    showMelodyTimelineDetails: false,
    inputSource: 'microphone',
    isDirectInputMode: false,
    preferredAudioInputDeviceId: null,
    micSensitivityPreset: 'normal',
    micNoteAttackFilterPreset: 'balanced',
    micNoteHoldFilterPreset: '40ms',
    micPolyphonicDetectorProvider: 'auto',
    micAutoNoiseFloorRms: null,
    preferredMidiInputDeviceId: null,
    sessionPace: 'normal',
    melodyTransposeById: {} as Record<string, number>,
    melodyPlaybackBpmById: {} as Record<string, number>,
    melodyStringShiftById: {} as Record<string, number>,
    melodyStudyRangeById: {} as Record<string, { startIndex: number; endIndex: number }>,
    melodyLoopRangeEnabled: false,
    showMelodyTabTimeline: true,
    showScrollingTabPanel: true,
    melodyTimelineZoomPercent: 100,
    scrollingTabZoomPercent: 100,
    melodyTransposeSemitones: 0,
    melodyStringShift: 0,
    calibratedA4: 440,
    audioCache: { guitar: {} as object },
    preferredMelodyId: null as string | null,
    showingAllNotes: false,
    autoPlayPromptSound: true,
    promptSoundTailMs: 450,
    relaxPerformanceOctaveCheck: true,
    performanceMicTolerancePreset: 'normal',
    performanceTimingLeniencyPreset: 'normal',
    performanceMicLatencyCompensationMs: 0,
    uiMode: 'simple',
    uiWorkflow: 'learn-notes',
    studyMelodyMicGatePercent: 85,
    studyMelodyMicNoiseGuardPercent: 100,
    studyMelodyMicSilenceResetFrames: 0,
    studyMelodyMicStableFrames: 0,
    studyMelodyPreEmphasisFrequencyHz: 300,
    studyMelodyPreEmphasisGainDb: 5,
  };

  const panelState = {
    practiceSetupCollapsed: false,
    melodySetupCollapsed: false,
    sessionToolsCollapsed: true,
  };

  return {
    dom,
    state,
    panelState,
    ui: {
      updateInstrumentUI: vi.fn(),
      handleModeChange: vi.fn(),
      populateProfileSelector: vi.fn(),
      redrawFretboard: vi.fn(),
    },
    setUiMode: vi.fn(),
    setUiWorkflow: vi.fn(),
    loadInstrumentSoundfont: vi.fn(async () => {}),
    setNoteNamingPreference: vi.fn(),
    setPreferredAudioInputDeviceId: vi.fn(),
    setInputSourcePreference: vi.fn(),
    setPreferredMidiInputDeviceId: vi.fn(),
  };
});

vi.mock('./state', () => ({
  dom: mocked.dom,
  state: mocked.state,
}));

vi.mock('./ui', () => mocked.ui);
vi.mock('./ui-signals', () => ({
  getPracticeSetupCollapsed: () => mocked.panelState.practiceSetupCollapsed,
  getMelodySetupCollapsed: () => mocked.panelState.melodySetupCollapsed,
  getSessionToolsCollapsed: () => mocked.panelState.sessionToolsCollapsed,
  setPracticeSetupCollapsed: (value: boolean) => {
    mocked.panelState.practiceSetupCollapsed = value;
  },
  setMelodySetupCollapsed: (value: boolean) => {
    mocked.panelState.melodySetupCollapsed = value;
  },
  setSessionToolsCollapsed: (value: boolean) => {
    mocked.panelState.sessionToolsCollapsed = value;
  },
  setUiMode: mocked.setUiMode,
  setUiWorkflow: mocked.setUiWorkflow,
}));
vi.mock('./constants', () => ({ DEFAULT_A4_FREQUENCY: 440 }));
vi.mock('./audio', () => ({ loadInstrumentSoundfont: mocked.loadInstrumentSoundfont }));
vi.mock('./instruments', () => ({
  instruments: {
    guitar: { name: 'guitar', STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] },
    ukulele: { name: 'ukulele', STRING_ORDER: ['G', 'C', 'E', 'A'] },
  },
}));
vi.mock('./fretboard-ui-state', () => ({
  getEnabledStrings: () => new Set(['E', 'A']),
}));
vi.mock('./note-display', () => ({
  normalizeNoteNamingPreference: (value: unknown) => (value === 'flats' ? 'flats' : 'sharps'),
  setNoteNamingPreference: mocked.setNoteNamingPreference,
}));
vi.mock('./tuning-presets', () => ({
  getDefaultTuningPresetKey: () => 'standard',
}));
vi.mock('./session-pace', () => ({
  normalizeSessionPace: (value: unknown) =>
    value === 'slow' || value === 'fast' || value === 'ultra' ? value : 'normal',
}));
vi.mock('./audio-input-devices', () => ({
  normalizeAudioInputDeviceId: (value: unknown) => (typeof value === 'string' ? value : null),
  setPreferredAudioInputDeviceId: mocked.setPreferredAudioInputDeviceId,
}));
vi.mock('./mic-input-sensitivity', () => ({
  normalizeMicSensitivityPreset: (value: unknown) =>
    value === 'quiet_room' || value === 'noisy_room' || value === 'auto' ? value : 'normal',
}));
vi.mock('./mic-note-attack-filter', () => ({
  normalizeMicNoteAttackFilterPreset: (value: unknown) =>
    value === 'off' || value === 'strong' ? value : 'balanced',
}));
vi.mock('./mic-note-hold-filter', () => ({
  normalizeMicNoteHoldFilterPreset: (value: unknown) =>
    value === 'off' || value === '80ms' || value === '120ms' ? value : '40ms',
}));
vi.mock('./mic-polyphonic-detector', () => ({
  normalizeMicPolyphonicDetectorProvider: (value: unknown) =>
    typeof value === 'string' && value.trim().length > 0 ? value : 'auto',
}));
vi.mock('./midi-runtime', () => ({
  normalizeInputSource: (value: unknown) => (value === 'midi' ? 'midi' : 'microphone'),
  normalizeMidiInputDeviceId: (value: unknown) => (typeof value === 'string' ? value : null),
  setInputSourcePreference: mocked.setInputSourcePreference,
  setPreferredMidiInputDeviceId: mocked.setPreferredMidiInputDeviceId,
}));
vi.mock('./melody-transposition', () => ({
  formatMelodyTransposeSemitones: (value: number) => String(value),
  normalizeMelodyTransposeSemitones: (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  },
}));
vi.mock('./melody-string-shift', () => ({
  formatMelodyStringShift: (value: number) => String(value),
  normalizeMelodyStringShift: (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  },
}));
vi.mock('./melody-timeline-duration', () => ({
  clampMelodyPlaybackBpm: (value: unknown) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return 90;
    return Math.min(220, Math.max(40, parsed));
  },
}));
vi.mock('./curriculum-presets', () => ({
  getCurriculumPresetDefinitions: () => [
    { key: 'custom', description: '' },
    { key: 'beginner_essentials', description: 'Core note-reading path.' },
  ],
}));

function createStorage(initial?: Record<string, string>) {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    dump: () => Object.fromEntries(map.entries()),
  };
}

const storageModule = await import('./storage');

function resetMockState() {
  mocked.dom.showAllNotes.checked = false;
  mocked.dom.showStringToggles.checked = false;
  mocked.dom.autoPlayPromptSound.checked = true;
  mocked.dom.promptSoundTail.value = '450';
  mocked.dom.promptSoundTailValue.textContent = '450 ms';
  mocked.dom.relaxPerformanceOctaveCheck.checked = true;
  mocked.dom.performanceMicTolerancePreset.value = 'normal';
  mocked.dom.performanceTimingLeniencyPreset.value = 'normal';
  mocked.dom.performanceMicLatencyCompensation.value = '0';
  mocked.dom.performanceMicLatencyCompensationExact.value = '0';
  mocked.dom.performanceMicLatencyCompensationValue.textContent = '';
  mocked.dom.difficulty.value = 'natural';
  mocked.dom.noteNaming.value = 'sharps';
  mocked.dom.melodyFingeringStrategy.value = 'minimax';
  mocked.dom.melodyFingeringLevel.value = 'beginner';
  mocked.dom.startFret.value = '0';
  mocked.dom.endFret.value = '20';
  mocked.dom.trainingMode.value = 'random';
  mocked.dom.sessionGoal.value = 'none';
  mocked.dom.metronomeEnabled.checked = false;
  mocked.dom.metronomeBpm.value = '80';
  mocked.dom.metronomeVolume.value = '100';
  mocked.dom.metronomeVolumeValue.textContent = '100%';
  mocked.dom.rhythmTimingWindow.value = 'normal';
  mocked.dom.scaleSelector.value = 'C Major';
  mocked.dom.chordSelector.value = 'C';
  mocked.dom.randomizeChords.checked = false;
  mocked.dom.progressionSelector.value = 'I-IV-V';
  mocked.dom.arpeggioPatternSelector.value = 'ascending';
  mocked.dom.curriculumPreset.value = 'custom';
  mocked.dom.curriculumPresetInfo.textContent = '';
  mocked.dom.curriculumPresetInfo.classList.toggle('hidden', true);
  mocked.dom.melodySelector.value = '';
  mocked.dom.melodyShowNote.checked = true;
  mocked.dom.melodyShowTabTimeline.checked = true;
  mocked.dom.melodyShowScrollingTab.checked = true;
  mocked.dom.melodyTimelineZoom.value = '100';
  mocked.dom.melodyTimelineZoomValue.textContent = '';
  mocked.dom.melodyDemoBpm.value = '90';
  mocked.dom.melodyDemoBpmValue.textContent = '';
  mocked.dom.melodyFingeringStrategyQuick.value = 'minimax';
  mocked.dom.melodyLoopRange.checked = false;
  mocked.dom.melodyTranspose.value = '0';
  mocked.dom.melodyStringShift.value = '0';
  mocked.dom.studyMelodyMicGatePercent.value = '85';
  mocked.dom.studyMelodyMicGatePercentValue.textContent = '';
  mocked.dom.studyMelodyMicNoiseGuardPercent.value = '100';
  mocked.dom.studyMelodyMicNoiseGuardPercentValue.textContent = '';
  mocked.dom.studyMelodyMicSilenceResetFrames.value = '0';
  mocked.dom.studyMelodyMicSilenceResetFramesValue.textContent = '';
  mocked.dom.studyMelodyMicStableFrames.value = '0';
  mocked.dom.studyMelodyMicStableFramesValue.textContent = '';
  mocked.dom.studyMelodyPreEmphasisFrequencyHz.value = '300';
  mocked.dom.studyMelodyPreEmphasisFrequencyHzValue.textContent = '';
  mocked.dom.studyMelodyPreEmphasisGainDb.value = '5';
  mocked.dom.studyMelodyPreEmphasisGainDbValue.textContent = '';

  mocked.state.currentInstrument = { name: 'guitar', STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] };
  mocked.state.currentTuningPresetKey = 'standard';
  mocked.state.melodyTimelineViewMode = 'classic';
  mocked.state.melodyFingeringStrategy = 'minimax';
  mocked.state.melodyFingeringLevel = 'beginner';
  mocked.state.showMelodyTimelineSteps = false;
  mocked.state.showMelodyTimelineDetails = false;
  mocked.state.inputSource = 'microphone';
  mocked.state.isDirectInputMode = false;
  mocked.state.preferredAudioInputDeviceId = null;
  mocked.state.micSensitivityPreset = 'normal';
  mocked.state.micNoteAttackFilterPreset = 'balanced';
  mocked.state.micNoteHoldFilterPreset = '40ms';
  mocked.state.micPolyphonicDetectorProvider = 'auto';
  mocked.state.micAutoNoiseFloorRms = null;
  mocked.state.preferredMidiInputDeviceId = null;
  mocked.state.sessionPace = 'normal';
  mocked.state.melodyTransposeById = {};
  mocked.state.melodyPlaybackBpmById = {};
  mocked.state.melodyStringShiftById = {};
  mocked.state.melodyStudyRangeById = {};
  mocked.state.melodyLoopRangeEnabled = false;
  mocked.state.showMelodyTabTimeline = true;
  mocked.state.showScrollingTabPanel = true;
  mocked.state.melodyTimelineZoomPercent = 100;
  mocked.state.melodyTransposeSemitones = 0;
  mocked.state.melodyStringShift = 0;
  mocked.state.calibratedA4 = 440;
  mocked.state.audioCache = { guitar: {} as object };
  mocked.state.preferredMelodyId = null;
  mocked.state.showingAllNotes = false;
  mocked.state.autoPlayPromptSound = true;
  mocked.state.promptSoundTailMs = 450;
  mocked.state.relaxPerformanceOctaveCheck = true;
  mocked.state.performanceMicTolerancePreset = 'normal';
  mocked.state.performanceTimingLeniencyPreset = 'normal';
  mocked.state.performanceMicLatencyCompensationMs = 0;
  mocked.state.uiMode = 'simple';
  mocked.state.studyMelodyMicGatePercent = 85;
  mocked.state.studyMelodyMicNoiseGuardPercent = 100;
  mocked.state.studyMelodyMicSilenceResetFrames = 0;
  mocked.state.studyMelodyMicStableFrames = 0;
  mocked.state.studyMelodyPreEmphasisFrequencyHz = 300;
  mocked.state.studyMelodyPreEmphasisGainDb = 5;
  mocked.dom.micDirectInputMode.checked = false;
  mocked.panelState.practiceSetupCollapsed = false;
  mocked.panelState.melodySetupCollapsed = false;
  mocked.panelState.sessionToolsCollapsed = true;

  vi.clearAllMocks();
}

describe('storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('window', { innerWidth: 1280 });
    resetMockState();
  });

  it('persists changes for the implicit Default Settings profile', () => {
    mocked.dom.trainingMode.value = 'performance';
    mocked.state.uiWorkflow = 'perform';
    mocked.dom.curriculumPreset.value = 'beginner_essentials';
    mocked.dom.melodyDemoBpm.value = '132';
    mocked.dom.melodyFingeringStrategy.value = 'minimax';
    mocked.dom.melodyFingeringLevel.value = 'intermediate';
    mocked.state.melodyFingeringStrategy = 'minimax';
    mocked.state.melodyFingeringLevel = 'intermediate';
    mocked.dom.melodyTimelineZoom.value = '135';
    mocked.dom.melodySelector.value = 'ode-to-joy';
    mocked.state.showMelodyTabTimeline = false;
    mocked.state.showScrollingTabPanel = false;
    mocked.state.melodyPlaybackBpmById = { 'builtin:guitar:ode_to_joy_intro': 108 };
    mocked.dom.performanceTimingLeniencyPreset.value = 'forgiving';
    mocked.dom.performanceMicLatencyCompensation.value = '135';
    mocked.dom.micDirectInputMode.checked = true;
    mocked.panelState.practiceSetupCollapsed = true;
    mocked.panelState.melodySetupCollapsed = true;
    mocked.panelState.sessionToolsCollapsed = false;

    storageModule.saveSettings();

    const profiles = storageModule.getProfiles();
    expect(storageModule.getActiveProfileName()).toBe('__default__');
    expect(profiles.__default__).toMatchObject({
      trainingMode: 'performance',
      uiWorkflow: 'perform',
      curriculumPreset: 'beginner_essentials',
      melodyDemoBpm: '132',
      melodyShowTabTimeline: false,
      melodyShowScrollingTab: false,
      melodyTimelineZoomPercent: 135,
      melodyPlaybackBpmById: { 'builtin:guitar:ode_to_joy_intro': 108 },
      selectedMelodyId: 'ode-to-joy',
      melodyFingeringStrategy: 'minimax',
      melodyFingeringLevel: 'intermediate',
      performanceTimingLeniencyPreset: 'forgiving',
      performanceMicLatencyCompensationMs: 135,
      promptSoundTailMs: 450,
      uiMode: 'simple',
      studyMelodyMicGatePercent: 85,
      studyMelodyMicNoiseGuardPercent: 100,
      studyMelodyMicSilenceResetFrames: 0,
      studyMelodyMicStableFrames: 0,
      studyMelodyPreEmphasisFrequencyHz: 300,
      studyMelodyPreEmphasisGainDb: 5,
      isDirectInputMode: true,
      practiceSetupCollapsed: true,
      melodySetupCollapsed: true,
      sessionToolsCollapsed: false,
    });
    expect(localStorage.getItem(PROFILES_KEY)).not.toBeNull();
  });

  it('loads saved Default Settings back into the UI on startup', async () => {
    localStorage.setItem(
      PROFILES_KEY,
      JSON.stringify({
        __default__: {
          trainingMode: 'performance',
          curriculumPreset: 'beginner_essentials',
          melodyDemoBpm: '150',
          melodyShowTabTimeline: false,
          melodyShowScrollingTab: false,
          melodyTimelineZoomPercent: 145,
          showAllNotes: true,
          autoPlayPromptSound: false,
          promptSoundTailMs: 725,
          relaxPerformanceOctaveCheck: false,
          performanceMicTolerancePreset: 'forgiving',
          performanceTimingLeniencyPreset: 'strict',
          performanceMicLatencyCompensationMs: 125,
          uiMode: 'advanced',
          isDirectInputMode: true,
          noteNaming: 'flats',
          melodyFingeringStrategy: 'heuristic',
          melodyFingeringLevel: 'advanced',
          selectedMelodyId: 'ode-to-joy',
          melodyPlaybackBpmById: { 'builtin:guitar:ode_to_joy_intro': 108 },
          practiceSetupCollapsed: true,
          melodySetupCollapsed: true,
          sessionToolsCollapsed: false,
        },
      })
    );
    localStorage.removeItem(ACTIVE_PROFILE_KEY);

    await storageModule.loadSettings();

    expect(mocked.dom.trainingMode.value).toBe('performance');
    expect(mocked.state.uiWorkflow).toBe('perform');
    expect(mocked.dom.curriculumPreset.value).toBe('beginner_essentials');
    expect(mocked.dom.curriculumPresetInfo.textContent).toBe('Core note-reading path.');
    expect(mocked.dom.curriculumPresetInfo.classList.contains('hidden')).toBe(false);
    expect(mocked.dom.melodyDemoBpm.value).toBe('150');
    expect(mocked.dom.melodyDemoBpmValue.textContent).toBe('150');
    expect(mocked.dom.melodyShowTabTimeline.checked).toBe(false);
    expect(mocked.dom.melodyShowScrollingTab.checked).toBe(false);
    expect(mocked.dom.melodyTimelineZoom.value).toBe('145');
    expect(mocked.dom.melodyTimelineZoomValue.textContent).toBe('145%');
    expect(mocked.dom.showAllNotes.checked).toBe(true);
    expect(mocked.dom.autoPlayPromptSound.checked).toBe(false);
    expect(mocked.dom.promptSoundTail.value).toBe('725');
    expect(mocked.dom.promptSoundTailValue.textContent).toBe('725 ms');
    expect(mocked.dom.relaxPerformanceOctaveCheck.checked).toBe(false);
    expect(mocked.dom.performanceMicTolerancePreset.value).toBe('forgiving');
    expect(mocked.dom.performanceTimingLeniencyPreset.value).toBe('strict');
    expect(mocked.dom.performanceMicLatencyCompensation.value).toBe('125');
    expect(mocked.dom.performanceMicLatencyCompensationExact.value).toBe('125');
    expect(mocked.dom.performanceMicLatencyCompensationValue.textContent).toBe('125 ms');
    expect(mocked.dom.micDirectInputMode.checked).toBe(true);
    expect(mocked.dom.noteNaming.value).toBe('flats');
    expect(mocked.dom.melodyFingeringStrategy.value).toBe('minimax');
    expect(mocked.dom.melodyFingeringLevel.value).toBe('advanced');
    expect(mocked.dom.melodyFingeringStrategyQuick.value).toBe('minimax');
    expect(mocked.state.melodyTimelineZoomPercent).toBe(145);
    expect(mocked.state.showMelodyTabTimeline).toBe(false);
    expect(mocked.state.showScrollingTabPanel).toBe(false);
    expect(mocked.state.melodyPlaybackBpmById).toEqual({ 'builtin:guitar:ode_to_joy_intro': 108 });
    expect(mocked.state.performanceMicLatencyCompensationMs).toBe(125);
    expect(mocked.state.uiMode).toBe('advanced');
    expect(mocked.state.melodyFingeringStrategy).toBe('minimax');
    expect(mocked.state.melodyFingeringLevel).toBe('advanced');
    expect(mocked.state.isDirectInputMode).toBe(true);
    expect(mocked.panelState.practiceSetupCollapsed).toBe(true);
    expect(mocked.panelState.melodySetupCollapsed).toBe(true);
    expect(mocked.panelState.sessionToolsCollapsed).toBe(false);
    expect(mocked.setUiWorkflow).toHaveBeenCalledWith('perform');
    expect(mocked.setUiMode).toHaveBeenCalledWith('advanced');
    expect(mocked.ui.populateProfileSelector).toHaveBeenCalledTimes(1);
  });

  it('uses melody mode with Ode to Joy on first launch when no profile exists', async () => {
    localStorage.removeItem(PROFILES_KEY);
    localStorage.removeItem(ACTIVE_PROFILE_KEY);

    await storageModule.loadSettings();

    expect(mocked.dom.trainingMode.value).toBe('melody');
    expect(mocked.state.preferredMelodyId).toBe('builtin:guitar:ode_to_joy_intro');
  });
});







