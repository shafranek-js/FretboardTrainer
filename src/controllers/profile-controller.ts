import { dom } from '../state';
import {
  getActiveProfileName,
  setActiveProfileName,
  getProfiles,
  saveProfiles,
  gatherCurrentSettings,
  applySettings,
  loadSettings,
} from '../storage';
import { stopListening } from '../logic';
import { populateProfileSelector } from '../ui';
import { setModalVisible, setProfileActionsState, setStatusText } from '../ui-signals';

/** Manages the enabled/disabled state of profile buttons based on the current profile. */
export function updateProfileButtonsState() {
  const isDefault = getActiveProfileName() === '__default__';
  setProfileActionsState(isDefault, isDefault);
}

function hideProfileNameModal() {
  setModalVisible('profileName', false);
}

function handleSaveNewProfile() {
  const newName = dom.profileNameInput.value;

  if (!newName || !newName.trim()) {
    alert('Please enter a valid profile name.');
    return;
  }

  const trimmedName = newName.trim();

  if (trimmedName.toLowerCase() === 'default settings' || trimmedName === '__default__') {
    alert("Please choose a different name. 'Default Settings' is reserved.");
    return;
  }

  const profiles = getProfiles();

  if (profiles[trimmedName]) {
    if (!confirm(`A profile named "${trimmedName}" already exists. Do you want to overwrite it?`)) {
      return;
    }
  }

  profiles[trimmedName] = gatherCurrentSettings();
  saveProfiles(profiles);
  setActiveProfileName(trimmedName);
  populateProfileSelector();
  updateProfileButtonsState();
  hideProfileNameModal();
}

export function registerProfileControls() {
  dom.profileSelector.addEventListener('change', async (e) => {
    const profileName = (e.target as HTMLSelectElement).value;
    stopListening(); // Stop any active session before changing profiles
    setActiveProfileName(profileName);
    const profiles = getProfiles();
    await applySettings(profiles[profileName] || {});
    updateProfileButtonsState();
  });

  dom.saveAsProfileBtn.addEventListener('click', () => {
    dom.profileNameInput.value = ''; // Clear previous input
    setModalVisible('profileName', true);
    dom.profileNameInput.focus(); // Focus the input field
  });

  // Listeners for the profile modal
  dom.confirmSaveProfileBtn.addEventListener('click', handleSaveNewProfile);
  dom.cancelSaveProfileBtn.addEventListener('click', hideProfileNameModal);
  dom.profileNameModal.addEventListener('click', (e) => {
    if (e.target === dom.profileNameModal) {
      hideProfileNameModal();
    }
  });
  dom.profileNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveNewProfile();
    }
  });

  dom.updateProfileBtn.addEventListener('click', () => {
    const activeProfileName = getActiveProfileName();
    if (activeProfileName === '__default__') {
      alert("Cannot update the default profile. Use 'Save As' to create a new profile first.");
      return;
    }

    const profiles = getProfiles();
    profiles[activeProfileName] = gatherCurrentSettings();
    saveProfiles(profiles);

    // Visual feedback
    setStatusText(`Profile '${activeProfileName}' updated.`);
    setTimeout(() => {
      setStatusText('Ready');
    }, 2000);
  });

  dom.deleteProfileBtn.addEventListener('click', async () => {
    const profileToDelete = getActiveProfileName();
    if (profileToDelete === '__default__') {
      alert("The 'Default Settings' profile cannot be deleted.");
      return;
    }

    if (confirm(`Are you sure you want to delete the profile "${profileToDelete}"?`)) {
      stopListening();
      const profiles = getProfiles();
      delete profiles[profileToDelete];
      saveProfiles(profiles);
      setActiveProfileName('__default__'); // Revert to default
      await loadSettings(); // Reload default settings and update UI
      updateProfileButtonsState();
    }
  });
}
