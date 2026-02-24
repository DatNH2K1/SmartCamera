import { SkeletonData, Point } from '../types';

// ─── Joint Dictionary ─────────────────────────────────────────────────────────
// Map joint names → keypoint pairs (keypoint1 → keypoint2 direction)
// Mirrors jointsDictionary from posen-frontend-develop/src/utils/skeleton.js
const JOINT_DICT: Record<string, { kp1: string; kp2: string }> = {
  leftBiceps: { kp1: 'leftShoulder', kp2: 'leftElbow' },
  rightBiceps: { kp1: 'rightShoulder', kp2: 'rightElbow' },
  leftForarm: { kp1: 'leftElbow', kp2: 'leftWrist' },
  rightForarm: { kp1: 'rightElbow', kp2: 'rightWrist' },
  leftThigh: { kp1: 'leftHip', kp2: 'leftKnee' },
  rightThigh: { kp1: 'rightHip', kp2: 'rightKnee' },
  leftTibia: { kp1: 'leftKnee', kp2: 'leftAnkle' },
  rightTibia: { kp1: 'rightKnee', kp2: 'rightAnkle' },
  leftChest: { kp1: 'leftShoulder', kp2: 'leftHip' },
  rightChest: { kp1: 'rightShoulder', kp2: 'rightHip' },
  leftLeg: { kp1: 'leftHip', kp2: 'leftAnkle' },
  rightLeg: { kp1: 'rightHip', kp2: 'rightAnkle' },
  // Computed joints using manubrium = midpoint(leftShoulder, rightShoulder)
  leftNeck: { kp1: 'manubrium', kp2: 'leftEar' },
  rightNeck: { kp1: 'manubrium', kp2: 'rightEar' },
  neck: { kp1: 'manubrium', kp2: 'nose' },
};

// ─── Composed Points ──────────────────────────────────────────────────────────
// Compute virtual keypoints like manubrium, pubis
export function buildEnrichedSkeleton(skeleton: SkeletonData): Record<string, Point> {
  const s: Record<string, Point> = { ...(skeleton as Record<string, Point>) };

  // manubrium = midpoint of leftShoulder + rightShoulder
  if (skeleton.leftShoulder && skeleton.rightShoulder) {
    s['manubrium'] = {
      x: (skeleton.leftShoulder.x + skeleton.rightShoulder.x) / 2,
      y: (skeleton.leftShoulder.y + skeleton.rightShoulder.y) / 2,
    };
  }
  // pubis = midpoint of leftHip + rightHip
  if (skeleton.leftHip && skeleton.rightHip) {
    s['pubis'] = {
      x: (skeleton.leftHip.x + skeleton.rightHip.x) / 2,
      y: (skeleton.leftHip.y + skeleton.rightHip.y) / 2,
    };
  }
  return s;
}

// ─── Vector ───────────────────────────────────────────────────────────────────
type Vec2 = [number, number];

/** Resolve a joint name OR axis to a [dx, dy] direction vector. */
function resolveVector(jointName: string, kps: Record<string, Point>): Vec2 | null {
  switch (jointName) {
    case 'vertical':
      return [0, 1];
    case '-vertical':
      return [0, -1];
    case 'horizontal':
      return [1, 0];
    case '-horizontal':
      return [-1, 0];
  }

  // Handle negated joint names like '-leftBiceps'
  let invert = false;
  let name = jointName;
  if (jointName.startsWith('-')) {
    invert = true;
    name = jointName.slice(1);
  }

  const def = JOINT_DICT[name];
  if (!def) return null;

  const p1 = kps[def.kp1];
  const p2 = kps[def.kp2];
  if (!p1 || !p2) return null;

  return invert ? [p1.x - p2.x, p1.y - p2.y] : [p2.x - p1.x, p2.y - p1.y];
}

// ─── Core Angle Calculation ───────────────────────────────────────────────────
/** Angle between vec1→vec2 using signed atan2, returns 0-360°. */
export function computeAngleVector(vec1: Vec2, vec2: Vec2): number {
  const ang =
    Math.atan2(vec1[0] * vec2[1] - vec1[1] * vec2[0], vec1[0] * vec2[0] + vec1[1] * vec2[1]) *
    (180 / Math.PI);
  return ang < 0 ? 360 + ang : ang;
}

/**
 * Mirrors computeAngle() from posen-frontend-develop.
 * AngleDef: { center, joint1, joint2, min, max }
 * Returns angle in degrees, or null if keypoints missing.
 */
export interface AngleDef {
  center: string;
  joint1: string;
  joint2: string;
  min: number;
  max: number;
}

export function computeAngle(kps: Record<string, Point>, def: AngleDef): number | null {
  const v1 = resolveVector(def.joint1, kps);
  const v2 = resolveVector(def.joint2, kps);
  if (!v1 || !v2) return null;
  // note: source does computeAngleVector(v2, v1)
  return computeAngleVector(v2, v1);
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
/**
 * Exact port of getLinearScore() from posen-frontend-develop/src/utils/result.js
 * Handles both ascending (min < max) and descending (min > max) ranges.
 */
export function getLinearScore(value: number | null, min: number, max: number): number {
  if (value === null) return 0;
  const descending = min > max;
  if (descending) {
    if (value <= max) return 100;
    if (value >= min) return 0;
    return Math.round(((value - min) / (max - min)) * 100);
  }
  // ascending
  if (value <= 0) return 0;
  if (value >= max) return 100;
  return Math.round((value * 100) / max);
}

/** Average of non-negative scores. */
export function getAverageScore(scores: number[]): number {
  const valid = scores.filter((s) => s >= 0);
  if (!valid.length) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

/** A → J rank table matching posen-frontend. */
export function fetchRank(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 50) return 'E';
  if (score >= 40) return 'F';
  if (score >= 30) return 'G';
  if (score >= 20) return 'H';
  if (score >= 10) return 'I';
  return 'J';
}
