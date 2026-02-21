/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Guitar } from './guitar';
import { Ukulele } from './ukulele';
import { IInstrument } from './instrument';

/**
 * A centralized map of all available instrument instances.
 * This allows the application to easily switch between instruments
 * by referencing them by name (e.g., instruments['guitar']).
 */
export const instruments: { [key: string]: IInstrument } = {
  guitar: new Guitar(),
  ukulele: new Ukulele(),
};
