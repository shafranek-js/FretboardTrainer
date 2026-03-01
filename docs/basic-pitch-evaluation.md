## Basic Pitch Evaluation

Decision: use `Basic Pitch` only as an offline/import transcription path, not as a live session verification engine.

Why:
- The official TypeScript package (`@spotify/basic-pitch`) is designed around `AudioBuffer` batch evaluation, not frame-by-frame live microphone verification.
- The official README shows `evaluateModel(audioBuffer, ...)` over decoded audio files and then post-processing into note events.
- The project documents streaming/windowed processing as a way to handle long files, which still fits offline analysis better than low-latency note/chord checking inside a practice session.
- The upstream issue tracker still has open requests around real-time streaming support, which is a strong signal that live browser verification is not a solved path in the project today.

What it is good for in this app:
- user-imported audio-to-MIDI draft generation
- offline melody extraction to create a first-pass custom melody
- background analysis flow where a few seconds of latency is acceptable

What it is not good for here:
- real-time chord verification during melody/practice sessions
- microphone-driven low-latency feedback loops
- replacing the current live browser detection path

Implementation guidance:
- keep `Basic Pitch` out of the main session runtime
- if implemented later, load it lazily behind an explicit import/transcribe action
- treat its output as a draft that still needs tablature optimization and editing
- route generated notes through the existing MIDI/import pipeline rather than inventing a parallel model

Sources:
- https://github.com/spotify/basic-pitch-ts
- https://www.npmjs.com/package/@spotify/basic-pitch
- https://github.com/spotify/basic-pitch/issues
