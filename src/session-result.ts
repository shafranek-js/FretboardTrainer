import { calculateTriadIntervals } from './music-theory';
import type { Prompt } from './types';

export interface InfoSlotsView {
  slot1: string;
  slot2: string;
  slot3: string;
}

const EMPTY_INFO_SLOTS: InfoSlotsView = {
  slot1: '',
  slot2: '',
  slot3: '',
};

export function buildSuccessInfoSlots(prompt: Prompt): InfoSlotsView {
  const { targetNote, targetString, baseChordName, targetChordNotes } = prompt;

  if (baseChordName && targetChordNotes.length > 0) {
    return {
      slot1: baseChordName,
      slot2: targetChordNotes.join(' - '),
      slot3: '',
    };
  }

  if (targetNote && targetString) {
    const intervals = calculateTriadIntervals(targetNote);
    return {
      slot1: `Note: ${targetNote} on ${targetString}`,
      slot2: `Maj 3rd: ${intervals.majorThird}`,
      slot3: `Perf 5th: ${intervals.perfectFifth}`,
    };
  }

  return EMPTY_INFO_SLOTS;
}

export function calculateTimedPoints(elapsedSeconds: number): number {
  return Math.max(10, 100 - Math.floor(elapsedSeconds * 10));
}
