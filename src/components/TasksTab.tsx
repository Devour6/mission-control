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

export default function TasksTab() {
  const [seedTasks, setSeedTasks] = useState<Task[]>([]);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | Assignee>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyTask);
  const [mounted, setMounted] = useState(false);
  // Track status overrides for seed tasks
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

  const persistLocal = (next: Task[]) => {
    setLocalTasks(next);
    setItem(KEY, next);
  };

  const persistOverrides = (next: Record<string, TaskStatus>) => {
    setSeedOverrides(next);
    setItem("mc_tasks_seed_overrides", next);
  };

  const addTask = () => {
    if (!form.title.trim()) return;
    const task: Task = {
      id: crypto.randomUUID(),
      ...form,
      status: "todo",
      createdAt: new Date().toISOString(),
      _source: "local",
    };
    persistLocal([task, ...localTasks]);
    setForm(emptyTask);
    setShowForm(false);
  };

  const deleteTask = (id: string) => persistLocal(localTasks.filter((t) => t.id !== id));

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const id = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;
    // Check if it's a seed task
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
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? "bg-indigo-500/20 text-indigo-400" : "text-[#8b8fa3] hover:bg-[#242836]"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-medium transition-colors ml-2">+ New Task</button>
        </div>
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
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`bg-[#242836] border rounded-lg p-3 group ${task.assignee === "Brandon" ? "border-indigo-500/30" : "border-cyan-400/30"}`}>
                            <div className="flex justify-between items-start">
                              <h4 className="text-sm font-medium">{task.title}</h4>
                              {task._source !== "seed" && (
                                <button onClick={() => deleteTask(task.id)} className="text-xs text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100">✕</button>
                              )}
                            </div>
                            {task.description && <p className="text-xs text-[#8b8fa3] mt-1 line-clamp-2">{task.description}</p>}
                            <div className="flex items-center justify-between mt-2">
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
    </div>
  );
}
