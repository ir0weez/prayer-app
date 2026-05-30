import { describe, it, expect } from "vitest";
import {
  addDays,
  createScheduleEvent,
  createScheduleMinistry,
  createScheduleTodo,
  detectEventKeyword,
  formatDateHeader,
  getBirthdaysForDate,
  getDayNumber,
  getEventsForDate,
  getMinistriesForDate,
  getShortDayName,
  getTodosForDate,
  getWeekDates,
  toggleEventCompleted,
  toggleMinistryCompleted,
  toggleTodoCompleted,
} from "./schedule-data";

describe("schedule-data", () => {
  describe("detectEventKeyword", () => {
    it("detects BBQ keyword", () => {
      const result = detectEventKeyword("Family BBQ");
      expect(result).not.toBeNull();
      expect(result!.label).toBe("BBQ");
    });

    it("detects church keyword", () => {
      const result = detectEventKeyword("Sunday Church Service");
      expect(result).not.toBeNull();
      expect(result!.label).toBe("Church");
    });

    it("detects worship keyword", () => {
      const result = detectEventKeyword("Worship Night");
      expect(result).not.toBeNull();
      expect(result!.label).toBe("Worship");
    });

    it("detects bible study keyword", () => {
      const result = detectEventKeyword("Bible Study Group");
      expect(result).not.toBeNull();
      expect(result!.label).toBe("Bible Study");
    });

    it("detects doctor keyword", () => {
      const result = detectEventKeyword("Doctor Appointment");
      expect(result).not.toBeNull();
      expect(result!.label).toBe("Doctor");
    });

    it("detects baby shower keyword", () => {
      const result = detectEventKeyword("Sarah's Baby Shower");
      expect(result).not.toBeNull();
      expect(result!.label).toBe("Baby Shower");
    });

    it("detects christmas keyword", () => {
      const result = detectEventKeyword("Christmas Dinner");
      expect(result).not.toBeNull();
      expect(result!.label).toBe("Christmas");
    });

    it("returns null for unknown keyword", () => {
      const result = detectEventKeyword("Random Meeting XYZ");
      // "meeting" is actually in the keyword map
      expect(result).not.toBeNull();
      expect(result!.label).toBe("Meeting");
    });

    it("returns null for truly unknown keyword", () => {
      const result = detectEventKeyword("Something Unique 12345");
      expect(result).toBeNull();
    });
  });

  describe("createScheduleEvent", () => {
    it("creates an event with auto-detected keyword", () => {
      const event = createScheduleEvent({
        title: "Church Service",
        date: "2026-05-30",
        startTime: "9:00 AM",
      });
      expect(event.id).toMatch(/^sch-/);
      expect(event.title).toBe("Church Service");
      expect(event.date).toBe("2026-05-30");
      expect(event.isCompleted).toBe(false);
      expect(event.keyword).toBe("Church");
    });

    it("creates an event without keyword for unknown title", () => {
      const event = createScheduleEvent({
        title: "Random Thing",
        date: "2026-05-30",
      });
      expect(event.keyword).toBeUndefined();
    });
  });

  describe("createScheduleTodo", () => {
    it("creates a todo with correct order", () => {
      const todo = createScheduleTodo({ title: "Buy milk", date: "2026-05-30" }, 3);
      expect(todo.title).toBe("Buy milk");
      expect(todo.order).toBe(3);
      expect(todo.isCompleted).toBe(false);
    });
  });

  describe("createScheduleMinistry", () => {
    it("creates a ministry item", () => {
      const ministry = createScheduleMinistry({
        title: "Youth Group",
        type: "Youth",
        date: "2026-05-30",
        location: "Room 201",
      });
      expect(ministry.title).toBe("Youth Group");
      expect(ministry.type).toBe("Youth");
      expect(ministry.location).toBe("Room 201");
      expect(ministry.isCompleted).toBe(false);
    });
  });

  describe("toggleEventCompleted", () => {
    it("toggles event completion", () => {
      const events = [
        createScheduleEvent({ title: "Test", date: "2026-05-30" }),
      ];
      const toggled = toggleEventCompleted(events, events[0].id);
      expect(toggled[0].isCompleted).toBe(true);
      expect(toggled[0].completedAt).toBeDefined();

      const unToggled = toggleEventCompleted(toggled, events[0].id);
      expect(unToggled[0].isCompleted).toBe(false);
      expect(unToggled[0].completedAt).toBeUndefined();
    });
  });

  describe("toggleTodoCompleted", () => {
    it("toggles todo completion", () => {
      const todos = [createScheduleTodo({ title: "Test", date: "2026-05-30" }, 0)];
      const toggled = toggleTodoCompleted(todos, todos[0].id);
      expect(toggled[0].isCompleted).toBe(true);
    });
  });

  describe("toggleMinistryCompleted", () => {
    it("toggles ministry completion", () => {
      const ministries = [createScheduleMinistry({ title: "Test", type: "Outreach", date: "2026-05-30" })];
      const toggled = toggleMinistryCompleted(ministries, ministries[0].id);
      expect(toggled[0].isCompleted).toBe(true);
    });
  });

  describe("getEventsForDate", () => {
    it("filters events by date and sorts by time", () => {
      const events = [
        { ...createScheduleEvent({ title: "A", date: "2026-05-30", startTime: "10:00" }) },
        { ...createScheduleEvent({ title: "B", date: "2026-05-30", startTime: "08:00" }) },
        { ...createScheduleEvent({ title: "C", date: "2026-05-31" }) },
      ];
      const result = getEventsForDate(events, "2026-05-30");
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("B");
      expect(result[1].title).toBe("A");
    });
  });

  describe("getTodosForDate", () => {
    it("filters todos by date and sorts by order", () => {
      const todos = [
        { ...createScheduleTodo({ title: "Second", date: "2026-05-30" }, 1) },
        { ...createScheduleTodo({ title: "First", date: "2026-05-30" }, 0) },
        { ...createScheduleTodo({ title: "Other", date: "2026-05-31" }, 0) },
      ];
      const result = getTodosForDate(todos, "2026-05-30");
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("First");
      expect(result[1].title).toBe("Second");
    });
  });

  describe("getBirthdaysForDate", () => {
    it("finds birthdays matching the date", () => {
      const people = [
        { name: "John", birthday: "05/30/1990" },
        { name: "Jane", birthday: "06/15/1985" },
        { name: "Me", birthday: "05/30/2000", isPersonal: true },
      ];
      const result = getBirthdaysForDate(people, "2026-05-30");
      expect(result).toHaveLength(1);
      expect(result[0].personName).toBe("John");
    });

    it("returns empty for no matches", () => {
      const people = [{ name: "John", birthday: "12/25/1990" }];
      const result = getBirthdaysForDate(people, "2026-05-30");
      expect(result).toHaveLength(0);
    });
  });

  describe("getWeekDates", () => {
    it("returns 7 dates centered on given date", () => {
      const dates = getWeekDates("2026-05-30");
      expect(dates).toHaveLength(7);
      expect(dates[3]).toBe("2026-05-30");
      expect(dates[0]).toBe("2026-05-27");
      expect(dates[6]).toBe("2026-06-02");
    });
  });

  describe("formatDateHeader", () => {
    it("formats date correctly", () => {
      const result = formatDateHeader("2026-05-30");
      expect(result.dayName).toBe("Sat");
      expect(result.dayNum).toBe("30");
      expect(result.monthName).toBe("May");
      expect(result.year).toBe("2026");
    });
  });

  describe("getShortDayName", () => {
    it("returns short day name", () => {
      expect(getShortDayName("2026-05-30")).toBe("SAT");
    });
  });

  describe("getDayNumber", () => {
    it("returns day number", () => {
      expect(getDayNumber("2026-05-30")).toBe("30");
    });
  });

  describe("addDays", () => {
    it("adds days correctly", () => {
      expect(addDays("2026-05-30", 1)).toBe("2026-05-31");
      expect(addDays("2026-05-30", -1)).toBe("2026-05-29");
      expect(addDays("2026-05-31", 1)).toBe("2026-06-01");
    });
  });
});
