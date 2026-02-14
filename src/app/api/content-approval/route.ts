import { NextRequest, NextResponse } from "next/server";
import { ContentData, PublishingQueueData, PublishingQueueItem } from "@/lib/types";

const REPO = "Devour6/mission-control";
const BRANCH = "main";
const CONTENT_FILE = "public/data/content.json";
const QUEUE_FILE = "public/data/publishing-queue.json";
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

function calculateScheduledTime(): string {
  // Auto-schedule for next available slot based on current time
  const now = new Date();
  const hours = now.getHours();
  
  // Schedule for next publishing window (morning 9am, midday 1pm, evening 6pm PST)
  const windows = [9, 13, 18];
  let nextWindow = windows.find(h => h > hours);
  
  if (!nextWindow) {
    // Schedule for tomorrow morning
    nextWindow = 9;
    now.setDate(now.getDate() + 1);
  }
  
  now.setHours(nextWindow, 0, 0, 0);
  return now.toISOString();
}

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
        
        // Auto-queue for publishing
        const { content: queueData, sha: queueSha } = await getFileContent<PublishingQueueData>(QUEUE_FILE);
        
        const queueItem: PublishingQueueItem = {
          id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          draftId: draft.id,
          platform: draft.platform,
          text: draft.editedText || draft.text,
          author: draft.author,
          authorEmoji: draft.authorEmoji,
          scheduledFor: request.scheduleFor || calculateScheduledTime(),
          queuedAt: now,
          status: "queued"
        };
        
        queueData.queue.push(queueItem);
        
        // Update both files
        const contentUpdateOk = await updateFileContent(
          CONTENT_FILE,
          contentData,
          contentSha,
          `Approve draft ${draft.id} by ${draft.author}`
        );
        
        const queueUpdateOk = await updateFileContent(
          QUEUE_FILE,
          queueData,
          queueSha,
          `Queue approved post ${draft.id} for publishing`
        );
        
        if (!contentUpdateOk || !queueUpdateOk) {
          return NextResponse.json({ error: "Failed to update files" }, { status: 502 });
        }
        
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
        
        break;

      case "revoke":
        // Move back to pending status and remove from queue
        draft.status = "pending";
        draft.resolvedAt = undefined;
        draft.feedback = "";
        
        // Remove from publishing queue
        const { content: revokeQueueData, sha: revokeQueueSha } = await getFileContent<PublishingQueueData>(QUEUE_FILE);
        const originalQueueLength = revokeQueueData.queue.length;
        
        // Filter out any queue items for this draft
        revokeQueueData.queue = revokeQueueData.queue.filter(item => item.draftId !== draft.id);
        const removedFromQueue = revokeQueueData.queue.length < originalQueueLength;
        
        // Update content file
        const revokeContentOk = await updateFileContent(
          CONTENT_FILE,
          contentData,
          contentSha,
          `Revoke approval for draft ${draft.id} by ${draft.author}`
        );
        
        // Update queue file if we removed something
        const revokeQueueOk = removedFromQueue 
          ? await updateFileContent(
              QUEUE_FILE,
              revokeQueueData,
              revokeQueueSha,
              `Remove revoked draft ${draft.id} from publishing queue`
            )
          : true;
        
        if (!revokeContentOk || !revokeQueueOk) {
          return NextResponse.json({ error: "Failed to update files" }, { status: 502 });
        }
        
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
    const { content: queueData, sha: queueSha } = await getFileContent<PublishingQueueData>(QUEUE_FILE);
    
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

        // Add to publishing queue
        const queueItem: PublishingQueueItem = {
          id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          draftId: draft.id,
          platform: draft.platform,
          text: draft.editedText || draft.text,
          author: draft.author,
          authorEmoji: draft.authorEmoji,
          scheduledFor: calculateScheduledTime(),
          queuedAt: now,
          status: "queued"
        };
        
        queueData.queue.push(queueItem);
      } else {
        draft.status = "denied";
        draft.resolvedAt = now;
        if (feedback) draft.feedback = feedback;
      }

      results.push({ draftId, success: true });
    }

    // Update files
    const contentUpdateOk = await updateFileContent(
      CONTENT_FILE,
      contentData,
      contentSha,
      `Batch ${action} ${draftIds.length} drafts`
    );

    const queueUpdateOk = action === "approve" 
      ? await updateFileContent(QUEUE_FILE, queueData, queueSha, `Batch queue ${draftIds.length} approved posts`)
      : true;

    if (!contentUpdateOk || !queueUpdateOk) {
      return NextResponse.json({ error: "Failed to update files" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, results });

  } catch (error) {
    console.error("Batch approval error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}