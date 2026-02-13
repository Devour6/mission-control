"use client";

import { useState, useEffect } from "react";
import { DocsData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

const typeColors: Record<string, { bg: string; text: string }> = {
  intel: { bg: "bg-amber-500/20", text: "text-amber-400" },
  draft: { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  analysis: { bg: "bg-cyan-400/20", text: "text-cyan-400" },
  report: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  memo: { bg: "bg-purple-400/20", text: "text-purple-400" },
  other: { bg: "bg-[#242836]", text: "text-[#8b8fa3]" },
};

export default function DocsTab() {
  const [data, setData] = useState<DocsData>({ days: [] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchData<DocsData>("docs.json").then(setData).catch(() => {});
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">📄 Docs</h2>

      {data.days.length === 0 ? (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
          No documents yet — the team will start producing docs as they work.
        </div>
      ) : (
        <div className="space-y-6">
          {data.days.map((day) => (
            <div key={day.date}>
              <h3 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                <span className="text-[10px] font-normal">({day.docs.length} docs)</span>
              </h3>
              <div className="space-y-2">
                {day.docs.map((doc) => (
                  <div key={doc.id} className="bg-[#1a1d27] border border-[#2e3345] rounded-lg p-4 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">{doc.authorEmoji}</span>
                      <div>
                        <h4 className="text-sm font-medium text-[#e4e6ed]">{doc.title}</h4>
                        <p className="text-xs text-[#8b8fa3] mt-0.5">{doc.description}</p>
                        <p className="text-[10px] text-[#8b8fa3] mt-1">by {doc.author}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${(typeColors[doc.type] || typeColors.other).bg} ${(typeColors[doc.type] || typeColors.other).text}`}>
                      {doc.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
