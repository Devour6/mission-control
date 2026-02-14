# Agent Team Architecture — Chief of Staff Model

## Vision
George (main agent) becomes Chief of Staff — orchestrating a team of specialized subagents. Each agent has a clear domain, its own skill files, and defined outputs. George delegates, reviews, and ensures quality + efficiency.

## The Team

### 🧠 George — Chief of Staff (Main Agent)
- **Role:** Orchestrator, decision-maker, Brandon's direct interface
- **Responsibilities:** Morning briefings, task delegation, quality review, system optimization, strategic thinking
- **Doesn't do:** Deep research, long-form content drafting, code reviews (delegates these)

### 🔍 Research Agent
- **Domain:** Market research, competitor analysis, trend spotting, due diligence
- **Trigger:** "research X", "what's happening with Y", "find out about Z"
- **Outputs:** Structured research briefs saved to workspace + surfaced to Brandon
- **Skill:** Templates for research briefs (problem → findings → implications → recommendations)
- **Tools:** web_search, web_fetch, x-research (when token available)

### 🐦 X Content Agent
- **Domain:** Brandon's X/Twitter presence
- **Trigger:** "draft a tweet", "post about X", content calendar items
- **Outputs:** Draft tweets/threads in workspace for approval → post after approval
- **Skill:** Brandon's voice/tone guide, content templates, engagement patterns
- **Safety:** NEVER posts without explicit approval (non-reversible)
- **Tools:** X API (posting), x-research (for context/trends)

### 💼 LinkedIn Content Agent
- **Domain:** Brandon's LinkedIn presence — professional thought leadership
- **Trigger:** "LinkedIn post", "professional content about X"
- **Outputs:** Draft posts in workspace for approval → post after approval
- **Skill:** LinkedIn best practices, Brandon's professional voice, post templates
- **Safety:** NEVER posts without explicit approval (non-reversible)
- **Tools:** LinkedIn API (if available), web research for topical context

### ⚙️ Engineering Agent
- **Domain:** Code reviews, bug fixes, technical implementations
- **Trigger:** "review this PR", "fix bug in X", "implement Y"
- **Outputs:** Code changes via PR, technical reports, architecture docs
- **Skill:** Coding standards, repo conventions, PR templates
- **Tools:** gh CLI, Codex CLI, git, shell

### 📋 Personal Assistant Agent
- **Domain:** Calendar management, morning briefings, email summaries, income statements, scheduling
- **Trigger:** Scheduled (morning briefings, email monitors) + "schedule X", "what's on my calendar", "income report"
- **Outputs:** Morning briefings, calendar updates, email summaries, validator income reports — all delivered via George
- **Skill:** Brandon's preferences (quickest-first task ranking, 3 inbox grouping, priority flagging), briefing templates, income report templates
- **Safety:** Can read calendars/email freely. Creating events or sending replies requires approval via George.
- **Tools:** gog CLI (email + calendar), Solana CLI, SVT.one API
- **Note:** Takes over current morning briefing, urgent email monitor, and weekly validator income cron jobs. George delegates these instead of running them directly.

### 📈 Trader Agent
- **Domain:** Solana wallet management, trade execution, market analysis, portfolio strategy
- **Trigger:** "buy X", "sell X", "what should we do with the portfolio", market conditions
- **Outputs:** Trade recommendations (require approval), market analysis briefs, portfolio rebalancing proposals, DCA strategies
- **Skill:** Brandon's risk tolerance, portfolio targets (20 staked ETH, 3oz Oro, 1 kilo silver, 2 BTC), bear market stacking strategy, CRT yield-bearing stable management
- **Safety:** NEVER executes trades without explicit approval from Brandon via George. All trade proposals include reasoning + risk assessment.
- **Tools:** Solana CLI, DeFi APIs, market data feeds, web research
- **Note:** Manages the wallet tracked in #wallet Discord channel. Posts portfolio updates and trade proposals there.

## Architecture Principles (Informed by OpenAI Skills Blog)

### 1. Skills as SOPs
Each agent gets a dedicated SKILL.md that acts as its standard operating procedure:
- Clear "use when / don't use when" routing logic
- Negative examples to prevent misfires between similar agents
- Templates and examples embedded in the skill (not system prompt)
- Updated as we learn what works

### 2. Clean Routing via George
George reads incoming requests and routes to the right agent. Decision logic:
- Is this research? → Research Agent
- Is this content for X? → X Content Agent
- Is this content for LinkedIn? → LinkedIn Content Agent
- Is this code/technical? → Engineering Agent
- Is this strategic/operational? → George handles directly

### 3. Artifact-Based Handoffs
- Agents write outputs to defined workspace paths (e.g., `drafts/x/`, `drafts/linkedin/`, `research/`)
- George reviews outputs before surfacing to Brandon
- Clean review boundary — nothing goes external without approval

### 4. Compaction-Ready Design
- Each agent session uses compaction for long-running tasks
- Memory files maintain continuity across sessions
- Agents log their work to daily files for George to review

### 5. Security Posture
- **Reversible actions:** Agents can do freely (file writes, drafts, research, internal organization)
- **Non-reversible actions:** Require Brandon's approval via George (posting content, sending emails, deleting data, financial transactions)
- **Credential isolation:** Each agent only gets the API keys it needs
- **Network containment:** Agents have minimal external access, scoped to their domain

## Implementation Plan

### Phase 1: Foundation (Day 1)
- [ ] Create skill files for each agent (SKILL.md with routing, templates, examples)
- [ ] Set up workspace directories: `drafts/x/`, `drafts/linkedin/`, `research/`, `engineering/`
- [ ] Define voice/tone guides for X and LinkedIn agents
- [ ] Interview Brandon about content strategy, posting frequency, topics

### Phase 2: Research + Engineering (Day 1-2)
- [ ] Deploy Research Agent — lowest risk, highest immediate value
- [ ] Deploy Engineering Agent — clear scope, measurable outputs
- [ ] Test with real tasks, iterate on skill files

### Phase 3: Personal Assistant + Trader (Day 2-3)
- [ ] Deploy Personal Assistant Agent — migrate morning briefings, email monitors, income reports
- [ ] Deploy Trader Agent — wallet monitoring, market analysis, trade proposals
- [ ] Set up approval workflow: Trader proposes → George reviews → Brandon approves → execute
- [ ] Define risk parameters and portfolio targets in Trader skill file

### Phase 4: Content Agents (Day 3-4)
- [ ] Deploy X Content Agent — need Brandon's voice samples / past posts for tone calibration
- [ ] Deploy LinkedIn Content Agent — same voice calibration
- [ ] Establish approval workflow: draft → review → approve → post
- [ ] Get API keys: X API (for posting), LinkedIn API

### Phase 5: Optimization (Ongoing)
- [ ] George reviews agent outputs and refines skill files
- [ ] Track quality metrics: drafts accepted vs. rejected, research usefulness
- [ ] Automate recurring content (e.g., weekly Solana ecosystem updates)
- [ ] Add negative examples to skills based on routing mistakes
- [ ] Build content calendar integration into Mission Control

## Improvements to Current Setup (Pre-Team)

Based on the OpenAI blog insights, before adding new agents:

1. **Formalize George's own skill file** — Document my own routing logic, morning briefing template, and decision-making framework so it survives compaction cleanly

2. **Create workspace structure for artifacts** — Right now everything's in memory/. Need clean directories for different output types

3. **Template everything** — Morning briefing, research briefs, content drafts, validator reports — all should have templates in skill files, not in prompts

4. **Add compaction-safe memory** — Key context should be in files, not just conversation history. Already doing this with MEMORY.md but can be more systematic

5. **Routing descriptions on existing skills** — The x-research skill needs "use when / don't use when" blocks added

## Command Structure
```
Brandon
   ↕ (direct communication)
George 🦾 (Chief of Staff)
   ↕ (delegates + reviews)
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Research  │ X Content│ LinkedIn │Engineering│ Personal │  Trader  │
│  Agent    │  Agent   │  Agent   │  Agent   │ Assistant│  Agent   │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

Brandon talks to George. George delegates to the team. Brandon never needs to manage individual agents — that's George's job. Efficiency through hierarchy.

## Decisions (Feb 13)
- **X topics:** Solana, AI, entrepreneurship, building in public. Phase only (not Radiants). Aspire to Mert-level confidence.
- **X frequency:** 1x/day now → eventually 3-5x/day
- **LinkedIn frequency:** 2x/week
- **X voice calibration:** Study @DEVOUR_ (Brandon's past tweets) + @mert (Mert Mumtaz). Build tone from both.
- **LinkedIn voice calibration:** Study Brandon's LinkedIn + Jeff Newman's LinkedIn posts.
- **Engineering scope:** Personal repos only unless explicitly told to push to Phase
- **Posting:** Draft-only for now. No posting APIs until tone is dialed in. All drafts reviewed by Brandon.
- **Trader:** No approval needed. Max 15% of portfolio per single trade. George manages the wallet.
- **Build order:** One agent at a time with specific SOUL.md files.
