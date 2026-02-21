import { NextRequest, NextResponse } from "next/server";
import { VisualsData } from "@/lib/types";

const REPO = "Devour6/mission-control";
const BRANCH = "main";
const VISUALS_FILE = "public/data/visuals.json";
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;

// GitHub token from env (server-side only)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VERCEL_GITHUB_TOKEN || "";

interface VisualApprovalRequest {
  visualId: string;
  action: "approve" | "reject";
  feedback?: string;
}

async function getFileContent<T>(filePath: string): Promise<{ content: T; sha: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/${filePath}?ref=${BRANCH}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "MissionControl/1.0",
      },
      cache: "no-store",
    });
    
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`);
    }
    
    const data = await res.json();
    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    return { content: JSON.parse(decoded) as T, sha: data.sha };
  } catch (error) {
    console.error(`Error fetching ${filePath}:`, error);
    throw error;
  }
}

async function updateFileContent<T>(filePath: string, content: T, sha: string | null, commitMessage: string): Promise<boolean> {
  const body: Record<string, unknown> = {
    message: commitMessage,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${API_BASE}/${filePath}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "MissionControl/1.0",
    },
    body: JSON.stringify(body),
  });
  
  return res.ok;
}

export async function POST(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "No GitHub token configured" }, { status: 500 });
  }

  try {
    const request: VisualApprovalRequest = await req.json();
    
    if (!request.visualId || !request.action) {
      return NextResponse.json({ error: "Missing visualId or action" }, { status: 400 });
    }

    // Get current visuals data
    const { content: visualsData, sha: visualsSha } = await getFileContent<VisualsData>(VISUALS_FILE);
    
    // Find the visual
    const visualIndex = visualsData.visuals.findIndex(v => v.id === request.visualId);
    if (visualIndex === -1) {
      return NextResponse.json({ error: "Visual not found" }, { status: 404 });
    }

    const visual = visualsData.visuals[visualIndex];
    const now = new Date().toISOString();

    // Update visual based on action
    switch (request.action) {
      case "approve":
        visual.status = "approved";
        visual.resolvedAt = now;
        if (request.feedback) visual.feedback = request.feedback;
        break;

      case "reject":
        visual.status = "rejected";
        visual.resolvedAt = now;
        if (request.feedback) visual.feedback = request.feedback;
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const visualsUpdateOk = await updateFileContent(
      VISUALS_FILE,
      visualsData,
      visualsSha,
      `${request.action === "approve" ? "Approve" : "Reject"} visual ${visual.id} by ${visual.agent}`
    );
    
    if (!visualsUpdateOk) {
      return NextResponse.json({ error: "Failed to update visuals file" }, { status: 502 });
    }

    return NextResponse.json({ 
      ok: true, 
      action: request.action,
      visualId: request.visualId,
      status: visual.status 
    });

  } catch (error) {
    console.error("Visual approval error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Batch approval endpoint
export async function PATCH(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "No GitHub token configured" }, { status: 500 });
  }

  try {
    const { visualIds, action, feedback }: { visualIds: string[], action: "approve" | "reject", feedback?: string } = await req.json();
    
    if (!visualIds || !Array.isArray(visualIds) || !action) {
      return NextResponse.json({ error: "Missing visualIds or action" }, { status: 400 });
    }

    const { content: visualsData, sha: visualsSha } = await getFileContent<VisualsData>(VISUALS_FILE);
    
    const now = new Date().toISOString();
    const results: Array<{ visualId: string; success: boolean; error?: string }> = [];

    for (const visualId of visualIds) {
      const visualIndex = visualsData.visuals.findIndex(v => v.id === visualId);
      if (visualIndex === -1) {
        results.push({ visualId, success: false, error: "Visual not found" });
        continue;
      }

      const visual = visualsData.visuals[visualIndex];
      
      if (action === "approve") {
        visual.status = "approved";
        visual.resolvedAt = now;
        if (feedback) visual.feedback = feedback;
      } else {
        visual.status = "rejected";
        visual.resolvedAt = now;
        if (feedback) visual.feedback = feedback;
      }

      results.push({ visualId, success: true });
    }

    // Update visuals file
    const visualsUpdateOk = await updateFileContent(
      VISUALS_FILE,
      visualsData,
      visualsSha,
      `Batch ${action} ${visualIds.length} visuals`
    );

    if (!visualsUpdateOk) {
      return NextResponse.json({ error: "Failed to update visuals file" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, results });

  } catch (error) {
    console.error("Batch visual approval error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}