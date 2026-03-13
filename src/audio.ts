/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Soundfont from 'soundfont-player';
import { state, type AppState } from './state';
import { VOLUME_THRESHOLD } from './constants';
import { freqToNoteNameFromA4, freqToScientificNoteNameFromA4 } from './music-theory';
import { setLoadingState } from './ui';
import { detectPitchYin } from './dsp/pitch';
import { showNonBlockingInfo } from './app-feedback';
import { getPromptAudioInputIgnoreMs } from './session-pace';
import { getPromptSoundTailDurationSec } from './prompt-sound-tail';
import {
  DEFAULT_YIN_MAX_FREQUENCY,
  DEFAULT_YIN_MIN_FREQUENCY,
  resolvePitchYinOptions,
  type PitchDetectionOptions,
} from './pitch-detection-options';

type NoteNamingState = Pick<AppState, 'calibratedA4'>;
type SoundfontPlaybackState = Pick<
  AppState,
  | 'audioCache'
  | 'audioContext'
  | 'isLoadingSamples'
  | 'currentInstrument'
  | 'isListening'
  | 'isCalibrating'
  | 'inputSource'
  | 'isDirectInputMode'
  | 'ignorePromptAudioUntilMs'
  | 'currentPrompt'
  | 'sessionPace'
  | 'promptSoundTailMs'
>;

const noteNamingState: NoteNamingState = state;
const soundfontPlaybackState: SoundfontPlaybackState = state;

/** Converts a frequency in Hz to the closest musical note name. */
export function freqToNoteName(freq: number): string | null {
  return freqToNoteNameFromA4(freq, noteNamingState.calibratedA4);
}

/** Converts a frequency in Hz to the closest scientific note name (e.g. E2). */
export function freqToScientificNoteName(freq: number): string | null {
  return freqToScientificNoteNameFromA4(freq, noteNamingState.calibratedA4);
}

/** Detects pitch in monophonic input (YIN algorithm). */
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  volumeThreshold = VOLUME_THRESHOLD,
  options: PitchDetectionOptions = {}
): number {
  const rms = Math.sqrt(buffer.reduce((acc, val) => acc + val * val, 0) / buffer.length);
  if (rms < volumeThreshold) return 0;

  const focusedOptions = resolvePitchYinOptions(options);
  const focusedFrequency = detectPitchYin(buffer, sampleRate, focusedOptions);
  if (focusedFrequency > 0) return focusedFrequency;

  if (
    focusedOptions.minFrequency === DEFAULT_YIN_MIN_FREQUENCY &&
    focusedOptions.maxFrequency === DEFAULT_YIN_MAX_FREQUENCY
  ) {
    return 0;
  }
  return detectPitchYin(buffer, sampleRate);
}

/** Loads and caches the soundfont for the specified instrument. */
export async function loadInstrumentSoundfont(instrumentName: 'guitar' | 'ukulele') {
  if (soundfontPlaybackState.audioCache[instrumentName]) {
    return;
  }
  if (!soundfontPlaybackState.audioContext || soundfontPlaybackState.audioContext.state === 'closed') {
    const audioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioContextCtor) {
      throw new Error('Web Audio API is not supported in this browser.');
    }
    soundfontPlaybackState.audioContext = new audioContextCtor();
  }

  const instrumentNameMap = {
    guitar: 'acoustic_guitar_nylon',
    ukulele: 'acoustic_guitar_nylon',
  };

  setLoadingState(true);
  try {
    const player = await Soundfont.instrument(
      soundfontPlaybackState.audioContext,
      instrumentNameMap[instrumentName]
    );
    soundfontPlaybackState.audioCache[instrumentName] = player;
  } catch (error) {
    console.error(`Failed to load soundfont for ${instrumentName}:`, error);
    showNonBlockingInfo(
      `Sound for ${instrumentName} could not be loaded. You can continue without sound playback.`
    );
  } finally {
    setLoadingState(false);
  }
}

/** Plays a single note or a chord using the loaded Soundfont player. */
export function playSound(notesToPlay: string | string[]) {
  if (!soundfontPlaybackState.audioContext || soundfontPlaybackState.isLoadingSamples) return;

  const player = soundfontPlaybackState.audioCache[soundfontPlaybackState.currentInstrument.name];
  if (!player) {
    console.warn(
      `Soundfont for ${soundfontPlaybackState.currentInstrument.name} not loaded yet.`
    );
    return;
  }

  try {
    if (
      soundfontPlaybackState.isListening &&
      !soundfontPlaybackState.isCalibrating &&
      soundfontPlaybackState.inputSource !== 'midi'
    ) {
      if (soundfontPlaybackState.isDirectInputMode) {
        soundfontPlaybackState.ignorePromptAudioUntilMs = 0;
      } else {
        const eventDurationMs = soundfontPlaybackState.currentPrompt?.melodyEventDurationMs ?? null;
        soundfontPlaybackState.ignorePromptAudioUntilMs =
          Date.now() + getPromptAudioInputIgnoreMs(soundfontPlaybackState.sessionPace, eventDurationMs);
      }
    }

    const time = soundfontPlaybackState.audioContext.currentTime;
    const notes = Array.isArray(notesToPlay) ? notesToPlay : [notesToPlay];
    const duration = getPromptSoundTailDurationSec(soundfontPlaybackState.promptSoundTailMs);
    notes.forEach((note) => {
      player.play(note, time, { gain: 1.5, duration });
    });
  } catch (error) {
    console.error('Error playing soundfont sound:', error);
  }
}
