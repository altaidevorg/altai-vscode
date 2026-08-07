import { describe, expect, it } from "vitest";
import { shouldNotifyHostRecovered } from "../../src/shared/hostStatusNotify.js";

describe("shouldNotifyHostRecovered", () => {
  it("notifies only on error → ready", () => {
    expect(shouldNotifyHostRecovered(undefined, "ready")).toBe(false);
    expect(shouldNotifyHostRecovered("connecting", "ready")).toBe(false);
    expect(shouldNotifyHostRecovered("ready", "ready")).toBe(false);
    expect(shouldNotifyHostRecovered("error", "ready")).toBe(true);
    expect(shouldNotifyHostRecovered("error", "connecting")).toBe(false);
  });
});
