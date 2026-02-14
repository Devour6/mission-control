"use client";

import { useState, useEffect } from "react";

interface Props {
  active: string;
  onNavigate: (tab: string) => void;
}

const tabs = [
  { id: "office", label: "Office", icon: "🏢" },
  { id: "tasks", label: "Tasks", icon: "📋" },
  { id: "approvals", label: "Approvals", icon: "✅" },
  { id: "content", label: "Content", icon: "📝" },
  { id: "outcomes", label: "Outcomes", icon: "🏛️" },
  { id: "projects", label: "Projects", icon: "🚀" },
  { id: "docs", label: "Docs", icon: "📄" },
  { id: "calendar", label: "Calendar", icon: "📅" },
  { id: "wallet", label: "Wallet", icon: "💰" },
  { id: "memory", label: "Memory", icon: "🧠" },
  { id: "crm", label: "CRM", icon: "👤" },
  { id: "team", label: "Team", icon: "👥" },
];

export default function Sidebar({ active, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleNav = (id: string) => {
    onNavigate(id);
    if (isMobile) setOpen(false);
  };

  // Mobile: bottom tab bar + hamburger drawer
  if (isMobile) {
    return (
      <>
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1a1d27] border-b border-[#2e3345] flex items-center px-4 py-3">
          <button onClick={() => setOpen(!open)} className="text-xl mr-3">☰</button>
          <h1 className="text-base font-bold tracking-tight">
            <span className="text-indigo-400">⚡</span> Mission Control
          </h1>
          <span className="ml-auto text-xs text-[#8b8fa3]">v2.0</span>
        </div>

        {/* Slide-out drawer */}
        {open && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
            <aside className="fixed top-0 left-0 bottom-0 w-64 bg-[#1a1d27] border-r border-[#2e3345] z-50 flex flex-col">
              <div className="p-5 border-b border-[#2e3345] flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold"><span className="text-indigo-400">⚡</span> Mission Control</h1>
                  <p className="text-xs text-[#8b8fa3] mt-0.5">Brandon & George</p>
                </div>
                <button onClick={() => setOpen(false)} className="text-xl text-[#8b8fa3]">✕</button>
              </div>
              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleNav(t.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      active === t.id
                        ? "bg-indigo-500/15 text-indigo-400"
                        : "text-[#8b8fa3] hover:bg-[#242836] hover:text-[#e4e6ed]"
                    }`}
                  >
                    <span className="text-lg">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </nav>
            </aside>
          </>
        )}
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside className="w-64 bg-[#1a1d27] border-r border-[#2e3345] flex flex-col min-h-screen shrink-0">
      <div className="p-6 border-b border-[#2e3345]">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-indigo-400">⚡</span> Mission Control
        </h1>
        <p className="text-xs text-[#8b8fa3] mt-1">Brandon & George</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onNavigate(t.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active === t.id
                ? "bg-indigo-500/15 text-indigo-400"
                : "text-[#8b8fa3] hover:bg-[#242836] hover:text-[#e4e6ed]"
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-[#2e3345] text-xs text-[#8b8fa3]">
        v2.0 • Local Storage
      </div>
    </aside>
  );
}
