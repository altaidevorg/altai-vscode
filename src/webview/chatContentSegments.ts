/**
 * Pure helpers that split Chat bubble text into path / URL / code segments
 * for clickable rendering (Desktop streamdown parity — light host version).
 */

export type ChatContentSegment =
  | { kind: "text"; text: string }
  | { kind: "path"; text: string; path: string }
  | { kind: "url"; text: string; href: string }
  | { kind: "code"; text: string; lang?: string };

const FENCE_RE = /```([A-Za-z0-9_+-]*)\r?\n([\s\S]*?)```/g;

/**
 * Absolute / file-URI tokens that open in the workspace editor when trusted.
 * Conservative: avoids bare relative paths and domain-looking strings.
 */
const PATH_OR_URL_RE =
  /file:\/\/[^\s<>"'`]+|https?:\/\/[^\s<>"'`]+|\/(?:Users|home|var|tmp|private|opt|etc|usr|workspace|src)[^\s<>"'`]*|[A-Za-z]:\\[^\s<>"'`]+/g;

/** Split fenced code blocks first, then path/URL tokens inside plain ranges. */
export function segmentChatContent(content: string): ChatContentSegment[] {
  if (!content) {
    return [];
  }
  const outer: ChatContentSegment[] = [];
  let last = 0;
  for (const match of content.matchAll(FENCE_RE)) {
    const index = match.index ?? 0;
    if (index > last) {
      outer.push(...segmentTextWithLinks(content.slice(last, index)));
    }
    const lang = match[1]?.trim() || undefined;
    const body = match[2] ?? "";
    outer.push({
      kind: "code",
      text: body.replace(/\n$/, ""),
      ...(lang ? { lang } : {}),
    });
    last = index + match[0].length;
  }
  if (last < content.length) {
    outer.push(...segmentTextWithLinks(content.slice(last)));
  }
  return outer.length > 0 ? outer : [{ kind: "text", text: content }];
}

export function segmentTextWithLinks(text: string): ChatContentSegment[] {
  if (!text) {
    return [];
  }
  const out: ChatContentSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(PATH_OR_URL_RE)) {
    const index = match.index ?? 0;
    const token = match[0];
    if (index > last) {
      out.push({ kind: "text", text: text.slice(last, index) });
    }
    const trimmed = stripTrailingPunctuation(token);
    const trailing = token.slice(trimmed.length);
    if (isHttpUrl(trimmed)) {
      out.push({ kind: "url", text: trimmed, href: trimmed });
    } else {
      const path = fileUriToPath(trimmed) ?? trimmed;
      out.push({ kind: "path", text: trimmed, path });
    }
    if (trailing) {
      out.push({ kind: "text", text: trailing });
    }
    last = index + token.length;
  }
  if (last < text.length) {
    out.push({ kind: "text", text: text.slice(last) });
  }
  return out.length > 0 ? out : [{ kind: "text", text }];
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** Convert file:// URI to a local path form preferred by pathToFileUri reverse. */
export function fileUriToPath(value: string): string | null {
  if (!value.startsWith("file:")) {
    return null;
  }
  try {
    const url = new URL(value);
    let path = decodeURIComponent(url.pathname);
    if (/^\/[A-Za-z]:\//.test(path)) {
      path = path.slice(1);
    }
    return path;
  } catch {
    return value.replace(/^file:\/\//i, "");
  }
}

function stripTrailingPunctuation(token: string): string {
  return token.replace(/[),.;:]+$/g, "");
}
