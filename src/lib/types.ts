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

// Approvals
export interface Approval {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedByEmoji: string;
  date: string;
  status: "pending" | "approved" | "denied";
  category?: string;
  resolvedAt?: string;
}

// Content
export interface ContentDraft {
  id: string;
  platform: "x" | "linkedin";
  text: string;
  author: string;
  authorEmoji: string;
  date: string;
  status: "pending" | "approved" | "denied";
  rationale?: string;
  angle?: string;
  source?: string;
  batch?: string;
  resolvedAt?: string;
}

export interface PostedContent {
  id: string;
  platform: "x" | "linkedin";
  text: string;
  author: string;
  authorEmoji: string;
  postedAt: string;
  impressions?: number;
  likes?: number;
  comments?: number;
  url?: string;
}

export interface ContentData {
  drafts: ContentDraft[];
  posted: PostedContent[];
}

// Council
export interface CouncilVote {
  member: string;
  emoji: string;
  vote: "for" | "against" | "abstain";
}

export interface CouncilDecision {
  id: string;
  title: string;
  description: string;
  context: string;
  date: string;
  votes: CouncilVote[];
  outcome: "approved" | "rejected" | "pending";
  georgeOverride?: boolean;
  resolvedAt?: string;
}

export interface CouncilData {
  decisions: CouncilDecision[];
}

// Projects
export interface Project {
  id: string;
  name: string;
  status: "active" | "completed" | "blocked";
  description: string;
  members?: string[];
}

export interface Division {
  name: string;
  lead?: string;
  members?: string[];
  status?: string;
  projects: Project[];
}

export interface ProjectsData {
  divisions: Record<string, Division>;
}

// Docs
export interface DocEntry {
  id: string;
  title: string;
  author: string;
  authorEmoji: string;
  type: "intel" | "draft" | "analysis" | "report" | "memo" | "other";
  description: string;
}

export interface DocsDay {
  date: string;
  docs: DocEntry[];
}

export interface DocsData {
  days: DocsDay[];
}

// Team
export interface TeamMember {
  name: string;
  title: string;
  emoji: string;
  model?: string;
  status: "active" | "coming_soon";
  currentTask?: string;
}

export interface TeamDivision {
  name: string;
  members: TeamMember[];
}

export interface TeamData {
  org: {
    director: TeamMember;
    chiefOfStaff: TeamMember & { reportsTo: string };
    divisions: Record<string, TeamDivision>;
  };
}

// Standups
export interface StandupEntry {
  id: string;
  date: string;
  type: "morning" | "midday" | "evening";
  summary: string;
  highlights?: string[];
  issues?: string[];
}
