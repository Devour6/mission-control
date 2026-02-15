import { NextRequest, NextResponse } from "next/server";
import { ContentData } from "@/lib/types";

const REPO = "Devour6/mission-control";
const BRANCH = "main";
const CONTENT_FILE = "public/data/content.json";
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;

// GitHub token from env (server-side only)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VERCEL_GITHUB_TOKEN || "";

interface ApprovalRequest {
  draftId: string;
  action: "approve" | "deny" | "edit" | "revoke";
  feedback?: string;
  editedText?: string;
  scheduleFor?: string; // ISO string for publishing time
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

async function deduplicateContentFile(): Promise<void> {
  try {
    const { content: contentData, sha } = await getFileContent<ContentData>(CONTENT_FILE);
    
    // Check for duplicate IDs
    const seenIds = new Set<string>();
    const deduplicated: typeof contentData.drafts = [];
    let hasDuplicates = false;
    
    for (const draft of contentData.drafts) {
      if (seenIds.has(draft.id)) {
        hasDuplicates = true;
        console.warn(`Removing duplicate ID: ${draft.id}`);
        // Keep the resolved version over pending
        const existing = deduplicated.find(d => d.id === draft.id);
        if (existing && existing.status === 'pending' && draft.status !== 'pending') {
          // Replace pending with resolved
          const index = deduplicated.findIndex(d => d.id === draft.id);
          deduplicated[index] = draft;
        }
        // Otherwise keep the first occurrence
      } else {
        seenIds.add(draft.id);
        deduplicated.push(draft);
      }
    }
    
    if (hasDuplicates) {
      await updateFileContent(CONTENT_FILE, { drafts: deduplicated }, sha, "Deduplicate content IDs after approval update");
      console.log("Content file deduplicated successfully");
    }
  } catch (error) {
    console.error("Failed to deduplicate content file:", error);
    // Non-blocking - the main update already succeeded
  }
}

const FEEDBACK_FILE = "public/data/content-feedback.json";

interface FeedbackEntry {
  id: string;
  author: string;
  platform: string;
  status: "approved" | "denied";
  feedback: string;
  reviewedAt: string;
}

async function syncToFeedbackFile(draft: { id: string; author: string; platform: string; status: string; feedback?: string }, reviewedAt: string): Promise<void> {
  try {
    const { content: feedbackEntries, sha } = await getFileContent<FeedbackEntry[]>(FEEDBACK_FILE).catch(() => ({ content: [] as FeedbackEntry[], sha: null }));
    
    const entry: FeedbackEntry = {
      id: draft.id,
      author: draft.author,
      platform: draft.platform,
      status: draft.status as "approved" | "denied",
      feedback: draft.feedback || "",
      reviewedAt,
    };

    const idx = feedbackEntries.findIndex(e => e.id === draft.id);
    if (idx >= 0) feedbackEntries[idx] = entry;
    else feedbackEntries.push(entry);

    await updateFileContent(FEEDBACK_FILE, feedbackEntries, sha, `Sync feedback for ${draft.id}`);
  } catch (error) {
    console.error("Failed to sync feedback file:", error);
    // Non-blocking — content.json is the source of truth
  }
}

// Scheduling removed - draft-only mode

export async function POST(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "No GitHub token configured" }, { status: 500 });
  }

  try {
    const request: ApprovalRequest = await req.json();
    
    if (!request.draftId || !request.action) {
      return NextResponse.json({ error: "Missing draftId or action" }, { status: 400 });
    }

    // Get current content data
    const { content: contentData, sha: contentSha } = await getFileContent<ContentData>(CONTENT_FILE);
    
    // Find the draft
    const draftIndex = contentData.drafts.findIndex(d => d.id === request.draftId);
    if (draftIndex === -1) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const draft = contentData.drafts[draftIndex];
    const now = new Date().toISOString();

    // Update draft based on action
    switch (request.action) {
      case "approve":
        draft.status = "approved";
        draft.resolvedAt = now;
        if (request.feedback) draft.feedback = request.feedback;
        
        const contentUpdateOk = await updateFileContent(
          CONTENT_FILE,
          contentData,
          contentSha,
          `Approve draft ${draft.id} by ${draft.author}`
        );
        
        if (!contentUpdateOk) {
          return NextResponse.json({ error: "Failed to update content file" }, { status: 502 });
        }

        // Safety check: deduplicate if needed
        await deduplicateContentFile();

        // Sync to feedback file for agent consumption
        await syncToFeedbackFile(draft, now);
        
        break;

      case "deny":
        draft.status = "denied";
        draft.resolvedAt = now;
        if (request.feedback) draft.feedback = request.feedback;
        
        const denyUpdateOk = await updateFileContent(
          CONTENT_FILE,
          contentData,
          contentSha,
          `Deny draft ${draft.id} by ${draft.author}`
        );
        
        if (!denyUpdateOk) {
          return NextResponse.json({ error: "Failed to update content file" }, { status: 502 });
        }

        // Safety check: deduplicate if needed
        await deduplicateContentFile();

        // Sync to feedback file for agent consumption
        await syncToFeedbackFile(draft, now);
        
        break;

      case "edit":
        if (!request.editedText) {
          return NextResponse.json({ error: "Missing editedText for edit action" }, { status: 400 });
        }
        
        draft.status = "editing";
        draft.editedText = request.editedText;
        if (request.feedback) draft.feedback = request.feedback;
        
        const editUpdateOk = await updateFileContent(
          CONTENT_FILE,
          contentData,
          contentSha,
          `Edit draft ${draft.id} by ${draft.author}`
        );
        
        if (!editUpdateOk) {
          return NextResponse.json({ error: "Failed to update content file" }, { status: 502 });
        }

        // Safety check: deduplicate if needed
        await deduplicateContentFile();
        
        break;

      case "revoke":
        // Move back to pending status
        draft.status = "pending";
        draft.resolvedAt = undefined;
        draft.feedback = "";
        
        const revokeContentOk = await updateFileContent(
          CONTENT_FILE,
          contentData,
          contentSha,
          `Revoke approval for draft ${draft.id} by ${draft.author}`
        );
        
        if (!revokeContentOk) {
          return NextResponse.json({ error: "Failed to update content file" }, { status: 502 });
        }

        // Safety check: deduplicate if needed
        await deduplicateContentFile();
        
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ 
      ok: true, 
      action: request.action,
      draftId: request.draftId,
      status: draft.status 
    });

  } catch (error) {
    console.error("Content approval error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Batch approval endpoint
export async function PATCH(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "No GitHub token configured" }, { status: 500 });
  }

  try {
    const { draftIds, action, feedback }: { draftIds: string[], action: "approve" | "deny", feedback?: string } = await req.json();
    
    if (!draftIds || !Array.isArray(draftIds) || !action) {
      return NextResponse.json({ error: "Missing draftIds or action" }, { status: 400 });
    }

    const { content: contentData, sha: contentSha } = await getFileContent<ContentData>(CONTENT_FILE);
    
    const now = new Date().toISOString();
    const results: Array<{ draftId: string; success: boolean; error?: string }> = [];

    for (const draftId of draftIds) {
      const draftIndex = contentData.drafts.findIndex(d => d.id === draftId);
      if (draftIndex === -1) {
        results.push({ draftId, success: false, error: "Draft not found" });
        continue;
      }

      const draft = contentData.drafts[draftIndex];
      
      if (action === "approve") {
        draft.status = "approved";
        draft.resolvedAt = now;
        if (feedback) draft.feedback = feedback;
      } else {
        draft.status = "denied";
        draft.resolvedAt = now;
        if (feedback) draft.feedback = feedback;
      }

      results.push({ draftId, success: true });
    }

    // Update content file
    const contentUpdateOk = await updateFileContent(
      CONTENT_FILE,
      contentData,
      contentSha,
      `Batch ${action} ${draftIds.length} drafts`
    );

    if (!contentUpdateOk) {
      return NextResponse.json({ error: "Failed to update content file" }, { status: 502 });
    }

    // Safety check: deduplicate if needed
    await deduplicateContentFile();

    // Sync all reviewed drafts to feedback file
    for (const draftId of draftIds) {
      const draft = contentData.drafts.find(d => d.id === draftId);
      if (draft && (draft.status === "approved" || draft.status === "denied")) {
        await syncToFeedbackFile(draft, now);
      }
    }

    return NextResponse.json({ ok: true, results });

  } catch (error) {
    console.error("Batch approval error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}