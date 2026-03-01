import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MelodyEvent } from '../melody-library';
import { createMelodyImportPreviewController } from './melody-import-preview-controller';

class FakeClassList {
  private values = new Set<string>();

  add(...tokens: string[]) {
    tokens.forEach((token) => this.values.add(token));
  }

  remove(...tokens: string[]) {
    tokens.forEach((token) => this.values.delete(token));
  }

  contains(token: string) {
    return this.values.has(token);
  }
}

class FakeElement {
  value = '';
  textContent = '';
  innerHTML = '';
  disabled = false;
  classList = new FakeClassList();
  children: FakeElement[] = [];

  append(child: FakeElement) {
    this.children.push(child);
  }
}

function installDocumentStub() {
  const original = globalThis.document;
  (globalThis as { document?: { createElement(tagName: string): FakeElement } }).document = {
    createElement: (_tagName: string) => new FakeElement(),
  };
  return () => {
    if (original) {
      globalThis.document = original;
      return;
    }
    delete (globalThis as { document?: unknown }).document;
  };
}

function createDom() {
  return {
    melodyNameInput: new FakeElement() as unknown as HTMLInputElement,
    melodyAsciiTabInput: new FakeElement() as unknown as HTMLTextAreaElement,
    melodyGpTrackImportPanel: new FakeElement() as unknown as HTMLElement,
    melodyGpTrackSelector: new FakeElement() as unknown as HTMLSelectElement,
    melodyGpTrackInfo: new FakeElement() as unknown as HTMLElement,
    saveMelodyGpTrackBtn: new FakeElement() as unknown as HTMLButtonElement,
    melodyMidiTrackImportPanel: new FakeElement() as unknown as HTMLElement,
    melodyMidiTrackSelector: new FakeElement() as unknown as HTMLSelectElement,
    melodyMidiQuantize: new FakeElement() as unknown as HTMLSelectElement,
    melodyMidiTrackInfo: new FakeElement() as unknown as HTMLElement,
    saveMelodyMidiTrackBtn: new FakeElement() as unknown as HTMLButtonElement,
  };
}

function createEvents(): MelodyEvent[] {
  return [{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }];
}

function createDeps() {
  const dom = createDom();
  const instrument = {
    STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'],
  };

  const gpImported = {
    suggestedName: 'Imported GP',
    events: createEvents(),
    warnings: [],
    metadata: {
      sourceFormat: 'gp5' as const,
      sourceFileName: 'demo.gp5',
      scoreTitle: 'Demo score',
      trackName: 'Lead',
      tempoBpm: 90,
    },
  };
  const midiImported = {
    suggestedName: 'Imported MIDI',
    events: createEvents(),
    warnings: [],
    metadata: {
      sourceFormat: 'midi' as const,
      sourceFileName: 'demo.mid',
      midiName: 'Demo MIDI',
      trackName: 'Lead',
      tempoBpm: 100,
    },
  };

  const deps = {
    dom,
    getCurrentInstrument: vi.fn(() => instrument as never),
    getSelectedMidiImportQuantize: vi.fn(() => '1/8' as const),
    parseAsciiTabToEvents: vi.fn(() => createEvents()),
    loadGpScoreFromBytes: vi.fn(async () => ({
      score: {},
      sourceFileName: 'demo.gp5',
      sourceFormat: 'gp5' as const,
      scoreTitle: 'Demo score',
      tempoBpm: 90,
      trackOptions: [{ trackIndex: 2, name: 'Lead', label: 'Lead', stringCount: 6, matchesCurrentInstrumentStringCount: true }],
      defaultTrackIndex: 2,
    })),
    convertLoadedGpScoreTrackToImportedMelody: vi.fn(() => gpImported),
    loadMidiFileFromBytes: vi.fn(async () => ({
      midi: {},
      sourceFileName: 'demo.mid',
      midiName: 'Demo MIDI',
      tempoBpm: 100,
      tempoChangesCount: 1,
      timeSignatureText: '4/4',
      keySignatureText: 'C major',
      trackOptions: [{ trackIndex: 1, name: 'Lead', label: 'Lead', noteCount: 8, isPercussion: false, noteRangeText: 'C3-C5', estimatedBars: 4, endTick: 1200 }],
      defaultTrackIndex: 1,
    })),
    convertLoadedMidiTrackToImportedMelody: vi.fn(() => midiImported),
    renderPreviewFromEvents: vi.fn(),
    renderPreviewError: vi.fn(),
    clearPreview: vi.fn(),
  };

  return { deps, dom, gpImported, midiImported };
}

describe('melody-import-preview-controller', () => {
  let restoreDocument: (() => void) | null = null;

  beforeEach(() => {
    restoreDocument = installDocumentStub();
  });

  afterEach(() => {
    restoreDocument?.();
    restoreDocument = null;
  });

  it('loads a GP draft and renders the selected track preview', async () => {
    const { deps, dom, gpImported } = createDeps();
    const controller = createMelodyImportPreviewController(deps);

    await controller.loadGpImportDraftFromFile(new File([new Uint8Array([1, 2, 3])], 'demo.gp5'));

    expect(dom.melodyGpTrackSelector.value).toBe('2');
    expect(dom.melodyNameInput.value).toBe('Imported GP');
    expect(dom.saveMelodyGpTrackBtn.disabled).toBe(false);
    expect(deps.renderPreviewFromEvents).toHaveBeenCalledWith(
      gpImported.events,
      expect.objectContaining({
        statusText: 'GP parsed successfully',
        editableEvents: true,
      })
    );
  });

  it('uses pending MIDI preview when ASCII textarea is empty', async () => {
    const { deps, midiImported } = createDeps();
    const controller = createMelodyImportPreviewController(deps);

    await controller.loadMidiImportDraftFromFile(new File([new Uint8Array([1, 2, 3])], 'demo.mid'));
    deps.renderPreviewFromEvents.mockClear();

    controller.updatePreview();

    expect(deps.renderPreviewFromEvents).toHaveBeenCalledWith(
      midiImported.events,
      expect.objectContaining({
        statusText: 'MIDI parsed successfully',
        editableEvents: true,
      })
    );
  });

  it('switches back to ASCII preview and clears pending import drafts', () => {
    const { deps, dom } = createDeps();
    const controller = createMelodyImportPreviewController(deps);
    dom.melodyAsciiTabInput.value = '1 string 0---';

    controller.updatePreview();

    expect(deps.parseAsciiTabToEvents).toHaveBeenCalled();
    expect(deps.renderPreviewFromEvents).toHaveBeenCalledWith(createEvents(), { editableEvents: false });
    expect(dom.saveMelodyGpTrackBtn.disabled).toBe(true);
    expect(dom.saveMelodyMidiTrackBtn.disabled).toBe(true);
  });
});
