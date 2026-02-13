"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";

const MemoryTab = dynamic(() => import("@/components/MemoryTab"), { ssr: false });
const TasksTab = dynamic(() => import("@/components/TasksTab"), { ssr: false });
const CalendarTab = dynamic(() => import("@/components/CalendarTab"), { ssr: false });
const WalletTab = dynamic(() => import("@/components/WalletTab"), { ssr: false });
const ApprovalsTab = dynamic(() => import("@/components/ApprovalsTab"), { ssr: false });
const ContentTab = dynamic(() => import("@/components/ContentTab"), { ssr: false });
const CouncilTab = dynamic(() => import("@/components/CouncilTab"), { ssr: false });
const ProjectsTab = dynamic(() => import("@/components/ProjectsTab"), { ssr: false });
const DocsTab = dynamic(() => import("@/components/DocsTab"), { ssr: false });
const TeamTab = dynamic(() => import("@/components/TeamTab"), { ssr: false });
const OfficeTab = dynamic(() => import("@/components/OfficeTab"), { ssr: false });

export default function Home() {
  const [tab, setTab] = useState("office");

  return (
    <div className="flex min-h-screen">
      <Sidebar active={tab} onNavigate={setTab} />
      {/* pt-16 on mobile for fixed top bar, p-8 on desktop */}
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-auto min-w-0">
        {tab === "tasks" && <TasksTab />}
        {tab === "approvals" && <ApprovalsTab />}
        {tab === "content" && <ContentTab />}
        {tab === "outcomes" && <CouncilTab />}
        {tab === "projects" && <ProjectsTab />}
        {tab === "docs" && <DocsTab />}
        {tab === "calendar" && <CalendarTab />}
        {tab === "wallet" && <WalletTab />}
        {tab === "memory" && <MemoryTab />}
        {tab === "team" && <TeamTab />}
        {tab === "office" && <OfficeTab />}
      </main>
    </div>
  );
}
