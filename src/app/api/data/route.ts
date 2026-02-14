import { NextRequest, NextResponse } from "next/server";

const REPO = "Devour6/mission-control";
const BRANCH = "main";
const BASE = `https://api.github.com/repos/${REPO}/contents/public/data`;

// Allowed files — whitelist for security
const ALLOWED = new Set([
  "office-state.json",
  "live-actions.json",
  "content.json",
  "team.json",
  "council.json",
  "outcomes-standups.json",
  "tasks.json",
  "approvals.json",
  "projects.json",
  "docs.json",
  "standups.json",
  "calendar.json",
  "wallet.json",
  "wallet-weekly.json",
  "content-feedback.json",
  "crm.json",
  "publishing-queue.json",
]);

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");
  if (!file || !ALLOWED.has(file)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BASE}/${file}?ref=${BRANCH}`, {
      headers: {
        Accept: "application/vnd.github.v3.raw",
        "User-Agent": "MissionControl/1.0",
      },
      // No cache — always fresh from GitHub
      cache: "no-store",
    });

    if (!res.ok) {
      // Fall back to local static file
      return NextResponse.json({ error: "GitHub fetch failed", status: res.status }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fetch error" }, { status: 500 });
  }
}
