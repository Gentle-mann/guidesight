"""
HTTP wrapper for the coaching agent — needed for Cloud Run deployment.

Cloud Run requires an HTTP server to respond to health checks and to stay alive.
This wrapper:
  1. Starts a minimal Flask server on PORT (for health checks)
  2. Launches the agent's main() in a background asyncio task
  3. Provides /start endpoint to trigger agent startup on demand
"""

import asyncio
import os
import threading

from flask import Flask, jsonify

app = Flask(__name__)

agent_status = {"running": False, "error": None, "task": None}


@app.route("/health")
def health():
    return jsonify({"status": "ok", "agent": agent_status})


@app.route("/readyz")
def readyz():
    return jsonify({"status": "ready"})


@app.route("/start", methods=["POST"])
def start_agent():
    if agent_status["running"]:
        return jsonify({"status": "already_running"})
    _launch_agent()
    return jsonify({"status": "starting"})


def _run_agent_loop():
    """Run the agent in a new event loop on a background thread."""
    import agent  # noqa: import here to avoid circular deps

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        agent_status["running"] = True
        loop.run_until_complete(agent.main())
    except Exception as e:
        agent_status["error"] = str(e)
        print(f"[AgentServer] Agent error: {e}")
    finally:
        agent_status["running"] = False
        loop.close()


def _launch_agent():
    t = threading.Thread(target=_run_agent_loop, daemon=True)
    t.start()


if __name__ == "__main__":
    # Auto-start the agent on container boot
    _launch_agent()

    port = int(os.environ.get("PORT", 8081))
    print(f"[AgentServer] Health server on :{port}, agent starting in background...")
    app.run(host="0.0.0.0", port=port, debug=False)
