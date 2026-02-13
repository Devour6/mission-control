"use client";

interface Props {
  active: string;
  onNavigate: (tab: string) => void;
}

const tabs = [
  { id: "tasks", label: "Tasks", icon: "📋" },
  { id: "memory", label: "Memory", icon: "🧠" },
  { id: "calendar", label: "Calendar", icon: "📅" },
  { id: "wallet", label: "Wallet", icon: "💰" },
];

export default function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="w-64 bg-[#1a1d27] border-r border-[#2e3345] flex flex-col min-h-screen">
      <div className="p-6 border-b border-[#2e3345]">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-indigo-400">⚡</span> Mission Control
        </h1>
        <p className="text-xs text-[#8b8fa3] mt-1">Brandon & George</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onNavigate(t.id)}
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
      <div className="p-4 border-t border-[#2e3345] text-xs text-[#8b8fa3]">
        v1.0 • Local Storage
      </div>
    </aside>
  );
}
