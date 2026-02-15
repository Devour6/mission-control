"use client";

import { useState, useEffect } from "react";
import { ActiveProjectsData, Task } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

const statusColors: Record<string, { bg: string; text: string }> = {
  todo: { bg: "bg-amber-500/20", text: "text-amber-400" },
  in_progress: { bg: "bg-blue-500/20", text: "text-blue-400" },
  completed: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
};

// Helper function to map tasks to project work items
const mapTasksToProjects = (tasks: Task[]): ActiveProjectsData => {
  const personalLifeTasks = tasks.filter(task => 
    task.title.toLowerCase().includes('cancel') ||
    task.title.toLowerCase().includes('subscription') ||
    task.title.toLowerCase().includes('domain') ||
    task.title.toLowerCase().includes('workspace') ||
    task.title.toLowerCase().includes('quicknode') ||
    task.title.toLowerCase().includes('replit') ||
    task.title.toLowerCase().includes('suno') ||
    task.title.toLowerCase().includes('lovable') ||
    (task.assignee === 'Brandon' && (
      task.description?.toLowerCase().includes('savings') ||
      task.description?.toLowerCase().includes('admin') ||
      task.description?.toLowerCase().includes('legal')
    ))
  );

  const phaseTasksKeywords = ['phase', 'yield', 'pdsol', 'phsol', 'mfc', 'netrunner', 'revenue', 'delegation'];
  const phaseTasks = tasks.filter(task => 
    phaseTasksKeywords.some(keyword => 
      task.title.toLowerCase().includes(keyword) ||
      task.description?.toLowerCase().includes(keyword)
    )
  );

  const radiantsTasks = tasks.filter(task =>
    task.title.toLowerCase().includes('radiants') ||
    task.title.toLowerCase().includes('creator') ||
    task.title.toLowerCase().includes('validator') ||
    task.title.toLowerCase().includes('hackathon') ||
    task.description?.toLowerCase().includes('radiants')
  );

  return {
    projects: [
      {
        id: "brandon-personal",
        name: "Brandon's Personal Life",
        description: "House savings (Austin TX ~$900k goal), income optimization (validators, salary), expense reduction, admin tasks (subscriptions, domains, legal)",
        emoji: "🏠",
        metrics: {
          target: "~$900k house savings",
          current: "Optimizing expenses",
          progress: `${personalLifeTasks.filter(t => t.status === 'completed').length}/${personalLifeTasks.length} expense reductions completed`
        },
        recentProgress: [
          "Cancelled Suno subscription ($10/mo savings)",
          "Cancelled Replit subscription ($51/mo savings)", 
          "Removed QuickNode ($79/mo savings)",
          "Cancelled Google Workspace for devourservices.com (~$18/mo savings)",
          "Completed domain audit across all registrars"
        ],
        activeWorkItems: personalLifeTasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status === 'todo' ? 'todo' : task.status === 'completed' ? 'completed' : 'in_progress',
          assignee: task.assignee,
          dueDate: task.dueDate
        })),
        nextSteps: [
          "Complete MFC credentials setup (Auth0, Stripe, Solana treasury wallet)",
          "Continue validator income optimization",
          "Explore additional subscription consolidations",
          "Plan Austin TX house purchase strategy"
        ]
      },
      {
        id: "phase",
        name: "Phase",
        description: "Increasing revenue toward $10M goal, feature ideation and improvements, Netrunner, phSOL/pdSOL products, delegation program, competitive analysis",
        emoji: "🌟",
        metrics: {
          target: "$10M revenue goal",
          current: "Product development phase",
          progress: "Active development on core products"
        },
        recentProgress: [
          "Researched Phase products ($YIELD, pdSOL)",
          "Set up MFC development environment",
          "Identified key delegation program opportunities"
        ],
        activeWorkItems: phaseTasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status === 'todo' ? 'todo' : task.status === 'completed' ? 'completed' : 'in_progress',
          assignee: task.assignee,
          dueDate: task.dueDate
        })),
        nextSteps: [
          "Complete MFC credentials configuration",
          "Deep competitive analysis on delegation programs",
          "Feature ideation sessions for Netrunner improvements",
          "Revenue optimization strategy planning",
          "phSOL/pdSOL product roadmap development"
        ]
      },
      {
        id: "radiants",
        name: "Radiants",
        description: "Increasing revenue toward $2M goal, creator cadre growth, Solana mobile hackathons, validator operations",
        emoji: "⭐",
        metrics: {
          target: "$2M revenue goal",
          current: "Growth phase",
          progress: "Building creator ecosystem"
        },
        recentProgress: [
          "Validator operations stabilized",
          "Creator cadre engagement strategies developed",
          "Mobile hackathon opportunities identified"
        ],
        activeWorkItems: radiantsTasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status === 'todo' ? 'todo' : task.status === 'completed' ? 'completed' : 'in_progress',
          assignee: task.assignee,
          dueDate: task.dueDate
        })),
        nextSteps: [
          "Launch creator cadre growth initiatives",
          "Plan Solana mobile hackathon participation",
          "Optimize validator operations for maximum revenue",
          "Develop creator onboarding and retention strategies",
          "Revenue tracking and optimization implementation"
        ]
      }
    ]
  };
};

export default function ProjectsTab() {
  const [data, setData] = useState<ActiveProjectsData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Fetch tasks data and map to projects
    fetchData<Task[]>("tasks.json").then(tasks => {
      const projectsData = mapTasksToProjects(tasks);
      setData(projectsData);
    }).catch(() => {});
    setMounted(true);
  }, []);

  if (!mounted || !data) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold mb-6">🚀 Active Projects</h2>

      <div className="space-y-6">
        {data.projects.map((project) => (
          <div key={project.id} className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2e3345]">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{project.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-[#e4e6ed] text-lg">{project.name}</h3>
                    <p className="text-sm text-[#8b8fa3] mt-1">{project.description}</p>
                  </div>
                </div>
                {project.metrics && (
                  <div className="bg-[#242836] rounded-lg p-3 min-w-0 sm:w-80">
                    <h4 className="text-xs font-medium text-[#e4e6ed] mb-2">Current Status</h4>
                    <div className="space-y-1">
                      {project.metrics.target && (
                        <p className="text-xs text-[#8b8fa3]"><span className="text-[#e4e6ed]">Target:</span> {project.metrics.target}</p>
                      )}
                      {project.metrics.current && (
                        <p className="text-xs text-[#8b8fa3]"><span className="text-[#e4e6ed]">Status:</span> {project.metrics.current}</p>
                      )}
                      {project.metrics.progress && (
                        <p className="text-xs text-[#8b8fa3]"><span className="text-[#e4e6ed]">Progress:</span> {project.metrics.progress}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-5 space-y-6">
              {/* Recent Progress */}
              {project.recentProgress.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#e4e6ed] mb-3">📈 Recent Progress</h4>
                  <div className="space-y-2">
                    {project.recentProgress.slice(0, 5).map((progress, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        <span className="text-emerald-400 mt-1">✓</span>
                        <span className="text-[#8b8fa3]">{progress}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Work Items */}
              {project.activeWorkItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#e4e6ed] mb-3">🚧 Active Work Items</h4>
                  <div className="space-y-2">
                    {project.activeWorkItems.filter(item => item.status !== 'completed').slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-start justify-between bg-[#242836] rounded-lg p-3 gap-3">
                        <div className="min-w-0 flex-1">
                          <h5 className="text-sm font-medium text-[#e4e6ed] break-words">{item.title}</h5>
                          {item.description && (
                            <p className="text-xs text-[#8b8fa3] mt-0.5 break-words">{item.description}</p>
                          )}
                          {item.assignee && (
                            <p className="text-xs text-[#8b8fa3] mt-1">Assignee: {item.assignee}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${(statusColors[item.status] || statusColors.todo).bg} ${(statusColors[item.status] || statusColors.todo).text}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                          {item.dueDate && (
                            <span className="text-[10px] text-[#8b8fa3]">Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {project.nextSteps.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#e4e6ed] mb-3">🎯 Next Steps / Opportunities</h4>
                  <div className="space-y-2">
                    {project.nextSteps.map((step, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        <span className="text-amber-400 mt-1">→</span>
                        <span className="text-[#8b8fa3]">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
