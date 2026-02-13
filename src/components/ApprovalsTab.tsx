"use client";

import { useState, useEffect } from "react";
import { Approval } from "@/lib/types";
import { getItem, setItem } from "@/lib/storage";

const SEED_KEY = "mc_approvals_actions";

export default function ApprovalsTab() {
  const [seedApprovals, setSeedApprovals] = useState<Approval[]>([]);
  const [actions, setActions] = useState<Record<string, { status: "approved" | "denied"; at: string }>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setActions(getItem(SEED_KEY, {}));
    fetch("/data/approvals.json")
      .then((r) => r.json())
      .then((data: Approval[]) => setSeedApprovals(data))
      .catch(() => {});
    setMounted(true);
  }, []);

  const approvals = seedApprovals.map((a) => {
    const action = actions[a.id];
    if (action) return { ...a, status: action.status, resolvedAt: action.at };
    return a;
  });

  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  const handleAction = (id: string, status: "approved" | "denied") => {
    const next = { ...actions, [id]: { status, at: new Date().toISOString() } };
    setActions(next);
    setItem(SEED_KEY, next);
  };

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">✅ Approvals</h2>

      {/* Pending */}
      <h3 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3">
        Pending ({pending.length})
      </h3>
      {pending.length === 0 ? (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm mb-8">
          No pending approvals — the team is running smoothly.
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {pending.map((a) => (
            <div key={a.id} className="bg-[#1a1d27] border border-amber-500/30 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{a.requestedByEmoji}</span>
                    <h4 className="font-semibold text-[#e4e6ed]">{a.title}</h4>
                    {a.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{a.category}</span>
                    )}
                  </div>
                  <p className="text-sm text-[#8b8fa3] mb-2">{a.description}</p>
                  <p className="text-xs text-[#8b8fa3]">Requested by {a.requestedBy} • {a.date}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleAction(a.id, "approved")}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(a.id, "denied")}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3">
            History ({resolved.length})
          </h3>
          <div className="space-y-2">
            {resolved.map((a) => (
              <div key={a.id} className={`bg-[#1a1d27] border rounded-xl p-4 ${a.status === "approved" ? "border-emerald-500/20" : "border-red-500/20"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{a.requestedByEmoji}</span>
                    <span className="font-medium text-sm">{a.title}</span>
                    <span className="text-xs text-[#8b8fa3]">by {a.requestedBy}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
