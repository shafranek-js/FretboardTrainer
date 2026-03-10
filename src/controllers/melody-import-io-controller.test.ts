import { describe, expect, it, vi } from 'vitest';
import { createMelodyImportIoController } from './melody-import-io-controller';

function createDeps() {
  const gpInput = { value: 'gp-file' } as HTMLInputElement;
  const midiInput = { value: 'midi-file' } as HTMLInputElement;
  const anchor = {
    href: '',
    download: '',
    click: vi.fn(),
    remove: vi.fn(),
  } as unknown as HTMLAnchorElement & {
    click: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let scheduledCleanup: (() => void) | null = null;

  return {
    dom: {
      melodyGpFileInput: gpInput,
      melodyMidiFileInput: midiInput,
    },
    anchor,
    scheduledCleanupRef: () => scheduledCleanup,
    createObjectUrl: vi.fn(() => 'blob:test-url'),
    revokeObjectUrl: vi.fn(),
    createAnchor: vi.fn(() => anchor),
    appendAnchor: vi.fn(),
    scheduleCleanup: vi.fn((callback: () => void) => {
      scheduledCleanup = callback;
    }),
  };
}

describe('melody-import-io-controller', () => {
  it('resets GP and MIDI file inputs together', () => {
    const deps = createDeps();
    const controller = createMelodyImportIoController(deps);

    controller.resetImportInputs();

    expect(deps.dom.melodyGpFileInput.value).toBe('');
    expect(deps.dom.melodyMidiFileInput.value).toBe('');
  });

  it('downloads bytes via an object URL and revokes it after cleanup', () => {
    const deps = createDeps();
    const controller = createMelodyImportIoController(deps);

    controller.downloadBytesAsFile(new Uint8Array([1, 2, 3]), 'melody.mid', 'audio/midi');

    expect(deps.createObjectUrl).toHaveBeenCalledTimes(1);
    expect(deps.createAnchor).toHaveBeenCalledTimes(1);
    expect(deps.anchor.href).toBe('blob:test-url');
    expect(deps.anchor.download).toBe('melody.mid');
    expect(deps.appendAnchor).toHaveBeenCalledWith(deps.anchor);
    expect(deps.anchor.click).toHaveBeenCalledTimes(1);
    expect(deps.anchor.remove).toHaveBeenCalledTimes(1);
    expect(deps.revokeObjectUrl).not.toHaveBeenCalled();

    deps.scheduledCleanupRef()?.();

    expect(deps.revokeObjectUrl).toHaveBeenCalledWith('blob:test-url');
  });
});
