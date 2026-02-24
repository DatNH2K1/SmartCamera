export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

// Map keypoints for easy access
export interface SkeletonData {
  [key: string]: Point | undefined;
  nose?: Point;
  leftEye?: Point;
  rightEye?: Point;
  leftEar?: Point;
  rightEar?: Point;
  leftShoulder?: Point;
  rightShoulder?: Point;
  leftElbow?: Point;
  rightElbow?: Point;
  leftWrist?: Point;
  rightWrist?: Point;
  leftHip?: Point;
  rightHip?: Point;
  leftKnee?: Point;
  rightKnee?: Point;
  leftAnkle?: Point;
  rightAnkle?: Point;
}

export interface AIAnalysisResult {
  skeleton: SkeletonData;
  faceBox?: BoundingBox;
  confidence: number;
}

export interface GalleryImage {
  id: number;
  src: string;
  timestamp: number;
}

export enum AppState {
  LOADING_MODEL = 'LOADING_MODEL',
  SELECT_TEST = 'SELECT_TEST', // New state for selecting test
  CAMERA = 'CAMERA',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  GALLERY = 'GALLERY',
  ERROR = 'ERROR',
}

// --- EDITOR TYPES ---
export enum EditorTool {
  MOVE = 'MOVE',
  ADD_POINT = 'ADD_POINT',
  CONNECT = 'CONNECT',
  ANGLE = 'ANGLE',
  DELETE = 'DELETE',
}

export interface EditorPoint {
  id: string;
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
}

export interface EditorConnection {
  id: string;
  from: string; // Point ID
  to: string; // Point ID
}

export interface EditorAngle {
  id: string;
  p1: string; // Point ID
  center: string; // Point ID (Vertex)
  p2: string; // Point ID
  // value removed to force recalculation
}

export interface EditorData {
  points: EditorPoint[];
  connections: EditorConnection[];
  angles: EditorAngle[];
}

export interface EditorLayout {
  renderW: number;
  renderH: number;
  offsetX: number;
  offsetY: number;
}

// --- ORTHOPEDIC TYPES ---
export interface HealthWarning {
  level: 'low' | 'medium' | 'high';
  message: string;
  futureRisk: string;
}

export interface HealthReport {
  score: number; // 0 - 100
  title: string;
  description: string; // Diagnosis
  details: string[]; // Specific measurements
  warnings: HealthWarning[];
}

// Translation function type helper
export type Translator = (key: string, ...args: (string | number)[]) => string;

export interface OrthopedicTest {
  id: string;
  name: string;
  category: 'Posture' | 'Legs' | 'Spine' | 'Shoulder';
  description: string;
  instruction: string; // How to pose
  requiredView: 'Front' | 'Side';
  analyze: (data: SkeletonData, t: Translator) => HealthReport | null;
}
