import { describe, expect, it } from "vitest";
import {
  canMountProviderStatus,
  displayProviderLabel,
  firstConnectableProvider,
  hasConnectedProvider,
  providerStatusCopy,
  shouldShowProviderConnectBanner,
  sortProvidersForDisplay,
} from "../../src/webview/providerStatusChrome.js";

describe("canMountProviderStatus", () => {
  it("requires the providerStatus capability", () => {
    expect(canMountProviderStatus({ providerStatus: true })).toBe(true);
    expect(canMountProviderStatus({ providerStatus: false })).toBe(false);
  });
});

describe("sortProvidersForDisplay", () => {
  it("surfaces errors and disconnected providers first", () => {
    const sorted = sortProvidersForDisplay([
      { providerId: "a", connected: true, label: "A" },
      { providerId: "b", connected: false, label: "B" },
      { providerId: "c", connected: false, label: "C", error: "expired" },
    ]);
    expect(sorted.map((item) => item.providerId)).toEqual(["c", "b", "a"]);
  });
});

describe("provider display helpers", () => {
  it("prefers labels and formats status copy", () => {
    expect(
      displayProviderLabel({
        providerId: "openai",
        connected: true,
        label: "  OpenAI  ",
      }),
    ).toBe("OpenAI");
    expect(
      providerStatusCopy({
        providerId: "openai",
        connected: false,
        error: "missing key",
      }),
    ).toBe("missing key");
    expect(
      providerStatusCopy({ providerId: "openai", connected: true }),
    ).toBe("Connected");
  });
});

describe("provider connect banner helpers", () => {
  it("detects usable provider connections", () => {
    expect(hasConnectedProvider([])).toBe(false);
    expect(
      hasConnectedProvider([{ providerId: "a", connected: false }]),
    ).toBe(false);
    expect(
      hasConnectedProvider([
        { providerId: "a", connected: false },
        { providerId: "b", connected: true },
      ]),
    ).toBe(true);
  });

  it("shows the banner only when status is ready and nothing is connected", () => {
    expect(
      shouldShowProviderConnectBanner({
        providerStatus: true,
        ready: true,
        providers: [{ providerId: "openai", connected: false }],
      }),
    ).toBe(true);
    expect(
      shouldShowProviderConnectBanner({
        providerStatus: true,
        ready: false,
        providers: [],
      }),
    ).toBe(false);
    expect(
      shouldShowProviderConnectBanner({
        providerStatus: false,
        ready: true,
        providers: [],
      }),
    ).toBe(false);
    expect(
      shouldShowProviderConnectBanner({
        providerStatus: true,
        ready: true,
        providers: [{ providerId: "openai", connected: true }],
      }),
    ).toBe(false);
  });

  it("picks the first disconnected provider for Connect", () => {
    expect(firstConnectableProvider([])).toBeNull();
    expect(
      firstConnectableProvider([
        { providerId: "a", connected: true, label: "A" },
        { providerId: "b", connected: false, label: "B" },
        { providerId: "c", connected: false, label: "C", error: "expired" },
      ])?.providerId,
    ).toBe("c");
  });
});
