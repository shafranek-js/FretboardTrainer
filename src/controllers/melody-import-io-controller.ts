interface MelodyImportIoControllerDom {
  melodyGpFileInput: HTMLInputElement;
  melodyMidiFileInput: HTMLInputElement;
}

export interface MelodyImportIoControllerDeps {
  dom: MelodyImportIoControllerDom;
  createObjectUrl: (blob: Blob) => string;
  revokeObjectUrl: (url: string) => void;
  createAnchor: () => HTMLAnchorElement;
  appendAnchor: (anchor: HTMLAnchorElement) => void;
  scheduleCleanup: (callback: () => void) => void;
}

export function createMelodyImportIoController(deps: MelodyImportIoControllerDeps) {
  function resetGpFileInput() {
    deps.dom.melodyGpFileInput.value = '';
  }

  function resetMidiFileInput() {
    deps.dom.melodyMidiFileInput.value = '';
  }

  function resetImportInputs() {
    resetGpFileInput();
    resetMidiFileInput();
  }

  function downloadBytesAsFile(bytes: Uint8Array, fileName: string, mimeType: string) {
    const blob = new Blob([bytes], { type: mimeType });
    const url = deps.createObjectUrl(blob);
    const anchor = deps.createAnchor();
    anchor.href = url;
    anchor.download = fileName;
    deps.appendAnchor(anchor);
    anchor.click();
    anchor.remove();
    deps.scheduleCleanup(() => {
      deps.revokeObjectUrl(url);
    });
  }

  return {
    resetGpFileInput,
    resetMidiFileInput,
    resetImportInputs,
    downloadBytesAsFile,
  };
}
