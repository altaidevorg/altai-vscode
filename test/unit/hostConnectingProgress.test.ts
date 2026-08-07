import { describe, expect, it } from "vitest";
import { hostConnectingProgressPresentation } from "../../src/shared/hostConnectingProgress.js";

describe("hostConnectingProgressPresentation", () => {
  it("shows only while connecting", () => {
    expect(
      hostConnectingProgressPresentation({ status: "ready" }),
    ).toMatchObject({ show: false });
    expect(
      hostConnectingProgressPresentation({
        status: "connecting",
        message: "initialize",
      }),
    ).toEqual({
      show: true,
      title: "ALTAI agent host: initialize",
    });
  });
});
