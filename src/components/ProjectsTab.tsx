"use client";

import { useState, useEffect } from "react";
import { ProjectsData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

const divisionEmojis: Record<string, string> = {
  research: "🔍",
  financial: "📈",
  content: "📝",
  engineering: "⚙️",
  executive: "⚡",
  personalAssistant: "📋",
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  completed: { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  blocked: { bg: "bg-red-500/20", text: "text-red-400" },
  coming_soon: { bg: "bg-[#242836]", text: "text-[#8b8fa3]" },
};

export default function ProjectsTab() {
  const [data, setData] = useState<ProjectsData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchData<ProjectsData>("projects.json").then(setData).catch(() => {});
    setMounted(true);
  }, []);

  if (!mounted || !data) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold mb-6">🚀 Projects</h2>

      <div className="space-y-6">
        {Object.entries(data.divisions).map(([key, div]) => (
          <div key={key} className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e3345] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg">{divisionEmojis[key] || "📂"}</span>
                <h3 className="font-semibold text-[#e4e6ed]">{div.name}</h3>
                {div.lead && <span className="text-xs text-[#8b8fa3]">Lead: {div.lead}</span>}
                {div.members && !div.lead && <span className="text-xs text-[#8b8fa3]">{div.members.join(", ")}</span>}
              </div>
              {div.status === "coming_soon" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#242836] text-[#8b8fa3] shrink-0">Coming Soon</span>
              )}
            </div>
            <div className="p-5">
              {div.projects.length === 0 ? (
                <p className="text-sm text-[#8b8fa3]">
                  {div.status === "coming_soon" ? "Agent not yet deployed." : "No active projects."}
                </p>
              ) : (
                <div className="space-y-3">
                  {div.projects.map((p) => (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-start justify-between bg-[#242836] rounded-lg p-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-[#e4e6ed] break-words">{p.name}</h4>
                        <p className="text-xs text-[#8b8fa3] mt-0.5 break-words">{p.description}</p>
                        {p.members && p.members.length > 0 && (
                          <p className="text-[10px] text-[#8b8fa3] mt-1 break-words">{p.members.join(", ")}</p>
                        )}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${(statusColors[p.status] || statusColors.active).bg} ${(statusColors[p.status] || statusColors.active).text}`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
