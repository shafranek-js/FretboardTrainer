import { describe, expect, it } from 'vitest';
import { createSettingsModalLayoutController } from './settings-modal-layout-controller';

function createElementStub() {
  return {
    textContent: '',
    classList: {
      values: new Set<string>(),
      add(...tokens: string[]) {
        tokens.forEach((token) => this.values.add(token));
      },
      remove(...tokens: string[]) {
        tokens.forEach((token) => this.values.delete(token));
      },
      contains(token: string) {
        return this.values.has(token);
      },
    },
  } as unknown as HTMLElement;
}

describe('settings-modal-layout-controller', () => {
  it('shows the hub and hides all section panels', () => {
    const dom = {
      settingsHubView: createElementStub(),
      settingsSectionView: createElementStub(),
      settingsSectionTitle: createElementStub(),
      settingsSectionDescription: createElementStub(),
      settingsSectionAppDefaults: createElementStub(),
      settingsSectionInputDetection: createElementStub(),
      settingsSectionDiagnostics: createElementStub(),
      settingsSectionRhythm: createElementStub(),
      settingsSectionProfiles: createElementStub(),
      settingsSectionTools: createElementStub(),
      settingsSectionMelodyLibrary: createElementStub(),
    };
    const controller = createSettingsModalLayoutController(dom);

    controller.showHub();

    expect(dom.settingsHubView.classList.contains('hidden')).toBe(false);
    expect(dom.settingsSectionView.classList.contains('hidden')).toBe(true);
    expect(dom.settingsSectionAppDefaults.classList.contains('hidden')).toBe(true);
    expect(dom.settingsSectionInputDetection.classList.contains('hidden')).toBe(true);
    expect(dom.settingsSectionDiagnostics.classList.contains('hidden')).toBe(true);
    expect(dom.settingsSectionRhythm.classList.contains('hidden')).toBe(true);
    expect(dom.settingsSectionProfiles.classList.contains('hidden')).toBe(true);
    expect(dom.settingsSectionTools.classList.contains('hidden')).toBe(true);
    expect(dom.settingsSectionMelodyLibrary.classList.contains('hidden')).toBe(true);
  });

  it('opens the requested section and updates the section header', () => {
    const dom = {
      settingsHubView: createElementStub(),
      settingsSectionView: createElementStub(),
      settingsSectionTitle: createElementStub(),
      settingsSectionDescription: createElementStub(),
      settingsSectionAppDefaults: createElementStub(),
      settingsSectionInputDetection: createElementStub(),
      settingsSectionDiagnostics: createElementStub(),
      settingsSectionRhythm: createElementStub(),
      settingsSectionProfiles: createElementStub(),
      settingsSectionTools: createElementStub(),
      settingsSectionMelodyLibrary: createElementStub(),
    };
    const controller = createSettingsModalLayoutController(dom);

    controller.openSection('tools');

    expect(dom.settingsHubView.classList.contains('hidden')).toBe(true);
    expect(dom.settingsSectionView.classList.contains('hidden')).toBe(false);
    expect(dom.settingsSectionTitle.textContent).toBe('Tools');
    expect(dom.settingsSectionDescription.textContent).toContain('calibration and stats');
    expect(dom.settingsSectionTools.classList.contains('hidden')).toBe(false);
    expect(dom.settingsSectionAppDefaults.classList.contains('hidden')).toBe(true);
    expect(dom.settingsSectionInputDetection.classList.contains('hidden')).toBe(true);
    expect(dom.settingsSectionDiagnostics.classList.contains('hidden')).toBe(true);
  });
});
