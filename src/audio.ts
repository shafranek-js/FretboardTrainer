/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { dom, state } from './state';
import { ALL_NOTES, VOLUME_THRESHOLD } from './constants';
import { setLoadingState } from './ui';

// This makes TypeScript aware of the Soundfont global object from the CDN script.
declare const Soundfont: any;

/** Converts a frequency in Hz to the closest musical note name. */
export function freqToNoteName(freq: number): string | null {
    if (freq <= 0) return null;
    const n = Math.round(12 * Math.log2(freq / state.calibratedA4));
    const noteIndex = (n + 9 + 12) % 12;
    return ALL_NOTES[noteIndex];
}

/** A simplified pitch detection algorithm using autocorrelation. */
export function detectPitch(buffer: Float32Array, sampleRate: number): number {
    const rms = Math.sqrt(buffer.reduce((acc, val) => acc + val * val, 0) / buffer.length);
    if (rms < VOLUME_THRESHOLD) return 0;

    const SIZE = buffer.length;
    const correlations = new Array(SIZE).fill(0);

    for (let lag = 0; lag < SIZE; lag++) {
        for (let i = 0; i < SIZE - lag; i++) {
            correlations[lag] += buffer[i] * buffer[i + lag];
        }
    }

    let d = 0;
    while (d < SIZE - 1 && correlations[d] > correlations[d + 1]) d++;

    let maxVal = -1, maxPos = -1;
    for (let i = d; i < SIZE; i++) {
        if (correlations[i] > maxVal) {
            maxVal = correlations[i];
            maxPos = i;
        }
    }

    if (maxPos === -1 || maxVal < rms * rms * SIZE * 0.3) return 0;

    if (maxPos > 0 && maxPos < SIZE - 1) {
        const [x1, x2, x3] = [correlations[maxPos - 1], correlations[maxPos], correlations[maxPos + 1]];
        const a = (x1 + x3 - 2 * x2) / 2;
        const b = (x3 - x1) / 2;
        if (a !== 0) maxPos -= b / (2 * a);
    }

    return sampleRate / maxPos;
}

/** Loads and caches the soundfont for the specified instrument. */
export async function loadInstrumentSoundfont(instrumentName: 'guitar' | 'ukulele') {
    if (state.audioCache[instrumentName]) {
        return; // Already loaded
    }
    if (!state.audioContext || state.audioContext.state === 'closed') {
        state.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const instrumentNameMap = {
        guitar: 'acoustic_guitar_nylon',
        // The default soundfont does not have a 'ukulele' instrument.
        // 'acoustic_guitar_nylon' is a good-sounding substitute.
        ukulele: 'acoustic_guitar_nylon'
    };
    
    setLoadingState(true);
    try {
        const player = await Soundfont.instrument(state.audioContext, instrumentNameMap[instrumentName]);
        state.audioCache[instrumentName] = player;
    } catch (error) {
        console.error(`Failed to load soundfont for ${instrumentName}:`, error);
        alert(`Sorry, the sound for the ${instrumentName} could not be loaded. You can continue without sound playback.`);
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
        notes.forEach(note => {
            player.play(note, time, { gain: 1.5 });
        });
    } catch (error) {
        console.error("Error playing soundfont sound:", error);
    }
}