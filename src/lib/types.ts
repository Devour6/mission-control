export type Assignee = "Brandon" | "George";
export type TaskStatus = "todo" | "inProgress" | "completed";
export type EventType = "brandon" | "george" | "shared";

export interface MemoryEntry {
  id: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: Assignee;
  dueDate: string;
  status: TaskStatus;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: EventType;
  description: string;
}
