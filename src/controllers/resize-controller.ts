import { dom } from '../dom';
import { redrawFretboard } from '../ui';

export function registerResizeObserver() {
  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(redrawFretboard);
  });
  resizeObserver.observe(dom.fretboard);
  resizeObserver.observe(dom.scrollingTabPanelViewport);
}
