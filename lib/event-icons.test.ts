import { describe, it, expect } from "vitest";
import { EVENT_KEYWORD_MAP, detectEventKeyword } from "./schedule-data";

describe("event-icons", () => {
  describe("icon field existence", () => {
    it("should have icon field for all event keywords", () => {
      EVENT_KEYWORD_MAP.forEach((keyword) => {
        expect(keyword.icon).toBeDefined();
        expect(typeof keyword.icon).toBe("string");
        expect(keyword.icon.length).toBeGreaterThan(0);
      });
    });

    it("should have emoji field for backward compatibility", () => {
      EVENT_KEYWORD_MAP.forEach((keyword) => {
        expect(keyword.emoji).toBeDefined();
        expect(typeof keyword.emoji).toBe("string");
      });
    });
  });

  describe("icon mapping for common events", () => {
    it("should map BBQ to outdoor-grill icon", () => {
      const keyword = detectEventKeyword("Family BBQ");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("outdoor-grill");
    });

    it("should map Meal to restaurant icon", () => {
      const keyword = detectEventKeyword("Lunch with friends");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("restaurant");
    });

    it("should map Doctor to local-hospital icon", () => {
      const keyword = detectEventKeyword("Doctor appointment");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("local-hospital");
    });

    it("should map Church to church icon", () => {
      const keyword = detectEventKeyword("Sunday Church Service");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("church");
    });

    it("should map Meeting to people icon", () => {
      const keyword = detectEventKeyword("Team meeting");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("people");
    });

    it("should map Workout to fitness-center icon", () => {
      const keyword = detectEventKeyword("Gym workout");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("fitness-center");
    });

    it("should map Study to school icon", () => {
      const keyword = detectEventKeyword("Bible Study");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("book");
    });

    it("should map Travel to flight icon", () => {
      const keyword = detectEventKeyword("Flight to Hawaii");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("flight");
    });

    it("should map Concert to music-note icon", () => {
      const keyword = detectEventKeyword("Concert tonight");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("music-note");
    });

    it("should map Birthday to cake icon", () => {
      const keyword = detectEventKeyword("Birthday party");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("cake");
    });
  });

  describe("icon consistency", () => {
    it("should have unique labels for each keyword entry", () => {
      const labels = EVENT_KEYWORD_MAP.map((k) => k.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it("should have valid Material Design icon names", () => {
      const validIcons = [
        "outdoor-grill",
        "church",
        "music-note",
        "book",
        "local-hospital",
        "child-care",
        "cake",
        "card-giftcard",
        "restaurant",
        "favorite",
        "sentiment-very-satisfied",
        "people",
        "fitness-center",
        "pan-tool",
        "public",
        "flight",
        "school",
        "home",
      ];

      EVENT_KEYWORD_MAP.forEach((keyword) => {
        expect(validIcons).toContain(keyword.icon);
      });
    });
  });

  describe("keyword detection with icons", () => {
    it("should detect dinner and return restaurant icon", () => {
      const keyword = detectEventKeyword("Dinner at 6pm");
      expect(keyword).not.toBeNull();
      expect(keyword!.label).toBe("Meal");
      expect(keyword!.icon).toBe("restaurant");
    });

    it("should detect breakfast and return restaurant icon", () => {
      const keyword = detectEventKeyword("Breakfast meeting");
      expect(keyword).not.toBeNull();
      expect(keyword!.label).toBe("Meal");
      expect(keyword!.icon).toBe("restaurant");
    });

    it("should detect prayer and return pan-tool icon", () => {
      const keyword = detectEventKeyword("Prayer time");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("pan-tool");
    });

    it("should detect visit and return home icon", () => {
      const keyword = detectEventKeyword("Visiting family");
      expect(keyword).not.toBeNull();
      expect(keyword!.icon).toBe("home");
    });
  });
});
