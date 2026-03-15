# GuideSight Demo Video Script (< 4 minutes)

## Setup Before Recording
- App running locally (token server + agent + frontend)
- Browser open to http://localhost:5173
- Have a flat cardboard box + roll of packing tape ready
- Screen recording: full screen capture (browser + audio)
- Good lighting on your hands/workspace
- Debug panel visible on left side of coaching screen

---

## INTRO (0:00 - 0:45)

**[Screen: Task picker page with all tasks visible]**

> "What if the person most likely to get injured at work today... just started this week?"

*[Beat]*

> "In third party logistics warehouses, 40% of injuries happen in a worker's first 90 days. That's because they're new, and not properly trained and nobody's watching what they're doing, so they make mistakes and get injured. Then they quit. Each replacement costs ten thousand dollars."

> "The existing solutions to these are training manuals, instructional videos, platforms like Squint. But all of these are what i call static. They show you what to do, but none of them can see whether you're actually doing it right."

*[Click on Shipping Box Assembly task]*

> "The way to solve this completely is to have a human coach watch as workers do their job. But this is not feasible. So I built an AI system that does exactly what a human coach would do: it watches through the worker's camera in real-time — sees their hands, checks their technique, and catches mistakes before they become injuries"

---

## ARCHITECTURE (0:25 - 0:40)

**[Screen: Show architecture-diagram.svg briefly, or narrate over the task detail page]**

> "Under the hood, Gemini 2.5 Flash watches the video and coaches via voice. But here's the key insight — Gemini hallucinates. It confirms what it expects to see, not what's actually there. So we added Claude as a visual gatekeeper. Gemini coaches, Claude verifies every step."

**[Click "Start" button → transition to coaching session with debug panel]**

---

## LIVE DEMO (0:40 - 2:45)

### Step 1: Open the box (0:40 - 1:10)

**[Hold flat box, wait for AI to greet you]**

*AI will say something like: "Hi! I can see you have a flat box. Let's get started — pop it open into a rectangular shape."*

**[Open the box into a 3D tube shape, hold it up]**

> *(to the AI)* "How does this look?"

*Wait for Gemini to try mark_step_complete → point to debug panel:*

> "Watch the left panel — Gemini describes what it sees, then asks Claude to verify."

**[Debug panel shows: GEMINI describe_frame → CLAUDE prompt → CLAUDE verify ✓ → Step 1 complete]**

> "Claude confirmed the box is open. Step 1 done."

### Step 2: Fold the flaps — THE MONEY SHOT (1:10 - 2:00)

> "Now here's where it gets interesting. Step 2 says fold the SHORT flaps first. Let me intentionally do it wrong."

**[Deliberately fold the LONG flaps inward first. Show the box to camera.]**

> *(to the AI)* "Done, check this."

**[Debug panel shows: GEMINI mark_step_complete → CLAUDE verify ✗ "long flaps were folded first"]**

> "Claude caught it. It can see I folded the wrong flaps. The long flaps went in first, but the short ones need to go first for structural strength."

**[Unfold the long flaps. Now fold the SHORT flaps inward correctly. Show the box.]**

> *(to the AI)* "Okay, I fixed it. Short flaps are in now."

**[Debug panel shows: CLAUDE verify ✓ "two smaller flaps folded inward, larger flaps still upright"]**

> "Now Claude verified it. The right flaps are folded. Step 2 complete."

### Steps 3-4: Fold long flaps + tape (2:00 - 2:45)

**[Fold the long flaps down over the short ones]**

> *(to the AI)* "Long flaps are down."

**[Let the step advance, then apply tape along the center seam]**

> "The AI coaches me through each step, catches mistakes in real-time, and only advances when it visually confirms the work is done."

**[Show tape being applied if time allows, or skip to wrap-up]**

---

## TECHNICAL DEEP DIVE (2:45 - 3:20)

**[Point to debug panel while it's still showing events]**

> "Everything you see on the left is the AI pipeline running in real-time. Gemini processes the video at one frame per second and coaches via voice. Every time it tries to advance a step, the current frame goes to Claude for independent verification."

> "This solves the core problem with multimodal AI — Gemini is great at reasoning and conversation, but it hallucinates spatial details. Claude acts as a second pair of eyes. Gemini coaches, Claude verifies."

> "The whole system runs on Google Cloud Run — three services: the coaching agent, a token server, and the React frontend. Deployed with one script."

---

## PLATFORM & ANALYTICS (3:20 - 3:50)

**[Screen: Navigate to #admin dashboard — show task list with edit buttons]**

> "For warehouse managers, GuideSight is a platform. They define a task — the steps, what to look for, the common mistakes — and GuideSight turns that into a real-time coaching session for every worker."

**[Click into a task, briefly show the step editor with visual cues and common errors fields]**

> "No AI expertise needed. A manager who knows the job writes the steps, and the AI handles the rest — the coaching, the vision, the verification. New task, same architecture."

**[Navigate to analytics page]**

> "And because every session is tracked — which steps workers struggle with, where mistakes happen, how long tasks take — managers get analytics they've never had before. They can see that step 2 of box sealing has a 30% error rate and update the training accordingly. The AI doesn't just coach workers — it tells managers where the training gaps are."

---

## CLOSE (3:45 - 4:00)

> "40% of injuries in 90 days. 60% of turnover in 90 days. GuideSight closes that gap — an AI coach from day one that watches, corrects, and verifies every step."

> "Built with Gemini 2.5 Flash, Claude, and Google Cloud Run. GuideSight — expert guidance, on demand."

**[Show GitHub URL: github.com/Gentle-mann/guidesight]**

---

## Recording Tips

1. **Do 2-3 practice runs** before recording — especially the wrong-flap moment
2. **Pre-warm the agent** — do one quick session before recording so Gemini's connection is stable
3. **Keep the debug panel visible** the whole time — it's the visual proof of the architecture
4. **Speak naturally to the AI** — the judges want to see real interaction, not scripted dialogue with the AI
5. **If Gemini's session dies** (2-min limit), it auto-reconnects — just keep going
6. **Record at 1080p** — judges will be watching on big screens
7. **The wrong-flap moment is the highlight** — make sure it's clear and dramatic
8. **Total target: 3:30-3:50** — leave a buffer under 4:00
