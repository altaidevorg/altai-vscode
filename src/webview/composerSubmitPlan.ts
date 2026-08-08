/**
 * VS Code re-exports ports-first composer submit planning from
 * `@altai/agent-ui` (A6.33). Host still owns startRun / slash action dispatch.
 */

export {
  planComposerSubmit,
  type ComposerSlashResolver,
  type ComposerSubmitPlan,
  type ComposerSubmitSnapshot,
} from "@altai/agent-ui";
