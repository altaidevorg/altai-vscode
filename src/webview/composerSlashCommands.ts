/**
 * Host-neutral slash command registry for the Chat composer.
 * Shared implementation lives in `@altai/agent-ui` (A6.97).
 * Host dispatch of SlashHostAction outcomes stays in VS Code.
 */

export {
  SLASH_COMMAND_INDEX,
  findSlashCommands,
  formatSlashHelpDigest,
  resolveSlashCommand,
  tryRunSlashCommand,
  type SlashCommandBehavior,
  type SlashCommandCategory,
  type SlashCommandMeta,
  type SlashHostAction,
  type SlashOutcome,
} from "@altai/agent-ui";
