import { dom } from './state';
import { setResultMessage } from './ui-signals';
import { clearMelodyTimelineContextMenu } from './melody-tab-timeline-context-menu';

let timelineSelectionClearBound = false;
let timelineBackgroundCopyBound = false;
let onMelodyTimelineSelectionClear: ((payload: { melodyId: string }) => void) | null = null;
let activeTimelineBackgroundCopyPayload: { text: string; melodyName: string } | null = null;

async function writeTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  textarea.remove();
  if (!success) {
    throw new Error('Clipboard API unavailable.');
  }
}

export function bindTimelineBackgroundCopy() {
  if (timelineBackgroundCopyBound) return;
  timelineBackgroundCopyBound = true;

  dom.melodyTabTimelineViewport.addEventListener('contextmenu', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!activeTimelineBackgroundCopyPayload) return;
    if (
      target.closest(
        '.timeline-context-menu, td, th, button, [role="menuitem"], [data-event-index], [data-note-index], [data-timeline-step-anchor="true"]'
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void writeTextToClipboard(activeTimelineBackgroundCopyPayload.text)
      .then(() => {
        setResultMessage(`Copied tab text for ${activeTimelineBackgroundCopyPayload?.melodyName}.`, 'success');
      })
      .catch((error) => {
        console.error('Failed to copy melody tab text:', error);
        setResultMessage('Failed to copy tab text.', 'error');
      });
  });
}

export function setMelodyTimelineBackgroundCopyPayload(payload: { text: string; melodyName: string } | null) {
  activeTimelineBackgroundCopyPayload = payload;
}

export function setMelodyTimelineSelectionClearHandler(
  handler: ((payload: { melodyId: string }) => void) | null
) {
  onMelodyTimelineSelectionClear = handler;
}

export function bindTimelineSelectionClear() {
  if (timelineSelectionClearBound) return;
  timelineSelectionClearBound = true;

  dom.melodyTabTimelineGrid.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const melodyId = dom.melodyTabTimelineGrid.dataset.melodyId;
    if (!target || !melodyId) return;
    if (target.closest('[data-note-index]')) return;
    if (target.closest('.timeline-context-menu')) return;
    if (target.closest('[data-timeline-range-ui="true"]')) return;
    clearMelodyTimelineContextMenu();
    onMelodyTimelineSelectionClear?.({ melodyId });
  });
}
