export type Assignee = "Brandon" | "George";
export type TaskStatus = "todo" | "inProgress" | "completed";
export type EventType = "brandon" | "george" | "shared" | "phase" | "radiants" | "personal" | "work" | "meeting";

export interface MemoryEntry {
  id: string;
  content: string;
  createdAt: string;
  tags?: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: Assignee;
  dueDate: string;
  status: TaskStatus;
  createdAt: string;
  _source?: "seed" | "local";
}

// Wallet types
export interface Trade {
  id: string;
  date: string;
  action: "buy" | "sell" | "stake" | "swap";
  tokens: string[];
  amount: number;
  usdValue: number;
  notes?: string;
}

export interface WalletData {
  address: string;
  startDate: string;
  startingBalance: { sol: number; usd: number };
  monthlyTarget: number;
  currentBalance: { sol: number; usd: number };
  trades: Trade[];
}

export interface WeekSummary {
  startDate: string;
  endDate: string;
  startValue: number;
  endValue: number;
  pctChange: number;
  cumulativeReturn?: number;
}

export interface WalletWeeklyData {
  weeks: WeekSummary[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: EventType;
  description: string;
  startTime?: string;
  endTime?: string;
  assignee?: string;
  _source?: "seed" | "local";
}
