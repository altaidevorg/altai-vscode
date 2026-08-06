/**
 * Host-local mapping: ChatDisplayMessage[] → consecutive collapsible tool
 * groups. Pure rules (no React). Prefer built-in agent-ui group helpers when
 * tool names match desktop catalogs; also merge any consecutive ≥2 tools.
 */

export type TranscriptDisplayMessage = {
  id: string;
  role: string;
  toolName?: string;
  content: string;
  filePath?: string;
  streaming?: boolean;
};

export type DisplayTranscriptBlock =
  | { kind: "message"; message: TranscriptDisplayMessage }
  | {
      kind: "tool-group";
      groupKind: ToolGroupKind;
      key: string;
      label: string;
      countLabel: string;
      preview: string | undefined;
      messages: TranscriptDisplayMessage[];
    };

/** Normalize tool name for group kind detection. */
export function normalizeToolName(name: string | undefined): string {
  return (name ?? "").toLowerCase().replace(/[\s-]+/g, "_");
}

export type ToolGroupKind = "reads" | "web" | "cmd" | "tools";

const READ = new Set(["read_file", "read", "view_file"]);
const WEB = new Set([
  "web_search",
  "web_fetch",
  "arxiv_search",
  "arxiv_fetch",
  "hf_hub_file_fetch",
]);
const CMD = new Set([
  "exec",
  "execution_run",
  "execution_run_background",
  "shell",
  "bash",
]);

export function toolGroupKindFor(
  message: TranscriptDisplayMessage,
): ToolGroupKind | null {
  if (message.role !== "tool" || message.streaming) {
    return null;
  }
  const name = normalizeToolName(message.toolName);
  if (!name) {
    return "tools";
  }
  if (READ.has(name)) {
    return "reads";
  }
  if (WEB.has(name)) {
    return "web";
  }
  if (CMD.has(name)) {
    return "cmd";
  }
  return "tools";
}

export function groupLabel(kind: ToolGroupKind): string {
  switch (kind) {
    case "reads":
      return "Read";
    case "web":
      return "Web";
    case "cmd":
      return "Ran";
    default:
      return "Tools";
  }
}

export function groupCountLabel(
  kind: ToolGroupKind,
  count: number,
): string {
  if (kind === "reads") {
    return count === 1 ? "1 file" : `${count} files`;
  }
  if (kind === "cmd") {
    return count === 1 ? "1 command" : `${count} commands`;
  }
  return count === 1 ? "1 call" : `${count} calls`;
}

export function groupPreview(
  kind: ToolGroupKind,
  messages: readonly TranscriptDisplayMessage[],
  max = 3,
): string | undefined {
  const bits: string[] = [];
  for (const message of messages) {
    let fragment: string | undefined;
    if (kind === "reads" || kind === "tools") {
      const path = message.filePath?.trim();
      if (path) {
        const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
        fragment = i >= 0 ? path.slice(i + 1) : path;
      } else {
        fragment = message.toolName || message.content.slice(0, 40) || undefined;
      }
    } else if (kind === "cmd") {
      fragment =
        message.content.split("\n")[0]?.trim().slice(0, 80) ||
        message.toolName ||
        undefined;
    } else {
      fragment = message.toolName || message.content.slice(0, 40) || undefined;
    }
    if (fragment && !bits.includes(fragment)) {
      bits.push(fragment);
    }
    if (bits.length >= max) {
      break;
    }
  }
  if (bits.length === 0) {
    return undefined;
  }
  const more = messages.length > bits.length ? `, +${messages.length - bits.length} more` : "";
  return `${bits.join(", ")}${more}`;
}

/**
 * Collapse consecutive groupable tool rows (≥2 same kind) into tool-groups.
 * Single tools and other roles stay as message blocks.
 */
export function buildDisplayTranscriptBlocks(
  messages: readonly TranscriptDisplayMessage[],
): DisplayTranscriptBlock[] {
  const out: DisplayTranscriptBlock[] = [];
  let run: {
    kind: ToolGroupKind;
    messages: TranscriptDisplayMessage[];
  } | null = null;

  const flush = (): void => {
    if (!run) {
      return;
    }
    if (run.messages.length >= 2) {
      const first = run.messages[0]!;
      out.push({
        kind: "tool-group",
        groupKind: run.kind,
        key: `group-${run.kind}-${first.id}`,
        label: groupLabel(run.kind),
        countLabel: groupCountLabel(run.kind, run.messages.length),
        preview: groupPreview(run.kind, run.messages),
        messages: run.messages,
      });
    } else {
      for (const message of run.messages) {
        out.push({ kind: "message", message });
      }
    }
    run = null;
  };

  for (const message of messages) {
    const kind = toolGroupKindFor(message);
    if (kind) {
      if (run && run.kind === kind) {
        run.messages.push(message);
      } else {
        flush();
        run = { kind, messages: [message] };
      }
      continue;
    }
    flush();
    out.push({ kind: "message", message });
  }
  flush();
  return out;
}
