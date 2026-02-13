"use client";

import { useState, useEffect } from "react";
import { CouncilDecision, CouncilData } from "@/lib/types";

export default function CouncilTab() {
  const [data, setData] = useState<CouncilData>({ decisions: [] });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetch("/data/council.json")
      .then((r) => r.json())
      .then((d: CouncilData) => setData(d))
      .catch(() => {});
    setMounted(true);
  }, []);

  const pending = data.decisions.filter((d) => d.outcome === "pending");
  const resolved = data.decisions.filter((d) => d.outcome !== "pending");

  const voteColor = (v: string) => {
    if (v === "for") return "text-emerald-400 bg-emerald-500/20";
    if (v === "against") return "text-red-400 bg-red-500/20";
    return "text-[#8b8fa3] bg-[#242836]";
  };

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">🏛️ Council</h2>
        <p className="text-sm text-[#8b8fa3] mt-1">Team votes on major autonomous decisions. George breaks ties.</p>
      </div>

      {data.decisions.length === 0 ? (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
          No council decisions yet — the team is getting started.
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">Active Votes ({pending.length})</h3>
              <div className="space-y-3">
                {pending.map((d) => (
                  <DecisionCard key={d.id} decision={d} expanded={expanded === d.id} onToggle={() => setExpanded(expanded === d.id ? null : d.id)} voteColor={voteColor} />
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3">Past Decisions ({resolved.length})</h3>
              <div className="space-y-3">
                {resolved.map((d) => (
                  <DecisionCard key={d.id} decision={d} expanded={expanded === d.id} onToggle={() => setExpanded(expanded === d.id ? null : d.id)} voteColor={voteColor} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DecisionCard({ decision: d, expanded, onToggle, voteColor }: { decision: CouncilDecision; expanded: boolean; onToggle: () => void; voteColor: (v: string) => string }) {
  const forCount = d.votes.filter((v) => v.vote === "for").length;
  const againstCount = d.votes.filter((v) => v.vote === "against").length;

  return (
    <div className={`bg-[#1a1d27] border rounded-xl transition-colors cursor-pointer ${
      d.outcome === "pending" ? "border-amber-500/30" : d.outcome === "approved" ? "border-emerald-500/20" : "border-red-500/20"
    }`} onClick={onToggle}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-[#e4e6ed] mb-1">{d.title}</h4>
            <p className="text-sm text-[#8b8fa3]">{d.description}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
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

        {/* Vote chips always visible */}
        <div className="flex gap-2 mt-3">
          {d.votes.map((v) => (
            <span key={v.member} className={`text-xs px-2 py-1 rounded-lg ${voteColor(v.vote)}`}>
              {v.emoji} {v.member}
            </span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-[#2e3345]">
          <div className="mt-3">
            <p className="text-xs text-[#8b8fa3] uppercase tracking-wider mb-1">Context</p>
            <p className="text-sm text-[#c4c7d4]">{d.context}</p>
          </div>
          <p className="text-xs text-[#8b8fa3] mt-3">{d.date}</p>
        </div>
      )}
    </div>
  );
}
