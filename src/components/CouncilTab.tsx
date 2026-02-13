"use client";

import { useState, useEffect } from "react";
import { CouncilDecision, CouncilData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

interface StandupDiscussion {
  agent: string;
  emoji: string;
  said: string;
}

interface StandupOutcome {
  id: string;
  date: string;
  type: "morning" | "midday" | "evening";
  summary: string;
  discussion: StandupDiscussion[];
  keyDecisions: string[];
  improvements: string[];
  actionItems: string[];
}

interface OutcomesData {
  decisions: CouncilDecision[];
  standups: StandupOutcome[];
}

export default function CouncilTab() {
  const [data, setData] = useState<OutcomesData>({ decisions: [], standups: [] });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "decisions" | "standups">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchData<CouncilData>("council.json").catch(() => ({ decisions: [] })),
      fetchData<StandupOutcome[]>("outcomes-standups.json").catch(() => []),
    ]).then(([council, standups]: [CouncilData, StandupOutcome[]]) => {
      setData({ decisions: council.decisions, standups });
    });
    setMounted(true);
  }, []);

  const pending = data.decisions.filter(d => d.outcome === "pending");
  const resolved = data.decisions.filter(d => d.outcome !== "pending");

  const voteColor = (v: string) => {
    if (v === "for") return "text-emerald-400 bg-emerald-500/20";
    if (v === "against") return "text-red-400 bg-red-500/20";
    return "text-[#8b8fa3] bg-[#242836]";
  };

  const standupIcon = (type: string) => {
    if (type === "morning") return "🌅";
    if (type === "midday") return "☀️";
    return "🌙";
  };

  if (!mounted) return null;

  const showDecisions = filter === "all" || filter === "decisions";
  const showStandups = filter === "all" || filter === "standups";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold">🏛️ Outcomes</h2>
        <p className="text-xs md:text-sm text-[#8b8fa3] mt-1">Standup outcomes, team decisions, and autonomous actions — everything that happened without Brandon.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "decisions", "standups"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === f ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:bg-[#242836]"}`}>
            {f === "all" ? "All" : f === "decisions" ? "Decisions" : "Standups"}
          </button>
        ))}
      </div>

      {/* Active votes */}
      {showDecisions && pending.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">Active Votes ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map(d => (
              <DecisionCard key={d.id} decision={d} expanded={expanded === d.id} onToggle={() => setExpanded(expanded === d.id ? null : d.id)} voteColor={voteColor} />
            ))}
          </div>
        </div>
      )}

      {/* Standup outcomes */}
      {showStandups && data.standups.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">Standup Outcomes ({data.standups.length})</h3>
          <div className="space-y-3">
            {data.standups.map(s => (
              <div key={s.id} className="bg-[#1a1d27] border border-[#2e3345] rounded-xl cursor-pointer transition-colors hover:border-[#3e4155]"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                <div className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-[#e4e6ed] text-sm md:text-base">
                        {standupIcon(s.type)} {s.type.charAt(0).toUpperCase() + s.type.slice(1)} Standup
                      </h4>
                      <p className="text-xs text-[#8b8fa3] mt-0.5">{s.date}</p>
                    </div>
                    <span className="text-xs text-[#8b8fa3]">{expanded === s.id ? "▾" : "▸"}</span>
                  </div>
                  <p className="text-xs md:text-sm text-[#c4c7d4] mt-2">{s.summary}</p>
                </div>

                {expanded === s.id && (
                  <div className="px-4 md:px-5 pb-4 md:pb-5 pt-0 border-t border-[#2e3345]">
                    {s.discussion && s.discussion.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-cyan-400/70 uppercase tracking-wider mb-2">Discussion</p>
                        <div className="space-y-2.5">
                          {s.discussion.map((d, i) => (
                            <div key={i} className="flex gap-2.5 items-start">
                              <span className="text-sm shrink-0 mt-0.5">{d.emoji}</span>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-[#e4e6ed]">{d.agent}</span>
                                <p className="text-xs md:text-sm text-[#9b9fb3] mt-0.5">{d.said}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.keyDecisions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-amber-400/70 uppercase tracking-wider mb-1">Key Decisions</p>
                        <ul className="space-y-1">
                          {s.keyDecisions.map((d, i) => <li key={i} className="text-xs md:text-sm text-[#c4c7d4]">• {d}</li>)}
                        </ul>
                      </div>
                    )}
                    {s.improvements.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Improvements Identified</p>
                        <ul className="space-y-1">
                          {s.improvements.map((d, i) => <li key={i} className="text-xs md:text-sm text-[#c4c7d4]">• {d}</li>)}
                        </ul>
                      </div>
                    )}
                    {s.actionItems.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-indigo-400/70 uppercase tracking-wider mb-1">Action Items</p>
                        <ul className="space-y-1">
                          {s.actionItems.map((d, i) => <li key={i} className="text-xs md:text-sm text-[#c4c7d4]">• {d}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past decisions */}
      {showDecisions && resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3">Past Decisions ({resolved.length})</h3>
          <div className="space-y-3">
            {resolved.map(d => (
              <DecisionCard key={d.id} decision={d} expanded={expanded === d.id} onToggle={() => setExpanded(expanded === d.id ? null : d.id)} voteColor={voteColor} />
            ))}
          </div>
        </div>
      )}

      {data.decisions.length === 0 && data.standups.length === 0 && (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
          No outcomes yet — the team is getting started.
        </div>
      )}
    </div>
  );
}

function DecisionCard({ decision: d, expanded, onToggle, voteColor }: { decision: CouncilDecision; expanded: boolean; onToggle: () => void; voteColor: (v: string) => string }) {
  const forCount = d.votes.filter(v => v.vote === "for").length;
  const againstCount = d.votes.filter(v => v.vote === "against").length;

  return (
    <div className={`bg-[#1a1d27] border rounded-xl transition-colors cursor-pointer ${
      d.outcome === "pending" ? "border-amber-500/30" : d.outcome === "approved" ? "border-emerald-500/20" : "border-red-500/20"
    }`} onClick={onToggle}>
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-[#e4e6ed] text-sm md:text-base mb-1">{d.title}</h4>
            <p className="text-xs md:text-sm text-[#8b8fa3]">{d.description}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {d.outcome !== "pending" && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                d.outcome === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}>
                {d.outcome} {forCount}-{againstCount}
              </span>
            )}
            {d.georgeOverride && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">🦾 tiebreak</span>
            )}
            <span className="text-xs text-[#8b8fa3]">{expanded ? "▾" : "▸"}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {d.votes.map(v => (
            <span key={v.member} className={`text-xs px-2 py-1 rounded-lg ${voteColor(v.vote)}`}>
              {v.emoji} {v.member}
            </span>
          ))}
        </div>
      </div>
      {expanded && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 pt-0 border-t border-[#2e3345]">
          <div className="mt-3">
            <p className="text-xs text-[#8b8fa3] uppercase tracking-wider mb-1">Context</p>
            <p className="text-xs md:text-sm text-[#c4c7d4]">{d.context}</p>
          </div>
          <p className="text-xs text-[#8b8fa3] mt-3">{d.date}</p>
        </div>
      )}
    </div>
  );
}
