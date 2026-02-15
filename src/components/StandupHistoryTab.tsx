"use client";

import { useState, useEffect, useMemo } from "react";
import { CouncilDecision, CouncilData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

interface StandupDiscussion {
  agent: string;
  said: string;
  emoji?: string;
}

interface StandupActionItem {
  task?: string;
  agent?: string;
  status?: string;
}

interface StandupOutcome {
  id: string;
  date: string;
  time: string;
  type: string;
  summary: string;
  discussion: StandupDiscussion[];
  keyDecisions: string[];
  improvements: string[];
  actionItems: (string | StandupActionItem)[];
}

interface CombinedData {
  standups: StandupOutcome[];
  decisions: CouncilDecision[];
}

export default function StandupHistoryTab() {
  const [data, setData] = useState<CombinedData>({ standups: [], decisions: [] });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"standups">("standups");
  const [view, setView] = useState<"standups" | "outcomes">("standups");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch both standups and council decisions
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [standups, council] = await Promise.all([
          fetchData<StandupOutcome[]>("outcomes-standups.json").catch(() => []),
          fetchData<CouncilData>("council.json").catch(() => ({ decisions: [] })),
        ]);
        setData({ standups, decisions: council.decisions });
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    setMounted(true);
  }, []);

  const standupIcon = (type: string) => {
    if (type === "early-morning") return "🌅";
    if (type === "morning") return "🌄";
    if (type === "midday") return "☀️";
    if (type === "afternoon") return "🌤️";
    if (type === "evening") return "🌙";
    if (type === "latenight") return "🌚";
    return "📋";
  };

  const getAgentEmoji = (agentName: string) => {
    if (agentName.includes("🧠") || agentName.includes("George")) return "🧠";
    if (agentName.includes("🔍") || agentName.includes("Dwight")) return "🔍";
    if (agentName.includes("🐦") || agentName.includes("Kelly")) return "🐦";
    if (agentName.includes("💼") || agentName.includes("Rachel")) return "💼";
    if (agentName.includes("📈") || agentName.includes("John")) return "📈";
    if (agentName.includes("⚙️") || agentName.includes("Ross")) return "⚙️";
    if (agentName.includes("📋") || agentName.includes("Pam")) return "📋";
    return "🤖";
  };

  const voteColor = (v: string) => {
    if (v === "for") return "text-emerald-400 bg-emerald-500/20";
    if (v === "against") return "text-red-400 bg-red-500/20";
    return "text-[#8b8fa3] bg-[#242836]";
  };

  // Filter and sort data
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
        end.setHours(23, 59, 59, 999);
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

    // Filter by search query
    const filterBySearch = (standup: StandupOutcome) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      
      return (
        standup.date.toLowerCase().includes(query) ||
        standup.time.toLowerCase().includes(query) ||
        standup.type.toLowerCase().includes(query) ||
        standup.summary.toLowerCase().includes(query) ||
        standup.discussion.some(d => 
          d.agent.toLowerCase().includes(query) || 
          d.said.toLowerCase().includes(query)
        ) ||
        standup.keyDecisions.some(d => d.toLowerCase().includes(query)) ||
        standup.improvements.some(d => d.toLowerCase().includes(query)) ||
        standup.actionItems.some(item => {
          if (typeof item === "string") return item.toLowerCase().includes(query);
          return (item.task?.toLowerCase().includes(query)) || 
                 (item.agent?.toLowerCase().includes(query)) ||
                 (item.status?.toLowerCase().includes(query));
        })
      );
    };

    const filteredStandups = data.standups
      .filter(filterByDate)
      .filter(filterBySearch)
      .sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB.getTime() - dateA.getTime();
      });

    const filteredDecisions = data.decisions
      .filter(filterByDate)
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

    return { standups: filteredStandups, decisions: filteredDecisions };
  }, [data, searchQuery, dateFilter, startDate, endDate]);

  // Categorize action items for accountability sections
  const categorizeActionItems = (actionItems: (string | StandupActionItem)[]) => {
    const completed: (string | StandupActionItem)[] = [];
    const started: (string | StandupActionItem)[] = [];
    const ongoing: (string | StandupActionItem)[] = [];

    actionItems.forEach(item => {
      if (typeof item === "string") {
        if (item.toLowerCase().includes("completed") || item.toLowerCase().includes("done")) {
          completed.push(item);
        } else if (item.toLowerCase().includes("started") || item.toLowerCase().includes("begin")) {
          started.push(item);
        } else {
          ongoing.push(item);
        }
      } else {
        const status = item.status?.toLowerCase() || "";
        if (status.includes("completed") || status.includes("done")) {
          completed.push(item);
        } else if (status.includes("started") || status.includes("begin") || status.includes("in progress")) {
          started.push(item);
        } else {
          ongoing.push(item);
        }
      }
    });

    return { completed, started, ongoing };
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [standups, council] = await Promise.all([
        fetchData<StandupOutcome[]>("outcomes-standups.json").catch(() => []),
        fetchData<CouncilData>("council.json").catch(() => ({ decisions: [] })),
      ]);
      setData({ standups, decisions: council.decisions });
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  const pending = filteredData.decisions.filter(d => d.outcome === "pending");
  const resolved = filteredData.decisions.filter(d => d.outcome !== "pending");
  const showStandups = true; // Always show standups
  const showDecisions = false; // Never show decisions

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">📝 Standups</h2>
            <p className="text-xs md:text-sm text-[#8b8fa3] mt-1">
              Complete history of team standups and outcomes — with accountability tracking for action items.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            )}
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-md transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={() => setView("standups")}
          className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
            view === "standups" ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:bg-[#242836]"
          }`}
        >
          Standups
        </button>
        <button 
          onClick={() => setView("outcomes")}
          className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
            view === "outcomes" ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:bg-[#242836]"
          }`}
        >
          Outcomes & Action Items
        </button>
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

      {/* Search input */}
      {showStandups && (
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-[#8b8fa3] text-sm">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Search standups by date, agent, content, or action items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#1a1d27] border border-[#2e3345] rounded-xl text-[#e4e6ed] placeholder-[#8b8fa3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-colors"
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-[#8b8fa3] mt-2">
              Found {filteredData.standups.length} standup{filteredData.standups.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

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

      {/* Standups View */}
      {view === "standups" && (
        <>
          {/* Standup cards */}
          {showStandups && filteredData.standups.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">
            Standups ({filteredData.standups.length}) 
            <span className="text-xs text-[#8b8fa3] ml-2">newest first</span>
          </h3>
          <div className="space-y-3">
            {filteredData.standups.map(standup => {
              const actionCategories = categorizeActionItems(standup.actionItems);
              
              return (
                <div key={standup.id} 
                     className="bg-[#1a1d27] border border-[#2e3345] rounded-xl cursor-pointer transition-colors hover:border-[#3e4155]"
                     onClick={() => setExpanded(expanded === standup.id ? null : standup.id)}>
                  <div className="p-4 md:p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-[#e4e6ed] text-sm md:text-base">
                          {standupIcon(standup.type)} {standup.type.charAt(0).toUpperCase() + standup.type.slice(1).replace('-', ' ')} Standup
                        </h4>
                        <p className="text-xs text-[#8b8fa3] mt-0.5">
                          {standup.date} • {standup.time}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs bg-[#242836] text-[#8b8fa3] px-2 py-1 rounded-lg">
                          {standup.discussion.length} participants
                        </span>
                        {actionCategories.completed.length > 0 && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg">
                            ✓ {actionCategories.completed.length}
                          </span>
                        )}
                        {actionCategories.started.length > 0 && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg">
                            ▶ {actionCategories.started.length}
                          </span>
                        )}
                        <span className="text-xs text-[#8b8fa3]">{expanded === standup.id ? "▾" : "▸"}</span>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-[#c4c7d4] mt-2">{standup.summary}</p>
                  </div>

                  {expanded === standup.id && (
                    <div className="px-4 md:px-5 pb-4 md:pb-5 pt-0 border-t border-[#2e3345]">
                      
                      {/* NEW: Completed Action Items Section */}
                      {actionCategories.completed.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">✓ Completed Action Items</p>
                          <ul className="space-y-1">
                            {actionCategories.completed.map((item, i) => {
                              if (typeof item === "string") {
                                return <li key={i} className="text-xs md:text-sm text-emerald-300">• {item}</li>;
                              }
                              const actionItem = item as StandupActionItem;
                              return (
                                <li key={i} className="text-xs md:text-sm text-emerald-300">
                                  • {actionItem.task || "Unknown task"}
                                  {actionItem.agent && (
                                    <span className="text-emerald-400"> → {actionItem.agent}</span>
                                  )}
                                  {actionItem.status && (
                                    <span className="text-[#8b8fa3]"> ({actionItem.status})</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* NEW: Started Action Items Section */}
                      {actionCategories.started.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-blue-400/70 uppercase tracking-wider mb-1">▶ Started Action Items</p>
                          <ul className="space-y-1">
                            {actionCategories.started.map((item, i) => {
                              if (typeof item === "string") {
                                return <li key={i} className="text-xs md:text-sm text-blue-300">• {item}</li>;
                              }
                              const actionItem = item as StandupActionItem;
                              return (
                                <li key={i} className="text-xs md:text-sm text-blue-300">
                                  • {actionItem.task || "Unknown task"}
                                  {actionItem.agent && (
                                    <span className="text-blue-400"> → {actionItem.agent}</span>
                                  )}
                                  {actionItem.status && (
                                    <span className="text-[#8b8fa3]"> ({actionItem.status})</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* Discussion */}
                      {standup.discussion && standup.discussion.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-cyan-400/70 uppercase tracking-wider mb-2">Discussion</p>
                          <div className="space-y-2.5">
                            {standup.discussion.map((d, i) => (
                              <div key={i} className="flex gap-2.5 items-start">
                                <span className="text-sm shrink-0 mt-0.5">{d.emoji || getAgentEmoji(d.agent)}</span>
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-[#e4e6ed]">{d.agent}</span>
                                  <p className="text-xs md:text-sm text-[#9b9fb3] mt-0.5">{d.said}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Decisions */}
                      {standup.keyDecisions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-amber-400/70 uppercase tracking-wider mb-1">Key Decisions</p>
                          <ul className="space-y-1">
                            {standup.keyDecisions.map((d, i) => 
                              <li key={i} className="text-xs md:text-sm text-[#c4c7d4]">• {d}</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Quality Audit Findings (Improvements) */}
                      {standup.improvements.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Quality Audit Findings</p>
                          <ul className="space-y-1">
                            {standup.improvements.map((d, i) => 
                              <li key={i} className="text-xs md:text-sm text-[#c4c7d4]">• {d}</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Other Action Items (ongoing/unspecified) */}
                      {actionCategories.ongoing.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-indigo-400/70 uppercase tracking-wider mb-1">Other Action Items</p>
                          <ul className="space-y-1">
                            {actionCategories.ongoing.map((item, i) => {
                              if (typeof item === "string") {
                                return <li key={i} className="text-xs md:text-sm text-[#c4c7d4]">• {item}</li>;
                              }
                              const actionItem = item as StandupActionItem;
                              return (
                                <li key={i} className="text-xs md:text-sm text-[#c4c7d4]">
                                  • {actionItem.task || "Unknown task"}
                                  {actionItem.agent && (
                                    <span className="text-indigo-400"> → {actionItem.agent}</span>
                                  )}
                                  {actionItem.status && (
                                    <span className="text-[#8b8fa3]"> ({actionItem.status})</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past decisions */}
      {showDecisions && resolved.length > 0 && (
        <div className="mb-8">
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

      {filteredData.standups.length === 0 && filteredData.decisions.length === 0 && (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
          {searchQuery ? "No items match your search criteria." : 
           dateFilter !== "all" || startDate || endDate ? "No items found for the selected date range." :
           "No standups or decisions yet."}
        </div>
      )}
        </>
      )}

      {/* Outcomes & Action Items View */}
      {view === "outcomes" && (
        <OutcomesView 
          standups={filteredData.standups}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {/* Summary stats */}
      {(filteredData.standups.length > 0 || filteredData.decisions.length > 0) && (
        <div className="mt-8 p-4 bg-[#1a1d27] border border-[#2e3345] rounded-xl">
          <h3 className="text-sm font-semibold text-[#e4e6ed] mb-2">📊 Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-cyan-400">{filteredData.standups.length}</p>
              <p className="text-xs text-[#8b8fa3]">Standups</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">{filteredData.decisions.length}</p>
              <p className="text-xs text-[#8b8fa3]">Decisions</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">
                {filteredData.standups.reduce((sum, s) => {
                  const categories = categorizeActionItems(s.actionItems);
                  return sum + categories.completed.length;
                }, 0)}
              </p>
              <p className="text-xs text-[#8b8fa3]">Completed Items</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-400">
                {filteredData.standups.reduce((sum, s) => {
                  const categories = categorizeActionItems(s.actionItems);
                  return sum + categories.started.length;
                }, 0)}
              </p>
              <p className="text-xs text-[#8b8fa3]">Started Items</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OutcomesView({ 
  standups, 
  searchQuery, 
  setSearchQuery 
}: {
  standups: StandupOutcome[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  // Extract all outcomes from standups, sorted newest first
  const allOutcomes = useMemo(() => {
    const outcomes: Array<{
      type: 'completed' | 'started' | 'next' | 'decision';
      item: string | StandupActionItem;
      standup: { date: string; time: string; type: string };
    }> = [];

    standups.forEach(standup => {
      const actionCategories = categorizeActionItems(standup.actionItems);
      
      // Completed action items
      actionCategories.completed.forEach(item => {
        outcomes.push({
          type: 'completed',
          item,
          standup: { date: standup.date, time: standup.time, type: standup.type }
        });
      });

      // Started action items  
      actionCategories.started.forEach(item => {
        outcomes.push({
          type: 'started', 
          item,
          standup: { date: standup.date, time: standup.time, type: standup.type }
        });
      });

      // Next action items (ongoing)
      actionCategories.ongoing.forEach(item => {
        outcomes.push({
          type: 'next',
          item, 
          standup: { date: standup.date, time: standup.time, type: standup.type }
        });
      });

      // Key decisions
      standup.keyDecisions.forEach(decision => {
        outcomes.push({
          type: 'decision',
          item: decision,
          standup: { date: standup.date, time: standup.time, type: standup.type }
        });
      });
    });

    // Sort by standup date/time newest first
    outcomes.sort((a, b) => {
      const dateA = new Date(`${a.standup.date} ${a.standup.time}`);
      const dateB = new Date(`${b.standup.date} ${b.standup.time}`);
      return dateB.getTime() - dateA.getTime();
    });

    return outcomes;
  }, [standups]);

  // Filter outcomes by search query
  const filteredOutcomes = useMemo(() => {
    if (!searchQuery) return allOutcomes;
    
    const query = searchQuery.toLowerCase();
    return allOutcomes.filter(outcome => {
      const itemText = typeof outcome.item === 'string' 
        ? outcome.item 
        : outcome.item.task || '';
      const agentText = typeof outcome.item === 'object' && outcome.item.agent 
        ? outcome.item.agent 
        : '';
      
      return itemText.toLowerCase().includes(query) ||
             agentText.toLowerCase().includes(query) ||
             outcome.standup.date.toLowerCase().includes(query) ||
             outcome.standup.type.toLowerCase().includes(query);
    });
  }, [allOutcomes, searchQuery]);

  const standupIcon = (type: string) => {
    if (type === "early-morning") return "🌅";
    if (type === "morning") return "🌄";
    if (type === "midday") return "☀️";
    if (type === "afternoon") return "🌤️";
    if (type === "evening") return "🌙";
    if (type === "latenight") return "🌚";
    return "📋";
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'completed': return "✅";
      case 'started': return "▶️";
      case 'next': return "📋";
      case 'decision': return "⚖️";
      default: return "•";
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'completed': return "text-emerald-400 bg-emerald-500/10";
      case 'started': return "text-blue-400 bg-blue-500/10"; 
      case 'next': return "text-indigo-400 bg-indigo-500/10";
      case 'decision': return "text-amber-400 bg-amber-500/10";
      default: return "text-[#8b8fa3] bg-[#242836]";
    }
  };

  const getItemLabel = (type: string) => {
    switch (type) {
      case 'completed': return "Completed Action Items";
      case 'started': return "Started Action Items";
      case 'next': return "Next Action Items";
      case 'decision': return "Key Decisions";
      default: return "Items";
    }
  };

  return (
    <div>
      {/* Search input */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-[#8b8fa3] text-sm">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Search outcomes by item, agent, or standup..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#1a1d27] border border-[#2e3345] rounded-xl text-[#e4e6ed] placeholder-[#8b8fa3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-colors"
          />
        </div>
        {searchQuery && (
          <p className="text-xs text-[#8b8fa3] mt-2">
            Found {filteredOutcomes.length} outcome{filteredOutcomes.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Outcomes grid */}
      {filteredOutcomes.length > 0 ? (
        <div className="space-y-3">
          {filteredOutcomes.map((outcome, index) => {
            const itemText = typeof outcome.item === 'string' 
              ? outcome.item 
              : outcome.item.task || 'Unknown task';
            const itemAgent = typeof outcome.item === 'object' && outcome.item.agent 
              ? outcome.item.agent 
              : null;

            return (
              <div key={index} className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-4 hover:border-[#3e4155] transition-colors">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${getItemColor(outcome.type)}`}>
                    {getItemIcon(outcome.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <span className={`text-xs uppercase font-medium tracking-wider ${getItemColor(outcome.type).split(' ')[0]}`}>
                        {getItemLabel(outcome.type)}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-[#8b8fa3]">
                        <span>{standupIcon(outcome.standup.type)}</span>
                        <span>{outcome.standup.date}</span>
                        <span>•</span>
                        <span>{outcome.standup.time}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-[#e4e6ed] mb-1">{itemText}</p>
                    
                    {itemAgent && (
                      <p className="text-xs text-indigo-400">→ {itemAgent}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
          {searchQuery ? "No outcomes match your search criteria." : "No outcomes found in recent standups."}
        </div>
      )}
    </div>
  );
}

function DecisionCard({ decision: d, expanded, onToggle, voteColor }: { 
  decision: CouncilDecision; 
  expanded: boolean; 
  onToggle: () => void; 
  voteColor: (v: string) => string 
}) {
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