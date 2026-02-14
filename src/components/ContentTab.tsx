"use client";

import { useState, useEffect } from "react";
import { ContentData, PublishingQueueData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

export default function ContentTab() {
  const [contentData, setContentData] = useState<ContentData>({ drafts: [], posted: [] });
  const [queueData, setQueueData] = useState<PublishingQueueData>({ queue: [] });
  const [view, setView] = useState<"pending" | "queue" | "history">("pending");
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadData();
    setMounted(true);
  }, []);

  const loadData = async () => {
    try {
      const [content, queue] = await Promise.all([
        fetchData<ContentData>("content.json"),
        fetchData<PublishingQueueData>("publishing-queue.json").catch(() => ({ queue: [] }))
      ]);
      setContentData(content);
      setQueueData(queue);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const pendingDrafts = contentData.drafts.filter(d => d.status === "pending");
  const editingDrafts = contentData.drafts.filter(d => d.status === "editing");
  const resolvedDrafts = contentData.drafts.filter(d => ["approved", "denied"].includes(d.status));
  const queuedPosts = queueData.queue.filter(q => q.status === "queued");

  const handleSingleAction = async (draftId: string, action: "approve" | "deny" | "edit", editedText?: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/content-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          action,
          feedback: feedback.trim() || undefined,
          editedText: action === "edit" ? editedText : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Approval failed");
      }

      // Optimistic local state update (GitHub CDN may lag)
      setContentData(prev => {
        const updated = { ...prev, drafts: prev.drafts.map(d => {
          if (d.id !== draftId) return d;
          if (action === "approve") return { ...d, status: "approved" as const, resolvedAt: new Date().toISOString(), feedback: feedback.trim() || d.feedback };
          if (action === "deny") return { ...d, status: "denied" as const, resolvedAt: new Date().toISOString(), feedback: feedback.trim() || d.feedback };
          return d;
        })};
        return updated;
      });
      
      // Also refresh from server after a short delay to catch any queue updates
      setTimeout(() => loadData(), 3000);
      setFeedback("");
      
      
    } catch (error) {
      console.error("Action failed:", error);
      alert("Action failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAction = async (action: "approve" | "deny") => {
    if (selectedDrafts.size === 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/content-approval", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftIds: Array.from(selectedDrafts),
          action,
          feedback: feedback.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Batch approval failed");
      }

      // Optimistic local state update
      const ids = Array.from(selectedDrafts);
      setContentData(prev => ({
        ...prev,
        drafts: prev.drafts.map(d => {
          if (!ids.includes(d.id)) return d;
          return { ...d, status: action === "approve" ? "approved" as const : "denied" as const, resolvedAt: new Date().toISOString(), feedback: feedback.trim() || d.feedback };
        })
      }));
      setTimeout(() => loadData(), 3000);
      setSelectedDrafts(new Set());
      setFeedback("");
    } catch (error) {
      console.error("Batch action failed:", error);
      alert("Batch action failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (draftId: string) => {
    if (!confirm("Are you sure you want to revoke approval? This will move the item back to pending status and remove it from the publishing queue.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/content-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          action: "revoke",
        }),
      });

      if (!response.ok) {
        throw new Error("Revoke failed");
      }

      // Optimistic update
      setContentData(prev => ({
        ...prev,
        drafts: prev.drafts.map(d => d.id === draftId ? { ...d, status: "pending" as const, resolvedAt: undefined, feedback: "" } : d)
      }));
      setQueueData(prev => ({
        ...prev,
        queue: prev.queue.filter(q => q.draftId !== draftId)
      }));
      setTimeout(() => loadData(), 3000);
    } catch (error) {
      console.error("Revoke failed:", error);
      alert("Revoke failed. Please try again.");
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

  // Edit functionality removed per Brandon's request

  const platformIcon = (platform: string) => platform === "x" ? "𝕏" : "in";
  const platformColor = (platform: string) => platform === "x" ? "text-white" : "text-blue-400";

  if (!mounted) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-bold">📝 Content Approval</h2>
        
        <div className="flex gap-1 bg-[#1a1d27] border border-[#2e3345] rounded-lg p-1">
          {([
            { key: "pending", label: `Pending (${pendingDrafts.length})` },
            { key: "queue", label: `Queue (${queuedPosts.length})` },
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

                      {/* Text Display/Edit */}
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

                      {/* Feedback + Actions */}
                      <div className="space-y-2">
                          <input
                            type="text"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Feedback (optional — why approve/deny?)..."
                            className="w-full bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm text-[#e4e6ed] placeholder-[#8b8fa3] focus:outline-none focus:border-indigo-500/60 min-h-[36px]"
                          />
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => handleSingleAction(draft.id, "approve")}
                              disabled={loading}
                              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px]"
                            >
                              ✓ Approve & Queue
                            </button>
                            <button
                              onClick={() => startEdit(draft.id, draft.text)}
                              disabled={loading}
                              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px]"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleSingleAction(draft.id, "deny")}
                              disabled={loading}
                              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px]"
                            >
                              ✕ Deny
                            </button>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Editing Drafts */}
          {editingDrafts.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3">
                Being Edited ({editingDrafts.length})
              </h3>
              <div className="space-y-2">
                {editingDrafts.map((draft) => (
                  <div key={draft.id} className="bg-[#1a1d27] border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${platformColor(draft.platform)}`}>
                          {platformIcon(draft.platform)}
                        </span>
                        <span className="text-sm font-medium">{draft.authorEmoji} {draft.author}</span>
                        <span className="text-xs text-[#8b8fa3]">editing...</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                        In Edit
                      </span>
                    </div>
                    {draft.editedText && (
                      <div className="mt-2 text-xs text-[#8b8fa3] bg-[#242836] rounded-lg p-2">
                        Latest: {draft.editedText.slice(0, 100)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === "queue" && (
        <div className="space-y-3">
          {queuedPosts.length === 0 ? (
            <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
              No posts queued for publishing.
            </div>
          ) : (
            queuedPosts.map((item) => (
              <div key={item.id} className="bg-[#1a1d27] border border-emerald-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.platform === "x" ? "border-white/20 bg-white/5 text-white" : "border-blue-400/30 bg-blue-400/10 text-blue-400"
                  }`}>
                    {platformIcon(item.platform)} {item.platform === "x" ? "X" : "LinkedIn"}
                  </span>
                  <span className="text-sm font-medium text-[#e4e6ed]">{item.authorEmoji} {item.author}</span>
                  <span className="text-xs text-emerald-400">
                    📅 {new Date(item.scheduledFor).toLocaleString()}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    Queued
                  </span>
                </div>
                <div className="bg-[#242836] rounded-lg p-3 mb-3">
                  <p className="text-sm text-[#e4e6ed] whitespace-pre-wrap">{item.text}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleRevoke(item.draftId)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    ❌ Revoke
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

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
                    {draft.status === "approved" && (
                      <button
                        onClick={() => handleRevoke(draft.id)}
                        disabled={loading}
                        className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                      >
                        Revoke Approval
                      </button>
                    )}
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