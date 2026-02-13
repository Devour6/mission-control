"use client";

import { useState, useEffect, useRef } from "react";
import { MemoryEntry } from "@/lib/types";
import { getItem, setItem } from "@/lib/storage";

const KEY = "mc_memories";

export default function MemoryTab() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEntries(getItem<MemoryEntry[]>(KEY, []));
    setMounted(true);
  }, []);

  const persist = (next: MemoryEntry[]) => {
    setEntries(next);
    setItem(KEY, next);
  };

  const save = () => {
    if (!input.trim()) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      content: input.trim(),
      createdAt: new Date().toISOString(),
      tags: tags.length > 0 ? tags : undefined,
    };
    persist([entry, ...entries]);
    setInput("");
    setTagInput("");
    setInputFocused(false);
    inputRef.current?.blur();
  };

  const remove = (id: string) => persist(entries.filter((e) => e.id !== id));

  const q = search.toLowerCase();
  const filtered = entries.filter(
    (e) =>
      e.content.toLowerCase().includes(q) ||
      e.tags?.some((t) => t.includes(q))
  );

  // All unique tags
  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags || []))).sort();

  const firstLine = (s: string) => {
    const line = s.split("\n")[0];
    return line.length > 80 ? line.slice(0, 80) + "…" : line;
  };

  const timeAgo = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (!mounted) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Search bar - prominent at top */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold shrink-0">🧠 Memory</h2>
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full bg-[#1a1d27] border border-[#2e3345] rounded-lg px-3 py-2 pl-8 text-sm outline-none focus:border-indigo-500/50 placeholder:text-[#8b8fa3]"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b8fa3] text-xs">🔍</span>
        </div>
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSearch(search === tag ? "" : tag)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                search === tag
                  ? "bg-indigo-500/30 text-indigo-400"
                  : "bg-[#242836] text-[#8b8fa3] hover:bg-[#2e3345]"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Compact input bar */}
      <div className={`bg-[#1a1d27] border border-[#2e3345] rounded-lg mb-4 transition-all ${inputFocused ? "p-3" : "p-0"}`}>
        <div className="flex items-center gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setInputFocused(true)}
            placeholder="Quick note..."
            rows={inputFocused ? 3 : 1}
            className={`flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-[#8b8fa3] ${inputFocused ? "" : "px-3 py-2"}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) save();
              if (e.key === "Escape") { setInputFocused(false); inputRef.current?.blur(); }
            }}
          />
          {!inputFocused && (
            <button onClick={() => { setInputFocused(true); inputRef.current?.focus(); }} className="px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 shrink-0">
              Save
            </button>
          )}
        </div>
        {inputFocused && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2e3345]">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Tags (comma separated)"
              className="bg-transparent text-xs outline-none placeholder:text-[#8b8fa3] flex-1"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8b8fa3]">⌘↵</span>
              <button onClick={save} className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 rounded text-xs font-medium transition-colors">Save</button>
            </div>
          </div>
        )}
      </div>

      {/* Compact list */}
      <div className="space-y-px bg-[#2e3345] rounded-xl overflow-hidden">
        {filtered.length === 0 && (
          <div className="bg-[#0f1117] p-8 text-center text-[#8b8fa3] text-sm">
            {entries.length === 0 ? "No memories yet." : "No matches."}
          </div>
        )}
        {filtered.map((e) => (
          <div
            key={e.id}
            className="bg-[#0f1117] hover:bg-[#1a1d27] transition-colors cursor-pointer"
            onClick={() => setExpanded(expanded === e.id ? null : e.id)}
          >
            <div className="flex items-center px-3 py-2 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm truncate">{firstLine(e.content)}</span>
                  {e.tags?.map((t) => (
                    <span key={t} className="text-[9px] px-1.5 py-0 rounded bg-[#242836] text-[#8b8fa3] shrink-0">#{t}</span>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-[#8b8fa3] shrink-0">{timeAgo(e.createdAt)}</span>
              <span className="text-[10px] text-[#8b8fa3]">{expanded === e.id ? "▾" : "▸"}</span>
            </div>
            {expanded === e.id && (
              <div className="px-3 pb-3 pt-0">
                <p className="text-sm whitespace-pre-wrap text-[#c8cad0] bg-[#1a1d27] rounded-lg p-3">{e.content}</p>
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-[10px] text-[#8b8fa3]">{new Date(e.createdAt).toLocaleString()}</span>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); remove(e.id); }}
                    className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center text-[10px] text-[#8b8fa3] mt-3">
        {entries.length} {entries.length === 1 ? "entry" : "entries"}
      </div>
    </div>
  );
}
