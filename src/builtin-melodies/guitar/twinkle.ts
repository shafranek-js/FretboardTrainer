import { buildBuiltinAsciiTabFromEvents, buildMonophonicBuiltinEvents } from '../helpers';
import type { BuiltinAsciiTabMelodySpec, BuiltinMonophonicStepSpec } from '../types';

const GUITAR_TWINKLE_STEPS: BuiltinMonophonicStepSpec[] = [
  ['B', 1], ['B', 1], ['e', 3], ['e', 3], ['e', 5], ['e', 5], ['e', 3, 2],
  ['e', 1], ['e', 1], ['e', 0], ['e', 0], ['B', 3], ['B', 3], ['B', 1, 2],
  ['e', 3], ['e', 3], ['e', 1], ['e', 1], ['e', 0], ['e', 0], ['B', 3, 2],
  ['e', 3], ['e', 3], ['e', 1], ['e', 1], ['e', 0], ['e', 0], ['B', 3, 2],
  ['B', 1], ['B', 1], ['e', 3], ['e', 3], ['e', 5], ['e', 5], ['e', 3, 2],
  ['e', 1], ['e', 1], ['e', 0], ['e', 0], ['B', 3], ['B', 3], ['B', 1, 2],
];

const GUITAR_TWINKLE_EVENTS = buildMonophonicBuiltinEvents(GUITAR_TWINKLE_STEPS);

export const GUITAR_TWINKLE_MELODY: BuiltinAsciiTabMelodySpec = {
  id: 'builtin:guitar:twinkle_phrase',
  name: 'Twinkle Twinkle Little Star',
  instrumentName: 'guitar',
  tabText: buildBuiltinAsciiTabFromEvents('guitar', GUITAR_TWINKLE_EVENTS),
  events: GUITAR_TWINKLE_EVENTS,
  sourceTempoBpm: 100,
};
