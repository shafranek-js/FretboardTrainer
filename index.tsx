/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { dom, state } from './src/state';
import { loadSettings, loadStats, resetStats, saveSettings, setActiveProfileName, getActiveProfileName, getProfiles, saveProfiles, gatherCurrentSettings, applySettings } from './src/storage';
import { handleModeChange, redrawCanvas, displayStats, updateInstrumentUI, populateProfileSelector, drawFretboard } from './src/ui';
import { playSound, loadInstrumentSoundfont } from './src/audio';
import { startListening, stopListening, cancelCalibration } from './src/logic';
import { instruments } from './src/instruments';

/** Manages the enabled/disabled state of profile buttons based on the current profile. */
function updateProfileButtonsState() {
    const isDefault = getActiveProfileName() === '__default__';
    dom.updateProfileBtn.disabled = isDefault;
    dom.deleteProfileBtn.disabled = isDefault;
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings(); // This now loads profiles, applies settings, and pre-loads audio
    loadStats();
    updateProfileButtonsState();
    // redrawCanvas and handleModeChange are now called by applySettings within loadSettings

    // --- Main Session Controls ---
    dom.startBtn.addEventListener('click', async () => {
        if (await startListening()) {
            // Further logic is handled within startListening/nextPrompt
        }
    });

    dom.stopBtn.addEventListener('click', () => {
        stopListening();
    });

    // --- Top Control Bar Listeners ---
    dom.instrumentSelector.addEventListener('change', async () => {
        state.currentInstrument = instruments[dom.instrumentSelector.value];
        updateInstrumentUI(); // Redraw strings, fretboard, etc.
        await loadInstrumentSoundfont(state.currentInstrument.name);
        saveSettings();
    });

    dom.showAllNotes.addEventListener('change', (e) => {
        state.showingAllNotes = (e.target as HTMLInputElement).checked;
        saveSettings();
        redrawCanvas();
    });

    dom.trainingMode.addEventListener('change', () => {
        handleModeChange();
        saveSettings();
    });

    dom.startFret.addEventListener('input', () => { saveSettings(); redrawCanvas(); });
    dom.endFret.addEventListener('input', () => { saveSettings(); redrawCanvas(); });
    dom.difficulty.addEventListener('change', saveSettings);
    dom.scaleSelector.addEventListener('change', saveSettings);
    dom.chordSelector.addEventListener('change', saveSettings);
    dom.randomizeChords.addEventListener('change', saveSettings);
    dom.progressionSelector.addEventListener('change', saveSettings);
    dom.arpeggioPatternSelector.addEventListener('change', saveSettings);
    // String selector listeners are now added dynamically in updateInstrumentUI

    // --- Profile Management Listeners ---
    dom.profileSelector.addEventListener('change', async (e) => {
        const profileName = (e.target as HTMLSelectElement).value;
        stopListening(); // Stop any active session before changing profiles
        setActiveProfileName(profileName);
        const profiles = getProfiles();
        await applySettings(profiles[profileName] || {});
        updateProfileButtonsState();
    });

    /** Shows the modal for saving a new profile. */
    dom.saveAsProfileBtn.addEventListener('click', () => {
        dom.profileNameInput.value = ''; // Clear previous input
        dom.profileNameModal.classList.remove('hidden');
        dom.profileNameInput.focus(); // Focus the input field
    });
    
    /** Hides the profile name modal. */
    function hideProfileNameModal() {
        dom.profileNameModal.classList.add('hidden');
    }

    /** Contains the logic to save a new profile with the given name. */
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
    
    // Listeners for the new profile modal
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
        dom.statusBar.textContent = `Profile '${activeProfileName}' updated.`;
        setTimeout(() => { dom.statusBar.textContent = 'Ready'; }, 2000);
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


    dom.playSoundBtn.addEventListener('click', () => {
        const prompt = state.currentPrompt;
        if (!prompt) return;

        const trainingMode = dom.trainingMode.value;
        // Arpeggios are played note-by-note, so we treat them like single-note modes for sound playback.
        const isChordBased = ['chords', 'progressions'].includes(trainingMode);

        if (isChordBased && prompt.targetChordFingering.length > 0) {
            const notesToPlay = prompt.targetChordFingering
                .map(noteInfo => state.currentInstrument.getNoteWithOctave(noteInfo.string, noteInfo.fret))
                .filter((note): note is string => note !== null);

            if (notesToPlay.length > 0) {
                playSound(notesToPlay);
            }
        } else if (prompt.targetNote) {
            let noteToPlay: string | null = null;
            const instrumentData = state.currentInstrument;
            const enabledStrings = Array.from(dom.stringSelector.querySelectorAll('input:checked')).map(cb => (cb as HTMLInputElement).value);
            
            for (const stringName of instrumentData.STRING_ORDER) {
                if (enabledStrings.includes(stringName)) {
                    const fret = instrumentData.FRETBOARD[stringName as keyof typeof instrumentData.FRETBOARD][prompt.targetNote as keyof typeof instrumentData.FRETBOARD.e];
                    if (typeof fret === 'number') {
                       noteToPlay = instrumentData.getNoteWithOctave(stringName, fret);
                       break;
                    }
                }
            }
            
            if (noteToPlay) {
                playSound(noteToPlay);
            }
        }
    });

    dom.hintBtn.addEventListener('click', () => {
        const prompt = state.currentPrompt;
        if (!prompt || !prompt.targetNote) return;

        dom.result.textContent = '';
        dom.result.classList.remove('text-green-400', 'text-red-400');

        let noteToShow = prompt.targetNote;
        let stringToShow = prompt.targetString;

        // For modes like Interval Training, the string isn't specified. We need to find one.
        if (!stringToShow) {
            const instrumentData = state.currentInstrument;
            const enabledStrings = Array.from(dom.stringSelector.querySelectorAll('input:checked')).map(cb => (cb as HTMLInputElement).value);
            for (const stringName of instrumentData.STRING_ORDER) {
                if (enabledStrings.includes(stringName)) {
                    const fret = instrumentData.FRETBOARD[stringName as keyof typeof instrumentData.FRETBOARD][noteToShow as keyof typeof instrumentData.FRETBOARD.e];
                    if (typeof fret === 'number') {
                       stringToShow = stringName;
                       break; // Found a playable location, stop searching
                    }
                }
            }
        }

        if (noteToShow && stringToShow) {
            drawFretboard(false, noteToShow, stringToShow);
            state.cooldown = true;
            setTimeout(() => {
                redrawCanvas();
                state.cooldown = false;
            }, 2000);
        } else if (noteToShow) {
            dom.result.textContent = `Hint: The answer is ${noteToShow}`;
        }
    });

    // --- Settings Modal and its Children ---
    dom.settingsBtn.addEventListener('click', () => {
        dom.settingsModal.classList.remove('hidden');
    });

    dom.closeSettingsBtn.addEventListener('click', () => dom.settingsModal.classList.add('hidden'));

    dom.settingsModal.addEventListener('click', (e) => {
        if (e.target === dom.settingsModal) dom.settingsModal.classList.add('hidden');
    });

    dom.openCalibrateBtn.addEventListener('click', async () => {
        dom.settingsModal.classList.add('hidden');
        dom.calibrationProgress.style.width = '0%';
        dom.calibrationStatus.textContent = 'Listening...';
        dom.calibrationModal.classList.remove('hidden');
        if (!await startListening(true)) {
            cancelCalibration();
        }
    });
    dom.cancelCalibrationBtn.addEventListener('click', cancelCalibration);

    dom.openStatsBtn.addEventListener('click', () => {
        dom.settingsModal.classList.add('hidden');
        displayStats();
        dom.statsModal.classList.remove('hidden');
    });
    dom.closeStatsBtn.addEventListener('click', () => dom.statsModal.classList.add('hidden'));
    dom.statsModal.addEventListener('click', (e) => {
        if (e.target === dom.statsModal) dom.statsModal.classList.add('hidden');
    });
    dom.resetStatsBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all your statistics? This cannot be undone.')) {
            resetStats();
            displayStats(); // Re-display the cleared stats
        }
    });

    dom.openGuideBtn.addEventListener('click', () => {
        dom.settingsModal.classList.add('hidden');
        dom.guideModal.classList.remove('hidden');
    });
    dom.closeGuideBtn.addEventListener('click', () => dom.guideModal.classList.add('hidden'));
    dom.guideModal.addEventListener('click', (e) => {
        if (e.target === dom.guideModal) dom.guideModal.classList.add('hidden');
    });

    dom.openLinksBtn.addEventListener('click', () => {
        dom.settingsModal.classList.add('hidden');
        dom.linksModal.classList.remove('hidden');
    });
    dom.closeLinksBtn.addEventListener('click', () => dom.linksModal.classList.add('hidden'));
    dom.linksModal.addEventListener('click', (e) => {
        if (e.target === dom.linksModal) dom.linksModal.classList.add('hidden');
    });


    // --- Canvas Resize Observer ---
    const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(redrawCanvas);
    });
    resizeObserver.observe(dom.fretboard);
});