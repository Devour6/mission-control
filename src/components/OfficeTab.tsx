"use client";

import { useState, useEffect } from "react";
import { TeamData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";
import PriceWidget from "./PriceWidget";

// --- Types ---
interface LiveAction {
  id: string;
  agent: string;
  agentEmoji: string;
  action: string;
  time: string;
  timestamp?: string; // ISO 8601 — used for accurate health status
  color: string;
}

interface TeamMember {
  name: string;
  emoji: string;
  title: string;
  status: "active" | "coming_soon";
}

// --- Health Status Helper ---
function getHealthStatus(timeStr: string, timestamp?: string): "green" | "yellow" | "red" {
  try {
    let actionTime: Date;

    // Prefer ISO timestamp if available (includes date)
    if (timestamp) {
      actionTime = new Date(timestamp);
      if (isNaN(actionTime.getTime())) return "red";
    } else {
      // Fallback: parse "11:56 AM" format (assumes today — may be inaccurate)
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return "red";

      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();

      let h24 = hours;
      if (period === "PM" && h24 !== 12) h24 += 12;
      if (period === "AM" && h24 === 12) h24 = 0;

      actionTime = new Date();
      actionTime.setHours(h24, minutes, 0, 0);

      // If computed time is in the future, it was probably yesterday
      if (actionTime.getTime() > Date.now()) {
        actionTime.setDate(actionTime.getDate() - 1);
      }
    }

    const now = new Date();
    const diffHours = (now.getTime() - actionTime.getTime()) / (1000 * 60 * 60);

    if (diffHours < 4) return "green";
    if (diffHours < 12) return "yellow";
    return "red";
  } catch {
    return "red";
  }
}

function getHealthLabel(status: "green" | "yellow" | "red"): string {
  if (status === "green") return "Active";
  if (status === "yellow") return "Idle";
  return "Offline";
}

const healthDotColor: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

// --- Agent Card ---
function AgentCard({
  member,
  action,
}: {
  member: TeamMember;
  action: LiveAction | undefined;
}) {
  const health = action ? getHealthStatus(action.time, action.timestamp) : "red";
  const borderColor = action?.color || "#6b7280";

  return (
    <div
      className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden hover:border-[#3e4355] transition-colors"
      style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
    >
      <div className="p-4">
        {/* Header: emoji + name + health */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{member.emoji}</span>
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: borderColor }}
              >
                {member.name}
              </h3>
              <p className="text-[11px] text-[#8b8fa3]">{member.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${healthDotColor[health]}`}
            />
            <span className="text-[10px] text-[#8b8fa3]">
              {getHealthLabel(health)}
            </span>
          </div>
        </div>

        {/* Current action */}
        <div className="mt-3 bg-[#141620] rounded-lg px-3 py-2">
          <p className="text-xs text-[#e4e6ed]">
            {action?.action || "No recent activity"}
          </p>
          {action?.time && (
            <p className="text-[10px] text-[#8b8fa3] mt-1">
              Last update: {action.time}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main ---
export default function OfficeTab() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [liveActions, setLiveActions] = useState<LiveAction[]>([]);
  const [mounted, setMounted] = useState(false);

  // Initial load
  useEffect(() => {
    Promise.all([
      fetchData<TeamData>("team.json"),
      fetchData<LiveAction[]>("live-actions.json").catch(() => []),
    ]).then(([t, la]) => {
      setTeam(t);
      setLiveActions(la);
    });
    setMounted(true);
  }, []);

  // Poll live actions every 15s
  useEffect(() => {
    const poll = setInterval(() => {
      fetchData<LiveAction[]>("live-actions.json")
        .then(setLiveActions)
        .catch(() => {});
    }, 15000);
    return () => clearInterval(poll);
  }, []);

  if (!mounted || !team) return null;

  // Build member list: George + all division members
  const members: TeamMember[] = [
    { name: "George", emoji: "🦾", title: "Chief of Staff", status: "active" },
  ];
  Object.values(team.org.divisions).forEach((div) => {
    div.members.forEach((m) => {
      members.push({
        name: m.name,
        emoji: m.emoji,
        title: m.title,
        status: m.status as "active" | "coming_soon",
      });
    });
  });

  const activeMembers = members.filter((m) => m.status === "active");
  const actionMap = new Map(liveActions.map((a) => [a.agent, a]));
  const onlineCount = liveActions.filter(
    (a) => getHealthStatus(a.time, a.timestamp) === "green"
  ).length;

  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-7xl mx-auto">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="mb-5">
          <h2 className="text-xl md:text-2xl font-bold">🏢 The Office</h2>
          <p className="text-xs md:text-sm text-[#8b8fa3] mt-1">
            {onlineCount} of {activeMembers.length} agents active
          </p>
        </div>

        {/* Agent cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeMembers.map((member) => (
            <AgentCard
              key={member.name}
              member={member}
              action={actionMap.get(member.name)}
            />
          ))}
        </div>
      </div>

      {/* Right Sidebar — Price Widget + Live Actions */}
      <div className="w-full xl:w-64 shrink-0">
        <div className="space-y-6">
          {/* Price Widget */}
          <div className="xl:sticky xl:top-8">
            <PriceWidget />
          </div>

          {/* Live Actions Feed */}
          <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden xl:sticky xl:top-[calc(2rem+280px)]">
            <div className="px-3 py-2.5 border-b border-[#2e3345] flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <h3 className="text-xs font-semibold text-[#e4e6ed]">
                Live Actions
              </h3>
            </div>
            <div className="max-h-[250px] xl:max-h-[500px] overflow-y-auto">
              {liveActions.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#8b8fa3]">
                  No recent activity
                </div>
              ) : (
                <div className="divide-y divide-[#2e3345]">
                  {liveActions.map((a) => {
                    const health = getHealthStatus(a.time, a.timestamp);
                    return (
                      <div
                        key={a.id}
                        className="px-3 py-2.5 hover:bg-[#242836] transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm mt-0.5">{a.agentEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-[#e4e6ed] break-words">
                                <span
                                  className="font-semibold"
                                  style={{ color: a.color }}
                                >
                                  {a.agent}
                                </span>
                                {" — "}
                                {a.action}
                              </p>
                              <div
                                className={`w-2 h-2 rounded-full ${healthDotColor[health]} shrink-0`}
                                title={
                                  health === "green"
                                    ? "Active (< 4h)"
                                    : health === "yellow"
                                    ? "Stale (4-12h)"
                                    : "Offline (> 12h)"
                                }
                              />
                            </div>
                            <p className="text-[10px] text-[#8b8fa3] mt-0.5">
                              {a.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
