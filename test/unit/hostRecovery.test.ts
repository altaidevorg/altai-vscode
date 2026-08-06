import { describe, expect, it } from "vitest";
import { recoveryHintForDiagnosticCode } from "../../src/shared/hostRecovery.js";

describe("recoveryHintForDiagnosticCode", () => {
  it("maps known codes", () => {
    expect(recoveryHintForDiagnosticCode("host.untrusted")).toMatch(/Trust/i);
    expect(recoveryHintForDiagnosticCode("host.missing")).toMatch(
      /ALTAI_AGENT_HOST_PATH|VSIX/,
    );
    expect(recoveryHintForDiagnosticCode("nope")).toBeUndefined();
  });
});
