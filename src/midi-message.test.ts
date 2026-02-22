import { describe, expect, it } from 'vitest';
import { midiNoteNumberToPitchClass, parseMidiMessageData } from './midi-message';

describe('midi-message', () => {
  it('converts MIDI note number to pitch class', () => {
    expect(midiNoteNumberToPitchClass(60)).toBe('C');
    expect(midiNoteNumberToPitchClass(61)).toBe('C#');
    expect(midiNoteNumberToPitchClass(69)).toBe('A');
    expect(midiNoteNumberToPitchClass(-1)).toBe('B');
  });

  it('parses note-on and tracks held notes', () => {
    const held = new Set<number>();

    const c4 = parseMidiMessageData(Uint8Array.from([0x90, 60, 100]), 123, held);
    expect(c4).toEqual({
      kind: 'noteon',
      noteNumber: 60,
      noteName: 'C',
      velocity: 100,
      timestampMs: 123,
      heldNoteNames: ['C'],
    });

    const e4 = parseMidiMessageData(Uint8Array.from([0x90, 64, 90]), 124, held);
    expect(e4?.kind).toBe('noteon');
    expect(e4?.noteName).toBe('E');
    expect(e4?.heldNoteNames).toEqual(['C', 'E']);
  });

  it('treats note-on velocity 0 as note-off', () => {
    const held = new Set<number>([60, 64]);

    const event = parseMidiMessageData(Uint8Array.from([0x90, 64, 0]), 125, held);
    expect(event).toEqual({
      kind: 'noteoff',
      noteNumber: 64,
      noteName: 'E',
      velocity: 0,
      timestampMs: 125,
      heldNoteNames: ['C'],
    });
  });

  it('parses explicit note-off and ignores unrelated messages', () => {
    const held = new Set<number>([60]);

    expect(parseMidiMessageData(Uint8Array.from([0xb0, 7, 100]), 130, held)).toBeNull();

    const off = parseMidiMessageData(Uint8Array.from([0x80, 60, 0]), 131, held);
    expect(off?.kind).toBe('noteoff');
    expect(off?.heldNoteNames).toEqual([]);
  });
});
