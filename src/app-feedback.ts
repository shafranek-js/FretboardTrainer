/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { setResultMessage, setStatusText } from './ui-signals';

function getUnknownErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return 'Unknown error';
}

export function formatUserFacingError(prefix: string, error: unknown) {
  return `${prefix}: ${getUnknownErrorMessage(error)}`;
}

export function showNonBlockingError(message: string) {
  setStatusText(message);
  setResultMessage(message, 'error');
}

export function showNonBlockingInfo(message: string) {
  setStatusText(message);
  setResultMessage(message, 'neutral');
}
