import { describe, expect, it } from "vitest";
import { getAvatarAura } from "./avatar-aura";

describe("avatar aura selection", () => {
  it("uses the active shiny avatar aura", () => {
    expect(getAvatarAura("lion-shiny")?.id).toBe("lion-shiny");
    expect(getAvatarAura("avatar-dragon-shiny.webp")?.id).toBe("dragon-shiny");
  });

  it("does not carry a stale shiny aura onto a regular avatar or photo", () => {
    expect(getAvatarAura("lion-m", "lion-shiny")).toBeUndefined();
    expect(getAvatarAura(undefined, "lion-shiny")).toBeUndefined();
  });
});
