import { NextRequest, NextResponse } from "next/server";

const REPO = "Devour6/mission-control";
const BRANCH = "main";
const FILE_PATH = "public/data/content-feedback.json";
const API_BASE = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

// GitHub token from env (server-side only)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VERCEL_GITHUB_TOKEN || "";

interface FeedbackEntry {
  id: string;
  author: string;
  platform: string;
  status: "approved" | "denied";
  feedback?: string;
  reviewedAt: string;
}

async function getCurrentFile(): Promise<{ content: FeedbackEntry[]; sha: string | null }> {
  try {
    const res = await fetch(`${API_BASE}?ref=${BRANCH}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "MissionControl/1.0",
      },
      cache: "no-store",
    });
    if (!res.ok) return { content: [], sha: null };
    const data = await res.json();
    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    return { content: JSON.parse(decoded), sha: data.sha };
  } catch {
    return { content: [], sha: null };
  }
}

async function writeFile(content: FeedbackEntry[], sha: string | null): Promise<boolean> {
  const body: Record<string, unknown> = {
    message: `Content feedback: ${content.length} reviews`,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(API_BASE, {
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
    const entry: FeedbackEntry = await req.json();
    if (!entry.id || !entry.status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    const { content, sha } = await getCurrentFile();
    
    // Upsert — replace if same id exists
    const idx = content.findIndex((e) => e.id === entry.id);
    if (idx >= 0) content[idx] = entry;
    else content.push(entry);

    const ok = await writeFile(content, sha);
    if (!ok) {
      return NextResponse.json({ error: "GitHub write failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, total: content.length });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const { content } = await getCurrentFile();
  return NextResponse.json(content, {
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
  });
}
