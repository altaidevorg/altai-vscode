import { describe, expect, it } from "vitest";
import {
  PREFERRED_HOST_ROOT_STATE_KEY,
  readPreferredHostRootFromState,
  retainPreferredHostRootUri,
} from "../../src/shared/preferredHostRoot.js";

describe("retainPreferredHostRootUri", () => {
  it("keeps preferred only when still open", () => {
    expect(
      retainPreferredHostRootUri("file:///a", ["file:///a", "file:///b"]),
    ).toBe("file:///a");
    expect(retainPreferredHostRootUri("file:///z", ["file:///a"])).toBeUndefined();
    expect(retainPreferredHostRootUri("", ["file:///a"])).toBeUndefined();
  });
});

describe("readPreferredHostRootFromState", () => {
  it("reads memento and filters stale roots", () => {
    expect(
      readPreferredHostRootFromState(
        {
          get: (key) =>
            key === PREFERRED_HOST_ROOT_STATE_KEY ? "file:///b" : undefined,
        },
        ["file:///a", "file:///b"],
      ),
    ).toBe("file:///b");
    expect(
      readPreferredHostRootFromState(
        {
          get: () => "file:///gone",
        },
        ["file:///a"],
      ),
    ).toBeUndefined();
  });
});
