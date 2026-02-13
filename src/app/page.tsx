"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";

const MemoryTab = dynamic(() => import("@/components/MemoryTab"), { ssr: false });
const TasksTab = dynamic(() => import("@/components/TasksTab"), { ssr: false });
const CalendarTab = dynamic(() => import("@/components/CalendarTab"), { ssr: false });
const WalletTab = dynamic(() => import("@/components/WalletTab"), { ssr: false });

export default function Home() {
  const [tab, setTab] = useState("memory");

  return (
    <div className="flex min-h-screen">
      <Sidebar active={tab} onNavigate={setTab} />
      <main className="flex-1 p-8 overflow-auto">
        {tab === "memory" && <MemoryTab />}
        {tab === "tasks" && <TasksTab />}
        {tab === "calendar" && <CalendarTab />}
        {tab === "wallet" && <WalletTab />}
      </main>
    </div>
  );
}
