import { describe, it, expect } from "vitest";
import { createScheduleTodo } from "./schedule-data";

describe("todo-notes", () => {
  describe("notes field in ScheduleTodo", () => {
    it("should create a todo without notes", () => {
    const todo = createScheduleTodo(
      { title: "Buy groceries", date: "2024-01-15" },
      0
    );
    expect(todo.notes).toBeUndefined();
    });

    it("should create a todo with notes", () => {
    const todo = createScheduleTodo(
      {
        title: "Buy groceries",
        date: "2024-01-15",
        notes: "Get milk, eggs, and bread",
      },
      0
    );
    expect(todo.notes).toBe("Get milk, eggs, and bread");
    });

    it("should preserve notes when todo is completed", () => {
      const todo = createScheduleTodo(
        {
          title: "Call pastor",
          date: "2024-01-15",
          notes: "Discuss Sunday service",
        },
        0
      );
      todo.isCompleted = true;
      todo.completedAt = new Date().toISOString();

      expect(todo.notes).toBe("Discuss Sunday service");
      expect(todo.isCompleted).toBe(true);
    });

    it("should allow empty string notes", () => {
      const todo = createScheduleTodo(
        {
          title: "Task",
          date: "2024-01-15",
          notes: "",
        },
        0
      );
      expect(todo.notes).toBe("");
    });

    it("should support multiline notes", () => {
      const multilineNotes = "Line 1\nLine 2\nLine 3";
      const todo = createScheduleTodo(
        {
          title: "Project planning",
          date: "2024-01-15",
          notes: multilineNotes,
        },
        0
      );
      expect(todo.notes).toBe(multilineNotes);
      expect(todo.notes?.split("\n").length).toBe(3);
    });

    it("should support long notes", () => {
      const longNotes =
        "This is a very long note that contains detailed information about the todo item. It can span multiple lines and contain important details that the user wants to remember.";
      const todo = createScheduleTodo(
        {
          title: "Documentation",
          date: "2024-01-15",
          notes: longNotes,
        },
        0
      );
      expect(todo.notes).toBe(longNotes);
      expect(todo.notes?.length).toBeGreaterThan(100);
    });

    it("should handle special characters in notes", () => {
      const specialNotes = "Note with @#$%^&*() special chars & symbols!";
      const todo = createScheduleTodo(
        {
          title: "Task",
          date: "2024-01-15",
          notes: specialNotes,
        },
        0
      );
      expect(todo.notes).toBe(specialNotes);
    });

    it("should handle unicode characters in notes", () => {
      const unicodeNotes = "Note with emoji 🎉 and unicode chars: 你好 مرحبا";
      const todo = createScheduleTodo(
        {
          title: "Task",
          date: "2024-01-15",
          notes: unicodeNotes,
        },
        0
      );
      expect(todo.notes).toBe(unicodeNotes);
    });

    it("should preserve notes when linked to people", () => {
      const todo = createScheduleTodo(
        {
          title: "Meeting",
          date: "2024-01-15",
          notes: "Discuss Q1 goals",
        },
        0
      );
      todo.linkedPeopleIds = ["person-1", "person-2"];

      expect(todo.notes).toBe("Discuss Q1 goals");
      expect(todo.linkedPeopleIds?.length).toBe(2);
    });

    it("should preserve notes when linked to event", () => {
      const todo = createScheduleTodo(
        {
          title: "Prepare",
          date: "2024-01-15",
          notes: "Get materials ready",
        },
        0
      );
      todo.linkedEventId = "event-123";
      todo.linkedEventTitle = "Conference";

      expect(todo.notes).toBe("Get materials ready");
      expect(todo.linkedEventId).toBe("event-123");
    });

    it("should preserve notes when linked to ministry", () => {
      const todo = createScheduleTodo(
        {
          title: "Volunteer",
          date: "2024-01-15",
          notes: "Help at food bank",
        },
        0
      );
      todo.linkedMinistryId = "ministry-456";
      todo.linkedMinistryTitle = "Community Service";

      expect(todo.notes).toBe("Help at food bank");
      expect(todo.linkedMinistryId).toBe("ministry-456");
    });

    it("should preserve notes with color and tag", () => {
      const todo = createScheduleTodo(
        {
          title: "Task",
          date: "2024-01-15",
          color: "#FF5733",
          notes: "Important task with notes",
        },
        0
      );
      todo.tag = "Personal";

      expect(todo.notes).toBe("Important task with notes");
      expect(todo.color).toBe("#FF5733");
      expect(todo.tag).toBe("Personal");
    });

    it("should handle notes with start time", () => {
      const todo = createScheduleTodo(
        {
          title: "Meeting",
          date: "2024-01-15",
          startTime: "14:30",
          notes: "Team sync meeting",
        },
        0
      );
      expect(todo.notes).toBe("Team sync meeting");
      expect(todo.startTime).toBe("14:30");
    });
  });

  describe("notes field persistence", () => {
    it("should maintain notes across todo operations", () => {
      const originalNotes = "Important notes for this task";
      const todo = createScheduleTodo(
        {
          title: "Task",
          date: "2024-01-15",
          notes: originalNotes,
        },
        0
      );

      // Simulate various operations
      todo.isCompleted = true;
      todo.completedAt = new Date().toISOString();
      todo.linkedPeopleIds = ["person-1"];
      todo.color = "#3B82F6";

      // Notes should remain unchanged
      expect(todo.notes).toBe(originalNotes);
    });

    it("should allow updating notes", () => {
      const todo = createScheduleTodo(
        {
          title: "Task",
          date: "2024-01-15",
          notes: "Original notes",
        },
        0
      );

      // Update notes
      todo.notes = "Updated notes";

      expect(todo.notes).toBe("Updated notes");
    });

    it("should allow clearing notes", () => {
      const todo = createScheduleTodo(
        {
          title: "Task",
          date: "2024-01-15",
          notes: "Some notes",
        },
        0
      );

      // Clear notes
      todo.notes = undefined;

      expect(todo.notes).toBeUndefined();
    });
  });
});
