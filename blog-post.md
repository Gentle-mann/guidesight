#GeminiLiveAgentChallenge #GoogleCloud #AI #Gemini

# Gemini Can Reason But Can't Measure: How We Built a Real-Time AI Coach That Actually Sees

*Created for the [Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com/) #GeminiLiveAgentChallenge*

---

Eight million skilled jobs sit unfilled in the US alone. The connected worker platform market is racing toward $20B by 2030. Yet training still looks the same as it did twenty years ago: static manuals, pre-recorded videos, shadowing someone who may or may not be patient. What if every worker had an expert looking over their shoulder — one who never gets tired, speaks naturally, and catches mistakes the moment they happen?

That question led us to build **GuideSight**: a real-time AI coach that sees through your camera and talks you through physical tasks using continuous bidirectional video and voice. No buttons. No turn-taking. Just work with your hands while an AI watches and guides you, like having an expert instructor in the room.

**Try it live:** [guidesight-frontend-119744000668.us-central1.run.app](https://guidesight-frontend-119744000668.us-central1.run.app)
**Source:** [github.com/Gentle-mann/guidesight](https://github.com/Gentle-mann/guidesight)

## The Key Insight

Here is the sentence that defines our entire architecture:

> **"Gemini can reason but can't measure. Our CV layer measures, Gemini reasons."**

Gemini 2.5 Flash is extraordinary at understanding scenes, holding natural conversations, and reasoning about what it sees. But when we asked it to determine whether a piece of paper was in portrait or landscape orientation from a raw JPEG frame — something a five-year-old can do — it got it wrong half the time.

Multimodal AI models are general-purpose reasoners. They are not precision measurement instruments. Trying to make Gemini reliably detect spatial details from raw pixels is fighting against the model's nature. The solution is not better prompting. It is giving the model better inputs.

## The Architecture: CV "Glasses"

We built a preprocessing pipeline we call **CV Glasses** — domain-specific computer vision processors that annotate raw camera frames before Gemini ever sees them.

```
Raw Camera Frame → OpenCV (paper contour, orientation label) → MediaPipe (hand skeleton, pinch detection) → Annotated Frame → Gemini reasons + coaches via voice
```

OpenCV detects the paper, draws a bounding box, and labels it "PORTRAIT" or "LANDSCAPE." MediaPipe tracks 21 hand landmarks per hand, draws skeleton overlays, detects pinch gestures, and labels left versus right. By the time the frame reaches Gemini, the spatial relationships are spelled out visually on the image itself. Gemini reads annotations instead of guessing about pixels.

This pattern generalizes. Paper folding needs contour detection. Circuit building needs component detection (YOLO-World). HVAC repair needs depth estimation. Different tasks need different "glasses." The reasoning engine stays the same.

## The Technical Struggles (The Good Part)

Building this taught us things that no documentation covers. Here are the problems that almost killed the project.

### Gemini Was Blind When Users Were Silent

The default Gemini Live API configuration (`TURN_INCLUDES_ONLY_ACTIVITY`) only processes video frames while the user is actively speaking. When someone is silently folding paper — exactly when vision matters most — the model literally does not see the frames. We discovered this after hours of debugging why the AI seemed to lose track of what users were doing mid-task. The fix: override the config to `TURN_INCLUDES_ALL_INPUT`.

### Confirmation Bias in the Model

Our task JSON describes what each step should look like. When we asked Gemini "Is the paper in portrait orientation?", it would read the task instruction ("Place paper in portrait") and answer "yes" — regardless of what the video actually showed. The task context was overpowering visual input. We solved this by adding an absolute rule to the system prompt: *"The task steps are your EXPECTATIONS, not your observations. Your observations come ONLY from the video frame."* A prompt fix, but one we would never have found without extensive testing.

### Context Window Compression Was Eating Frames

With `TURN_INCLUDES_ALL_INPUT` enabled, every frame enters the context window. Our aggressive compression settings were purging recent frames before Gemini could analyze them. The model would respond with "I can't see the paper" — not because frames were not arriving, but because compression had already discarded them. We relaxed the compression thresholds (`trigger_tokens=20480, target_tokens=12800`) to keep enough visual context in the window.

### The Two-Minute Wall

Gemini Live API has a hard session limit of approximately two minutes for video+audio streaming. The connection dies with a WebSocket error. Higher FPS makes it die faster. This is a server-side Google constraint, not a bug in our code. We implemented session resumption using `SessionResumptionConfig` to reconnect transparently and maintain coaching state on the Python agent side across reconnections.

### Raw Vision Simply Was Not Reliable Enough

Even with all the above fixes, Gemini at 1fps JPEG could not reliably determine paper orientation from raw pixels. This is what drove us to the CV Glasses architecture. It was not our first choice — it was the solution we arrived at after exhausting prompt engineering, resolution tuning, and frame rate adjustments. The moment we drew "PORTRAIT" on the frame in green text, Gemini got it right every time.

## The Stack

| Layer | Technology | Role |
|---|---|---|
| AI Engine | Gemini 2.5 Flash via Live API | Real-time bidirectional video + audio coaching |
| SDK | `google-genai` (Python) | Direct Gemini API access, task generation |
| CV Glasses | OpenCV + MediaPipe | Paper detection, hand tracking, frame annotation |
| Transport | Stream Video SDK | WebRTC for camera/mic between browser and agent |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS | Task picker, coaching session, step tracker |
| Backend | Flask (Python) | Token server, task CRUD, coaching state |
| Deployment | Google Cloud Run (3 services) | Token server, coaching agent, frontend (nginx) |

The coaching agent receives 1fps video via WebRTC, runs each frame through the CV pipeline, feeds annotated frames to Gemini, and streams Gemini's voice responses back to the user's browser. Gemini also calls registered functions (`mark_step_complete`, `flag_error`) to advance through task steps and log mistakes — giving the coaching structure and trackability.

## Results

GuideSight delivers real-time coaching that works. The AI sees your camera, speaks naturally, catches mistakes as they happen, and advances through structured task steps. Users can interrupt, ask questions, and get immediate answers — all while working with their hands.

The admin dashboard lets anyone author new tasks with steps, visual cues, and common errors. You can even upload a video or describe a task in natural language and have Gemini generate the full task JSON automatically.

## What's Next

The CV Glasses architecture opens a clear path forward. Each new physical domain is a new set of processors: YOLO-World for component detection in circuit building, pose estimation for ergonomic tasks, depth estimation for 3D spatial reasoning. The brain stays the same. The glasses change.

We are also working on step synchronization between the agent and frontend via Stream custom events, multilingual coaching (Gemini supports 24+ languages natively), and session analytics to identify which steps users struggle with most across sessions.

The future of worker training is not another manual or video. It is an AI that watches what you do and tells you what to do next.

---

## Built With

- **Gemini 2.5 Flash** (Live API) — real-time video + audio streaming
- **Google GenAI SDK** (`google-genai`) — Gemini API access
- **Google Cloud Run** — backend hosting (3 services)
- **OpenCV** — paper detection, contour analysis, frame annotation
- **MediaPipe** — hand landmark detection (21 points/hand), pinch detection
- **Stream Video SDK** — WebRTC transport
- **Vision Agents** (GetStream) — orchestration layer for Gemini Realtime + WebRTC
- **React 19 + TypeScript + Vite + Tailwind CSS v4** — frontend
- **Flask** — token server and REST API
- **Python** — agent backend

---

*GuideSight was built for the #GeminiLiveAgentChallenge. [View the source on GitHub.](https://github.com/Gentle-mann/guidesight)*
