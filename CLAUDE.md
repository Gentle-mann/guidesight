# GuideSight - Real-Time AI Physical Task Coach

## Hackathon: c0mpiled San Fransokyo (March 8, 2026)
- **Venue**: Toranomon Hills Mori Tower, Minato City, Tokyo
- **Schedule**: 10:00-18:30 (4hr build session: 12:30-16:30)
- **Theme**: YC RFS Spring 2026 → "AI Guidance for Physical Work"
- **Deliverable**: 90-second demo/pitch video
- **Prize**: 1st $5,000 / 2nd $2,000 / 3rd $1,000 + YC Partner Office Hours
- **Team size**: Max 4
- **Judges**: All YC founders — Kai Brokering (VoiceOS/YC X25), Taishi Nojima (Canopi/YC S21), Henry Ndubuaku (Cactus/YC S25), Abhilash Chowdhary (CrustData/YC F24)

## Product Vision
Real-time AI coach that sees through your camera and talks you through physical tasks naturally -- like having an expert instructor looking over your shoulder. No buttons, no turn-taking, continuous bidirectional conversation with vision.

### Platform Direction (Hackathon Strategy)
GuideSight is not a single-use coaching tool — it's a **platform** that lets companies build real-time AI guidance for any physical task their workers perform.

**Core architectural insight: "Gemini is the brain, CV tools are the glasses."**

Gemini can see raw pixels and reason about general scenes, but it **cannot reliably measure** spatial details (paper orientation, fold alignment, component placement, hand position). CV tools (OpenCV, MediaPipe, YOLO, etc.) act as specialized "glasses" that **translate raw pixels into clear annotations drawn directly on the video frame**. Gemini then reasons about the annotations, not the raw pixels.

```
Raw frame → CV "Glasses" (domain-specific processors) → Annotated frame → Gemini reasons + coaches
```

**Every physical task domain needs different "glasses." The brain stays the same.**

| Domain | CV "Glasses" Needed | What They Annotate |
|---|---|---|
| Paper folding | OpenCV contours + MediaPipe hands | Paper orientation, fold lines, hand position |
| Circuit building | YOLO-World zero-shot detection | Component identification ("LED", "resistor"), placement |
| HVAC repair | YOLO trained on HVAC parts + depth estimation | Valve positions, pipe connections |
| Nursing/medical | MediaPipe pose + hand tracking | Body positioning, hand hygiene, instrument handling |
| Cooking | YOLO-World + HSV color segmentation | Ingredient state, cutting technique |

**Platform provides:** Coaching engine (Gemini + WebRTC + voice), library of CV processors ("glasses"), task authoring tool, ability to add custom processors.
**Company brings:** Domain expertise (steps, errors to catch), optionally their own trained CV model.

**Competitive positioning:** Squint, DeepHow, and Dozuki create **static** pre-recorded instructions. GuideSight creates a **live AI coach** that watches what you do and talks you through it. No pre-recording needed — the AI already knows how to do the task. The task JSON provides structure and consistency; the CV glasses provide reliable vision; Gemini provides the reasoning and natural conversation.

**Pitch line:** "Gemini can reason but can't measure. Our CV layer measures, Gemini reasons."

### Market Context (from Research)
- Connected worker platform market: **$8.6B (2025) → $20B+ (2030)**, 18-25% CAGR
- Tulip ($1.3B unicorn), Squint ($265M, Sequoia), MaintainX ($2.5B) — all "create then consume" models
- **No existing platform** does real-time AI vision + voice coaching during task execution
- YC explicitly calls for this in Spring 2026 RFS: "AI Guidance for Physical Work"
- Gemini Live Agent Challenge ($80K prizes, deadline March 16) — dual-submit opportunity after hackathon
- Pricing opportunity: $50-100/user/month (premium justified by real-time coaching capability)

### Critical Technical Update: 2-Minute Video Limit is SOLVED
Gemini Live API now supports **context window compression + session resumption** for unlimited video+audio sessions:
```python
context_window_compression=ContextWindowCompressionConfig(
    sliding_window=SlidingWindow(target_tokens=12800),
    trigger_tokens=20480,
)
session_resumption=SessionResumptionConfig(handle=None)
```
- Connection resets every ~10 min, but session resumption reconnects transparently
- Resumption tokens valid for 2 hours after termination
- Application-side coaching state (step progress, errors) must be maintained in Python agent, not in Gemini memory

---

## Tech Stack (Actual)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **AI Engine** | Gemini 2.5 Flash via Live API | Real-time video+audio coaching (1fps vision, native TTS/STT) |
| **Orchestration** | Vision Agents (`vision_agents`) | Python framework wrapping Gemini Realtime + function calling |
| **Transport** | Stream Video (`@stream-io/video-react-sdk` + `getstream`) | WebRTC for camera/mic/audio between browser and agent |
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS v4 | UI (task picker, coaching session, admin dashboard) |
| **Token Server** | Flask (Python) | Stream token generation, task CRUD API, call/task ID coordination |
| **Task Storage** | JSON files on disk (`server/tasks/*.json`) | No database needed |

### API Keys Required (in `.env`)
- `GOOGLE_API_KEY` — Gemini Live API (from Google AI Studio)
- `STREAM_API_KEY` + `STREAM_API_SECRET` — Stream Video

### Why This Stack?
- **Gemini 2.5 Flash** is the ONLY model with continuous video streaming + native bidirectional audio via the Live API. Gemini 3.1 Pro does NOT support Live API despite being newer.
- **Vision Agents** handles Gemini Realtime LLM creation, function registration, WebRTC via Stream Edge transport, and multi-speaker audio filtering.
- **Stream Video** provides WebRTC transport. The Python agent joins as a participant (`guidesight-coach`), receives video frames, sends audio back.
- **VP8 codec is required** — the Python agent (aiortc) only supports VP8/H264, not VP9 which Chrome defaults to. App.tsx forces `preferredCodec: 'vp8'`.

---

## Project Structure

```
guidesight/
├── CLAUDE.md                           # This file
├── RESEARCH.md                         # Competitive analysis & prior art
├── .env                                # API keys (GOOGLE_API_KEY, STREAM_*)
├── .env.example                        # Template
├── venv/                               # Python virtual environment
│
├── server/
│   ├── token_server.py                 # Flask server (port 8080) — tokens + task CRUD + call/task ID
│   ├── agent.py                        # Gemini coaching agent — polls for task, joins Stream call
│   ├── prompts/
│   │   └── task_coach.md               # System prompt template (task-agnostic)
│   └── tasks/
│       ├── led_circuit.json            # 6-step LED breadboard task
│       └── paper_airplane.json         # 6-step paper dart airplane task
│
└── client/
    ├── package.json                    # React 19 + Tailwind v4 + Stream SDK
    ├── vite.config.ts
    ├── tsconfig.json
    ├── src/
    │   ├── main.tsx                    # React entry point
    │   ├── App.tsx                     # Main app — task picker → detail → coaching flow + #admin routing
    │   ├── types.ts                    # TaskSummary, TaskStep, TaskDetail interfaces
    │   ├── index.css                   # Tailwind + dark theme CSS variables
    │   └── components/
    │       ├── TaskPicker.tsx           # Grid of task cards for selection
    │       ├── TaskDetail.tsx           # Pre-join screen (task info + Start/Back)
    │       ├── CoachingSession.tsx      # Live video + step tracker + agent audio
    │       ├── StepTracker.tsx          # Step progress sidebar
    │       └── AdminDashboard.tsx       # Full CRUD for tasks at #admin
    └── dist/                           # Build output
```

---

## Startup

```bash
# Terminal 1: Token server (must start first)
cd guidesight
source venv/bin/activate
cd server && python token_server.py          # http://localhost:8080

# Terminal 2: Agent (waits for task selection)
source venv/bin/activate
cd server && python agent.py                 # Polls GET /task-id until user picks a task

# Terminal 3: Frontend
cd guidesight/client
npm run dev                                  # http://localhost:5173
```

**Startup order matters**: Token server first → agent second (needs token server to register call ID and poll task ID) → frontend last.

---

## How the AI Coaching Works

### Gemini's Knowledge vs Task JSON
Gemini **already knows** how to do common tasks (fold paper airplanes, build circuits, etc.) from its training data. The task JSON doesn't teach Gemini — it provides **structure**:

- **Steps**: Enforce a consistent, repeatable sequence (same steps every session)
- **Visual cues**: Tell Gemini what to look for at each step to confirm completion
- **Common errors**: Prime Gemini to watch for specific mistakes

Without the JSON, Gemini could freestyle-coach any task it knows. The JSON makes the coaching **trackable** (step 3 of 6) and **consistent** (same instructions each time).

### System Prompt Flow
1. `agent.py` loads the selected task JSON
2. `build_system_prompt()` injects task name + formatted steps into the `task_coach.md` template
3. Template gives Gemini its persona (patient coach), vision rules (describe what you ACTUALLY see), behavior rules (confirm steps, catch errors, be concise)
4. Gemini receives continuous 1fps video frames + user audio via WebRTC
5. Gemini speaks back via native TTS — audio is bound in the browser via `call.bindAudioElement()`

### Function Calling
Gemini can call two registered functions during a session:
- `mark_step_complete(step_number, notes)` — logs step completion, advances `coaching_state`
- `flag_error(step_number, error_type, description)` — logs a user mistake

These are registered on the `gemini.Realtime` LLM instance and execute in the Python agent process.

---

## API Endpoints (Token Server — port 8080)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/token/<user_id>` | Generate Stream Video JWT for frontend |
| GET | `/call-id` | Get current call ID (set by agent) |
| POST | `/call-id` | Set call ID (agent calls on startup) |
| GET | `/task-id` | Get selected task ID (agent polls this) |
| POST | `/task-id` | Set selected task ID (frontend calls before joining) |
| GET | `/tasks` | List all tasks (summary: id, name, description, difficulty, time, components, step_count) |
| GET | `/tasks/<task_id>` | Get full task JSON including steps |
| POST | `/tasks` | Create new task (writes JSON file) |
| PUT | `/tasks/<task_id>` | Update existing task |
| DELETE | `/tasks/<task_id>` | Delete task file |

### Task Selection Flow
1. Frontend fetches `GET /tasks` on mount → shows TaskPicker
2. User clicks a task → frontend fetches `GET /tasks/<id>` → shows TaskDetail
3. User clicks "Start" → frontend POSTs `POST /task-id` with `{taskId: "paper_airplane"}`
4. Agent (polling `GET /task-id` every 2s) picks up the task ID → loads JSON → builds system prompt → joins Stream call
5. Frontend fetches `GET /call-id` → joins the same Stream call → coaching begins

---

## Task JSON Schema

```json
{
  "id": "task_slug",
  "name": "Human-readable name",
  "description": "One-line description",
  "difficulty": "beginner|intermediate|advanced",
  "estimated_time": "5 minutes",
  "components": ["1x Item A", "2x Item B"],
  "steps": [
    {
      "step": 1,
      "instruction": "What to do (detailed, spatial references)",
      "visual_cue": "What the AI should see when this step is done correctly",
      "common_errors": ["Mistake 1", "Mistake 2"]
    }
  ]
}
```

Tasks live in `server/tasks/` as individual JSON files. The file name must match the `id` field (e.g., `paper_airplane.json` has `"id": "paper_airplane"`).

---

## Frontend App Flow

```
URL has #admin?
  ├── YES → AdminDashboard (task CRUD)
  └── NO → Client loading?
        ├── YES → "Connecting..."
        └── NO → Task selected?
              ├── NO → TaskPicker (grid of task cards)
              └── YES → Joined call?
                    ├── NO → TaskDetail (task info + Start/Back)
                    └── YES → CoachingSession (live video + step tracker)
```

### Key Frontend Constants
```typescript
const API_KEY = 'eu24qn67gz64';     // Stream Video API key
const USER_ID = 'guidesight-user';   // Hardcoded user ID
const TOKEN_SERVER = 'http://localhost:8080';
```

### Admin Dashboard
Accessible at `http://localhost:5173/#admin`. Full CRUD:
- List all tasks with Edit/Delete buttons
- Create new tasks with dynamic step editor
- Each step has: instruction, visual cue, common errors (add/remove)
- Components as textarea (one per line)
- "Back to App" link returns to task picker

---

## CSS Theme (Dark)

```css
--bg-primary: #0f0f14       /* Deep dark navy */
--bg-secondary: #1a1a24     /* Slightly lighter */
--bg-card: #22222e          /* Card backgrounds */
--accent: #6c63ff           /* Electric blue/purple */
--accent-glow: rgba(108, 99, 255, 0.3)
--success: #4ade80           /* Green */
--error: #f87171             /* Red */
--warning: #fbbf24           /* Amber */
--text-primary: #f0f0f5      /* White-ish */
--text-secondary: #8888a0    /* Gray */
```

---

## Gemini Live API Specs

### Video Input
- Resolution: 768x768 recommended
- Frame rate: 1 FPS (server-side processing)
- Billing: 258 tokens/second at 1FPS

### Audio
- Input: Raw 16-bit PCM, 16kHz, little-endian
- Output: Raw 16-bit PCM, 24kHz, little-endian
- 30 HD voices, 24+ languages (Japanese + English both supported)
- Voice Activity Detection built-in, barge-in support

### Session Limits
- Audio-only: 15 min max
- Audio+video: **2 min max** (without compression)
- Context window: 128K tokens

### Why NOT Gemini 3.1 Pro?
Gemini 3.1 Pro does NOT support the Live API. The Live API (real-time bidirectional video+audio streaming) is ONLY supported by `gemini-2.5-flash-native-audio`.

---

## Real-Time Vision: Struggles, Discoveries & Solution

### The Goal
Make Gemini actually SEE what the user is doing through the camera — detect paper orientation (portrait/landscape), catch folding mistakes mid-action, and never advance to the next step without visual confirmation. Like a human instructor watching your hands.

### Problem 1: Gemini Was Blind When User Was Silent
**Root cause**: `vision_agents` defaults to `turn_coverage=TurnCoverage.TURN_INCLUDES_ONLY_ACTIVITY` in the Gemini Realtime config. This means Gemini ONLY processes video frames while the user is actively speaking. When the user is silently folding paper — exactly when vision matters most — Gemini literally does not see the frames.

**Fix**: Override the config in `agent.py`:
```python
llm = gemini.Realtime(
    fps=1,
    config=LiveConnectConfigDict(
        realtime_input_config=RealtimeInputConfigDict(
            turn_coverage=TurnCoverage.TURN_INCLUDES_ALL_INPUT,
        ),
    ),
)
```

**Import path**: `from google.genai.types import TurnCoverage, RealtimeInputConfigDict, LiveConnectConfigDict`

### Problem 2: Gemini Said "Portrait" When Paper Was Landscape (Confirmation Bias)
**Root cause**: The task JSON step 1 says "Place paper in portrait orientation." Gemini reads the task instructions and answers based on what the paper SHOULD be, not what it ACTUALLY sees. This is confirmation bias — the task context overpowers the visual input.

**Fix**: Added an absolute rule at the top of `task_coach.md`:
```
## ABSOLUTE RULE: NEVER let task instructions override what you SEE
The task steps describe what SHOULD happen. But the user may NOT be doing it correctly.
You MUST always report what you ACTUALLY SEE in the video frame, even if it contradicts
the task instructions. The task steps are your EXPECTATIONS, not your observations.
Your observations come ONLY from the video frame.
```

### Problem 3: Gemini Sometimes "Can't See" the Paper (Intermittent Blindness)
**Symptoms**: When told not to guess, Gemini would either answer correctly OR say "I can't see the paper" — roughly 50/50. Frames were confirmed flowing (1fps, 1280x720, zero send failures in logs).

**Root cause**: Context window compression. With `TURN_INCLUDES_ALL_INPUT`, ALL frames enter the context. Our aggressive compression (trigger=10240, target=5120) was purging recent frames before Gemini could analyze them. After compression, Gemini had no recent frame in its working context.

**Mitigation**: Relaxed compression thresholds: `trigger_tokens=20480, target_tokens=12800`

### Problem 4: 2-Minute Session Hard Limit
**Symptoms**: Gemini connection dies with error 1011 (internal error) or 1008 (policy violation) after ~2 minutes of video+audio streaming. Audio buffer overflows to 48-67 seconds as WebRTC keeps sending but Gemini WebSocket is dead.

**Root cause**: Gemini Live API has a hard ~2 minute session limit for video+audio. This is NOT fixable with compression or config changes — it's a server-side Google limit. Higher FPS (2fps) made it die FASTER (more tokens consumed per second).

**Status**: Unsolved. Needs session resumption (reconnect Gemini when it dies, preserve coaching state). The `LiveConnectConfigDict` has a `session_resumption` field that may help.

### Problem 5: Gemini's Raw Vision Is Unreliable for Spatial Details
**Symptoms**: Even with all the above fixes, Gemini at 1fps JPEG 768x768 cannot reliably determine paper orientation, fold directions, or spatial relationships. It gets portrait/landscape wrong even when it has the frame.

**Root cause**: The Gemini Live API is optimized for real-time audio conversation. Vision is secondary. The model's attention doesn't consistently focus on spatial details in JPEG frames. It's good at general scene understanding ("person holding paper") but struggles with precise spatial reasoning ("paper is 10% wider than tall = landscape").

### The Discovery: How Successful Projects Actually Do It

**The Vision Agents Golf Coach example** (same framework we use) achieves reliable real-time coaching by combining YOLO pose detection with Gemini. The key insight:

**YOLO annotations are drawn directly onto the video frames as visual overlays. Gemini sees the annotated image, not raw pixels.**

```
Raw Camera Frame → YOLO draws skeleton → Annotated frame → Gemini sees annotations
```

Architecture in the golf coach:
1. `processors=[ultralytics.YOLOPoseProcessor(model_path="yolo26n-pose.pt")]` in Agent constructor
2. YOLO runs on each frame, draws colored lines/circles at joint positions
3. The annotated frame is published as a higher-priority video track
4. Gemini's `watch_video_track()` receives the annotated frames instead of raw frames
5. System prompt tells Gemini: "The video shows body positions using YOLO's pose analysis"
6. **No text/JSON detection results are sent** — it's purely visual annotations on the frame

**The processor class hierarchy** (`VideoProcessorPublisher`) handles the plumbing:
- Receives raw frames via `process_video()`
- Publishes annotated frames via `publish_video_track()` (returns `QueuedVideoTrack`)
- Agent routes Gemini to watch the published track (priority=2) over raw track (priority=0)

### The Solution: OpenCV Paper Detector Processor

For paper airplane coaching, we don't need YOLO (that's for body pose). We need a `PaperDetectorProcessor` using OpenCV:
1. Detect the largest light-colored rectangle in each frame (the paper)
2. Draw a bounding box around it
3. Label it with "PORTRAIT" or "LANDSCAPE" + orientation arrow
4. Optionally detect fold lines (edge detection on the paper region)
5. Gemini sees annotated frames and can reliably reason about orientation and folds

This follows the exact same pattern as the golf coach but with OpenCV contour detection instead of YOLO pose estimation. Much lighter — no ML model needed.

### Key Config Discoveries

| Config | Default | What it does | Our override |
|--------|---------|-------------|-------------|
| `turn_coverage` | `TURN_INCLUDES_ONLY_ACTIVITY` | Only process frames during speech | `TURN_INCLUDES_ALL_INPUT` (see frames always) |
| `context_window_compression.trigger_tokens` | 25600 | When to compress | 20480 (balance vision vs session length) |
| `context_window_compression.sliding_window.target_tokens` | 12800 | How much to keep | 12800 |
| `proactivity.proactive_audio` | not set | Gemini speaks unprompted | Causes 1008 error — NOT SUPPORTED |
| `thinking_config.thinking_budget` | not set | Internal reasoning tokens | Causes 1008 error — NOT SUPPORTED |

### Monkey-Patching JPEG Quality

`frame_to_png_bytes()` (actually outputs JPEG) is imported via `from video_utils import frame_to_png_bytes` in `gemini_realtime.py`. To override JPEG quality, you MUST patch the name in the gemini_realtime module directly:
```python
import vision_agents.plugins.gemini.gemini_realtime as _gemini_rt
_gemini_rt.frame_to_png_bytes = your_custom_function
```
Patching `video_utils.frame_to_png_bytes` does NOT work because the direct import creates a local binding at import time.

### Frontend Call-ID Polling Fix

The frontend previously fetched `GET /call-id` once immediately after posting the task-id. But the agent needs ~3-5 seconds to pick up the task, create the Stream call, and register the call-id. Fixed in `App.tsx` by polling up to 15 times with 2-second intervals:
```typescript
for (let i = 0; i < 15; i++) {
  const callIdRes = await fetch(`${TOKEN_SERVER}/call-id`);
  const data = await callIdRes.json();
  callId = data.callId;
  if (callId) break;
  await new Promise((r) => setTimeout(r, 2000));
}
```

### Next Step: MediaPipe Hand Tracking Integration

**Why**: The same problem we solved for paper orientation (Gemini can't reliably reason about spatial relationships from raw pixels) applies to **hands**. Gemini struggles to determine which finger is doing what, fold direction from hand movement, and whether the user is gripping a corner vs pressing a crease. MediaPipe solves this with 21-landmark hand tracking at 30+ fps.

**What MediaPipe adds on top of OpenCV**:

| Feature | Annotation drawn on frame | How it helps coaching |
|---|---|---|
| **21 hand landmarks per hand** | Colored skeleton overlay (lines + dots at each joint) | Gemini sees exactly where each finger is relative to the paper |
| **Fold direction** | Arrow annotation from hand movement vector over consecutive frames | "FOLDING LEFT→RIGHT" drawn on frame — Gemini reads direction instead of guessing |
| **Pinch/grip detection** | "PINCHING" label when thumb+index distance < threshold | Gemini knows when user is grabbing a corner |
| **Two-hand tracking** | "L" and "R" labels on each hand | "LEFT HAND: top-left" / "RIGHT HAND: bottom-right" spatial labels |
| **Handedness** | Left/right classification built in | Important for mirror-mode video (user's camera is mirrored) |

**Implementation plan** — add to existing `PaperDetectorProcessor._detect_and_annotate()`:

```python
import mediapipe as mp

# Initialize once in __init__
mp_hands = mp.solutions.hands
self._hands = mp_hands.Hands(
    static_image_mode=False,    # Video mode (uses temporal tracking)
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)
self._mp_draw = mp.solutions.drawing_utils
self._mp_styles = mp.solutions.drawing_styles

# In _detect_and_annotate(), after OpenCV paper detection:
rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
results = self._hands.process(rgb)

if results.multi_hand_landmarks:
    for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
        # Draw hand skeleton on the annotated frame
        self._mp_draw.draw_landmarks(
            annotated,
            hand_landmarks,
            mp_hands.HAND_CONNECTIONS,
            self._mp_styles.get_default_hand_landmarks_style(),
            self._mp_styles.get_default_hand_connections_style(),
        )

        # Get handedness label
        handedness = results.multi_handedness[hand_idx].classification[0]
        label = f"{handedness.label} ({handedness.score:.0%})"

        # Draw handedness label near wrist (landmark 0)
        wrist = hand_landmarks.landmark[0]
        wx, wy = int(wrist.x * w), int(wrist.y * h)
        cv2.putText(annotated, label, (wx, wy - 20),
                     cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

        # Optional: detect pinch (thumb tip to index tip distance)
        thumb_tip = hand_landmarks.landmark[4]
        index_tip = hand_landmarks.landmark[8]
        dist = ((thumb_tip.x - index_tip.x)**2 + (thumb_tip.y - index_tip.y)**2)**0.5
        if dist < 0.05:  # Threshold for pinch
            cv2.putText(annotated, "PINCHING", (wx, wy - 45),
                         cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
```

**Prompt additions** for `task_coach.md`:
```markdown
### Hand annotations
Your video feed also shows hand tracking overlays:
- Colored skeleton lines connecting 21 hand landmarks per hand
- "Left" or "Right" label near each wrist
- "PINCHING" label when fingers are gripping
- Use these to understand exactly what the user's hands are doing
```

**Installation**: `pip install mediapipe`

**Performance note**: MediaPipe Hands runs on CPU at 30+ fps. Combined with OpenCV contour detection, total per-frame cost is ~10-20ms — well within the 5fps processing budget (200ms per frame). No GPU required.

### References
- Golf Coach example: https://github.com/GetStream/Vision-Agents/tree/main/examples/02_golf_coach_example
- Blog post on Vision Agents + Gemini: https://getstream.io/blog/vision-agent-gemini-3/
- Project Astra (Google's real-time vision AI): https://deepmind.google/models/project-astra/
- Posture AI with Vision Agents: https://dev.to/harishkotra/building-a-real-time-gamified-posture-ai-with-the-vision-agents-sdk-6fk
- MediaPipe Hand Landmarks: https://developers.google.com/mediapipe/solutions/vision/hand_landmarker

---

## Known Issues & Limitations

- **Step sync**: StepTracker is hardcoded to `currentStep={1}`. When agent calls `mark_step_complete()`, the frontend doesn't update. Needs Stream custom events to sync.
- **2-minute video cap**: Hard Gemini Live API limit for video+audio sessions. Dies with error 1011. Need session resumption.
- **Gemini raw vision unreliable for spatial details**: Cannot reliably detect paper orientation from raw JPEG frames. Needs OpenCV preprocessing (annotate frames before Gemini sees them).
- **Audio binding**: AgentAudio has debug logging every 3s — useful for troubleshooting but noisy.
- **Error display**: `flag_error` calls are logged server-side only, not shown in UI.
- **Single user**: Hardcoded `guidesight-user` — no multi-user support.
- **No auth on admin**: `#admin` is accessible to anyone.

---

## 90-Second Demo Video Structure

```
0:00-0:10  Problem: "8M unfilled skilled jobs. Training takes months."
0:10-0:15  Product: "GuideSight. AI sees what you see. Coaches in real-time."
0:15-0:55  LIVE DEMO: Person builds circuit / folds airplane guided by AI voice
           - Show AI catching a mistake and correcting
           - Show natural conversation ("which hole?" → AI answers)
           - Task completes successfully
0:55-1:10  Business: "$200B field service market. $500/seat/month."
1:10-1:20  Close: "GuideSight. The skilled workforce, on demand."
1:20-1:30  Team + branding
```

---

## Physical Props (Buy at Akihabara)

| Item | Purpose | Est. Cost |
|---|---|---|
| Breadboard | LED circuit task | ~300 yen |
| LEDs (assorted) | Visible task completion | ~200 yen |
| Resistors (220 ohm) | Circuit component | ~200 yen |
| Jumper wires | Connections | ~300 yen |
| Coin battery + holder (3V) | Power | ~300 yen |
| A4 paper | Paper airplane task | ~0 yen |
| USB ring light | Consistent lighting | ~1500 yen |
| Phone tripod (optional) | Stable camera angle | ~1000 yen |
| **Total** | | **~3,800 yen** |

---

## Key Resources
- Gemini Live API docs: https://ai.google.dev/gemini-api/docs/live
- Gemini Live capabilities guide: https://ai.google.dev/gemini-api/docs/live-guide
- Gemini models list: https://ai.google.dev/gemini-api/docs/models
- Vision Agents (GetStream): used as orchestration layer
- Stream Video React SDK: https://getstream.io/video/docs/react/
- YC RFS Spring 2026: https://www.ycombinator.com/rfs

---

## Technology Research
See [TECH_RESEARCH.md](./TECH_RESEARCH.md) for comprehensive CV/AI technology research (YOLO-World, CLIP, CoTracker, Depth Anything, Moondream, Qwen3-Omni, etc.) and key external discoveries (Origami Sensei, AR Origami Training, Gemini Live Agent Challenge).

---

## Future Features

- **Step sync via Stream custom events**: When Gemini calls `mark_step_complete`, emit a Stream custom event so the frontend StepTracker updates in real-time (currently hardcoded to step 1).
- **Multi-speaker support**: Multiple users in one session. Requires `FirstSpeakerWinsFilter` warmup via `AgentLauncher` + multi-participant UI.
- **Session persistence & history**: Save completed sessions, step timings, errors, transcripts. Track improvement over time.
- **Multilingual coaching**: Language selection (Japanese + English priority). Gemini supports 24+ languages natively.
- **Screen share mode**: Vision Agents supports `TrackType.SCREEN_SHARE` — could enable coaching for software/digital tasks.
- **Adaptive difficulty**: AI adjusts verbosity based on user skill level.
- **Error analytics dashboard**: Aggregate `flag_error` calls across sessions to identify which steps users struggle with most.
- **Session resumption**: Handle the 2-min video cap gracefully with automatic reconnection and context preservation.
