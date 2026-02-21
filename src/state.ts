/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Stats, Prompt } from './types';
import { DEFAULT_A4_FREQUENCY } from './constants';
import { IInstrument } from './instruments/instrument';
import { instruments } from './instruments';

// --- DOM ELEMENTS ---
export const dom = {
  showAllNotes: document.getElementById('showAllNotes') as HTMLInputElement,
  instrumentSelector: document.getElementById('instrumentSelector') as HTMLSelectElement,
  difficulty: document.getElementById('difficulty') as HTMLSelectElement,
  trainingMode: document.getElementById('trainingMode') as HTMLSelectElement,
  scaleSelectorContainer: document.getElementById('scaleSelectorContainer') as HTMLElement,
  scaleSelector: document.getElementById('scaleSelector') as HTMLSelectElement,
  chordSelectorContainer: document.getElementById('chordSelectorContainer') as HTMLElement,
  chordSelector: document.getElementById('chordSelector') as HTMLSelectElement,
  randomizeChords: document.getElementById('randomizeChords') as HTMLInputElement,
  progressionSelectorContainer: document.getElementById(
    'progressionSelectorContainer'
  ) as HTMLElement,
  progressionSelector: document.getElementById('progressionSelector') as HTMLSelectElement,
  arpeggioPatternContainer: document.getElementById('arpeggioPatternContainer') as HTMLElement,
  arpeggioPatternSelector: document.getElementById('arpeggioPatternSelector') as HTMLSelectElement,
  startFret: document.getElementById('startFret') as HTMLInputElement,
  endFret: document.getElementById('endFret') as HTMLInputElement,
  profileSelector: document.getElementById('profileSelector') as HTMLSelectElement,
  saveAsProfileBtn: document.getElementById('saveAsProfileBtn') as HTMLButtonElement,
  updateProfileBtn: document.getElementById('updateProfileBtn') as HTMLButtonElement,
  deleteProfileBtn: document.getElementById('deleteProfileBtn') as HTMLButtonElement,
  hintBtn: document.getElementById('hintBtn') as HTMLButtonElement,
  settingsBtn: document.getElementById('settingsBtn') as HTMLButtonElement,
  fretboard: document.querySelector('.fretboard') as HTMLElement,
  fretboardSvg: document.getElementById('fretboardSvg') as SVGSVGElement,
  infoSlot1: document.getElementById('infoSlot1')!,
  infoSlot2: document.getElementById('infoSlot2')!,
  infoSlot3: document.getElementById('infoSlot3')!,
  timedInfo: document.getElementById('timedInfo') as HTMLElement,
  timer: document.getElementById('timer') as HTMLElement,
  score: document.getElementById('score') as HTMLElement,
  prompt: document.getElementById('prompt')!,
  playSoundBtn: document.getElementById('playSoundBtn') as HTMLButtonElement,
  stringSelector: document.getElementById('fretboard-string-selector') as HTMLElement,
  startBtn: document.getElementById('startBtn') as HTMLButtonElement,
  stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
  result: document.getElementById('result')!,
  tunerDisplay: document.getElementById('tunerDisplay') as HTMLElement,
  tunerNeedle: document.getElementById('tunerNeedle') as HTMLElement,
  tunerCents: document.getElementById('tunerCents') as HTMLElement,
  volumeBar: document.getElementById('volumeBar')!,
  statusBar: document.getElementById('statusBar')!,
  loadingOverlay: document.getElementById('loadingOverlay') as HTMLElement,
  loadingMessage: document.getElementById('loadingMessage') as HTMLElement,
  settingsModal: document.getElementById('settingsModal') as HTMLElement,
  closeSettingsBtn: document.getElementById('closeSettingsBtn') as HTMLButtonElement,
  openCalibrateBtn: document.getElementById('openCalibrateBtn') as HTMLButtonElement,
  openStatsBtn: document.getElementById('openStatsBtn') as HTMLButtonElement,
  openGuideBtn: document.getElementById('openGuideBtn') as HTMLButtonElement,
  openLinksBtn: document.getElementById('openLinksBtn') as HTMLButtonElement,
  calibrationModal: document.getElementById('calibrationModal') as HTMLElement,
  calibrationProgress: document.getElementById('calibrationProgress') as HTMLElement,
  calibrationStatus: document.getElementById('calibrationStatus') as HTMLElement,
  cancelCalibrationBtn: document.getElementById('cancelCalibrationBtn') as HTMLButtonElement,
  statsModal: document.getElementById('statsModal') as HTMLElement,
  closeStatsBtn: document.getElementById('closeStatsBtn') as HTMLButtonElement,
  statsHighScore: document.getElementById('statsHighScore') as HTMLElement,
  statsAccuracy: document.getElementById('statsAccuracy') as HTMLElement,
  statsAvgTime: document.getElementById('statsAvgTime') as HTMLElement,
  statsProblemNotes: document.getElementById('statsProblemNotes') as HTMLElement,
  resetStatsBtn: document.getElementById('resetStatsBtn') as HTMLButtonElement,
  guideModal: document.getElementById('guideModal') as HTMLElement,
  closeGuideBtn: document.getElementById('closeGuideBtn') as HTMLButtonElement,
  linksModal: document.getElementById('linksModal') as HTMLElement,
  closeLinksBtn: document.getElementById('closeLinksBtn') as HTMLButtonElement,
  // Profile Name Modal
  profileNameModal: document.getElementById('profileNameModal') as HTMLElement,
  profileNameInput: document.getElementById('profileNameInput') as HTMLInputElement,
  confirmSaveProfileBtn: document.getElementById('confirmSaveProfileBtn') as HTMLButtonElement,
  cancelSaveProfileBtn: document.getElementById('cancelSaveProfileBtn') as HTMLButtonElement,
};

// --- APPLICATION STATE ---
export const state = {
  audioContext: null as AudioContext | null,
  analyser: null as AnalyserNode | null,
  microphone: null as MediaStreamAudioSourceNode | null,
  mediaStream: null as MediaStream | null,
  dataArray: null as Float32Array | null, // For monophonic (time domain)
  frequencyDataArray: null as Float32Array | null, // For polyphonic (frequency domain)
  isListening: false,
  animationId: 0,
  currentPrompt: null as Prompt | null,
  previousNote: null as string | null, // To avoid consecutive identical prompts
  startTime: 0,
  stableNoteCounter: 0,
  lastNote: null as string | null,
  lastDetectedChord: '',
  stableChordCounter: 0,
  consecutiveSilence: 0,
  lastPitches: [] as number[],
  showingAllNotes: false,
  cooldown: false,
  // --- Mode-specific state (managed by mode classes) ---
  scaleNotes: [] as { note: string; string: string }[],
  currentScaleIndex: 0,
  currentProgression: [] as string[],
  currentProgressionIndex: 0,
  currentArpeggioIndex: 0,
  // --- End mode-specific state ---
  targetFrequency: null as number | null,
  calibratedA4: DEFAULT_A4_FREQUENCY,
  isCalibrating: false,
  calibrationFrequencies: [] as number[],
  pendingTimeoutIds: new Set<number>(),
  timerId: null as number | null,
  timeLeft: 0,
  currentScore: 0,
  stats: {
    highScore: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    totalTime: 0,
    noteStats: {},
  } as Stats,
  currentInstrument: instruments.guitar as IInstrument,
  isLoadingSamples: false,
  audioCache: {} as Partial<Record<IInstrument['name'], SoundfontPlayer>>, // Loaded soundfont players by instrument
};
