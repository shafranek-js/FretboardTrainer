import { dom } from './dom';

export type ModalKey =
  | 'onboarding'
  | 'settings'
  | 'userData'
  | 'help'
  | 'quickHelp'
  | 'sessionSummary'
  | 'stats'
  | 'guide'
  | 'links'
  | 'profileName'
  | 'melodyImport';

export type ModalVisibilityState = Record<ModalKey, boolean>;

export interface ProfileActionsState {
  updateDisabled: boolean;
  deleteDisabled: boolean;
}

export interface CalibrationViewState {
  isVisible: boolean;
  progressPercent: number;
  statusText: string;
}

const modalElements: Record<ModalKey, HTMLElement> = {
  onboarding: dom.onboardingModal,
  settings: dom.settingsModal,
  userData: dom.userDataModal,
  help: dom.helpModal,
  quickHelp: dom.quickHelpModal,
  sessionSummary: dom.sessionSummaryModal,
  stats: dom.statsModal,
  guide: dom.guideModal,
  links: dom.linksModal,
  profileName: dom.profileNameModal,
  melodyImport: dom.melodyImportModal,
};

function setHiddenClass(element: HTMLElement, hidden: boolean) {
  element.classList.toggle('hidden', hidden);
}

export function renderModalVisibility(visibility: ModalVisibilityState) {
  (Object.keys(modalElements) as ModalKey[]).forEach((modalKey) => {
    setHiddenClass(modalElements[modalKey], !visibility[modalKey]);
  });
}

export function renderProfileActions({ updateDisabled, deleteDisabled }: ProfileActionsState) {
  dom.updateProfileBtn.disabled = updateDisabled;
  dom.deleteProfileBtn.disabled = deleteDisabled;
}

export function renderCalibrationView({ isVisible, progressPercent, statusText }: CalibrationViewState) {
  dom.calibrationProgress.style.width = `${Math.max(0, Math.min(100, progressPercent))}%`;
  dom.calibrationStatus.textContent = statusText;
  setHiddenClass(dom.calibrationModal, !isVisible);
}
