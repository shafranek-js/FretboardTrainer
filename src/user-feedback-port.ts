/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type UserErrorReporter = (message: string) => void;
type UserConfirmHandler = (message: string) => boolean | Promise<boolean>;

let userErrorReporter: UserErrorReporter | null = null;
let userConfirmHandler: UserConfirmHandler | null = null;

export function setUserErrorReporter(reporter: UserErrorReporter | null) {
  userErrorReporter = reporter;
}

export function setUserConfirmHandler(handler: UserConfirmHandler | null) {
  userConfirmHandler = handler;
}

export function notifyUserError(message: string) {
  if (userErrorReporter) {
    userErrorReporter(message);
    return;
  }

  const globalWithAlert = globalThis as typeof globalThis & {
    alert?: (message?: string) => void;
  };
  if (typeof globalWithAlert.alert === 'function') {
    globalWithAlert.alert(message);
    return;
  }

  console.warn('User-facing error (no reporter configured):', message);
}

export async function confirmUserAction(message: string) {
  if (userConfirmHandler) {
    return Boolean(await userConfirmHandler(message));
  }

  const globalWithConfirm = globalThis as typeof globalThis & {
    confirm?: (message?: string) => boolean;
  };
  if (typeof globalWithConfirm.confirm === 'function') {
    return Boolean(globalWithConfirm.confirm(message));
  }

  console.warn('User-facing confirm requested (no handler configured):', message);
  return false;
}
