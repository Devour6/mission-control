"use client";

import { useState, useEffect, useMemo } from "react";
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
  time?: string;
  type: string;
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
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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

  // Sort and filter data
  const filteredData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filterByDate = (item: { date: string }) => {
      const itemDate = new Date(item.date);
      
      if (dateFilter === "today") return itemDate >= today;
      if (dateFilter === "week") return itemDate >= weekAgo;
      if (dateFilter === "month") return itemDate >= monthAgo;
      
      // Custom date range
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include end date
        return itemDate >= start && itemDate <= end;
      }
      if (startDate) {
        const start = new Date(startDate);
        return itemDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return itemDate <= end;
      }
      
      return true;
    };

    // Sort standups by date descending (newest first)
    const sortedStandups = [...data.standups]
      .filter(filterByDate)
      .sort((a, b) => {
        const dateA = new Date(a.date + (a.time ? ` ${a.time}` : ''));
        const dateB = new Date(b.date + (b.time ? ` ${b.time}` : ''));
        return dateB.getTime() - dateA.getTime();
      });

    // Sort decisions by date descending (newest first)
    const sortedDecisions = [...data.decisions]
      .filter(filterByDate)
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

    return {
      standups: sortedStandups,
      decisions: sortedDecisions
    };
  }, [data, dateFilter, startDate, endDate]);

  const pending = filteredData.decisions.filter(d => d.outcome === "pending");
  const resolved = filteredData.decisions.filter(d => d.outcome !== "pending");

  const voteColor = (v: string) => {
    if (v === "for") return "text-emerald-400 bg-emerald-500/20";
    if (v === "against") return "text-red-400 bg-red-500/20";
    return "text-[#8b8fa3] bg-[#242836]";
  };

  const standupIcon = (type: string) => {
    if (type === "early-morning") return "🌅";
    if (type === "morning") return "🌄";
    if (type === "midday") return "☀️";
    if (type === "afternoon") return "🌤️";
    if (type === "evening") return "🌙";
    if (type === "latenight") return "🌚";
    return "📋";
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
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "decisions", "standups"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors min-h-[44px] ${filter === f ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:bg-[#242836]"}`}>
            {f === "all" ? "All" : f === "decisions" ? "Decisions" : "Standups"}
          </button>
        ))}
      </div>

      {/* Date filtering */}
      <div className="mb-6 p-4 bg-[#1a1d27] border border-[#2e3345] rounded-xl">
        <h3 className="text-sm font-semibold text-[#e4e6ed] mb-3">📅 Date Filter</h3>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {(["all", "today", "week", "month"] as const).map(f => (
            <button key={f} onClick={() => setDateFilter(f)}
              className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${dateFilter === f ? "bg-cyan-500/20 text-cyan-400" : "text-[#8b8fa3] hover:bg-[#242836]"}`}>
              {f === "all" ? "All Time" : f === "today" ? "Today" : f === "week" ? "Past Week" : "Past Month"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8b8fa3]">From:</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-xs bg-[#242836] border border-[#2e3345] rounded text-[#e4e6ed] focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8b8fa3]">To:</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-xs bg-[#242836] border border-[#2e3345] rounded text-[#e4e6ed] focus:border-cyan-500 focus:outline-none"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(""); setEndDate(""); setDateFilter("all"); }}
              className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
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
      {showStandups && filteredData.standups.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">
            Standup Outcomes ({filteredData.standups.length}) 
            <span className="text-xs text-[#8b8fa3] ml-2">newest first</span>
          </h3>
          <div className="space-y-3">
            {filteredData.standups.map(s => (
              <div key={s.id} className="bg-[#1a1d27] border border-[#2e3345] rounded-xl cursor-pointer transition-colors hover:border-[#3e4155]"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                <div className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-[#e4e6ed] text-sm md:text-base">
                        {standupIcon(s.type)} {s.type.charAt(0).toUpperCase() + s.type.slice(1)} Standup
                      </h4>
                      <p className="text-xs text-[#8b8fa3] mt-0.5">{s.date}{s.time ? ` · ${s.time}` : ""}</p>
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
                              {d.emoji && <span className="text-sm shrink-0 mt-0.5">{d.emoji}</span>}
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
                          {s.actionItems.map((d: unknown, i: number) => {
                            if (typeof d === "string") return <li key={i} className="text-xs md:text-sm text-[#c4c7d4]">• {d}</li>;
                            const item = d as { task?: string; agent?: string; status?: string };
                            return <li key={i} className="text-xs md:text-sm text-[#c4c7d4]">• {item.task || "Unknown"}{item.agent ? ` → ${item.agent}` : ""}{item.status ? ` (${item.status})` : ""}</li>;
                          })}
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
          <h3 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3">
            Past Decisions ({resolved.length})
            <span className="text-xs text-[#8b8fa3] ml-2">newest first</span>
          </h3>
          <div className="space-y-3">
            {resolved.map(d => (
              <DecisionCard key={d.id} decision={d} expanded={expanded === d.id} onToggle={() => setExpanded(expanded === d.id ? null : d.id)} voteColor={voteColor} />
            ))}
          </div>
        </div>
      )}

      {filteredData.decisions.length === 0 && filteredData.standups.length === 0 && (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
          {dateFilter !== "all" || startDate || endDate ? (
            <>No outcomes found for the selected date range.</>
          ) : (
            <>No outcomes yet — the team is getting started.</>
          )}
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