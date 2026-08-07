/**
 * Pure formatter for VS Code language diagnostics → composer selection text.
 */

export type DiagnosticLike = {
  severity: number;
  message: string;
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
  source?: string;
};

const SEVERITY_LABEL: Record<number, string> = {
  0: "Error",
  1: "Warning",
  2: "Info",
  3: "Hint",
};

const MAX_PROBLEMS = 40;
const MAX_CHARS = 12_000;

export function formatProblemsContextText(
  pathLabel: string,
  diagnostics: readonly DiagnosticLike[],
): string | null {
  if (diagnostics.length === 0) {
    return null;
  }
  // Prefer errors then warnings.
  const sorted = [...diagnostics].sort((a, b) => a.severity - b.severity);
  const lines: string[] = [`Problems in ${pathLabel}:`];
  let count = 0;
  for (const d of sorted) {
    if (count >= MAX_PROBLEMS) {
      lines.push(`…and ${sorted.length - count} more`);
      break;
    }
    const label = SEVERITY_LABEL[d.severity] ?? `Severity ${d.severity}`;
    const src = d.source?.trim() ? ` [${d.source.trim()}]` : "";
    const range = `L${d.startLine + 1}:${d.startCharacter + 1}`;
    lines.push(`- ${label}${src} ${range}: ${d.message.trim()}`);
    count += 1;
  }
  let text = lines.join("\n");
  if (text.length > MAX_CHARS) {
    text = `${text.slice(0, MAX_CHARS - 1)}…`;
  }
  return text;
}
