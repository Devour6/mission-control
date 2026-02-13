"use client";

import { useState, useEffect } from "react";
import { CalendarEvent, EventType } from "@/lib/types";
import { getItem, setItem } from "@/lib/storage";

const KEY = "mc_events";

const typeColors: Record<EventType, { bg: string; text: string; label: string }> = {
  brandon: { bg: "bg-indigo-500/20", text: "text-indigo-400", label: "Brandon" },
  george: { bg: "bg-cyan-400/20", text: "text-cyan-400", label: "George" },
  shared: { bg: "bg-purple-400/20", text: "text-purple-400", label: "Shared" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatTime(t?: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function CalendarTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [seedEvents, setSeedEvents] = useState<CalendarEvent[]>([]);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "brandon" as EventType, description: "", startTime: "", endTime: "" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocalEvents(getItem<CalendarEvent[]>(KEY, []));
    fetch("/data/calendar.json")
      .then((r) => r.json())
      .then((data: CalendarEvent[]) => setSeedEvents(data.map((e) => ({ ...e, _source: "seed" as const }))))
      .catch(() => {});
    setMounted(true);
  }, []);

  const events = [...seedEvents, ...localEvents];

  const persistLocal = (next: CalendarEvent[]) => {
    setLocalEvents(next);
    setItem(KEY, next);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const monthName = new Date(year, month).toLocaleString("default", { month: "long" });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
    setSelectedDay(null);
  };

  const dateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const eventsForDay = (day: number) =>
    events
      .filter((e) => e.date === dateStr(day))
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  const addEvent = () => {
    if (!form.title.trim() || selectedDay === null) return;
    const ev: CalendarEvent = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      date: dateStr(selectedDay),
      type: form.type,
      description: form.description,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      _source: "local",
    };
    persistLocal([...localEvents, ev]);
    setForm({ title: "", type: "brandon", description: "", startTime: "", endTime: "" });
    setShowForm(false);
  };

  const removeEvent = (id: string) => {
    // Only allow removing local events
    persistLocal(localEvents.filter((e) => e.id !== id));
  };

  if (!mounted) return null;

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">📅 Calendar</h2>
        <div className="flex items-center gap-2">
          {Object.entries(typeColors).map(([k, v]) => (
            <span key={k} className={`text-[10px] px-2 py-0.5 rounded-full ${v.bg} ${v.text}`}>
              {v.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-[#242836] rounded-lg text-[#8b8fa3]">←</button>
        <h3 className="text-lg font-semibold">{monthName} {year}</h3>
        <button onClick={nextMonth} className="p-2 hover:bg-[#242836] rounded-lg text-[#8b8fa3]">→</button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-[#2e3345] rounded-xl overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-[#1a1d27] p-2 text-center text-xs text-[#8b8fa3] font-medium">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} className="bg-[#0f1117] p-2 min-h-[80px]" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = eventsForDay(day);
          return (
            <div
              key={day}
              onClick={() => { setSelectedDay(day); setShowForm(false); }}
              className={`bg-[#0f1117] p-2 min-h-[80px] cursor-pointer hover:bg-[#1a1d27] transition-colors ${selectedDay === day ? "ring-1 ring-indigo-500" : ""}`}
            >
              <span className={`text-xs font-medium ${isToday(day) ? "bg-indigo-500 text-white w-5 h-5 rounded-full inline-flex items-center justify-center" : "text-[#8b8fa3]"}`}>
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div key={ev.id} className={`text-[9px] px-1 py-0.5 rounded truncate ${typeColors[ev.type].bg} ${typeColors[ev.type].text}`}>
                    {ev.startTime ? formatTime(ev.startTime) + " " : ""}{ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-[#8b8fa3]">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDay !== null && (
        <div className="mt-4 bg-[#1a1d27] border border-[#2e3345] rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">{monthName} {selectedDay}, {year}</h4>
            <button onClick={() => setShowForm(!showForm)} className="text-xs px-3 py-1 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors">+ Add Event</button>
          </div>

          {showForm && (
            <div className="space-y-2 mb-4 p-3 bg-[#242836] rounded-lg">
              <input placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-[#1a1d27] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none" />
              <div className="flex gap-2">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })} className="bg-[#1a1d27] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="brandon">Brandon</option>
                  <option value="george">George</option>
                  <option value="shared">Shared</option>
                </select>
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="bg-[#1a1d27] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none" />
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="bg-[#1a1d27] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex gap-2">
                <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="flex-1 bg-[#1a1d27] border border-[#2e3345] rounded-lg px-3 py-2 text-sm outline-none" />
                <button onClick={addEvent} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm transition-colors">Add</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {eventsForDay(selectedDay).length === 0 && (
              <p className="text-sm text-[#8b8fa3]">No events this day.</p>
            )}
            {eventsForDay(selectedDay).map((ev) => (
              <div key={ev.id} className={`flex justify-between items-center p-3 rounded-lg border ${typeColors[ev.type].bg} border-transparent group`}>
                <div>
                  <div className="flex items-center gap-2">
                    {ev.startTime && (
                      <span className="text-[10px] text-[#8b8fa3] font-mono">
                        {formatTime(ev.startTime)}{ev.endTime ? ` – ${formatTime(ev.endTime)}` : ""}
                      </span>
                    )}
                    <span className={`text-sm font-medium ${typeColors[ev.type].text}`}>{ev.title}</span>
                  </div>
                  {ev.description && <p className="text-xs text-[#8b8fa3] mt-0.5">{ev.description}</p>}
                </div>
                {ev._source !== "seed" && (
                  <button onClick={() => removeEvent(ev.id)} className="text-xs text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
