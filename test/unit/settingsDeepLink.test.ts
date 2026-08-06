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
});
