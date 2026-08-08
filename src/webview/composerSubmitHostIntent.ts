/**
 * VS Code re-exports pure composer submit host-intent mapping from
 * `@altai/agent-ui` (A6.35). Host still owns runtime startRun / steer I/O.
 */

export {
  mapComposerSubmitPlanToHostIntent,
  type ComposerSubmitHostContext,
  type ComposerSubmitHostIntent,
} from "@altai/agent-ui";
