/**
 * Build selection context text for single- or multi-cursor editor selections.
 *
 * Canonical implementation lives in `@altai/agent-ui` (A6.108). This host-
 * local copy is kept so the Extension Host bundle never imports the agent-ui
 * React tree. Keep behavior in lock-step with the package.
 */

export type SelectionRangeInput = {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
  text: string;
};

export function joinSelectionTexts(
  selections: readonly SelectionRangeInput[],
): { text: string; range: Omit<SelectionRangeInput, "text"> } | null {
  const nonEmpty = selections.filter((s) => s.text.length > 0);
  if (nonEmpty.length === 0) {
    return null;
  }
  if (nonEmpty.length === 1) {
    const only = nonEmpty[0]!;
    return {
      text: only.text,
      range: {
        startLine: only.startLine,
        startCharacter: only.startCharacter,
        endLine: only.endLine,
        endCharacter: only.endCharacter,
      },
    };
  }
  const parts = nonEmpty.map(
    (selection, index) =>
      `--- selection ${index + 1} (L${selection.startLine + 1}) ---\n${selection.text}`,
  );
  const first = nonEmpty[0]!;
  const last = nonEmpty[nonEmpty.length - 1]!;
  return {
    text: parts.join("\n\n"),
    range: {
      startLine: first.startLine,
      startCharacter: first.startCharacter,
      endLine: last.endLine,
      endCharacter: last.endCharacter,
    },
  };
}
