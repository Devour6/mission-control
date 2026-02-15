"use client";

import { useState, useEffect } from "react";
import { useData, RefreshIntervals } from "@/hooks/useData";

interface StandupDiscussion {
  agent: string;
  said: string;
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

export default function StandupHistoryTab() {
  // Auto-refreshing data with SWR (low activity - refreshes every 60s)
  const { data, isLoading, mutate: refreshData } = useData<StandupOutcome[]>(
    "outcomes-standups.json", 
    RefreshIntervals.LOW_ACTIVITY
  );
  
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Provide default value if data is still loading
  const safeData = data || [];

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

  const filteredData = safeData.filter(standup => {
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
  });

  // Sort by date/time descending (most recent first)
  const sortedData = [...filteredData].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">📝 Standup History</h2>
            <p className="text-xs md:text-sm text-[#8b8fa3] mt-1">
              Complete history of all team standups — discussion, decisions, improvements, and action items.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            )}
            <button
              onClick={() => refreshData()}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-md transition-colors disabled:opacity-50"
              title="Refresh standup history"
            >
              🔄
            </button>
          </div>
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
            placeholder="Search by date, agent, content, or action items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#1a1d27] border border-[#2e3345] rounded-xl text-[#e4e6ed] placeholder-[#8b8fa3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-colors"
          />
        </div>
        {searchQuery && (
          <p className="text-xs text-[#8b8fa3] mt-2">
            Found {filteredData.length} standup{filteredData.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Standup cards */}
      {sortedData.length > 0 ? (
        <div className="space-y-3">
          {sortedData.map(standup => (
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
                    <span className="text-xs text-[#8b8fa3]">{expanded === standup.id ? "▾" : "▸"}</span>
                  </div>
                </div>
                <p className="text-xs md:text-sm text-[#c4c7d4] mt-2">{standup.summary}</p>
              </div>

              {expanded === standup.id && (
                <div className="px-4 md:px-5 pb-4 md:pb-5 pt-0 border-t border-[#2e3345]">
                  
                  {/* Discussion */}
                  {standup.discussion && standup.discussion.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-cyan-400/70 uppercase tracking-wider mb-2">Discussion</p>
                      <div className="space-y-2.5">
                        {standup.discussion.map((d, i) => (
                          <div key={i} className="flex gap-2.5 items-start">
                            <span className="text-sm shrink-0 mt-0.5">{getAgentEmoji(d.agent)}</span>
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

                  {/* Action Items */}
                  {standup.actionItems.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-indigo-400/70 uppercase tracking-wider mb-1">Action Items</p>
                      <ul className="space-y-1">
                        {standup.actionItems.map((item, i) => {
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
          ))}
        </div>
      ) : (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
          {searchQuery ? "No standups match your search criteria." : "No standup history available yet."}
        </div>
      )}

      {/* Summary stats */}
      {sortedData.length > 0 && (
        <div className="mt-8 p-4 bg-[#1a1d27] border border-[#2e3345] rounded-xl">
          <h3 className="text-sm font-semibold text-[#e4e6ed] mb-2">📊 Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-cyan-400">{sortedData.length}</p>
              <p className="text-xs text-[#8b8fa3]">Total Standups</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">
                {sortedData.reduce((sum, s) => sum + s.keyDecisions.length, 0)}
              </p>
              <p className="text-xs text-[#8b8fa3]">Decisions Made</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">
                {sortedData.reduce((sum, s) => sum + s.improvements.length, 0)}
              </p>
              <p className="text-xs text-[#8b8fa3]">Improvements</p>
            </div>
            <div>
              <p className="text-lg font-bold text-indigo-400">
                {sortedData.reduce((sum, s) => sum + s.actionItems.length, 0)}
              </p>
              <p className="text-xs text-[#8b8fa3]">Action Items</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}