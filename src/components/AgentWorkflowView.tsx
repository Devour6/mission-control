"use client";

import { useState } from "react";

// --- Timezone Conversion Helper ---
function convertPSTToLocal(pstTime: string): string {
  // Handle non-time strings
  if (!pstTime || pstTime.toLowerCase().includes('every') || pstTime.toLowerCase().includes('hourly') || pstTime.toLowerCase().includes('ongoing')) {
    return pstTime;
  }

  // Handle "Morning" and other descriptive times
  if (pstTime.toLowerCase().includes('morning') && !pstTime.includes(':')) {
    return pstTime;
  }

  // Handle "Mon 9AM" format
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

  // Parse standard time format like "11:00 PM" or "4:00 AM" or "8:00 AM"
  const timeMatch = pstTime.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);
  if (!timeMatch) {
    return pstTime; // Return original if format doesn't match
  }

  const hours = parseInt(timeMatch[1]);
  const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
  const period = timeMatch[3].toUpperCase();
  
  // Convert to 24-hour format
  let h = hours;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;

  // Create a Date object representing this time in PST
  // Using a fixed date (2026-02-14) and PST offset (-08:00)
  const pstDateString = `2026-02-14T${String(h).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00-08:00`;
  const date = new Date(pstDateString);
  
  // Convert to user's local timezone
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
}

// --- Types ---
interface WorkflowNode {
  id: string;
  type: "action" | "decision" | "data" | "discord";
  label: string;
  time?: string;
  icon?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface WorkflowConnection {
  from: string;
  to: string;
  label?: string;
  color?: string;
  points?: { x: number; y: number }[];
}

interface AgentWorkflow {
  name: string;
  emoji: string;
  color: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

// --- Workflow Data ---
const WORKFLOWS: Record<string, AgentWorkflow> = {
  George: {
    name: "George",
    emoji: "🦾",
    color: "#6366f1",
    nodes: [
      { id: "morning-brief", type: "action", label: "Morning Briefing", time: "8:00 AM", icon: "📋", x: 50, y: 50 },
      { id: "dwight-intel", type: "data", label: "DAILY-INTEL.md", x: 250, y: 30, width: 120 },
      { id: "pam-cal", type: "data", label: "Calendar Context", x: 250, y: 70, width: 120 },
      { id: "brandon-brief", type: "discord", label: "Send to Brandon", x: 450, y: 50, width: 110 },
      { id: "morning-auto", type: "action", label: "Morning Autonomous Work", time: "10:00 AM", icon: "⚡", x: 50, y: 150 },
      { id: "midday-standup", type: "action", label: "Midday Standup", time: "12:00 PM", icon: "👥", x: 50, y: 220 },
      { id: "afternoon-auto", type: "action", label: "Afternoon Autonomous Work", time: "3:00 PM", icon: "⚡", x: 50, y: 290 },
      { id: "afternoon-standup", type: "action", label: "Afternoon Standup", time: "4:00 PM", icon: "👥", x: 50, y: 360 },
      { id: "evening-standup", type: "action", label: "Evening Standup", time: "8:00 PM", icon: "🌙", x: 50, y: 430 },
      { id: "late-standup", type: "action", label: "Late Night Standup", time: "11:00 PM", icon: "🌚", x: 50, y: 500 },
      { id: "early-standup", type: "action", label: "Early Morning Standup", time: "4:00 AM", icon: "🌅", x: 50, y: 570 },
      { id: "john-review", type: "decision", label: "Review John's Trades", x: 300, y: 200, width: 140 },
      { id: "high-conviction", type: "decision", label: "HIGH conviction?", x: 500, y: 200, width: 140 },
      { id: "execute-trade", type: "action", label: "Execute via Solana CLI", icon: "💸", x: 650, y: 150 },
      { id: "log-trade", type: "data", label: "Trade Log", x: 800, y: 150, width: 100 },
    ],
    connections: [
      { from: "morning-brief", to: "dwight-intel", color: "#a855f7" },
      { from: "morning-brief", to: "pam-cal", color: "#f43f5e" },
      { from: "dwight-intel", to: "brandon-brief" },
      { from: "pam-cal", to: "brandon-brief" },
      { from: "john-review", to: "high-conviction", label: "proposals" },
      { from: "high-conviction", to: "execute-trade", label: "YES", color: "#10b981" },
      { from: "execute-trade", to: "log-trade" },
    ]
  },
  
  Dwight: {
    name: "Dwight",
    emoji: "🔍",
    color: "#a855f7",
    nodes: [
      { id: "morning-sweep", type: "action", label: "Morning Sweep", time: "7:30 AM", icon: "🔍", x: 50, y: 50 },
      { id: "intel-write", type: "data", label: "DAILY-INTEL.md", x: 250, y: 50, width: 140 },
      { id: "research-post", type: "discord", label: "#research Discord", x: 450, y: 50, width: 130 },
      { id: "feeds-kelly", type: "action", label: "Feeds Kelly", icon: "🐦", x: 250, y: 120, width: 100 },
      { id: "feeds-rachel", type: "action", label: "Feeds Rachel", icon: "💼", x: 370, y: 120, width: 100 },
      { id: "feeds-john", type: "action", label: "Feeds John", icon: "📈", x: 250, y: 180, width: 100 },
      { id: "feeds-george", type: "action", label: "Feeds George", icon: "🦾", x: 370, y: 180, width: 100 },
      { id: "midday-sweep", type: "action", label: "Midday Sweep", time: "1:00 PM", icon: "🔍", x: 50, y: 250 },
      { id: "intel-update", type: "data", label: "Update DAILY-INTEL.md", x: 250, y: 250, width: 160 },
      { id: "midday-post", type: "discord", label: "#research Discord", x: 450, y: 250, width: 130 },
      { id: "evening-sweep", type: "action", label: "Evening Sweep", time: "6:00 PM", icon: "🔍", x: 50, y: 350 },
      { id: "evening-intel", type: "data", label: "Evening Market Snapshot", x: 250, y: 350, width: 180 },
      { id: "evening-post", type: "discord", label: "#research Discord", x: 450, y: 350, width: 130 },
    ],
    connections: [
      { from: "morning-sweep", to: "intel-write" },
      { from: "intel-write", to: "research-post" },
      { from: "intel-write", to: "feeds-kelly", color: "#ec4899" },
      { from: "intel-write", to: "feeds-rachel", color: "#3b82f6" },
      { from: "intel-write", to: "feeds-john", color: "#10b981" },
      { from: "intel-write", to: "feeds-george", color: "#6366f1" },
      { from: "midday-sweep", to: "intel-update" },
      { from: "intel-update", to: "midday-post" },
      { from: "evening-sweep", to: "evening-intel" },
      { from: "evening-intel", to: "evening-post" },
    ]
  },

  Kelly: {
    name: "Kelly",
    emoji: "🐦",
    color: "#ec4899",
    nodes: [
      { id: "read-intel", type: "data", label: "Read DAILY-INTEL.md", x: 50, y: 50, width: 150 },
      { id: "check-feedback", type: "data", label: "content-feedback.json", x: 50, y: 120, width: 160 },
      { id: "morning-drafts", type: "action", label: "Morning Drafts", time: "9:00 AM", icon: "✍️", x: 300, y: 50 },
      { id: "drafts-file", type: "data", label: "drafts/x/YYYY-MM-DD.md", x: 500, y: 50, width: 170 },
      { id: "x-drafts-post", type: "discord", label: "#x-drafts Discord", x: 720, y: 50, width: 130 },
      { id: "midday-drafts", type: "action", label: "Midday Drafts", time: "1:30 PM", icon: "✍️", x: 300, y: 150 },
      { id: "brandon-review", type: "action", label: "Brandon Reviews", icon: "👑", x: 300, y: 220, width: 120 },
      { id: "feedback-sync", type: "action", label: "Feedback Sync", icon: "🔄", x: 500, y: 220, width: 110 },
      { id: "evening-drafts", type: "action", label: "Evening Drafts", time: "5:00 PM", icon: "✍️", x: 300, y: 290 },
      { id: "performance", type: "action", label: "Performance Review", icon: "📊", x: 500, y: 290, width: 130 },
    ],
    connections: [
      { from: "read-intel", to: "morning-drafts", color: "#a855f7", label: "intel data" },
      { from: "check-feedback", to: "morning-drafts", label: "feedback" },
      { from: "morning-drafts", to: "drafts-file" },
      { from: "drafts-file", to: "x-drafts-post" },
      { from: "midday-drafts", to: "drafts-file" },
      { from: "brandon-review", to: "feedback-sync", label: "approve/deny" },
      { from: "feedback-sync", to: "check-feedback", label: "every 15min" },
      { from: "evening-drafts", to: "performance" },
    ]
  },

  Rachel: {
    name: "Rachel",
    emoji: "💼",
    color: "#3b82f6",
    nodes: [
      { id: "read-intel", type: "data", label: "Read DAILY-INTEL.md", x: 50, y: 50, width: 150 },
      { id: "check-feedback", type: "data", label: "content-feedback.json", x: 50, y: 120, width: 160 },
      { id: "morning-drafts", type: "action", label: "Morning Drafts", time: "9:00 AM", icon: "✍️", x: 300, y: 50 },
      { id: "linkedin-drafts-file", type: "data", label: "drafts/linkedin/YYYY-MM-DD.md", x: 500, y: 50, width: 200 },
      { id: "linkedin-post", type: "discord", label: "#linkedin-drafts Discord", x: 750, y: 50, width: 150 },
      { id: "midday-drafts", type: "action", label: "Midday Drafts", time: "1:30 PM", icon: "✍️", x: 300, y: 150 },
      { id: "evening-drafts", type: "action", label: "Evening Drafts", time: "5:00 PM", icon: "✍️", x: 300, y: 220 },
      { id: "daily-review", type: "action", label: "Daily Review", icon: "📝", x: 500, y: 220, width: 110 },
      { id: "live-posting", type: "action", label: "Live Posting", icon: "📡", x: 300, y: 320, width: 110 },
      { id: "tue-thu", type: "action", label: "Tuesdays & Thursdays", icon: "📅", x: 500, y: 320, width: 150 },
    ],
    connections: [
      { from: "read-intel", to: "morning-drafts", color: "#a855f7", label: "intel data" },
      { from: "check-feedback", to: "morning-drafts", label: "feedback" },
      { from: "morning-drafts", to: "linkedin-drafts-file" },
      { from: "linkedin-drafts-file", to: "linkedin-post" },
      { from: "midday-drafts", to: "linkedin-drafts-file" },
      { from: "evening-drafts", to: "daily-review" },
      { from: "live-posting", to: "tue-thu", label: "2x/week" },
    ]
  },

  John: {
    name: "John",
    emoji: "📈",
    color: "#10b981",
    nodes: [
      { id: "market-scan", type: "action", label: "Market Scan", time: "Every 2h", icon: "🔄", x: 50, y: 50 },
      { id: "george-trigger", type: "action", label: "Triggered by George", icon: "🦾", x: 250, y: 30, width: 140 },
      { id: "coingecko", type: "data", label: "CoinGecko Pro API", x: 250, y: 80, width: 140 },
      { id: "analysis", type: "action", label: "Full Analysis", icon: "📊", x: 450, y: 50, width: 110 },
      { id: "proposals", type: "data", label: "proposals/YYYY-MM-DD.md", x: 600, y: 50, width: 180 },
      { id: "george-review", type: "decision", label: "George Auto-Review", x: 450, y: 150, width: 150 },
      { id: "position-check", type: "decision", label: "Position < 15%?", x: 650, y: 150, width: 130 },
      { id: "execute", type: "action", label: "Execute Trade", icon: "💸", x: 450, y: 250, width: 110 },
      { id: "trade-log", type: "data", label: "Trade Log", x: 600, y: 250, width: 100 },
      { id: "discord-post", type: "discord", label: "#trades Discord", x: 750, y: 250, width: 120 },
    ],
    connections: [
      { from: "market-scan", to: "george-trigger", color: "#6366f1" },
      { from: "market-scan", to: "coingecko" },
      { from: "coingecko", to: "analysis" },
      { from: "analysis", to: "proposals" },
      { from: "proposals", to: "george-review", color: "#6366f1" },
      { from: "george-review", to: "position-check", label: "verify prices" },
      { from: "position-check", to: "execute", label: "YES", color: "#10b981" },
      { from: "execute", to: "trade-log" },
      { from: "trade-log", to: "discord-post" },
    ]
  },

  Ross: {
    name: "Ross",
    emoji: "⚙️",
    color: "#f97316",
    nodes: [
      { id: "receive-tasks", type: "data", label: "tasks.md from George", x: 50, y: 50, width: 150 },
      { id: "plan-approach", type: "action", label: "Plan Approach", icon: "🧠", x: 250, y: 50, width: 120 },
      { id: "sonnet4", type: "action", label: "Sonnet 4 Brain", icon: "🤖", x: 400, y: 30, width: 120 },
      { id: "codex-cli", type: "action", label: "Build with Codex CLI", icon: "🛠️", x: 250, y: 120, width: 140 },
      { id: "test-deploy", type: "action", label: "Test & Deploy", icon: "🚀", x: 450, y: 120, width: 120 },
      { id: "vercel", type: "data", label: "Vercel Deployment", x: 600, y: 120, width: 140 },
      { id: "live-links", type: "action", label: "Report Live Links", icon: "🔗", x: 250, y: 220, width: 130 },
      { id: "george-review", type: "action", label: "George Reviews", icon: "🦾", x: 450, y: 220, width: 120 },
    ],
    connections: [
      { from: "receive-tasks", to: "plan-approach", color: "#6366f1" },
      { from: "plan-approach", to: "sonnet4" },
      { from: "plan-approach", to: "codex-cli" },
      { from: "codex-cli", to: "test-deploy" },
      { from: "test-deploy", to: "vercel" },
      { from: "vercel", to: "live-links" },
      { from: "live-links", to: "george-review", color: "#6366f1" },
    ]
  },

  Pam: {
    name: "Pam",
    emoji: "📋",
    color: "#f43f5e",
    nodes: [
      { id: "email-monitor", type: "action", label: "Urgent Email Monitor", time: "Hourly", icon: "📧", x: 50, y: 50 },
      { id: "three-inboxes", type: "data", label: "3 Email Inboxes", x: 250, y: 50, width: 130 },
      { id: "alert-brandon", type: "action", label: "Alert Brandon if Urgent", icon: "🚨", x: 450, y: 50, width: 160 },
      { id: "morning-context", type: "action", label: "Morning Context", time: "Morning", icon: "🌅", x: 50, y: 150 },
      { id: "calendar-data", type: "data", label: "Calendar + Email Context", x: 250, y: 150, width: 170 },
      { id: "george-brief", type: "action", label: "Feed to George", icon: "🦾", x: 450, y: 150, width: 120 },
      { id: "crm-queries", type: "action", label: "CRM Queries", time: "Ongoing", icon: "💬", x: 50, y: 250 },
      { id: "crm-ingestion", type: "action", label: "Daily CRM Ingestion", time: "10:00 PM", icon: "📊", x: 50, y: 320 },
      { id: "scan-gmail", type: "data", label: "Scan 3 Gmail Accounts", x: 250, y: 320, width: 160 },
      { id: "crm-json", type: "data", label: "crm/contacts.json", x: 450, y: 320, width: 130 },
      { id: "weekly-report", type: "action", label: "Weekly Validator Report", time: "Mon 9AM", icon: "📈", x: 50, y: 420 },
    ],
    connections: [
      { from: "email-monitor", to: "three-inboxes" },
      { from: "three-inboxes", to: "alert-brandon" },
      { from: "morning-context", to: "calendar-data" },
      { from: "calendar-data", to: "george-brief", color: "#6366f1" },
      { from: "crm-ingestion", to: "scan-gmail" },
      { from: "scan-gmail", to: "crm-json" },
    ]
  }
};

// --- Components ---
function WorkflowNode({ node, isSelected, onClick }: {
  node: WorkflowNode;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const getNodeStyle = () => {
    const baseStyles = {
      position: "absolute" as const,
      left: node.x,
      top: node.y,
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.2s ease",
      zIndex: isSelected ? 10 : 5,
    };

    const width = node.width || 160;
    const height = node.height || 60;

    switch (node.type) {
      case "decision":
        return {
          ...baseStyles,
          width,
          height,
          transform: "rotate(45deg)",
        };
      case "data":
        return {
          ...baseStyles,
          width,
          height: height * 0.8,
        };
      case "discord":
        return {
          ...baseStyles,
          width,
          height: height * 0.9,
        };
      default: // action
        return {
          ...baseStyles,
          width,
          height,
        };
    }
  };

  const getNodeContent = () => {
    const width = node.width || 160;
    const height = node.height || 60;
    
    const baseClasses = `
      flex flex-col items-center justify-center text-center p-3
      border transition-all duration-200 text-white/90 text-sm font-medium
      ${isSelected ? "ring-2 ring-blue-400/50" : ""}
      ${onClick ? "hover:scale-105 hover:shadow-lg" : ""}
    `;

    switch (node.type) {
      case "decision":
        return (
          <div
            className={`${baseClasses} bg-amber-500/10 border-amber-400/30 transform -rotate-45`}
            style={{ width, height }}
            onClick={onClick}
          >
            <div className="transform rotate-45 text-xs leading-tight">
              <div className="font-semibold">{node.label}</div>
            </div>
          </div>
        );
      
      case "data":
        return (
          <div
            className={`${baseClasses} bg-cyan-500/10 border-cyan-400/30 rounded-lg relative overflow-hidden`}
            style={{ width, height: height * 0.8 }}
            onClick={onClick}
          >
            <div className="absolute top-1 right-1 text-cyan-400/60 text-xs">📄</div>
            <div className="text-xs leading-tight">
              <div className="font-semibold text-cyan-200">{node.label}</div>
            </div>
          </div>
        );
      
      case "discord":
        return (
          <div
            className={`${baseClasses} bg-indigo-500/10 border-indigo-400/30 rounded-2xl relative`}
            style={{ width, height: height * 0.9 }}
            onClick={onClick}
          >
            <div className="absolute top-1 right-2 text-indigo-400/60 text-xs">💬</div>
            <div className="text-xs leading-tight">
              <div className="font-semibold text-indigo-200">{node.label}</div>
            </div>
          </div>
        );
      
      default: // action
        return (
          <div
            className={`${baseClasses} bg-emerald-500/10 border-emerald-400/30 rounded-xl`}
            style={{ width, height }}
            onClick={onClick}
          >
            {node.icon && (
              <div className="text-lg mb-1">{node.icon}</div>
            )}
            <div className="text-xs leading-tight">
              <div className="font-semibold">{node.label}</div>
              {node.time && (
                <div className="text-emerald-300/70 text-[10px] mt-1">{convertPSTToLocal(node.time)}</div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div style={getNodeStyle()}>
      {getNodeContent()}
    </div>
  );
}

function WorkflowConnections({ workflow }: { workflow: AgentWorkflow }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {workflow.connections.map((conn, i) => {
        const fromNode = workflow.nodes.find(n => n.id === conn.from);
        const toNode = workflow.nodes.find(n => n.id === conn.to);
        
        if (!fromNode || !toNode) return null;

        // Calculate connection points
        const fromX = fromNode.x + (fromNode.width || 160) / 2;
        const fromY = fromNode.y + (fromNode.height || 60);
        const toX = toNode.x + (toNode.width || 160) / 2;
        const toY = toNode.y;

        // Simple curved path
        const midX = (fromX + toX) / 2;
        const midY = fromY + (toY - fromY) / 2;
        const curve = Math.abs(toX - fromX) > 100 ? 40 : 20;

        const color = conn.color || "#64748b";

        return (
          <g key={`conn-${i}`}>
            <path
              d={`M ${fromX} ${fromY} Q ${midX} ${midY - curve} ${toX} ${toY}`}
              fill="none"
              stroke={color}
              strokeWidth="2"
              opacity="0.7"
              markerEnd="url(#arrowhead)"
            />
            {conn.label && (
              <text
                x={midX}
                y={midY - curve - 10}
                fill={color}
                fontSize="10"
                textAnchor="middle"
                className="font-medium"
              >
                {conn.label}
              </text>
            )}
          </g>
        );
      })}
      
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#64748b"
            opacity="0.7"
          />
        </marker>
      </defs>
    </svg>
  );
}

export default function AgentWorkflowView({ 
  agentName, 
  onBack 
}: { 
  agentName: string; 
  onBack: () => void; 
}) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const workflow = WORKFLOWS[agentName];
  
  if (!workflow) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl text-[#8b8fa3] mb-4">Workflow not found for {agentName}</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#2e3345] text-white rounded-lg hover:bg-[#3a3d4a] transition-colors"
        >
          ← Back to Team
        </button>
      </div>
    );
  }

  // Calculate diagram dimensions
  const maxX = Math.max(...workflow.nodes.map(n => n.x + (n.width || 160)));
  const maxY = Math.max(...workflow.nodes.map(n => n.y + (n.height || 60)));
  const diagramWidth = maxX + 100;
  const diagramHeight = maxY + 100;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 bg-[#2e3345] text-white rounded-lg hover:bg-[#3a3d4a] transition-colors"
        >
          ← Back to Team
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">{workflow.emoji}</span>
            {workflow.name} — Workflow
          </h1>
          <p className="text-[#8b8fa3] mt-1">Daily operations and data flow</p>
        </div>
      </div>

      {/* Workflow Diagram */}
      <div className="bg-[#0a0c10] border border-[#2e3345] rounded-xl overflow-auto">
        <div 
          className="relative"
          style={{ 
            width: diagramWidth,
            height: diagramHeight,
            minHeight: "600px"
          }}
        >
          <WorkflowConnections workflow={workflow} />
          
          {workflow.nodes.map((node) => (
            <WorkflowNode
              key={node.id}
              node={node}
              isSelected={selectedNode === node.id}
              onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-500/20 border border-emerald-400/30 rounded"></div>
          <span className="text-[#8b8fa3]">Action/Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500/20 border border-amber-400/30 transform rotate-45"></div>
          <span className="text-[#8b8fa3]">Decision</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-cyan-500/20 border border-cyan-400/30 rounded"></div>
          <span className="text-[#8b8fa3]">Data File</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-indigo-500/20 border border-indigo-400/30 rounded-lg"></div>
          <span className="text-[#8b8fa3]">Discord Post</span>
        </div>
      </div>

      {/* Mobile scroll hint */}
      <div className="mt-4 text-center text-xs text-[#8b8fa3] md:hidden">
        💡 Scroll horizontally to explore the full workflow
      </div>
    </div>
  );
}