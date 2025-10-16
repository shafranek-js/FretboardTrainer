/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { dom, state } from './state';
import { CENTS_VISUAL_RANGE, CENTS_TOLERANCE } from './constants';
import { saveSettings, getProfiles, getActiveProfileName } from './storage';
import type { ChordNote } from '../types';


/** Populates the profile selector dropdown from localStorage. */
export function populateProfileSelector() {
    const profiles = getProfiles();
    const activeProfileName = getActiveProfileName();
    
    dom.profileSelector.innerHTML = ''; // Clear existing options
    
    // Add the default option first
    const defaultOption = document.createElement('option');
    defaultOption.value = '__default__';
    defaultOption.textContent = 'Default Settings';
    dom.profileSelector.appendChild(defaultOption);

    // Add all saved profiles, sorted alphabetically
    Object.keys(profiles)
        .filter(name => name !== '__default__')
        .sort((a, b) => a.localeCompare(b))
        .forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            dom.profileSelector.appendChild(option);
        });

    dom.profileSelector.value = activeProfileName in profiles ? activeProfileName : '__default__';
}

/** Populates the chord selector dropdown with chords available for the current instrument. */
function populateChordSelector(
    chordsByType: { [key: string]: string[] },
    availableChords: Set<string>
) {
    dom.chordSelector.innerHTML = ''; // Clear existing options
    Object.entries(chordsByType).forEach(([groupName, chordList]) => {
        const availableChordsInGroup = chordList.filter(chord => availableChords.has(chord));
        if (availableChordsInGroup.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            availableChordsInGroup.forEach(chordName => {
                const option = document.createElement('option');
                option.value = chordName;
                option.textContent = chordName;
                optgroup.appendChild(option);
            });
            dom.chordSelector.appendChild(optgroup);
        }
    });
}

/** Populates the progression selector dropdown with progressions available for the current instrument. */
function populateProgressionSelector(
    progressions: { [key: string]: string[] },
    availableChords: Set<string>
) {
    dom.progressionSelector.innerHTML = ''; // Clear existing options
    Object.entries(progressions).forEach(([progressionName, chordList]) => {
        const isPlayable = chordList.every(chord => availableChords.has(chord));
        if (isPlayable) {
            const option = document.createElement('option');
            option.value = progressionName;
            option.textContent = progressionName;
            dom.progressionSelector.appendChild(option);
        }
    });
}


/** Updates the entire UI to match the selected instrument. */
export function updateInstrumentUI(loadedStrings?: string[]) {
    const instrument = state.currentInstrument;

    // 1. Update string selector checkboxes
    dom.stringSelector.innerHTML = ''; // Clear old strings
    instrument.STRING_ORDER.forEach((stringName, index) => {
        const label = document.createElement('label');
        // Use simple flex layout, positioning is handled by CSS on the container
        label.className = "flex items-center gap-2 cursor-pointer text-sm font-mono text-slate-300";
        label.dataset.stringName = stringName; // Keep for potential future use

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = stringName;
        checkbox.checked = loadedStrings ? loadedStrings.includes(stringName) : true;
        checkbox.setAttribute('aria-label', `Enable ${stringName} string`);
        checkbox.className = "w-4 h-4 accent-cyan-500"; // Smaller to match screenshot

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(stringName));
        dom.stringSelector.appendChild(label);
    });
    dom.stringSelector.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
             saveSettings();
             redrawCanvas(); // Redraw to potentially hide notes on disabled strings
        });
    });

    // 2. Dynamically populate chord and progression selectors
    const availableChords = new Set(Object.keys(instrument.CHORD_FINGERINGS));
    populateChordSelector(instrument.CHORDS_BY_TYPE, availableChords);
    populateProgressionSelector(instrument.CHORD_PROGRESSIONS, availableChords);


    // 3. Disable chord-based modes if the instrument has no defined chord fingerings
    const hasChords = availableChords.size > 0;
    const chordModes = ['chords', 'arpeggios', 'progressions'];
    dom.trainingMode.querySelectorAll('option').forEach(option => {
        if (chordModes.includes(option.value)) {
            (option as HTMLOptionElement).disabled = !hasChords;
        }
    });

    // 4. If a disabled mode is selected, switch to a safe default
    if (!hasChords && chordModes.includes(dom.trainingMode.value)) {
        dom.trainingMode.value = 'random';
        handleModeChange();
    }

    redrawCanvas();
}


/** Draws the fretboard on the canvas, optionally showing all notes or a specific target note. */
export function drawFretboard(
    showAll = false,
    rootNote: string | null = null,
    rootString: string | null = null,
    chordFingering: ChordNote[] = [],
    foundChordNotes: Set<string> = new Set(),
    currentTargetNote: string | null = null
) {
    const ctx = dom.canvas.getContext('2d');
    if (!ctx) return;

    const instrumentData = state.currentInstrument;
    const FRETBOARD = instrumentData.FRETBOARD;
    const STRING_ORDER = instrumentData.STRING_ORDER;
    const MARKER_POSITIONS = instrumentData.MARKER_POSITIONS;
    const enabledStrings = new Set(Array.from(dom.stringSelector.querySelectorAll('input:checked')).map(cb => (cb as HTMLInputElement).value));


    // 1. Set canvas resolution to match its container's CSS size
    const canvasWidth = dom.fretboard.clientWidth;
    const canvasHeight = dom.fretboard.clientHeight;
    if (canvasWidth <= 0 || canvasHeight <= 0) return;

    dom.canvas.width = canvasWidth;
    dom.canvas.height = canvasHeight;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 2. Define drawing constraints and calculate target aspect ratio
    const stringCount = STRING_ORDER.length;
    const fretCount = 12;
    const openNoteAreaUnits = 1; // Reserve 1 "fret" of space for open notes
    const totalHorizontalUnits = fretCount + openNoteAreaUnits;

    // A good visual balance: frets are ~2.5x wider than string gaps.
    const FRET_TO_STRING_SPACING_RATIO = 2.5;
    const TARGET_ASPECT_RATIO = (FRET_TO_STRING_SPACING_RATIO * totalHorizontalUnits) / (stringCount > 1 ? stringCount - 1 : 1);

    const PADDING_H = canvasWidth * 0.02; // Reduced padding as layout is self-contained
    const PADDING_V = canvasHeight * 0.05; // Vertical padding
    const FRET_NUMBER_AREA_HEIGHT = 30;

    const drawableAreaWidth = canvasWidth - PADDING_H * 2;
    const drawableAreaHeight = canvasHeight - PADDING_V * 2 - FRET_NUMBER_AREA_HEIGHT;

    // 3. Calculate final drawing dimensions while preserving the aspect ratio
    let fretboardDrawingWidth, fretboardDrawingHeight;
    if (drawableAreaWidth / drawableAreaHeight > TARGET_ASPECT_RATIO) {
        // Area is wider than needed, so height is the limiting factor
        fretboardDrawingHeight = drawableAreaHeight;
        fretboardDrawingWidth = fretboardDrawingHeight * TARGET_ASPECT_RATIO;
    } else {
        // Area is taller than needed, so width is the limiting factor
        fretboardDrawingWidth = drawableAreaWidth;
        fretboardDrawingHeight = fretboardDrawingWidth / TARGET_ASPECT_RATIO;
    }

    // 4. Center the calculated drawing area within the canvas's drawable area
    const drawingAreaStartX = PADDING_H + (drawableAreaWidth - fretboardDrawingWidth) / 2; // Start of the *entire* visual area
    const startY = PADDING_V + (drawableAreaHeight - fretboardDrawingHeight) / 2;

    // 5. Calculate final spacings based on the new dimensions
    const stringSpacing = stringCount > 1 ? fretboardDrawingHeight / (stringCount - 1) : fretboardDrawingHeight / 2;
    const fretSpacing = fretboardDrawingWidth / totalHorizontalUnits;
    
    // --- Visuals ---
    const noteRadius = Math.min(stringSpacing, fretSpacing) * 0.38;
    const noteFontSize = noteRadius;
    const labelFontSize = Math.min(canvasWidth * 0.015, 14);

    // Nut position and open note X position
    const nutX = drawingAreaStartX + (openNoteAreaUnits * fretSpacing);
    const openNoteX = drawingAreaStartX + (openNoteAreaUnits * fretSpacing * 0.5); // Center open notes in their reserved area

    // --- Draw Fret Markers ---
    ctx.fillStyle = 'rgba(224, 224, 224, 0.5)'; // More subtle markers
    MARKER_POSITIONS.forEach(fret => {
        const x = nutX + ((fret - 0.5) * fretSpacing);
        const markerRadius = noteRadius * 0.7;

        if (fret === 12) {
            const y1 = startY + ((stringCount / 2) - 1.5) * stringSpacing;
            const y2 = startY + ((stringCount / 2) + 0.5) * stringSpacing;
            ctx.beginPath(); ctx.arc(x, y1, markerRadius, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x, y2, markerRadius, 0, Math.PI * 2); ctx.fill();
        } else {
            const y = startY + ((stringCount - 1) / 2) * stringSpacing;
            ctx.beginPath(); ctx.arc(x, y, markerRadius, 0, Math.PI * 2); ctx.fill();
        }
    });

    // --- Draw Frets and Nut ---
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(nutX, startY); ctx.lineTo(nutX, startY + fretboardDrawingHeight); ctx.stroke();
    ctx.lineWidth = 2;
    for (let i = 1; i <= fretCount; i++) {
        const x = nutX + (i * fretSpacing);
        ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, startY + fretboardDrawingHeight); ctx.stroke();
    }

    // --- Draw Strings and Labels / Open Chord Notes ---
    const openChordNotesByString = new Map<string, ChordNote>();
    const isChordModeWithFingering = (dom.trainingMode.value === 'chords' || dom.trainingMode.value === 'progressions' || dom.trainingMode.value === 'arpeggios') && state.isListening;

    if (isChordModeWithFingering && chordFingering.length > 0) {
        chordFingering.forEach(noteInfo => {
            if (noteInfo.fret === 0) {
                openChordNotesByString.set(noteInfo.string, noteInfo);
            }
        });
    }

    STRING_ORDER.forEach((stringName, idx) => {
        const y = startY + (idx * stringSpacing);
        
        ctx.strokeStyle = enabledStrings.has(stringName) ? '#adb5bd' : '#5a626a'; // Dim disabled strings
        ctx.lineWidth = 1 + (idx * (6 / stringCount) * 0.2);
        ctx.beginPath(); ctx.moveTo(nutX, y); ctx.lineTo(nutX + fretCount * fretSpacing, y); ctx.stroke();

        const openNoteInfo = openChordNotesByString.get(stringName);
        if (openNoteInfo && enabledStrings.has(stringName)) {
            const { note } = openNoteInfo;
            const x = openNoteX;
            const isFound = foundChordNotes.has(note);
            const isCurrent = note === currentTargetNote;

            if (isCurrent) {
                ctx.fillStyle = '#ffc107'; ctx.strokeStyle = '#d39e00';
            } else if (isFound) {
                ctx.fillStyle = '#28a745'; ctx.strokeStyle = '#1e7e34';
            } else {
                ctx.fillStyle = '#17a2b8'; ctx.strokeStyle = '#138496';
            }
            ctx.lineWidth = 2;
            const radius = noteRadius * 1.1;
            ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = `bold ${noteFontSize}px Segoe UI`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(note, x, y);
        }
    });

    // --- Draw Notes based on mode ---
    if (showAll) {
        const startFret = parseInt(dom.startFret.value);
        const endFret = parseInt(dom.endFret.value);
        const minFret = Math.min(startFret, endFret);
        const maxFret = Math.max(startFret, endFret);

        dom.canvas.setAttribute('aria-label', `${state.currentInstrument.name} fretboard showing all notes from fret ${minFret} to ${maxFret}.`);
        STRING_ORDER.forEach((string, stringIdx) => {
            if (!enabledStrings.has(string)) return; // Don't show notes on disabled strings

            const y = startY + (stringIdx * stringSpacing);
            Object.entries(FRETBOARD[string as keyof typeof FRETBOARD]).forEach(([note, fret]) => {
                if (fret >= minFret && fret <= maxFret) {
                    const x = fret === 0 ? openNoteX : nutX + (fret - 0.5) * fretSpacing;
                    ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(x, y, noteRadius, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#adb5bd'; ctx.font = `${noteFontSize * 0.9}px Segoe UI`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(note, x, y);
                }
            });

            if (maxFret === 12) {
                const openStringNote = Object.keys(FRETBOARD[string as keyof typeof FRETBOARD])[0];
                const fret12X = nutX + (12 - 0.5) * fretSpacing;
                ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(fret12X, y, noteRadius, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#adb5bd'; ctx.font = `${noteFontSize * 0.9}px Segoe UI`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(openStringNote, fret12X, y);
            }
        });
    }

    // --- Draw Fret Numbers ---
    ctx.fillStyle = '#adb5bd';
    ctx.font = `${labelFontSize}px Segoe UI`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 1; i <= fretCount; i++) {
        const x = nutX + ((i - 0.5) * fretSpacing);
        const textY = startY + fretboardDrawingHeight + (FRET_NUMBER_AREA_HEIGHT * 0.2);
        ctx.fillText(i.toString(), x, textY);
    }
    
    // --- Draw Target Note / Chord Fingering ---
    if (rootNote && rootString) {
        dom.canvas.setAttribute('aria-label', `Fretboard showing note ${rootNote} on the ${rootString} string.`);
        const rootStringIdx = STRING_ORDER.indexOf(rootString);
        const rootFret = FRETBOARD[rootString as keyof typeof FRETBOARD][rootNote as keyof typeof FRETBOARD.e];

        if (typeof rootFret !== 'number' || rootStringIdx < 0) return;
        const rootY = startY + (rootStringIdx * stringSpacing);
        const rootX = rootFret === 0 ? openNoteX : nutX + (rootFret - 0.5) * fretSpacing;

        ctx.fillStyle = '#28a745'; ctx.strokeStyle = '#1e7e34'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(rootX, rootY, noteRadius * 1.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${noteFontSize}px Segoe UI`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(rootNote, rootX, rootY);

    } else if (isChordModeWithFingering && chordFingering.length > 0) {
        dom.canvas.setAttribute('aria-label', `Fretboard showing the notes for a chord.`);
        chordFingering.forEach(noteInfo => {
            if (noteInfo.fret === 0) return; // Already handled

            const { note, string, fret } = noteInfo;
            if (!enabledStrings.has(string)) return; // Don't show notes on disabled strings

            const stringIdx = STRING_ORDER.indexOf(string);
            if (stringIdx === -1) return;

            const y = startY + (stringIdx * stringSpacing);
            const x = nutX + (fret - 0.5) * fretSpacing;

            const isFound = foundChordNotes.has(note);
            const isCurrent = note === currentTargetNote;

            if (isCurrent) {
                ctx.fillStyle = '#ffc107'; ctx.strokeStyle = '#d39e00';
            } else if (isFound) {
                ctx.fillStyle = '#28a745'; ctx.strokeStyle = '#1e7e34';
            } else {
                ctx.fillStyle = '#17a2b8'; ctx.strokeStyle = '#138496';
            }
            ctx.lineWidth = 2;
            const radius = noteRadius * 1.1;
            ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = `bold ${noteFontSize}px Segoe UI`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(note, x, y);
        });
    } else {
        dom.canvas.setAttribute('aria-label', `${state.currentInstrument.name} fretboard visualization.`);
    }

    // --- Position String Selector Checkboxes ---
    // This logic runs every time the canvas is redrawn (e.g., on resize)
    // to keep the labels aligned with the strings.
    const stringLabels = Array.from(dom.stringSelector.children) as HTMLElement[];
    // Ensure we have the labels and their count matches the expected number of strings.
    if (stringLabels.length > 0 && stringLabels.length === STRING_ORDER.length) {
        // Position labels just to the left of the nut with a small, responsive gap.
        // `nutX` is the x-coordinate of the nut on the canvas.
        const horizontalPosition = nutX - (fretSpacing * 0.10);

        for (let i = 0; i < stringLabels.length; i++) {
            const label = stringLabels[i];
            // `startY` is the y-coordinate of the first string.
            // `stringSpacing` is the vertical distance between strings.
            const stringY = startY + (i * stringSpacing);

            label.style.position = 'absolute';
            // Set the target coordinates.
            label.style.left = `${horizontalPosition}px`;
            label.style.top = `${stringY}px`;
            // Use transform to align the label's right-middle point to the target coordinates.
            // This is more robust than calculating with offsetWidth/offsetHeight.
            label.style.transform = 'translate(-100%, -50%)';
        }
    }
}


/** Updates the visual tuner based on the detected frequency. */
export function updateTuner(frequency: number | null) {
    const needle = dom.tunerNeedle;
    needle.classList.remove('bg-green-500', 'bg-cyan-500', 'bg-red-500', 'bg-yellow-400');

    if (!frequency || frequency <= 0 || !state.targetFrequency) {
        needle.style.transform = `translateX(-50%) translateY(0%)`;
        dom.tunerCents.textContent = '--';
        return;
    }

    const cents = 1200 * Math.log2(frequency / state.targetFrequency);

    if (Math.abs(cents) <= CENTS_TOLERANCE) {
        needle.classList.add('bg-green-500'); // in-tune
    } else if (cents < 0) {
        needle.classList.add('bg-cyan-500'); // flat
    } else {
        needle.classList.add('bg-red-500'); // sharp
    }

    const clampedCents = Math.max(-CENTS_VISUAL_RANGE, Math.min(CENTS_VISUAL_RANGE, cents));
    // The translation is a percentage of the track's height. 50% is the max travel distance.
    const translation = (clampedCents / CENTS_VISUAL_RANGE) * 50; 
    needle.style.transform = `translateX(-50%) translateY(${translation}%)`;

    dom.tunerCents.textContent = `${cents > 0 ? '+' : ''}${cents.toFixed(1)} cents`;
}

/** Redraws the canvas based on the current application state. */
export function redrawCanvas() {
    const trainingMode = dom.trainingMode.value;
    const isChordBasedMode = ['chords', 'progressions', 'arpeggios'].includes(trainingMode);

    if (isChordBasedMode && state.isListening && state.currentPrompt) {
        const chordFingering = state.currentPrompt.targetChordFingering || [];
        
        if (trainingMode === 'arpeggios') {
            const arpeggioNotes = state.currentPrompt.targetChordNotes || [];
            const foundNotes = new Set(arpeggioNotes.slice(0, state.currentArpeggioIndex));
            const currentTarget = arpeggioNotes[state.currentArpeggioIndex];
            drawFretboard(false, null, null, chordFingering, foundNotes, currentTarget);
        } else {
            // For 'chords' and 'progressions', show the full fingering as the target.
            // When the prompt is first shown, no notes are 'found' yet.
            drawFretboard(false, null, null, chordFingering, new Set());
        }
    } else if (state.showingAllNotes) {
        drawFretboard(true);
    } else {
        drawFretboard(false, null, null);
    }
}


/** Handles UI changes when the training mode is switched. */
export function handleModeChange() {
    const mode = dom.trainingMode.value;
    dom.scaleSelectorContainer.classList.add('hidden');
    dom.chordSelectorContainer.classList.add('hidden');
    dom.progressionSelectorContainer.classList.add('hidden');
    dom.arpeggioPatternContainer.classList.add('hidden');
    dom.tunerDisplay.classList.remove('visible');
    dom.tunerDisplay.classList.add('invisible', 'opacity-0');


    if (mode === 'scales') {
        dom.scaleSelectorContainer.classList.remove('hidden');
    } else if (mode === 'chords') {
        dom.chordSelectorContainer.classList.remove('hidden');
    } else if (mode === 'arpeggios') {
        dom.chordSelectorContainer.classList.remove('hidden');
        dom.arpeggioPatternContainer.classList.remove('hidden');
    } else if (mode === 'progressions') {
        dom.progressionSelectorContainer.classList.remove('hidden');
    }

    if (mode === 'timed' || mode === 'chords' || mode === 'progressions' || mode === 'arpeggios') {
        dom.hintBtn.style.display = 'none';
    } else {
        dom.hintBtn.style.display = 'inline-block';
    }
}

/** Updates and displays the statistics in the modal. */
export function displayStats() {
    dom.statsHighScore.textContent = state.stats.highScore.toString();
    const accuracy = state.stats.totalAttempts > 0 ? (state.stats.correctAttempts / state.stats.totalAttempts) * 100 : 0;
    dom.statsAccuracy.textContent = `${accuracy.toFixed(1)}%`;
    const avgTime = state.stats.correctAttempts > 0 ? state.stats.totalTime / state.stats.correctAttempts : 0;
    dom.statsAvgTime.textContent = `${avgTime.toFixed(2)}s`;

    // Calculate and display problem notes
    const problemNotes = Object.entries(state.stats.noteStats)
        .map(([key, stat]) => {
            const accuracy = stat.attempts > 0 ? (stat.correct / stat.attempts) : 0;
            const avgTime = stat.correct > 0 ? (stat.totalTime / stat.correct) : Infinity;
            // A simple score: lower is worse. Penalize inaccuracy more heavily.
            const score = (accuracy * 100) - (avgTime * 5);
            return { key, ...stat, accuracy, avgTime, score };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 3);

    dom.statsProblemNotes.innerHTML = '';
    if (problemNotes.length > 0) {
        problemNotes.forEach(note => {
            const li = document.createElement('li');
            li.className = "bg-slate-600 p-2 rounded";
            const noteName = note.key.replace('-CHORD', ' Chord').replace('-PROG', ' Progression');
            li.textContent = `${noteName} (Acc: ${(note.accuracy * 100).toFixed(0)}%, Time: ${note.avgTime.toFixed(2)}s)`;
            dom.statsProblemNotes.appendChild(li);
        });
    } else {
        dom.statsProblemNotes.innerHTML = '<li class="bg-slate-600 p-2 rounded">No data yet. Play a few rounds!</li>';
    }
}

/** Sets the loading state of the UI, disabling controls and showing a message. */
export function setLoadingState(isLoading: boolean) {
    state.isLoadingSamples = isLoading;
    dom.startBtn.disabled = isLoading;
    dom.instrumentSelector.disabled = isLoading;
    dom.settingsBtn.disabled = isLoading;

    if (isLoading) {
        dom.statusBar.textContent = `Loading ${state.currentInstrument.name} sounds...`;
        document.body.style.cursor = 'wait';
    } else {
        dom.statusBar.textContent = 'Ready';
        document.body.style.cursor = 'default';
        // Re-enable start button only if not already in a session
        if (!state.isListening) {
            dom.startBtn.disabled = false;
        }
    }
}