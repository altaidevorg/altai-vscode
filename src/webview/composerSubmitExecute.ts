/**
 * VS Code re-exports ports-first composer submit execution from
 * `@altai/agent-ui` (A6.36). Host still owns runtime startRun / steer.
 */

export {
  executeComposerSubmit,
  type ComposerSubmitExecuteResult,
  type ComposerSubmitHostHandlers,
} from "@altai/agent-ui";
