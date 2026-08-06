/**
 * Pure helpers that split Chat bubble text into path / URL / code segments
 * for clickable rendering (Desktop streamdown parity — light host version).
 * Shared implementation lives in `@altai/agent-ui` (Wave 4 / A6.15).
 */

export {
  fileUriToPath,
  isHttpUrl,
  segmentChatContent,
  segmentTextWithLinks,
  type ChatContentSegment,
} from "@altai/agent-ui";
