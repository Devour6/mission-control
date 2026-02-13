"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TeamData } from "@/lib/types";

// --- Types ---
interface Vec { x: number; y: number }

// Activity-driven state from office-state.json
// location: desk | george-office | meeting | water | coffee | break
interface OfficeAgentState {
  activity: string;
  detail: string;
  location: string;
}

interface OfficeStateData {
  updatedAt: string;
  agents: Record<string, OfficeAgentState>;
}

interface AgentState {
  name: string;
  emoji: string;
  bodyColor: string;
  eyeColor: string;
  status: "active" | "coming_soon";
  activity: string;
  detail: string;
  pos: Vec;
  target: Vec;
  path: Vec[];
  walkFrame: number;
  direction: "left" | "right" | "up" | "down";
  deskPos: Vec;
  currentLocation: string;
  targetLocation: string;
  breakTimer: number; // countdown for occasional micro-breaks
}

interface LiveAction {
  id: string;
  agent: string;
  agentEmoji: string;
  action: string;
  time: string;
  color: string;
}

// --- Layout (grid units, 1 unit = 12px) ---
const CELL = 12;
const OFFICE_W = 95;
const OFFICE_H = 78;

const DESKS: Record<string, Vec> = {
  George:  { x: 12, y: 14 },
  Dwight:  { x: 35, y: 14 },
  Kelly:   { x: 55, y: 14 },
  Rachel:  { x: 75, y: 14 },
  John:    { x: 35, y: 32 },
  Ross:    { x: 55, y: 32 },
  Pam:     { x: 75, y: 32 },
};

// Named locations agents can be sent to
const LOCATIONS: Record<string, Vec> = {
  "desk": { x: 0, y: 0 }, // placeholder — replaced per-agent
  "george-office": { x: 16, y: 18 }, // in front of George's desk
  "meeting": { x: 47, y: 50 },
  "water": { x: 12, y: 68 },
  "coffee": { x: 47, y: 68 },
  "break": { x: 80, y: 68 },
};

const MEETING_CENTER: Vec = { x: 47, y: 50 };

// --- Pathfinding ---
function buildPath(from: Vec, to: Vec): Vec[] {
  const path: Vec[] = [];
  const dx = to.x > from.x ? 1 : -1;
  let cx = from.x;
  while (cx !== to.x) { cx += dx; path.push({ x: cx, y: from.y }); }
  const dy = to.y > from.y ? 1 : -1;
  let cy = from.y;
  while (cy !== to.y) { cy += dy; path.push({ x: to.x, y: cy }); }
  return path;
}

function getDirection(from: Vec, to: Vec): "left" | "right" | "up" | "down" {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

function vecEq(a: Vec, b: Vec) { return a.x === b.x && a.y === b.y; }

// --- Pixel Sprite ---
function PixelSprite({ agent }: { agent: AgentState }) {
  const { bodyColor, eyeColor, walkFrame, direction, status } = agent;
  if (status === "coming_soon") return null;
  const isWalking = agent.path.length > 0;
  const legOffset = isWalking ? (walkFrame % 2 === 0 ? 1 : -1) : 0;
  const flip = direction === "left" ? -1 : 1;
  const s = 38;

  return (
    <div style={{
      position: "absolute",
      left: agent.pos.x * CELL - s / 2,
      top: agent.pos.y * CELL - s,
      transition: "left 150ms linear, top 150ms linear",
      zIndex: Math.floor(agent.pos.y) + 10,
    }}>
      <svg width={s} height={s} viewBox="0 0 16 18" style={{ imageRendering: "pixelated", transform: `scaleX(${flip})` }}>
        <rect x="4" y="0" width="8" height="6" rx="1" fill={bodyColor} />
        <rect x="5" y="2" width="2" height="2" fill={eyeColor} />
        <rect x="9" y="2" width="2" height="2" fill={eyeColor} />
        <rect x="6" y="3" width="1" height="1" fill="#111" />
        <rect x="10" y="3" width="1" height="1" fill="#111" />
        <rect x="3" y="6" width="10" height="5" fill={bodyColor} />
        <rect x="1" y="6" width="2" height="4" fill={bodyColor} opacity={isWalking ? (walkFrame % 2 === 0 ? 0.8 : 1) : 1} />
        <rect x="13" y="6" width="2" height="4" fill={bodyColor} opacity={isWalking ? (walkFrame % 2 === 0 ? 1 : 0.8) : 1} />
        <rect x="4" y="11" width="3" height={isWalking ? "5" : "4"} fill={bodyColor} transform={isWalking ? `translate(${legOffset}, 0)` : ""} />
        <rect x="9" y="11" width="3" height={isWalking ? "5" : "4"} fill={bodyColor} transform={isWalking ? `translate(${-legOffset}, 0)` : ""} />
        <rect x={3 + (isWalking ? legOffset : 0)} y="15" width="4" height="2" fill="#444" />
        <rect x={9 + (isWalking ? -legOffset : 0)} y="15" width="4" height="2" fill="#444" />
      </svg>
      <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: bodyColor, marginTop: -2, whiteSpace: "nowrap" }}>
        {agent.name}
      </div>
      {/* Activity bubble when at a location (not walking) */}
      {!isWalking && agent.detail && (
        <div style={{ textAlign: "center", fontSize: 9, color: "#8b8fa3", marginTop: 1, whiteSpace: "nowrap", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>
          💭 {agent.detail}
        </div>
      )}
    </div>
  );
}

// --- Furniture ---
function OfficeFurniture() {
  return (
    <>
      {Object.entries(DESKS).map(([, pos]) => (
        <div key={`desk-${pos.x}-${pos.y}`} style={{ position: "absolute", left: pos.x * CELL - 36, top: pos.y * CELL - 10, zIndex: 1 }}>
          <div className="w-[72px] h-12 rounded-sm border-2 border-blue-500/40 bg-blue-500/10 mx-auto relative">
            <div className="absolute top-1.5 left-2 right-2 space-y-1">
              <div className="h-[2px] bg-blue-400/30 w-3/4" />
              <div className="h-[2px] bg-blue-400/20 w-1/2" />
              <div className="h-[2px] bg-blue-400/20 w-2/3" />
            </div>
          </div>
          <div className="w-4 h-2 bg-[#3a3d4a] mx-auto" />
          <div className="w-9 h-1.5 bg-[#3a3d4a] mx-auto" />
          <div className="w-20 h-2.5 bg-[#3a3d4a] rounded mx-auto mt-0.5" />
        </div>
      ))}

      {/* George's office */}
      <div style={{ position: "absolute", left: (DESKS.George.x - 5) * CELL, top: (DESKS.George.y - 6) * CELL, width: 160, height: 200, zIndex: 0 }} className="border border-indigo-500/15 rounded-lg">
        <div className="text-[9px] text-indigo-400/40 uppercase tracking-widest px-3 pt-2">Chief of Staff</div>
      </div>

      {/* Water */}
      <div style={{ position: "absolute", left: LOCATIONS.water.x * CELL - 16, top: LOCATIONS.water.y * CELL - 28, zIndex: 1 }}>
        <div className="w-8 h-16 bg-gradient-to-b from-cyan-400/30 to-cyan-400/5 border border-cyan-400/20 rounded-t-md flex items-end justify-center pb-1">
          <div className="w-4 h-2 bg-cyan-400/30 rounded-sm" />
        </div>
        <div className="w-10 h-1.5 bg-[#2e3345] rounded-b mx-auto" />
        <div className="text-[10px] text-cyan-400/40 text-center mt-1">💧 Water</div>
      </div>

      {/* Coffee */}
      <div style={{ position: "absolute", left: LOCATIONS.coffee.x * CELL - 16, top: LOCATIONS.coffee.y * CELL - 20, zIndex: 1 }}>
        <div className="w-11 h-10 bg-[#3a2a1a] border border-[#5a4a3a] rounded flex items-center justify-center">
          <span className="text-base">☕</span>
        </div>
        <div className="w-14 h-1.5 bg-[#2e3345] rounded-b mx-auto" />
        <div className="text-[10px] text-amber-400/40 text-center mt-1">☕ Coffee</div>
      </div>

      {/* Break room */}
      <div style={{ position: "absolute", left: LOCATIONS.break.x * CELL - 28, top: LOCATIONS.break.y * CELL - 28, zIndex: 1 }} className="bg-[#141620]/60 border border-[#2e3345] rounded-lg px-4 py-3">
        <span className="text-lg">🍿</span>
        <div className="text-[10px] text-[#8b8fa3] mt-1">Break Room</div>
        <div className="flex gap-1 mt-1">
          <span className="text-[9px]">🍕</span><span className="text-[9px]">🍪</span><span className="text-[9px]">🍎</span>
        </div>
      </div>

      {/* Meeting table */}
      <div style={{ position: "absolute", left: MEETING_CENTER.x * CELL - 110, top: MEETING_CENTER.y * CELL - 30, zIndex: 1 }}>
        <div className="bg-[#2a2d3a] rounded-[50%] border-2 border-[#4a4d5a] shadow-lg flex items-center justify-center" style={{ width: 220, height: 60 }}>
          <span className="text-[10px] text-[#666] uppercase tracking-widest">Meeting Table</span>
        </div>
      </div>

      {/* Windows */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28, zIndex: 2 }} className="bg-[#1a1d27] border-b border-[#2e3345] flex">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 border-r border-[#2e3345] flex items-center justify-center">
            <div className="w-3/4 h-4 rounded-sm bg-[#242836] border border-[#2e3345]" />
          </div>
        ))}
      </div>
    </>
  );
}

// --- Main ---
export default function OfficeTab() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [officeState, setOfficeState] = useState<OfficeStateData | null>(null);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [liveActions, setLiveActions] = useState<LiveAction[]>([]);
  const [mounted, setMounted] = useState(false);
  const [standupActive, setStandupActive] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initAgents = useCallback((teamData: TeamData, state: OfficeStateData | null) => {
    const list: AgentState[] = [];
    const makeAgent = (name: string, emoji: string, colors: { body: string; eye: string }, status: "active" | "coming_soon") => {
      const desk = DESKS[name] || { x: 60, y: 30 };
      const agentState = state?.agents[name];
      const targetLoc = agentState?.location || "desk";
      return {
        name, emoji, bodyColor: colors.body, eyeColor: colors.eye, status,
        activity: agentState?.activity || "working",
        detail: agentState?.detail || getDefaultTask(name),
        pos: { ...desk }, target: { ...desk }, path: [],
        walkFrame: 0, direction: "down" as const,
        deskPos: { ...desk },
        currentLocation: "desk",
        targetLocation: targetLoc,
        breakTimer: 200 + Math.floor(Math.random() * 400), // 30-90s before first micro-break
      };
    };

    list.push(makeAgent("George", "🦾", { body: "#6366f1", eye: "#a5b4fc" }, "active"));
    Object.values(teamData.org.divisions).forEach((div) => {
      div.members.forEach((m) => {
        list.push(makeAgent(m.name, m.emoji, getColors(m.name), m.status as "active" | "coming_soon"));
      });
    });
    return list;
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([
      fetch("/data/team.json").then((r) => r.json()),
      fetch("/data/office-state.json").then((r) => r.json()).catch(() => null),
    ]).then(([t, s]) => {
      setTeam(t);
      setOfficeState(s);
      setAgents(initAgents(t, s));
    });
    setStandupActive(isStandupActive());
    setLiveActions(getDefaultActions());
    setMounted(true);
  }, [initAgents]);

  // Poll office-state.json every 15s for live updates
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetch("/data/office-state.json?" + Date.now())
        .then((r) => r.json())
        .then((s: OfficeStateData) => setOfficeState(s))
        .catch(() => {});
    }, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // When officeState changes, update agent targets
  useEffect(() => {
    if (!officeState) return;
    setAgents((prev) => prev.map((a) => {
      const stateEntry = officeState.agents[a.name];
      if (!stateEntry) return a;
      return {
        ...a,
        activity: stateEntry.activity,
        detail: stateEntry.detail,
        targetLocation: stateEntry.location,
      };
    }));
  }, [officeState]);

  // Movement tick
  useEffect(() => {
    if (!mounted || agents.length === 0) return;

    tickRef.current = setInterval(() => {
      const inStandup = isStandupActive();
      setStandupActive(inStandup);

      setAgents((prev) => {
        const activeList = prev.filter(x => x.status === "active");
        return prev.map((agent) => {
          if (agent.status !== "active") return agent;
          const a = { ...agent };

          // Determine where this agent should be
          const desiredLoc = inStandup ? "meeting" : a.targetLocation;

          // Resolve target position
          const resolveTarget = (loc: string): Vec => {
            if (loc === "desk") return a.deskPos;
            if (loc === "meeting") {
              const activeIdx = activeList.findIndex(x => x.name === a.name);
              const angle = (activeIdx / activeList.length) * Math.PI * 2;
              return { x: Math.round(MEETING_CENTER.x + Math.cos(angle) * 11), y: Math.round(MEETING_CENTER.y + Math.sin(angle) * 5) };
            }
            if (loc === "george-office") {
              // Stagger visitors so they don't overlap
              const visitIdx = activeList.filter(x => x.targetLocation === "george-office").findIndex(x => x.name === a.name);
              return { x: LOCATIONS["george-office"].x + visitIdx * 3, y: LOCATIONS["george-office"].y + visitIdx * 2 };
            }
            const base = LOCATIONS[loc] || a.deskPos;
            return { x: base.x + Math.floor(Math.random() * 4) - 2, y: base.y + Math.floor(Math.random() * 3) - 1 };
          };

          // Check if we need to navigate to a new location
          if (a.currentLocation !== desiredLoc && a.path.length === 0) {
            const dest = resolveTarget(desiredLoc);
            a.path = buildPath(a.pos, dest);
            a.target = dest;
          }

          // Walk along path
          if (a.path.length > 0) {
            const next = a.path[0];
            a.direction = getDirection(a.pos, next);
            a.pos = { ...next };
            a.path = a.path.slice(1);
            a.walkFrame = a.walkFrame + 1;

            if (a.path.length === 0) {
              a.currentLocation = desiredLoc;
              a.breakTimer = 200 + Math.floor(Math.random() * 400);
            }
          } else {
            a.walkFrame = 0;

            // Micro-break logic (only when at desk and not being directed somewhere)
            if (!inStandup && a.currentLocation === "desk" && a.targetLocation === "desk") {
              a.breakTimer--;
              if (a.breakTimer <= 0) {
                // 80% keep working, 20% quick break
                if (Math.random() < 0.8) {
                  a.breakTimer = 200 + Math.floor(Math.random() * 400);
                } else {
                  // Quick trip to water/coffee
                  const spots = ["water", "coffee"];
                  const spot = spots[Math.floor(Math.random() * spots.length)];
                  const dest = { x: LOCATIONS[spot].x + Math.floor(Math.random() * 4) - 2, y: LOCATIONS[spot].y };
                  a.path = buildPath(a.pos, dest);
                  a.target = dest;
                  a.currentLocation = "walking-break";
                  a.detail = spot === "water" ? "Getting water" : "Getting coffee";
                }
              }
            }

            // Return from micro-break
            if (a.currentLocation === "walking-break" && a.path.length === 0) {
              // Hang out for a couple seconds, then go back
              a.breakTimer--;
              if (a.breakTimer <= -15) { // ~2 seconds at the station
                a.path = buildPath(a.pos, a.deskPos);
                a.target = a.deskPos;
                a.currentLocation = "returning";
                const stateEntry = officeState?.agents[a.name];
                a.detail = stateEntry?.detail || getDefaultTask(a.name);
              }
            }

            // Returned to desk
            if (a.currentLocation === "returning" && a.path.length === 0 && vecEq(a.pos, a.deskPos)) {
              a.currentLocation = "desk";
              a.breakTimer = 200 + Math.floor(Math.random() * 400);
            }
          }

          return a;
        });
      });
    }, 150);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [mounted, agents.length, officeState]);

  if (!mounted || !team) return null;
  const activeCount = agents.filter((a) => a.status === "active").length;

  return (
    <div className="flex gap-4 max-w-7xl mx-auto">
      <div className="flex-1">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">🏢 The Office</h2>
          <p className="text-sm text-[#8b8fa3] mt-1">{activeCount} agents online{standupActive ? " · 🟢 Standup in progress" : ""}</p>
        </div>

        <div className="bg-[#0a0c10] border border-[#2e3345] rounded-2xl overflow-hidden relative"
          style={{ width: OFFICE_W * CELL, height: OFFICE_H * CELL, backgroundImage: "repeating-conic-gradient(#111318 0% 25%, #0d0f14 0% 50%)", backgroundSize: "32px 32px" }}>
          <OfficeFurniture />
          {agents.map((a) => <PixelSprite key={a.name} agent={a} />)}
        </div>

        <div className="flex items-center gap-6 mt-3 text-xs text-[#8b8fa3] justify-center">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Online</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2e3345]" /> Coming Soon</span>
          <span>Standups: 7:45a · 12p · 5:30p</span>
        </div>
      </div>

      {/* Live Actions */}
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
    George: "Managing the team", Dwight: "Research sweep", Kelly: "Drafting tweets",
    Rachel: "LinkedIn drafts", John: "Market analysis", Ross: "Code review", Pam: "Calendar mgmt",
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
