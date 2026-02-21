import { dom } from '../state';
import { redrawFretboard } from '../ui';

export function registerResizeObserver() {
  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(redrawFretboard);
  });
  resizeObserver.observe(dom.fretboard);
}
