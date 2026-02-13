"use client";

import { useState, useEffect } from "react";
import { TeamData, StandupEntry } from "@/lib/types";

interface AgentInfo {
  name: string;
  emoji: string;
  bodyColor: string;
  eyeColor: string;
  status: "active" | "coming_soon";
  task?: string;
}

interface LiveAction {
  id: string;
  agent: string;
  agentEmoji: string;
  action: string;
  time: string;
  color: string;
}

// Pixel character - looks like the reference image sprites
function PixelCharacter({ bodyColor, eyeColor, name, active, size = 32 }: {
  bodyColor: string; eyeColor: string; name: string; active: boolean; size?: number;
}) {
  const s = size;
  const opacity = active ? 1 : 0.3;
  return (
    <div className="flex flex-col items-center" style={{ opacity }}>
      <svg width={s} height={s} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
        {/* Head */}
        <rect x="4" y="0" width="8" height="7" fill={bodyColor} />
        {/* Eyes */}
        <rect x="5" y="2" width="2" height="2" fill={eyeColor} />
        <rect x="9" y="2" width="2" height="2" fill={eyeColor} />
        {/* Pupils */}
        <rect x="6" y="3" width="1" height="1" fill="#111" />
        <rect x="10" y="3" width="1" height="1" fill="#111" />
        {/* Body */}
        <rect x="3" y="7" width="10" height="5" fill={bodyColor} />
        {/* Arms */}
        <rect x="1" y="7" width="2" height="4" fill={bodyColor} />
        <rect x="13" y="7" width="2" height="4" fill={bodyColor} />
        {/* Legs */}
        <rect x="4" y="12" width="3" height="4" fill={bodyColor} />
        <rect x="9" y="12" width="3" height="4" fill={bodyColor} />
        {/* Feet */}
        <rect x="3" y="14" width="4" height="2" fill={active ? "#555" : "#333"} />
        <rect x="9" y="14" width="4" height="2" fill={active ? "#555" : "#333"} />
      </svg>
      <span className="text-[9px] font-bold mt-0.5" style={{ color: active ? bodyColor : "#555" }}>{name}</span>
      {active && (
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
      )}
    </div>
  );
}

function Monitor() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-10 rounded-sm border-2 border-blue-500/50 bg-blue-500/15 relative overflow-hidden">
        <div className="absolute inset-0.5 bg-gradient-to-b from-blue-400/10 to-blue-600/5" />
        {/* Screen content lines */}
        <div className="absolute top-1.5 left-1.5 right-1.5 space-y-1">
          <div className="h-[2px] bg-blue-400/30 w-3/4" />
          <div className="h-[2px] bg-blue-400/20 w-1/2" />
          <div className="h-[2px] bg-blue-400/30 w-2/3" />
        </div>
      </div>
      <div className="w-4 h-1.5 bg-[#3a3d4a]" />
      <div className="w-8 h-1 bg-[#3a3d4a] rounded-b" />
    </div>
  );
}

function DeskUnit({ agent, flipped }: { agent: AgentInfo; flipped?: boolean }) {
  const active = agent.status === "active";
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Character at desk */}
      {!flipped && (
        <PixelCharacter bodyColor={agent.bodyColor} eyeColor={agent.eyeColor} name={agent.name} active={active} />
      )}
      {/* Monitor */}
      {active ? <Monitor /> : (
        <div className="flex flex-col items-center">
          <div className="w-14 h-10 rounded-sm border-2 border-[#2e3345] bg-[#0a0c10]" />
          <div className="w-4 h-1.5 bg-[#2a2d3a]" />
          <div className="w-8 h-1 bg-[#2a2d3a] rounded-b" />
        </div>
      )}
      {flipped && (
        <PixelCharacter bodyColor={agent.bodyColor} eyeColor={agent.eyeColor} name={agent.name} active={active} />
      )}
      {/* Desk surface */}
      <div className={`w-20 h-2.5 rounded ${active ? "bg-[#4a4d5a]" : "bg-[#2a2d3a]"}`} />
      {/* Task bubble */}
      {agent.task && active && (
        <div className="text-[8px] text-[#8b8fa3] max-w-20 truncate text-center" title={agent.task}>
          💭 {agent.task}
        </div>
      )}
    </div>
  );
}

function isStandupActive(): boolean {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const t = h * 60 + m;
  // Active during standup windows (15 min each): 7:45-8:00, 12:00-12:15, 17:30-17:45
  return (t >= 465 && t < 480) || (t >= 720 && t < 735) || (t >= 1050 && t < 1065);
}

export default function OfficeTab() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [standups, setStandups] = useState<StandupEntry[]>([]);
  const [liveActions, setLiveActions] = useState<LiveAction[]>([]);
  const [standupActive, setStandupActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/team.json").then((r) => r.json()),
      fetch("/data/standups.json").then((r) => r.json()),
    ]).then(([t, s]) => {
      setTeam(t);
      setStandups(s);
    }).catch(() => {});

    setStandupActive(isStandupActive());
    const interval = setInterval(() => setStandupActive(isStandupActive()), 30000);

    setLiveActions(getDefaultActions());
    setMounted(true);
    return () => clearInterval(interval);
  }, []);

  if (!mounted || !team) return null;

  // Build agent list (NO Brandon - just the AI team)
  const agents: AgentInfo[] = [
    { name: "George", emoji: "🦾", bodyColor: "#6366f1", eyeColor: "#a5b4fc", status: "active", task: "Managing the team" },
  ];
  Object.values(team.org.divisions).forEach((div) => {
    div.members.forEach((m) => {
      const colors = getColors(m.name);
      agents.push({
        name: m.name,
        emoji: m.emoji,
        bodyColor: colors.body,
        eyeColor: colors.eye,
        status: m.status as "active" | "coming_soon",
        task: m.currentTask || getDefaultTask(m.name),
      });
    });
  });

  const activeAgents = agents.filter((a) => a.status === "active");
  // standups data available for future use
  void standups;

  return (
    <div className="flex gap-4 max-w-7xl mx-auto">
      {/* Office Floor Plan */}
      <div className="flex-1">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">🏢 The Office</h2>
          <p className="text-sm text-[#8b8fa3] mt-1">{activeAgents.length} agents online{standupActive ? " · 🟢 Standup in progress" : ""}</p>
        </div>

        <div className="bg-[#0a0c10] border border-[#2e3345] rounded-2xl overflow-hidden relative"
          style={{ backgroundImage: "repeating-conic-gradient(#111318 0% 25%, #0d0f14 0% 50%)", backgroundSize: "32px 32px" }}>

          {/* Top wall / windows */}
          <div className="h-10 bg-[#1a1d27] border-b border-[#2e3345] flex">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-[#2e3345] flex items-center justify-center">
                <div className="w-3/4 h-5 rounded-sm bg-[#242836] border border-[#2e3345]" />
              </div>
            ))}
          </div>

          <div className="p-8 relative z-10">
            {/* Row 1: George's office + top row desks */}
            <div className="flex items-start gap-6 mb-12">
              {/* George's corner office */}
              <div className="bg-[#141620]/80 border border-indigo-500/20 rounded-lg p-4 shrink-0">
                <div className="text-[8px] text-indigo-400/60 uppercase tracking-widest mb-2">Chief of Staff</div>
                <DeskUnit agent={agents[0]} />
              </div>

              {/* Top row desks */}
              <div className="flex gap-10 ml-8">
                {agents.slice(1, 4).map((a) => (
                  <DeskUnit key={a.name} agent={a} />
                ))}
              </div>
            </div>

            {/* Row 2: Bottom row desks */}
            <div className="flex gap-10 ml-32 mb-12">
              {agents.slice(4).map((a) => (
                <DeskUnit key={a.name} agent={a} />
              ))}
            </div>

            {/* Meeting Table */}
            <div className="flex justify-center mb-10">
              <div className="relative">
                {standupActive ? (
                  <>
                    {/* Agents gathered around table during standup */}
                    <div className="flex justify-center gap-4 mb-2">
                      {activeAgents.slice(0, Math.ceil(activeAgents.length / 2)).map((a) => (
                        <PixelCharacter key={a.name} bodyColor={a.bodyColor} eyeColor={a.eyeColor} name={a.name} active size={24} />
                      ))}
                    </div>
                    <div className="bg-[#3a3d4a] rounded-[50%] border-2 border-[#5a5d6a] px-20 py-5 shadow-xl flex flex-col items-center">
                      <span className="text-[10px] text-white font-semibold uppercase tracking-wider">🟢 Standup Active</span>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {activeAgents.slice(Math.ceil(activeAgents.length / 2)).map((a) => (
                        <PixelCharacter key={a.name} bodyColor={a.bodyColor} eyeColor={a.eyeColor} name={a.name} active size={24} />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Empty meeting table when no standup */}
                    <div className="bg-[#2a2d3a] rounded-[50%] border-2 border-[#3a3d4a] px-20 py-5 shadow-lg flex flex-col items-center">
                      <span className="text-[10px] text-[#8b8fa3] uppercase tracking-wider">Meeting Table</span>
                      <span className="text-[8px] text-[#555] mt-0.5">
                        Next: {getNextStandup()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom: Communal areas */}
            <div className="flex justify-between items-end px-4">
              {/* Water Station */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-14 rounded-t-md bg-gradient-to-b from-cyan-400/30 to-cyan-400/5 border border-cyan-400/20 flex items-end justify-center pb-1">
                  <div className="w-3 h-1.5 bg-cyan-400/30 rounded-sm" />
                </div>
                <div className="w-10 h-1.5 bg-[#2e3345] rounded-b" />
                <span className="text-[8px] text-cyan-400/50 mt-1">💧 Water</span>
              </div>

              {/* Coffee Station */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-8 bg-[#3a2a1a] rounded border border-[#5a4a3a] flex items-center justify-center">
                  <span className="text-sm">☕</span>
                </div>
                <div className="w-12 h-1.5 bg-[#2e3345] rounded-b" />
                <span className="text-[8px] text-amber-400/50 mt-1">☕ Coffee</span>
              </div>

              {/* Break Room */}
              <div className="bg-[#141620]/60 border border-[#2e3345] rounded-lg px-4 py-3 flex flex-col items-center">
                <span className="text-lg">🍿</span>
                <span className="text-[8px] text-[#8b8fa3] mt-1">Break Room</span>
                <div className="flex gap-1 mt-1">
                  <span className="text-[8px]">🍕</span>
                  <span className="text-[8px]">🍪</span>
                  <span className="text-[8px]">🍎</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
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
    Dwight: "Research sweep",
    Kelly: "Drafting tweets",
    Rachel: "LinkedIn drafts",
    John: "Market analysis",
    Ross: "Code review",
    Pam: "Calendar mgmt",
  };
  return tasks[name] || "";
}

function getNextStandup(): string {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const t = h * 60 + m;
  if (t < 465) return "7:45 AM";
  if (t < 720) return "12:00 PM";
  if (t < 1050) return "5:30 PM";
  return "7:45 AM tomorrow";
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
