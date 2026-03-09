import type { UiWorkflow } from './training-workflows';
import { resolveWorkflowLayout, type SessionToolsVisibility } from './workflow-layout';

export type { SessionToolsVisibility } from './workflow-layout';

export function resolveSessionToolsVisibility(mode: string, workflow: UiWorkflow): SessionToolsVisibility {
  return resolveWorkflowLayout({ workflow, trainingMode: mode }).sessionTools;
}