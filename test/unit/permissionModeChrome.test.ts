import { describe, expect, it } from "vitest";
import { canMountPermissionModeSwitcher } from "../../src/webview/permissionModeChrome.js";

describe("canMountPermissionModeSwitcher", () => {
  it("requires load + update capabilities together", () => {
    expect(
      canMountPermissionModeSwitcher({
        permissionModes: true,
        settingsGet: true,
        settingsUpdate: true,
      }),
    ).toBe(true);
    expect(
      canMountPermissionModeSwitcher({
        permissionModes: true,
        settingsGet: true,
        settingsUpdate: false,
      }),
    ).toBe(false);
    expect(
      canMountPermissionModeSwitcher({
        permissionModes: false,
        settingsGet: true,
        settingsUpdate: true,
      }),
    ).toBe(false);
  });
});
