import { describe, expect, it } from "vitest";
import {
  fileUriToPath,
  isHttpUrl,
  segmentChatContent,
  segmentTextWithLinks,
} from "../../src/webview/chatContentSegments.js";

describe("segmentChatContent", () => {
  it("keeps plain text", () => {
    expect(segmentChatContent("hello world")).toEqual([
      { kind: "text", text: "hello world" },
    ]);
  });

  it("extracts absolute paths and urls", () => {
    const segs = segmentTextWithLinks(
      "see /Users/me/proj/src/App.tsx and https://example.com/docs",
    );
    expect(segs).toEqual([
      { kind: "text", text: "see " },
      {
        kind: "path",
        text: "/Users/me/proj/src/App.tsx",
        path: "/Users/me/proj/src/App.tsx",
      },
      { kind: "text", text: " and " },
      {
        kind: "url",
        text: "https://example.com/docs",
        href: "https://example.com/docs",
      },
    ]);
  });

  it("pulls fenced code out of the stream", () => {
    const segs = segmentChatContent("before\n```ts\nconst x = 1;\n```\nafter");
    expect(segs[0]).toEqual({ kind: "text", text: "before\n" });
    expect(segs[1]).toEqual({
      kind: "code",
      text: "const x = 1;",
      lang: "ts",
    });
    expect(segs[2]).toEqual({ kind: "text", text: "\nafter" });
  });
});

describe("helpers", () => {
  it("classifies URLs and file URIs", () => {
    expect(isHttpUrl("https://x.test")).toBe(true);
    expect(fileUriToPath("file:///Users/a/b.ts")).toBe("/Users/a/b.ts");
  });
});
