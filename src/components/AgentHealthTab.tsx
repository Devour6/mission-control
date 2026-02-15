"use client";

import { useState, useEffect } from "react";

interface AgentStatus {
  name: string;
  file: string;
  lastUpdated: string;
  status: 'green' | 'yellow' | 'red';
  error?: string;
}

export default function AgentHealthTab() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAgentHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agent-health');
      const data = await response.json();
      setAgents(data.agents || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch agent health:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentHealth();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAgentHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'green': return 'Active (< 4h)';
      case 'yellow': return 'Stale (4-12h)';
      case 'red': return 'Offline (> 12h)';
      default: return 'Unknown';
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffHours * 60);
        return `${diffMinutes}m ago`;
      } else if (diffHours < 24) {
        return `${Math.floor(diffHours)}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
      }
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agent Health Dashboard</h1>
            <p className="text-[#8b8fa3] mt-1">Monitor agent output and activity status</p>
          </div>
        </div>
        
        <div className="bg-[#1e2130] border border-[#2e3345] rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
            <span className="ml-3 text-[#8b8fa3]">Loading agent status...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Health Dashboard</h1>
          <p className="text-[#8b8fa3] mt-1">Monitor agent output and activity status</p>
        </div>
        <button 
          onClick={fetchAgentHealth}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="text-xs text-[#8b8fa3] mb-4">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

      <div className="grid gap-4">
        {agents.map((agent) => (
          <div key={agent.name} className="bg-[#1e2130] border border-[#2e3345] rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`}></div>
                <div>
                  <h3 className="font-semibold text-lg">{agent.name}</h3>
                  <p className="text-sm text-[#8b8fa3]">{agent.file}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  agent.status === 'green' ? 'text-green-400' :
                  agent.status === 'yellow' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {getStatusText(agent.status)}
                </div>
                <div className="text-xs text-[#8b8fa3] mt-1">
                  {agent.lastUpdated ? formatTime(agent.lastUpdated) : 'Never'}
                </div>
              </div>
            </div>
            {agent.error && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                Error: {agent.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="bg-[#1e2130] border border-[#2e3345] rounded-lg p-6 text-center">
          <p className="text-[#8b8fa3]">No agent data available</p>
        </div>
      )}

      <div className="bg-[#1e2130] border border-[#2e3345] rounded-lg p-4">
        <h3 className="font-medium mb-2">Status Indicators</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-green-400">Green:</span>
            <span className="text-[#8b8fa3]">File updated within 4 hours</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-yellow-400">Yellow:</span>
            <span className="text-[#8b8fa3]">File updated 4-12 hours ago</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-red-400">Red:</span>
            <span className="text-[#8b8fa3]">File updated more than 12 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}