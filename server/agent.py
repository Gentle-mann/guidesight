import asyncio
import io
import json
import logging
import os
import uuid
from pathlib import Path

import httpx
from dotenv import load_dotenv
from google.genai.types import (
    ContextWindowCompressionConfigDict,
    LiveConnectConfigDict,
    PrebuiltVoiceConfigDict,
    RealtimeInputConfigDict,
    SlidingWindowDict,
    SpeechConfigDict,
    TurnCoverage,
    VoiceConfigDict,
)
from PIL import Image
from vision_agents.core import Agent, User
from vision_agents.core.llm.events import (
    RealtimeAgentSpeechTranscriptionEvent,
    RealtimeUserSpeechTranscriptionEvent,
)
from vision_agents.plugins import getstream, gemini

from paper_detector import PaperDetectorProcessor
from claude_vision import ClaudeVisionLoop

# Monkey-patch JPEG quality: must patch the name directly in gemini_realtime
# because it uses `from video_utils import frame_to_png_bytes` (direct binding).
import vision_agents.plugins.gemini.gemini_realtime as _gemini_rt


def _hq_frame_to_bytes(frame) -> bytes:
    """Higher quality JPEG encoding for better fold-line visibility."""
    if hasattr(frame, "to_image"):
        img = frame.to_image()
    else:
        arr = frame.to_ndarray(format="rgb24")
        img = Image.fromarray(arr)
    max_dim = 768
    if img.width > max_dim or img.height > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


_gemini_rt.frame_to_png_bytes = _hq_frame_to_bytes
print("[GuideSight] Patched frame encoder in gemini_realtime: JPEG quality 75 → 90")

load_dotenv(Path(__file__).parent.parent / ".env")


# Enable debug logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s: %(message)s",
)
# Show critical vision_agents events
logging.getLogger("vision_agents").setLevel(logging.DEBUG)
logging.getLogger("vision_agents.plugins.gemini").setLevel(logging.DEBUG)
logging.getLogger("vision_agents.plugins.getstream").setLevel(logging.DEBUG)

# Load task data
TASKS_DIR = Path(__file__).parent / "tasks"
PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_task(task_id: str) -> dict:
    task_path = TASKS_DIR / f"{task_id}.json"
    with open(task_path) as f:
        return json.load(f)


def build_system_prompt(task: dict) -> str:
    template = (PROMPTS_DIR / "task_coach.md").read_text()

    steps_text = ""
    for step in task["steps"]:
        steps_text += f"\n### Step {step['step']}: {step['instruction']}\n"
        steps_text += f"- **What to look for when done**: {step['visual_cue']}\n"
        if step.get("during_action_cues"):
            steps_text += f"- **What to watch for DURING this step** (observe these in real-time):\n"
            for cue in step["during_action_cues"]:
                steps_text += f"  - {cue}\n"
        steps_text += f"- **Mistakes to catch IMMEDIATELY**: {', '.join(step['common_errors'])}\n"

    return template.format(
        task_name=task["name"],
        steps=steps_text,
        current_step=1,
        total_steps=len(task["steps"]),
    )


# Global reference to current task and agent
current_task = {}
agent_ref = {"agent": None}

# --- Coaching state ---
coaching_state = {
    "current_step": 1,
    "completed_steps": [],
    "errors": [],
    "task_complete": False,
}

# Generate a unique call ID per agent run to avoid stale WebRTC state
CALL_ID = f"gs-{uuid.uuid4().hex[:8]}"
TOKEN_SERVER = os.environ.get("TOKEN_SERVER", "http://localhost:8080")


async def wait_for_task_selection() -> dict:
    """Poll token server until user selects a task."""
    async with httpx.AsyncClient() as http:
        while True:
            res = await http.get(f"{TOKEN_SERVER}/task-id")
            task_id = res.json().get("taskId")
            if task_id:
                return load_task(task_id)
            print("[GuideSight] Waiting for user to select a task...")
            await asyncio.sleep(2)


async def _sync_coaching_state():
    """Push coaching state to token server for frontend backup polling."""
    try:
        async with httpx.AsyncClient() as http:
            await http.post(f"{TOKEN_SERVER}/coaching-state", json={
                "current_step": coaching_state["current_step"],
                "completed_steps": coaching_state["completed_steps"],
                "task_complete": coaching_state.get("task_complete", False),
            })
    except Exception:
        pass


def create_llm():
    """Create a fresh Gemini Realtime LLM instance with all functions registered."""
    llm = gemini.Realtime(
        fps=1,
        config=LiveConnectConfigDict(
            realtime_input_config=RealtimeInputConfigDict(
                turn_coverage=TurnCoverage.TURN_INCLUDES_ALL_INPUT,
            ),
            context_window_compression=ContextWindowCompressionConfigDict(
                trigger_tokens=20480,
                sliding_window=SlidingWindowDict(target_tokens=12800),
            ),
            # Tier 3.2: Affective dialog — adapt tone to user emotion
            enable_affective_dialog=True,
            # Tier 3.4: Voice selection — Puck is upbeat/encouraging
            speech_config=SpeechConfigDict(
                voice_config=VoiceConfigDict(
                    prebuilt_voice_config=PrebuiltVoiceConfigDict(
                        voice_name="Puck"
                    )
                ),
                # Tier 3.8: Language — auto-switches if user speaks English
                language_code="en-US",
            ),
        ),
    )

    @llm.register_function(
        name="describe_current_frame",
        description=(
            "REQUIRED: You MUST call this function BEFORE calling mark_step_complete. "
            "Describe exactly what you see in the current video frame — the paper's shape, "
            "fold lines, orientation, the user's hand positions, and how it matches (or doesn't) "
            "the expected visual cue for the current step. This forces you to actually analyze "
            "the frame before advancing."
        ),
    )
    async def describe_current_frame(
        step_number: int,
        what_i_see: str,
        matches_expected: bool,
        concerns: str = "",
    ) -> dict:
        print(f"[VISION CHECK] Step {step_number}: {what_i_see}")
        if concerns:
            print(f"[VISION CONCERN] {concerns}")
        return {
            "analyzed": True,
            "step": step_number,
            "you_described": what_i_see,
            "matches": matches_expected,
            "instruction": (
                "If matches_expected is True, you may now call mark_step_complete. "
                "If False, tell the user what needs to be fixed before you can advance."
            ),
        }

    @llm.register_function(
        name="mark_step_complete",
        description=(
            "Mark a task step as completed. You MUST call describe_current_frame first "
            "to prove you analyzed the video frame. Only call this after visually confirming "
            "the step result matches the expected visual cue."
        ),
    )
    async def mark_step_complete(step_number: int, notes: str = "") -> dict:
        coaching_state["completed_steps"].append(step_number)
        coaching_state["current_step"] = step_number + 1
        print(f"[STEP COMPLETE] Step {step_number}: {notes}")

        if coaching_state["current_step"] > len(current_task.get("steps", [])):
            coaching_state["task_complete"] = True

        # Send step sync event to frontend
        if agent_ref["agent"]:
            try:
                await agent_ref["agent"].send_custom_event({
                    "type": "step_complete",
                    "step": step_number,
                    "current_step": coaching_state["current_step"],
                    "task_complete": coaching_state.get("task_complete", False),
                })
            except Exception:
                pass

        await _sync_coaching_state()

        if coaching_state["task_complete"]:
            return {"success": True, "message": "All steps complete! Task finished!"}

        return {
            "success": True,
            "next_step": coaching_state["current_step"],
            "message": f"Step {step_number} complete. Moving to step {coaching_state['current_step']}.",
        }

    @llm.register_function(
        name="regress_to_step",
        description=(
            "Move the user BACK to a previous step. Call this when the user has "
            "undone their work (e.g., unfolded flaps, disassembled a component) "
            "and needs to redo a step. Also call this if YOU detect that the "
            "current visual state matches a previous step."
        ),
    )
    async def regress_to_step(target_step: int, reason: str = "") -> dict:
        old_step = coaching_state["current_step"]
        if target_step >= old_step:
            return {"success": False, "message": f"Can only regress to earlier steps. Current: {old_step}"}

        coaching_state["current_step"] = target_step
        coaching_state["completed_steps"] = [
            s for s in coaching_state["completed_steps"] if s < target_step
        ]
        coaching_state["task_complete"] = False
        print(f"[STEP REGRESSION] {old_step} → {target_step}: {reason}")

        if agent_ref["agent"]:
            try:
                await agent_ref["agent"].send_custom_event({
                    "type": "step_regression",
                    "from_step": old_step,
                    "to_step": target_step,
                })
            except Exception:
                pass

        await _sync_coaching_state()

        return {
            "success": True,
            "message": f"Moved back from step {old_step} to step {target_step}.",
            "current_step": target_step,
        }

    @llm.register_function(
        name="flag_error",
        description="Flag an error the user made. Call this when you see the user doing something incorrectly.",
    )
    async def flag_error(step_number: int, error_type: str, description: str) -> dict:
        error = {
            "step": step_number,
            "type": error_type,
            "description": description,
        }
        coaching_state["errors"].append(error)
        print(f"[ERROR FLAGGED] Step {step_number} ({error_type}): {description}")

        # Send error event to frontend
        if agent_ref["agent"]:
            try:
                await agent_ref["agent"].send_custom_event({
                    "type": "error_flagged",
                    "step": step_number,
                    "error_type": error_type,
                    "description": description,
                })
            except Exception:
                pass

        return {"acknowledged": True, "message": f"Error noted at step {step_number}."}

    return llm


async def main():
    global current_task

    # Wait for the user to select a task from the frontend
    print("[GuideSight] Waiting for task selection from frontend...")
    current_task = await wait_for_task_selection()
    system_prompt = build_system_prompt(current_task)

    agent_user = User(name="GuideSight Coach", id="guidesight-coach")

    # One-time setup: create Edge, Call, and register call ID with token server
    edge = getstream.Edge()
    await edge.create_user(agent_user)
    call = await edge.create_call(CALL_ID)
    async with httpx.AsyncClient() as http:
        await http.post(f"{TOKEN_SERVER}/call-id", json={"callId": CALL_ID})

    print(f"[GuideSight] Call created: {CALL_ID}")
    print(f"[GuideSight] Task: {current_task['name']}")
    print(f"[GuideSight] Steps: {len(current_task['steps'])}")
    print(f"[GuideSight] Waiting for user to join...")

    from vision_agents.core.warmup import Warmable, WarmupCache

    session_number = 0
    MAX_SESSIONS = 30

    # Persistent Claude vision loop — survives across Gemini session reconnects
    claude_vision = ClaudeVisionLoop(
        task=current_task,
        coaching_state=coaching_state,
        interval=5.0,
    )

    while not coaching_state["task_complete"] and session_number < MAX_SESSIONS:
        session_number += 1
        print(f"\n[GuideSight] === Session {session_number} starting ===")

        try:
            # Fresh LLM + processor each session (Agent.close() destroys them)
            llm = create_llm()
            paper_detector = PaperDetectorProcessor(fps=2.0)

            # Wire paper detector to feed raw frames to Claude
            paper_detector._claude_frame_callback = claude_vision.update_frame

            # Fresh edge + call each session for clean WebRTC state
            if session_number > 1:
                edge = getstream.Edge()
                await edge.create_user(agent_user)
                call = await edge.create_call(CALL_ID)

            agent = Agent(
                edge=edge,
                llm=llm,
                agent_user=agent_user,
                instructions=system_prompt,
                processors=[paper_detector],
            )
            agent_ref["agent"] = agent

            # Subscribe to transcript events → feed to Claude vision loop + frontend captions
            @agent.events.subscribe
            async def on_user_transcript(event: RealtimeUserSpeechTranscriptionEvent):
                if event.text:
                    claude_vision.add_transcript("user", event.text)

            @agent.events.subscribe
            async def on_agent_transcript(event: RealtimeAgentSpeechTranscriptionEvent):
                if event.text:
                    claude_vision.add_transcript("agent", event.text)
                    # Forward to frontend for live captions
                    try:
                        await agent.send_custom_event({
                            "type": "agent_caption",
                            "text": event.text,
                        })
                    except Exception:
                        pass

            warmup_cache = WarmupCache()
            if isinstance(agent._multi_speaker_filter, Warmable):
                await agent._multi_speaker_filter.warmup(warmup_cache)

            async with agent.join(call, participant_wait_timeout=None):
                print(f"[GuideSight] Session {session_number} active — Gemini connected.")

                await asyncio.sleep(5)

                # Start Claude vision analysis loop
                claude_vision.set_agent(agent)
                await claude_vision.start()

                if session_number == 1:
                    await agent.llm.simple_response(
                        text=(
                            f"Greet the user in one sentence. Tell them you're ready to coach "
                            f"them through {current_task['name']}. Then ask them to show you "
                            f"their workspace. Keep it under 15 seconds. Do NOT describe the room."
                        )
                    )
                else:
                    step = coaching_state["current_step"]
                    completed = coaching_state["completed_steps"]
                    await agent.llm.simple_response(
                        text=(
                            f"You are resuming a coaching session (seamless reconnect). "
                            f"The user is on step {step} of {len(current_task['steps'])}. "
                            f"Steps already completed: {completed or 'none yet'}. "
                            f"Say something brief like 'OK, I'm back — let's continue with "
                            f"step {step}.' Then look at the video and react to what you see. "
                            f"Do NOT re-introduce yourself or repeat earlier instructions."
                        )
                    )

                # Let the session run until it ends naturally (participant
                # leaves, Gemini dies, etc). The reconnection loop handles
                # restarting. For the hackathon demo (~90s), this is fine.
                try:
                    await agent.finish()
                finally:
                    await claude_vision.stop()

        except Exception as e:
            print(f"[GuideSight] Session {session_number} ended: {e}")

        print(f"[GuideSight] Reconnecting...")
        await asyncio.sleep(1)

    print(f"[GuideSight] Done after {session_number} sessions.")


if __name__ == "__main__":
    asyncio.run(main())
