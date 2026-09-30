import { describe, expect, it } from "vitest";
import { getAvatarAura, PERSONAL_PROFILE_AURA } from "./avatar-aura";

describe("avatar aura selection", () => {
  it("uses the active shiny avatar aura", () => {
    expect(getAvatarAura("lion-shiny")?.id).toBe("lion-shiny");
    expect(getAvatarAura("avatar-dragon-shiny.webp")?.id).toBe("dragon-shiny");
  });

  it("does not carry a stale shiny aura onto a regular avatar or photo", () => {
    expect(getAvatarAura("lion-m", "lion-shiny")).toBeUndefined();
    expect(getAvatarAura(undefined, "lion-shiny")).toBeUndefined();
  });

  it("provides a stable personal fallback aura for non-shiny avatars", () => {
    expect(PERSONAL_PROFILE_AURA.glowColor).toBe("#8557D9");
    expect(PERSONAL_PROFILE_AURA.style).toBe("rays");
  });
});
