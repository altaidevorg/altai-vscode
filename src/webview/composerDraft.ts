/**
 * VS Code re-exports pure composer draft / dispatch prelude helpers from
 * `@altai/agent-ui` (A6.30). Host slash registries and FileReader stay local.
 */

export {
  MAX_PDF_INLINE_BYTES,
  appendUniqueByKey,
  applyComposerSlashOutcome,
  basenameForAttach,
  browserFileToAttachment,
  buildComposerCommandSource,
  classifyBrowserFile,
  removeAcceptedItems,
  selectionToComposerAttachment,
  type BrowserFileClass,
  type ComposerSlashOutcome,
} from "@altai/agent-ui";
