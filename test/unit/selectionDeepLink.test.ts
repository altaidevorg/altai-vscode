import { describe, expect, it } from "vitest";
import {
  buildOpenChatWithSelectionPayload,
  parseOpenChatWithSelectionPayload,
} from "../../src/shared/selectionDeepLink.js";

describe("buildOpenChatWithSelectionPayload", () => {
  it("builds a payload with line counts", () => {
    const payload = buildOpenChatWithSelectionPayload({
      uri: "file:///tmp/a.ts",
      path: "/tmp/a.ts",
      text: "one\ntwo\n",
      key: 42,
    });
    expect(payload).toEqual({
      key: 42,
      uri: "file:///tmp/a.ts",
      path: "/tmp/a.ts",
      text: "one\ntwo\n",
      lines: 2,
    });
  });

  it("rejects empty text or path", () => {
    expect(
      buildOpenChatWithSelectionPayload({
        uri: "file:///tmp/a.ts",
        path: "/tmp/a.ts",
        text: "   ",
      }),
    ).toBeNull();
  });
});

describe("parseOpenChatWithSelectionPayload", () => {
  it("accepts valid payloads and recomputes lines when missing", () => {
    expect(
      parseOpenChatWithSelectionPayload({
        key: 1,
        uri: "file:///tmp/a.ts",
        path: "/tmp/a.ts",
        text: "line",
      }),
    ).toEqual({
      key: 1,
      uri: "file:///tmp/a.ts",
      path: "/tmp/a.ts",
      text: "line",
      lines: 1,
    });
  });

  it("rejects malformed payloads", () => {
    expect(parseOpenChatWithSelectionPayload(null)).toBeNull();
    expect(
      parseOpenChatWithSelectionPayload({
        key: 1,
        uri: "file:///tmp/a.ts",
        path: "/tmp/a.ts",
        text: "",
      }),
    ).toBeNull();
    expect(
      parseOpenChatWithSelectionPayload({
        key: "x",
        uri: "file:///tmp/a.ts",
        path: "/tmp/a.ts",
        text: "ok",
      }),
    ).toBeNull();
  });
});
