# Gemini Live Agent Challenge — Submission Plan

## Hackathon Reference

**URL**: https://geminiliveagentchallenge.devpost.com/
**Contest Period**: February 16 – March 16, 2026
**Submission Deadline**: March 16, 2026 @ 5:00 PM PDT (March 17, 9:00 AM JST)
**Judging Period**: March 17 – April 3, 2026
**Winners Announced**: April 22-24, 2026 at Google Cloud Next
**Participants**: ~9,750 registered
**Total Prizes**: $80,000 in cash

---

### Challenge Description

> Hey builders! Stop typing, and start interacting! We are moving beyond the text box. The future isn't about just chatting with AI — it's about immersive, real-time experiences. To celebrate the power of multimodal AI, we're challenging you to build the next generation of agents that can help you see, hear, speak, and create in the Gemini Live Agent Challenge.

---

### Three Categories

**Live Agents** (our category)
- Focus: Real-time Interaction (Audio/Vision)
- Build an agent that users can talk to naturally, can be interrupted
- Examples: real-time translator, vision-enabled customized tutor that "sees" your homework, customer support voice agent
- **Mandatory Tech**: Must use Gemini Live API or ADK. Agents hosted on Google Cloud.

**Creative Storyteller**
- Focus: Multimodal Storytelling with Interleaved Output
- Must use Gemini's interleaved/mixed output capabilities. Hosted on Google Cloud.

**UI Navigator**
- Focus: Visual UI Understanding & Interaction
- Must use Gemini multimodal to interpret screenshots/screen recordings. Hosted on Google Cloud.

---

### Mandatory Requirements (ALL tracks)

1. Leverage a Gemini model
2. Agents must be built using either **Google GenAI SDK** OR **ADK** (Agent Development Kit)
3. Use at least **one Google Cloud service**
4. Backend **hosted on Google Cloud**

---

### Submission Checklist

- [ ] **Text Description**: Summary of features, functionality, technologies used, data sources, findings and learnings
- [ ] **Public Code Repository**: With spin-up instructions in README for reproducibility
- [ ] **Proof of Google Cloud Deployment**: Short recording (separate from demo) proving backend runs on GCP — either (1) screen recording of console logs/deployment view, or (2) link to code file demonstrating GCP service usage
- [ ] **Architecture Diagram**: Clear visual of how Gemini connects to backend, database, and frontend
- [ ] **Demo Video**: Under 4 minutes, demos multimodal/agentic features working in real-time (no mockups), pitches the problem and value

---

### Bonus Points (Optional)

- Publish content (blog, podcast, video) about how the project was built with Google AI + Google Cloud. Must include language saying it was created for this hackathon. Use hashtag **#GeminiLiveAgentChallenge** on social media.
- Automate Cloud Deployment using scripts or infrastructure-as-code tools (code must be in public repo).
- Sign up for a Google Developer Group and provide a link to public GDG profile.

---

### Judging Criteria

| Criterion | Weight | What Judges Look For |
|---|---|---|
| **Innovation & Multimodal UX** | **40%** | Breaks the "text box" paradigm. Agent helps "See, Hear, Speak" seamlessly. Distinct persona/voice. Experience is "Live" and context-aware, not turn-based. |
| **Technical Implementation & Agent Architecture** | **30%** | Effective use of Google GenAI SDK or ADK. Robustly hosted on Google Cloud. Sound agent logic. Graceful error handling. Avoids hallucinations. Evidence of grounding. |
| **Demo & Presentation** | **30%** | Video defines problem and solution. Architecture diagram is clear. Visual proof of Cloud deployment. Video shows actual software working. |

---

### Prize Structure

| Category | Prize |
|---|---|
| **Grand Prize** | $25,000 + $3K Cloud credits + 2x Google Cloud Next 2026 tickets + travel stipends + demo opportunity |
| **Best Live Agents** | $10,000 + $1K credits + conference tickets |
| **Best Creative Storytellers** | $10,000 + $1K credits + conference tickets |
| **Best UI Navigators** | $10,000 + $1K credits + conference tickets |
| **Best Multimodal Integration & UX** | $5,000 + $500 credits |
| **Best Technical Execution & Architecture** | $5,000 + $500 credits |
| **Best Innovation & Thought Leadership** | $5,000 + $500 credits |
| **5x Honorable Mentions** | $2,000 each + $500 credits |

---

### Rules & Eligibility

- Projects must be **newly created** during the contest period (Feb 16 – Mar 16, 2026)
- Third-party services ARE allowed — must be authorized, license-compliant, and **disclosed with specificity**
- No team size limit stated
- Eligibility exclusions: Italy, Quebec, Crimea, Cuba, Iran, Syria, North Korea, Sudan, Belarus, Russia

---

## GuideSight Eligibility Assessment

### Current Status vs Requirements

| Requirement | Status | Action Needed |
|---|---|---|
| Uses a Gemini model | **DONE** — Gemini 2.5 Flash via Live API | None |
| Uses Google GenAI SDK or ADK | **DONE** — `google-genai` 1.65.0 (direct imports in agent.py + token_server.py, also via vision_agents) | Show direct SDK usage prominently in README |
| At least one Google Cloud service | **READY** — Dockerfiles + deploy.sh created, tested locally | Run `./deploy.sh` against a GCP project |
| Backend hosted on Google Cloud | **READY** — Dockerfiles + deploy.sh created, tested locally | Run `./deploy.sh` against a GCP project |
| Proof of GCP deployment | **MISSING** | Screen recording of Cloud Console after deploy |
| Public code repository | **MISSING** | Push to public GitHub repo |
| Spin-up instructions in README | **DONE** — `README.md` with local + Cloud Run instructions | None |
| Architecture diagram | **DONE** — Mermaid diagram in `architecture.md` | Create polished visual version for video/Devpost |
| Demo video (<4 min) | **MISSING** | Record demo + pitch |
| Text description on Devpost | **MISSING** | Write submission |

### SDK Compliance Detail

The project uses `google-genai` v1.65.0 — the correct, current SDK (NOT the deprecated `google-generativeai`).

**Direct usage in our code:**
- `server/token_server.py`: `from google import genai` → `genai.Client()`, `client.files.upload()`, `client.models.generate_content()`
- `server/agent.py`: Imports `TurnCoverage`, `LiveConnectConfigDict`, `RealtimeInputConfigDict`, `ContextWindowCompressionConfigDict`, etc. from `google.genai.types`

**Via vision_agents wrapper:**
- `vision-agents-plugins-gemini` depends on `google-genai>=1.66.0`
- Internally uses `google.genai.live.AsyncSession` for Realtime API

**Risk level**: Low. Code directly imports `google.genai.types` alongside the wrapper. Disclose vision_agents as third-party orchestration layer.

---

## Competitive Landscape

### Known Competitor: Visio — Live AI Accessibility Agent
- Real-time accessibility agent: user points phone camera while walking, AI narrates surroundings
- Uses Google ADK with Gemini 2.5 Flash in bidirectional streaming
- Sends raw frames to Gemini (no CV preprocessing)
- Direct competitor in "Live Agents" category

### GuideSight's Differentiator
**The CV "glasses" architecture is unique.** No other submission found uses the `Raw Frame → CV Annotations → Annotated Frame → Gemini` pattern.

> **"Gemini can reason but can't measure. Our CV layer measures, Gemini reasons."**

This directly addresses the "avoids hallucinations / evidence of grounding" judging criterion. The CV annotations ARE the grounding mechanism.

---

## Detailed Action Plan

### DAY 1 (March 13): Infrastructure

#### 1. Google Cloud Deployment — Cloud Run (3 services) ✅ READY

| Service | What | Config | Docker Image |
|---|---|---|---|
| `guidesight-token-server` | Flask API (tokens, task CRUD) | Standard Cloud Run, port 8080 | 330 MB |
| `guidesight-agent` | Gemini + WebRTC coaching agent | `--no-cpu-throttling`, `--min-instances=1`, `--timeout=3600`, `--cpu=2`, `--memory=2Gi` | 606 MB |
| `guidesight-frontend` | React app (nginx) | Standard, port 80 | 94 MB |

**Status**: All 3 Dockerfiles created, all 3 images built and tested locally. `deploy.sh` automates the full deployment. Just needs a GCP project to deploy to.

**Why Cloud Run over GCE:**
- Gemini's 2-min video limit means sessions are short — Cloud Run's 60-min timeout is plenty
- Scales to zero when idle (cost-efficient)
- Simpler than managing a VM
- Google's own ADK docs recommend Cloud Run

**Gotchas resolved:**
- ~~**WebRTC**~~: Stream Video handles the WebRTC edge (TURN/STUN). Python agent connects to Stream via WebSocket/HTTP, NOT direct UDP. Cloud Run works.
- ~~**Token server URL**~~: Already configurable via `TOKEN_SERVER` env var in `agent.py`.
- ~~**Frontend API URL**~~: Already configurable via `VITE_TOKEN_SERVER` env var in `App.tsx`.
- ~~**CORS**~~: Already handled — `flask_cors` with `origins="*"` in `token_server.py`.
- ~~**Container size**~~: Kept reasonable — agent is 606 MB (not 2-4 GB) thanks to slim base.

#### 2. Dockerfiles ✅ DONE

Three Dockerfiles created and tested:
- `Dockerfile.token-server` — Flask app, 330 MB
- `Dockerfile.agent` — OpenCV, MediaPipe, vision_agents, aiortc, 606 MB (pinned to `linux/amd64` for MediaPipe compatibility)
- `Dockerfile.frontend` — Multi-stage Node build → nginx, 94 MB

**Fixes applied during build testing:**
- `libgl1-mesa-glx` → `libgl1` (package renamed in Debian Trixie)
- Agent pinned to `--platform=linux/amd64` (MediaPipe lacks ARM Linux wheels)

#### 3. Deployment Script (`deploy.sh`) ✅ DONE

Automated deployment earns **bonus points**. Script:
- Creates Artifact Registry repo (if needed)
- Builds + pushes all 3 Docker images
- Deploys token server → agent (with TOKEN_SERVER URL) → frontend (with VITE_TOKEN_SERVER baked in)
- Sets all env vars from `.env`
- Outputs all service URLs

#### 4. Code Changes for Cloud Deployment ✅ DONE

- ~~Token server: Add CORS support~~ — Already had `flask_cors`
- ~~Agent: Make token server URL configurable~~ — Already used `TOKEN_SERVER` env var
- ~~Frontend: Make TOKEN_SERVER configurable~~ — Already used `VITE_TOKEN_SERVER` env var
- Token server: Added `/health` and `/readyz` endpoints ✅
- Agent: Created `agent_server.py` HTTP wrapper for Cloud Run health checks ✅

#### 5. Make Repo Public

Push to GitHub as public repo. Scrub any secrets from git history first.

---

### DAY 2 (March 14): Content Creation

#### 6. Architecture Diagram ✅ DONE (Mermaid) / Polished version TODO

- **Mermaid diagrams**: Created in `architecture.md` — full system diagram + CV pipeline detail
- **Excalidraw/draw.io layout guide**: Included in `architecture.md` with color coding and element placement
- **TODO**: Create the polished visual version using Excalidraw or draw.io for the demo video and Devpost image carousel

#### 7. README.md

Must include:
- What GuideSight is (1 paragraph)
- Architecture overview + diagram image
- Tech stack table
- Prerequisites (API keys, Google Cloud project)
- Local spin-up instructions (step-by-step)
- Cloud deployment instructions (using deploy.sh)
- Third-party disclosures: Stream Video SDK, vision_agents (GetStream), OpenCV, MediaPipe

#### 8. Demo Video (<4 minutes)

**Structure:**
```
0:00-0:15  Problem: "8M unfilled skilled jobs. Training is static — manuals, videos, shadowing."
0:15-0:25  Solution: "GuideSight — an AI that sees through your camera and coaches in real-time."
0:25-0:35  Architecture diagram (5-10 seconds on screen)
           Key insight: "Gemini can reason but can't measure. Our CV layer measures."
0:35-2:30  LIVE DEMO (the money shot):
           - Show the actual deployed app (Cloud Run URL, not localhost)
           - Person starts a paper airplane task
           - AI greets, describes what it sees
           - AI catches a mistake ("I see the fold is off-center...")
           - Natural conversation ("Which corner?" → AI answers)
           - Show step tracker advancing
           - Task completes
2:30-3:00  Technical differentiation:
           - Show annotated frame vs raw frame side-by-side
           - "Other agents see raw pixels. Ours sees annotations."
3:00-3:30  Platform vision: Different CV "glasses" for different domains
           (circuit building, HVAC, nursing, cooking)
3:30-3:50  Market: "$8.6B connected worker market → $20B by 2030"
3:50-4:00  Close: "GuideSight. Expert guidance, on demand."
```

**Tips:**
- Start recording at least 2-3 hours before deadline
- Script it, rehearse, do multiple takes
- Show the product in use, not slides about the product
- Keep key info upfront — judges review many projects back-to-back
- Plan the demo task to complete within 2 minutes (Gemini video limit)

---

### DAY 3 (March 15): Polish + Submit

#### 9. GCP Deployment Proof (Separate Recording)

30-60 second screen recording showing:
- Google Cloud Console → Cloud Run → services running
- Logs showing requests being processed
- OR link to `deploy.sh` + Dockerfiles in repo

#### 10. Devpost Submission Text

**Template:**

**Inspiration**: YC RFS "AI Guidance for Physical Work" highlights that 8M skilled jobs remain unfilled. Current training is static — manuals, videos, shadowing. What if every worker had an expert looking over their shoulder?

**What it does**: GuideSight is a real-time AI coach that sees through your camera and talks you through physical tasks — like having an expert instructor watching your hands. No buttons, no turn-taking, continuous bidirectional conversation with vision.

**How we built it**: Gemini 2.5 Flash Live API for real-time bidirectional audio+video. OpenCV + MediaPipe CV layer that annotates video frames before Gemini sees them (our "glasses" architecture). Stream Video SDK for WebRTC transport. React + TypeScript frontend. Flask token server. Both backend services deployed on Google Cloud Run.

**Challenges we ran into**:
- Gemini confirmation bias: AI reported what paper SHOULD look like instead of what it ACTUALLY saw. Solved with strict vision rules in the system prompt.
- Raw vision unreliability: Gemini at 1fps JPEG couldn't reliably detect paper orientation. Solved with OpenCV annotations drawn on frames before Gemini processes them.
- 2-minute video session limit: Hard Gemini Live API constraint. Working on session resumption.
- Context window compression purging recent frames: Relaxed compression thresholds to preserve visual context.

**Key insight**: "Gemini can reason but can't measure. Our CV layer measures, Gemini reasons."

**Accomplishments**: Real-time coaching works — AI sees the camera, speaks naturally, catches mistakes, advances through task steps. Task authoring system lets anyone create new coaching workflows.

**What we learned**: Multimodal AI models are great at general reasoning but struggle with precise spatial details. The solution isn't better prompting — it's preprocessing the visual input with domain-specific CV tools so the AI can reason about annotations instead of raw pixels.

**What's next**: More CV "glasses" for different domains (circuit building, HVAC, nursing), session resumption for unlimited coaching sessions, step sync between agent and frontend via Stream custom events.

**Built with**: Gemini 2.5 Flash, Google GenAI SDK, Google Cloud Run, Stream Video SDK, Vision Agents (GetStream), React, TypeScript, Vite, Tailwind CSS, Flask, OpenCV, MediaPipe, Python

#### 11. Bonus Points Checklist

| Bonus | Effort | Do It? |
|---|---|---|
| Automated cloud deployment script in repo | ✅ DONE (`deploy.sh`) | **Yes** |
| Blog post with #GeminiLiveAgentChallenge | Medium (1-2 hours) | If time allows |
| Google Developer Group signup | Low (5 min) | **Yes** |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| vision_agents not counting as "GenAI SDK usage" | Low | Code directly imports `google.genai.types`. Disclose vision_agents as third-party orchestration. |
| Cloud Run deployment issues (container too large, WebRTC fails) | Medium | Start deployment on Day 1. Use `--min-instances=1` to avoid cold starts. Test WebRTC works from Cloud Run. |
| Demo video quality | Medium | Multiple takes. Script it. Focus on live demo working, not production polish. |
| "Newly created" project requirement | Low | Contest period is Feb 16 – Mar 16. First commit is within this window. |
| 2-min Gemini video limit during demo | High | Plan demo task to complete within 2 minutes. Use paper airplane (fastest task). Have backup take ready. |
| ~~Container image too large (2-4 GB)~~ | ~~Medium~~ | ✅ RESOLVED: Agent=606MB, Token=330MB, Frontend=94MB |
| Cold start latency on Cloud Run | Medium | `--min-instances=1` keeps one instance warm. Pre-warm before recording demo. |

---

## Judging Score Optimization

### Innovation & Multimodal UX (40%) — Strongest Area
- Continuous bidirectional video + audio (not turn-based)
- AI proactively catches mistakes (doesn't wait for user input)
- No buttons, no typing — pure voice + vision
- Distinct coaching persona ("patient instructor")
- Platform extensibility (different "glasses" for different domains)

### Technical Implementation (30%) — Needs Cloud Deployment
- CV "glasses" architecture = grounding (anti-hallucination)
- Function calling (`mark_step_complete`, `flag_error`) = structured agent actions
- Cloud Run deployment = robust hosting
- Direct `google-genai` imports = SDK compliance
- OpenCV + MediaPipe preprocessing pipeline = technical depth

### Demo & Presentation (30%) — Must Execute Well
- Real person, real task, real AI coaching
- Architecture diagram visible in video
- Cloud deployment proof (separate recording)
- Problem → Solution → Demo → Vision flow
- Under 4 minutes, scripted, multiple takes

---

## Immediate Next Steps

1. ~~**Set up Google Cloud project**~~ — need GCP project ID ⏳
2. ~~**Create Dockerfiles**~~ ✅ DONE (3 Dockerfiles, all tested)
3. ~~**Make token server URL configurable**~~ ✅ ALREADY DONE (env var `TOKEN_SERVER`)
4. ~~**Make frontend API URL configurable**~~ ✅ ALREADY DONE (env var `VITE_TOKEN_SERVER`)
5. ~~**Add CORS to token server**~~ ✅ ALREADY DONE (`flask_cors`)
6. **Deploy to Cloud Run** and verify it works ⏳ (run `./deploy.sh PROJECT_ID`)
7. ~~**Create `deploy.sh`**~~ ✅ DONE
8. ~~**Create architecture diagram (Mermaid)**~~ ✅ DONE (`architecture.md`)
8b. **Create polished architecture diagram** (Excalidraw/draw.io for video) ⏳
9. ~~**Write README.md**~~ ✅ DONE (local + Cloud Run instructions, tech stack, third-party disclosures)
10. **Record demo video** (<4 min) ⏳
11. **Record GCP proof video** (30-60 sec) ⏳
12. **Submit on Devpost** ⏳
13. **Sign up for Google Developer Group** (bonus points) ⏳
