"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";

const TasksTab = dynamic(() => import("@/components/TasksTab"), { ssr: false });
const CalendarTab = dynamic(() => import("@/components/CalendarTab"), { ssr: false });
const WalletTab = dynamic(() => import("@/components/WalletTab"), { ssr: false });
const ContentTab = dynamic(() => import("@/components/ContentTab"), { ssr: false });
const VisualsTab = dynamic(() => import("@/components/VisualsTab"), { ssr: false });
const ProjectsTab = dynamic(() => import("@/components/ProjectsTab"), { ssr: false });
const DocsTab = dynamic(() => import("@/components/DocsTab"), { ssr: false });
const TeamTab = dynamic(() => import("@/components/TeamTab"), { ssr: false });
const OfficeTab = dynamic(() => import("@/components/OfficeTab"), { ssr: false });
const CRMTab = dynamic(() => import("@/components/CRMTab"), { ssr: false });
const StandupHistoryTab = dynamic(() => import("@/components/StandupHistoryTab"), { ssr: false });

export default function Home() {
  const [tab, setTab] = useState("office");

  return (
    <div className="flex min-h-screen">
      <Sidebar active={tab} onNavigate={setTab} />
      {/* pt-16 on mobile for fixed top bar, responsive padding */}
      <main className="flex-1 p-3 pt-16 sm:p-6 md:p-8 md:pt-8 overflow-auto min-w-0">
        {tab === "tasks" && <TasksTab />}
        {tab === "content" && <ContentTab />}
        {tab === "visuals" && <VisualsTab />}
        {tab === "standups" && <StandupHistoryTab />}
        {tab === "projects" && <ProjectsTab />}
        {tab === "docs" && <DocsTab />}
        {tab === "calendar" && <CalendarTab />}
        {tab === "wallet" && <WalletTab />}
        {tab === "team" && <TeamTab />}
        {tab === "office" && <OfficeTab />}
        {tab === "crm" && <CRMTab />}
      </main>
    </div>
  );
}
