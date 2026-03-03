import type { MelodyDefinition } from './melody-library';

export type MelodyTimelineContextAction =
  | 'fret-down'
  | 'fret-up'
  | 'duration-down'
  | 'duration-up'
  | 'add-note'
  | 'add-event'
  | 'duplicate-event'
  | 'split-event'
  | 'merge-event'
  | 'delete-note'
  | 'delete-event'
  | 'undo'
  | 'redo';

interface TimelineContextMenuState {
  melodyId: string;
  eventIndex: number;
  noteIndex: number | null;
  anchorX: number;
  anchorY: number;
}

let activeTimelineContextMenu: TimelineContextMenuState | null = null;
let onMelodyTimelineContextAction:
  | ((payload: { melodyId: string; action: MelodyTimelineContextAction }) => void)
  | null = null;
let onMelodyTimelineContextMenuOpen:
  | ((payload: {
      melodyId: string;
      eventIndex: number;
      noteIndex: number | null;
      anchorX: number;
      anchorY: number;
    }) => void)
  | null = null;

export function setMelodyTimelineContextActionHandler(
  handler: ((payload: { melodyId: string; action: MelodyTimelineContextAction }) => void) | null
) {
  onMelodyTimelineContextAction = handler;
}

export function setMelodyTimelineContextMenuOpenHandler(
  handler:
    | ((payload: {
        melodyId: string;
        eventIndex: number;
        noteIndex: number | null;
        anchorX: number;
        anchorY: number;
      }) => void)
    | null
) {
  onMelodyTimelineContextMenuOpen = handler;
}

export function getTimelineContextMenuSignature(melodyId: string) {
  if (!activeTimelineContextMenu || activeTimelineContextMenu.melodyId !== melodyId) {
    return 'closed';
  }
  return [
    activeTimelineContextMenu.eventIndex,
    activeTimelineContextMenu.noteIndex ?? -1,
    Math.round(activeTimelineContextMenu.anchorX),
    Math.round(activeTimelineContextMenu.anchorY),
  ].join(':');
}

export function clearMelodyTimelineContextMenu() {
  const hadOpenMenu = activeTimelineContextMenu !== null;
  activeTimelineContextMenu = null;
  document.querySelectorAll('.timeline-context-menu').forEach((element) => element.remove());
  return hadOpenMenu;
}

export function emitMelodyTimelineContextMenuOpen(payload: {
  melodyId: string;
  eventIndex: number;
  noteIndex: number | null;
  anchorX: number;
  anchorY: number;
}) {
  activeTimelineContextMenu = payload;
  onMelodyTimelineContextMenuOpen?.(payload);
}

export function bindTimelineContextMenu(
  element: HTMLElement,
  payload: { melodyId: string; eventIndex: number; noteIndex: number | null }
) {
  element.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    emitMelodyTimelineContextMenuOpen({
      ...payload,
      anchorX: event.clientX,
      anchorY: event.clientY,
    });
  });
}

function getToolbarEventMagnitude(event: MelodyDefinition['events'][number] | null | undefined) {
  if (!event) return 0;
  if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats) && event.durationBeats > 0) {
    return event.durationBeats;
  }
  if (
    typeof event.durationCountSteps === 'number' &&
    Number.isFinite(event.durationCountSteps) &&
    event.durationCountSteps > 0
  ) {
    return event.durationCountSteps;
  }
  if (
    typeof event.durationColumns === 'number' &&
    Number.isFinite(event.durationColumns) &&
    event.durationColumns > 0
  ) {
    return event.durationColumns;
  }
  return 1;
}

function canToolbarSplitEvent(event: MelodyDefinition['events'][number] | null | undefined) {
  return getToolbarEventMagnitude(event) > 1;
}

function areToolbarEventNotesEquivalent(
  left: MelodyDefinition['events'][number] | null | undefined,
  right: MelodyDefinition['events'][number] | null | undefined
) {
  if (!left || !right) return false;
  if (left.notes.length !== right.notes.length) return false;
  const leftSignature = left.notes
    .map((note) => `${note.note}|${note.stringName ?? '-'}|${note.fret ?? '-'}`)
    .sort();
  const rightSignature = right.notes
    .map((note) => `${note.note}|${note.stringName ?? '-'}|${note.fret ?? '-'}`)
    .sort();
  return leftSignature.every((value, index) => value === rightSignature[index]);
}

function canToolbarMergeEvent(
  melody: MelodyDefinition,
  selectedEventIndex: number | null
) {
  if (selectedEventIndex === null || selectedEventIndex < 0 || selectedEventIndex >= melody.events.length - 1) return false;
  return areToolbarEventNotesEquivalent(melody.events[selectedEventIndex], melody.events[selectedEventIndex + 1]);
}

export function renderTimelineContextMenu(
  melody: MelodyDefinition,
  selectedEventIndex: number | null,
  options: { editingEnabled: boolean }
) {
  document.querySelectorAll('.timeline-context-menu').forEach((element) => element.remove());
  if (!options.editingEnabled || !activeTimelineContextMenu || activeTimelineContextMenu.melodyId !== melody.id) {
    return;
  }

  const targetEventIndex = activeTimelineContextMenu.eventIndex;
  const selectedEvent = melody.events[targetEventIndex] ?? null;
  if (!selectedEvent || selectedEventIndex === null || selectedEventIndex !== targetEventIndex) return;
  const hasSelectedNote = activeTimelineContextMenu.noteIndex !== null;
  const stepNoun = selectedEvent.notes.length > 1 ? 'Chord' : 'Note';

  const menu = document.createElement('div');
  menu.className = 'timeline-context-menu';
  menu.dataset.timelineNoPan = 'true';
  menu.setAttribute('role', 'menu');
  menu.title =
    `Change fret: ArrowUp/ArrowDown. Decrease duration: -. Increase duration: = or +. Add next ${stepNoun.toLowerCase()}: Insert or Enter. Add note to current step: Shift+Insert. Duplicate ${stepNoun.toLowerCase()}: Shift+D. Split ${stepNoun.toLowerCase()}: Shift+S. Merge with next ${stepNoun.toLowerCase()}: Shift+M. Delete selected note: Delete/Backspace. Delete ${stepNoun.toLowerCase()}: Shift+Delete. Undo: Ctrl/Cmd+Z. Redo: Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y.`;
  const addItem = (
    label: string,
    shortcut: string,
    description: string,
    action: MelodyTimelineContextAction,
    disabled: boolean
  ) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'timeline-context-menu-btn';
    button.setAttribute('role', 'menuitem');
    button.disabled = disabled;
    button.dataset.timelineNoPan = 'true';
    const text = document.createElement('span');
    text.className = 'timeline-context-menu-text';
    const title = document.createElement('span');
    title.className = 'timeline-context-menu-title';
    title.textContent = label;
    const subtitle = document.createElement('span');
    subtitle.className = 'timeline-context-menu-description';
    subtitle.textContent = description;
    text.append(title, subtitle);
    const shortcutLabel = document.createElement('span');
    shortcutLabel.className = 'timeline-context-menu-shortcut';
    shortcutLabel.textContent = shortcut;
    button.append(text, shortcutLabel);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearMelodyTimelineContextMenu();
      onMelodyTimelineContextAction?.({ melodyId: melody.id, action });
    });
    menu.appendChild(button);
  };
  const addSeparator = () => {
    const separator = document.createElement('div');
    separator.className = 'timeline-context-menu-separator';
    separator.dataset.timelineNoPan = 'true';
    menu.appendChild(separator);
  };
  const addSectionLabel = (label: string) => {
    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'timeline-context-menu-section';
    sectionLabel.dataset.timelineNoPan = 'true';
    sectionLabel.textContent = label;
    menu.appendChild(sectionLabel);
  };

  addSectionLabel('Pitch');
  addItem('Lower Fret', 'ArrowDown', 'Move the selected note one fret lower.', 'fret-down', !hasSelectedNote);
  addItem('Raise Fret', 'ArrowUp', 'Move the selected note one fret higher.', 'fret-up', !hasSelectedNote);
  addItem('Shorter Duration', '-', `Shorten the selected ${stepNoun.toLowerCase()} by one timing unit.`, 'duration-down', false);
  addItem('Longer Duration', '= / +', `Lengthen the selected ${stepNoun.toLowerCase()} by one timing unit.`, 'duration-up', false);
  addSeparator();

  addSectionLabel('Timing');
  addItem(`Split ${stepNoun}`, 'Shift+S', `Split the current ${stepNoun.toLowerCase()} into two equal steps.`, 'split-event', !canToolbarSplitEvent(selectedEvent));
  addItem(
    `Merge With Next ${stepNoun}`,
    'Shift+M',
    `Merge the current ${stepNoun.toLowerCase()} with the next matching step.`,
    'merge-event',
    !canToolbarMergeEvent(melody, targetEventIndex)
  );
  addSeparator();

  addSectionLabel('Structure');
  addItem('Add Note', 'Shift+Insert', 'Add a note to the current step for polyphony.', 'add-note', false);
  addItem(`Add Next ${stepNoun}`, 'Insert / Enter', `Insert a new ${stepNoun.toLowerCase()} after the current one.`, 'add-event', false);
  addItem(`Duplicate ${stepNoun}`, 'Shift+D', `Copy the current ${stepNoun.toLowerCase()} after itself.`, 'duplicate-event', false);
  addSeparator();

  addSectionLabel('Delete');
  addItem('Delete Selected Note', 'Delete', 'Remove the selected note from the current step.', 'delete-note', !hasSelectedNote);
  addItem(`Delete ${stepNoun}`, 'Shift+Delete', `Remove the current ${stepNoun.toLowerCase()} and its duration.`, 'delete-event', false);
  addSeparator();

  addSectionLabel('History');
  addItem('Undo', 'Ctrl/Cmd+Z', 'Revert the last timeline edit.', 'undo', false);
  addItem('Redo', 'Ctrl/Cmd+Shift+Z', 'Reapply the last reverted edit.', 'redo', false);
  document.body.appendChild(menu);

  const maxLeft = Math.max(4, window.innerWidth - menu.offsetWidth - 4);
  const maxTop = Math.max(4, window.innerHeight - menu.offsetHeight - 4);
  menu.style.left = `${Math.min(Math.max(4, activeTimelineContextMenu.anchorX), maxLeft)}px`;
  menu.style.top = `${Math.min(Math.max(4, activeTimelineContextMenu.anchorY), maxTop)}px`;
}
