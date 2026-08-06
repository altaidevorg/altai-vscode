import { describe, expect, it } from "vitest";
import {
  composePromptWithSnippets,
  DEFAULT_SNIPPETS,
  expandSnippetTokens,
  findSnippets,
  insertSnippetHandle,
  mergeSnippetCatalogs,
  parseWorkspaceSnippetsJson,
} from "../../src/webview/composerSnippets.js";

describe("findSnippets", () => {
  it("filters by handle and description", () => {
    expect(findSnippets(DEFAULT_SNIPPETS, "pr").some((s) => s.handle === "pr")).toBe(
      true,
    );
    expect(findSnippets(DEFAULT_SNIPPETS, "zzzz")).toHaveLength(0);
  });
});

describe("expandSnippetTokens", () => {
  it("expands known tokens and strips handles", () => {
    const { body, blocks, matched } = expandSnippetTokens(
      "Please #pr carefully",
      DEFAULT_SNIPPETS,
    );
    expect(matched.some((s) => s.handle === "pr")).toBe(true);
    expect(blocks[0]).toContain('<snippet name="pr">');
    expect(body).toBe("Please carefully");
  });

  it("leaves unknown tokens", () => {
    const { body, blocks } = expandSnippetTokens("use #nonesuch", DEFAULT_SNIPPETS);
    expect(body).toContain("#nonesuch");
    expect(blocks).toHaveLength(0);
  });
});

describe("composePromptWithSnippets", () => {
  it("prepends blocks", () => {
    const { prompt } = composePromptWithSnippets("#pr next", DEFAULT_SNIPPETS);
    expect(prompt.startsWith("<snippet name=\"pr\">")).toBe(true);
    expect(prompt.endsWith("next")).toBe(true);
  });

  it("includes picked chips without inline tokens", () => {
    const picked = DEFAULT_SNIPPETS.filter((s) => s.handle === "explain");
    const { prompt, matched } = composePromptWithSnippets(
      "hello",
      DEFAULT_SNIPPETS,
      picked,
    );
    expect(matched.some((s) => s.handle === "explain")).toBe(true);
    expect(prompt).toContain('<snippet name="explain">');
    expect(prompt).toContain("hello");
  });
});

describe("insertSnippetHandle", () => {
  it("replaces an open #query token", () => {
    expect(insertSnippetHandle("hi #p", { start: 3, end: 5 }, "pr")).toBe(
      "hi #pr ",
    );
  });
});

describe("parseWorkspaceSnippetsJson", () => {
  it("reads valid entries", () => {
    const list = parseWorkspaceSnippetsJson(
      JSON.stringify([
        { handle: "Team Style", content: "Follow style.md" },
        { handle: "bad!", content: "x" },
        { foo: 1 },
      ]),
    );
    expect(list).toEqual([
      {
        id: "workspace-team-style-0",
        handle: "team-style",
        name: "team-style",
        description: "",
        content: "Follow style.md",
      },
    ]);
  });
});

describe("mergeSnippetCatalogs", () => {
  it("lets workspace override defaults", () => {
    const merged = mergeSnippetCatalogs(DEFAULT_SNIPPETS, [
      {
        id: "ws-pr",
        handle: "pr",
        name: "Custom PR",
        description: "team",
        content: "custom",
      },
    ]);
    expect(merged.find((s) => s.handle === "pr")?.content).toBe("custom");
  });
});
