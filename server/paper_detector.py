"""
PaperDetectorProcessor — OpenCV-based frame annotator for GuideSight.

Detects the largest paper-like rectangle in each frame, determines its
orientation (PORTRAIT / LANDSCAPE), and draws visual annotations directly
onto the frame before Gemini sees it.  This follows the same pattern as
the golf-coach YOLO processor: Gemini interprets annotated images, not
raw pixels.

Annotations drawn:
  - Green bounding box around the detected paper
  - "PORTRAIT" or "LANDSCAPE" label in large text
  - A center-line (vertical for portrait, horizontal for landscape)
  - Corner dots on the detected quadrilateral
  - "NO PAPER DETECTED" warning when nothing is found
  - Hand skeleton + labels (via HandTracker)
"""

import asyncio
import fractions
import logging
import time
from typing import Optional

import av
import cv2
import numpy as np
from aiortc import VideoStreamTrack
from vision_agents.core.processors.base_processor import VideoProcessorPublisher
from vision_agents.core.utils.video_forwarder import VideoForwarder

from hand_tracker import HandTracker

logger = logging.getLogger(__name__)

VIDEO_CLOCK_RATE = 90000
VIDEO_PTIME = 1 / 30


class AnnotatedVideoTrack(VideoStreamTrack):
    """A VideoStreamTrack that yields the latest annotated frame."""

    kind = "video"

    def __init__(self):
        super().__init__()
        self._queue: asyncio.Queue[av.VideoFrame] = asyncio.Queue(maxsize=2)
        self._latest_frame: Optional[av.VideoFrame] = None

    def push_frame(self, frame: av.VideoFrame):
        """Push a processed frame (called from the frame handler)."""
        self._latest_frame = frame
        # Non-blocking put — drop old frames if queue is full
        try:
            self._queue.put_nowait(frame)
        except asyncio.QueueFull:
            try:
                self._queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
            try:
                self._queue.put_nowait(frame)
            except asyncio.QueueFull:
                pass

    async def recv(self) -> av.VideoFrame:
        if self.readyState != "live":
            raise Exception("Track ended")

        pts, time_base = await self.next_timestamp()

        # Wait for a frame (with timeout to avoid hanging forever)
        try:
            frame = await asyncio.wait_for(self._queue.get(), timeout=1.0)
        except asyncio.TimeoutError:
            # Return latest frame if we have one, otherwise a black frame
            if self._latest_frame is not None:
                frame = self._latest_frame
            else:
                # Create a proper black frame (YUV420P: Y=0, U=128, V=128)
                black = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(black, "RECONNECTING...", (180, 250),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)
                frame = av.VideoFrame.from_ndarray(black, format="bgr24")

        frame.pts = pts
        frame.time_base = time_base
        return frame


class PaperDetectorProcessor(VideoProcessorPublisher):
    """
    Detects paper in video frames using OpenCV contour detection,
    annotates frames with bounding box + orientation label,
    and publishes annotated frames for Gemini to watch.
    """

    def __init__(self, fps: float = 5.0, min_paper_area_ratio: float = 0.05):
        """
        Args:
            fps: How many frames per second to process (higher = more responsive,
                 but more CPU). 5 fps is a good balance.
            min_paper_area_ratio: Minimum ratio of paper area to frame area
                                  to consider a detection valid.
        """
        self._fps = fps
        self._min_paper_area_ratio = min_paper_area_ratio
        self._output_track = AnnotatedVideoTrack()
        self._forwarder: Optional[VideoForwarder] = None
        self._frame_handler = None
        self._claude_frame_callback = None  # Called with raw frames for Claude
        self._hand_tracker = HandTracker()

    @property
    def name(self) -> str:
        return "paper-detector"

    def publish_video_track(self) -> VideoStreamTrack:
        return self._output_track

    async def process_video(
        self,
        track: VideoStreamTrack,
        participant_id: Optional[str],
        shared_forwarder: Optional[VideoForwarder] = None,
    ) -> None:
        logger.info(f"[PaperDetector] Starting processing for participant {participant_id}")
        self._forwarder = shared_forwarder

        if shared_forwarder is not None:
            self._frame_handler = self._on_frame
            shared_forwarder.add_frame_handler(
                self._frame_handler,
                fps=self._fps,
                name="paper-detector",
            )
        else:
            logger.warning("[PaperDetector] No shared forwarder — cannot process frames")

    async def stop_processing(self) -> None:
        logger.info("[PaperDetector] Stopping processing")
        if self._forwarder and self._frame_handler:
            await self._forwarder.remove_frame_handler(self._frame_handler)
            self._frame_handler = None

    async def close(self) -> None:
        logger.info("[PaperDetector] Closing")
        self._hand_tracker.close()
        self._output_track.stop()

    def _on_frame(self, frame: av.VideoFrame) -> None:
        """Process a single video frame: detect paper, annotate, publish."""
        try:
            # Feed raw frame to Claude vision loop if callback is set
            if self._claude_frame_callback:
                self._claude_frame_callback(frame)

            # Convert av.VideoFrame → numpy array (BGR for OpenCV)
            img = frame.to_ndarray(format="bgr24")
            annotated = self._detect_and_annotate(img)

            # Convert back to av.VideoFrame
            out_frame = av.VideoFrame.from_ndarray(annotated, format="bgr24")
            out_frame.pts = frame.pts
            out_frame.time_base = frame.time_base

            self._output_track.push_frame(out_frame)
        except Exception as e:
            logger.error(f"[PaperDetector] Frame processing error: {e}")

    def _find_paper_contour(self, gray: np.ndarray, frame_area: int):
        """Find the largest quadrilateral contour (paper) using edge detection.

        Classic document-scanner approach: Canny edges → find contours →
        keep only 4-sided polygons within a reasonable size range.
        Returns (best_quad, best_area, best_rect) or (None, 0, None).
        """
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Canny edge detection — finds paper EDGES, not surface
        edges = cv2.Canny(blurred, 50, 150)

        # Dilate edges to close small gaps, then find contours
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=2)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Sort by area descending — check largest first
        contours = sorted(contours, key=cv2.contourArea, reverse=True)

        best_quad = None
        best_area = 0
        best_rect = None
        min_area = frame_area * self._min_paper_area_ratio
        max_area = frame_area * 0.60  # Paper can't be more than 60% of frame

        for contour in contours[:20]:  # Only check top 20 largest
            area = cv2.contourArea(contour)
            if area < min_area or area > max_area:
                continue

            # Approximate contour to polygon — paper should be a quadrilateral
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

            # Must have 4-8 sides (4 = perfect quad, allow some extra vertices)
            if len(approx) < 4 or len(approx) > 8:
                continue

            rect = cv2.minAreaRect(contour)
            rect_w, rect_h = rect[1]
            if rect_w == 0 or rect_h == 0:
                continue

            # Rectangularity: contour fills most of its bounding rect
            rectangularity = area / (rect_w * rect_h)
            if rectangularity < 0.6:
                continue

            # Aspect ratio — paper is ~1.41 (A4) but allow wider range
            aspect = max(rect_w, rect_h) / min(rect_w, rect_h)
            if aspect > 2.5:
                continue

            if area > best_area:
                best_area = area
                best_rect = rect
                if len(approx) == 4:
                    best_quad = approx
                else:
                    best_quad = cv2.boxPoints(rect).astype(np.int32)

        return best_quad, best_area, best_rect

    def _detect_and_annotate(self, img: np.ndarray) -> np.ndarray:
        """Detect the paper and draw annotations on the frame."""
        h, w = img.shape[:2]
        frame_area = h * w

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        best_quad, best_area, best_rect = self._find_paper_contour(gray, frame_area)

        # --- Draw annotations ---
        annotated = img.copy()

        if best_rect is not None and best_area > frame_area * self._min_paper_area_ratio:
            center, (rect_w, rect_h), angle = best_rect
            box_pts = cv2.boxPoints(best_rect).astype(np.int32)

            # Determine orientation using the rotated rect's side angles.
            # side1 = pts[0]→pts[1], side2 = pts[1]→pts[2]
            side1_vec = box_pts[1].astype(float) - box_pts[0].astype(float)
            side2_vec = box_pts[2].astype(float) - box_pts[1].astype(float)
            side1_len = np.linalg.norm(side1_vec)
            side2_len = np.linalg.norm(side2_vec)

            # Which side is more vertical? Check angle from horizontal.
            # atan2 gives angle: 0=horizontal, ±90=vertical
            side1_angle = abs(np.degrees(np.arctan2(abs(side1_vec[1]), abs(side1_vec[0]))))
            side2_angle = abs(np.degrees(np.arctan2(abs(side2_vec[1]), abs(side2_vec[0]))))

            # The more vertical side is the paper's "height"
            if side1_angle > side2_angle:
                paper_height = side1_len
                paper_width = side2_len
            else:
                paper_height = side2_len
                paper_width = side1_len

            is_portrait = paper_height > paper_width
            orientation = "PORTRAIT" if is_portrait else "LANDSCAPE"
            confidence = abs(paper_height - paper_width) / max(paper_height, paper_width)
            area_pct = best_area / frame_area * 100

            # Colors
            box_color = (0, 255, 0)
            label_bg = (0, 180, 0) if is_portrait else (0, 140, 255)
            text_color = (255, 255, 255)

            # Draw the detected quadrilateral
            cv2.drawContours(annotated, [best_quad.reshape(-1, 1, 2)], 0, box_color, 3)
            for pt in best_quad.reshape(-1, 2):
                cv2.circle(annotated, tuple(pt), 8, (0, 0, 255), -1)

            # Draw orientation label at top-center
            label = orientation
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 1.5
            thickness = 3
            (tw, th), baseline = cv2.getTextSize(label, font, font_scale, thickness)
            label_x = (w - tw) // 2
            label_y = 50
            cv2.rectangle(
                annotated,
                (label_x - 10, label_y - th - 10),
                (label_x + tw + 10, label_y + baseline + 10),
                label_bg, -1,
            )
            cv2.putText(annotated, label, (label_x, label_y), font, font_scale, text_color, thickness)

            # Draw center line through the paper
            cx, cy = int(center[0]), int(center[1])
            bx, by, bw, bh = cv2.boundingRect(box_pts)
            if is_portrait:
                cv2.line(annotated, (cx, by), (cx, by + bh), (255, 255, 0), 2, cv2.LINE_AA)
            else:
                cv2.line(annotated, (bx, cy), (bx + bw, cy), (255, 255, 0), 2, cv2.LINE_AA)

            # Draw paper dimensions (rotated rect, not axis-aligned)
            dim_label = f"{int(paper_width)}x{int(paper_height)}px ({area_pct:.0f}%)"
            cv2.putText(annotated, dim_label, (bx, by - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)

            print(
                f"[PaperDetector] {orientation} | "
                f"w={int(paper_width)} h={int(paper_height)} | "
                f"area={area_pct:.1f}% | "
                f"confidence={confidence:.2f}"
            )
        else:
            # No paper detected
            label = "NO PAPER DETECTED"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 1.2
            thickness = 3
            (tw, th), baseline = cv2.getTextSize(label, font, font_scale, thickness)
            label_x = (w - tw) // 2
            label_y = 50
            cv2.rectangle(
                annotated,
                (label_x - 10, label_y - th - 10),
                (label_x + tw + 10, label_y + baseline + 10),
                (0, 0, 180), -1,
            )
            cv2.putText(annotated, label, (label_x, label_y), font, font_scale, (255, 255, 255), thickness)

        # --- Hand tracking annotations ---
        self._hand_tracker.annotate(annotated)

        return annotated
