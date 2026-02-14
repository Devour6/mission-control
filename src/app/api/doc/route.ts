import { NextRequest, NextResponse } from "next/server";

// Map doc IDs to workspace file paths (synced to public/docs/)
const DOC_PATHS: Record<string, string> = {
  "d-1": "docs/DAILY-INTEL.md",
  "d-11": "docs/portfolio-targets.md",
  "d-12": "docs/agent-team-plan.md",
  "d-14": "docs/phase-products.md",
};

const REPO = "Devour6/mission-control";
const BRANCH = "main";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VERCEL_GITHUB_TOKEN || "";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const path = DOC_PATHS[id];
  if (!path) return new NextResponse("Document not found", { status: 404 });

  // Try fetching from GitHub raw
  try {
    const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/public/${path}`;
    const res = await fetch(url, {
      headers: GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {},
      cache: "no-store",
    });
    if (res.ok) {
      const text = await res.text();
      return new NextResponse(text, {
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-cache" },
      });
    }
  } catch {}

  return new NextResponse("Could not load document", { status: 502 });
}
