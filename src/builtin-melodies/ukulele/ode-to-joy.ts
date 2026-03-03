import { buildBuiltinAsciiTabFromEvents, buildBuiltinStepsFromPattern, buildMonophonicBuiltinEvents } from '../helpers';
import type { BuiltinAsciiTabMelodySpec } from '../types';

const ODE_TO_JOY_PATTERN: ReadonlyArray<readonly [noteKey: string, durationBeats?: number]> = [
  ['B4'], ['B4'], ['C5'], ['D5'],
  ['D5'], ['C5'], ['B4'], ['A4'],
  ['G4'], ['G4'], ['A4'], ['B4'],
  ['B4', 1.5], ['A4', 0.5], ['A4', 2],
  ['B4'], ['B4'], ['C5'], ['D5'],
  ['D5'], ['C5'], ['B4'], ['A4'],
  ['G4'], ['G4'], ['A4'], ['B4'],
  ['A4', 1.5], ['G4', 0.5], ['G4', 2],
  ['A4'], ['A4'], ['B4'], ['G4'],
  ['A4'], ['B4'], ['C5', 0.5], ['B4', 0.5], ['G4'],
  ['A4'], ['B4'], ['C5', 0.5], ['B4', 0.5], ['A4'],
  ['G4'], ['A4'], ['D4', 2],
  ['B4'], ['B4'], ['C5'], ['D5'],
  ['D5'], ['C5'], ['B4'], ['A4'],
  ['G4'], ['G4'], ['A4'], ['B4'],
  ['A4', 1.5], ['G4', 0.5], ['G4', 2],
];

const UKULELE_ODE_TO_JOY_NOTE_MAP = {
  D4: ['C', 2],
  G4: ['G', 0],
  A4: ['A', 0],
  B4: ['A', 2],
  C5: ['A', 3],
  D5: ['A', 5],
} as const satisfies Record<string, readonly [string, number]>;

const UKULELE_ODE_TO_JOY_STEPS = buildBuiltinStepsFromPattern(
  ODE_TO_JOY_PATTERN,
  UKULELE_ODE_TO_JOY_NOTE_MAP
);

const UKULELE_ODE_TO_JOY_EVENTS = buildMonophonicBuiltinEvents(UKULELE_ODE_TO_JOY_STEPS);

export const UKULELE_ODE_TO_JOY_MELODY: BuiltinAsciiTabMelodySpec = {
  id: 'builtin:ukulele:ode_to_joy_intro',
  name: 'Ode to Joy',
  instrumentName: 'ukulele',
  tabText: buildBuiltinAsciiTabFromEvents('ukulele', UKULELE_ODE_TO_JOY_EVENTS),
  events: UKULELE_ODE_TO_JOY_EVENTS,
  sourceTempoBpm: 140,
};
