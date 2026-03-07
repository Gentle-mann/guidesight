# Technology Research: Beyond OpenCV + MediaPipe

Comprehensive research into CV/AI technologies for real-time physical task coaching (conducted March 2026).

### Currently Implemented
- **OpenCV** — Paper contour detection, bounding box, PORTRAIT/LANDSCAPE label, center line
- **MediaPipe Hands** (planned) — 21-landmark hand tracking, handedness, pinch detection

### Tier 1: Highest Impact, Easy to Add

#### YOLO-World (Zero-Shot Detection)
- **What**: Open-vocabulary detection. Provide text prompts ("LED", "resistor", "folded paper") → detects objects with NO training data.
- **Why**: Detect any task component by name. Add a new task (e.g., "build a circuit") without training a model.
- **Install**: `pip install ultralytics` → `from ultralytics import YOLOWorld; model = YOLOWorld("yolov8s-worldv2"); model.set_classes(["LED", "resistor", "breadboard"])`
- **Performance**: Real-time on GPU. CPU may be too slow for real-time.
- **Source**: https://docs.ultralytics.com/models/yolo-world/

#### Roboflow Supervision
- **What**: Model-agnostic CV annotation toolkit. Draw bounding boxes, labels, zones, tracking trails on frames. MIT license.
- **Why**: Cleaner annotation code than raw OpenCV drawing. Handles multi-model output visualization.
- **Install**: `pip install supervision` → `import supervision as sv`
- **Source**: https://github.com/roboflow/supervision

#### CLIP Embeddings for Step Verification
- **What**: Encode current frame + text description of expected state ("paper folded in half symmetrically") → compare cosine similarity.
- **Why**: Verify step completion using natural language descriptions, robust to camera angle and lighting. More reliable than pixel comparison.
- **Install**: `pip install transformers` + HuggingFace CLIP model
- **How**: Encode frame, encode text description from `visual_cue` in task JSON, compare. If similarity > threshold → step complete.

#### Two-Colored Paper (Physical Trick)
- **What**: Use paper that's white on one side, colored on the other (e.g., origami paper).
- **Why**: Fold detection becomes trivial — when the paper is folded, the colored side shows. CV can detect color boundaries to identify fold lines with near-perfect accuracy.
- **Source**: Frontiers 2025 paper on AR origami training used this exact trick with YOLOv8.
- **Cost**: ~100 yen for a pack of origami paper from any Japanese stationery store.

#### HSV Color Segmentation (Built into OpenCV)
- **What**: `cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)` + `cv2.inRange(hsv, lower, upper)` to isolate specific colors.
- **Why**: Detect colored wires, LED colors, paper sides. Near-zero computational cost.

### Tier 2: High Impact, Moderate Integration Effort

#### CoTracker (Meta) — Dense Point Tracking
- **What**: Tracks any pixel point across video frames. Transformer-based, handles occlusions.
- **Why**: Track paper edge points across frames → detect fold direction from actual pixel motion. Better than optical flow for long-range tracking.
- **Install**: `pip install cotracker`
- **Performance**: Real-time variant available.
- **Source**: https://github.com/facebookresearch/co-tracker

#### Depth Anything V2 (NeurIPS 2024)
- **What**: Monocular depth estimation from a single webcam. No special hardware needed.
- **Why**: Know when user lifts paper off table, detect 3D workspace layout, understand component layering.
- **Install**: `pip install depth-anything-v2` or HuggingFace
- **Performance**: 10x faster than diffusion-based methods. Smaller models suitable for real-time.
- **Source**: https://github.com/DepthAnything/Depth-Anything-V2

#### YOLO26-N (Ultralytics, January 2026)
- **What**: Latest YOLO. NMS-free, optimized for edge. 38.9ms CPU inference at 40.9% mAP.
- **Why**: General-purpose component detection at 25+ FPS on CPU. No GPU needed.
- **Install**: `pip install ultralytics` → `YOLO("yolo26n.pt")`
- **Source**: https://docs.ultralytics.com/models/yolo26/

#### ArUco Markers (Built into OpenCV)
- **What**: Square fiducial markers with binary patterns. Provides 6DOF pose estimation from a single camera.
- **Why**: Place markers on workspace corners → establish a precise coordinate system. "Place the LED in the third row" becomes a spatial coordinate.
- **Install**: Built into OpenCV. `cv2.aruco.detectMarkers()`

#### Moondream (0.5B VLM)
- **What**: World's smallest Vision-Language Model. 500M params, 479 MiB quantized. Runs on Raspberry Pi.
- **Why**: Local visual classifier. Ask "what step is the user on?" for each frame without API calls. No cloud latency.
- **Install**: `pip install moondream` or via Ollama. Also supported by Vision Agents SDK.
- **Source**: https://github.com/vikhyat/moondream

### Tier 3: Future Exploration (v2+)

#### Qwen3-Omni (Alibaba) — Open-Source Gemini Live Alternative
- **What**: End-to-end omni-modal LLM. Text, audio, images, video input. Real-time streaming speech output. 234ms first-packet latency.
- **Why**: Self-hostable → NO 2-minute session limit. Comparable to Gemini 2.5 Pro on benchmarks.
- **Install**: HuggingFace, Qwen3-Omni-30B-A3B-Instruct
- **Caveat**: Requires significant GPU (30B params). Not feasible for hackathon but viable for production.
- **Source**: https://github.com/QwenLM/Qwen3-Omni

#### FoundationPose (NVIDIA, CVPR 2024)
- **What**: 6DOF pose estimation and tracking. Works with novel objects without fine-tuning.
- **Why**: Know exact 3D orientation of components. "The paper is at 45 degrees."
- **Source**: https://github.com/NVlabs/FoundationPose

#### Grounded SAM 2 (IDEA Research)
- **What**: Text prompt → detection → precise segmentation → video tracking. Full pipeline.
- **Why**: "Detect and track the paper airplane" from a single text prompt.
- **Source**: https://github.com/IDEA-Research/Grounded-SAM-2

#### FastRTC (Gradio)
- **What**: Python library turning any function into a real-time audio/video stream over WebRTC.
- **Why**: Alternative to Stream Video for rapid prototyping. Auto-generates UI.
- **Install**: `pip install fastrtc`
- **Source**: https://github.com/gradio-app/fastrtc

#### Picovoice — On-Device Voice AI
- **What**: Wake word ("Hey Coach"), streaming STT, streaming TTS. Everything runs locally. Works on Raspberry Pi.
- **Install**: `pip install picovoice`
- **Source**: https://picovoice.ai/docs/

### Key External Discoveries

#### Origami Sensei (CMU, 2023-2025)
- **Most directly relevant project found.** CMU research project that uses CV to identify the user's current origami fold step, then projects visual guidance directly onto the workspace via a projector.
- **Architecture**: Tablet + mirror + projector setup. Core ML: CNN classifier trained on images of paper at each fold stage.
- **Key insight**: Train a classifier on fold *states* (step 1 complete, step 2 complete, etc.) rather than trying to detect fold *actions*. This is simpler and more reliable.
- **Relevance**: Their approach of classifying fold states is something we should adopt — train a custom YOLO model to recognize specific fold stages.

#### AR Origami Training with YOLOv8 (Poznań/Cambridge, Frontiers 2025)
- **Exact same use case as GuideSight.** Peer-reviewed system for AR-guided origami with automatic fold detection.
- **Key insights**: (1) Two-colored paper dramatically improves fold detection. (2) YOLOv8 trained on origami fold states achieves reliable real-time validation. (3) Deployed on HoloLens 2 for on-device inference. (4) Works across diverse backgrounds and lighting without markers.
- **Source**: https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2025.1499830/full

#### LightGuide Systems — Projection-Based Guidance
- Projects AR work instructions directly onto the physical work surface. No screens/headsets.
- Achieved **50% cycle time reduction** and **75% training time reduction** at Lightning eMotors.
- Gold standard for industrial guided assembly.
- **Source**: https://www.lightguidesys.com/

#### Squint — Expert Recording → AR Replay
- Captures documentation from video of experienced practitioners demonstrating skills on real hardware.
- "Record an expert, replay as AR guidance" approach. Could apply to GuideSight: record one perfect fold sequence → use as reference.
- **Source**: https://www.squint.ai/

#### Gemini Live Agent Challenge (Google, March 2026)
- **$80,000 in prizes** for building multimodal Gemini Live agents.
- Categories include "vision-enabled tutors" — GuideSight qualifies.
- **Deadline: March 16, 2026.**
- **Source**: https://geminiliveagentchallenge.devpost.com/

### Additional Technologies (From Second Research Pass)

#### Autodistill — Auto-Labeling Pipeline
- Uses Florence-2 or Grounding DINO to auto-label images, then trains a lightweight YOLO model from those labels.
- **Why**: Photograph paper at each fold step (50 per step) → Autodistill auto-labels → train custom YOLOv8 → deploy. No manual annotation.
- **Install**: `pip install autodistill autodistill-grounded-sam-2`
- **This is the fastest path to a custom fold-state detector.**

#### Molmo (Allen Institute for AI) — Pointing VLM
- 1B / 7B / 72B parameter VLM that can **point** to visual elements in an image.
- **Why**: Could run the 1B model locally and literally point to where the user should fold next. The pointing capability is unique among VLMs.
- **Source**: https://github.com/allenai/molmo

#### MiniCPM-V — Mobile VLM
- 8B parameter VLM that runs on mobile phones. Outperforms GPT-4V on 11 public benchmarks.
- **Why**: On-device step verification without cloud API calls. Ask "what fold step is this paper at?" locally.
- **Source**: https://github.com/OpenBMB/MiniCPM-V

#### Custom Fold-State Classifier (Architecture Pattern)
- Instead of general paper detection (our current approach), train YOLO to recognize specific fold states:
  - Class 0: "flat paper" / Class 1: "center crease" / Class 2: "corners folded" / Class 3: "point folded down" / etc.
- The Origami Sensei and Frontiers papers both validated this approach.
- **Training pipeline**: Take ~50 photos per fold state → Roboflow or Autodistill → train YOLOv8 → annotate each frame with detected fold state label.
- **This would be more useful than orientation detection alone** — Gemini would see "FOLD STATE: Step 2 complete" on the frame.

#### Keyframe-Only VLM Verification (Architecture Pattern)
- Run cheap change-detection locally (frame diff > threshold). Only send frames to cloud VLM when the scene actually changes.
- **Why**: Reduces API costs and latency. Most frames in a coaching session are nearly identical (user thinking, adjusting slightly). Only verify when something significant happens.
- **Implementation**: `cv2.absdiff(prev_frame, curr_frame)` → if mean diff > threshold → send to CLIP/VLM for verification.

#### Depth Sensing Hardware
- **Luxonis OAK-D**: OpenCV AI Kit with depth sensing + object detection. Detects if fold is truly flat or still raised.
- **Intel RealSense**: Depth cameras with OpenCV integration. Measures fold depth and paper thickness.
- **iPhone LiDAR**: Built-in depth sensing on Pro models, accessible via ARKit.
- **Relevance**: All useful for v2+ when we need 3D understanding of folds.

### Inference Optimization (If Performance Becomes an Issue)
- **ONNX Runtime**: Up to 4x CPU speedup. `pip install onnxruntime`
- **OpenCV DNN Module**: Load ONNX models with just OpenCV. `cv2.dnn.readNet()`
- **OpenVINO (Intel)**: INT8/FP16 optimization for Intel hardware. `pip install openvino`
