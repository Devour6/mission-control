"use client";

import { useState, useEffect } from "react";
import { Task, Assignee, TaskStatus } from "@/lib/types";
import { getItem, setItem } from "@/lib/storage";
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
  const [timeView, setTimeView] = useState<TimeView>("board");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyTask);
  const [mounted, setMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [seedOverrides, setSeedOverrides] = useState<Record<string, TaskStatus>>({});

  useEffect(() => {
    setLocalTasks(getItem<Task[]>(KEY, []));
    setSeedOverrides(getItem<Record<string, TaskStatus>>("mc_tasks_seed_overrides", {}));
    fetch("/data/tasks.json")
      .then((r) => r.json())
      .then((data: Task[]) => setSeedTasks(data.map((t) => ({ ...t, _source: "seed" as const }))))
      .catch(() => {});
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

  if (!mounted) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">📋 Task Board</h2>
        <div className="flex gap-2">
          {(["all", "Brandon", "George"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:bg-[#242836]"}`}>
              {f === "all" ? "All" : f}
            </button>
          ))}
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-medium transition-colors ml-2">+ New Task</button>
        </div>
      </div>

      {/* Time view toggle */}
      <div className="flex gap-1 bg-[#1a1d27] border border-[#2e3345] rounded-lg p-1 mb-6 w-fit">
        {([["board", "Board"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setTimeView(v)} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${timeView === v ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:text-[#e4e6ed]"}`}>
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-4 mb-6 space-y-3">
          <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500/50" />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none resize-none min-h-[60px] focus:border-indigo-500/50" />
          <div className="flex gap-3">
            <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value as Assignee })} className="bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none">
              <option value="Brandon">Brandon</option>
              <option value="George">George</option>
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="bg-[#242836] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none" />
            <button onClick={addTask} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors">Add</button>
          </div>
        </div>
      )}

      {timeView === "board" ? (
        /* Kanban Board */
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-3 gap-4">
            {columns.map((col) => (
              <div key={col.id}>
                <h3 className="text-sm font-semibold text-[#8b8fa3] mb-3 uppercase tracking-wider">
                  {col.label} <span className="text-xs">({filtered.filter((t) => t.status === col.id).length})</span>
                </h3>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`min-h-[200px] rounded-xl p-2 space-y-2 transition-colors ${snapshot.isDraggingOver ? "bg-indigo-500/5" : "bg-[#1a1d27]/50"}`}>
                      {filtered.filter((t) => t.status === col.id).map((task, idx) => (
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
            ))}
          </div>
        </DragDropContext>
      ) : (
        /* Time-based view (daily/weekly/monthly) */
        <TimeBasedView tasks={filtered} view={timeView} onToggle={toggleComplete} onSelect={setSelectedTask} onDelete={deleteTask} />
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedTask(null)}>
          <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-6 max-w-lg w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">{selectedTask.title}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-[#8b8fa3] hover:text-white text-lg leading-none">✕</button>
            </div>
            {selectedTask.description && <p className="text-sm text-[#c4c7d4]">{selectedTask.description}</p>}
            <div className="grid grid-cols-2 gap-3 text-sm">
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

function TimeBasedView({ tasks, view, onToggle, onSelect, onDelete }: {
  tasks: Task[];
  view: TimeView;
  onToggle: (id: string) => void;
  onSelect: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const range = getDateRange(view);
  const inRange = tasks.filter((t) => isInRange(t.dueDate, range.start, range.end));
  const completed = inRange.filter((t) => t.status === "completed");
  const incomplete = inRange.filter((t) => t.status !== "completed");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#e4e6ed]">{range.label}</h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-emerald-400">{completed.length} completed</span>
          <span className="text-[#8b8fa3]">·</span>
          <span className="text-[#8b8fa3]">{incomplete.length} remaining</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[#2e3345] rounded-full h-2 mb-6">
        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${inRange.length > 0 ? (completed.length / inRange.length) * 100 : 0}%` }} />
      </div>

      {/* Incomplete */}
      {incomplete.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3">Remaining ({incomplete.length})</h4>
          <div className="space-y-2">
            {incomplete.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={onToggle} onSelect={onSelect} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-emerald-400/60 uppercase tracking-wider mb-3">Completed ({completed.length})</h4>
          <div className="space-y-2">
            {completed.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={onToggle} onSelect={onSelect} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {inRange.length === 0 && (
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3] text-sm">
          No tasks for this period.
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onSelect, onDelete }: { task: Task; onToggle: (id: string) => void; onSelect: (t: Task) => void; onDelete: (id: string) => void }) {
  return (
    <div onClick={() => onSelect(task)} className={`bg-[#1a1d27] border rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-[#242836] transition-colors group ${task.assignee === "Brandon" ? "border-indigo-500/20" : "border-cyan-400/20"}`}>
      <button onClick={(e) => { e.stopPropagation(); onToggle(task.id); }} className={`w-5 h-5 rounded border flex items-center justify-center text-xs shrink-0 transition-colors ${task.status === "completed" ? "bg-emerald-500/30 border-emerald-500 text-emerald-400" : "border-[#8b8fa3]/30 hover:border-emerald-500/50"}`}>
        {task.status === "completed" && "✓"}
      </button>
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium ${task.status === "completed" ? "line-through text-[#8b8fa3]" : "text-[#e4e6ed]"}`}>{task.title}</h4>
        {task.description && <p className="text-xs text-[#8b8fa3] truncate mt-0.5">{task.description}</p>}
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${task.assignee === "Brandon" ? "bg-indigo-500/20 text-indigo-400" : "bg-cyan-400/20 text-cyan-400"}`}>{task.assignee}</span>
      {task.dueDate && <span className="text-[10px] text-orange-400/80 shrink-0">📅 {task.dueDate}</span>}
      {task._source !== "seed" && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-xs text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 shrink-0">✕</button>
      )}
    </div>
  );
}
