/**
 * VS Code re-exports pure composer attachment / draft helpers from
 * `@altai/agent-ui` (A6.25). Host-specific context chips remain in
 * `composerContext.ts` (RunAttachment shaping for VS Code).
 */

export {
  MAX_TEXT_INLINE,
  MAX_CONTEXT_TEXT_CHARS,
  ACCEPTED_COMPOSER_FILES,
  ACCEPTED_FILES,
  boundContextText,
  buildTextContextAttachment,
  upsertComposerAttachment,
  hasNativeBinaryAttachment,
  hasComposerDraft,
  estimateComposerContextTokens,
  type ComposerFileKind,
  type ComposerFileAttachment,
} from "@altai/agent-ui";
