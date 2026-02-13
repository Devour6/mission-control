"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TeamData, StandupEntry } from "@/lib/types";

// --- Types ---
interface Vec { x: number; y: number }
interface AgentState {
  name: string;
  emoji: string;
  bodyColor: string;
  eyeColor: string;
  status: "active" | "coming_soon";
  task: string;
  pos: Vec;
  target: Vec;
  path: Vec[];
  location: "desk" | "water" | "coffee" | "break" | "meeting" | "walking";
  walkFrame: number;
  direction: "left" | "right" | "up" | "down";
  idleTimer: number;
  deskPos: Vec;
}

interface LiveAction {
  id: string;
  agent: string;
  agentEmoji: string;
  action: string;
  time: string;
  color: string;
}

// --- Office layout constants (grid units, 1 unit = 8px) ---
const CELL = 12;
const OFFICE_W = 95; // grid cells wide
const OFFICE_H = 65;  // grid cells tall

// Key positions in grid coords
const DESKS: Record<string, Vec> = {
  George:  { x: 12, y: 12 },
  Dwight:  { x: 38, y: 12 },
  Kelly:   { x: 58, y: 12 },
  Rachel:  { x: 78, y: 12 },
  John:    { x: 38, y: 32 },
  Ross:    { x: 58, y: 32 },
  Pam:     { x: 78, y: 32 },
};

const WATER:  Vec = { x: 8,   y: 65 };
const COFFEE: Vec = { x: 55,  y: 65 };
const BREAK_ROOM: Vec = { x: 105, y: 65 };
const MEETING: Vec = { x: 60, y: 50 };

const DESTINATIONS = [WATER, COFFEE, BREAK_ROOM];

// --- Pathfinding (simple waypoint-based) ---
function buildPath(from: Vec, to: Vec): Vec[] {
  const path: Vec[] = [];
  // Walk horizontally first, then vertically (simple L-path)
  const midX = to.x;
  const midY = from.y;

  // Horizontal segment
  const dx = midX > from.x ? 1 : -1;
  let cx = from.x;
  while (cx !== midX) {
    cx += dx;
    path.push({ x: cx, y: from.y });
  }

  // Vertical segment
  const dy = to.y > midY ? 1 : -1;
  let cy = midY;
  while (cy !== to.y) {
    cy += dy;
    path.push({ x: to.x, y: cy });
  }

  return path;
}

function getDirection(from: Vec, to: Vec): "left" | "right" | "up" | "down" {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

// --- Pixel Character with walk animation ---
function PixelSprite({ agent, scale = 1.6 }: { agent: AgentState; scale?: number }) {
  const { bodyColor, eyeColor, walkFrame, direction, status } = agent;
  if (status === "coming_soon") return null;

  const isWalking = agent.path.length > 0;
  // Leg offsets for walk animation
  const legOffset = isWalking ? (walkFrame % 2 === 0 ? 1 : -1) : 0;
  const flip = direction === "left" ? -1 : 1;

  const s = 24 * scale;

  return (
    <div style={{
      position: "absolute",
      left: agent.pos.x * CELL - s / 2,
      top: agent.pos.y * CELL - s,
      transition: "left 150ms linear, top 150ms linear",
      zIndex: Math.floor(agent.pos.y),
    }}>
      <svg width={s} height={s} viewBox="0 0 16 18" style={{ imageRendering: "pixelated", transform: `scaleX(${flip})` }}>
        {/* Head */}
        <rect x="4" y="0" width="8" height="6" rx="1" fill={bodyColor} />
        {/* Eyes */}
        <rect x="5" y="2" width="2" height="2" fill={eyeColor} />
        <rect x="9" y="2" width="2" height="2" fill={eyeColor} />
        <rect x="6" y="3" width="1" height="1" fill="#111" />
        <rect x="10" y="3" width="1" height="1" fill="#111" />
        {/* Body */}
        <rect x="3" y="6" width="10" height="5" fill={bodyColor} />
        {/* Arms */}
        <rect x="1" y="6" width="2" height="4" fill={bodyColor} opacity={isWalking ? (walkFrame % 2 === 0 ? 0.8 : 1) : 1} />
        <rect x="13" y="6" width="2" height="4" fill={bodyColor} opacity={isWalking ? (walkFrame % 2 === 0 ? 1 : 0.8) : 1} />
        {/* Left leg */}
        <rect x="4" y="11" width="3" height={isWalking ? "5" : "4"} fill={bodyColor}
          transform={isWalking ? `translate(${legOffset}, 0)` : ""} />
        {/* Right leg */}
        <rect x="9" y="11" width="3" height={isWalking ? "5" : "4"} fill={bodyColor}
          transform={isWalking ? `translate(${-legOffset}, 0)` : ""} />
        {/* Feet */}
        <rect x={3 + (isWalking ? legOffset : 0)} y="15" width="4" height="2" fill="#444" />
        <rect x={9 + (isWalking ? -legOffset : 0)} y="15" width="4" height="2" fill="#444" />
      </svg>
      {/* Name label — outside the flip so it never reverses */}
      <div style={{
        textAlign: "center",
        fontSize: 9 * scale,
        fontWeight: 700,
        color: bodyColor,
        marginTop: -2,
        whiteSpace: "nowrap",
      }}>
        {agent.name}
      </div>
    </div>
  );
}

// --- Static office furniture ---
function OfficeFurniture() {
  return (
    <>
      {/* Desks with monitors */}
      {Object.entries(DESKS).map(([name, pos]) => (
        <div key={name} style={{ position: "absolute", left: pos.x * CELL - 36, top: pos.y * CELL - 10 }}>
          {/* Monitor */}
          <div className="w-[72px] h-12 rounded-sm border-2 border-blue-500/40 bg-blue-500/10 mx-auto relative">
            <div className="absolute top-1.5 left-2 right-2 space-y-1">
              <div className="h-[2px] bg-blue-400/30 w-3/4" />
              <div className="h-[2px] bg-blue-400/20 w-1/2" />
              <div className="h-[2px] bg-blue-400/20 w-2/3" />
            </div>
          </div>
          <div className="w-4 h-2 bg-[#3a3d4a] mx-auto" />
          <div className="w-9 h-1.5 bg-[#3a3d4a] mx-auto" />
          {/* Desk surface */}
          <div className="w-20 h-2.5 bg-[#3a3d4a] rounded mx-auto mt-0.5" />
        </div>
      ))}

      {/* George's office border */}
      <div style={{ position: "absolute", left: (DESKS.George.x - 5) * CELL, top: (DESKS.George.y - 7) * CELL, width: 160, height: 180 }} className="border border-indigo-500/15 rounded-lg">
        <div className="text-[9px] text-indigo-400/40 uppercase tracking-widest px-3 pt-2">Chief of Staff</div>
      </div>

      {/* Water station */}
      <div style={{ position: "absolute", left: WATER.x * CELL - 16, top: WATER.y * CELL - 28 }}>
        <div className="w-8 h-16 bg-gradient-to-b from-cyan-400/30 to-cyan-400/5 border border-cyan-400/20 rounded-t-md flex items-end justify-center pb-1">
          <div className="w-4 h-2 bg-cyan-400/30 rounded-sm" />
        </div>
        <div className="w-10 h-1.5 bg-[#2e3345] rounded-b mx-auto" />
        <div className="text-[10px] text-cyan-400/40 text-center mt-1">💧 Water</div>
      </div>

      {/* Coffee station */}
      <div style={{ position: "absolute", left: COFFEE.x * CELL - 16, top: COFFEE.y * CELL - 20 }}>
        <div className="w-11 h-10 bg-[#3a2a1a] border border-[#5a4a3a] rounded flex items-center justify-center">
          <span className="text-base">☕</span>
        </div>
        <div className="w-14 h-1.5 bg-[#2e3345] rounded-b mx-auto" />
        <div className="text-[10px] text-amber-400/40 text-center mt-1">☕ Coffee</div>
      </div>

      {/* Break room */}
      <div style={{ position: "absolute", left: BREAK_ROOM.x * CELL - 28, top: BREAK_ROOM.y * CELL - 28 }} className="bg-[#141620]/60 border border-[#2e3345] rounded-lg px-4 py-3">
        <span className="text-lg">🍿</span>
        <div className="text-[10px] text-[#8b8fa3] mt-1">Break Room</div>
        <div className="flex gap-1 mt-1">
          <span className="text-[9px]">🍕</span>
          <span className="text-[9px]">🍪</span>
          <span className="text-[9px]">🍎</span>
        </div>
      </div>

      {/* Meeting table */}
      <div style={{ position: "absolute", left: MEETING.x * CELL - 50, top: MEETING.y * CELL - 16 }}>
        <div className="bg-[#2a2d3a] rounded-[50%] border-2 border-[#3a3d4a] w-24 h-12 flex items-center justify-center">
          <span className="text-[8px] text-[#555] uppercase tracking-wider">Meeting Table</span>
        </div>
      </div>

      {/* Windows (top wall) */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} className="bg-[#1a1d27] border-b border-[#2e3345] flex">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 border-r border-[#2e3345] flex items-center justify-center">
            <div className="w-3/4 h-4 rounded-sm bg-[#242836] border border-[#2e3345]" />
          </div>
        ))}
      </div>
    </>
  );
}

// --- Main component ---
export default function OfficeTab() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [, setStandups] = useState<StandupEntry[]>([]);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [liveActions, setLiveActions] = useState<LiveAction[]>([]);
  const [mounted, setMounted] = useState(false);
  const [standupActive, setStandupActive] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initAgents = useCallback((teamData: TeamData) => {
    const list: AgentState[] = [];

    // George
    const gDesk = DESKS.George;
    list.push({
      name: "George", emoji: "🦾", bodyColor: "#6366f1", eyeColor: "#a5b4fc",
      status: "active", task: "Managing the team",
      pos: { ...gDesk }, target: { ...gDesk }, path: [], location: "desk",
      walkFrame: 0, direction: "down", idleTimer: 60 + Math.floor(Math.random() * 200), deskPos: { ...gDesk },
    });

    // Division members
    Object.values(teamData.org.divisions).forEach((div) => {
      div.members.forEach((m) => {
        const desk = DESKS[m.name] || { x: 60, y: 30 };
        const colors = getColors(m.name);
        list.push({
          name: m.name, emoji: m.emoji,
          bodyColor: colors.body, eyeColor: colors.eye,
          status: m.status as "active" | "coming_soon",
          task: m.currentTask || getDefaultTask(m.name),
          pos: { ...desk }, target: { ...desk }, path: [],
          location: "desk", walkFrame: 0, direction: "down",
          idleTimer: 40 + Math.floor(Math.random() * 250), deskPos: { ...desk },
        });
      });
    });

    return list;
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/data/team.json").then((r) => r.json()),
      fetch("/data/standups.json").then((r) => r.json()),
    ]).then(([t, s]) => {
      setTeam(t);
      setStandups(s);
      setAgents(initAgents(t));
    }).catch(() => {});

    setStandupActive(isStandupActive());
    setLiveActions(getDefaultActions());
    setMounted(true);
  }, [initAgents]);

  // Movement tick
  useEffect(() => {
    if (!mounted || agents.length === 0) return;

    tickRef.current = setInterval(() => {
      const inStandup = isStandupActive();
      setStandupActive(inStandup);

      setAgents((prev) => prev.map((agent, idx) => {
        if (agent.status !== "active") return agent;

        const a = { ...agent };

        // --- Standup logic: everyone goes to meeting table ---
        if (inStandup && a.location !== "meeting") {
          // Calculate a seat around the table with offset per agent
          const angle = (idx / prev.filter(x => x.status === "active").length) * Math.PI * 2;
          const meetingSpot = {
            x: Math.round(MEETING.x + Math.cos(angle) * 6),
            y: Math.round(MEETING.y + Math.sin(angle) * 4),
          };
          if (a.path.length === 0 || a.target.x !== meetingSpot.x || a.target.y !== meetingSpot.y) {
            a.path = buildPath(a.pos, meetingSpot);
            a.target = { ...meetingSpot };
            a.location = "walking";
          }
        }

        // --- Standup ended: go back to desk ---
        if (!inStandup && a.location === "meeting") {
          a.path = buildPath(a.pos, a.deskPos);
          a.target = { ...a.deskPos };
          a.location = "walking";
        }

        // If we have a path, walk along it
        if (a.path.length > 0) {
          const next = a.path[0];
          a.direction = getDirection(a.pos, next);
          a.pos = { ...next };
          a.path = a.path.slice(1);
          a.walkFrame = a.walkFrame + 1;

          // Reached destination?
          if (a.path.length === 0) {
            if (inStandup && Math.abs(a.pos.x - MEETING.x) < 10 && Math.abs(a.pos.y - MEETING.y) < 8) {
              a.location = "meeting";
              a.idleTimer = 999; // stay until standup ends
            } else if (a.pos.x === a.deskPos.x && a.pos.y === a.deskPos.y) {
              a.location = "desk";
              a.idleTimer = randomIdle();
            } else {
              // At water/coffee/break
              a.location = a.pos.x < 20 ? "water" : a.pos.x > 90 ? "break" : "coffee";
              a.idleTimer = randomShort();
            }
          }
        } else {
          // No path — idle countdown
          a.idleTimer--;
          a.walkFrame = 0;

          if (a.idleTimer <= 0 && !inStandup) {
            if (a.location === "desk") {
              // 70% chance to just keep working, 30% chance to get up
              if (Math.random() < 0.7) {
                a.idleTimer = randomIdle();
              } else {
                const dest = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
                const jitter = { x: dest.x + Math.floor(Math.random() * 6) - 3, y: dest.y + Math.floor(Math.random() * 4) - 2 };
                a.path = buildPath(a.pos, jitter);
                a.target = { ...jitter };
                a.location = "walking";
              }
            } else if (a.location !== "meeting") {
              // At a destination — head back to desk
              a.path = buildPath(a.pos, a.deskPos);
              a.target = { ...a.deskPos };
              a.location = "walking";
            }
          }
        }

        return a;
      }));
    }, 150);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [mounted, agents.length]);

  // Standup state is now updated inside the movement tick

  if (!mounted || !team) return null;

  const activeCount = agents.filter((a) => a.status === "active").length;

  return (
    <div className="flex gap-4 max-w-7xl mx-auto">
      {/* Office */}
      <div className="flex-1">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">🏢 The Office</h2>
          <p className="text-sm text-[#8b8fa3] mt-1">{activeCount} agents online{standupActive ? " · 🟢 Standup in progress" : ""}</p>
        </div>

        <div className="bg-[#0a0c10] border border-[#2e3345] rounded-2xl overflow-hidden relative"
          style={{
            width: OFFICE_W * CELL,
            height: OFFICE_H * CELL,
            backgroundImage: "repeating-conic-gradient(#111318 0% 25%, #0d0f14 0% 50%)",
            backgroundSize: "32px 32px",
          }}>
          <OfficeFurniture />
          {agents.map((a) => (
            <PixelSprite key={a.name} agent={a} />
          ))}
        </div>

        <div className="flex items-center gap-6 mt-3 text-xs text-[#8b8fa3] justify-center">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Online</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2e3345]" /> Coming Soon</span>
          <span>Standups: 7:45a · 12p · 5:30p</span>
        </div>
      </div>

      {/* Live Actions Sidebar */}
      <div className="w-72 shrink-0">
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden sticky top-8">
          <div className="px-4 py-3 border-b border-[#2e3345] flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <h3 className="text-sm font-semibold text-[#e4e6ed]">Live Actions</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {liveActions.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#8b8fa3]">No recent activity</div>
            ) : (
              <div className="divide-y divide-[#2e3345]">
                {liveActions.map((a) => (
                  <div key={a.id} className="px-4 py-3 hover:bg-[#242836] transition-colors">
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{a.agentEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#e4e6ed]">
                          <span className="font-semibold" style={{ color: a.color }}>{a.agent}</span>
                          {" — "}{a.action}
                        </p>
                        <p className="text-[10px] text-[#8b8fa3] mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---
// Realistic timing: agents mostly work, rarely get up
function randomIdle() { return 120 + Math.floor(Math.random() * 300); } // 18-63 seconds at desk (they're working!)
function randomShort() { return 15 + Math.floor(Math.random() * 25); } // 2-6 seconds at destination (quick break)

function isStandupActive(): boolean {
  const now = new Date();
  const t = now.getHours() * 60 + now.getMinutes();
  return (t >= 465 && t < 480) || (t >= 720 && t < 735) || (t >= 1050 && t < 1065);
}

function getColors(name: string): { body: string; eye: string } {
  const map: Record<string, { body: string; eye: string }> = {
    Dwight: { body: "#a855f7", eye: "#e9d5ff" },
    Kelly: { body: "#ec4899", eye: "#fce7f3" },
    Rachel: { body: "#3b82f6", eye: "#bfdbfe" },
    John: { body: "#10b981", eye: "#a7f3d0" },
    Ross: { body: "#f97316", eye: "#fed7aa" },
    Pam: { body: "#f43f5e", eye: "#fecdd3" },
  };
  return map[name] || { body: "#6b7280", eye: "#d1d5db" };
}

function getDefaultTask(name: string): string {
  const tasks: Record<string, string> = {
    Dwight: "Research sweep", Kelly: "Drafting tweets", Rachel: "LinkedIn drafts",
    John: "Market analysis", Ross: "Code review", Pam: "Calendar mgmt",
  };
  return tasks[name] || "";
}

function getDefaultActions(): LiveAction[] {
  const now = new Date();
  const fmt = (min: number) => {
    const d = new Date(now.getTime() - min * 60000);
    return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;
  };
  return [
    { id: "1", agent: "Dwight", agentEmoji: "🔍", action: "Running morning research sweep", time: fmt(5), color: "#a855f7" },
    { id: "2", agent: "George", agentEmoji: "🦾", action: "Morning standup completed", time: fmt(15), color: "#6366f1" },
    { id: "3", agent: "Kelly", agentEmoji: "🐦", action: "Drafting tweet batch #1", time: fmt(30), color: "#ec4899" },
    { id: "4", agent: "Rachel", agentEmoji: "💼", action: "Drafting LinkedIn posts", time: fmt(35), color: "#3b82f6" },
    { id: "5", agent: "John", agentEmoji: "📈", action: "Reviewing market conditions", time: fmt(45), color: "#10b981" },
    { id: "6", agent: "George", agentEmoji: "🦾", action: "Deployed Mission Control V2", time: fmt(60), color: "#6366f1" },
  ];
}
