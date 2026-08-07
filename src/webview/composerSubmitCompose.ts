/**
 * VS Code re-exports Desktop-aligned pure composer submit composition from
 * `@altai/agent-ui` (A6.27). VS Code host prompt fencing remains in
 * `composerContext.ts`; these helpers stay available for parity and tests.
 */

export {
  composeComposerSubmitText,
  extractComposerMultimodalParts,
  formatComposerFileBlocks,
  mergeSnippetBlocks,
  type ComposerMultimodalParts,
} from "@altai/agent-ui";
