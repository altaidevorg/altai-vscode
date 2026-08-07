import { describe, expect, it } from "vitest";
import {
  includeUriInWorkspaceProblemsAttach,
  isWorkspaceNotTrustedError,
} from "./workspaceTrustAttach";

describe("isWorkspaceNotTrustedError", () => {
  it("matches host code and phrase", () => {
    expect(isWorkspaceNotTrustedError(new Error("workspace_not_trusted"))).toBe(
      true,
    );
    expect(isWorkspaceNotTrustedError("Workspace is not trusted")).toBe(true);
    expect(isWorkspaceNotTrustedError(new Error("host.missing"))).toBe(false);
  });
});

describe("includeUriInWorkspaceProblemsAttach", () => {
  it("includes all folders when no preferred root", () => {
    expect(
      includeUriInWorkspaceProblemsAttach({
        uriFolderUri: "file:///a",
      }),
    ).toBe(true);
  });

  it("scopes to preferred folder URI", () => {
    expect(
      includeUriInWorkspaceProblemsAttach({
        uriFolderUri: "file:///a",
        preferredFolderUri: "file:///a",
      }),
    ).toBe(true);
    expect(
      includeUriInWorkspaceProblemsAttach({
        uriFolderUri: "file:///b",
        preferredFolderUri: "file:///a",
      }),
    ).toBe(false);
  });
});
