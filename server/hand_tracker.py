"""
HandTrackingProcessor — MediaPipe hand tracking annotator for GuideSight.

Standalone, task-agnostic processor that detects hands in video frames and
draws annotations directly onto the frame before Gemini sees it.  Can be
composed with any domain-specific processor (paper detection, YOLO, etc.).

Annotations drawn:
  - Green skeleton lines connecting 21 hand landmarks per hand
  - Pink dots at each joint/landmark
  - "Left" / "Right" handedness label near each wrist
  - "PINCHING" label when thumb tip and index finger tip are close
"""

import logging
from pathlib import Path
from typing import Optional

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    HandLandmarker,
    HandLandmarkerOptions,
    HandLandmarkerResult,
    HandLandmarksConnections,
    RunningMode,
)

logger = logging.getLogger(__name__)

# Default model path — sits alongside this file in server/
_DEFAULT_MODEL_PATH = Path(__file__).parent / "hand_landmarker.task"

# Landmark indices
_THUMB_TIP = 4
_INDEX_TIP = 8
_WRIST = 0

# Drawing constants
_SKELETON_COLOR = (0, 255, 128)   # Green
_LANDMARK_COLOR = (255, 0, 128)   # Pink
_LABEL_COLOR = (255, 255, 0)      # Yellow
_PINCH_COLOR = (0, 255, 255)      # Cyan
_SKELETON_THICKNESS = 2
_LANDMARK_RADIUS = 4
_PINCH_THRESHOLD = 0.05


class HandTracker:
    """Detects hands and draws annotations onto a BGR numpy frame.

    This is a pure annotation utility — not a VideoProcessorPublisher.
    It can be called from any processor's frame pipeline:

        tracker = HandTracker()
        annotated = tracker.annotate(img)
    """

    def __init__(
        self,
        model_path: Optional[Path] = None,
        num_hands: int = 2,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        model_path = model_path or _DEFAULT_MODEL_PATH
        options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(model_path)),
            running_mode=RunningMode.IMAGE,
            num_hands=num_hands,
            min_hand_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self._landmarker = HandLandmarker.create_from_options(options)
        self._connections = HandLandmarksConnections.HAND_CONNECTIONS

    def annotate(self, img: np.ndarray) -> np.ndarray:
        """Detect hands and draw skeleton + labels onto the frame (in-place)."""
        h, w = img.shape[:2]
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        try:
            results: HandLandmarkerResult = self._landmarker.detect(mp_image)
        except Exception as e:
            logger.debug(f"[HandTracker] Detection error: {e}")
            return img

        if not results.hand_landmarks:
            return img

        for hand_idx, landmarks in enumerate(results.hand_landmarks):
            self._draw_skeleton(img, landmarks, w, h)
            self._draw_landmarks(img, landmarks, w, h)

            if hand_idx < len(results.handedness):
                label = results.handedness[hand_idx][0].category_name
                self._draw_label(img, landmarks, label, w, h)
                self._draw_pinch(img, landmarks, w, h)

        return img

    def _draw_skeleton(self, img, landmarks, w, h):
        for conn in self._connections:
            s = landmarks[conn.start]
            e = landmarks[conn.end]
            cv2.line(
                img,
                (int(s.x * w), int(s.y * h)),
                (int(e.x * w), int(e.y * h)),
                _SKELETON_COLOR,
                _SKELETON_THICKNESS,
            )

    def _draw_landmarks(self, img, landmarks, w, h):
        for lm in landmarks:
            cv2.circle(img, (int(lm.x * w), int(lm.y * h)), _LANDMARK_RADIUS, _LANDMARK_COLOR, -1)

    def _draw_label(self, img, landmarks, label, w, h):
        wrist = landmarks[_WRIST]
        wx, wy = int(wrist.x * w), int(wrist.y * h)
        cv2.putText(img, label, (wx, wy - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, _LABEL_COLOR, 2)

    def _draw_pinch(self, img, landmarks, w, h):
        thumb = landmarks[_THUMB_TIP]
        index = landmarks[_INDEX_TIP]
        dist = ((thumb.x - index.x) ** 2 + (thumb.y - index.y) ** 2) ** 0.5
        if dist < _PINCH_THRESHOLD:
            wrist = landmarks[_WRIST]
            wx, wy = int(wrist.x * w), int(wrist.y * h)
            cv2.putText(img, "PINCHING", (wx, wy - 45),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, _PINCH_COLOR, 2)

    def close(self):
        self._landmarker.close()
