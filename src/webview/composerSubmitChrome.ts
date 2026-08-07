/**
 * VS Code re-exports Desktop-aligned Send/Stop policy from `@altai/agent-ui`
 * so host chrome and tests stay on one implementation (A6.21).
 */

export {
  canEnableComposerSend,
  canEnableComposerStop,
  composerSubmitChromeMode,
  type ComposerSubmitChromeMode,
} from "@altai/agent-ui";
