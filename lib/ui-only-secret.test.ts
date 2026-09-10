import { describe, expect, it } from "vitest";

describe("UI-only environment validation", () => {
  it("can reach the local API health endpoint with the configured request header", async () => {
    const response = await fetch("http://127.0.0.1:3000/api/health", {
      headers: { "x-ui-only-no-secret": process.env.UI_ONLY_NO_SECRET ?? "" },
    });
    expect(response.ok).toBe(true);
  });
});
