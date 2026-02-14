"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TeamData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

// --- Types ---
interface Vec { x: number; y: number }

interface OfficeAgentState { activity: string; detail: string; location: string }
interface OfficeStateData { updatedAt: string; agents: Record<string, OfficeAgentState> }

interface AgentState {
  name: string; emoji: string; bodyColor: string; eyeColor: string;
  status: "active" | "coming_soon";
  activity: string; detail: string;
  pos: Vec; target: Vec; path: Vec[];
  walkFrame: number; direction: "left" | "right" | "up" | "down";
  deskPos: Vec; currentLocation: string; targetLocation: string;
  breakTimer: number;
}

interface LiveAction { id: string; agent: string; agentEmoji: string; action: string; time: string; color: string }

// --- Layout ---
const CELL = 7;
const OFFICE_W = 120;
const OFFICE_H = 80;

// Aisles (in grid coords) — agents must route through these
const MAIN_AISLE_Y = 24;    // horizontal aisle between desk rows
const BOTTOM_AISLE_Y = 42;  // horizontal aisle below bottom desks
const LOWER_AISLE_Y = 58;   // horizontal aisle above meeting/amenities
const LEFT_AISLE_X = 6;     // vertical aisle on left
const RIGHT_AISLE_X = 114;  // vertical aisle on right
const MID_AISLE_X = 60;     // vertical aisle in middle

const DESKS: Record<string, Vec> = {
  George:  { x: 18, y: 15 },
  Dwight:  { x: 42, y: 15 },
  Kelly:   { x: 66, y: 15 },
  Rachel:  { x: 90, y: 15 },
  John:    { x: 42, y: 35 },
  Ross:    { x: 66, y: 35 },
  Pam:     { x: 90, y: 35 },
};

const LOCATIONS: Record<string, Vec> = {
  "desk": { x: 0, y: 0 },
  "george-office": { x: 22, y: 20 },
  "meeting": { x: 60, y: 65 },
  "water": { x: 15, y: 72 },
  "coffee": { x: 42, y: 72 },
  "break": { x: 100, y: 72 },
};

const MEETING_CENTER: Vec = { x: 60, y: 65 };

// --- Obstacle map (furniture bounding boxes in grid coords) ---
// Each rect: { x1, y1, x2, y2 } — agents cannot enter these
function getDeskObstacles(): { x1: number; y1: number; x2: number; y2: number }[] {
  const obstacles: { x1: number; y1: number; x2: number; y2: number }[] = [];
  Object.entries(DESKS).forEach(([, pos]) => {
    // Desk surface area (wider than sprite)
    obstacles.push({ x1: pos.x - 5, y1: pos.y - 2, x2: pos.x + 5, y2: pos.y + 3 });
  });
  // Meeting table
  obstacles.push({ x1: MEETING_CENTER.x - 14, y1: MEETING_CENTER.y - 3, x2: MEETING_CENTER.x + 14, y2: MEETING_CENTER.y + 3 });
  return obstacles;
}

const OBSTACLES = getDeskObstacles();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _OBSTACLES = OBSTACLES; // obstacles used by corridor routing logic

// --- Corridor-based pathfinding ---
// Route: current pos → nearest horizontal aisle → along aisle → nearest vertical aisle to dest → dest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildCorridorPath(from: Vec, to: Vec, agentName: string): Vec[] {
  // If very close, just go direct
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) <= 4) {
    return buildDirect(from, to);
  }

  const path: Vec[] = [];

  // Step 1: Walk vertically to nearest horizontal aisle
  const fromAisle = nearestAisle(from.y);
  addVerticalSegment(path, from.x, from.y, fromAisle);

  // Step 2: Walk horizontally toward destination x
  const toAisle = nearestAisle(to.y);
  if (fromAisle === toAisle) {
    addHorizontalSegment(path, from.x, fromAisle, to.x);
  } else {
    // Walk to a vertical connector, then switch aisles
    const vx = nearestVerticalAisle(from.x, to.x);
    addHorizontalSegment(path, from.x, fromAisle, vx);
    addVerticalSegment(path, vx, fromAisle, toAisle);
    addHorizontalSegment(path, vx, toAisle, to.x);
  }

  // Step 3: Walk vertically from aisle to destination
  const lastPos = path.length > 0 ? path[path.length - 1] : from;
  addVerticalSegment(path, lastPos.x, lastPos.y, to.y);

  // Final horizontal adjustment
  const lastPos2 = path.length > 0 ? path[path.length - 1] : from;
  if (lastPos2.x !== to.x) {
    addHorizontalSegment(path, lastPos2.x, to.y, to.x);
  }

  return path;
}

function nearestAisle(y: number): number {
  const aisles = [MAIN_AISLE_Y, BOTTOM_AISLE_Y, LOWER_AISLE_Y];
  let best = aisles[0], bestDist = Math.abs(y - aisles[0]);
  for (const a of aisles) {
    const d = Math.abs(y - a);
    if (d < bestDist) { best = a; bestDist = d; }
  }
  return best;
}

function nearestVerticalAisle(fromX: number, toX: number): number {
  const aisles = [LEFT_AISLE_X, MID_AISLE_X, RIGHT_AISLE_X];
  // Pick the vertical aisle that's between from and to, or closest to midpoint
  const mid = (fromX + toX) / 2;
  let best = aisles[0], bestDist = Math.abs(mid - aisles[0]);
  for (const a of aisles) {
    const d = Math.abs(mid - a);
    if (d < bestDist) { best = a; bestDist = d; }
  }
  return best;
}

function addHorizontalSegment(path: Vec[], fromX: number, y: number, toX: number) {
  const dx = toX > fromX ? 2 : -2;
  let x = fromX;
  while (Math.abs(x - toX) > 2) { x += dx; path.push({ x, y }); }
  if (x !== toX) path.push({ x: toX, y });
}

function addVerticalSegment(path: Vec[], x: number, fromY: number, toY: number) {
  const dy = toY > fromY ? 2 : -2;
  let y = fromY;
  while (Math.abs(y - toY) > 2) { y += dy; path.push({ x, y }); }
  if (y !== toY) path.push({ x, y: toY });
}

function buildDirect(from: Vec, to: Vec): Vec[] {
  const path: Vec[] = [];
  let cx = from.x, cy = from.y;
  while (cx !== to.x) { cx += (to.x > cx ? 1 : -1); path.push({ x: cx, y: cy }); }
  while (cy !== to.y) { cy += (to.y > cy ? 1 : -1); path.push({ x: cx, y: cy }); }
  return path;
}

function getDirection(from: Vec, to: Vec): "left" | "right" | "up" | "down" {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

function vecEq(a: Vec, b: Vec) { return a.x === b.x && a.y === b.y; }

// --- Sprite ---
function PixelSprite({ agent }: { agent: AgentState }) {
  if (agent.status === "coming_soon") return null;
  const { bodyColor, eyeColor, walkFrame, direction, path: agentPath } = agent;
  const isWalking = agentPath.length > 0;
  const legOff = isWalking ? (walkFrame % 2 === 0 ? 1 : -1) : 0;
  const flip = direction === "left" ? -1 : 1;
  const s = 28;

  return (
    <div style={{
      position: "absolute",
      left: agent.pos.x * CELL - s / 2,
      top: agent.pos.y * CELL - s,
      transition: "left 120ms linear, top 120ms linear",
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
        <rect x="4" y="11" width="3" height={isWalking ? "5" : "4"} fill={bodyColor} transform={isWalking ? `translate(${legOff}, 0)` : ""} />
        <rect x="9" y="11" width="3" height={isWalking ? "5" : "4"} fill={bodyColor} transform={isWalking ? `translate(${-legOff}, 0)` : ""} />
        <rect x={3 + (isWalking ? legOff : 0)} y="15" width="4" height="2" fill="#444" />
        <rect x={9 + (isWalking ? -legOff : 0)} y="15" width="4" height="2" fill="#444" />
      </svg>
      {/* Name — never flips */}
      <div style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: bodyColor, marginTop: -1, whiteSpace: "nowrap" }}>
        {agent.name}
      </div>
      {/* Activity bubble when idle */}
      {!isWalking && agent.detail && (
        <div style={{ textAlign: "center", fontSize: 8, color: "#8b8fa3", marginTop: 1, whiteSpace: "nowrap", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>
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
      {/* Desks */}
      {Object.entries(DESKS).map(([name, pos]) => (
        <div key={`desk-${name}`} style={{ position: "absolute", left: pos.x * CELL - 28, top: pos.y * CELL - 6, zIndex: 1 }}>
          {/* Desk surface */}
          <div className="rounded-sm border border-blue-500/30 bg-blue-500/8 relative" style={{ width: 56, height: 30 }}>
            {/* Monitor */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-[#1a1d27] border border-blue-400/25 rounded-sm" style={{ width: 28, height: 16 }}>
              <div className="absolute top-1.5 left-1 right-1 space-y-0.5">
                <div className="h-px bg-blue-400/20 w-3/4" />
                <div className="h-px bg-blue-400/15 w-1/2" />
              </div>
            </div>
            {/* Monitor stand */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#3a3d4a]" />
          </div>
          {/* Chair */}
          <div className="w-10 h-3 bg-[#2a2d3a] rounded-b mx-auto mt-0.5 border-x border-b border-[#3a3d4a]" />
        </div>
      ))}

      {/* George's office border */}
      <div style={{ position: "absolute", left: (DESKS.George.x - 8) * CELL, top: (DESKS.George.y - 6) * CELL, width: 120, height: 145, zIndex: 0 }} className="border border-indigo-500/12 rounded-lg">
        <div className="text-[8px] text-indigo-400/30 uppercase tracking-widest px-2 pt-1.5">Chief of Staff</div>
      </div>

      {/* Water */}
      <div style={{ position: "absolute", left: LOCATIONS.water.x * CELL - 10, top: LOCATIONS.water.y * CELL - 18, zIndex: 1 }}>
        <div className="w-5 h-10 bg-gradient-to-b from-cyan-400/25 to-cyan-400/5 border border-cyan-400/15 rounded-t-sm flex items-end justify-center pb-0.5">
          <div className="w-2.5 h-1 bg-cyan-400/25 rounded-sm" />
        </div>
        <div className="text-[8px] text-cyan-400/30 text-center mt-0.5">💧</div>
      </div>

      {/* Coffee */}
      <div style={{ position: "absolute", left: LOCATIONS.coffee.x * CELL - 10, top: LOCATIONS.coffee.y * CELL - 14, zIndex: 1 }}>
        <div className="w-7 h-6 bg-[#3a2a1a] border border-[#5a4a3a] rounded flex items-center justify-center">
          <span className="text-xs">☕</span>
        </div>
        <div className="text-[8px] text-amber-400/30 text-center mt-0.5">Coffee</div>
      </div>

      {/* Break room */}
      <div style={{ position: "absolute", left: LOCATIONS.break.x * CELL - 18, top: LOCATIONS.break.y * CELL - 18, zIndex: 1 }} className="bg-[#141620]/50 border border-[#2e3345] rounded px-2.5 py-1.5">
        <span className="text-sm">🍿</span>
        <div className="text-[8px] text-[#8b8fa3] mt-0.5">Break Room</div>
      </div>

      {/* Meeting table */}
      <div style={{ position: "absolute", left: MEETING_CENTER.x * CELL - 80, top: MEETING_CENTER.y * CELL - 16, zIndex: 1 }}>
        <div className="bg-[#2a2d3a] rounded-[50%] border-2 border-[#3a3d4a] shadow-md flex items-center justify-center" style={{ width: 160, height: 32 }}>
          <span className="text-[8px] text-[#555] uppercase tracking-widest">Meeting Table</span>
        </div>
        {/* Chairs around the table */}
        {Array.from({ length: 7 }).map((_, i) => {
          const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
          const cx = 80 + Math.cos(angle) * 90;
          const cy = 16 + Math.sin(angle) * 22;
          return <div key={`chair-${i}`} className="absolute w-3 h-3 bg-[#2a2d3a] rounded-full border border-[#3a3d4a]" style={{ left: cx - 6, top: cy - 6 }} />;
        })}
      </div>

      {/* Floor labels */}
      <div style={{ position: "absolute", left: 30 * CELL, top: 7 * CELL, zIndex: 0 }} className="text-[7px] text-[#2e3345] uppercase tracking-widest">Research & Content</div>
      <div style={{ position: "absolute", left: 30 * CELL, top: 28 * CELL, zIndex: 0 }} className="text-[7px] text-[#2e3345] uppercase tracking-widest">Finance & Engineering</div>

      {/* Windows */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, zIndex: 2 }} className="bg-[#1a1d27] border-b border-[#2e3345] flex">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex-1 border-r border-[#2e3345] flex items-center justify-center">
            <div className="w-3/4 h-2.5 rounded-sm bg-[#242836] border border-[#2e3345]" />
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
  const officeStateRef = useRef<OfficeStateData | null>(null);

  // Keep ref in sync
  useEffect(() => { officeStateRef.current = officeState; }, [officeState]);

  const initAgents = useCallback((teamData: TeamData, state: OfficeStateData | null) => {
    const list: AgentState[] = [];
    const makeAgent = (name: string, emoji: string, colors: { body: string; eye: string }, status: "active" | "coming_soon") => {
      const desk = DESKS[name] || { x: 60, y: 30 };
      const agentState = state?.agents[name];
      return {
        name, emoji, bodyColor: colors.body, eyeColor: colors.eye, status,
        activity: agentState?.activity || "working",
        detail: agentState?.detail || getDefaultTask(name),
        pos: { ...desk }, target: { ...desk }, path: [],
        walkFrame: 0, direction: "down" as const, deskPos: { ...desk },
        currentLocation: "desk", targetLocation: agentState?.location || "desk",
        breakTimer: 300 + Math.floor(Math.random() * 600),
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

  useEffect(() => {
    Promise.all([
      fetchData<TeamData>("team.json"),
      fetchData<OfficeStateData>("office-state.json").catch(() => null),
    ]).then(([t, s]) => { setTeam(t); setOfficeState(s); setAgents(initAgents(t, s)); });
    setStandupActive(isStandupActive());
    fetchData<LiveAction[]>("live-actions.json").then(setLiveActions).catch(() => setLiveActions([]));
    setMounted(true);
  }, [initAgents]);

  // Poll office state
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchData<OfficeStateData>("office-state.json").then(s => setOfficeState(s)).catch(() => {});
      fetchData<LiveAction[]>("live-actions.json").then(setLiveActions).catch(() => {});
    }, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Sync state → agent targets
  useEffect(() => {
    if (!officeState) return;
    setAgents(prev => prev.map(a => {
      const e = officeState.agents[a.name];
      if (!e) return a;
      return { ...a, activity: e.activity, detail: e.detail, targetLocation: e.location };
    }));
  }, [officeState]);

  // Movement tick
  useEffect(() => {
    if (!mounted || agents.length === 0) return;

    tickRef.current = setInterval(() => {
      const inStandup = isStandupActive();
      setStandupActive(inStandup);

      setAgents(prev => {
        const activeList = prev.filter(x => x.status === "active");
        // Track occupied positions for collision avoidance
        const occupied = new Map<string, string>(); // "x,y" → agentName
        prev.forEach(a => { if (a.status === "active") occupied.set(`${a.pos.x},${a.pos.y}`, a.name); });

        return prev.map(agent => {
          if (agent.status !== "active") return agent;
          const a = { ...agent };
          const desiredLoc = inStandup ? "meeting" : a.targetLocation;

          // Resolve target position
          const resolveTarget = (loc: string): Vec => {
            if (loc === "desk") return a.deskPos;
            if (loc === "meeting") {
              const activeIdx = activeList.findIndex(x => x.name === a.name);
              const angle = (activeIdx / activeList.length) * Math.PI * 2 - Math.PI / 2;
              return { x: Math.round(MEETING_CENTER.x + Math.cos(angle) * 16), y: Math.round(MEETING_CENTER.y + Math.sin(angle) * 7) };
            }
            if (loc === "george-office") {
              const visitIdx = activeList.filter(x => x.targetLocation === "george-office").findIndex(x => x.name === a.name);
              return { x: LOCATIONS["george-office"].x + visitIdx * 4, y: LOCATIONS["george-office"].y };
            }
            return LOCATIONS[loc] || a.deskPos;
          };

          // Navigate to new location
          if (a.currentLocation !== desiredLoc && a.path.length === 0 && a.currentLocation !== "walking-break" && a.currentLocation !== "returning") {
            const dest = resolveTarget(desiredLoc);
            a.path = buildCorridorPath(a.pos, dest, a.name);
            a.target = dest;
          }

          // Walk
          if (a.path.length > 0) {
            const next = a.path[0];
            // Collision check: is another agent at the next position?
            const key = `${next.x},${next.y}`;
            const blocker = occupied.get(key);
            if (blocker && blocker !== a.name) {
              // Wait a tick — but if stuck too long, skip the blocked step
              a.walkFrame++;
              if (a.walkFrame > 15) {
                // Stuck too long — skip this waypoint to unstick
                a.path = a.path.slice(1);
                a.walkFrame = 0;
              }
            } else {
              // Remove old position, update
              occupied.delete(`${a.pos.x},${a.pos.y}`);
              a.direction = getDirection(a.pos, next);
              a.pos = { ...next };
              a.path = a.path.slice(1);
              a.walkFrame++;
              occupied.set(`${a.pos.x},${a.pos.y}`, a.name);
            }

            if (a.path.length === 0) {
              a.currentLocation = desiredLoc;
              // Short pause at directed locations; longer idle at desk
              a.breakTimer = desiredLoc === "desk" ? 300 + Math.floor(Math.random() * 600) : 30 + Math.floor(Math.random() * 40);
            }
          } else {
            a.walkFrame = 0;

            // Micro-breaks (desk only, not directed)
            if (!inStandup && a.currentLocation === "desk" && a.targetLocation === "desk") {
              a.breakTimer--;
              if (a.breakTimer <= 0) {
                if (Math.random() < 0.85) {
                  a.breakTimer = 300 + Math.floor(Math.random() * 600);
                } else {
                  const spots = ["water", "coffee"];
                  const spot = spots[Math.floor(Math.random() * spots.length)];
                  const dest = LOCATIONS[spot];
                  a.path = buildCorridorPath(a.pos, dest, a.name);
                  a.target = dest;
                  a.currentLocation = "walking-break";
                  a.breakTimer = 25 + Math.floor(Math.random() * 30); // 3-7 sec pause at break spot
                  a.detail = spot === "water" ? "Getting water" : "Getting coffee";
                }
              }
            }

            // Return from break — short pause then head back
            if (a.currentLocation === "walking-break" && a.path.length === 0) {
              a.breakTimer--;
              if (a.breakTimer <= 0) {
                a.path = buildCorridorPath(a.pos, a.deskPos, a.name);
                a.target = a.deskPos;
                a.currentLocation = "returning";
                const e = officeStateRef.current?.agents[a.name];
                a.detail = e?.detail || getDefaultTask(a.name);
              }
            }

            if (a.currentLocation === "returning" && a.path.length === 0 && vecEq(a.pos, a.deskPos)) {
              a.currentLocation = "desk";
              a.targetLocation = "desk";
              a.breakTimer = 300 + Math.floor(Math.random() * 600);
            }
          }
          return a;
        });
      });
    }, 120);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [mounted, agents.length]);

  if (!mounted || !team) return null;
  const activeCount = agents.filter(a => a.status === "active").length;

  return (
    <div className="flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto">
      <div className="flex-1 min-w-0">
        <div className="mb-3">
          <h2 className="text-xl md:text-2xl font-bold">🏢 The Office</h2>
          <p className="text-xs md:text-sm text-[#8b8fa3] mt-1">{activeCount} agents online{standupActive ? " · 🟢 Standup in progress" : ""}</p>
        </div>

        {/* Scrollable office canvas on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="bg-[#0a0c10] border border-[#2e3345] rounded-xl overflow-hidden relative"
            style={{ width: OFFICE_W * CELL, height: OFFICE_H * CELL, minWidth: OFFICE_W * CELL, backgroundImage: "repeating-conic-gradient(#111318 0% 25%, #0d0f14 0% 50%)", backgroundSize: "24px 24px" }}>
            <OfficeFurniture />
            {agents.map(a => <PixelSprite key={a.name} agent={a} />)}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5 mt-2 text-[9px] md:text-[10px] text-[#8b8fa3] justify-center flex-wrap">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#2e3345]" /> Coming Soon</span>
          <span>Standups: 4a · 7:45a · 12p · 4p · 8p · 11p</span>
        </div>
      </div>

      {/* Live Actions — side on desktop, below on mobile */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden lg:sticky lg:top-8">
          <div className="px-3 py-2.5 border-b border-[#2e3345] flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <h3 className="text-xs font-semibold text-[#e4e6ed]">Live Actions</h3>
          </div>
          <div className="max-h-[300px] lg:max-h-[500px] overflow-y-auto">
            {liveActions.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#8b8fa3]">No recent activity</div>
            ) : (
              <div className="divide-y divide-[#2e3345]">
                {liveActions.map(a => (
                  <div key={a.id} className="px-3 py-2.5 hover:bg-[#242836] transition-colors">
                    <div className="flex items-start gap-2">
                      <span className="text-xs mt-0.5">{a.agentEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[#e4e6ed]">
                          <span className="font-semibold" style={{ color: a.color }}>{a.agent}</span>
                          {" — "}{a.action}
                        </p>
                        <p className="text-[9px] text-[#8b8fa3] mt-0.5">{a.time}</p>
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
  // 6x daily: 4:00a, 7:45a, 12:00p, 4:00p, 8:00p, 11:00p — each lasts 15 min
  return (
    (t >= 240 && t < 255) ||   // 4:00 AM
    (t >= 465 && t < 480) ||   // 7:45 AM
    (t >= 720 && t < 735) ||   // 12:00 PM
    (t >= 960 && t < 975) ||   // 4:00 PM
    (t >= 1200 && t < 1215) || // 8:00 PM
    (t >= 1380 && t < 1395)    // 11:00 PM
  );
}

function getColors(name: string): { body: string; eye: string } {
  const m: Record<string, { body: string; eye: string }> = {
    Dwight: { body: "#a855f7", eye: "#e9d5ff" }, Kelly: { body: "#ec4899", eye: "#fce7f3" },
    Rachel: { body: "#3b82f6", eye: "#bfdbfe" }, John: { body: "#10b981", eye: "#a7f3d0" },
    Ross: { body: "#f97316", eye: "#fed7aa" }, Pam: { body: "#f43f5e", eye: "#fecdd3" },
  };
  return m[name] || { body: "#6b7280", eye: "#d1d5db" };
}

function getDefaultTask(name: string): string {
  const t: Record<string, string> = {
    George: "Managing the team", Dwight: "Research sweep", Kelly: "Drafting tweets",
    Rachel: "LinkedIn drafts", John: "Market analysis", Ross: "Code review", Pam: "Calendar mgmt",
  };
  return t[name] || "";
}

// Live actions now loaded from /data/live-actions.json
