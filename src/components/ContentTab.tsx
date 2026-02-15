"use client";

import { useState, useEffect } from "react";
import { ContentData } from "@/lib/types";
import { useData, RefreshIntervals } from "@/hooks/useData";

export default function ContentTab() {
  // Auto-refreshing data with SWR (high activity - refreshes every 15s)
  const { data: contentData, isLoading: isLoadingContent, mutate: refreshContent } = useData<ContentData>(
    "content.json", 
    RefreshIntervals.HIGH_ACTIVITY
  );

  const [view, setView] = useState<"pending" | "history">("pending");
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  const [denyFeedback, setDenyFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Provide default values if data is still loading
  const safeContentData = contentData || { drafts: [], posted: [] };

  const pendingDrafts = safeContentData.drafts.filter(d => d.status === "pending");
  const resolvedDrafts = safeContentData.drafts.filter(d => ["approved", "denied"].includes(d.status));

  const handleSingleAction = async (draftId: string, action: "approve" | "deny") => {
    setLoading(true);
    const itemFeedback = action === "deny" ? (denyFeedback[draftId]?.trim() || undefined) : (feedback.trim() || undefined);
    try {
      const response = await fetch("/api/content-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          action,
          feedback: itemFeedback,
        }),
      });

      if (!response.ok) {
        throw new Error("Action failed");
      }

      // Optimistic update with SWR
      const now = new Date().toISOString();
      if (contentData) {
        await refreshContent({
          ...contentData,
          drafts: contentData.drafts.map(d => 
            d.id === draftId 
              ? { ...d, status: action === "approve" ? "approved" : "denied", resolvedAt: now, feedback: itemFeedback || d.feedback }
              : d
          ),
        }, false); // false = don't revalidate immediately
      }

      setFeedback("");
      setDenyFeedback(prev => { const n = { ...prev }; delete n[draftId]; return n; });
      
      // Refresh from server after a short delay to get the real state
      setTimeout(() => {
        refreshContent();
      }, 1000);
    } catch (error) {
      console.error("Action failed:", error);
      alert("Action failed. Please try again.");
      // Refresh from server on error
      refreshContent();
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAction = async (action: "approve" | "deny") => {
    if (selectedDrafts.size === 0) return;

    setLoading(true);
    const ids = Array.from(selectedDrafts);
    try {
      const response = await fetch("/api/content-approval", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftIds: ids,
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
      if (contentData) {
        await refreshContent({
          ...contentData,
          drafts: contentData.drafts.map(d => 
            idSet.has(d.id) 
              ? { ...d, status: action === "approve" ? "approved" : "denied", resolvedAt: now, feedback: feedback.trim() || d.feedback }
              : d
          ),
        }, false);
      }

      setSelectedDrafts(new Set());
      setFeedback("");
      
      // Refresh from server after a short delay
      setTimeout(() => {
        refreshContent();
      }, 1000);
    } catch (error) {
      console.error("Batch action failed:", error);
      alert("Batch action failed. Please try again.");
      // Refresh from server on error
      refreshContent();
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (draftId: string) => {
    if (!confirm("Revoke approval and move back to pending?")) return;

    setLoading(true);
    try {
      const response = await fetch("/api/content-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action: "revoke" }),
      });

      if (!response.ok) throw new Error("Revoke failed");

      // Optimistic update with SWR
      if (contentData) {
        await refreshContent({
          ...contentData,
          drafts: contentData.drafts.map(d => 
            d.id === draftId ? { ...d, status: "pending", resolvedAt: undefined, feedback: "" } : d
          ),
        }, false);
      }
      
      // Refresh from server after a short delay
      setTimeout(() => {
        refreshContent();
      }, 1000);
    } catch (error) {
      console.error("Revoke failed:", error);
      alert("Revoke failed. Please try again.");
      // Refresh from server on error
      refreshContent();
    } finally {
      setLoading(false);
    }
  };

  const toggleDraftSelection = (draftId: string) => {
    const newSelection = new Set(selectedDrafts);
    if (newSelection.has(draftId)) {
      newSelection.delete(draftId);
    } else {
      newSelection.add(draftId);
    }
    setSelectedDrafts(newSelection);
  };

  const selectAll = () => {
    setSelectedDrafts(new Set(pendingDrafts.map(d => d.id)));
  };

  const clearSelection = () => {
    setSelectedDrafts(new Set());
  };

  const platformIcon = (platform: string) => platform === "x" ? "𝕏" : "in";
  const platformColor = (platform: string) => platform === "x" ? "text-white" : "text-blue-400";

  if (!mounted) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl md:text-2xl font-bold">📝 Content Approval</h2>
          <div className="flex items-center gap-2">
            {isLoadingContent && (
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            )}
            <button
              onClick={() => {
                refreshContent();
              }}
              disabled={isLoadingContent}
              className="px-3 py-1 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-md transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              🔄
            </button>
          </div>
        </div>
        
        <div className="flex gap-1 bg-[#1a1d27] border border-[#2e3345] rounded-lg p-1">
          {([
            { key: "pending", label: `Pending (${pendingDrafts.length})` },
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

      {view === "pending" && (
        <div className="space-y-4">
          {/* Batch Actions */}
          {pendingDrafts.length > 0 && (
            <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                    >
                      Select All ({pendingDrafts.length})
                    </button>
                    {selectedDrafts.size > 0 && (
                      <button
                        onClick={clearSelection}
                        className="text-xs px-3 py-1 rounded-md bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                      >
                        Clear ({selectedDrafts.size})
                      </button>
                    )}
                  </div>
                  
                  {selectedDrafts.size > 0 && (
                    <span className="text-xs text-[#8b8fa3]">
                      {selectedDrafts.size} selected
                    </span>
                  )}
                </div>
                
                {selectedDrafts.size > 0 && (
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
                        onClick={() => handleBatchAction("deny")}
                        disabled={loading}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[36px]"
                      >
                        ✕ Deny All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Drafts */}
          {pendingDrafts.length === 0 ? (
            <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
              🎉 No pending drafts — all caught up!
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`bg-[#1a1d27] border rounded-xl p-5 transition-all ${
                    selectedDrafts.has(draft.id) ? "border-indigo-500/50 bg-indigo-500/5" : "border-amber-500/30"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <input
                      type="checkbox"
                      checked={selectedDrafts.has(draft.id)}
                      onChange={() => toggleDraftSelection(draft.id)}
                      className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          draft.platform === "x" ? "border-white/20 bg-white/5 text-white" : "border-blue-400/30 bg-blue-400/10 text-blue-400"
                        }`}>
                          {platformIcon(draft.platform)} {draft.platform === "x" ? "X" : "LinkedIn"}
                        </span>
                        <span className="text-sm font-medium text-[#e4e6ed]">{draft.authorEmoji} {draft.author}</span>
                        <span className="text-xs text-[#8b8fa3]">{draft.date}</span>
                        {draft.batch && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                            {draft.batch}
                          </span>
                        )}
                      </div>

                      <div className="bg-[#242836] rounded-lg p-3 mb-3">
                        <p className="text-sm text-[#e4e6ed] whitespace-pre-wrap">{draft.text}</p>
                      </div>

                      {/* Meta info */}
                      {(draft.angle || draft.rationale) && (
                        <p className="text-xs text-[#8b8fa3] italic mb-2">
                          💡 {draft.angle || draft.rationale}
                        </p>
                      )}
                      {draft.source && (
                        <p className="text-[10px] text-[#8b8fa3] mb-3">
                          📎 Source: {draft.source}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleSingleAction(draft.id, "approve")}
                            disabled={loading}
                            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px]"
                          >
                            ✓ Approve
                          </button>
                          <div className="flex flex-1 gap-2">
                            <input
                              type="text"
                              value={denyFeedback[draft.id] || ""}
                              onChange={(e) => setDenyFeedback(prev => ({ ...prev, [draft.id]: e.target.value }))}
                              placeholder="Feedback (optional)..."
                              className="flex-1 bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm text-[#e4e6ed] placeholder-[#8b8fa3] focus:outline-none focus:border-red-500/60 min-h-[44px]"
                            />
                            <button
                              onClick={() => handleSingleAction(draft.id, "deny")}
                              disabled={loading}
                              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px] whitespace-nowrap"
                            >
                              ✕ Deny
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

          {/* Editing drafts section removed */}
        </div>
      )}

      {/* Queue view removed - draft-only mode */}

      {view === "history" && (
        <div className="space-y-2">
          {resolvedDrafts.length === 0 ? (
            <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
              No approval history yet.
            </div>
          ) : (
            resolvedDrafts.map((draft) => (
              <div
                key={draft.id}
                className={`bg-[#1a1d27] border rounded-lg p-4 ${
                  draft.status === "approved" ? "border-emerald-500/20" : "border-red-500/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${platformColor(draft.platform)}`}>
                      {platformIcon(draft.platform)}
                    </span>
                    <span className="text-sm font-medium">{draft.authorEmoji} {draft.author}</span>
                    <span className="text-sm truncate max-w-md">
                      {(draft.editedText || draft.text).slice(0, 80)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8b8fa3]">
                      {draft.resolvedAt ? new Date(draft.resolvedAt).toLocaleDateString() : draft.date}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      draft.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {draft.status}
                    </span>
                  </div>
                </div>
                {draft.feedback && (
                  <p className="text-[10px] text-[#8b8fa3] mt-2 ml-4">💬 {draft.feedback}</p>
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