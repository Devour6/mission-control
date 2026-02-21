"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { VisualsData } from "@/lib/types";
import { useData, RefreshIntervals } from "@/hooks/useData";

export default function VisualsTab() {
  // Auto-refreshing data with SWR (high activity - refreshes every 15s)
  const { data: visualsData, isLoading: isLoadingVisuals, mutate: refreshVisuals } = useData<VisualsData>(
    "visuals.json", 
    RefreshIntervals.HIGH_ACTIVITY
  );

  const [view, setView] = useState<"pending" | "history">("pending");
  const [selectedVisuals, setSelectedVisuals] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  const [rejectFeedback, setRejectFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filterAgent, setFilterAgent] = useState<"all" | "Kelly" | "Rachel">("all");
  const [filterPlatform, setFilterPlatform] = useState<"all" | "x" | "linkedin">("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Provide default values if data is still loading
  const safeVisualsData = visualsData || { visuals: [] };

  // Apply filters
  let filteredVisuals = safeVisualsData.visuals;
  if (filterAgent !== "all") {
    filteredVisuals = filteredVisuals.filter(v => v.agent === filterAgent);
  }
  if (filterPlatform !== "all") {
    filteredVisuals = filteredVisuals.filter(v => v.platform === filterPlatform);
  }

  const pendingVisuals = filteredVisuals.filter(v => v.status === "pending");
  const resolvedVisuals = filteredVisuals.filter(v => ["approved", "rejected"].includes(v.status));

  const handleSingleAction = async (visualId: string, action: "approve" | "reject") => {
    setLoading(true);
    const itemFeedback = action === "reject" ? (rejectFeedback[visualId]?.trim() || undefined) : (feedback.trim() || undefined);
    try {
      const response = await fetch("/api/visual-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualId,
          action,
          feedback: itemFeedback,
        }),
      });

      if (!response.ok) {
        throw new Error("Action failed");
      }

      // Optimistic update with SWR
      const now = new Date().toISOString();
      if (visualsData) {
        await refreshVisuals({
          ...visualsData,
          visuals: visualsData.visuals.map(v => 
            v.id === visualId 
              ? { ...v, status: action === "approve" ? "approved" : "rejected", resolvedAt: now, feedback: itemFeedback || v.feedback }
              : v
          ),
        }, false);
      }

      setFeedback("");
      setRejectFeedback(prev => { const n = { ...prev }; delete n[visualId]; return n; });
    } catch (error) {
      console.error("Action failed:", error);
      alert("Action failed. Please try again.");
      refreshVisuals();
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAction = async (action: "approve" | "reject") => {
    if (selectedVisuals.size === 0) return;

    setLoading(true);
    const ids = Array.from(selectedVisuals);
    try {
      const response = await fetch("/api/visual-approval", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualIds: ids,
          action,
          feedback: feedback.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Batch action failed");
      }

      // Optimistic update with SWR
      const now = new Date().toISOString();
      const idSet = new Set(ids);
      if (visualsData) {
        await refreshVisuals({
          ...visualsData,
          visuals: visualsData.visuals.map(v => 
            idSet.has(v.id) 
              ? { ...v, status: action === "approve" ? "approved" : "rejected", resolvedAt: now, feedback: feedback.trim() || v.feedback }
              : v
          ),
        }, false);
      }

      setSelectedVisuals(new Set());
      setFeedback("");
    } catch (error) {
      console.error("Batch action failed:", error);
      alert("Batch action failed. Please try again.");
      refreshVisuals();
    } finally {
      setLoading(false);
    }
  };

  const toggleVisualSelection = (visualId: string) => {
    const newSelection = new Set(selectedVisuals);
    if (newSelection.has(visualId)) {
      newSelection.delete(visualId);
    } else {
      newSelection.add(visualId);
    }
    setSelectedVisuals(newSelection);
  };

  const selectAll = () => {
    setSelectedVisuals(new Set(pendingVisuals.map(v => v.id)));
  };

  const clearSelection = () => {
    setSelectedVisuals(new Set());
  };

  const platformIcon = (platform: string) => platform === "x" ? "𝕏" : "in";
  const agentEmoji = (agent: string) => agent === "Kelly" ? "🐦" : "💼";

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl md:text-2xl font-bold">🎨 Visuals Gallery</h2>
          <div className="flex items-center gap-2">
            {isLoadingVisuals && (
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            )}
            <button
              onClick={() => {
                refreshVisuals();
              }}
              disabled={isLoadingVisuals}
              className="px-3 py-1 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-md transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              🔄
            </button>
          </div>
        </div>
        
        <div className="flex gap-1 bg-[#1a1d27] border border-[#2e3345] rounded-lg p-1">
          {([
            { key: "pending", label: `Pending (${pendingVisuals.length})` },
            { key: "history", label: "History" }
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-colors min-h-[44px] ${
                view === key ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:text-[#e4e6ed]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span className="text-sm font-medium text-[#e4e6ed]">Filter by:</span>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#8b8fa3]">Agent:</label>
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value as "all" | "Kelly" | "Rachel")}
                className="bg-[#242836] border border-[#2e3345] rounded-md px-3 py-1 text-xs text-[#e4e6ed] focus:outline-none focus:border-indigo-500/60"
              >
                <option value="all">All Agents</option>
                <option value="Kelly">🐦 Kelly</option>
                <option value="Rachel">💼 Rachel</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#8b8fa3]">Platform:</label>
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value as "all" | "x" | "linkedin")}
                className="bg-[#242836] border border-[#2e3345] rounded-md px-3 py-1 text-xs text-[#e4e6ed] focus:outline-none focus:border-indigo-500/60"
              >
                <option value="all">All Platforms</option>
                <option value="x">𝕏 X</option>
                <option value="linkedin">in LinkedIn</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {view === "pending" && (
        <div className="space-y-4">
          {/* Batch Actions */}
          {pendingVisuals.length > 0 && (
            <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                    >
                      Select All ({pendingVisuals.length})
                    </button>
                    {selectedVisuals.size > 0 && (
                      <button
                        onClick={clearSelection}
                        className="text-xs px-3 py-1 rounded-md bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                      >
                        Clear ({selectedVisuals.size})
                      </button>
                    )}
                  </div>
                  
                  {selectedVisuals.size > 0 && (
                    <span className="text-xs text-[#8b8fa3]">
                      {selectedVisuals.size} selected
                    </span>
                  )}
                </div>
                
                {selectedVisuals.size > 0 && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Optional feedback for batch..."
                      className="flex-1 sm:w-64 bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm text-[#e4e6ed] placeholder-[#8b8fa3] focus:outline-none focus:border-indigo-500/60 min-h-[36px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBatchAction("approve")}
                        disabled={loading}
                        className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[36px]"
                      >
                        ✓ Approve All
                      </button>
                      <button
                        onClick={() => handleBatchAction("reject")}
                        disabled={loading}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[36px]"
                      >
                        ✕ Reject All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Visuals Gallery */}
          {pendingVisuals.length === 0 ? (
            <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
              🎉 No pending visuals — all caught up!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingVisuals.map((visual) => (
                <div
                  key={visual.id}
                  className={`bg-[#1a1d27] border rounded-xl p-5 transition-all ${
                    selectedVisuals.has(visual.id) ? "border-indigo-500/50 bg-indigo-500/5" : "border-amber-500/30"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <input
                      type="checkbox"
                      checked={selectedVisuals.has(visual.id)}
                      onChange={() => toggleVisualSelection(visual.id)}
                      className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          visual.platform === "x" ? "border-white/20 bg-white/5 text-white" : "border-blue-400/30 bg-blue-400/10 text-blue-400"
                        }`}>
                          {platformIcon(visual.platform)} {visual.platform === "x" ? "X" : "LinkedIn"}
                        </span>
                        <span className="text-sm font-medium text-[#e4e6ed]">{agentEmoji(visual.agent)} {visual.agent}</span>
                        <span className="text-xs text-[#8b8fa3]">
                          {new Date(visual.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Image */}
                      <div className="bg-[#242836] rounded-lg p-3 mb-3">
                        <Image
                          src={visual.imageUrl}
                          alt={`Visual by ${visual.agent} for ${visual.platform}`}
                          width={400}
                          height={192}
                          className="w-full h-48 object-cover rounded-md"
                        />
                      </div>

                      {/* Associated draft text */}
                      <div className="bg-[#242836] rounded-lg p-3 mb-3">
                        <p className="text-sm text-[#e4e6ed] whitespace-pre-wrap">{visual.draftText}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleSingleAction(visual.id, "approve")}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            ✓ Approve
                          </button>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={rejectFeedback[visual.id] || ""}
                              onChange={(e) => setRejectFeedback(prev => ({ ...prev, [visual.id]: e.target.value }))}
                              placeholder="Feedback (optional)..."
                              className="flex-1 bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm text-[#e4e6ed] placeholder-[#8b8fa3] focus:outline-none focus:border-red-500/60"
                            />
                            <button
                              onClick={() => handleSingleAction(visual.id, "reject")}
                              disabled={loading}
                              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "history" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {resolvedVisuals.length === 0 ? (
            <div className="col-span-full bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
              No approval history yet.
            </div>
          ) : (
            resolvedVisuals.map((visual) => (
              <div
                key={visual.id}
                className={`bg-[#1a1d27] border rounded-xl p-4 ${
                  visual.status === "approved" ? "border-emerald-500/20" : "border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    visual.platform === "x" ? "border-white/20 bg-white/5 text-white" : "border-blue-400/30 bg-blue-400/10 text-blue-400"
                  }`}>
                    {platformIcon(visual.platform)}
                  </span>
                  <span className="text-sm font-medium text-[#e4e6ed]">{agentEmoji(visual.agent)} {visual.agent}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto ${
                    visual.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {visual.status}
                  </span>
                </div>
                
                <Image
                  src={visual.imageUrl}
                  alt={`Visual by ${visual.agent} for ${visual.platform}`}
                  width={400}
                  height={128}
                  className="w-full h-32 object-cover rounded-md mb-3"
                />
                
                <p className="text-xs text-[#8b8fa3] mb-2">
                  {visual.draftText.slice(0, 100)}...
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8b8fa3]">
                    {visual.resolvedAt ? new Date(visual.resolvedAt).toLocaleDateString() : new Date(visual.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {visual.feedback && (
                  <p className="text-[10px] text-[#8b8fa3] mt-2">💬 {visual.feedback}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-3"></div>
            <p className="text-sm text-[#8b8fa3]">Processing approval...</p>
          </div>
        </div>
      )}
    </div>
  );
}