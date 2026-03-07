# GuideSight — Prior Art & Competitive Research

## KEY FINDING: The technology works. The product gap is real.

Google Project Astra, ChatGPT Advanced Voice Mode, and multiple open-source demos prove
camera → AI → voice guidance works TODAY. But nobody has built a focused, structured
product for physical task coaching with step tracking, error detection, and memory.

General-purpose assistants don't hold your hand through a 12-step process.
That's our gap.

---

## Most Relevant Open Source Projects (BUILD ON THESE)

### 1. GetStream Vision Agents ⭐⭐⭐ MOST RELEVANT
- **GitHub**: https://github.com/GetStream/Vision-Agents
- **What**: Open-source Python framework specifically for real-time video + voice AI agents
- **Includes**: Golf coach example (camera → YOLO pose detection → Gemini Live voice), gym coach, yoga instructor
- **Stack**: Python, WebRTC, Gemini Live API, YOLO, Stream edge network
- **Why it matters**: Purpose-built for our exact use case. Has working examples of camera → AI analysis → voice coaching loop.
- **Tutorials**:
  - Gym coach: https://www.freecodecamp.org/news/how-to-build-a-real-time-ai-gym-coach-with-vision-agents/
  - Yoga instructor: https://getstream.io/blog/ai-voice-yoga-instructor/

### 2. LiveKit Vision Demo ⭐⭐⭐
- **GitHub**: https://github.com/livekit-examples/vision-demo
- **What**: Complete iOS + Python app using Gemini Live API for camera → voice guidance
- **Stack**: Python (Agents framework), Swift (iOS), Gemini Live, WebRTC
- **Why it matters**: Cleanest open-source implementation of "show me and I'll help you"

### 3. Pipecat Gemini Multimodal Live Demo ⭐⭐⭐
- **GitHub**: https://github.com/pipecat-ai/gemini-multimodal-live-demo
- **What**: React + Pipecat starter kit with Gemini Live video+audio
- **Stack**: React, Python (Pipecat), Daily WebRTC, Gemini Live
- **Why it matters**: Our recommended starter kit. Session management (compression + resumption) built in.
- **Also**: Single-file version at https://github.com/pipecat-ai/gemini-webrtc-web-simple

### 4. Project Pastra (Gemini Dev Guide) ⭐⭐
- **GitHub**: https://github.com/heiko-hotz/gemini-multimodal-live-dev-guide
- **What**: Step-by-step tutorial building a Project Astra clone with Gemini Live API
- **Stack**: Python, WebSocket, Vertex AI, Google Cloud Run
- **Why it matters**: Most detailed technical walkthrough of building this exact type of system

### 5. VisionClaw (Smart Glasses + Gemini Live) ⭐⭐
- **GitHub**: https://github.com/sseanliu/VisionClaw
- **What**: Meta Ray-Ban glasses connected to Gemini Live — camera streams at 1fps, voice bidirectional
- **Why it matters**: Proves 1fps is sufficient for contextual guidance. Clean minimal architecture.

### 6. Gemini Multimodal Playground ⭐⭐
- **GitHub**: https://github.com/saharmor/gemini-multimodal-playground
- **What**: Python playground for voice + video with Gemini 2.0, includes VAD
- **Why it matters**: Voice Activity Detection (VAD) solution prevents feedback loops when mic picks up ambient noise

### 7. Multimodal Gaming Assistant ⭐
- **GitHub**: https://github.com/AliiAssi/multimodal-gaming-assistant
- **What**: Real-time chess/gaming coach with screen capture + Gemini + voice
- **Stack**: Python Flask, WebRTC, Socket.IO, Gemini 2.0 Flash
- **Why it matters**: Dual COACH/PLAYER mode is an interesting UX pattern

### 8. ExerSights (AI Exercise Coach) ⭐
- **GitHub**: https://github.com/AI-Coach-PT/ExerSights
- **What**: MediaPipe-powered exercise coach with voice + visual feedback in browser
- **Why it matters**: Client-side pose detection without GPU server, works on mobile

---

## Hackathon Projects (Direct Precedents)

### OmniGuide AI (GeminiLiveAgentChallenge)
- **Link**: https://dev.to/zenieverse/building-omniguide-ai-a-real-time-visual-assistant-with-gemini-live-120e
- **What**: Exact same concept — camera → Gemini Live → voice guidance for home repair, cooking, education
- **Key insight**: Frame compression + key-frame-only streaming for latency optimization
- **Stack**: Python, Gemini Live, Cloud Run, WebSocket

---

## Platform Demos (Proving the Concept Works)

### Google Project Astra
- **Link**: https://deepmind.google/models/project-astra/
- **Demo**: Identified a bike part in a cluttered room, pulled up repair manual, walked user through fix — all via live camera
- **Takeaway**: Google's own framing is our product pitch. The difference: we're domain-specific with structured task flows.

### ChatGPT Advanced Voice Mode with Vision
- **Link**: https://techcrunch.com/2024/12/12/chatgpt-now-understands-real-time-video-seven-months-after-openai-first-demoed-it/
- **Demo**: Anderson Cooper drew body parts, AI guided through anatomy. Also: saw a "bridged joint" during soldering and called it out.
- **Takeaway**: Sends key frames at 2-4fps during motion. 92% task success rate in pilot with low-vision users.

### Google Gemini Live API for Manufacturing
- **Link**: https://cloud.google.com/blog/topics/developers-practitioners/gemini-live-api-real-time-ai-for-manufacturing
- **Demo**: Operator says "Inspect this motor for defects." Gemini Live watches camera, identifies/localizes defects, gives spoken guidance.
- **Takeaway**: Google themselves showcase camera → Gemini Live → voice for physical repair. Direct validation.

---

## Enterprise Competitors (Proving Market Demand)

| Company | Product | What They Do | Limitation vs Us |
|---|---|---|---|
| **Scope AR** | WorkLink | AR step-by-step instructions for Boeing/Lockheed | Content must be pre-authored by expert |
| **PTC** | Vuforia Expert Capture + Step Check | Record expert → auto-generate AR instructions. CV verifies each step. | Enterprise-only, expensive |
| **Microsoft** | D365 Guides + Copilot | HoloLens hologram overlays + Copilot Q&A | HoloLens discontinued Oct 2024 |
| **Vuzix** | M400 + TechSee | Smart glasses + AI troubleshooting, ~98% defect detection | Hardware-locked |
| **RealWear** | Navigator AI | Voice-controlled glasses for industrial environments | Hardware-locked |
| **GIDR.ai** | Field service AI | Hands-free AI voice guidance via smart glasses | Early stage, hardware-dependent |
| **Zuper** | Zuper Glass | AI glasses for roofers, electricians, plumbers | Beta, trades-specific |

**Key insight**: All enterprise players are hardware-locked (expensive glasses) or require pre-authored content. A phone-camera-based, AI-native solution is the obvious disruption.

---

## YC-Funded Startups in This Space

### LineWise (YC X25) ⭐⭐⭐
- **Link**: https://www.ycombinator.com/companies/linewise
- **What**: Record expert on video → AI extracts knowledge → generates SOPs → real-time guided troubleshooting for manufacturing
- **Raised**: $1.1M pre-seed
- **Takeaway**: YC funded this EXACT concept for manufacturing. Validates market. They focus on factory floor; we can differentiate with consumer/trades focus.

### AirCaps (YC-funded)
- **Link**: https://www.ycombinator.com/companies/aircaps
- **What**: AI assistance for in-person conversations via wearable. Founders built voice AI on AR glasses previously.
- **Takeaway**: YC interested in the wearable + voice AI space broadly.

---

## Academic Research Validating the Approach

### Johns Hopkins AI Surgical Coaching (Dec 2025)
- **Link**: https://hub.jhu.edu/2025/12/01/artificial-intelligence-trains-surgeons/
- **What**: AI watches doctors suture → compares novice to expert → gives real-time corrections
- **Pattern**: Record expert → build reference model → compare novice in real-time → delta feedback

### Surgical Coaching RCT (2025)
- **Link**: https://www.nature.com/articles/s44387-025-00032-8
- **What**: AI predicts surgical risk 5x/sec, gives auditory instructions. Tested in randomized trial.
- **Finding**: Expert feedback BEFORE AI instruction works better than reverse. Implication: structured guidance first, then AI feedback during practice.

---

## Non-Obvious Competitors

### iFixit FixBot
- **Link**: https://www.ifixit.com/go/fixbot
- **What**: AI repair assistant trained on 125K repair guides. Voice-enabled because "your hands are busy." Photo upload for diagnosis.
- **Gap**: No real-time camera. Upload photos only. We close this gap.

### Mentra Smart Glasses
- **Link**: https://mentraglass.com/
- **What**: Open-source OS for smart glasses. Has "Chess Cheater" app (camera → AI → whispered move).
- **Insight**: Camera + whispered audio (no display) is a viable form factor for hands-on tasks.

---

## Architecture Patterns Learned

1. **Frame compression + key-frame-only streaming** (OmniGuide) — don't send every frame
2. **YOLO + Gemini Live** (Vision Agents) — YOLO for fast spatial detection, Gemini for NL coaching
3. **Function calling during video stream** (freeCodeCamp gym coach) — AI calls `mark_step_done()` while watching
4. **Record expert → compare novice → delta feedback** (Johns Hopkins) — gold standard for skill coaching
5. **VAD is critical** (Gemini Playground) — prevents feedback loops from ambient noise
6. **Expert-first then AI** (surgical RCT) — structured instruction first, AI reinforcement during practice
7. **1fps is sufficient** (VisionClaw, Gemini Live spec) — no need for high frame rates for task guidance

---

## What Makes GuideSight Different From All of These

| Existing Solution | Their Approach | Our Advantage |
|---|---|---|
| Project Astra / ChatGPT AVM | General-purpose "ask anything" | Domain-specific with structured task flows, step tracking, error detection |
| Enterprise AR (Scope AR, Vuforia) | Pre-authored content, expensive hardware | AI-generated guidance, works on any phone camera |
| Fitness apps (Impakt, ExerSights) | Pose estimation for exercise only | Any physical task, not just body movement |
| iFixit FixBot | Photo upload, no real-time | Continuous real-time camera + voice |
| LineWise (YC X25) | Manufacturing-specific | Broader: trades, DIY, education, cooking |
| Smart glasses (Vuzix, RealWear) | Hardware-locked, enterprise pricing | Software-only, phone camera, consumer accessible |

**Our moat**: Structured task coaching (not general Q&A) + step-by-step tracking + error detection + works on any phone/laptop camera. The difference between "an AI that can answer questions about what it sees" and "an AI coach that systematically teaches you a new physical skill."
