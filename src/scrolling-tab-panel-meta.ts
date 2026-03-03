import type { ScrollingTabPanelModel } from './scrolling-tab-panel-model';

export function buildScrollingTabPanelMetaText(
  _model: ScrollingTabPanelModel,
  options: {
    bpm: number;
    studyRange: { startIndex: number; endIndex: number };
    hasRuntimeCursor: boolean;
  }
) {
  void options;
  return '';
}
