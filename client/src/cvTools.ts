/**
 * CV Tool catalog — all computer vision components available in the GuideSight platform.
 *
 * Each tool represents a CV "glasses" layer that processes raw video frames
 * and draws annotations for Gemini to reason about. Tasks declare which tools
 * are useful via the `cv_tools` array in their JSON definition.
 */

export interface CvTool {
  id: string;
  name: string;
  shortName: string;
  description: string;
  /** SVG path data for the icon (24x24 viewBox) */
  iconPath: string;
  /** Accent color for the badge */
  color: string;
  /** Status: implemented, planned, or research */
  status: 'implemented' | 'planned' | 'research';
}

export const CV_TOOLS: CvTool[] = [
  {
    id: 'hand_tracking',
    name: 'Hand Tracking',
    shortName: 'Hands',
    description: '21-landmark hand skeleton, handedness, pinch/grip detection via MediaPipe',
    // hand icon
    iconPath: 'M18 9V4a1 1 0 0 0-2 0v5m0 0V3a1 1 0 0 0-2 0v6m0 0V4a1 1 0 0 0-2 0v6m0 0V6a1 1 0 0 0-2 0v8l-1.8-2.4a1.2 1.2 0 0 0-2 1.2L9 17c1 2 3 4 6 4h1a5 5 0 0 0 5-5v-5a1 1 0 0 0-2 0',
    color: '#4ade80',
    status: 'implemented',
  },
  {
    id: 'paper_detection',
    name: 'Paper Detection',
    shortName: 'Paper',
    description: 'Contour detection, orientation (portrait/landscape), fold lines, center line via OpenCV',
    // document/paper icon
    iconPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-2 1.5L19.5 9H14a1 1 0 0 1-1-1V3.5zM7 13h10M7 17h7',
    color: '#60a5fa',
    status: 'implemented',
  },
  {
    id: 'object_detection',
    name: 'Object Detection',
    shortName: 'Objects',
    description: 'Zero-shot component identification (LED, resistor, tools) via YOLO-World',
    // bounding box / target icon
    iconPath: 'M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2m6-5a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
    color: '#f97316',
    status: 'planned',
  },
  {
    id: 'pose_estimation',
    name: 'Pose Estimation',
    shortName: 'Pose',
    description: 'Full-body skeleton tracking for posture, ergonomics, and body positioning via MediaPipe',
    // body/person standing icon
    iconPath: 'M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a1 1 0 0 0-1 1v4l-3 4a1 1 0 1 0 1.6 1.2L12 15l2.4 3.2a1 1 0 1 0 1.6-1.2l-3-4V9a1 1 0 0 0-1-1zm-4 1h8',
    color: '#a78bfa',
    status: 'planned',
  },
  {
    id: 'color_segmentation',
    name: 'Color Segmentation',
    shortName: 'Color',
    description: 'HSV color isolation for wire colors, component colors, material states via OpenCV',
    // palette / color drops icon
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10a2 2 0 0 0 2-2c0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2a2 2 0 0 1 2-2h2.4c3.1 0 5.6-2.5 5.6-5.6C22 5.8 17.5 2 12 2zM6.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
    color: '#f472b6',
    status: 'planned',
  },
  {
    id: 'depth_estimation',
    name: 'Depth Estimation',
    shortName: 'Depth',
    description: 'Monocular depth from a single webcam — detect lifts, layers, 3D workspace via Depth Anything V2',
    // layers / depth icon
    iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    color: '#22d3ee',
    status: 'research',
  },
  {
    id: 'edge_detection',
    name: 'Edge Detection',
    shortName: 'Edges',
    description: 'Canny edge detection for fold lines, alignment verification, seam detection via OpenCV',
    // zigzag/edge line icon
    iconPath: 'M3 17l4-4 4 4 4-8 4 4 2-2M3 7h18',
    color: '#fbbf24',
    status: 'planned',
  },
  {
    id: 'aruco_markers',
    name: 'ArUco Markers',
    shortName: 'ArUco',
    description: 'Fiducial marker detection for precise spatial coordinate systems via OpenCV',
    // grid/QR icon
    iconPath: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm14 3a3 3 0 1 0 0 .01',
    color: '#94a3b8',
    status: 'planned',
  },
  {
    id: 'optical_flow',
    name: 'Optical Flow',
    shortName: 'Flow',
    description: 'Motion direction tracking — fold direction arrows, movement speed via OpenCV',
    // arrows flowing icon
    iconPath: 'M5 12h14m-4-4l4 4-4 4M5 5h8m-3-2l3 2-3 2M5 19h8m-3-2l3 2-3 2',
    color: '#e879f9',
    status: 'research',
  },
  {
    id: 'clip_verification',
    name: 'CLIP Verification',
    shortName: 'CLIP',
    description: 'Natural language step verification — compare frame to text description of expected state',
    // check/verify with eye icon
    iconPath: 'M9 12l2 2 4-4m-3-6C6.48 4 2 8.5 2 12s4.48 8 10 8 10-4.5 10-8-4.48-8-10-8z',
    color: '#34d399',
    status: 'research',
  },
  {
    id: 'face_detection',
    name: 'Face Detection',
    shortName: 'Face',
    description: 'Face landmarks and safety gear verification (goggles, masks) via MediaPipe',
    // face/smile icon
    iconPath: 'M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10zm-3-11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-8 4s1.5 3 5 3 5-3 5-3',
    color: '#fb923c',
    status: 'planned',
  },
  {
    id: 'point_tracking',
    name: 'Point Tracking',
    shortName: 'Track',
    description: 'Dense pixel tracking across frames — track paper edges, component movement via CoTracker',
    // crosshair/tracking icon
    iconPath: 'M12 2v4m0 12v4M2 12h4m12 0h4m-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    color: '#c084fc',
    status: 'research',
  },
];

/** Lookup a CV tool by id */
export function getCvTool(id: string): CvTool | undefined {
  return CV_TOOLS.find((t) => t.id === id);
}

/** Get multiple tools by ids, preserving order */
export function getCvTools(ids: string[]): CvTool[] {
  return ids.map(getCvTool).filter((t): t is CvTool => t !== undefined);
}

/** Suggested tools for each legacy cv_processor value */
export const PROCESSOR_TO_TOOLS: Record<string, string[]> = {
  paper_detection: ['paper_detection', 'hand_tracking', 'edge_detection'],
  component_detection: ['object_detection', 'hand_tracking', 'color_segmentation'],
  hand_tracking: ['hand_tracking', 'pose_estimation'],
  general_vision: ['hand_tracking'],
};
