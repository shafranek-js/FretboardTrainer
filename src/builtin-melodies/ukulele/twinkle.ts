import { buildBuiltinAsciiTabFromEvents, buildMonophonicBuiltinEvents } from '../helpers';
import type { BuiltinAsciiTabMelodySpec, BuiltinMonophonicStepSpec } from '../types';

const UKULELE_TWINKLE_STEPS: BuiltinMonophonicStepSpec[] = [
  ['A', 3], ['A', 3], ['E', 3], ['E', 3], ['A', 0], ['A', 0], ['E', 3, 2],
  ['E', 1], ['E', 1], ['E', 0], ['E', 0], ['C', 2], ['C', 2], ['A', 3, 2],
  ['E', 3], ['E', 3], ['E', 1], ['E', 1], ['E', 0], ['E', 0], ['C', 2, 2],
  ['E', 3], ['E', 3], ['E', 1], ['E', 1], ['E', 0], ['E', 0], ['C', 2, 2],
  ['A', 3], ['A', 3], ['E', 3], ['E', 3], ['A', 0], ['A', 0], ['E', 3, 2],
  ['E', 1], ['E', 1], ['E', 0], ['E', 0], ['C', 2], ['C', 2], ['A', 3, 2],
];

const UKULELE_TWINKLE_EVENTS = buildMonophonicBuiltinEvents(UKULELE_TWINKLE_STEPS);

export const UKULELE_TWINKLE_MELODY: BuiltinAsciiTabMelodySpec = {
  id: 'builtin:ukulele:twinkle_phrase',
  name: 'Twinkle Twinkle Little Star',
  instrumentName: 'ukulele',
  tabText: buildBuiltinAsciiTabFromEvents('ukulele', UKULELE_TWINKLE_EVENTS),
  events: UKULELE_TWINKLE_EVENTS,
  sourceTempoBpm: 100,
};
