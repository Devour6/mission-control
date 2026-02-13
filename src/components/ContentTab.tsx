"use client";

import { useState, useEffect } from "react";
import { ContentData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";
import { getItem, setItem } from "@/lib/storage";

const ACTIONS_KEY = "mc_content_actions";

interface DraftAction {
  status: "approved" | "denied";
  at: string;
  feedback?: string;
}

export default function ContentTab() {
  const [data, setData] = useState<ContentData>({ drafts: [], posted: [] });
  const [actions, setActions] = useState<Record<string, DraftAction>>({});
  const [view, setView] = useState<"drafts" | "posted">("drafts");
  const [mounted, setMounted] = useState(false);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyFeedback, setDenyFeedback] = useState("");

  useEffect(() => {
    setActions(getItem(ACTIONS_KEY, {}));
    fetchData<ContentData>("content.json").then(setData).catch(() => {});
    setMounted(true);
  }, []);

  const drafts = data.drafts.map((d) => {
    const action = actions[d.id];
    if (action) return { ...d, status: action.status, resolvedAt: action.at };
    return d;
  });

  const pendingDrafts = drafts.filter((d) => d.status === "pending");
  const resolvedDrafts = drafts.filter((d) => d.status !== "pending");

  const handleAction = (id: string, status: "approved" | "denied", feedback?: string) => {
    const next = { ...actions, [id]: { status, at: new Date().toISOString(), ...(feedback ? { feedback } : {}) } };
    setActions(next);
    setItem(ACTIONS_KEY, next);
    setDenyingId(null);
    setDenyFeedback("");
  };

  const platformIcon = (p: string) => p === "x" ? "𝕏" : "in";
  const platformColor = (p: string) => p === "x" ? "text-white" : "text-blue-400";

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">📝 Content</h2>
        <div className="flex gap-1 bg-[#1a1d27] border border-[#2e3345] rounded-lg p-1">
          {(["drafts", "posted"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                view === v ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:text-[#e4e6ed]"
              }`}
            >
              {v} {v === "drafts" && pendingDrafts.length > 0 && `(${pendingDrafts.length})`}
            </button>
          ))}
        </div>
      </div>

      {view === "drafts" && (
        <>
          {pendingDrafts.length === 0 && resolvedDrafts.length === 0 ? (
            <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
              No drafts yet — Kelly and Rachel are warming up.
            </div>
          ) : (
            <>
              {pendingDrafts.length > 0 && (
                <div className="space-y-3 mb-6">
                  {pendingDrafts.map((d) => (
                    <div key={d.id} className="bg-[#1a1d27] border border-amber-500/30 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-sm font-bold ${platformColor(d.platform)}`}>{platformIcon(d.platform)}</span>
                        <span className="text-xs text-[#8b8fa3]">{d.authorEmoji} {d.author} • {d.date}</span>
                      </div>
                      <p className="text-sm text-[#e4e6ed] whitespace-pre-wrap mb-2 bg-[#242836] rounded-lg p-3">{d.text}</p>
                      {(d.rationale || d.angle) && <p className="text-xs text-[#8b8fa3] italic mb-3">💡 {d.rationale || d.angle}</p>}
                      {d.source && <p className="text-[10px] text-[#8b8fa3] mb-3">📎 Source: {d.source}</p>}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(d.id, "approved")} className="px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors">✓ Approve</button>
                          <button onClick={() => { setDenyingId(denyingId === d.id ? null : d.id); setDenyFeedback(""); }} className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors">✕ Deny</button>
                        </div>
                        {denyingId === d.id && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={denyFeedback}
                              onChange={(e) => setDenyFeedback(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter" && denyFeedback.trim()) handleAction(d.id, "denied", denyFeedback.trim()); }}
                              placeholder="Why? (helps Kelly/Rachel improve)"
                              className="flex-1 bg-[#242836] border border-red-500/30 rounded-lg px-3 py-1.5 text-xs text-[#e4e6ed] placeholder-[#8b8fa3] focus:outline-none focus:border-red-500/60"
                              autoFocus
                            />
                            <button
                              onClick={() => { if (denyFeedback.trim()) handleAction(d.id, "denied", denyFeedback.trim()); }}
                              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
                            >Send</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {resolvedDrafts.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3">Reviewed</h3>
                  <div className="space-y-2">
                    {resolvedDrafts.map((d) => (
                      <div key={d.id} className={`bg-[#1a1d27] border rounded-lg p-3 ${d.status === "approved" ? "border-emerald-500/20" : "border-red-500/20"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${platformColor(d.platform)}`}>{platformIcon(d.platform)}</span>
                            <span className="text-sm truncate max-w-md">{d.text.slice(0, 80)}{d.text.length > 80 ? "…" : ""}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-[#8b8fa3]">{d.authorEmoji} {d.author}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${d.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{d.status}</span>
                          </div>
                        </div>
                        {actions[d.id]?.feedback && (
                          <p className="text-[10px] text-red-400/70 mt-1 ml-6">💬 {actions[d.id].feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {view === "posted" && (
        <>
          {data.posted.length === 0 ? (
            <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
              Nothing posted yet — still in calibration mode.
            </div>
          ) : (
            <div className="space-y-3">
              {data.posted.map((p) => (
                <div key={p.id} className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-sm font-bold ${platformColor(p.platform)}`}>{platformIcon(p.platform)}</span>
                    <span className="text-xs text-[#8b8fa3]">{p.authorEmoji} {p.author} • {p.postedAt}</span>
                  </div>
                  <p className="text-sm text-[#e4e6ed] whitespace-pre-wrap mb-3">{p.text}</p>
                  <div className="flex gap-4 text-xs text-[#8b8fa3]">
                    {p.impressions !== undefined && <span>👁 {p.impressions.toLocaleString()}</span>}
                    {p.likes !== undefined && <span>❤️ {p.likes}</span>}
                    {p.comments !== undefined && <span>💬 {p.comments}</span>}
                    {p.url && <a href={p.url} target="_blank" rel="noopener" className="text-indigo-400 hover:underline">View →</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
