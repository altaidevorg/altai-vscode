/**
 * When to offer a Copy action on a transcript bubble.
 */

export function canCopyDisplayMessage(input: {
  role: string;
  content: string;
  streaming?: boolean;
}): boolean {
  if (input.streaming) {
    return false;
  }
  if (input.role !== "user" && input.role !== "assistant") {
    return false;
  }
  return input.content.trim().length > 0;
}
