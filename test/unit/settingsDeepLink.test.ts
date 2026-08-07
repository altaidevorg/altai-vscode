import { describe, expect, it } from "vitest";
import {
  buildOpenSettingsPayload,
  parseOpenSettingsPayload,
} from "../../src/shared/settingsDeepLink.js";

describe("settings deep link", () => {
  it("builds and parses payloads", () => {
    const payload = buildOpenSettingsPayload({ key: 42 });
    expect(payload).toEqual({ key: 42 });
    expect(parseOpenSettingsPayload(payload)).toEqual({ key: 42 });
    expect(parseOpenSettingsPayload({ key: "x" })).toBeNull();
  });

  it("round-trips optional section ids", () => {
    const payload = buildOpenSettingsPayload({ key: 7, section: "models" });
    expect(payload).toEqual({ key: 7, section: "models" });
    expect(parseOpenSettingsPayload(payload)).toEqual({
      key: 7,
      section: "models",
    });
    expect(
      parseOpenSettingsPayload({ key: 1, section: "Not-Valid" }),
    ).toEqual({ key: 1 });
  });
});
