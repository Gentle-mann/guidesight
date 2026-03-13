"""Minimal token server for the frontend to get Stream Video tokens."""

import json
import os
import re
import tempfile
import time
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from getstream import Stream
from getstream.models import UserRequest
from google import genai
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).parent.parent / ".env")

app = Flask(__name__)
CORS(app, origins="*")

client = Stream(
    api_key=os.environ["STREAM_API_KEY"],
    api_secret=os.environ["STREAM_API_SECRET"],
)

gemini_client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])


# --- Pydantic schema for AI-generated tasks ---


class GeneratedStep(BaseModel):
    step: int
    instruction: str
    visual_cue: str
    common_errors: List[str]


class GeneratedTask(BaseModel):
    id: str = Field(description="URL-safe slug, e.g. 'box_assembly'")
    name: str
    description: str
    difficulty: str = Field(description="beginner, intermediate, or advanced")
    estimated_time: str = Field(description="e.g. '5 minutes'")
    components: List[str]
    steps: List[GeneratedStep]
    cv_processor: str = Field(
        description="One of: paper_detection, component_detection, hand_tracking, general_vision"
    )
    cv_processor_reason: str = Field(
        description="One sentence explaining why this CV processor was chosen"
    )
    cv_tools: List[str] = Field(
        description=(
            "List of CV tool IDs useful for this task. Choose from: "
            "hand_tracking, paper_detection, object_detection, pose_estimation, "
            "color_segmentation, depth_estimation, edge_detection, aruco_markers, "
            "optical_flow, clip_verification, face_detection, point_tracking"
        )
    )


# Current call ID — set by the agent on startup
CURRENT_CALL_ID = None

# Current task ID — set by the frontend before joining
CURRENT_TASK_ID = None

TASKS_DIR = Path(__file__).parent / "tasks"

SAFE_ID_RE = re.compile(r"^[a-z0-9_]+$")


def _safe_task_id(task_id: str):
    """Validate task_id to prevent path traversal."""
    if not SAFE_ID_RE.match(task_id):
        return None
    return task_id


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/readyz")
def readyz():
    return jsonify({"status": "ready"})


@app.route("/token/<user_id>")
def get_token(user_id: str):
    # Upsert the user so Stream knows about them
    client.upsert_users(UserRequest(id=user_id, name="User", role="user"))
    token = client.create_token(user_id)
    return jsonify({"token": token, "apiKey": os.environ["STREAM_API_KEY"]})


@app.route("/call-id", methods=["GET"])
def get_call_id():
    return jsonify({"callId": CURRENT_CALL_ID})


@app.route("/call-id", methods=["POST"])
def set_call_id():
    global CURRENT_CALL_ID
    CURRENT_CALL_ID = request.json.get("callId")
    print(f"[TokenServer] Call ID set to: {CURRENT_CALL_ID}")
    return jsonify({"callId": CURRENT_CALL_ID})


# --- Task ID (selected task, same pattern as call-id) ---


@app.route("/task-id", methods=["GET"])
def get_task_id():
    return jsonify({"taskId": CURRENT_TASK_ID})


@app.route("/task-id", methods=["POST"])
def set_task_id():
    global CURRENT_TASK_ID, CURRENT_CALL_ID
    new_task_id = request.json.get("taskId")
    # Only clear call-id when task actually changes (not on page refresh)
    if new_task_id != CURRENT_TASK_ID:
        CURRENT_CALL_ID = None
        print(f"[TokenServer] Task changed: {CURRENT_TASK_ID} → {new_task_id} (call-id cleared)")
    else:
        print(f"[TokenServer] Task ID re-posted (same): {new_task_id} (call-id kept: {CURRENT_CALL_ID})")
    CURRENT_TASK_ID = new_task_id
    return jsonify({"taskId": CURRENT_TASK_ID})


# --- Coaching state (backup sync if custom events fail) ---

COACHING_STATE = {
    "current_step": 1,
    "completed_steps": [],
    "task_complete": False,
}


@app.route("/coaching-state", methods=["GET"])
def get_coaching_state():
    return jsonify(COACHING_STATE)


@app.route("/coaching-state", methods=["POST"])
def update_coaching_state():
    data = request.json or {}
    COACHING_STATE.update({
        k: data[k] for k in ("current_step", "completed_steps", "task_complete") if k in data
    })
    return jsonify(COACHING_STATE)


# --- Task CRUD ---


@app.route("/tasks", methods=["GET"])
def list_tasks():
    tasks = []
    for f in sorted(TASKS_DIR.glob("*.json")):
        with open(f) as fh:
            task = json.load(fh)
        tasks.append({
            "id": task["id"],
            "name": task["name"],
            "description": task["description"],
            "difficulty": task["difficulty"],
            "estimated_time": task["estimated_time"],
            "components": task["components"],
            "step_count": len(task["steps"]),
            "cv_tools": task.get("cv_tools", []),
        })
    return jsonify(tasks)


@app.route("/tasks/<task_id>", methods=["GET"])
def get_task(task_id: str):
    if not _safe_task_id(task_id):
        return jsonify({"error": "Invalid task ID"}), 400
    task_path = TASKS_DIR / f"{task_id}.json"
    if not task_path.exists():
        return jsonify({"error": "Task not found"}), 404
    with open(task_path) as f:
        task = json.load(f)
    task["step_count"] = len(task["steps"])
    return jsonify(task)


@app.route("/tasks", methods=["POST"])
def create_task():
    task = request.json
    task_id = task.get("id")
    if not task_id or not _safe_task_id(task_id):
        return jsonify({"error": "Task must have a valid id (lowercase letters, numbers, underscores only)"}), 400
    task_path = TASKS_DIR / f"{task_id}.json"
    if task_path.exists():
        return jsonify({"error": "Task already exists"}), 409
    with open(task_path, "w") as f:
        json.dump(task, f, indent=2)
    print(f"[TokenServer] Task created: {task_id}")
    return jsonify(task), 201


@app.route("/tasks/<task_id>", methods=["PUT"])
def update_task(task_id: str):
    if not _safe_task_id(task_id):
        return jsonify({"error": "Invalid task ID"}), 400
    task_path = TASKS_DIR / f"{task_id}.json"
    if not task_path.exists():
        return jsonify({"error": "Task not found"}), 404
    task = request.json
    task["id"] = task_id  # Ensure id matches URL
    with open(task_path, "w") as f:
        json.dump(task, f, indent=2)
    print(f"[TokenServer] Task updated: {task_id}")
    return jsonify(task)


@app.route("/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id: str):
    if not _safe_task_id(task_id):
        return jsonify({"error": "Invalid task ID"}), 400
    task_path = TASKS_DIR / f"{task_id}.json"
    if not task_path.exists():
        return jsonify({"error": "Task not found"}), 404
    task_path.unlink()
    print(f"[TokenServer] Task deleted: {task_id}")
    return jsonify({"deleted": task_id})


# --- AI Task Generation ---


GENERATE_PROMPT = """Analyze the provided materials and create a structured task definition for an AI coaching system that guides workers through physical tasks in real-time.

Requirements:
- Generate a URL-safe id slug from the task name (lowercase, underscores, no spaces)
- Write a concise one-line description
- Set difficulty to beginner, intermediate, or advanced
- Estimate how long the task takes (e.g. "5 minutes")
- List all physical components/materials needed (e.g. "1x Breadboard", "2x LED")
- Break the task into clear sequential steps (typically 4-8 steps)
- Each step needs:
  - A detailed instruction with spatial references (e.g. "Place the resistor in row 5, columns A and E")
  - A visual cue describing what completion looks like (what the AI camera should see)
  - 2-3 common errors a beginner might make
- Choose the most appropriate CV processor for annotating video frames during coaching:
  - paper_detection: For paper folding, origami, document handling (detects paper orientation, fold lines)
  - component_detection: For assembly with distinct parts like electronics, LEGO, mechanical (uses YOLO to identify components)
  - hand_tracking: For tasks where hand position/grip matters (cooking, medical, fine motor skills)
  - general_vision: For tasks where no specialized CV preprocessing helps
- Explain in one sentence why you chose that CV processor
- Select ALL applicable CV tools from the full catalog (usually 2-4 tools). Available tools:
  - hand_tracking: Hand skeleton, grip detection, pinch detection (MediaPipe) — useful for almost every physical task
  - paper_detection: Paper contour detection, orientation, fold lines (OpenCV)
  - object_detection: Zero-shot component identification by name (YOLO-World)
  - pose_estimation: Full-body skeleton for posture and ergonomics (MediaPipe)
  - color_segmentation: HSV color isolation for wires, components, materials (OpenCV)
  - depth_estimation: Monocular depth for 3D workspace understanding (Depth Anything)
  - edge_detection: Canny edges for fold lines, alignment, seams (OpenCV)
  - aruco_markers: Fiducial markers for spatial coordinate systems (OpenCV)
  - optical_flow: Motion direction tracking, fold direction arrows (OpenCV)
  - clip_verification: Natural language step verification via vision-text similarity (CLIP)
  - face_detection: Face landmarks, safety gear verification (MediaPipe)
  - point_tracking: Dense pixel tracking across video frames (CoTracker)"""


@app.route("/generate-task", methods=["POST"])
def generate_task():
    description = request.form.get("description", "")
    uploaded_files = request.files.getlist("files")

    if not description and not uploaded_files:
        return jsonify({"error": "Provide a description or upload files"}), 400

    gemini_files = []
    temp_paths = []

    try:
        # Upload files to Gemini File API
        for f in uploaded_files:
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{f.filename}")
            f.save(tmp.name)
            temp_paths.append(tmp.name)

            print(f"[Generate] Uploading {f.filename} to Gemini...")
            gemini_file = gemini_client.files.upload(file=tmp.name)

            # Poll video files until ACTIVE
            if f.content_type and f.content_type.startswith("video/"):
                while gemini_file.state.name == "PROCESSING":
                    print(f"[Generate] Waiting for {f.filename} to process...")
                    time.sleep(2)
                    gemini_file = gemini_client.files.get(name=gemini_file.name)
                if gemini_file.state.name == "FAILED":
                    return jsonify({"error": f"File processing failed: {f.filename}"}), 500

            gemini_files.append(gemini_file)

        # Build content parts
        parts = []
        for gf in gemini_files:
            parts.append(gf)
        if description:
            parts.append(f"\nUser description:\n{description}")
        parts.append(f"\n{GENERATE_PROMPT}")

        print(f"[Generate] Calling Gemini with {len(gemini_files)} file(s) + description...")
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=parts,
            config={
                "response_mime_type": "application/json",
                "response_schema": GeneratedTask,
            },
        )

        result = json.loads(response.text)
        print(f"[Generate] Task generated: {result.get('id')} ({len(result.get('steps', []))} steps)")
        return jsonify(result)

    except Exception as e:
        print(f"[Generate] Error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # Clean up temp files
        for p in temp_paths:
            try:
                os.unlink(p)
            except OSError:
                pass
        # Clean up Gemini files
        for gf in gemini_files:
            try:
                gemini_client.files.delete(name=gf.name)
            except Exception:
                pass


# --- AI Task Edit Chat ---


EDIT_CHAT_PROMPT = """You are an AI assistant helping edit a training task definition for a real-time AI coaching system.

The user will describe changes they want to make in natural language. Apply their requested changes to the current task JSON and return the full updated task.

Rules:
- Only modify what the user asks for. Keep everything else unchanged.
- If the user asks to add steps, insert them at the right position and renumber all steps sequentially.
- If the user asks to remove steps, remove them and renumber remaining steps.
- Maintain the same JSON structure exactly.
- The id field must remain a URL-safe slug (lowercase, underscores, no spaces).
- difficulty must be one of: beginner, intermediate, advanced
- cv_processor must be one of: paper_detection, component_detection, hand_tracking, general_vision
- Each step must have: step (number), instruction (string), visual_cue (string), common_errors (list of strings)
- Return the COMPLETE updated task, not just the changed parts."""


class EditChatResponse(BaseModel):
    task: GeneratedTask
    summary: str = Field(description="One sentence describing what was changed")


@app.route("/edit-task-chat", methods=["POST"])
def edit_task_chat():
    # Accept multipart form data (with optional files) or JSON
    if request.content_type and "multipart/form-data" in request.content_type:
        task_json = request.form.get("task", "")
        message = request.form.get("message", "").strip()
        uploaded_files = request.files.getlist("files")
        try:
            task = json.loads(task_json) if task_json else None
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid task JSON"}), 400
    else:
        data = request.json or {}
        task = data.get("task")
        message = data.get("message", "").strip()
        uploaded_files = []

    if not task:
        return jsonify({"error": "Task is required"}), 400
    if not message and not uploaded_files:
        return jsonify({"error": "A message or files are required"}), 400

    gemini_files = []
    temp_paths = []

    try:
        # Upload files to Gemini File API
        for f in uploaded_files:
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{f.filename}")
            f.save(tmp.name)
            temp_paths.append(tmp.name)

            print(f"[EditChat] Uploading {f.filename} to Gemini...")
            gemini_file = gemini_client.files.upload(file=tmp.name)

            # Poll video files until ACTIVE
            if f.content_type and f.content_type.startswith("video/"):
                while gemini_file.state.name == "PROCESSING":
                    print(f"[EditChat] Waiting for {f.filename} to process...")
                    time.sleep(2)
                    gemini_file = gemini_client.files.get(name=gemini_file.name)
                if gemini_file.state.name == "FAILED":
                    return jsonify({"error": f"File processing failed: {f.filename}"}), 500

            gemini_files.append(gemini_file)

        # Build content parts
        parts = []
        for gf in gemini_files:
            parts.append(gf)

        file_context = ""
        if gemini_files:
            file_context = "\n\nThe user has also attached reference files above. Use them to inform your edits to the task."

        prompt = f"""{EDIT_CHAT_PROMPT}{file_context}

Current task JSON:
{json.dumps(task, indent=2)}

User request: {message or "Update the task based on the attached files."}"""

        parts.append(prompt)

        print(f"[EditChat] Processing: {message[:80] if message else '(files only)'} ({len(gemini_files)} file(s))...")
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=parts,
            config={
                "response_mime_type": "application/json",
                "response_schema": EditChatResponse,
            },
        )

        result = json.loads(response.text)
        print(f"[EditChat] Done: {result.get('summary', 'no summary')}")
        return jsonify(result)

    except Exception as e:
        print(f"[EditChat] Error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        for p in temp_paths:
            try:
                os.unlink(p)
            except OSError:
                pass
        for gf in gemini_files:
            try:
                gemini_client.files.delete(name=gf.name)
            except Exception:
                pass


# --- Translation (Shisa AI) ---

SHISA_API_KEY = os.environ.get("SHISA_API_KEY", "")
TRANSLATION_CACHE: dict[str, str] = {}


@app.route("/translate", methods=["POST"])
def translate_text():
    """Translate text using Shisa AI Translation API (EN→JA)."""
    data = request.json or {}
    text = data.get("text", "").strip()
    source_lang = data.get("source_lang", "en")
    target_lang = data.get("target_lang", "ja")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    # Check cache
    cache_key = f"{source_lang}:{target_lang}:{text}"
    if cache_key in TRANSLATION_CACHE:
        return jsonify({"translated": TRANSLATION_CACHE[cache_key], "cached": True})

    if not SHISA_API_KEY:
        return jsonify({"error": "SHISA_API_KEY not configured"}), 503

    try:
        import requests as req

        resp = req.post(
            "https://api.shisa.ai/translate/",
            data={
                "text": text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "stream": "false",
            },
            headers={"Authorization": SHISA_API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        result = resp.json()
        translated = result["choices"][0]["message"]["content"]
        TRANSLATION_CACHE[cache_key] = translated
        return jsonify({"translated": translated, "cached": False})

    except Exception as e:
        print(f"[Translate] Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/translate-task/<task_id>", methods=["GET"])
def translate_task(task_id: str):
    """Translate all steps of a task to Japanese. Returns translated steps."""
    if not _safe_task_id(task_id):
        return jsonify({"error": "Invalid task ID"}), 400
    task_path = TASKS_DIR / f"{task_id}.json"
    if not task_path.exists():
        return jsonify({"error": "Task not found"}), 404

    with open(task_path) as f:
        task = json.load(f)

    # Check if full task translation is cached
    full_cache_key = f"task:{task_id}"
    if full_cache_key in TRANSLATION_CACHE:
        return jsonify(json.loads(TRANSLATION_CACHE[full_cache_key]))

    if not SHISA_API_KEY:
        return jsonify({"error": "SHISA_API_KEY not configured"}), 503

    try:
        import requests as req

        # Batch translate: combine all step instructions into one request
        lines = []
        lines.append(f"TASK_NAME: {task['name']}")
        lines.append(f"TASK_DESC: {task['description']}")
        for step in task["steps"]:
            lines.append(f"STEP_{step['step']}: {step['instruction']}")
        combined = "\n".join(lines)

        resp = req.post(
            "https://api.shisa.ai/translate/",
            data={
                "text": combined,
                "source_lang": "en",
                "target_lang": "ja",
                "stream": "false",
            },
            headers={"Authorization": SHISA_API_KEY},
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        translated_text = result["choices"][0]["message"]["content"]

        # Parse translated lines back
        translated_lines = translated_text.strip().split("\n")
        translated_steps = []
        translated_name = task["name"]
        translated_desc = task["description"]

        for line in translated_lines:
            line = line.strip()
            if not line:
                continue
            if line.startswith("TASK_NAME:"):
                translated_name = line.split(":", 1)[1].strip()
            elif line.startswith("TASK_DESC:"):
                translated_desc = line.split(":", 1)[1].strip()
            elif line.startswith("STEP_"):
                parts = line.split(":", 1)
                if len(parts) == 2:
                    step_num = parts[0].replace("STEP_", "").strip()
                    translated_steps.append({
                        "step": int(step_num),
                        "instruction": parts[1].strip(),
                    })

        response_data = {
            "task_id": task_id,
            "name": translated_name,
            "description": translated_desc,
            "steps": translated_steps,
        }

        TRANSLATION_CACHE[full_cache_key] = json.dumps(response_data)
        return jsonify(response_data)

    except Exception as e:
        print(f"[TranslateTask] Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"[TokenServer] Running on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
