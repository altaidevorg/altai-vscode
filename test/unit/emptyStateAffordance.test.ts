import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "@altai/agent-ui";

describe("EmptyState affordanceHint A6.63", () => {
  it("shows composer key hints", () => {
    const html = renderToStaticMarkup(
      createElement(EmptyState, {
        agentName: "ALTAI",
        affordanceHint: true,
      }),
    );
    expect(html).toContain("altai-empty-affordance-hint");
  });
});
