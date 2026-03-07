"""
Claude Vision Analyzer — periodic frame analysis using Claude's vision API.

Captures the latest video frame, sends it to Claude for detailed spatial
analysis with full session context (observation history + conversation
transcripts), and returns structured observations that get injected into
the Gemini coaching session. Also detects step regression.
"""

import asyncio
import base64
import io
import json
import logging
import os
import time
from collections import deque

import anthropic
from PIL import Image

logger = logging.getLogger("claude_vision")

# Reuse a single async client for the lifetime of the process
_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


import numpy as np

# Model selection: Haiku for routine checks, Sonnet for urgent/complex
MODEL_ROUTINE = "claude-sonnet-4-20250514"   # Sonnet for all checks during hackathon
MODEL_URGENT = "claude-sonnet-4-20250514"    # Full power for user questions


def frame_to_base64(frame, max_dim: int = 512) -> str:
    """Convert an av.VideoFrame to a base64-encoded JPEG string.

    Uses 512px max (down from 768) to reduce token count per image.
    """
    if hasattr(frame, "to_image"):
        img = frame.to_image()
    else:
        arr = frame.to_ndarray(format="rgb24")
        img = Image.fromarray(arr)

    if img.width > max_dim or img.height > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)
    return base64.standard_b64encode(buf.getvalue()).decode("utf-8")


def frame_changed(frame_a, frame_b, threshold: float = 15.0) -> bool:
    """Check if two frames are meaningfully different using mean pixel diff.

    Returns True if the frames differ enough to warrant re-analysis.
    """
    if frame_a is None or frame_b is None:
        return True
    try:
        arr_a = frame_a.to_ndarray(format="rgb24") if hasattr(frame_a, "to_ndarray") else np.array(frame_a)
        arr_b = frame_b.to_ndarray(format="rgb24") if hasattr(frame_b, "to_ndarray") else np.array(frame_b)
        # Resize to small size for fast comparison
        from PIL import Image as PILImage
        img_a = PILImage.fromarray(arr_a).resize((64, 64))
        img_b = PILImage.fromarray(arr_b).resize((64, 64))
        diff = np.abs(np.array(img_a, dtype=float) - np.array(img_b, dtype=float)).mean()
        return diff > threshold
    except Exception:
        return True  # On error, assume changed


async def analyze_frame(
    frame,
    task: dict,
    coaching_state: dict,
    observation_history: list[dict],
    transcript_history: list[dict],
    urgent_context: str | None = None,
    use_urgent_model: bool = False,
) -> dict | None:
    """
    Send a video frame to Claude for detailed spatial analysis with full
    session context.

    Returns a dict with keys:
      - observation: str (the analysis text)
      - regression_detected: bool
      - regression_to_step: int | None
    Or None if analysis fails.
    """
    client = _get_client()
    step_num = coaching_state["current_step"]
    total = len(task.get("steps", []))

    # Get the current step details
    current_step = None
    for s in task["steps"]:
        if s["step"] == step_num:
            current_step = s
            break

    if current_step is None:
        return None

    step_instruction = current_step["instruction"]
    visual_cue = current_step["visual_cue"]
    common_errors = current_step.get("common_errors", [])
    during_cues = current_step.get("during_action_cues", [])

    # Build observation history context (last 10)
    obs_context = ""
    if observation_history:
        recent_obs = observation_history[-10:]
        obs_lines = []
        for obs in recent_obs:
            elapsed = int(time.time() - obs["timestamp"])
            obs_lines.append(f"[{elapsed}s ago, step {obs['step']}]: {obs['observation']}")
        obs_context = "Previous observations (most recent last):\n" + "\n".join(obs_lines)

    # Build conversation transcript context (last 20 messages)
    transcript_context = ""
    if transcript_history:
        recent_msgs = transcript_history[-20:]
        msg_lines = []
        for msg in recent_msgs:
            elapsed = int(time.time() - msg["timestamp"])
            role = "USER" if msg["role"] == "user" else "COACH"
            msg_lines.append(f"[{elapsed}s ago] {role}: {msg['text']}")
        transcript_context = "Recent conversation:\n" + "\n".join(msg_lines)

    # Build step history for regression detection
    all_steps_context = ""
    if len(task["steps"]) > 1:
        steps_lines = []
        for s in task["steps"]:
            status = "COMPLETED" if s["step"] in coaching_state.get("completed_steps", []) else (
                "CURRENT" if s["step"] == step_num else "UPCOMING"
            )
            steps_lines.append(f"Step {s['step']} [{status}]: {s['instruction']}")
            steps_lines.append(f"  Visual cue when done: {s['visual_cue']}")
        all_steps_context = "All steps and their status:\n" + "\n".join(steps_lines)

    # Urgent context gets priority framing
    urgent_section = ""
    if urgent_context:
        urgent_section = f"""
⚠️ URGENT — This analysis was triggered because: {urgent_context}
Prioritize answering this specific concern. Be direct and specific about what you see RIGHT NOW.
"""

    prompt = f"""You are an expert vision analyst AND a knowledgeable craftsperson for an AI coaching app. You have deep domain knowledge about "{task['name']}" — not just the listed steps, but the underlying craft, techniques, and principles.
{urgent_section}
Analyze this video frame from the user's camera.

Current step ({step_num} of {total}): {step_instruction}

What the completed step should look like: {visual_cue}

Common mistakes to watch for:
{chr(10).join(f"- {e}" for e in common_errors)}

{"Real-time monitoring cues:" + chr(10) + chr(10).join(f"- {c}" for c in during_cues) if during_cues else ""}

{all_steps_context}

{obs_context}

{transcript_context}

Respond in this JSON format:
{{
  "observation": "2-3 sentences on what you see",
  "regression_detected": false,
  "regression_to_step": null,
  "error_severity": "none",
  "insight": null
}}

Rules:
1. "observation": Describe what you ACTUALLY see — physical state, spatial relationships, hand positions.
2. "regression_detected": true ONLY if the visual state clearly matches a PREVIOUS step (user undid work).
3. "regression_to_step": Which step the current state matches, or null.
4. "error_severity": "none" | "minor" | "blocking".
5. "insight": This is your expert knowledge field. Use it when you notice something worth sharing that goes BEYOND the step instructions. Set to null if nothing notable. Examples:
   - User asks "why?" about a step → explain the underlying reason (e.g., "Creasing hard here makes the fold hold its shape during flight")
   - User does something clever not in the steps → acknowledge it (e.g., "Good instinct pre-creasing — that will make the next fold cleaner")
   - You spot a technique tip → share it (e.g., "Running your fingernail along the fold gives a sharper crease than using your palm")
   - User is about to hit a non-obvious problem → warn proactively (e.g., "The box flaps look slightly damp — press firmly or the tape won't stick")
   - User seems confused about the overall goal → provide context (e.g., "We're building the nose of the plane right now — these folds create the point")

You are not just a checklist verifier. You UNDERSTAND this task deeply. The steps are a guide, but your knowledge extends beyond them. If the user asks a question, answer it with genuine expertise. If you see an opportunity to share useful knowledge that will help them succeed, include it as an insight.

Use the observation history and conversation for context — don't repeat yourself. Be factual and precise. If the image is unclear, say so."""

    try:
        b64_image = frame_to_base64(frame)

        model = MODEL_URGENT if use_urgent_model else MODEL_ROUTINE
        logger.info(f"[Claude Vision] Using model: {model}")

        response = await asyncio.wait_for(
            client.messages.create(
                model=model,
                max_tokens=200,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": b64_image,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }],
            ),
            timeout=15.0,
        )

        raw_text = response.content[0].text
        logger.info(f"[Claude Vision] Step {step_num}: {raw_text}")

        # Parse JSON response
        try:
            # Handle markdown code blocks
            text = raw_text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
            result = json.loads(text)
            return result
        except json.JSONDecodeError:
            # Fallback: treat entire response as observation
            return {
                "observation": raw_text,
                "regression_detected": False,
                "regression_to_step": None,
                "error_severity": "none",
            }

    except Exception as e:
        logger.error(f"[Claude Vision] Analysis failed: {e}")
        return None


class ClaudeVisionLoop:
    """
    Runs a periodic loop that captures the latest frame from the
    paper detector processor and sends it to Claude for analysis.
    Observations are injected into the Gemini session.

    Maintains full session context:
    - Observation history (all previous Claude analyses)
    - Conversation transcripts (user + agent speech)
    - Coaching state awareness (current step, completed steps)
    """

    def __init__(self, task: dict, coaching_state: dict, interval: float = 5.0):
        self._task = task
        self._coaching_state = coaching_state
        self._interval = interval
        self._latest_frame = None
        self._running = False
        self._task_handle: asyncio.Task | None = None
        self._agent = None

        # Session context
        self._observation_history: list[dict] = []
        self._transcript_history: deque[dict] = deque(maxlen=50)
        self._last_feedback_time: float = 0
        self._min_silence_sec: float = 3.0  # Minimum seconds between proactive utterances

        # Urgent analysis trigger — wakes the loop early
        self._urgent_event: asyncio.Event | None = None
        self._urgent_context: str | None = None  # Extra context for urgent analysis
        self._last_analysis_time: float = 0  # Debounce: don't re-analyze too quickly

        # Frame change detection — skip analysis if nothing changed
        self._last_analyzed_frame = None

    def set_agent(self, agent):
        self._agent = agent

    def update_frame(self, frame):
        """Called by the paper detector to provide the latest raw frame."""
        self._latest_frame = frame

    def add_transcript(self, role: str, text: str):
        """Add a conversation transcript entry. Called from event handlers.

        Auto-triggers urgent Claude analysis when the user asks a question
        or says something that needs visual verification.
        """
        if not text or not text.strip():
            return
        clean = text.strip()
        self._transcript_history.append({
            "role": role,
            "text": clean,
            "timestamp": time.time(),
        })

        # Auto-trigger urgent analysis on user speech that likely needs vision
        if role == "user" and self._is_urgent_speech(clean):
            self.trigger_urgent(f"User just said: \"{clean}\" — analyze the frame to help answer.")

    def _is_urgent_speech(self, text: str) -> bool:
        """Detect if user speech warrants an immediate Claude analysis."""
        t = text.lower()
        # Questions
        if "?" in text:
            return True
        # Common question patterns (transcription often drops "?")
        question_starts = (
            "is this", "is that", "does this", "am i", "do i",
            "how do", "how does", "what do", "what should", "what's",
            "which", "where", "can i", "should i", "did i",
            "like this", "is it", "are these", "was that",
        )
        if any(t.startswith(q) for q in question_starts):
            return True
        # Confirmation-seeking phrases
        confirm_phrases = (
            "like this", "this right", "this correct", "this okay",
            "this good", "look right", "look good", "look okay",
            "done", "finished", "next step", "what now", "now what",
            "help", "stuck", "confused", "wrong", "mistake",
        )
        if any(p in t for p in confirm_phrases):
            return True
        return False

    def trigger_urgent(self, context: str | None = None):
        """Trigger an immediate Claude analysis, bypassing the interval timer.

        Called when something urgent happens (user question, error detected, etc.).
        Debounced: won't trigger if last analysis was < 2s ago.
        """
        if time.time() - self._last_analysis_time < 2.0:
            return  # Too soon, skip
        self._urgent_context = context
        if self._urgent_event:
            self._urgent_event.set()

    async def start(self):
        self._running = True
        self._urgent_event = asyncio.Event()
        self._task_handle = asyncio.create_task(self._loop())
        logger.info("[Claude Vision] Analysis loop started (interval=%ss)", self._interval)

    async def stop(self):
        self._running = False
        if self._task_handle:
            self._task_handle.cancel()
            try:
                await self._task_handle
            except asyncio.CancelledError:
                pass
        logger.info("[Claude Vision] Analysis loop stopped")

    async def _handle_regression(self, result: dict):
        """Handle detected step regression."""
        regression_step = result.get("regression_to_step")
        current_step = self._coaching_state["current_step"]

        if regression_step is None or regression_step >= current_step:
            return

        logger.info(
            f"[Claude Vision] Regression detected: "
            f"current={current_step} → regressed to step {regression_step}"
        )

        # Update coaching state
        self._coaching_state["current_step"] = regression_step
        # Remove completed steps that are now undone
        self._coaching_state["completed_steps"] = [
            s for s in self._coaching_state["completed_steps"]
            if s < regression_step
        ]
        self._coaching_state["task_complete"] = False

        # Send regression event to frontend
        if self._agent:
            try:
                await self._agent.send_custom_event({
                    "type": "step_regression",
                    "from_step": current_step,
                    "to_step": regression_step,
                })
            except Exception:
                pass

    async def _loop(self):
        while self._running:
            # Wait for either the interval OR an urgent trigger
            try:
                await asyncio.wait_for(self._urgent_event.wait(), timeout=self._interval)
                # Urgent event fired — grab context and reset
                urgent_context = self._urgent_context
                self._urgent_context = None
                self._urgent_event.clear()
                is_urgent = True
                logger.info("[Claude Vision] Urgent analysis triggered: %s", urgent_context)
            except asyncio.TimeoutError:
                # Normal interval elapsed
                urgent_context = None
                is_urgent = False

            if not self._running:
                break

            frame = self._latest_frame
            if frame is None:
                continue

            if self._agent is None:
                continue

            # Check if the LLM is still connected
            if not getattr(self._agent.llm, 'connected', False):
                continue

            # Skip if frame hasn't changed (unless urgent)
            if not is_urgent and not frame_changed(frame, self._last_analyzed_frame):
                logger.debug("[Claude Vision] Frame unchanged, skipping analysis")
                continue

            self._last_analyzed_frame = frame
            self._last_analysis_time = time.time()

            result = await analyze_frame(
                frame,
                self._task,
                self._coaching_state,
                self._observation_history,
                list(self._transcript_history),
                urgent_context=urgent_context,
                use_urgent_model=is_urgent,
            )

            if result is None or not self._running:
                continue

            observation = result.get("observation", "")
            if not observation:
                continue

            # Store observation in history
            self._observation_history.append({
                "step": self._coaching_state["current_step"],
                "observation": observation,
                "timestamp": time.time(),
                "error_severity": result.get("error_severity", "none"),
                "regression_detected": result.get("regression_detected", False),
            })

            # Handle regression if detected
            if result.get("regression_detected"):
                await self._handle_regression(result)

            # Determine whether to inject this observation into Gemini
            error_severity = result.get("error_severity", "none")
            now = time.time()
            elapsed_since_feedback = now - self._last_feedback_time

            # Always inject: urgent, blocking errors, regressions, expert insights
            # For minor/none on timer, respect the silence timer
            has_insight = bool(result.get("insight"))
            should_inject = (
                is_urgent
                or error_severity == "blocking"
                or result.get("regression_detected")
                or has_insight
                or elapsed_since_feedback >= self._min_silence_sec
            )

            if should_inject:
                try:
                    insight = result.get("insight")
                    insight_section = ""
                    if insight:
                        insight_section = (
                            f"\n\n[EXPERT INSIGHT]: {insight}\n"
                            f"Share this naturally if relevant — weave it into conversation "
                            f"as if you know this from experience. Don't say 'my analysis says' — "
                            f"just share the knowledge as your own."
                        )

                    # Build injection message based on context
                    if is_urgent:
                        injection = (
                            f"[URGENT VISION ANALYSIS — user needs immediate help]: {observation}"
                            f"{insight_section}\n\n"
                            f"The user just asked something or needs visual confirmation. "
                            f"Answer their question directly based on what you see. "
                            f"If there's an expert insight, use it to give a genuinely helpful answer."
                        )
                    elif result.get("regression_detected"):
                        regression_step = result.get("regression_to_step", "?")
                        injection = (
                            f"[VISION ANALYSIS — REGRESSION DETECTED]: {observation}"
                            f"{insight_section}\n\n"
                            f"The user appears to have gone back to step {regression_step}. "
                            f"Acknowledge this naturally — say something like 'I see you've gone back, "
                            f"let's redo that step.' Do NOT scold them. This is normal."
                        )
                    elif error_severity == "blocking":
                        injection = (
                            f"[VISION ANALYSIS — ERROR DETECTED]: {observation}"
                            f"{insight_section}\n\n"
                            f"This is a blocking error — the user needs to fix this before proceeding. "
                            f"Interrupt them briefly and specifically. Say what's wrong and how to fix it."
                        )
                    elif insight:
                        # Has expert insight — always worth sharing
                        injection = (
                            f"[VISION ANALYSIS]: {observation}"
                            f"{insight_section}\n\n"
                            f"Share the insight naturally. Speak as a knowledgeable coach, "
                            f"not a robot reading analysis results."
                        )
                    elif error_severity == "minor":
                        injection = (
                            f"[VISION ANALYSIS]: {observation}\n\n"
                            f"Minor issue detected. Only mention it if it will affect the final result. "
                            f"Otherwise, let the user continue."
                        )
                    else:
                        injection = (
                            f"[VISION ANALYSIS]: {observation}\n\n"
                            f"Use this observation to guide the user. If everything looks correct, "
                            f"a brief confirmation is enough. Do NOT repeat the analysis word-for-word — "
                            f"speak naturally as if YOU noticed it."
                        )

                    await self._agent.llm.simple_response(text=injection)
                    self._last_feedback_time = now
                except Exception as e:
                    logger.error(f"[Claude Vision] Failed to inject observation: {e}")
