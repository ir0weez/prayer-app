import { describe, expect, it } from "vitest";
import { getAvatarAura, getPersonalProfileAura, getPersonalProfileAuraTier, PERSONAL_PROFILE_AURA } from "./avatar-aura";

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

  it("maps personal XP levels to purple, bronze, silver, and gold tiers", () => {
    expect(getPersonalProfileAuraTier(1)).toBe("purple");
    expect(getPersonalProfileAuraTier(2)).toBe("purple");
    expect(getPersonalProfileAuraTier(3)).toBe("bronze");
    expect(getPersonalProfileAuraTier(25)).toBe("bronze");
    expect(getPersonalProfileAuraTier(26)).toBe("silver");
    expect(getPersonalProfileAuraTier(49)).toBe("silver");
    expect(getPersonalProfileAuraTier(50)).toBe("gold");
    expect(getPersonalProfileAuraTier(100)).toBe("gold");
  });

  it("does not override shiny avatar auras with the personal level tier", () => {
    expect(getPersonalProfileAura("lion-shiny", "lion-shiny", 50).id).toBe("lion-shiny");
  });
});
