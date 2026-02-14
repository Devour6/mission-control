"use client";

import { useState, useEffect } from "react";
import { TeamData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";
import AgentWorkflowView from "./AgentWorkflowView";

export default function TeamTab() {
  const [data, setData] = useState<TeamData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    fetchData<TeamData>("team.json").then(setData).catch(() => {});
    setMounted(true);
  }, []);

  if (!mounted || !data?.org) return <div className="text-[#8b8fa3] p-8">Loading team…</div>;

  const { director, chiefOfStaff, divisions } = data.org;

  // Show agent workflow view if an agent is selected
  if (selectedAgent) {
    return (
      <AgentWorkflowView 
        agentName={selectedAgent} 
        onBack={() => setSelectedAgent(null)} 
      />
    );
  }

  // Show team overview
  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-8">👥 Team</h2>

      {/* Director */}
      <div className="flex justify-center mb-4">
        <PersonCard 
          name={director.name} 
          title={director.title} 
          emoji={director.emoji} 
          status="active" 
          highlight="gold" 
          onClick={() => {/* Brandon doesn't have a workflow */}}
        />
      </div>

      {/* Connector line */}
      <div className="flex justify-center mb-4">
        <div className="w-px h-8 bg-[#2e3345]" />
      </div>

      {/* Chief of Staff */}
      <div className="flex justify-center mb-4">
        <PersonCard 
          name={chiefOfStaff.name} 
          title={chiefOfStaff.title} 
          emoji={chiefOfStaff.emoji} 
          status="active" 
          highlight="indigo" 
          model="Opus 4.6" 
          onClick={() => setSelectedAgent(chiefOfStaff.name)}
        />
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
                status={m.status === "coming_soon" ? "coming_soon" : "active"}
                model={m.model}
                onClick={m.status === "active" ? () => setSelectedAgent(m.name) : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonCard({ name, title, emoji, status, model, highlight, onClick }: {
  name: string;
  title: string;
  emoji: string;
  status: "active" | "coming_soon";
  model?: string;
  highlight?: "gold" | "indigo";
  onClick?: () => void;
}) {
  const borderColor = status === "coming_soon"
    ? "border-[#2e3345] opacity-50"
    : highlight === "gold"
    ? "border-amber-500/40"
    : highlight === "indigo"
    ? "border-indigo-500/40"
    : "border-[#2e3345]";

  const isClickable = onClick && status === "active";

  return (
    <div 
      className={`bg-[#1a1d27] border ${borderColor} rounded-xl p-4 text-center min-w-[140px] relative transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:scale-105 hover:border-indigo-400/60 hover:bg-[#1e2130]' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
    >
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
      {isClickable && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
          <span className="text-[8px] text-indigo-400/60">📋 View Workflow</span>
        </div>
      )}
    </div>
  );
}
