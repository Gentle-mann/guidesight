"""
BoxDetectorProcessor — OpenCV-based frame annotator for box assembly tasks.

Detects cardboard boxes in video frames using HSV color segmentation and
contour analysis, then draws visual annotations directly onto the frame
before Gemini sees it.  Same pattern as PaperDetectorProcessor but tuned
for brown cardboard boxes instead of white paper.

Annotations drawn:
  - Cyan bounding box around the detected box body
  - Box state label: "BOX FLAT", "BOX OPEN", "FLAPS VISIBLE"
  - Flap edge indicators when the box opening is visible
  - Tape detection via color contrast (dark strips on brown cardboard)
  - "TAPE DETECTED" label with highlight overlay
  - Hand skeleton + labels (via HandTracker)
"""

import asyncio
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


class AnnotatedVideoTrack(VideoStreamTrack):
    """A VideoStreamTrack that yields the latest annotated frame."""

    kind = "video"

    def __init__(self):
        super().__init__()
        self._queue: asyncio.Queue[av.VideoFrame] = asyncio.Queue(maxsize=2)
        self._latest_frame: Optional[av.VideoFrame] = None

    def push_frame(self, frame: av.VideoFrame):
        self._latest_frame = frame
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

        try:
            frame = await asyncio.wait_for(self._queue.get(), timeout=1.0)
        except asyncio.TimeoutError:
            if self._latest_frame is not None:
                frame = self._latest_frame
            else:
                black = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(black, "RECONNECTING...", (180, 250),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)
                frame = av.VideoFrame.from_ndarray(black, format="bgr24")

        frame.pts = pts
        frame.time_base = time_base
        return frame


class BoxDetectorProcessor(VideoProcessorPublisher):
    """
    Detects cardboard boxes in video frames using HSV color segmentation,
    identifies flap states and tape, annotates frames, and publishes
    annotated frames for Gemini to watch.
    """

    def __init__(self, fps: float = 5.0, min_box_area_ratio: float = 0.08):
        self._fps = fps
        self._min_box_area_ratio = min_box_area_ratio
        self._output_track = AnnotatedVideoTrack()
        self._forwarder: Optional[VideoForwarder] = None
        self._frame_handler = None
        self._claude_frame_callback = None
        self._debug_event_callback = None  # Send CV detection events to frontend
        self._hand_tracker = HandTracker()
        self._last_debug_time = 0

        # HSV ranges for brown cardboard (multiple ranges for lighting variation)
        # Brown cardboard: low saturation, medium value
        self._cardboard_ranges = [
            # Standard brown cardboard
            ((8, 30, 60), (25, 180, 220)),
            # Light/bleached cardboard
            ((10, 15, 120), (30, 120, 240)),
            # Dark/shadowed cardboard
            ((5, 40, 40), (20, 200, 160)),
        ]

        # HSV ranges for dark tape (black/dark tape on brown cardboard)
        self._tape_dark_range = ((0, 0, 0), (180, 80, 60))
        # HSV range for clear/brown packing tape (shinier than cardboard)
        self._tape_shiny_range = ((10, 10, 140), (30, 80, 255))

    @property
    def name(self) -> str:
        return "box-detector"

    def publish_video_track(self) -> VideoStreamTrack:
        return self._output_track

    async def process_video(
        self,
        track: VideoStreamTrack,
        participant_id: Optional[str],
        shared_forwarder: Optional[VideoForwarder] = None,
    ) -> None:
        logger.info(f"[BoxDetector] Starting processing for participant {participant_id}")
        self._forwarder = shared_forwarder

        if shared_forwarder is not None:
            self._frame_handler = self._on_frame
            shared_forwarder.add_frame_handler(
                self._frame_handler,
                fps=self._fps,
                name="box-detector",
            )
        else:
            logger.warning("[BoxDetector] No shared forwarder — cannot process frames")

    async def stop_processing(self) -> None:
        logger.info("[BoxDetector] Stopping processing")
        if self._forwarder and self._frame_handler:
            await self._forwarder.remove_frame_handler(self._frame_handler)
            self._frame_handler = None

    async def close(self) -> None:
        logger.info("[BoxDetector] Closing")
        self._hand_tracker.close()
        self._output_track.stop()

    def _on_frame(self, frame: av.VideoFrame) -> None:
        try:
            if self._claude_frame_callback:
                self._claude_frame_callback(frame)

            img = frame.to_ndarray(format="bgr24")
            annotated = self._detect_and_annotate(img)

            out_frame = av.VideoFrame.from_ndarray(annotated, format="bgr24")
            out_frame.pts = frame.pts
            out_frame.time_base = frame.time_base

            self._output_track.push_frame(out_frame)
        except Exception as e:
            logger.error(f"[BoxDetector] Frame processing error: {e}")

    def _detect_cardboard(self, hsv: np.ndarray) -> np.ndarray:
        """Create a combined mask for cardboard-colored regions."""
        combined_mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
        for lower, upper in self._cardboard_ranges:
            mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
            combined_mask = cv2.bitwise_or(combined_mask, mask)

        # Clean up with morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel, iterations=1)

        return combined_mask

    def _find_box_contour(self, mask: np.ndarray, frame_area: int):
        """Find the largest rectangular contour from the cardboard mask.

        Returns (contour, bounding_rect, rotated_rect, area) or Nones.
        """
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)

        min_area = frame_area * self._min_box_area_ratio

        for contour in contours[:10]:
            area = cv2.contourArea(contour)
            if area < min_area:
                continue

            # Approximate to polygon
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

            # Box should be roughly rectangular (4-8 sides)
            if len(approx) < 4 or len(approx) > 12:
                continue

            rect = cv2.minAreaRect(contour)
            rect_w, rect_h = rect[1]
            if rect_w == 0 or rect_h == 0:
                continue

            # Rectangularity check
            rectangularity = area / (rect_w * rect_h)
            if rectangularity < 0.5:
                continue

            bbox = cv2.boundingRect(contour)
            return contour, bbox, rect, area

        return None, None, None, 0

    def _detect_flap_edges(self, gray: np.ndarray, box_bbox: tuple, img_h: int) -> list:
        """Detect edges within the box region that might indicate flaps.

        Looks for strong horizontal or vertical edges within the top portion
        of the detected box (where flaps would be visible).
        """
        x, y, w, h = box_bbox
        if w < 20 or h < 20:
            return []

        # Focus on the top 40% of the box (where flaps are visible when looking down)
        # or bottom 40% if the box is upside down
        top_region = gray[y:y + int(h * 0.4), x:x + w]
        if top_region.size == 0:
            return []

        edges = cv2.Canny(top_region, 50, 150)
        # Find long lines using HoughLinesP
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=30,
                                minLineLength=w * 0.2, maxLineGap=10)

        flap_edges = []
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                # Calculate line angle
                angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
                length = np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

                # Horizontal lines (flap fold edges) or vertical lines (flap side edges)
                if angle < 20 or angle > 160:  # ~horizontal
                    flap_edges.append({
                        "type": "horizontal",
                        "start": (x + x1, y + y1),
                        "end": (x + x2, y + y2),
                        "length": length,
                    })
                elif 70 < angle < 110:  # ~vertical
                    flap_edges.append({
                        "type": "vertical",
                        "start": (x + x1, y + y1),
                        "end": (x + x2, y + y2),
                        "length": length,
                    })

        return flap_edges

    def _detect_tape(self, hsv: np.ndarray, img: np.ndarray, box_bbox: tuple) -> list:
        """Detect tape strips on the box using color contrast.

        Tape appears as dark strips or shiny strips against brown cardboard.
        """
        if box_bbox is None:
            return []

        x, y, w, h = box_bbox
        # Focus on the box region
        box_hsv = hsv[y:y + h, x:x + w]
        box_img = img[y:y + h, x:x + w]
        if box_hsv.size == 0:
            return []

        tape_strips = []

        # Detect dark tape
        dark_mask = cv2.inRange(box_hsv, np.array(self._tape_dark_range[0]),
                                np.array(self._tape_dark_range[1]))

        # Also detect by looking for high-saturation or very dark regions
        # within the box area (tape has different appearance than cardboard)
        gray_box = cv2.cvtColor(box_img, cv2.COLOR_BGR2GRAY)

        # Adaptive threshold to find tape (darker than cardboard)
        _, dark_thresh = cv2.threshold(gray_box, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Combine dark tape mask with threshold
        combined = cv2.bitwise_or(dark_mask, dark_thresh)

        # Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 15))
        combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)

        # Find contours of tape strips
        contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < (w * h * 0.01):  # Tape must be at least 1% of box area
                continue

            rect = cv2.minAreaRect(contour)
            rect_w, rect_h = rect[1]
            if rect_w == 0 or rect_h == 0:
                continue

            # Tape is long and thin (aspect ratio > 3)
            aspect = max(rect_w, rect_h) / max(min(rect_w, rect_h), 1)
            if aspect < 2.5:
                continue

            # Determine tape orientation
            angle = rect[2]
            box_pts = cv2.boxPoints(rect).astype(np.int32)

            # Offset back to full image coordinates
            box_pts[:, 0] += x
            box_pts[:, 1] += y
            center = (int(rect[0][0]) + x, int(rect[0][1]) + y)

            # Is the tape horizontal or vertical?
            if rect_w > rect_h:
                tape_angle = rect[2]
            else:
                tape_angle = rect[2] + 90

            is_horizontal = abs(tape_angle) < 30 or abs(tape_angle) > 150
            tape_type = "CENTER_SEAM" if is_horizontal else "H_CROSS"

            tape_strips.append({
                "type": tape_type,
                "center": center,
                "points": box_pts,
                "aspect": aspect,
                "area": area,
            })

        return tape_strips

    def _classify_box_state(self, box_contour, box_bbox, box_area, frame_area,
                            flap_edges, tape_strips) -> str:
        """Classify the current state of the box based on visual features."""
        if box_contour is None:
            return "NO BOX"

        area_ratio = box_area / frame_area

        # Very flat/thin shape = box is still flat
        x, y, w, h = box_bbox
        aspect = max(w, h) / max(min(w, h), 1)

        if aspect > 4:
            return "BOX FLAT"

        if len(tape_strips) > 0:
            # Check for H-tape pattern
            center_seams = [t for t in tape_strips if t["type"] == "CENTER_SEAM"]
            h_crosses = [t for t in tape_strips if t["type"] == "H_CROSS"]
            if center_seams and len(h_crosses) >= 2:
                return "H-TAPE COMPLETE"
            elif center_seams:
                return "CENTER TAPE APPLIED"
            return "TAPE DETECTED"

        if len(flap_edges) > 2:
            return "FLAPS VISIBLE"

        if area_ratio > 0.15:
            return "BOX OPEN"

        return "BOX DETECTED"

    def _detect_and_annotate(self, img: np.ndarray) -> np.ndarray:
        """Detect box, flaps, tape and draw annotations on the frame."""
        h, w = img.shape[:2]
        frame_area = h * w

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        annotated = img.copy()

        # Step 1: Detect cardboard region
        cardboard_mask = self._detect_cardboard(hsv)
        box_contour, box_bbox, box_rect, box_area = self._find_box_contour(
            cardboard_mask, frame_area
        )

        if box_contour is not None and box_bbox is not None:
            bx, by, bw, bh = box_bbox

            # Draw box contour
            cv2.drawContours(annotated, [box_contour], 0, (255, 255, 0), 3)

            # Draw bounding box
            cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), (0, 255, 255), 2)

            # Step 2: Detect flap edges
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            flap_edges = self._detect_flap_edges(gray, box_bbox, h)

            # Draw flap edge indicators
            for edge in flap_edges:
                color = (0, 165, 255) if edge["type"] == "horizontal" else (255, 0, 255)
                cv2.line(annotated, edge["start"], edge["end"], color, 3)

            # Step 3: Detect tape
            tape_strips = self._detect_tape(hsv, img, box_bbox)

            # Draw tape indicators
            for tape in tape_strips:
                cv2.drawContours(annotated, [tape["points"]], 0, (0, 0, 255), 3)
                label = tape["type"].replace("_", " ")
                cv2.putText(annotated, label, tape["center"],
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

            # Step 4: Classify box state
            box_state = self._classify_box_state(
                box_contour, box_bbox, box_area, frame_area, flap_edges, tape_strips
            )

            # Draw box dimensions
            area_pct = box_area / frame_area * 100
            dim_label = f"{bw}x{bh}px ({area_pct:.0f}%)"
            cv2.putText(annotated, dim_label, (bx, by - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)

            # Draw box aspect ratio (helps identify flap sizes)
            aspect_label = f"Aspect: {max(bw, bh) / max(min(bw, bh), 1):.1f}"
            cv2.putText(annotated, aspect_label, (bx, by + bh + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

            # Draw state label at top
            self._draw_state_label(annotated, box_state, w)

            # Draw flap count
            h_edges = len([e for e in flap_edges if e["type"] == "horizontal"])
            v_edges = len([e for e in flap_edges if e["type"] == "vertical"])
            if h_edges > 0 or v_edges > 0:
                flap_label = f"Edges: {h_edges}H {v_edges}V"
                cv2.putText(annotated, flap_label, (bx + bw + 10, by + 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)

            # Draw tape count
            if tape_strips:
                tape_label = f"Tape: {len(tape_strips)} strip(s)"
                cv2.putText(annotated, tape_label, (bx + bw + 10, by + 45),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

            detail_str = (
                f"{box_state} | "
                f"area={area_pct:.1f}% | "
                f"edges={h_edges}H+{v_edges}V | "
                f"tape={len(tape_strips)}"
            )
            print(f"[BoxDetector] {detail_str}")

            # Send debug event to frontend (throttled to every 3s)
            import time as _t
            now = _t.time()
            if self._debug_event_callback and now - self._last_debug_time > 3.0:
                self._last_debug_time = now
                self._debug_event_callback({
                    "type": "debug_cv_detection",
                    "state": box_state,
                    "detail": f"Box {bw}x{bh}px ({area_pct:.0f}%) | Edges: {h_edges}H {v_edges}V | Tape: {len(tape_strips)} strips",
                })
        else:
            self._draw_state_label(annotated, "NO BOX DETECTED", w)

        # Draw explicit status panel at bottom of frame for Gemini to READ
        self._draw_status_panel(annotated, box_contour is not None, box_bbox,
                                flap_edges if box_contour is not None else [],
                                tape_strips if box_contour is not None else [],
                                h, w)

        # Hand tracking annotations
        self._hand_tracker.annotate(annotated)

        return annotated

    def _draw_status_panel(self, img: np.ndarray, box_found: bool, box_bbox,
                           flap_edges: list, tape_strips: list,
                           frame_h: int, frame_w: int):
        """Draw an explicit text status panel at the bottom of the frame.

        Gemini reads text much better than it interprets spatial relationships.
        This panel spells out exactly what the CV system detected so Gemini
        can reason about text rather than pixels.
        """
        panel_h = 80
        y_start = frame_h - panel_h

        # Semi-transparent dark background
        overlay = img.copy()
        cv2.rectangle(overlay, (0, y_start), (frame_w, frame_h), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, img, 0.3, 0, img)

        font = cv2.FONT_HERSHEY_SIMPLEX
        color = (255, 255, 255)
        y = y_start + 20

        if not box_found:
            cv2.putText(img, "CV STATUS: NO BOX DETECTED IN FRAME", (10, y),
                        font, 0.6, (0, 0, 255), 2)
            return

        # Box info
        bx, by, bw, bh = box_bbox
        cv2.putText(img, f"CV STATUS: BOX DETECTED ({bw}x{bh}px)", (10, y),
                    font, 0.55, (0, 255, 255), 2)

        # Flap status
        y += 22
        h_edges = len([e for e in flap_edges if e["type"] == "horizontal"])
        v_edges = len([e for e in flap_edges if e["type"] == "vertical"])
        if h_edges == 0 and v_edges == 0:
            flap_text = "FLAPS: NO FOLD EDGES DETECTED - FLAPS MAY BE ALL UP OR NOT VISIBLE"
        elif h_edges > 0:
            flap_text = f"FLAPS: {h_edges} HORIZONTAL EDGES (possible fold lines)"
        else:
            flap_text = f"FLAPS: {v_edges} VERTICAL EDGES detected"
        cv2.putText(img, flap_text, (10, y), font, 0.45, color, 1)

        # Tape status
        y += 20
        if not tape_strips:
            tape_text = "TAPE: NONE DETECTED ON BOX"
        else:
            center_count = len([t for t in tape_strips if t["type"] == "CENTER_SEAM"])
            cross_count = len([t for t in tape_strips if t["type"] == "H_CROSS"])
            tape_text = f"TAPE: {len(tape_strips)} strip(s) - {center_count} center, {cross_count} cross"
        cv2.putText(img, tape_text, (10, y), font, 0.45, color, 1)

    def _draw_state_label(self, img: np.ndarray, state: str, frame_width: int):
        """Draw the box state label at the top center of the frame."""
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 1.3
        thickness = 3
        (tw, th), baseline = cv2.getTextSize(state, font, font_scale, thickness)
        label_x = (frame_width - tw) // 2
        label_y = 50

        # Color based on state
        state_colors = {
            "NO BOX DETECTED": (0, 0, 180),
            "BOX FLAT": (0, 100, 200),
            "BOX DETECTED": (180, 140, 0),
            "BOX OPEN": (0, 180, 0),
            "FLAPS VISIBLE": (0, 200, 100),
            "TAPE DETECTED": (0, 0, 255),
            "CENTER TAPE APPLIED": (0, 100, 255),
            "H-TAPE COMPLETE": (0, 200, 0),
        }
        bg_color = state_colors.get(state, (100, 100, 100))

        cv2.rectangle(
            img,
            (label_x - 10, label_y - th - 10),
            (label_x + tw + 10, label_y + baseline + 10),
            bg_color, -1,
        )
        cv2.putText(img, state, (label_x, label_y), font, font_scale, (255, 255, 255), thickness)
