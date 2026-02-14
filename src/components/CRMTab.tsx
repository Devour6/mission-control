"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchData } from "@/lib/dataFetch";

interface TimelineEntry {
  date: string;
  type: string;
  direction?: string;
  subject?: string;
  summary: string;
}

interface Contact {
  id: string;
  name: string;
  emails: string[];
  company?: string;
  role?: string;
  relationship?: string;
  tags: string[];
  qualityScore: number;
  lastTouch: string;
  touchCount: number;
  firstSeen: string;
  timeline: TimelineEntry[];
  notes?: string;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function QualityBadge({ score }: { score: number }) {
  const colors: Record<number, string> = {
    5: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    4: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    3: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    2: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    1: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const labels: Record<number, string> = {
    5: "Key",
    4: "Strong",
    3: "Active",
    2: "Casual",
    1: "Low",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${colors[score] || colors[1]}`}>
      {"★".repeat(score)} {labels[score] || ""}
    </span>
  );
}

function TagPill({ tag }: { tag: string }) {
  const colorMap: Record<string, string> = {
    solana: "bg-purple-500/20 text-purple-300",
    phase: "bg-indigo-500/20 text-indigo-300",
    "phase-team": "bg-indigo-500/20 text-indigo-300",
    radiants: "bg-pink-500/20 text-pink-300",
    investor: "bg-emerald-500/20 text-emerald-300",
    ai: "bg-cyan-500/20 text-cyan-300",
    legal: "bg-red-500/20 text-red-300",
    personal: "bg-yellow-500/20 text-yellow-300",
    crypto: "bg-orange-500/20 text-orange-300",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colorMap[tag.toLowerCase()] || "bg-[#2e3345] text-[#8b8fa3]"}`}>
      {tag}
    </span>
  );
}

export default function CRMTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterQuality, setFilterQuality] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"lastTouch" | "touchCount" | "qualityScore" | "name">("lastTouch");
  const [selected, setSelected] = useState<Contact | null>(null);

  useEffect(() => {
    fetchData<Contact[]>("crm.json").then((d) => {
      setContacts(d);
      setLoading(false);
    });
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach((c) => c.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.emails.some((e) => e.toLowerCase().includes(q)) ||
          c.role?.toLowerCase().includes(q) ||
          c.relationship?.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (filterTag !== "all") {
      list = list.filter((c) => c.tags?.includes(filterTag));
    }
    if (filterQuality > 0) {
      list = list.filter((c) => c.qualityScore >= filterQuality);
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "lastTouch") return new Date(b.lastTouch).getTime() - new Date(a.lastTouch).getTime();
      if (sortBy === "touchCount") return b.touchCount - a.touchCount;
      if (sortBy === "qualityScore") return b.qualityScore - a.qualityScore;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [contacts, search, filterTag, filterQuality, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8b8fa3]">
        Loading CRM...
      </div>
    );
  }

  // Detail view
  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-indigo-400 hover:text-indigo-300 mb-4 flex items-center gap-1"
        >
          ← Back to contacts
        </button>

        <div className="bg-[#1e2130] rounded-xl border border-[#2e3345] p-6 mb-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold text-[#e4e6ed]">{selected.name}</h2>
              {selected.role && selected.company && (
                <p className="text-sm text-[#8b8fa3] mt-1">{selected.role} at {selected.company}</p>
              )}
              {!selected.role && selected.company && (
                <p className="text-sm text-[#8b8fa3] mt-1">{selected.company}</p>
              )}
            </div>
            <QualityBadge score={selected.qualityScore} />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-[#8b8fa3]">Email</span>
              <div className="text-[#e4e6ed] mt-0.5">
                {selected.emails.map((e) => <div key={e}>{e}</div>)}
              </div>
            </div>
            <div>
              <span className="text-[#8b8fa3]">Relationship</span>
              <div className="text-[#e4e6ed] mt-0.5">{selected.relationship || "—"}</div>
            </div>
            <div>
              <span className="text-[#8b8fa3]">Stats</span>
              <div className="text-[#e4e6ed] mt-0.5">
                {selected.touchCount} interactions · First seen {timeAgo(selected.firstSeen)} · Last {timeAgo(selected.lastTouch)}
              </div>
            </div>
          </div>

          {selected.tags && selected.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {selected.tags.map((t) => <TagPill key={t} tag={t} />)}
            </div>
          )}

          {selected.notes && (
            <div className="mt-4 p-3 bg-[#242836] rounded-lg text-sm text-[#c8cad3]">
              {selected.notes}
            </div>
          )}
        </div>

        {/* Timeline */}
        <h3 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3">
          Interaction Timeline ({selected.timeline?.length || 0})
        </h3>
        <div className="space-y-2">
          {(selected.timeline || [])
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((entry, i) => (
              <div key={i} className="bg-[#1e2130] rounded-lg border border-[#2e3345] p-4 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2e3345] text-[#8b8fa3] font-medium">
                    {entry.type === "email" ? "📧" : entry.type === "meeting" ? "📅" : "💬"} {entry.type}
                  </span>
                  {entry.direction && (
                    <span className="text-[10px] text-[#8b8fa3]">
                      {entry.direction === "inbound" ? "← received" : "→ sent"}
                    </span>
                  )}
                  <span className="text-[10px] text-[#8b8fa3] ml-auto">{entry.date}</span>
                </div>
                {entry.subject && <div className="text-[#e4e6ed] font-medium">{entry.subject}</div>}
                <div className="text-[#8b8fa3] mt-0.5">{entry.summary}</div>
              </div>
            ))}
          {(!selected.timeline || selected.timeline.length === 0) && (
            <p className="text-sm text-[#8b8fa3]">No interactions recorded yet.</p>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#e4e6ed]">👤 CRM</h2>
          <p className="text-xs text-[#8b8fa3]">{contacts.length} contacts · Updated nightly by Pam</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search name, company, email, tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm text-[#e4e6ed] placeholder-[#8b8fa3] focus:outline-none focus:border-indigo-500 flex-1 min-w-[200px]"
        />
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm text-[#e4e6ed]"
        >
          <option value="all">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterQuality}
          onChange={(e) => setFilterQuality(Number(e.target.value))}
          className="bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm text-[#e4e6ed]"
        >
          <option value={0}>All quality</option>
          <option value={5}>★★★★★ Key only</option>
          <option value={4}>★★★★+ Strong+</option>
          <option value={3}>★★★+ Active+</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm text-[#e4e6ed]"
        >
          <option value="lastTouch">Last touched</option>
          <option value="touchCount">Most interactions</option>
          <option value="qualityScore">Quality score</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-[#8b8fa3]">
            {contacts.length === 0
              ? "CRM is empty — Pam's first ingestion runs tonight at 10 PM"
              : "No contacts match your filters"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="w-full text-left bg-[#1e2130] rounded-lg border border-[#2e3345] p-4 hover:border-indigo-500/50 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#e4e6ed] text-sm">{c.name}</span>
                    <QualityBadge score={c.qualityScore} />
                  </div>
                  <div className="text-xs text-[#8b8fa3] mt-0.5 truncate">
                    {[c.role, c.company].filter(Boolean).join(" at ") || c.emails[0]}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-[#8b8fa3]">{timeAgo(c.lastTouch)}</div>
                  <div className="text-[10px] text-[#8b8fa3]">{c.touchCount} interactions</div>
                </div>
              </div>
              {c.tags && c.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.tags.slice(0, 5).map((t) => <TagPill key={t} tag={t} />)}
                  {c.tags.length > 5 && (
                    <span className="text-[10px] text-[#8b8fa3]">+{c.tags.length - 5}</span>
                  )}
                </div>
              )}
              {c.timeline && c.timeline.length > 0 && (
                <div className="mt-2 text-xs text-[#8b8fa3] truncate">
                  Last: {c.timeline[c.timeline.length - 1]?.summary}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
