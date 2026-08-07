import { describe, expect, it } from "vitest";
import {
  enabledExcludePatterns,
  searchExcludeGlobFromSettings,
} from "../../src/shared/searchExcludeGlobs.js";

describe("enabledExcludePatterns", () => {
  it("keeps only patterns explicitly enabled", () => {
    expect(
      enabledExcludePatterns({
        "**/dist": true,
        "**/tmp": false,
        "": true,
      }),
    ).toEqual(["**/dist"]);
  });
});

describe("searchExcludeGlobFromSettings", () => {
  it("includes defaults and merges settings", () => {
    expect(
      searchExcludeGlobFromSettings({
        filesExclude: { "**/build": true },
        searchExclude: { "**/coverage": true },
      }),
    ).toBe("{**/.git,**/node_modules,**/build,**/coverage}");
  });

  it("deduplicates overlapping defaults", () => {
    expect(
      searchExcludeGlobFromSettings({
        filesExclude: { "**/.git": true },
      }),
    ).toBe("{**/.git,**/node_modules}");
  });
});
