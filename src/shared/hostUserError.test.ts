import { describe, expect, it } from "vitest";
import {
  extractHostErrorCode,
  formatHostUserError,
  isJournalUnavailableError,
} from "./hostUserError.js";

describe("formatHostUserError", () => {
  it("maps journal and config codes to user copy", () => {
    expect(formatHostUserError(new Error("journal_unavailable"))).toMatch(
      /history is unavailable/i,
    );
    expect(formatHostUserError("unsupported_config_patch")).toMatch(
      /cannot be saved/i,
    );
    expect(isJournalUnavailableError("journal_unavailable")).toBe(true);
  });

  it("extracts code from longer messages", () => {
    expect(
      extractHostErrorCode(new Error("Host request failed: journal_unavailable")),
    ).toBe("journal_unavailable");
  });

  it("softens unknown snake codes", () => {
    expect(formatHostUserError("weird_host_code")).toMatch(/weird host code/i);
  });
});
