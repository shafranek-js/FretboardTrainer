import { expect, type Page } from '@playwright/test';

export class AppShell {
  constructor(private readonly page: Page) {}

  async seedStorage(entries: Record<string, unknown>) {
    await this.page.addInitScript((payload) => {
      for (const [key, value] of Object.entries(payload)) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    }, entries);
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForAppReady();
  }

  async dismissOnboardingIfVisible() {
    const onboardingModal = this.page.locator('#onboardingModal');
    if (await onboardingModal.isVisible()) {
      await this.page.locator('#onboardingSkipBtn').click();
      await expect(onboardingModal).toBeHidden();
    }
  }

  async waitForAppReady() {
    await expect(this.page.locator('#loadingOverlay')).toBeHidden();
  }

  async expectLoaded() {
    await expect(this.page).toHaveTitle(/FretFlow/i);
    await expect(this.page.locator('#statusBar')).not.toHaveText(/Startup failed|Runtime error/i);
    await expect(this.page.locator('#inputStatusBar')).toContainText(/Mic:/i);
    await expect(this.page.locator('#workflowSwitcher')).toBeVisible();
    await expect(this.page.locator('#practiceSetupPanel')).toBeVisible();
  }

  async selectTrainingMode(value: string) {
    await this.waitForAppReady();
    await this.dismissOnboardingIfVisible();
    const optionState = await this.page.locator(`#trainingMode option[value="${value}"]`).evaluate((option) => ({
      disabled: (option as HTMLOptionElement).disabled,
    }));
    if (optionState.disabled) {
      const workflowByMode = {
        melody: 'study-melody',
        practice: 'practice',
        performance: 'perform',
        rhythm: 'perform',
      } as const;
      const workflow = workflowByMode[value as keyof typeof workflowByMode];
      if (workflow) {
        await this.switchWorkflow(workflow);
      }
    }
    await this.page.locator('#trainingMode').selectOption(value);
  }

  async switchWorkflow(workflow: 'learn-notes' | 'study-melody' | 'practice' | 'perform' | 'library' | 'editor') {
    const selectorMap = {
      'learn-notes': '#workflowLearnNotesBtn',
      'study-melody': '#workflowStudyMelodyBtn',
      practice: '#workflowPracticeBtn',
      perform: '#workflowPerformBtn',
      library: '#workflowLibraryBtn',
      editor: '#workflowEditorBtn',
    } as const;
    await this.waitForAppReady();
    await this.dismissOnboardingIfVisible();
    await this.page.locator(selectorMap[workflow]).click();
  }

  async expectLibraryMelodyActions() {
    await expect(this.page.locator('#openMelodyImportBtn')).toBeHidden();
    await expect(this.page.locator('#editMelodyBtn')).toBeHidden();
    await expect(this.page.locator('#bakePracticeMelodyBtn')).toBeHidden();
    await expect(this.page.locator('#melodyEventEditorPanel')).toBeHidden();
    await expect(this.page.locator('#editingToolsSection')).toBeHidden();
    await expect(this.page.locator('#melodyTransposeResetBtn')).toBeHidden();
    await expect(this.page.locator('#melodyStringShiftResetBtn')).toBeHidden();
    await expect(this.page.locator('#melodyStudyResetBtn')).toBeHidden();
  }

  async expectEditorMelodyActions() {
    await expect(this.page.locator('#exportMelodyMidiBtn')).toBeHidden();
    await expect(this.page.locator('#deleteMelodyBtn')).toBeHidden();
    await expect(this.page.locator('#melodyPracticeSection')).toBeHidden();
    const hasVisibleEditorEntryPoint = await this.page.evaluate(() => {
      const ids = [
        'openMelodyImportBtn',
        'editMelodyBtn',
        'bakePracticeMelodyBtn',
        'melodyEmptyStateImportBtn',
        'editingToolsSection',
      ];
      return ids.some((id) => {
        const element = document.getElementById(id) as HTMLElement | null;
        if (!element) return false;
        if (element.hidden) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    });
    expect(hasVisibleEditorEntryPoint).toBe(true);
  }

  settings() {
    return new SettingsHub(this.page);
  }

  melodyTempo() {
    return new MelodyTempoControls(this.page);
  }
}

export class SettingsHub {
  constructor(private readonly page: Page) {}

  async open() {
    await expect(this.page.locator('#loadingOverlay')).toBeHidden();
    const onboardingModal = this.page.locator('#onboardingModal');
    if (await onboardingModal.isVisible()) {
      await this.page.locator('#onboardingSkipBtn').click();
      await expect(onboardingModal).toBeHidden();
    }
    await this.page.locator('#settingsBtn').click();
    await expect(this.page.locator('#settingsModal')).toBeVisible();
    await expect(this.page.getByRole('heading', { name: /App Settings/i })).toBeVisible();
  }

  async openInputDetection() {
    await this.page.locator('#settingsOpenInputDetectionBtn').click();
    await this.inputDetection().expectVisible();
  }

  async openTools() {
    await this.page.locator('#settingsOpenToolsBtn').click();
  }

  async backToSections() {
    await this.page.locator('#settingsSectionBackBtn').click();
  }

  stats() {
    return new StatsModal(this.page);
  }

  inputDetection() {
    return new InputDetectionSettings(this.page);
  }
}

export class InputDetectionSettings {
  constructor(private readonly page: Page) {}

  async expectVisible() {
    await expect(this.page.locator('#audioInputDevice')).toBeVisible();
    await expect(this.page.locator('#inputSource')).toBeVisible();
  }

  async isMidiDisabled() {
    return this.page.evaluate(() => {
      const select = document.getElementById('inputSource') as HTMLSelectElement | null;
      const midiOption = [...(select?.options ?? [])].find((option) => option.value === 'midi');
      return Boolean(midiOption?.disabled);
    });
  }

  async expectMicrophoneState() {
    await expect(this.page.locator('#inputSource')).toHaveValue('microphone');
    await expect(this.page.locator('#midiInputRow')).toBeHidden();
    await expect(this.page.locator('#audioInputRow')).toBeVisible();
    await expect(this.page.locator('#midiConnectionStatus')).toBeHidden();
    await expect(this.page.locator('#inputStatusBar')).toContainText(/Mic:/i);
  }

  async switchToMidi() {
    await this.page.locator('#inputSource').selectOption('midi');
  }

  async expectMidiState() {
    await expect(this.page.locator('#midiInputRow')).toBeVisible();
    await expect(this.page.locator('#audioInputRow')).toBeHidden();
    await expect(this.page.locator('#midiConnectionStatus')).toBeVisible();
    await expect(this.page.locator('#midiConnectionStatus')).toContainText(/MIDI Connection:/i);
    await expect(this.page.locator('#inputStatusBar')).toContainText(/MIDI:/i);
  }

  async switchToMicrophone() {
    await this.page.locator('#inputSource').selectOption('microphone');
  }
}

export class StatsModal {
  constructor(private readonly page: Page) {}

  async openFromTools() {
    await this.page.locator('#openStatsBtn').click();
    await expect(this.page.locator('#statsModal')).toBeVisible();
    await expect(this.page.getByRole('heading', { name: /My Statistics/i })).toBeVisible();
  }

  async expectBaseActionsVisible() {
    await expect(this.page.locator('#repeatLastSessionBtn')).toBeVisible();
    await expect(this.page.locator('#practiceWeakSpotsBtn')).toBeVisible();
    await expect(this.page.locator('#resetStatsBtn')).toBeVisible();
  }

  async expectLastSessionInput(sourcePattern: RegExp) {
    await expect(this.page.locator('#statsLastSessionSection')).toBeVisible();
    await expect(this.page.locator('#statsLastSessionInput')).toBeVisible();
    await expect(this.page.locator('#statsLastSessionInput')).toHaveText(sourcePattern);
    await expect(this.page.locator('#statsLastSessionInput')).toHaveAttribute('title', sourcePattern);
  }
}

export class MelodyTempoControls {
  constructor(private readonly page: Page) {}

  async selectMelody(value: string) {
    await this.page.locator('#melodySelector').selectOption(value);
  }

  async expectTempo(value: number) {
    await expect(this.page.locator('#melodyDemoBpm')).toHaveValue(String(value));
    await expect(this.page.locator('#melodyDemoBpmValue')).toHaveText(String(value));
  }

  async setTempo(value: number) {
    await this.page.locator('#melodyDemoBpm').evaluate((element, nextValue) => {
      const input = element as HTMLInputElement;
      input.value = String(nextValue);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await expect(this.page.locator('#melodyDemoBpmValue')).toHaveText(String(value));
  }
}

