/**
 * Pure helpers for run/replay chrome gating.
 */

export function canMountReplayControl(input: {
  replay: boolean;
  chatId: string | null | undefined;
  runId: string | null | undefined;
}): boolean {
  return (
    input.replay &&
    Boolean(input.chatId?.trim()) &&
    Boolean(input.runId?.trim())
  );
}
