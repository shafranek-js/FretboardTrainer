import { GUITAR_BUILTIN_ASCII_TAB_MELODIES } from './guitar';
import { UKULELE_BUILTIN_ASCII_TAB_MELODIES } from './ukulele';

export type {
  BuiltinAsciiTabMelodySpec,
  BuiltinMelodyEventNoteSpec,
  BuiltinMelodyEventSpec,
  BuiltinMonophonicStepSpec,
} from './types';

export const BUILTIN_ASCII_TAB_MELODIES = [
  ...GUITAR_BUILTIN_ASCII_TAB_MELODIES,
  ...UKULELE_BUILTIN_ASCII_TAB_MELODIES,
];
