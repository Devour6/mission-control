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
  completedActionItems?: string[];
  startedActionItems?: string[];
}

interface CombinedData {
  standups: StandupOutcome[];
  decisions: CouncilDecision[];
}

// Categorize action items for accountability sections
function categorizeActionItems(actionItems: (string | StandupActionItem)[]) {
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
}

export default function StandupHistoryTab() {
  const [data, setData] = useState<CombinedData>({ standups: [], decisions: [] });
  const [expandedStandup, setExpandedStandup] = useState<string | null>(null);
  const [expandedOutcome, setExpandedOutcome] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  const formatStandupTitle = (standup: StandupOutcome) => {
    const typeFormatted = standup.type.charAt(0).toUpperCase() + 
      standup.type.slice(1).replace('-', ' ');
    return `${standupIcon(standup.type)} ${typeFormatted} Standup`;
  };

  const formatStandupDateTime = (standup: StandupOutcome) => {
    return `${standup.date} • ${standup.time}`;
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

    return { standups: filteredStandups, decisions: [] };
  }, [data, searchQuery, dateFilter, startDate, endDate]);

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

      {/* Standups View */}
      {view === "standups" && (
        <>
          {filteredData.standups.length > 0 ? (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
                Standups ({filteredData.standups.length}) 
                <span className="text-xs text-[#8b8fa3] ml-2 lowercase">newest first</span>
              </h3>
              <div className="space-y-4">
                {filteredData.standups.map(standup => {
                  const completedItems = standup.completedActionItems || [];
                  const startedItems = standup.startedActionItems || [];
                  const totalActions = completedItems.length + startedItems.length;
                  const keyDecisionCount = standup.keyDecisions.length;
                  const isExpanded = expandedStandup === standup.id;
                  
                  return (
                    <div key={standup.id} className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden hover:border-[#3e4155] transition-all">
                      {/* Standup Card Header - Always Visible */}
                      <div 
                        className="p-6 cursor-pointer"
                        onClick={() => setExpandedStandup(isExpanded ? null : standup.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-[#e4e6ed] text-lg mb-1">
                              {formatStandupTitle(standup)}
                            </h4>
                            <p className="text-sm text-[#8b8fa3] mb-3">
                              {formatStandupDateTime(standup)}
                            </p>
                            <p className="text-[#c4c7d4] text-sm leading-relaxed">
                              {standup.summary}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 ml-6 shrink-0">
                            {/* Stats badges */}
                            <div className="flex items-center gap-2">
                              {standup.discussion.length > 0 && (
                                <span className="text-xs bg-[#242836] text-[#8b8fa3] px-2.5 py-1 rounded-full">
                                  💬 {standup.discussion.length}
                                </span>
                              )}
                              {completedItems.length > 0 && (
                                <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-full">
                                  ✅ {completedItems.length} done
                                </span>
                              )}
                              {startedItems.length > 0 && (
                                <span className="text-xs bg-blue-500/15 text-blue-400 px-2.5 py-1 rounded-full">
                                  ▶️ {startedItems.length} started
                                </span>
                              )}
                              {keyDecisionCount > 0 && (
                                <span className="text-xs bg-amber-500/15 text-amber-400 px-2.5 py-1 rounded-full">
                                  ⚖️ {keyDecisionCount} decisions
                                </span>
                              )}
                            </div>
                            
                            {/* Expand indicator */}
                            <div className="text-[#8b8fa3] text-lg ml-2">
                              {isExpanded ? "▾" : "▸"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-[#2e3345] bg-[#16192a]">
                          <div className="p-6 space-y-6">
                            
                            {/* Agent Discussion */}
                            {standup.discussion && standup.discussion.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                  💬 Agent Discussion
                                </h5>
                                <div className="space-y-4">
                                  {standup.discussion.map((d, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                      <div className="w-8 h-8 rounded-full bg-[#242836] flex items-center justify-center text-sm shrink-0">
                                        {d.emoji || getAgentEmoji(d.agent)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[#e4e6ed] mb-1">{d.agent}</p>
                                        <p className="text-sm text-[#9b9fb3] leading-relaxed">{d.said}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Key Decisions */}
                            {standup.keyDecisions.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  ⚖️ Key Decisions
                                </h5>
                                <div className="space-y-2">
                                  {standup.keyDecisions.map((decision, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0"></div>
                                      <p className="text-sm text-[#e4e6ed]">{decision}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Completed Action Items */}
                            {completedItems.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  ✅ Confirmed Completed ({completedItems.length})
                                </h5>
                                <div className="space-y-2">
                                  {completedItems.map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></div>
                                      <p className="text-sm text-emerald-300">{item}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Started Action Items */}
                            {startedItems.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  ▶️ Confirmed Started ({startedItems.length})
                                </h5>
                                <div className="space-y-2">
                                  {startedItems.map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                                      <p className="text-sm text-blue-300">{item}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Quality Audit Findings */}
                            {standup.improvements.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  🔍 Quality Audit Findings
                                </h5>
                                <div className="space-y-2">
                                  {standup.improvements.map((improvement, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></div>
                                      <p className="text-sm text-[#e4e6ed]">{improvement}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
              {searchQuery ? "No standups match your search criteria." : 
               dateFilter !== "all" || startDate || endDate ? "No standups found for the selected date range." :
               "No standups yet."}
            </div>
          )}
        </>
      )}

      {/* Outcomes & Action Items View */}
      {view === "outcomes" && (
        <OutcomesView 
          standups={filteredData.standups}
          expandedOutcome={expandedOutcome}
          setExpandedOutcome={setExpandedOutcome}
        />
      )}

      {/* Summary stats */}
      {filteredData.standups.length > 0 && (
        <div className="mt-8 p-4 bg-[#1a1d27] border border-[#2e3345] rounded-xl">
          <h3 className="text-sm font-semibold text-[#e4e6ed] mb-3">📊 Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-cyan-400">{filteredData.standups.length}</p>
              <p className="text-xs text-[#8b8fa3]">Standups</p>
            </div>
            <div>
              <p className="text-xl font-bold text-indigo-400">
                {filteredData.standups.reduce((sum, s) => sum + s.actionItems.length, 0)}
              </p>
              <p className="text-xs text-[#8b8fa3]">Action Items</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-400">
                {filteredData.standups.reduce((sum, s) => sum + s.keyDecisions.length, 0)}
              </p>
              <p className="text-xs text-[#8b8fa3]">Key Decisions</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">
                {filteredData.standups.reduce((sum, s) => {
                  const categories = categorizeActionItems(s.actionItems);
                  return sum + categories.completed.length;
                }, 0)}
              </p>
              <p className="text-xs text-[#8b8fa3]">Completed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionItemDisplay({ 
  item, 
  colorClass 
}: {
  item: string | StandupActionItem;
  colorClass: string;
}) {
  const itemText = typeof item === 'string' ? item : item.task || 'Unknown task';
  const itemAgent = typeof item === 'object' && item.agent ? item.agent : null;
  const itemStatus = typeof item === 'object' && item.status ? item.status : null;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colorClass}`}>
      <div className="w-2 h-2 rounded-full bg-current mt-2 shrink-0 opacity-60"></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">{itemText}</p>
        {(itemAgent || itemStatus) && (
          <div className="flex items-center gap-3 mt-1 text-xs opacity-70">
            {itemAgent && <span>→ {itemAgent}</span>}
            {itemStatus && <span>({itemStatus})</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function OutcomesView({ 
  standups, 
  expandedOutcome,
  setExpandedOutcome
}: {
  standups: StandupOutcome[];
  expandedOutcome: string | null;
  setExpandedOutcome: (id: string | null) => void;
}) {
  const standupIcon = (type: string) => {
    if (type === "early-morning") return "🌅";
    if (type === "morning") return "🌄";
    if (type === "midday") return "☀️";
    if (type === "afternoon") return "🌤️";
    if (type === "evening") return "🌙";
    if (type === "latenight") return "🌚";
    return "📋";
  };

  // Group outcomes by standup session
  const standupGroups = useMemo(() => {
    return standups.map(standup => {
      const completed = (standup.completedActionItems || []).map(item => ({ type: 'completed' as const, item }));
      const started = (standup.startedActionItems || []).map(item => ({ type: 'started' as const, item }));
      
      const outcomes = [
        ...completed,
        ...started,
        ...standup.keyDecisions.map(decision => ({ type: 'decision' as const, item: decision }))
      ];

      return {
        standup,
        outcomes,
        totalOutcomes: outcomes.length
      };
    }).filter(group => group.totalOutcomes > 0); // Only show standups with outcomes
  }, [standups]);

  const formatStandupTitle = (standup: StandupOutcome) => {
    const typeFormatted = standup.type.charAt(0).toUpperCase() + 
      standup.type.slice(1).replace('-', ' ');
    return `${standupIcon(standup.type)} ${typeFormatted} Standup`;
  };

  const getOutcomeIcon = (type: string) => {
    switch (type) {
      case 'completed': return "✅";
      case 'started': return "▶️";
      case 'next': return "📋";
      case 'decision': return "⚖️";
      default: return "•";
    }
  };

  const getOutcomeColor = (type: string) => {
    switch (type) {
      case 'completed': return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case 'started': return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case 'next': return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
      case 'decision': return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default: return "text-[#8b8fa3] bg-[#242836] border-[#2e3345]";
    }
  };

  if (standupGroups.length === 0) {
    return (
      <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
        No outcomes found in recent standups.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
        Outcomes by Standup ({standupGroups.length} sessions)
        <span className="text-xs text-[#8b8fa3] ml-2 lowercase">newest first</span>
      </h3>
      
      <div className="space-y-4">
        {standupGroups.map(({ standup, outcomes, totalOutcomes }) => {
          const isExpanded = expandedOutcome === standup.id;
          
          return (
            <div key={standup.id} className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden">
              {/* Standup Group Header */}
              <div 
                className="p-5 cursor-pointer hover:bg-[#1e2135] transition-colors"
                onClick={() => setExpandedOutcome(isExpanded ? null : standup.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-[#e4e6ed] text-base mb-1">
                      {formatStandupTitle(standup)}
                    </h4>
                    <p className="text-xs text-[#8b8fa3] mb-2">
                      {standup.date} • {standup.time}
                    </p>
                    <p className="text-sm text-[#9b9fb3]">{standup.summary}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 ml-6 shrink-0">
                    <span className="text-xs bg-[#242836] text-[#8b8fa3] px-2.5 py-1 rounded-full">
                      {totalOutcomes} outcomes
                    </span>
                    <div className="text-[#8b8fa3] text-lg">
                      {isExpanded ? "▾" : "▸"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Outcomes */}
              {isExpanded && (
                <div className="border-t border-[#2e3345] bg-[#16192a]">
                  <div className="p-5">
                    <div className="space-y-3">
                      {outcomes.map((outcome, i) => {
                        const itemText = typeof outcome.item === 'string' 
                          ? outcome.item 
                          : outcome.item.task || 'Unknown task';
                        const itemAgent = typeof outcome.item === 'object' && outcome.item.agent 
                          ? outcome.item.agent 
                          : null;

                        return (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${getOutcomeColor(outcome.type)}`}>
                            <div className="w-6 h-6 rounded-full bg-current/10 flex items-center justify-center text-xs shrink-0 mt-0.5">
                              {getOutcomeIcon(outcome.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{itemText}</p>
                              {itemAgent && (
                                <p className="text-xs opacity-70 mt-1">→ {itemAgent}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}