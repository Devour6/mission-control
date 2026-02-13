"use client";

import { useState, useEffect } from "react";
import { TeamData, StandupEntry } from "@/lib/types";

interface DeskInfo {
  name: string;
  emoji: string;
  title: string;
  status: "active" | "coming_soon";
  task?: string;
}

export default function OfficeTab() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [standups, setStandups] = useState<StandupEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/team.json").then((r) => r.json()),
      fetch("/data/standups.json").then((r) => r.json()),
    ]).then(([t, s]) => {
      setTeam(t);
      setStandups(s);
    }).catch(() => {});
    setMounted(true);
  }, []);

  if (!mounted || !team) return null;

  // Build desk list from team data
  const desks: DeskInfo[] = [
    { name: team.org.director.name, emoji: team.org.director.emoji, title: team.org.director.title, status: "active", task: "Directing operations" },
    { name: team.org.chiefOfStaff.name, emoji: team.org.chiefOfStaff.emoji, title: team.org.chiefOfStaff.title, status: "active", task: "Managing the team" },
  ];
  Object.values(team.org.divisions).forEach((div) => {
    div.members.forEach((m) => {
      desks.push({ name: m.name, emoji: m.emoji, title: m.title, status: m.status, task: m.currentTask });
    });
  });

  const lastStandup = standups.length > 0 ? standups[standups.length - 1] : null;

  // Standup schedule
  const standupTimes = ["7:45 AM", "12:00 PM", "5:30 PM"];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">🏢 The Office</h2>
        <p className="text-sm text-[#8b8fa3] mt-1">Bird&apos;s-eye view • {desks.filter((d) => d.status === "active").length} active agents</p>
      </div>

      {/* Office floor plan */}
      <div className="bg-[#0a0c10] border border-[#2e3345] rounded-2xl p-8 relative overflow-hidden">
        {/* Floor texture */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, #2e3345 40px, #2e3345 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, #2e3345 40px, #2e3345 41px)" }} />

        <div className="relative z-10">
          {/* Top row: Brandon's office + Meeting Table */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            {/* Brandon's corner office */}
            <div className="col-span-3">
              <OfficeRoom label="Director&apos;s Office">
                <Desk {...desks[0]} />
              </OfficeRoom>
            </div>

            {/* Large Meeting Table */}
            <div className="col-span-6">
              <div className="bg-[#141620] border border-[#2e3345] rounded-xl p-4 h-full">
                <div className="text-[10px] text-[#8b8fa3] uppercase tracking-wider mb-3 text-center">Meeting Table — Daily Standups</div>
                <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-6 mx-auto max-w-sm">
                  <div className="flex justify-around mb-3">
                    {desks.filter((d) => d.status === "active").slice(0, 4).map((d) => (
                      <span key={d.name} className="text-xl" title={d.name}>{d.emoji}</span>
                    ))}
                  </div>
                  <div className="w-full h-px bg-[#2e3345] my-2" />
                  <div className="flex justify-around">
                    {desks.filter((d) => d.status === "active").slice(4).map((d) => (
                      <span key={d.name} className="text-xl" title={d.name}>{d.emoji}</span>
                    ))}
                  </div>
                </div>
                <div className="text-center mt-3">
                  <div className="flex justify-center gap-3 text-[10px] text-[#8b8fa3]">
                    {standupTimes.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-[#242836]">🕐 {t}</span>
                    ))}
                  </div>
                  {lastStandup && (
                    <p className="text-[10px] text-[#8b8fa3] mt-2">Last: {lastStandup.type} standup — {lastStandup.date}</p>
                  )}
                </div>
              </div>
            </div>

            {/* George's desk */}
            <div className="col-span-3">
              <OfficeRoom label="Chief of Staff">
                <Desk {...desks[1]} />
              </OfficeRoom>
            </div>
          </div>

          {/* Middle row: Agent desks */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            {desks.slice(2).map((d) => (
              <div key={d.name} className="col-span-3">
                <Desk {...d} />
              </div>
            ))}
          </div>

          {/* Bottom row: Communal areas */}
          <div className="grid grid-cols-3 gap-4">
            <CommunalArea emoji="💧" label="Water Station" detail="Stay hydrated" />
            <CommunalArea emoji="☕" label="Coffee Station" detail="Fuel for the grind" />
            <CommunalArea emoji="🍿" label="Break Room" detail="Snacks & decompression" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-xs text-[#8b8fa3] justify-center">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Active</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2e3345]" /> Coming Soon</span>
        <span>Standups: 3x daily (Morning • Midday • Evening)</span>
      </div>
    </div>
  );
}

function OfficeRoom({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141620] border border-[#2e3345] rounded-xl p-4 h-full">
      <div className="text-[10px] text-[#8b8fa3] uppercase tracking-wider mb-2">{label}</div>
      {children}
    </div>
  );
}

function Desk({ name, emoji, title, status, task }: DeskInfo) {
  const isActive = status === "active";

  return (
    <div className={`bg-[#1a1d27] border rounded-xl p-4 relative transition-all ${
      isActive ? "border-[#2e3345] hover:border-indigo-500/30" : "border-[#2e3345] opacity-40"
    }`}>
      {/* Status dot */}
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-[#2e3345]"}`} />

      {/* Monitor */}
      <div className="flex justify-center mb-2">
        <div className={`w-14 h-9 rounded border ${isActive ? "border-indigo-500/30 bg-indigo-500/5" : "border-[#2e3345] bg-[#0a0c10]"} flex items-center justify-center`}>
          <span className="text-lg">{emoji}</span>
        </div>
      </div>

      {/* Desk surface */}
      <div className="bg-[#242836] rounded-lg px-3 py-2 text-center">
        <p className="text-sm font-semibold text-[#e4e6ed]">{name}</p>
        <p className="text-[10px] text-[#8b8fa3]">{title}</p>
      </div>

      {/* Current task */}
      {task && isActive && (
        <div className="mt-2 text-[10px] text-[#8b8fa3] text-center truncate px-1" title={task}>
          💭 {task}
        </div>
      )}
      {!isActive && (
        <div className="mt-2 text-[10px] text-[#8b8fa3] text-center italic">Coming Soon</div>
      )}
    </div>
  );
}

function CommunalArea({ emoji, label, detail }: { emoji: string; label: string; detail: string }) {
  return (
    <div className="bg-[#141620] border border-[#2e3345] rounded-xl p-4 text-center">
      <span className="text-2xl">{emoji}</span>
      <p className="text-sm font-medium text-[#e4e6ed] mt-2">{label}</p>
      <p className="text-[10px] text-[#8b8fa3]">{detail}</p>
    </div>
  );
}
