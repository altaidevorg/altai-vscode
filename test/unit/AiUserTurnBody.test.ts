import { describe, expect, it } from "vitest";
import { AiUserTurnBody } from "../../src/webview/AiUserTurnBody.js";

describe("AiUserTurnBody re-export", () => {
  it("exports a component", () => {
    expect(typeof AiUserTurnBody).toBe("function");
  });
});
