"use client";

import { useState, useEffect } from "react";
import { Task } from "@/lib/types";
import { useData, RefreshIntervals } from "@/hooks/useData";

interface ProjectDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  target?: string;
  status?: string;
  url?: string;
  repo?: string;
  phases?: { name: string; status: "done" | "in-progress" | "planned"; items: string[] }[];
  recentProgress: string[];
  nextSteps: string[];
  taskKeywords: string[]; // keywords to match from tasks.json
}

const PROJECTS: ProjectDef[] = [
  {
    id: "brandon-personal",
    name: "Brandon's Personal Life",
    emoji: "🏠",
    description: "House savings (Austin TX ~$900k goal), income optimization, expense reduction, admin",
    target: "~$900k house savings",
    recentProgress: [
      "Cancelled Suno ($10/mo), Lovable, Google Workspace (~$18/mo)",
      "Removed QuickNode ($79/mo), Replit reduced to $25/mo (Phase expense)",
      "Completed domain audit across all registrars",
      "John running 30m portfolio scans with auto-execute authority",
    ],
    nextSteps: [
      "Continue personal income optimization",
      "Explore additional subscription consolidations",
      "Monitor John's trading P&L toward house savings acceleration",
    ],
    taskKeywords: ["cancel", "subscription", "domain", "workspace", "quicknode", "replit", "suno", "lovable", "borrowed light", "expense", "savings", "validator", "house"],
  },
  {
    id: "phase",
    name: "Phase",
    emoji: "🌟",
    description: "Revenue toward $10M goal — $YIELD, pdSOL, Netrunner, Phase Delegation, competitive analysis",
    target: "$10M revenue",
    recentProgress: [
      "Researched $YIELD and pdSOL products",
      "Identified key delegation program opportunities",
      "Dwight running 3x daily competitive intel sweeps",
      "Kelly + Rachel calibrating content voice for Phase positioning",
    ],
    nextSteps: [
      "Evaluate staked SOL lending partnership (Anchorage/Kamino framework)",
      "Position Netrunner for IRS 1099-DA tax season marketing",
      "Deep competitive analysis on delegation programs",
      "$YIELD product roadmap development",
    ],
    taskKeywords: ["phase", "yield", "pdsol", "netrunner", "revenue", "delegation"],
  },
  {
    id: "radiants",
    name: "Radiants",
    emoji: "⭐",
    description: "Revenue toward $2M goal — creator cadre growth, Solana mobile hackathons",
    target: "$2M revenue",
    recentProgress: [
      "Creator cadre engagement strategies in development",
    ],
    nextSteps: [
      "Launch creator cadre growth initiatives",
      "Plan Solana mobile hackathon participation",
      "Grow creator cadre membership and engagement",
    ],
    taskKeywords: ["radiants", "creator", "hackathon"],
  },
];

const phaseStatusColors: Record<string, { bg: string; text: string; dot: string }> = {
  done: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  "in-progress": { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
  planned: { bg: "bg-gray-500/10", text: "text-gray-400", dot: "bg-gray-500" },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  todo: { bg: "bg-amber-500/20", text: "text-amber-400" },
  in_progress: { bg: "bg-blue-500/20", text: "text-blue-400" },
  completed: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
};

export default function ProjectsTab() {
  const { data: tasks } = useData<Task[]>("tasks.json", RefreshIntervals.LOW_ACTIVITY);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  // Assign each task to the MOST SPECIFIC matching project (last in list wins)
  // This way "Phase Delegation ... validator" goes to Phase (not Personal Life)
  const taskProjectMap = new Map<string, string>();
  if (tasks) {
    for (const task of tasks) {
      if (task.status === "cancelled") continue;
      for (const project of PROJECTS) {
        const matches = project.taskKeywords.some(kw =>
          task.title.toLowerCase().includes(kw) ||
          task.description?.toLowerCase().includes(kw)
        );
        if (matches) taskProjectMap.set(task.id, project.id); // last match wins
      }
    }
  }

  const getProjectTasks = (project: ProjectDef) => {
    if (!tasks) return [];
    return tasks.filter(task =>
      task.status !== "cancelled" && taskProjectMap.get(task.id) === project.id
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Mission Statement */}
      <div className="mb-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-5">
        <div className="text-[10px] uppercase tracking-widest text-indigo-400/60 mb-2">Our Mission</div>
        <p className="text-sm md:text-base text-[#e4e6ed] font-medium leading-relaxed">
          Be Brandon&apos;s unfair advantage — an always-on operation that saves him time and money, enhances every aspect of his life, and 5x&apos;s Phase and Radiants revenue through relentless ideas, automation, and execution.
        </p>
      </div>

      <h2 className="text-xl md:text-2xl font-bold mb-6">🚀 Active Projects</h2>

      <div className="space-y-4">
        {PROJECTS.map((project) => {
          const projectTasks = getProjectTasks(project);
          const activeTasks = projectTasks.filter(t => t.status !== "completed");
          const completedTasks = projectTasks.filter(t => t.status === "completed");
          const isExpanded = expandedProject === project.id;

          return (
            <div key={project.id} className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden hover:border-[#3e4155] transition-all">
              {/* Header — always visible */}
              <div
                className="p-5 cursor-pointer"
                onClick={() => setExpandedProject(isExpanded ? null : project.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl">{project.emoji}</span>
                      <h3 className="font-semibold text-[#e4e6ed] text-lg">{project.name}</h3>
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          🔗 Live
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-[#8b8fa3] mb-2">{project.description}</p>
                    {project.target && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs bg-cyan-500/15 text-cyan-400 px-2.5 py-1 rounded-full">
                          🎯 {project.target}
                        </span>
                        {project.status && (
                          <span className="text-xs bg-blue-500/15 text-blue-400 px-2.5 py-1 rounded-full">
                            {project.status}
                          </span>
                        )}
                        {activeTasks.length > 0 && (
                          <span className="text-xs bg-amber-500/15 text-amber-400 px-2.5 py-1 rounded-full">
                            {activeTasks.length} active tasks
                          </span>
                        )}
                        {completedTasks.length > 0 && (
                          <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-full">
                            ✅ {completedTasks.length} done
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-[#8b8fa3] text-lg ml-4 shrink-0">
                    {isExpanded ? "▾" : "▸"}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-[#2e3345] bg-[#16192a] p-5 space-y-6">
                  {/* Phases (for MFC) */}
                  {project.phases && (
                    <div>
                      <h4 className="text-sm font-medium text-[#e4e6ed] mb-3">📋 Roadmap</h4>
                      <div className="space-y-3">
                        {project.phases.map((phase, i) => {
                          const colors = phaseStatusColors[phase.status];
                          return (
                            <div key={i} className={`rounded-lg p-3 border ${colors.bg} border-${phase.status === 'done' ? 'emerald' : phase.status === 'in-progress' ? 'blue' : 'gray'}-500/20`}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                                <h5 className={`text-sm font-medium ${colors.text}`}>{phase.name}</h5>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                                  {phase.status}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 ml-4">
                                {phase.items.map((item, j) => (
                                  <span key={j} className="text-xs text-[#8b8fa3] bg-[#242836] px-2 py-0.5 rounded">
                                    {phase.status === 'done' ? '✓ ' : ''}{item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recent Progress */}
                  <div>
                    <h4 className="text-sm font-medium text-[#e4e6ed] mb-3">📈 Recent Progress</h4>
                    <div className="space-y-2">
                      {project.recentProgress.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-emerald-400 mt-0.5">✓</span>
                          <span className="text-[#8b8fa3]">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Tasks from tasks.json */}
                  {activeTasks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-[#e4e6ed] mb-3">🚧 Active Tasks</h4>
                      <div className="space-y-2">
                        {activeTasks.slice(0, 8).map((task) => (
                          <div key={task.id} className="flex items-start justify-between bg-[#242836] rounded-lg p-3 gap-3">
                            <div className="min-w-0 flex-1">
                              <h5 className="text-sm font-medium text-[#e4e6ed] break-words">{task.title}</h5>
                              {task.assignee && <p className="text-xs text-[#8b8fa3] mt-1">→ {task.assignee}</p>}
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${(statusColors[task.status] || statusColors.todo).bg} ${(statusColors[task.status] || statusColors.todo).text}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  <div>
                    <h4 className="text-sm font-medium text-[#e4e6ed] mb-3">🎯 Next Steps</h4>
                    <div className="space-y-2">
                      {project.nextSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-amber-400 mt-0.5">→</span>
                          <span className="text-[#8b8fa3]">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Links */}
                  {(project.url || project.repo) && (
                    <div className="flex gap-3 pt-2">
                      {project.url && (
                        <a href={project.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors">
                          🔗 Live Site
                        </a>
                      )}
                      {project.repo && (
                        <a href={`https://${project.repo}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#8b8fa3] hover:text-[#e4e6ed] bg-[#242836] px-3 py-1.5 rounded-lg transition-colors">
                          📦 Repo
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
