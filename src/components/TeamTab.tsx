"use client";

import { useState, useEffect } from "react";
import { TeamData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

export default function TeamTab() {
  const [data, setData] = useState<TeamData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchData<TeamData>("team.json").then(setData).catch(() => {});
    setMounted(true);
  }, []);

  if (!mounted || !data) return null;

  const { director, chiefOfStaff, divisions } = data.org;

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-8">👥 Team</h2>

      {/* Director */}
      <div className="flex justify-center mb-4">
        <PersonCard name={director.name} title={director.title} emoji={director.emoji} status="active" highlight="gold" />
      </div>

      {/* Connector line */}
      <div className="flex justify-center mb-4">
        <div className="w-px h-8 bg-[#2e3345]" />
      </div>

      {/* Chief of Staff */}
      <div className="flex justify-center mb-4">
        <PersonCard name={chiefOfStaff.name} title={chiefOfStaff.title} emoji={chiefOfStaff.emoji} status="active" highlight="indigo" model="Opus 4.6" />
      </div>

      {/* Connector lines */}
      <div className="flex justify-center mb-4">
        <div className="w-px h-8 bg-[#2e3345]" />
      </div>
      <div className="flex justify-center mb-4">
        <div className="w-3/4 h-px bg-[#2e3345]" />
      </div>

      {/* Divisions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(divisions).map(([key, div]) => (
          <div key={key} className="flex flex-col items-center gap-2">
            {/* Connector */}
            <div className="w-px h-4 bg-[#2e3345]" />

            {/* Division label */}
            <div className="text-[10px] text-[#8b8fa3] uppercase tracking-wider text-center font-semibold">
              {div.name}
            </div>

            {/* Members */}
            {div.members.map((m) => (
              <PersonCard
                key={m.name}
                name={m.name}
                title={m.title}
                emoji={m.emoji}
                status={m.status}
                model={m.model}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonCard({ name, title, emoji, status, model, highlight }: {
  name: string;
  title: string;
  emoji: string;
  status: "active" | "coming_soon";
  model?: string;
  highlight?: "gold" | "indigo";
}) {
  const borderColor = status === "coming_soon"
    ? "border-[#2e3345] opacity-50"
    : highlight === "gold"
    ? "border-amber-500/40"
    : highlight === "indigo"
    ? "border-indigo-500/40"
    : "border-[#2e3345]";

  return (
    <div className={`bg-[#1a1d27] border ${borderColor} rounded-xl p-4 text-center min-w-[140px] relative`}>
      {status === "active" && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400" />
      )}
      <div className="text-3xl mb-2">{emoji}</div>
      <h4 className="text-sm font-semibold text-[#e4e6ed]">{name}</h4>
      <p className="text-[10px] text-[#8b8fa3] mt-0.5">{title}</p>
      {model && (
        <p className="text-[10px] mt-1.5 px-2 py-0.5 rounded-full bg-[#242836] text-indigo-400/80 inline-block">
          🤖 {model}
        </p>
      )}
      {status === "coming_soon" && (
        <p className="text-[10px] text-[#8b8fa3] mt-1 italic">Coming Soon</p>
      )}
    </div>
  );
}
