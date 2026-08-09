import { describe, expect, it } from "vitest";
import {
  nativeMethodAvailable,
  parseNativeMethodList,
} from "../../src/webview/nativeMethodList.js";

describe("nativeMethodList re-export (A6.141)", () => {
  it("parses and gates methods", () => {
    expect(parseNativeMethodList(["review/proposals/apply"])).toEqual([
      "review/proposals/apply",
    ]);
    expect(nativeMethodAvailable(null, "x")).toBe(true);
    expect(nativeMethodAvailable([], "x")).toBe(false);
  });
});
