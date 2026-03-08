type SettingsModalSection =
  | 'appDefaults'
  | 'inputDetection'
  | 'diagnostics'
  | 'rhythm'
  | 'profiles'
  | 'tools'
  | 'melodyLibrary';

interface SettingsModalLayoutDom {
  settingsHubView: HTMLElement;
  settingsSectionView: HTMLElement;
  settingsSectionTitle: HTMLElement;
  settingsSectionDescription: HTMLElement;
  settingsSectionAppDefaults: HTMLElement;
  settingsSectionInputDetection: HTMLElement;
  settingsSectionDiagnostics: HTMLElement;
  settingsSectionRhythm: HTMLElement;
  settingsSectionProfiles: HTMLElement;
  settingsSectionTools: HTMLElement;
  settingsSectionMelodyLibrary: HTMLElement;
}

interface SectionConfig {
  title: string;
  description: string;
  element: HTMLElement;
}

const SECTION_CONFIGS: Record<SettingsModalSection, Omit<SectionConfig, 'element'>> = {
  appDefaults: {
    title: 'App Defaults',
    description: 'Instrument, tuning, note names, and timeline defaults.',
  },
  inputDetection: {
    title: 'Input Setup',
    description: 'Microphone or MIDI selection, devices, and quick readiness checks.',
  },
  diagnostics: {
    title: 'Advanced Input Tools',
    description: 'Advanced microphone tuning, detector tests, and troubleshooting readouts.',
  },
  rhythm: {
    title: 'Timing & Calibration',
    description: 'Timing strictness, input latency, and room-noise calibration.',
  },
  profiles: {
    title: 'Profiles',
    description: 'Save, update, delete, and switch complete app presets.',
  },
  tools: {
    title: 'Tools',
    description: 'Open calibration and stats tools without mixing them into general settings.',
  },
  melodyLibrary: {
    title: 'Melody Library',
    description: 'Apply library-wide maintenance actions for custom melodies.',
  },
};

export function createSettingsModalLayoutController(dom: SettingsModalLayoutDom) {
  const sections: Record<SettingsModalSection, SectionConfig> = {
    appDefaults: { ...SECTION_CONFIGS.appDefaults, element: dom.settingsSectionAppDefaults },
    inputDetection: { ...SECTION_CONFIGS.inputDetection, element: dom.settingsSectionInputDetection },
    diagnostics: { ...SECTION_CONFIGS.diagnostics, element: dom.settingsSectionDiagnostics },
    rhythm: { ...SECTION_CONFIGS.rhythm, element: dom.settingsSectionRhythm },
    profiles: { ...SECTION_CONFIGS.profiles, element: dom.settingsSectionProfiles },
    tools: { ...SECTION_CONFIGS.tools, element: dom.settingsSectionTools },
    melodyLibrary: { ...SECTION_CONFIGS.melodyLibrary, element: dom.settingsSectionMelodyLibrary },
  };

  function hideAllSections() {
    Object.values(sections).forEach(({ element }) => element.classList.add('hidden'));
  }

  function showHub() {
    hideAllSections();
    dom.settingsSectionView.classList.add('hidden');
    dom.settingsHubView.classList.remove('hidden');
    dom.settingsSectionTitle.textContent = '';
    dom.settingsSectionDescription.textContent = '';
  }

  function openSection(section: SettingsModalSection) {
    const config = sections[section];
    hideAllSections();
    dom.settingsHubView.classList.add('hidden');
    dom.settingsSectionView.classList.remove('hidden');
    dom.settingsSectionTitle.textContent = config.title;
    dom.settingsSectionDescription.textContent = config.description;
    config.element.classList.remove('hidden');
  }

  return {
    showHub,
    openSection,
  };
}
