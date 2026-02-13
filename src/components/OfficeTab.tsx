"use client";

import { useState, useEffect } from "react";
import { TeamData, StandupEntry } from "@/lib/types";

interface AgentSprite {
  name: string;
  emoji: string;
  color: string;
  status: "active" | "coming_soon";
  task?: string;
  position: "desk" | "meeting" | "water" | "coffee" | "break";
}

interface LiveAction {
  id: string;
  agent: string;
  agentEmoji: string;
  action: string;
  time: string;
  color: string;
}

const LIVE_ACTIONS_KEY = "mc_office_actions";

// Pixel-art inspired sprite using CSS
function Sprite({ color, emoji, name, active, size = "md" }: { color: string; emoji: string; name: string; active: boolean; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative">
        <div className={`${s} rounded-md ${active ? color : "bg-[#2e3345]"} flex items-center justify-center shadow-lg border-2 ${active ? "border-white/20" : "border-[#1a1d27]"}`}
          style={{ imageRendering: "pixelated" }}>
          <span className={textSize}>{emoji}</span>
        </div>
        {active && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#0a0c10]" />
        )}
      </div>
      <span className={`${size === "sm" ? "text-[8px]" : "text-[10px]"} font-bold ${active ? "text-white" : "text-[#8b8fa3]"}`} style={{ color: active ? color.includes("bg-") ? undefined : color : undefined }}>
        {name}
      </span>
    </div>
  );
}

function Monitor({ occupied }: { occupied?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-12 h-8 rounded-sm border-2 ${occupied ? "border-blue-500/60 bg-blue-500/20" : "border-[#2e3345] bg-[#0a0c10]"}`}>
        {occupied && <div className="w-full h-full bg-blue-500/10 animate-pulse" />}
      </div>
      <div className="w-8 h-1 bg-[#2e3345] rounded-b" />
      <div className="w-10 h-1 bg-[#2e3345] rounded-b" />
    </div>
  );
}

function Desk({ agent, showMonitor = true }: { agent?: AgentSprite; showMonitor?: boolean }) {
  const active = agent?.status === "active";
  return (
    <div className="flex flex-col items-center gap-1">
      {agent && (
        <Sprite
          color={agent.color}
          emoji={agent.emoji}
          name={agent.name}
          active={active ?? false}
        />
      )}
      {showMonitor && <Monitor occupied={active} />}
      {/* Desk surface */}
      <div className={`w-20 h-3 rounded ${active ? "bg-[#3a3d4a]" : "bg-[#2a2d3a]"}`} />
      {agent?.task && active && (
        <div className="text-[8px] text-[#8b8fa3] max-w-20 truncate text-center mt-0.5" title={agent.task}>
          💭 {agent.task}
        </div>
      )}
    </div>
  );
}

export default function OfficeTab() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [standups, setStandups] = useState<StandupEntry[]>([]);
  const [liveActions, setLiveActions] = useState<LiveAction[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/team.json").then((r) => r.json()),
      fetch("/data/standups.json").then((r) => r.json()),
    ]).then(([t, s]) => {
      setTeam(t);
      setStandups(s);
    }).catch(() => {});

    // Load live actions from localStorage or seed
    try {
      const stored = localStorage.getItem(LIVE_ACTIONS_KEY);
      if (stored) setLiveActions(JSON.parse(stored));
    } catch { /* empty */ }

    // If no stored actions, use defaults
    setLiveActions((prev) => prev.length > 0 ? prev : getDefaultActions());
    setMounted(true);
  }, []);

  if (!mounted || !team) return null;

  const agents: AgentSprite[] = [
    { name: "Brandon", emoji: "👑", color: "bg-amber-500", status: "active", task: "Directing operations", position: "desk" },
    { name: "George", emoji: "🦾", color: "bg-indigo-500", status: "active", task: "Managing the team", position: "desk" },
    ...Object.values(team.org.divisions).flatMap((div) =>
      div.members.map((m) => ({
        name: m.name,
        emoji: m.emoji,
        color: getColor(m.name),
        status: m.status as "active" | "coming_soon",
        task: m.currentTask || getDefaultTask(m.name),
        position: "desk" as const,
      }))
    ),
  ];

  const activeAgents = agents.filter((a) => a.status === "active");
  const lastStandup = standups.length > 0 ? standups[standups.length - 1] : null;

  return (
    <div className="flex gap-4 max-w-7xl mx-auto">
      {/* Office Floor Plan */}
      <div className="flex-1">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">🏢 The Office</h2>
          <p className="text-sm text-[#8b8fa3] mt-1">{activeAgents.length} agents online</p>
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

          <div className="p-6 relative z-10">
            {/* Row 1: Brandon's office (left) + empty desks + George's office (right) */}
            <div className="flex justify-between items-start mb-10">
              <div className="bg-[#141620]/80 border border-[#2e3345] rounded-lg p-4">
                <div className="text-[8px] text-amber-400/60 uppercase tracking-widest mb-2">Director</div>
                <Desk agent={agents[0]} />
              </div>

              {/* Middle desks row 1 */}
              <div className="flex gap-8">
                {agents.slice(2, 4).map((a) => (
                  <Desk key={a.name} agent={a} />
                ))}
              </div>

              <div className="bg-[#141620]/80 border border-indigo-500/20 rounded-lg p-4">
                <div className="text-[8px] text-indigo-400/60 uppercase tracking-widest mb-2">Chief of Staff</div>
                <Desk agent={agents[1]} />
              </div>
            </div>

            {/* Row 2: More desks */}
            <div className="flex justify-center gap-8 mb-10">
              {agents.slice(4).map((a) => (
                <Desk key={a.name} agent={a} />
              ))}
            </div>

            {/* Meeting Table (center) */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {/* Agents around the table */}
                <div className="flex justify-center gap-3 mb-2">
                  {activeAgents.slice(0, Math.ceil(activeAgents.length / 2)).map((a) => (
                    <Sprite key={a.name} color={a.color} emoji={a.emoji} name={a.name} active size="sm" />
                  ))}
                </div>

                {/* The table itself */}
                <div className="bg-[#3a3d4a] rounded-[50%] border-2 border-[#4a4d5a] px-16 py-6 shadow-xl flex flex-col items-center">
                  <span className="text-[10px] text-[#8b8fa3] uppercase tracking-wider">Meeting Table</span>
                  <span className="text-[8px] text-[#6b6f83] mt-0.5">
                    {lastStandup ? `Last: ${lastStandup.type} standup` : "Standups: 7:45a · 12p · 5:30p"}
                  </span>
                </div>

                {/* Bottom row of agents */}
                <div className="flex justify-center gap-3 mt-2">
                  {activeAgents.slice(Math.ceil(activeAgents.length / 2)).map((a) => (
                    <Sprite key={a.name} color={a.color} emoji={a.emoji} name={a.name} active size="sm" />
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom: Communal areas */}
            <div className="flex justify-between items-end">
              {/* Water Station */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-16 bg-gradient-to-b from-cyan-400/40 to-cyan-400/10 rounded-t-lg border border-cyan-400/30 flex flex-col items-center justify-end pb-1">
                  <div className="w-4 h-2 bg-cyan-400/40 rounded" />
                </div>
                <div className="w-10 h-2 bg-[#2e3345] rounded-b" />
                <span className="text-[8px] text-cyan-400/60 mt-1">💧 Water</span>
              </div>

              {/* Coffee Station */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-8 bg-[#3a2a1a] rounded border border-[#5a4a3a] flex items-center justify-center">
                  <span className="text-sm">☕</span>
                </div>
                <div className="w-12 h-2 bg-[#2e3345] rounded-b" />
                <span className="text-[8px] text-amber-400/60 mt-1">☕ Coffee</span>
              </div>

              {/* Break Room */}
              <div className="bg-[#141620]/80 border border-[#2e3345] rounded-lg p-3 flex flex-col items-center">
                <span className="text-lg">🍿</span>
                <span className="text-[8px] text-[#8b8fa3] mt-1">Break Room</span>
                <div className="flex gap-1 mt-1">
                  <div className="w-3 h-3 rounded bg-red-500/20 text-[6px] flex items-center justify-center">🍕</div>
                  <div className="w-3 h-3 rounded bg-amber-500/20 text-[6px] flex items-center justify-center">🍪</div>
                  <div className="w-3 h-3 rounded bg-green-500/20 text-[6px] flex items-center justify-center">🍎</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-3 text-xs text-[#8b8fa3] justify-center">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Online</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2e3345]" /> Coming Soon</span>
          <span>Standups: 7:45 AM · 12:00 PM · 5:30 PM</span>
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

function getColor(name: string): string {
  const colors: Record<string, string> = {
    Dwight: "bg-purple-500",
    Kelly: "bg-pink-500",
    Rachel: "bg-blue-400",
    John: "bg-emerald-500",
    Ross: "bg-orange-500",
    Pam: "bg-rose-400",
  };
  return colors[name] || "bg-gray-500";
}

function getDefaultTask(name: string): string {
  const tasks: Record<string, string> = {
    Dwight: "Research sweep",
    Kelly: "Drafting tweets",
    Rachel: "LinkedIn content",
    John: "Market analysis",
    Ross: "Code review",
    Pam: "Calendar mgmt",
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
    { id: "4", agent: "Rachel", agentEmoji: "💼", action: "Drafting LinkedIn posts", time: fmt(35), color: "#60a5fa" },
    { id: "5", agent: "John", agentEmoji: "📈", action: "Reviewing market conditions", time: fmt(45), color: "#10b981" },
    { id: "6", agent: "George", agentEmoji: "🦾", action: "Deployed Mission Control V2", time: fmt(60), color: "#6366f1" },
  ];
}
