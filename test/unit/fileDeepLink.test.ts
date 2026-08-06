import { describe, expect, it } from "vitest";
import {
  buildOpenChatWithFilePayload,
  parseOpenChatWithFilePayload,
} from "../../src/shared/fileDeepLink.js";

describe("buildOpenChatWithFilePayload", () => {
  it("builds a payload with basename when name omitted", () => {
    expect(
      buildOpenChatWithFilePayload({
        uri: "file:///tmp/src/a.ts",
        path: "/tmp/src/a.ts",
        key: 7,
      }),
    ).toEqual({
      key: 7,
      uri: "file:///tmp/src/a.ts",
      path: "/tmp/src/a.ts",
      name: "a.ts",
    });
  });

  it("rejects empty uri/path", () => {
    expect(
      buildOpenChatWithFilePayload({
        uri: "",
        path: "/tmp/a.ts",
      }),
    ).toBeNull();
  });
});

describe("parseOpenChatWithFilePayload", () => {
  it("accepts valid payloads", () => {
    expect(
      parseOpenChatWithFilePayload({
        key: 1,
        uri: "file:///tmp/a.ts",
        path: "/tmp/a.ts",
        name: "a.ts",
      }),
    ).toEqual({
      key: 1,
      uri: "file:///tmp/a.ts",
      path: "/tmp/a.ts",
      name: "a.ts",
    });
  });

  it("rejects malformed payloads", () => {
    expect(parseOpenChatWithFilePayload(null)).toBeNull();
    expect(
      parseOpenChatWithFilePayload({
        key: 1,
        uri: "file:///tmp/a.ts",
        path: "",
      }),
    ).toBeNull();
  });
});
