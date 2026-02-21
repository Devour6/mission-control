"use client";

import { useState, useEffect } from "react";
import { TeamData } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";
import PriceWidget from "./PriceWidget";

// --- Timezone Conversion Helper ---
function convertPSTToLocal(pstTime: string): string {
  // Handle non-time strings
  if (!pstTime || pstTime.toLowerCase().includes('every') || pstTime.toLowerCase().includes('hourly') || pstTime.toLowerCase().includes('ongoing')) {
    return pstTime;
  }

  // Parse standard time format like "11:00 PM" or "4:00 AM" or "8:00 AM" or "7:45 AM"
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

// --- Health Status Helper ---
function getHealthStatus(timeStr: string): 'green' | 'yellow' | 'red' {
  try {
    // Parse time format like "11:56 AM" and assume it's today's time
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 'red';
    
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    // Convert to 24-hour format
    let h24 = hours;
    if (period === 'PM' && h24 !== 12) h24 += 12;
    if (period === 'AM' && h24 === 12) h24 = 0;
    
    // Create date object for today with parsed time
    const actionTime = new Date();
    actionTime.setHours(h24, minutes, 0, 0);
    
    const now = new Date();
    const diffMs = now.getTime() - actionTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 4) return 'green';
    if (diffHours < 12) return 'yellow';
    return 'red';
  } catch {
    return 'red';
  }
}

// --- Types ---
interface LiveAction { 
  id: string; 
  agent: string; 
  agentEmoji: string; 
  action: string; 
  time: string; 
  color: string 
}

interface AgentInfo {
  name: string;
  title: string;
  emoji: string;
  status: "active" | "coming_soon";
  color: string;
}

// --- Main Component ---
export default function OfficeTab() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [liveActions, setLiveActions] = useState<LiveAction[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [mounted, setMounted] = useState(false);

  // Initialize agents from team data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamData, actionsData] = await Promise.all([
          fetchData<TeamData>("team.json"),
          fetchData<LiveAction[]>("live-actions.json").catch(() => [])
        ]);
        
        setTeam(teamData);
        setLiveActions(actionsData);
        
        // Build agent list
        const agentList: AgentInfo[] = [];
        
        // Add George (Chief of Staff)
        agentList.push({
          name: "George",
          title: "Chief of Staff", 
          emoji: "🦾",
          status: "active",
          color: "#6366f1"
        });
        
        // Add division members
        Object.values(teamData.org.divisions).forEach((division) => {
          division.members.forEach((member) => {
            agentList.push({
              name: member.name,
              title: member.title,
              emoji: member.emoji,
              status: member.status as "active" | "coming_soon",
              color: getAgentColor(member.name)
            });
          });
        });
        
        setAgents(agentList);
        setMounted(true);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    
    loadData();
  }, []);

  // Poll live actions every 15 seconds
  useEffect(() => {
    if (!mounted) return;
    
    const interval = setInterval(async () => {
      try {
        const actionsData = await fetchData<LiveAction[]>("live-actions.json");
        setLiveActions(actionsData);
      } catch (error) {
        console.error("Failed to poll live actions:", error);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted || !team) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#8b8fa3]">Loading...</div>
      </div>
    );
  }

  const activeAgents = agents.filter(a => a.status === "active");
  
  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-7xl mx-auto">
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#e4e6ed]">🏢 The Office</h2>
          <p className="text-xs md:text-sm text-[#8b8fa3] mt-1">
            {activeAgents.length} agents online
          </p>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => {
            const liveAction = liveActions.find(a => a.agent === agent.name);
            const healthStatus = liveAction ? getHealthStatus(liveAction.time) : 'red';
            const healthColor = healthStatus === 'green' ? 'bg-green-500' : 
                               healthStatus === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';
            
            return (
              <div 
                key={agent.name}
                className={`
                  bg-[#1a1d27] border border-[#2e3345] rounded-xl p-4 
                  ${agent.status === "coming_soon" ? "opacity-50" : ""}
                `}
                style={{
                  borderLeftColor: agent.color,
                  borderLeftWidth: '4px'
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{agent.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#e4e6ed] truncate">
                        {agent.name}
                      </h3>
                      <div 
                        className={`w-2 h-2 rounded-full ${healthColor} shrink-0`}
                        title={
                          healthStatus === 'green' ? 'Active (< 4h)' :
                          healthStatus === 'yellow' ? 'Stale (4-12h)' : 'Offline (> 12h)'
                        }
                      />
                    </div>
                    <p className="text-xs text-[#8b8fa3] mb-2 truncate">
                      {agent.title}
                    </p>
                    
                    {agent.status === "coming_soon" ? (
                      <div className="text-xs text-[#8b8fa3]">Coming Soon</div>
                    ) : (
                      <>
                        <div className="text-sm text-[#e4e6ed] mb-1 break-words">
                          {liveAction?.action || "No recent activity"}
                        </div>
                        {liveAction && (
                          <div className="text-xs text-[#8b8fa3]">
                            {convertPSTToLocal(liveAction.time)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar — Price Widget + Live Actions */}
      <div className="w-full xl:w-64 shrink-0">
        <div className="space-y-6">
          {/* Price Widget */}
          <div className="xl:sticky xl:top-8">
            <PriceWidget />
          </div>
          
          {/* Live Actions */}
          <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden xl:sticky xl:top-[calc(2rem+280px)]">
            <div className="px-3 py-2.5 border-b border-[#2e3345] flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <h3 className="text-xs font-semibold text-[#e4e6ed]">Live Actions</h3>
            </div>
            <div className="max-h-[250px] xl:max-h-[500px] overflow-y-auto">
              {liveActions.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#8b8fa3]">No recent activity</div>
              ) : (
                <div className="divide-y divide-[#2e3345]">
                  {liveActions.map(action => {
                    const healthStatus = getHealthStatus(action.time);
                    const healthColor = healthStatus === 'green' ? 'bg-green-500' : 
                                       healthStatus === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';
                    
                    return (
                      <div key={action.id} className="px-3 py-2.5 hover:bg-[#242836] transition-colors">
                        <div className="flex items-start gap-2">
                          <span className="text-sm mt-0.5">{action.agentEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-[#e4e6ed] break-words">
                                <span className="font-semibold" style={{ color: action.color }}>
                                  {action.agent}
                                </span>
                                {" — "}{action.action}
                              </p>
                              <div className={`w-2 h-2 rounded-full ${healthColor} shrink-0`} title={
                                healthStatus === 'green' ? 'Active (< 4h)' :
                                healthStatus === 'yellow' ? 'Stale (4-12h)' : 'Offline (> 12h)'
                              }></div>
                            </div>
                            <p className="text-[10px] text-[#8b8fa3] mt-0.5">
                              {convertPSTToLocal(action.time)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Functions ---
function getAgentColor(name: string): string {
  const colors: Record<string, string> = {
    George: "#6366f1",
    Dwight: "#a855f7",
    Kelly: "#ec4899", 
    Rachel: "#3b82f6",
    John: "#10b981",
    Ross: "#f59e0b",
    Pam: "#f472b6",
    Stanley: "#8b5cf6"
  };
  return colors[name] || "#6b7280";
}