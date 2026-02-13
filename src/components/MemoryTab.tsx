"use client";

import { useState, useEffect } from "react";
import { MemoryEntry } from "@/lib/types";
import { getItem, setItem } from "@/lib/storage";

const KEY = "mc_memories";

export default function MemoryTab() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEntries(getItem<MemoryEntry[]>(KEY, []));
    setMounted(true);
  }, []);

  const save = () => {
    if (!input.trim()) return;
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...entries];
    setEntries(next);
    setItem(KEY, next);
    setInput("");
  };

  const remove = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    setItem(KEY, next);
  };

  const filtered = entries.filter((e) =>
    e.content.toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">🧠 Second Brain</h2>

      {/* Input */}
      <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2e3345] mb-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Brain dump your ideas, thoughts, notes..."
          className="w-full bg-transparent resize-none outline-none text-sm min-h-[100px] placeholder:text-[#8b8fa3]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) save();
          }}
        />
        <div className="flex justify-between items-center mt-3">
          <span className="text-xs text-[#8b8fa3]">⌘ + Enter to save</span>
          <button
            onClick={save}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search entries..."
        className="w-full bg-[#1a1d27] border border-[#2e3345] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 mb-4 placeholder:text-[#8b8fa3]"
      />

      {/* Entries */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-[#8b8fa3] py-12">
            {entries.length === 0 ? "No entries yet. Start brain dumping!" : "No matching entries."}
          </p>
        )}
        {filtered.map((e) => (
          <div
            key={e.id}
            className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-4 group"
          >
            <p className="text-sm whitespace-pre-wrap">{e.content}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-[#8b8fa3]">
                {new Date(e.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => remove(e.id)}
                className="text-xs text-red-400/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
