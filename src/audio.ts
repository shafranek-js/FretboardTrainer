/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Soundfont from 'soundfont-player';
import { state } from './state';
import { VOLUME_THRESHOLD } from './constants';
import { freqToNoteNameFromA4 } from './music-theory';
import { setLoadingState } from './ui';
import { detectPitchYin } from './dsp/pitch';

/** Converts a frequency in Hz to the closest musical note name. */
export function freqToNoteName(freq: number): string | null {
  return freqToNoteNameFromA4(freq, state.calibratedA4);
}

/** Detects pitch in monophonic input (YIN algorithm). */
export function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const rms = Math.sqrt(buffer.reduce((acc, val) => acc + val * val, 0) / buffer.length);
  if (rms < VOLUME_THRESHOLD) return 0;
  return detectPitchYin(buffer, sampleRate);
}

/** Loads and caches the soundfont for the specified instrument. */
export async function loadInstrumentSoundfont(instrumentName: 'guitar' | 'ukulele') {
  if (state.audioCache[instrumentName]) {
    return; // Already loaded
  }
  if (!state.audioContext || state.audioContext.state === 'closed') {
    const audioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioContextCtor) {
      throw new Error('Web Audio API is not supported in this browser.');
    }
    state.audioContext = new audioContextCtor();
  }

  const instrumentNameMap = {
    guitar: 'acoustic_guitar_nylon',
    // The default soundfont does not have a 'ukulele' instrument.
    // 'acoustic_guitar_nylon' is a good-sounding substitute.
    ukulele: 'acoustic_guitar_nylon',
  };

  setLoadingState(true);
  try {
    const player = await Soundfont.instrument(
      state.audioContext,
      instrumentNameMap[instrumentName]
    );
    state.audioCache[instrumentName] = player;
  } catch (error) {
    console.error(`Failed to load soundfont for ${instrumentName}:`, error);
    alert(
      `Sorry, the sound for the ${instrumentName} could not be loaded. You can continue without sound playback.`
    );
  } finally {
    setLoadingState(false);
  }
}

/** Plays a single note or a chord using the loaded Soundfont player. */
export function playSound(notesToPlay: string | string[]) {
  if (!state.audioContext || state.isLoadingSamples) return;

  const player = state.audioCache[state.currentInstrument.name];
  if (!player) {
    console.warn(`Soundfont for ${state.currentInstrument.name} not loaded yet.`);
    return;
  }

  try {
    const time = state.audioContext.currentTime;
    // The soundfont player should handle an array of notes for a chord, but it's
    // producing a "Buffer not found" warning. As a workaround, we can schedule
    // each note individually to play at the same time, which produces the same result.
    const notes = Array.isArray(notesToPlay) ? notesToPlay : [notesToPlay];
    notes.forEach((note) => {
      player.play(note, time, { gain: 1.5 });
    });
  } catch (error) {
    console.error('Error playing soundfont sound:', error);
  }
}
