# Physical Restructuring Plan

## Goal

Start a separate physical-restructuring phase for `src/` without reopening broad behavioral refactors.

The rule for this phase is:

- move one cohesive mini-cluster at a time
- preserve runtime behavior
- keep the public import surface stable during early moves
- use thin re-export shims on old paths first
- only remove shims after enough of the tree has moved

## Priorities

### P0

- Move low-fanout graph mini-clusters into domain folders with shims left behind.
- Prefer runtime graph files that already have clean boundaries and very small import surfaces.

### P1

- After a few safe moves, begin updating internal imports to point at the new physical locations directly.
- Group neighboring graph-deps / graph-cluster pairs inside the same domain folder.

### P2

- Move related tests only after the code layout starts to stabilize.
- Remove compatibility shims only after the new folder structure is established across a full domain slice.

## Safe First-Wave Candidates

1. `performance feedback` runtime mini-cluster
2. `audio runtime` graph mini-cluster
3. `prompt-performance` runtime mini-cluster
4. `detection` runtime mini-cluster

These are good first-wave candidates because they are already behaviorally isolated and graph-oriented.

## Current Move In Progress

First physical move:

- `src/session-performance-feedback-graph-cluster.ts`
- `src/session-performance-feedback-graph-deps.ts`

New target folder:

- `src/session-runtime/performance-feedback/`

Compatibility strategy for this first move:

- move implementation into the new folder
- keep old root files as thin re-export shims
- verify via `typecheck` and focused performance-feedback suites

## What Not To Do In This Phase

- do not start broad file moves across multiple domains in one pass
- do not combine physical moves with product behavior changes
- do not remove old-path shims immediately
- do not treat this as a replacement for feature work unless there is a clear architecture goal
## Second physical move completed

- moved src/session-audio-runtime-graph-cluster.ts implementation into src/session-runtime/audio/graph-cluster.ts
- moved src/session-audio-runtime-graph-deps.ts implementation into src/session-runtime/audio/graph-deps.ts
- left old root files as thin re-export shims
## Third physical move completed

- moved src/session-prompt-performance-runtime-graph-cluster.ts implementation into src/session-runtime/prompt-performance/graph-cluster.ts
- moved src/session-prompt-performance-runtime-graph-deps.ts implementation into src/session-runtime/prompt-performance/graph-deps.ts
- left old root files as thin re-export shims
## Fourth physical move completed

- moved src/session-detection-runtime-graph-cluster.ts implementation into src/session-runtime/detection/graph-cluster.ts
- moved src/session-detection-runtime-graph-deps.ts implementation into src/session-runtime/detection/graph-deps.ts
- left old root files as thin re-export shims
## Fifth physical move completed

- moved src/session-lifecycle-runtime-graph-cluster.ts implementation into src/session-runtime/lifecycle/graph-cluster.ts
- moved src/session-lifecycle-runtime-graph-deps.ts implementation into src/session-runtime/lifecycle/graph-deps.ts
- left old root files as thin re-export shims
## P1 import rewiring started
- The main runtime composition root [src/logic.ts](C:/Projects/FretboardTrainer/src/logic.ts) now imports the moved runtime graph cluster/deps modules from src/session-runtime/* instead of the legacy root-level shim files.
- This is the first deliberate consumer-side migration step after the shim-first physical moves.
- Compatibility shims remain in place for tests and any remaining import sites.

## P1 folder export surface added
- Added index.ts export surfaces for udio, detection, prompt-performance, performance-feedback, and lifecycle under src/session-runtime/*.
- The main runtime composition root [src/logic.ts](C:/Projects/FretboardTrainer/src/logic.ts) now imports these domains through folder-level APIs rather than direct graph-cluster / graph-deps file paths.
- Legacy root-level shims remain in place as compatibility aliases while migration continues.

## First controller physical move completed
- moved [src/controllers/melody-import-editor-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/melody-import-editor-cluster.ts) implementation into [src/controllers/melody-import/cluster.ts](C:/Projects/FretboardTrainer/src/controllers/melody-import/cluster.ts)
- added [src/controllers/melody-import/index.ts](C:/Projects/FretboardTrainer/src/controllers/melody-import/index.ts) as the first folder-level export surface for this controller domain
- left the old root file as a thin re-export shim to preserve existing import and test paths
- verified via 	ypecheck and focused melody-import + session-controller-graph suites

## Melody-import controller P1 rewiring completed
- [src/controllers/session-controller-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-cluster.ts) now imports the moved melody-import cluster through [src/controllers/melody-import/index.ts](C:/Projects/FretboardTrainer/src/controllers/melody-import/index.ts) instead of the legacy root-level shim file.
- [src/controllers/session-controller-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-cluster.test.ts) was updated to mock the new folder API path.
- The old [src/controllers/melody-import-editor-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/melody-import-editor-cluster.ts) remains as a compatibility shim.
