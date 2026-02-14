import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

// Legacy hardcoded map for backwards compatibility
const LEGACY_DOC_PATHS: Record<string, string> = {
  "d-1": "docs/DAILY-INTEL.md",
  "d-11": "docs/portfolio-targets.md",
  "d-12": "docs/agent-team-plan.md",
  "d-14": "docs/phase-products.md",
};

// Map local doc paths to public/docs filenames
const PATH_TO_FILENAME: Record<string, string> = {
  "agents/john/research/validator-income-optimization.md": "validator-income-optimization.md",
  "agents/john/memory/dca-strategy-optimization.md": "dca-strategy-optimization.md",
  "agents/ross/memory/2026-02-14-approval-workflow.md": "content-approval-workflow.md",
  "agents/pam/agents/pam/financial/expense-categories.md": "expense-categories-optimization.md",
  "agents/pam/agents/pam/financial/savings-tracker.md": "house-savings-dashboard.md",
  "scripts/svt-validator-income.sh": "svt-validator-income-report.sh",
};

const REPO = "Devour6/mission-control";
const BRANCH = "main";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VERCEL_GITHUB_TOKEN || "";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let docPath: string | null = null;

  // First, try to load docs.json to find the doc dynamically
  try {
    const docsJsonPath = path.join(process.cwd(), "public", "data", "docs.json");
    const docsData = JSON.parse(await fs.readFile(docsJsonPath, "utf-8"));
    
    // Find the doc by ID across all days
    for (const day of docsData.days) {
      const doc = day.docs.find((d: any) => d.id === id);
      if (doc) {
        if (doc.path) {
          // Map the workspace path to the public/docs filename
          const filename = PATH_TO_FILENAME[doc.path];
          if (filename) {
            docPath = `docs/${filename}`;
          }
        }
        break;
      }
    }
  } catch (error) {
    console.warn("Could not load docs.json:", error);
  }

  // Fall back to legacy hardcoded map if not found in docs.json
  if (!docPath) {
    docPath = LEGACY_DOC_PATHS[id];
  }

  if (!docPath) return new NextResponse("Document not found", { status: 404 });

  // In development, serve from local filesystem; in production, fetch from GitHub
  if (process.env.NODE_ENV === "development") {
    try {
      const filePath = path.join(process.cwd(), "public", docPath);
      const content = await fs.readFile(filePath, "utf-8");
      return new NextResponse(content, {
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-cache" },
      });
    } catch (error) {
      console.error("Error reading local file:", error);
      return new NextResponse("Document not found locally", { status: 404 });
    }
  } else {
    // Production: fetch from GitHub raw
    try {
      const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/public/${docPath}`;
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
}
