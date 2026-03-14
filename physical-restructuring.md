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
## Second controller physical move completed
- moved [src/controllers/session-melody-runtime-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-runtime-graph-cluster.ts) implementation into [src/controllers/session-melody-runtime/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-runtime/graph-cluster.ts)
- added [src/controllers/session-melody-runtime/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-runtime/index.ts) as the folder-level export surface for this controller runtime domain
- left the old root file as a thin re-export shim to preserve existing import and test paths
- rewired [src/controllers/session-controller-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-cluster.ts) to import from the new folder API and updated [src/controllers/session-controller-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-cluster.test.ts) to mock that path
## Third controller physical move completed
- moved [src/controllers/session-editor-bootstrap-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap-graph-cluster.ts) implementation into [src/controllers/session-editor-bootstrap/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/graph-cluster.ts)
- moved [src/controllers/session-editor-bootstrap-graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap-graph-deps.ts) implementation into [src/controllers/session-editor-bootstrap/graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/graph-deps.ts)
- moved [src/controllers/session-editor-bootstrap-entrypoint-graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap-entrypoint-graph-deps.ts) implementation into [src/controllers/session-editor-bootstrap/entrypoint-graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/entrypoint-graph-deps.ts)
- added [src/controllers/session-editor-bootstrap/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/index.ts) as the folder-level export surface for this controller domain
- left the old root files as thin re-export shims and rewired [src/controllers/session-controller.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller.ts) to import the new folder API

## Fourth controller physical move completed
- moved [src/controllers/session-bootstrap-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap-cluster.ts) implementation into [src/controllers/session-bootstrap/cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap/cluster.ts)
- moved [src/controllers/session-bootstrap-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap-graph-cluster.ts) implementation into [src/controllers/session-bootstrap/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap/graph-cluster.ts)
- added [src/controllers/session-bootstrap/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap/index.ts) as the folder-level export surface for this controller domain
- left the old root files as thin re-export shims and rewired [src/controllers/session-editor-bootstrap/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/graph-cluster.ts) and [src/controllers/session-editor-bootstrap/graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/graph-deps.ts) to use the new bootstrap folder API
## Fifth controller physical move completed
- moved [src/controllers/session-editor-controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-controls-cluster.ts) implementation into [src/controllers/session-editor/controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor/controls-cluster.ts)
- moved [src/controllers/session-editor-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-graph-cluster.ts) implementation into [src/controllers/session-editor/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor/graph-cluster.ts)
- added [src/controllers/session-editor/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor/index.ts) as the folder-level export surface for this controller domain
- left the old root files as thin re-export shims and rewired [src/controllers/session-editor-bootstrap/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/graph-cluster.ts) and [src/controllers/session-editor-bootstrap/graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/graph-deps.ts) to use the new session-editor folder API
## Sixth controller physical move completed
- moved [src/controllers/session-melody-controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-controls-cluster.ts) implementation into [src/controllers/session-melody/controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/controls-cluster.ts)
- added [src/controllers/session-melody/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/index.ts) as the folder-level export surface for this controller domain slice
- left the old root file as a thin re-export shim and rewired [src/controllers/session-editor/controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor/controls-cluster.ts) to use the new session-melody folder API
## Seventh controller physical move completed
- moved [src/controllers/session-metronome-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-metronome-cluster.ts) implementation into [src/controllers/session-metronome/cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-metronome/cluster.ts)
- added [src/controllers/session-metronome/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-metronome/index.ts) as the folder-level export surface for this controller domain slice
- left the old root file as a thin re-export shim and rewired [src/controllers/session-configuration-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration-graph-cluster.ts) to use the new session-metronome folder API
## Eighth controller physical move completed
- moved [src/controllers/session-curriculum-preset-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-curriculum-preset-cluster.ts) implementation into [src/controllers/session-curriculum-preset/cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-curriculum-preset/cluster.ts)
- added [src/controllers/session-curriculum-preset/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-curriculum-preset/index.ts) as the folder-level export surface for this controller domain slice
- left the old root file as a thin re-export shim and rewired [src/controllers/session-configuration-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration-graph-cluster.ts) to use the new session-curriculum-preset folder API
## Ninth controller physical move completed
- moved [src/controllers/session-input-controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-input-controls-cluster.ts) implementation into [src/controllers/session-input-controls/cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-input-controls/cluster.ts)
- added [src/controllers/session-input-controls/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-input-controls/index.ts) as the folder-level export surface for this controller domain slice
- left the old root file as a thin re-export shim and rewired [src/controllers/session-configuration-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration-graph-cluster.ts) to use the new session-input-controls folder API
## Tenth controller physical move completed
- moved [src/controllers/session-configuration-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration-graph-cluster.ts) implementation into [src/controllers/session-configuration/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration/graph-cluster.ts)
- moved [src/controllers/session-configuration-graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration-graph-deps.ts) implementation into [src/controllers/session-configuration/graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration/graph-deps.ts)
- added [src/controllers/session-configuration/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration/index.ts) as the folder-level export surface for this controller domain slice
- left the old root files as thin re-export shims and rewired [src/controllers/session-controller-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-cluster.ts) and [src/controllers/session-controller-graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-deps.ts) to use the new session-configuration folder API
## Eleventh controller physical move completed
- moved [src/controllers/session-workflow-layout-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workflow-layout-cluster.ts) implementation into [src/controllers/session-workspace/workflow-layout-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/workflow-layout-cluster.ts)
- moved [src/controllers/session-setup-ui-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-setup-ui-cluster.ts) implementation into [src/controllers/session-workspace/setup-ui-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/setup-ui-cluster.ts)
- moved [src/controllers/session-practice-controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-practice-controls-cluster.ts) implementation into [src/controllers/session-workspace/practice-controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/practice-controls-cluster.ts)
- moved [src/controllers/session-melody-workflow-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-workflow-cluster.ts) implementation into [src/controllers/session-workspace/melody-workflow-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/melody-workflow-cluster.ts)
- extended [src/controllers/session-workspace/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/index.ts) to expose these workspace leaf mini-clusters and rewired [src/controllers/session-workspace-controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace-controls-cluster.ts) to use the folder API

## Twelfth controller physical move completed
- moved [src/controllers/session-workspace-controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace-controls-cluster.ts) implementation into [src/controllers/session-workspace/controls-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/controls-cluster.ts)
- extended [src/controllers/session-workspace/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/index.ts) with the workspace controls export surface
- left the old root file as a thin re-export shim and rewired [src/controllers/session-workspace-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace-graph-cluster.ts) to use the new session-workspace folder API
## Thirteenth controller physical move completed
- moved [src/controllers/session-workspace-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace-graph-cluster.ts) implementation into [src/controllers/session-workspace/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/graph-cluster.ts)
- extended [src/controllers/session-workspace/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/index.ts) with the workspace graph export surface
- left the old root file as a thin re-export shim and rewired [src/controllers/session-configuration/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration/graph-cluster.ts) to use the new session-workspace folder API
## Fourteenth controller physical move completed
- moved [src/controllers/session-controller-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-cluster.ts) implementation into [src/controllers/session-controller-graph/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph/graph-cluster.ts)
- moved [src/controllers/session-controller-graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-deps.ts) implementation into [src/controllers/session-controller-graph/graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph/graph-deps.ts)
- moved [src/controllers/session-controller-entrypoint-graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-entrypoint-graph-deps.ts) implementation into [src/controllers/session-controller-graph/entrypoint-graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph/entrypoint-graph-deps.ts)
- added [src/controllers/session-controller-graph/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph/index.ts) as the folder-level export surface for the top-level controller graph layer
- left the old root files as thin re-export shims and rewired [src/controllers/session-controller.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller.ts) to use the new session-controller-graph folder API
## Fifteenth controller physical move completed
- moved [src/controllers/session-melody-demo-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-demo-cluster.ts) implementation into [src/controllers/session-melody/demo-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/demo-cluster.ts)
- moved [src/controllers/session-melody-settings-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-settings-cluster.ts) implementation into [src/controllers/session-melody/settings-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/settings-cluster.ts)
- moved [src/controllers/session-melody-timeline-editing-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-timeline-editing-cluster.ts) implementation into [src/controllers/session-melody/timeline-editing-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/timeline-editing-cluster.ts)
- extended [src/controllers/session-melody/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/index.ts) with these additional cluster exports
- left the old root files as thin re-export shims and rewired [src/controllers/session-melody-runtime/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-runtime/graph-cluster.ts) plus [src/controllers/session-melody-runtime-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-runtime-graph-cluster.test.ts) to use the new session-melody folder API
## Sixteenth controller physical move completed
- moved [src/controllers/session-runtime-ui-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui-cluster.ts) implementation into [src/controllers/session-runtime-ui/cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/cluster.ts)
- added [src/controllers/session-runtime-ui/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/index.ts) as the folder-level export surface for this controller domain slice
- left the old root file as a thin re-export shim and rewired [src/controllers/session-melody-runtime/graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-runtime/graph-cluster.ts) plus [src/controllers/session-melody-runtime-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-runtime-graph-cluster.test.ts) to use the new session-runtime-ui folder API
## Seventeenth controller physical move completed
- moved [src/controllers/interaction-guards-controller.ts](C:/Projects/FretboardTrainer/src/controllers/interaction-guards-controller.ts) implementation into [src/controllers/session-runtime-ui/interaction-guards-controller.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/interaction-guards-controller.ts)
- moved [src/controllers/melody-timeline-ui-controller.ts](C:/Projects/FretboardTrainer/src/controllers/melody-timeline-ui-controller.ts) implementation into [src/controllers/session-runtime-ui/melody-timeline-ui-controller.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/melody-timeline-ui-controller.ts)
- moved [src/controllers/session-start-controller.ts](C:/Projects/FretboardTrainer/src/controllers/session-start-controller.ts) implementation into [src/controllers/session-runtime-ui/session-start-controller.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/session-start-controller.ts)
- extended [src/controllers/session-runtime-ui/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/index.ts) with both controller exports and their public deps types
- left the old root files as thin re-export shims and rewired [src/controllers/session-runtime-ui/cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/cluster.ts) to use direct sibling imports inside the folder
## Eighteenth controller physical move completed
- moved [src/controllers/session-bootstrap-controller.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap-controller.ts) implementation into [src/controllers/session-bootstrap/controller.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap/controller.ts)
- extended [src/controllers/session-bootstrap/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap/index.ts) with the controller export and public deps type
- left the old root file as a thin re-export shim and rewired [src/controllers/session-bootstrap/cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap/cluster.ts) plus [src/controllers/session-editor-bootstrap/graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/graph-deps.ts) to use the new session-bootstrap folder API
## Nineteenth controller physical move completed
- moved [src/controllers/session-transport-controls-controller.ts](C:/Projects/FretboardTrainer/src/controllers/session-transport-controls-controller.ts) implementation into [src/controllers/session-melody/transport-controls-controller.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/transport-controls-controller.ts)
- extended [src/controllers/session-melody/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/index.ts) with the transport controller export and public deps type
- left the old root file as a thin re-export shim and rewired [src/controllers/session-melody/demo-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/demo-cluster.ts) to use direct sibling imports inside the session-melody folder
## Controller P1 rewiring completed
- rewired the last remaining production import of [src/controllers/session-controller-graph-cluster.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-cluster.ts) to the folder API by updating [src/controllers/session-configuration/graph-deps.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration/graph-deps.ts) to import from [src/controllers/session-controller-graph/index.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph/index.ts)
- this leaves the remaining root-level `session-*` paths primarily as compatibility shims and test-facing legacy entrypoints rather than active production wiring
## First controller P2 test move completed
- moved [src/controllers/interaction-guards-controller.test.ts](C:/Projects/FretboardTrainer/src/controllers/interaction-guards-controller.test.ts) into [src/controllers/session-runtime-ui/interaction-guards-controller.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/interaction-guards-controller.test.ts)
- moved [src/controllers/melody-timeline-ui-controller.test.ts](C:/Projects/FretboardTrainer/src/controllers/melody-timeline-ui-controller.test.ts) into [src/controllers/session-runtime-ui/melody-timeline-ui-controller.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/melody-timeline-ui-controller.test.ts)
- moved [src/controllers/session-start-controller.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-start-controller.test.ts) into [src/controllers/session-runtime-ui/session-start-controller.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/session-start-controller.test.ts)
- moved [src/controllers/session-runtime-ui-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui-cluster.test.ts) into [src/controllers/session-runtime-ui/session-runtime-ui-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-runtime-ui/session-runtime-ui-cluster.test.ts)
- updated the moved tests to import their colocated implementations from sibling files inside the domain folder
## Second controller P2 test move completed
- moved [src/controllers/session-melody-controls-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-controls-cluster.test.ts) into [src/controllers/session-melody/controls-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/controls-cluster.test.ts)
- moved [src/controllers/session-melody-demo-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-demo-cluster.test.ts) into [src/controllers/session-melody/demo-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/demo-cluster.test.ts)
- moved [src/controllers/session-melody-settings-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-settings-cluster.test.ts) into [src/controllers/session-melody/settings-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/settings-cluster.test.ts)
- moved [src/controllers/session-melody-timeline-editing-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-timeline-editing-cluster.test.ts) into [src/controllers/session-melody/timeline-editing-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/timeline-editing-cluster.test.ts)
- moved [src/controllers/session-transport-controls-controller.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-transport-controls-controller.test.ts) into [src/controllers/session-melody/transport-controls-controller.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody/transport-controls-controller.test.ts)
- updated the moved tests to import their colocated implementations from sibling files inside the session-melody folder
## Third controller P2 test move completed
- moved [src/controllers/session-bootstrap-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap-cluster.test.ts) into [src/controllers/session-bootstrap/cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap/cluster.test.ts)
- moved [src/controllers/session-bootstrap-controller.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap-controller.test.ts) into [src/controllers/session-bootstrap/controller.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap/controller.test.ts)
- moved [src/controllers/session-bootstrap-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap-graph-cluster.test.ts) into [src/controllers/session-bootstrap/graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-bootstrap/graph-cluster.test.ts)
- updated the moved tests to import their colocated implementations from sibling files inside the session-bootstrap folder
## Fourth controller P2 test move completed
- moved [src/controllers/session-workspace-controls-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace-controls-cluster.test.ts) into [src/controllers/session-workspace/controls-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/controls-cluster.test.ts)
- moved [src/controllers/session-workspace-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace-graph-cluster.test.ts) into [src/controllers/session-workspace/graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/graph-cluster.test.ts)
- moved [src/controllers/session-workflow-layout-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-workflow-layout-cluster.test.ts) into [src/controllers/session-workspace/workflow-layout-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/workflow-layout-cluster.test.ts)
- moved [src/controllers/session-setup-ui-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-setup-ui-cluster.test.ts) into [src/controllers/session-workspace/setup-ui-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/setup-ui-cluster.test.ts)
- moved [src/controllers/session-practice-controls-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-practice-controls-cluster.test.ts) into [src/controllers/session-workspace/practice-controls-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/practice-controls-cluster.test.ts)
- moved [src/controllers/session-melody-workflow-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-workflow-cluster.test.ts) into [src/controllers/session-workspace/melody-workflow-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-workspace/melody-workflow-cluster.test.ts)
- updated the moved tests to import their colocated implementations from sibling files inside the session-workspace folder
## Fifth controller P2 test move completed
- moved [src/controllers/session-configuration-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration-graph-cluster.test.ts) into [src/controllers/session-configuration/graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration/graph-cluster.test.ts)
- moved [src/controllers/session-configuration-graph-deps.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration-graph-deps.test.ts) into [src/controllers/session-configuration/graph-deps.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-configuration/graph-deps.test.ts)
- updated the moved tests to import their colocated implementations from sibling files inside the session-configuration folder and to mock neighboring folder APIs through relative domain paths
## Sixth controller P2 test move completed
- moved [src/controllers/session-controller-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-cluster.test.ts) into [src/controllers/session-controller-graph/graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph/graph-cluster.test.ts)
- moved [src/controllers/session-controller-graph-deps.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph-deps.test.ts) into [src/controllers/session-controller-graph/graph-deps.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph/graph-deps.test.ts)
- moved [src/controllers/session-controller-entrypoint-graph-deps.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-entrypoint-graph-deps.test.ts) into [src/controllers/session-controller-graph/entrypoint-graph-deps.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-controller-graph/entrypoint-graph-deps.test.ts)
- updated the moved tests to import colocated graph files and to mock cross-domain folder APIs through paths relative to the session-controller-graph folder
## Seventh controller P2 test move completed
- moved [src/controllers/session-editor-bootstrap-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap-graph-cluster.test.ts) into [src/controllers/session-editor-bootstrap/graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/graph-cluster.test.ts)
- moved [src/controllers/session-editor-bootstrap-graph-deps.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap-graph-deps.test.ts) into [src/controllers/session-editor-bootstrap/graph-deps.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/graph-deps.test.ts)
- moved [src/controllers/session-editor-bootstrap-entrypoint-graph-deps.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap-entrypoint-graph-deps.test.ts) into [src/controllers/session-editor-bootstrap/entrypoint-graph-deps.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-bootstrap/entrypoint-graph-deps.test.ts)
- updated the moved tests to import colocated graph files and expanded their entrypoint mocks to cover the shared runtime surface now resolved through the domain-local layout
## Eighth controller P2 test move completed
- moved [src/controllers/session-editor-controls-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-controls-cluster.test.ts) into [src/controllers/session-editor/controls-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor/controls-cluster.test.ts)
- moved [src/controllers/session-editor-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor-graph-cluster.test.ts) into [src/controllers/session-editor/graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-editor/graph-cluster.test.ts)
- updated the moved tests to import colocated graph files and to mock sibling folder APIs through paths relative to the session-editor folder
## Ninth controller P2 test move completed
- moved [src/controllers/session-melody-runtime-graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-runtime-graph-cluster.test.ts) into [src/controllers/session-melody-runtime/graph-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-melody-runtime/graph-cluster.test.ts)
- updated the moved test to import the colocated graph file and to mock neighboring folder APIs through paths relative to the session-melody-runtime folder
## Tenth controller P2 test move completed
- moved [src/controllers/session-metronome-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-metronome-cluster.test.ts) into [src/controllers/session-metronome/cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-metronome/cluster.test.ts)
- updated the moved test to import the colocated cluster file from the session-metronome folder
## Eleventh controller P2 test move completed
- moved [src/controllers/session-input-controls-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-input-controls-cluster.test.ts) into [src/controllers/session-input-controls/cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-input-controls/cluster.test.ts)
- updated the moved test to import the colocated cluster file from the session-input-controls folder
## Twelfth controller P2 test move completed
- moved [src/controllers/session-curriculum-preset-cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-curriculum-preset-cluster.test.ts) into [src/controllers/session-curriculum-preset/cluster.test.ts](C:/Projects/FretboardTrainer/src/controllers/session-curriculum-preset/cluster.test.ts)
- updated the moved test to import the colocated cluster file from the session-curriculum-preset folder
## Controller P2 test colocation completed
- all remaining root-level `src/controllers/session-*.test.ts` files have now been moved into their domain folders
- the remaining root-level `session-*` files are compatibility shims, while domain code and domain tests are now colocated under folder-level APIs
## Controller shim removal completed
- removed the remaining root-level `src/controllers/session-*` compatibility shims plus the old root-level runtime-ui controller entrypoints after folder APIs and colocated tests were fully in place
- verified the post-removal layout with `npm run typecheck` and a full `npm run test -- src/controllers` pass; the controller suite completed with `81` passing files and `234` passing tests
- the controller portion of the physical restructuring plan is now complete: controller implementations and their domain tests live inside folder-level slices, and the legacy root shim layer has been eliminated
