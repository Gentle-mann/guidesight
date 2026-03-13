# GuideSight — Architecture

## System Architecture (Mermaid)

```mermaid
flowchart LR
    subgraph Browser["Browser (React + Stream SDK)"]
        Camera["Camera/Mic"]
        UI["Task Picker\nStep Tracker\nAdmin Dashboard"]
    end

    subgraph GCP["Google Cloud Run"]
        subgraph TokenServer["Token Server (Flask)"]
            API["REST API\n/tokens /tasks /call-id\n/generate-task /edit-task-chat"]
        end

        subgraph AgentService["Coaching Agent"]
            subgraph Pipeline["CV Glasses Pipeline"]
                Raw["Raw Frame\n(1fps from camera)"]
                CV["OpenCV\nPaper Detection\nContour + Orientation"]
                MP["MediaPipe\nHand Tracking\n21 landmarks/hand"]
                Annotated["Annotated Frame\n(bounding box, labels,\nskeleton overlays)"]
            end
            AgentLogic["Agent Logic\n(vision_agents)\nFunction Calling:\n• mark_step_complete\n• flag_error\n• regress_to_step\n• describe_current_frame"]
            ClaudeVision["Claude Vision Loop\n(periodic frame analysis\nregression detection\nexpert insights)"]
        end
    end

    subgraph Google["Google AI"]
        Gemini["Gemini 2.5 Flash\nLive API\n(real-time video+audio\nbidirectional streaming)"]
        GenAI["Google GenAI SDK\n(task generation\ntask editing)"]
    end

    subgraph Anthropic["Anthropic"]
        Claude["Claude Sonnet\n(spatial analysis\nstep verification)"]
    end

    subgraph Stream["Stream Video"]
        WebRTC["WebRTC Edge\n(TURN/STUN\nlow-latency transport)"]
    end

    Camera <-->|"WebRTC\n(VP8 video + audio)"| WebRTC
    WebRTC <-->|"WebRTC"| AgentService
    UI <-->|"REST"| TokenServer

    Raw --> CV --> MP --> Annotated
    Annotated -->|"annotated frames\n(Gemini watches these)"| Gemini
    Gemini -->|"TTS audio\nfunction calls"| AgentLogic
    AgentLogic -->|"audio stream"| WebRTC

    AgentLogic -->|"custom events\n(step sync)"| UI
    AgentLogic <-->|"coaching state"| TokenServer

    Raw -->|"raw frames"| ClaudeVision
    ClaudeVision -->|"observations\ninjected into session"| AgentLogic
    ClaudeVision <-->|"vision API"| Claude

    TokenServer <-->|"GenAI SDK"| GenAI

    style GCP fill:#1a73e8,color:#fff,stroke:#1a73e8
    style Google fill:#34a853,color:#fff,stroke:#34a853
    style Anthropic fill:#d4a574,color:#fff,stroke:#d4a574
    style Stream fill:#005fff,color:#fff,stroke:#005fff
    style Pipeline fill:#2d2d3d,color:#fff,stroke:#6c63ff
```

## Core Innovation: CV "Glasses" Pipeline

```mermaid
flowchart LR
    A["Raw Camera\nFrame"] -->|"1fps JPEG"| B["OpenCV\nPaper Detector"]
    B -->|"bounding box\norientation label\ncenter line"| C["MediaPipe\nHand Tracker"]
    C -->|"hand skeleton\npinch detection\nL/R labels"| D["Annotated\nFrame"]
    D -->|"Gemini sees\nannotations"| E["Gemini 2.5 Flash\nReasons about\nwhat it sees"]
    E -->|"natural voice\ncoaching"| F["User hears\nguidance"]

    style A fill:#333,color:#fff
    style B fill:#4ade80,color:#000
    style C fill:#6c63ff,color:#fff
    style D fill:#fbbf24,color:#000
    style E fill:#34a853,color:#fff
    style F fill:#f0f0f5,color:#000
```

> **"Gemini can reason but can't measure. Our CV layer measures, Gemini reasons."**

## Excalidraw / Draw.io Layout Guide

Use this as a reference to create the polished visual diagram for the demo video and Devpost submission.

### Layout (Left to Right, 4 columns)

```
COLUMN 1: USER          COLUMN 2: TRANSPORT       COLUMN 3: CLOUD RUN           COLUMN 4: AI SERVICES
─────────────────       ──────────────────        ───────────────────────        ─────────────────────

┌─────────────┐         ┌──────────────┐          ┌───────────────────────┐      ┌─────────────────┐
│  📱 Browser │ ◄─────► │  Stream      │ ◄──────► │  🤖 Coaching Agent    │ ◄──► │  Gemini 2.5     │
│             │  WebRTC │  Video Edge  │  WebRTC  │                       │ Live │  Flash          │
│  Camera     │  (VP8)  │  (TURN/STUN) │          │  ┌─────────────────┐  │ API  │  (video+audio   │
│  Mic        │         └──────────────┘          │  │ CV "Glasses"    │  │      │   streaming)    │
│  Speaker    │                                   │  │                 │  │      └─────────────────┘
│             │         ┌──────────────┐          │  │ 📄 OpenCV       │  │
│  React App  │ ◄─────► │  Token       │          │  │  Paper detect   │  │      ┌─────────────────┐
│  TaskPicker │  REST   │  Server      │          │  │  Orientation    │  │      │  Claude Sonnet  │
│  StepTrack  │         │  (Flask)     │          │  │                 │  │ ◄──► │  (spatial        │
│  Admin      │         │              │          │  │ 🖐 MediaPipe    │  │      │   analysis,     │
│             │         │  Task CRUD   │          │  │  Hand skeleton  │  │      │   verification) │
└─────────────┘         │  Tokens      │          │  │  Pinch detect   │  │      └─────────────────┘
                        │  AI Generate │          │  └─────────────────┘  │
                        └──────────────┘          │                       │      ┌─────────────────┐
                                                  │  Agent Logic          │      │  Google GenAI   │
                              ☁️ Google Cloud Run  │  • Function calling   │      │  SDK            │
                                                  │  • Step management    │ ◄──► │  (task gen,     │
                                                  │  • Session resumption │      │   task edit)    │
                                                  └───────────────────────┘      └─────────────────┘
```

### Key Visual Elements for the Polished Version

1. **Highlight the CV pipeline** with a colored box or dashed border — this is the differentiator
2. **Show the frame transformation**: Raw frame (blurry photo) → Annotated frame (with green box, "PORTRAIT" label, hand skeleton) → Gemini icon
3. **Use Google Cloud logo** on the Cloud Run box
4. **Use tech logos**: React, Gemini, Stream, OpenCV, MediaPipe
5. **Color coding**:
   - Blue (#1a73e8): Google Cloud services
   - Green (#34a853): Gemini / Google AI
   - Purple (#6c63ff): GuideSight's CV layer (the unique part)
   - Orange: Stream Video transport
6. **Arrow labels** should be concise: "WebRTC (VP8)", "Live API", "REST", "Vision API"
7. **Call out the data flow** with numbered steps if space allows:
   - ① Camera captures frame
   - ② Stream delivers via WebRTC
   - ③ CV "Glasses" annotate the frame
   - ④ Gemini sees annotated frame + reasons
   - ⑤ Gemini speaks coaching back to user
