"use client";

// --- Timezone Conversion Helper ---
function convertPSTToLocal(pstTime: string): string {
  if (!pstTime || pstTime.toLowerCase().includes('every') || pstTime.toLowerCase().includes('hourly') || pstTime.toLowerCase().includes('ongoing')) {
    return pstTime;
  }

  if (pstTime.toLowerCase().includes('morning') && !pstTime.includes(':')) {
    return pstTime;
  }

  if (pstTime.includes('Mon ') && pstTime.includes('AM')) {
    const timeMatch = pstTime.match(/(\d+)(AM|PM)/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const period = timeMatch[2];
      const convertedTime = convertPSTToLocal(`${hour}:00 ${period}`);
      return `Mon ${convertedTime}`;
    }
    return pstTime;
  }

  const timeMatch = pstTime.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);
  if (!timeMatch) {
    return pstTime;
  }

  const hours = parseInt(timeMatch[1]);
  const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
  const period = timeMatch[3].toUpperCase();
  
  let h = hours;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;

  const pstDateString = `2026-02-14T${String(h).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00-08:00`;
  const date = new Date(pstDateString);
  
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
}

// --- New Timeline-based Types ---
interface TimelineStep {
  id: string;
  type: "trigger" | "action" | "data" | "decision" | "output";
  title: string;
  subtitle?: string;
  time?: string;
  icon: string;
  inputs?: string[];
  outputs?: string[];
  discordChannel?: string;
  description?: string;
  color: string;
}

interface AgentTimeline {
  name: string;
  emoji: string;
  role: string;
  color: string;
  description: string;
  steps: TimelineStep[];
}

// --- Redesigned Workflow Data (Timeline Format) ---
const AGENT_TIMELINES: Record<string, AgentTimeline> = {
  George: {
    name: "George",
    emoji: "🦾", 
    role: "Chief of Staff",
    color: "#6366f1",
    description: "Coordinates all agents, conducts standups, and executes high-conviction trades",
    steps: [
      {
        id: "early-standup",
        type: "action",
        title: "Early Morning Standup", 
        time: "4:00 AM",
        icon: "🌅",
        description: "Check overnight activities, prep for day",
        color: "#6366f1"
      },
      {
        id: "morning-brief",
        type: "action",
        title: "Morning Briefing",
        time: "8:00 AM", 
        icon: "📋",
        inputs: ["DAILY-INTEL.md", "Calendar Context"],
        outputs: ["Brandon Brief"],
        description: "Synthesize intel and calendar for Brandon",
        color: "#6366f1"
      },
      {
        id: "send-brief",
        type: "output",
        title: "Brief to Brandon",
        icon: "📤",
        discordChannel: "DM",
        description: "Daily intelligence summary and schedule overview",
        color: "#8b5cf6"
      },
      {
        id: "midday-standup", 
        type: "action",
        title: "Midday Standup",
        time: "12:00 PM",
        icon: "👥",
        description: "Check progress, coordinate agents",
        color: "#6366f1"
      },
      {
        id: "trade-review",
        type: "decision",
        title: "Trade Review",
        icon: "⚖️",
        inputs: ["John's Proposals"],
        description: "Review high-conviction opportunities",
        color: "#f59e0b"
      },
      {
        id: "execute-trades",
        type: "action", 
        title: "Execute Trades",
        icon: "💸",
        outputs: ["Trade Log"],
        description: "Execute approved high-conviction trades via Solana CLI",
        color: "#10b981"
      },
      {
        id: "evening-standup",
        type: "action",
        title: "Evening Standup", 
        time: "8:00 PM",
        icon: "🌙",
        description: "End-of-day review and planning",
        color: "#6366f1"
      },
      {
        id: "late-standup",
        type: "action",
        title: "Late Night Standup",
        time: "11:00 PM",
        icon: "🌚", 
        description: "Final check before overnight period",
        color: "#6366f1"
      }
    ]
  },

  Dwight: {
    name: "Dwight",
    emoji: "🔍",
    role: "Research Lead", 
    color: "#a855f7",
    description: "Conducts market research sweeps 3x daily, writes DAILY-INTEL.md, feeds all other agents",
    steps: [
      {
        id: "morning-sweep",
        type: "trigger",
        title: "Morning Sweep",
        time: "7:30 AM",
        icon: "🔍", 
        description: "Comprehensive market and news analysis",
        color: "#a855f7"
      },
      {
        id: "write-intel",
        type: "data",
        title: "Write DAILY-INTEL.md",
        icon: "📄",
        outputs: ["DAILY-INTEL.md"],
        description: "Structured intelligence document",
        color: "#06b6d4"
      },
      {
        id: "research-post",
        type: "output", 
        title: "Research Update",
        icon: "💬",
        discordChannel: "#research",
        description: "Share findings with team",
        color: "#8b5cf6"
      },
      {
        id: "feed-agents",
        type: "action",
        title: "Feed Other Agents", 
        icon: "🔄",
        outputs: ["Kelly", "Rachel", "John", "George"],
        description: "Intel flows to content creators and trading",
        color: "#10b981"
      },
      {
        id: "midday-sweep",
        type: "trigger", 
        title: "Midday Update",
        time: "1:00 PM",
        icon: "🔄",
        description: "Market pulse check and intel update", 
        color: "#a855f7"
      },
      {
        id: "update-intel",
        type: "data",
        title: "Update Intel",
        icon: "✏️", 
        outputs: ["DAILY-INTEL.md"],
        description: "Refresh with latest developments",
        color: "#06b6d4"
      },
      {
        id: "evening-sweep",
        type: "trigger",
        title: "Evening Market Snapshot", 
        time: "6:00 PM",
        icon: "📸",
        description: "End-of-day market summary",
        color: "#a855f7"
      },
      {
        id: "evening-post",
        type: "output",
        title: "Evening Report",
        icon: "📊",
        discordChannel: "#research", 
        description: "Day's key developments and outlook",
        color: "#8b5cf6"
      }
    ]
  },

  Kelly: {
    name: "Kelly",
    emoji: "🐦",
    role: "X Content Creator",
    color: "#ec4899", 
    description: "Creates X/Twitter content 3x daily based on research intel and feedback",
    steps: [
      {
        id: "read-intel",
        type: "data",
        title: "Read Intel & Feedback",
        icon: "📖",
        inputs: ["DAILY-INTEL.md", "content-feedback.json"],
        description: "Consume research and review feedback",
        color: "#06b6d4"
      },
      {
        id: "morning-drafts",
        type: "action", 
        title: "Morning Drafts",
        time: "9:00 AM",
        icon: "✍️",
        description: "Create initial X content drafts",
        color: "#ec4899"
      },
      {
        id: "save-drafts",
        type: "data",
        title: "Save to drafts/x/",
        icon: "💾",
        outputs: ["YYYY-MM-DD.md"],
        description: "Store drafts in organized files", 
        color: "#06b6d4"
      },
      {
        id: "x-discord",
        type: "output",
        title: "Share Drafts",
        icon: "🐦",
        discordChannel: "#x-drafts",
        description: "Post drafts for review and approval",
        color: "#8b5cf6"
      },
      {
        id: "midday-drafts",
        type: "action",
        title: "Midday Iteration", 
        time: "1:30 PM",
        icon: "🔄",
        description: "Refine based on market developments",
        color: "#ec4899"
      },
      {
        id: "brandon-review",
        type: "decision",
        title: "Brandon Review Cycle",
        icon: "👑",
        description: "15min feedback sync loop",
        color: "#f59e0b"
      },
      {
        id: "evening-drafts",
        type: "action",
        title: "Evening Polish", 
        time: "5:00 PM",
        icon: "✨",
        description: "Final content refinements",
        color: "#ec4899"
      },
      {
        id: "performance",
        type: "action",
        title: "Performance Analysis",
        icon: "📊",
        description: "Review engagement and optimize",
        color: "#10b981"
      }
    ]
  },

  Rachel: {
    name: "Rachel", 
    emoji: "💼",
    role: "LinkedIn Content Creator",
    color: "#3b82f6",
    description: "Creates professional LinkedIn content 3x daily, posts live Tuesdays & Thursdays",
    steps: [
      {
        id: "read-intel",
        type: "data",
        title: "Read Intel & Feedback", 
        icon: "📖",
        inputs: ["DAILY-INTEL.md", "content-feedback.json"],
        description: "Consume research and review feedback",
        color: "#06b6d4"
      },
      {
        id: "morning-drafts",
        type: "action",
        title: "Morning Drafts",
        time: "9:00 AM", 
        icon: "✍️",
        description: "Create professional LinkedIn content",
        color: "#3b82f6"
      },
      {
        id: "save-drafts",
        type: "data",
        title: "Save to drafts/linkedin/",
        icon: "💾",
        outputs: ["YYYY-MM-DD.md"],
        description: "Store drafts in organized files",
        color: "#06b6d4"
      },
      {
        id: "linkedin-discord",
        type: "output", 
        title: "Share Drafts",
        icon: "💼",
        discordChannel: "#linkedin-drafts",
        description: "Post drafts for review",
        color: "#8b5cf6"
      },
      {
        id: "midday-drafts",
        type: "action",
        title: "Midday Iteration",
        time: "1:30 PM",
        icon: "🔄", 
        description: "Professional angle refinements",
        color: "#3b82f6"
      },
      {
        id: "evening-polish",
        type: "action",
        title: "Evening Polish",
        time: "5:00 PM",
        icon: "✨",
        description: "Final professional tone check",
        color: "#3b82f6"
      },
      {
        id: "live-posting",
        type: "action",
        title: "Live Posting", 
        subtitle: "Tuesdays & Thursdays",
        icon: "📡",
        description: "Post approved content to LinkedIn",
        color: "#10b981"
      },
      {
        id: "engagement",
        type: "action",
        title: "Engagement Tracking",
        icon: "📊", 
        description: "Monitor and respond to interactions",
        color: "#10b981"
      }
    ]
  },

  John: {
    name: "John",
    emoji: "📈", 
    role: "Quantitative Trader",
    color: "#10b981",
    description: "Conducts market analysis every 2 hours, generates trade proposals for George's review",
    steps: [
      {
        id: "market-scan",
        type: "trigger",
        title: "Market Scan",
        time: "Every 2h",
        icon: "🔄",
        description: "Systematic market opportunity detection", 
        color: "#10b981"
      },
      {
        id: "data-analysis",
        type: "data", 
        title: "CoinGecko Pro Analysis",
        icon: "📊",
        inputs: ["CoinGecko Pro API", "Portfolio Targets", "DAILY-INTEL.md"],
        description: "Comprehensive market data analysis",
        color: "#06b6d4"
      },
      {
        id: "generate-proposals",
        type: "action",
        title: "Generate Proposals",
        icon: "📋", 
        outputs: ["proposals/YYYY-MM-DD.md"],
        description: "Create structured trade recommendations",
        color: "#10b981"
      },
      {
        id: "george-review",
        type: "decision",
        title: "George Auto-Review",
        icon: "🦾",
        description: "Automated proposal validation and risk check", 
        color: "#f59e0b"
      },
      {
        id: "position-check",
        type: "decision",
        title: "Position Size Check",
        subtitle: "< 15% portfolio?",
        icon: "⚖️",
        description: "Risk management verification",
        color: "#f59e0b"
      },
      {
        id: "auto-execute",
        type: "action", 
        title: "Auto-Execute",
        icon: "💸",
        outputs: ["Trade Log"],
        description: "Execute approved trades automatically",
        color: "#10b981"
      },
      {
        id: "trades-discord",
        type: "output",
        title: "Trade Logging",
        icon: "📈",
        discordChannel: "#trades",
        description: "Log all trade activity and results", 
        color: "#8b5cf6"
      },
      {
        id: "performance",
        type: "action",
        title: "Performance Review",
        icon: "📊",
        description: "Analyze trade outcomes and optimize strategy",
        color: "#10b981"
      }
    ]
  },

  Ross: {
    name: "Ross",
    emoji: "⚙️", 
    role: "Engineering Lead",
    color: "#f97316",
    description: "Handles on-demand development tasks, builds with Codex CLI, maintains Mission Control",
    steps: [
      {
        id: "receive-task",
        type: "data",
        title: "Receive Task",
        icon: "📝",
        inputs: ["tasks.md from George"],
        description: "Get engineering requirements and context", 
        color: "#06b6d4"
      },
      {
        id: "understand-plan",
        type: "action",
        title: "Understand & Plan",
        icon: "🧠",
        description: "Deep analysis of requirements and technical approach",
        color: "#f97316"
      },
      {
        id: "sonnet4-brain",
        type: "action", 
        title: "Sonnet 4 Analysis",
        icon: "🤖",
        description: "AI-assisted technical planning and architecture",
        color: "#8b5cf6"
      },
      {
        id: "build-codex",
        type: "action",
        title: "Build with Codex CLI",
        icon: "🛠️",
        description: "Autonomous coding with Codex CLI tool", 
        color: "#f97316"
      },
      {
        id: "test-deploy",
        type: "action",
        title: "Test & Deploy",
        icon: "🚀",
        outputs: ["Vercel Deployment"],
        description: "Quality assurance and production deployment",
        color: "#10b981"
      },
      {
        id: "report-links",
        type: "action", 
        title: "Report Live Links",
        icon: "🔗",
        description: "Document deployment URLs and completion",
        color: "#f97316"
      },
      {
        id: "george-review",
        type: "decision",
        title: "George Final Review",
        icon: "🦾",
        description: "Final approval before task completion", 
        color: "#f59e0b"
      },
      {
        id: "maintenance",
        type: "action",
        title: "Mission Control Maintenance",
        subtitle: "Ongoing",
        icon: "🔧",
        description: "Keep systems running smoothly",
        color: "#f97316"
      }
    ]
  },

  Pam: {
    name: "Pam",
    emoji: "📋",
    role: "Personal Assistant",
    color: "#f43f5e", 
    description: "Monitors emails hourly, manages calendar context, handles CRM ingestion daily at 10PM",
    steps: [
      {
        id: "email-monitor",
        type: "trigger",
        title: "Urgent Email Monitor",
        time: "Every Hour",
        icon: "📧",
        inputs: ["3 Email Inboxes"],
        description: "Scan for urgent communications", 
        color: "#f43f5e"
      },
      {
        id: "alert-urgent",
        type: "decision",
        title: "Urgent Alert System",
        icon: "🚨",
        outputs: ["Brandon Alert"],
        description: "Immediately flag high-priority emails",
        color: "#f59e0b"
      },
      {
        id: "morning-context",
        type: "action", 
        title: "Morning Context",
        time: "Morning",
        icon: "🌅",
        inputs: ["Calendar", "Email Context"],
        description: "Prepare daily briefing materials",
        color: "#f43f5e"
      },
      {
        id: "feed-george",
        type: "output",
        title: "Feed to George",
        icon: "🦾", 
        outputs: ["George Brief"],
        description: "Provide calendar and email context for briefing",
        color: "#6366f1"
      },
      {
        id: "crm-queries",
        type: "action",
        title: "CRM Queries",
        subtitle: "Ongoing",
        icon: "💬",
        description: "Handle contact and relationship queries", 
        color: "#f43f5e"
      },
      {
        id: "crm-ingestion",
        type: "action",
        title: "Daily CRM Ingestion",
        time: "10:00 PM",
        icon: "📊",
        inputs: ["3 Gmail Accounts"],
        outputs: ["crm/contacts.json"],
        description: "Scan emails for new contacts and updates",
        color: "#f43f5e"
      },
      {
        id: "weekly-report", 
        type: "action",
        title: "Weekly Validator Report",
        time: "Monday 9AM",
        icon: "📈",
        description: "Generate weekly performance and activity report",
        color: "#10b981"
      },
      {
        id: "calendar-management",
        type: "action",
        title: "Calendar Management",
        subtitle: "Ongoing", 
        icon: "📅",
        description: "Coordinate schedules and meetings",
        color: "#f43f5e"
      }
    ]
  }
};

// --- Timeline Step Component ---
function TimelineStep({ step, isLast }: {
  step: TimelineStep;
  isLast: boolean;
}) {
  const getStepIcon = () => {
    switch (step.type) {
      case "trigger": return "⚡";
      case "action": return step.icon;
      case "data": return "📄";
      case "decision": return "⚖️";
      case "output": return "📤";
      default: return step.icon;
    }
  };

  const getStepColor = () => {
    switch (step.type) {
      case "trigger": return "bg-yellow-500/10 border-yellow-400/30 text-yellow-200";
      case "action": return `bg-${step.color}/10 border-${step.color}/30 text-white`;
      case "data": return "bg-cyan-500/10 border-cyan-400/30 text-cyan-200";
      case "decision": return "bg-amber-500/10 border-amber-400/30 text-amber-200";
      case "output": return "bg-purple-500/10 border-purple-400/30 text-purple-200";
      default: return "bg-gray-500/10 border-gray-400/30 text-gray-200";
    }
  };

  return (
    <div className="flex items-start gap-4 group">
      {/* Timeline Connector */}
      <div className="flex flex-col items-center">
        {/* Step Icon */}
        <div className={`
          w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg
          transition-all duration-200 group-hover:scale-110
          ${getStepColor()}
        `}>
          {getStepIcon()}
        </div>
        
        {/* Connecting Line */}
        {!isLast && (
          <div className="w-0.5 h-16 bg-gradient-to-b from-slate-600 to-slate-700 mt-2" />
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-white text-lg">{step.title}</h3>
            {step.subtitle && (
              <p className="text-slate-400 text-sm">{step.subtitle}</p>
            )}
            {step.time && (
              <p className="text-emerald-400 text-sm font-medium">
                🕐 {convertPSTToLocal(step.time)}
              </p>
            )}
          </div>
          <div className={`
            px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide
            ${getStepColor()}
          `}>
            {step.type}
          </div>
        </div>

        {/* Description */}
        {step.description && (
          <p className="text-slate-300 text-sm mb-3">{step.description}</p>
        )}

        {/* Inputs/Outputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Inputs */}
          {step.inputs && step.inputs.length > 0 && (
            <div>
              <h4 className="text-slate-400 font-medium mb-1 flex items-center gap-1">
                📥 Inputs
              </h4>
              <ul className="space-y-1">
                {step.inputs.map((input, i) => (
                  <li key={i} className="text-slate-300 flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                    {input}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Outputs */}
          {step.outputs && step.outputs.length > 0 && (
            <div>
              <h4 className="text-slate-400 font-medium mb-1 flex items-center gap-1">
                📤 Outputs
              </h4>
              <ul className="space-y-1">
                {step.outputs.map((output, i) => (
                  <li key={i} className="text-slate-300 flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                    {output}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Discord Channel */}
        {step.discordChannel && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-indigo-400">💬</span>
            <span className="text-slate-300">Posts to:</span>
            <span className="text-indigo-300 font-medium">{step.discordChannel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Component ---
export default function AgentWorkflowView({ 
  agentName, 
  onBack 
}: { 
  agentName: string; 
  onBack: () => void; 
}) {
  const timeline = AGENT_TIMELINES[agentName];
  
  if (!timeline) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <h2 className="text-xl text-slate-400 mb-4">Workflow not found for {agentName}</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          ← Back to Team
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start gap-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          ← Back to Team
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl">{timeline.emoji}</span>
            <div>
              <h1 className="text-3xl font-bold text-white">{timeline.name}</h1>
              <p className="text-slate-400 text-lg">{timeline.role}</p>
            </div>
          </div>
          <p className="text-slate-300 text-base leading-relaxed">
            {timeline.description}
          </p>
        </div>
      </div>

      {/* Workflow Timeline */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8">
        <div className="space-y-0">
          {timeline.steps.map((step, index) => (
            <TimelineStep
              key={step.id}
              step={step}
              isLast={index === timeline.steps.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 bg-slate-900/30 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          {[
            { type: "trigger", color: "yellow", icon: "⚡", label: "Triggers" },
            { type: "action", color: "blue", icon: "🔧", label: "Actions" },
            { type: "data", color: "cyan", icon: "📄", label: "Data Files" },
            { type: "decision", color: "amber", icon: "⚖️", label: "Decisions" },
            { type: "output", color: "purple", icon: "📤", label: "Outputs" }
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <span className="text-lg">{item.icon}</span>
              <span className="text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}