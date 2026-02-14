"use client";

import { useState, useEffect } from "react";
import { Task, Assignee, TaskStatus } from "@/lib/types";
import { getItem, setItem } from "@/lib/storage";
import { fetchData } from "@/lib/dataFetch";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

const KEY = "mc_tasks";

const columns: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "inProgress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

const emptyTask = { title: "", description: "", assignee: "Brandon" as Assignee, dueDate: "" };

type TimeView = "board" | "daily" | "weekly" | "monthly";

function getDateRange(view: TimeView): { start: Date; end: Date; label: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (view === "daily") {
    const end = new Date(today); end.setDate(end.getDate() + 1);
    return { start: today, end, label: `Today — ${today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}` };
  }
  if (view === "weekly") {
    const day = today.getDay();
    const start = new Date(today); start.setDate(start.getDate() - day);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return { start, end, label: `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${new Date(end.getTime() - 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` };
  }
  // monthly
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end, label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
}

function isInRange(dateStr: string, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T12:00:00");
  return d >= start && d < end;
}

export default function TasksTab() {
  const [seedTasks, setSeedTasks] = useState<Task[]>([]);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | Assignee>("all");
  const [timeView, setTimeView] = useState<TimeView>("daily");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyTask);
  const [mounted, setMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [seedOverrides, setSeedOverrides] = useState<Record<string, TaskStatus>>({});

  useEffect(() => {
    setLocalTasks(getItem<Task[]>(KEY, []));
    setSeedOverrides(getItem<Record<string, TaskStatus>>("mc_tasks_seed_overrides", {}));
    fetchData<Task[]>("tasks.json").then((data) => setSeedTasks(data.map((t) => ({ ...t, _source: "seed" as const })))).catch(() => {});
    setMounted(true);
  }, []);

  const tasks = [
    ...seedTasks.map((t) => ({ ...t, status: seedOverrides[t.id] || t.status })),
    ...localTasks,
  ];

  const persistLocal = (next: Task[]) => { setLocalTasks(next); setItem(KEY, next); };
  const persistOverrides = (next: Record<string, TaskStatus>) => { setSeedOverrides(next); setItem("mc_tasks_seed_overrides", next); };

  const addTask = () => {
    if (!form.title.trim()) return;
    const task: Task = { id: crypto.randomUUID(), ...form, status: "todo", createdAt: new Date().toISOString(), _source: "local" };
    persistLocal([task, ...localTasks]);
    setForm(emptyTask);
    setShowForm(false);
  };

  const deleteTask = (id: string) => persistLocal(localTasks.filter((t) => t.id !== id));

  const toggleComplete = (id: string) => {
    if (seedTasks.some((t) => t.id === id)) {
      const current = seedOverrides[id] || seedTasks.find((t) => t.id === id)?.status || "todo";
      const newStatus: TaskStatus = current === "completed" ? "todo" : "completed";
      persistOverrides({ ...seedOverrides, [id]: newStatus });
    } else {
      persistLocal(localTasks.map((t) => {
        if (t.id !== id) return t;
        return { ...t, status: t.status === "completed" ? "todo" : "completed" };
      }));
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const id = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;
    if (seedTasks.some((t) => t.id === id)) {
      persistOverrides({ ...seedOverrides, [id]: newStatus });
    } else {
      persistLocal(localTasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    }
  };

  const filtered = tasks.filter((t) => filter === "all" || t.assignee === filter);

  // Apply date filter for non-"All" views
  const visibleTasks = timeView === "board"
    ? filtered
    : (() => { const r = getDateRange(timeView); return filtered.filter((t) => isInRange(t.dueDate, r.start, r.end)); })();

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
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-medium transition-colors min-h-[44px]">+ New Task</button>
        </div>
      </div>

      {/* Time view toggle */}
      <div className="flex flex-wrap gap-1 bg-[#1a1d27] border border-[#2e3345] rounded-lg p-1 mb-6 w-full sm:w-fit">
        {([["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["board", "All"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setTimeView(v)} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-medium transition-colors min-h-[44px] ${timeView === v ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:text-[#e4e6ed]"}`}>
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-4 mb-6 space-y-3">
          <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500/50" />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none resize-none min-h-[60px] focus:border-indigo-500/50" />
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value as Assignee })} className="bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none min-h-[44px]">
              <option value="Brandon">Brandon</option>
              <option value="George">George</option>
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none min-h-[44px]" />
            <button onClick={addTask} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors min-h-[44px]">Add</button>
          </div>
        </div>
      )}

      {/* Date range label + progress for filtered views */}
      {timeView !== "board" && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#e4e6ed]">{getDateRange(timeView).label}</h3>
          {(() => { const done = visibleTasks.filter((t) => t.status === "completed").length; return (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-400">{done} done</span>
              <span className="text-[#8b8fa3]">{visibleTasks.length - done} remaining</span>
              <div className="w-24 bg-[#2e3345] rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${visibleTasks.length > 0 ? (done / visibleTasks.length) * 100 : 0}%` }} /></div>
            </div>
          ); })()}
        </div>
      )}

      {/* Kanban Board — all views */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
            const colTasks = visibleTasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id}>
                <h3 className="text-sm font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">
                  {col.label} <span className="text-xs">({colTasks.length})</span>
                </h3>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`min-h-[200px] rounded-xl p-2 space-y-2 transition-colors ${snapshot.isDraggingOver ? "bg-indigo-500/5" : "bg-[#1a1d27]/50"}`}>
                      {colTasks.map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(prov) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} onClick={() => setSelectedTask(task)} className={`bg-[#242836] border rounded-lg p-3 group cursor-pointer hover:bg-[#2a2e3e] transition-colors ${task.assignee === "Brandon" ? "border-indigo-500/30" : "border-cyan-400/30"}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }} className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-colors ${task.status === "completed" ? "bg-emerald-500/30 border-emerald-500 text-emerald-400" : "border-[#8b8fa3]/30 hover:border-emerald-500/50"}`}>
                                    {task.status === "completed" && "✓"}
                                  </button>
                                  <h4 className={`text-sm font-medium ${task.status === "completed" ? "line-through text-[#8b8fa3]" : ""}`}>{task.title}</h4>
                                </div>
                                {task._source !== "seed" && (
                                  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-xs text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100">✕</button>
                                )}
                              </div>
                              {task.description && <p className="text-xs text-[#8b8fa3] mt-1 ml-6 line-clamp-2">{task.description}</p>}
                              <div className="flex items-center justify-between mt-2 ml-6">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${task.assignee === "Brandon" ? "bg-indigo-500/20 text-indigo-400" : "bg-cyan-400/20 text-cyan-400"}`}>{task.assignee}</span>
                                {task.dueDate && <span className="text-[10px] text-orange-400/80">📅 Due {task.dueDate}</span>}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

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
    </div>
  );
}
