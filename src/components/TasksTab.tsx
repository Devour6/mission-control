"use client";

import { useState, useEffect } from "react";
import { Task, Assignee, TaskStatus } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

const columns: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "inProgress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

type TimeView = "board" | "daily" | "weekly" | "monthly";

function getDateRange(view: TimeView, offset: number = 0): { start: Date; end: Date; label: string; isToday: boolean } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (view === "daily") {
    const start = new Date(today); start.setDate(start.getDate() + offset);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const isToday = offset === 0;
    const dayLabel = isToday ? "Today" : start.toLocaleDateString("en-US", { weekday: "long" });
    return { start, end, isToday, label: `${dayLabel} — ${start.toLocaleDateString("en-US", { weekday: isToday ? "long" : undefined, month: "long", day: "numeric" })}` };
  }
  if (view === "weekly") {
    const day = today.getDay();
    const start = new Date(today); start.setDate(start.getDate() - day + (offset * 7));
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const isToday = offset === 0;
    return { start, end, isToday, label: `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${new Date(end.getTime() - 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` };
  }
  // monthly
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  const isToday = offset === 0;
  return { start, end, isToday, label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
}

function isInRange(dateStr: string, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T12:00:00");
  return d >= start && d < end;
}

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | Assignee>("all");
  const [timeView, setTimeView] = useState<TimeView>("daily");
  const [timeOffset, setTimeOffset] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchData<Task[]>("tasks.json").then((data) => setTasks(data)).catch(() => {});
    setMounted(true);
  }, []);

  const filtered = tasks.filter((t) => filter === "all" || t.assignee === filter);

  // Reset offset when switching views
  const handleTimeViewChange = (v: TimeView) => { setTimeView(v); setTimeOffset(0); };

  // Apply date filter for non-"All" views
  const visibleTasks = timeView === "board"
    ? filtered
    : (() => { const r = getDateRange(timeView, timeOffset); return filtered.filter((t) => isInRange(t.dueDate, r.start, r.end)); })();

  if (!mounted) return null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-bold">📋 Task Board</h2>
        <div className="flex flex-wrap gap-2">
          {(["all", "Brandon", "George"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${filter === f ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:bg-[#242836]"}`}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Time view toggle */}
      <div className="flex flex-wrap gap-1 bg-[#1a1d27] border border-[#2e3345] rounded-lg p-1 mb-6 w-full sm:w-fit">
        {([["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["board", "All"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => handleTimeViewChange(v)} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-medium transition-colors min-h-[44px] ${timeView === v ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:text-[#e4e6ed]"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Date range label + progress for filtered views */}
      {timeView !== "board" && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setTimeOffset(o => o - 1)} className="w-8 h-8 rounded-lg bg-[#242836] hover:bg-[#2e3345] border border-[#2e3345] flex items-center justify-center text-[#8b8fa3] hover:text-[#e4e6ed] transition-colors text-sm">←</button>
            <h3 className="text-sm font-semibold text-[#e4e6ed]">{getDateRange(timeView, timeOffset).label}</h3>
            <button onClick={() => setTimeOffset(o => o + 1)} className="w-8 h-8 rounded-lg bg-[#242836] hover:bg-[#2e3345] border border-[#2e3345] flex items-center justify-center text-[#8b8fa3] hover:text-[#e4e6ed] transition-colors text-sm">→</button>
            {timeOffset !== 0 && (
              <button onClick={() => setTimeOffset(0)} className="px-2 py-1 rounded text-[10px] text-indigo-400 hover:bg-indigo-500/10 transition-colors">Today</button>
            )}
          </div>
          {(() => { const done = visibleTasks.filter((t) => t.status === "completed").length; return (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-400">{done} done</span>
              <span className="text-[#8b8fa3]">{visibleTasks.length - done} remaining</span>
              <div className="w-24 bg-[#2e3345] rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${visibleTasks.length > 0 ? (done / visibleTasks.length) * 100 : 0}%` }} /></div>
            </div>
          ); })()}
        </div>
      )}

      {/* Static Board Display — read-only */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const colTasks = visibleTasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id}>
              <h3 className="text-sm font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">
                {col.label} <span className="text-xs">({colTasks.length})</span>
              </h3>
              <div className="min-h-[200px] rounded-xl p-2 space-y-2 bg-[#1a1d27]/50">
                {colTasks.map((task) => (
                  <div key={task.id} onClick={() => setSelectedTask(task)} className={`bg-[#242836] border rounded-lg p-3 cursor-pointer hover:bg-[#2a2e3e] transition-colors ${task.assignee === "Brandon" ? "border-indigo-500/30" : "border-cyan-400/30"}`}>
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] ${task.status === "completed" ? "bg-emerald-500/30 border-emerald-500 text-emerald-400" : "border-[#8b8fa3]/30"}`}>
                        {task.status === "completed" && "✓"}
                      </div>
                      <h4 className={`text-sm font-medium ${task.status === "completed" ? "line-through text-[#8b8fa3]" : ""}`}>{task.title}</h4>
                    </div>
                    {task.description && <p className="text-xs text-[#8b8fa3] mt-1 ml-6 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center justify-between mt-2 ml-6">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${task.assignee === "Brandon" ? "bg-indigo-500/20 text-indigo-400" : "bg-cyan-400/20 text-cyan-400"}`}>{task.assignee}</span>
                      {task.dueDate && <span className="text-[10px] text-orange-400/80">📅 Due {task.dueDate}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedTask(null)}>
          <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-6 max-w-lg w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">{selectedTask.title}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-[#8b8fa3] hover:text-white text-lg leading-none">✕</button>
            </div>
            {selectedTask.description && <p className="text-sm text-[#c4c7d4]">{selectedTask.description}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-[#8b8fa3] text-xs uppercase tracking-wider">Assignee</span><p className={`mt-1 font-medium ${selectedTask.assignee === "Brandon" ? "text-indigo-400" : "text-cyan-400"}`}>{selectedTask.assignee}</p></div>
              <div><span className="text-[#8b8fa3] text-xs uppercase tracking-wider">Status</span><p className="mt-1 font-medium capitalize">{selectedTask.status === "inProgress" ? "In Progress" : selectedTask.status === "todo" ? "To Do" : "Completed"}</p></div>
              <div><span className="text-[#8b8fa3] text-xs uppercase tracking-wider">Due Date</span><p className="mt-1">{selectedTask.dueDate || "—"}</p></div>
              <div><span className="text-[#8b8fa3] text-xs uppercase tracking-wider">Created</span><p className="mt-1">{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : "—"}</p></div>
            </div>
            <button onClick={() => setSelectedTask(null)} className="w-full mt-2 px-4 py-2 bg-[#242836] hover:bg-[#2e3345] border border-[#2e3345] rounded-lg text-sm font-medium transition-colors">Close</button>
          </div>
        </div>
      )}
      
      {/* Read-only notice */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-xs text-blue-400">📚 Tasks are managed by agents and loaded from tasks.json</p>
      </div>
    </div>
  );
}