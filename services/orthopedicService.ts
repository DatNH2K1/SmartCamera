/**
 * orthopedicService.ts
 *
 * LOGIC PORT from posen-frontend-develop.
 * Each pose has its own AngleDef (center, joint1, joint2, min, max)
 * that is taken DIRECTLY from the source config files.
 *
 * Shoulder  → config/shoulder.js  (angles section)
 * Neck      → config/neck.js      (angles section)
 * Wrist     → config/wrist.js     (angles section — requires hand keypoints, so placeholder)
 */

import { OrthopedicTest, HealthReport, Translator, AIAnalysisResult } from '../types';
import {
  buildEnrichedSkeleton,
  computeAngle,
  getLinearScore,
  getAverageScore,
  AngleDef,
} from '../utils/mathUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Score a single pose with one AngleDef. Returns -1 if keypoints missing. */
function scorePose(
  dataMap: Record<string, AIAnalysisResult>,
  poseId: string,
  angleDef: AngleDef
): { score: number; angleStr: string } {
  const raw = dataMap[poseId];
  if (!raw) return { score: -1, angleStr: '--' };
  const kps = buildEnrichedSkeleton(raw.skeleton);
  const angle = computeAngle(kps, angleDef);
  if (angle === null) return { score: -1, angleStr: '--' };
  const score = getLinearScore(angle, angleDef.min, angleDef.max);
  return { score, angleStr: `${angle.toFixed(1)}° / ${angleDef.max}°` };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export const getOrthopedicTests = (t: Translator): OrthopedicTest[] => [
  // ── SHOULDER MOBILITY ─────────────────────────────────────────────────────
  // Source: config/shoulder.js  →  shoulderConfig.angles
  {
    id: 'shoulder_mobility',
    name: t('test.shoulder.name'),
    category: 'Shoulder',
    description: t('test.shoulder.desc'),
    poses: [
      {
        id: 'frontShoulder',
        name: t('pose.shoulder.front'),
        instruction: t('instr.shoulder.front'),
        requiredView: 'Front',
      },
      {
        id: 'leftShoulder',
        name: t('pose.shoulder.left_forward'),
        instruction: t('instr.shoulder.left_forward'),
        requiredView: 'Left',
      },
      {
        id: 'rightShoulder',
        name: t('pose.shoulder.right_forward'),
        instruction: t('instr.shoulder.right_forward'),
        requiredView: 'Right',
      },
      {
        id: 'leftShoulderBackward',
        name: t('pose.shoulder.left_backward'),
        instruction: t('instr.shoulder.left_backward'),
        requiredView: 'Left',
      },
      {
        id: 'rightShoulderBackward',
        name: t('pose.shoulder.right_backward'),
        instruction: t('instr.shoulder.right_backward'),
        requiredView: 'Right',
      },
    ],
    analyze: (dataMap, t): HealthReport | null => {
      const scores: number[] = [];
      const details: string[] = [];

      // frontShoulder: 2 angles averaged (left + right abduction)
      // Source: scoringFrontShoulder → (scoreLeft + scoreRight) / 2
      const FRONT_LEFT: AngleDef = {
        center: 'leftShoulder',
        joint2: 'leftBiceps',
        joint1: 'vertical',
        min: 0,
        max: 180,
      };
      const FRONT_RIGHT: AngleDef = {
        center: 'rightShoulder',
        joint1: 'rightBiceps',
        joint2: 'vertical',
        min: 0,
        max: 180,
      };
      {
        const raw = dataMap['frontShoulder'];
        if (raw) {
          const kps = buildEnrichedSkeleton(raw.skeleton);
          const aLeft = computeAngle(kps, FRONT_LEFT);
          const aRight = computeAngle(kps, FRONT_RIGHT);
          const sLeft = aLeft !== null ? getLinearScore(aLeft, FRONT_LEFT.min, FRONT_LEFT.max) : -1;
          const sRight =
            aRight !== null ? getLinearScore(aRight, FRONT_RIGHT.min, FRONT_RIGHT.max) : -1;
          const avg = getAverageScore([sLeft, sRight]);
          if (avg >= 0) scores.push(avg);
          details.push(
            `${t('pose.shoulder.front')}: L=${aLeft?.toFixed(1) ?? '--'}° R=${aRight?.toFixed(1) ?? '--'}° (max 180°)`
          );
        }
      }

      // leftShoulder forward flexion
      // joint1: leftBiceps, joint2: vertical
      const LEFT_FWD: AngleDef = {
        center: 'leftShoulder',
        joint1: 'leftBiceps',
        joint2: 'vertical',
        min: 0,
        max: 180,
      };
      {
        const { score, angleStr } = scorePose(dataMap, 'leftShoulder', LEFT_FWD);
        if (score >= 0) scores.push(score);
        details.push(`${t('pose.shoulder.left_forward')}: ${angleStr}`);
      }

      // rightShoulder forward flexion
      // joint2: rightBiceps, joint1: vertical
      const RIGHT_FWD: AngleDef = {
        center: 'rightShoulder',
        joint2: 'rightBiceps',
        joint1: 'vertical',
        min: 0,
        max: 180,
      };
      {
        const { score, angleStr } = scorePose(dataMap, 'rightShoulder', RIGHT_FWD);
        if (score >= 0) scores.push(score);
        details.push(`${t('pose.shoulder.right_forward')}: ${angleStr}`);
      }

      // leftShoulderBackward extension (max 50°)
      const LEFT_BWD: AngleDef = {
        center: 'leftShoulder',
        joint2: 'leftBiceps',
        joint1: 'vertical',
        min: 0,
        max: 50,
      };
      {
        const { score, angleStr } = scorePose(dataMap, 'leftShoulderBackward', LEFT_BWD);
        if (score >= 0) scores.push(score);
        details.push(`${t('pose.shoulder.left_backward')}: ${angleStr}`);
      }

      // rightShoulderBackward extension (max 50°)
      const RIGHT_BWD: AngleDef = {
        center: 'rightShoulder',
        joint1: 'rightBiceps',
        joint2: 'vertical',
        min: 0,
        max: 50,
      };
      {
        const { score, angleStr } = scorePose(dataMap, 'rightShoulderBackward', RIGHT_BWD);
        if (score >= 0) scores.push(score);
        details.push(`${t('pose.shoulder.right_backward')}: ${angleStr}`);
      }

      const totalScore = getAverageScore(scores);
      return {
        score: totalScore,
        title: totalScore > 80 ? t('diag.shoulder.good') : t('diag.shoulder.restricted'),
        description: totalScore > 80 ? t('desc.shoulder.good') : t('desc.shoulder.restricted'),
        details,
        warnings: [],
      };
    },
  },

  // ── NECK MOBILITY ─────────────────────────────────────────────────────────
  // Source: config/neck.js  →  neckConfig.angles
  {
    id: 'neck_mobility',
    name: t('test.neck.name'),
    category: 'Neck',
    description: t('test.neck.desc'),
    poses: [
      {
        id: 'neckRightSideBend',
        name: t('pose.neck.right_side_bend'),
        instruction: t('instr.neck.right_side_bend'),
        requiredView: 'Front',
      },
      {
        id: 'neckLeftSideBend',
        name: t('pose.neck.left_side_bend'),
        instruction: t('instr.neck.left_side_bend'),
        requiredView: 'Front',
      },
      {
        id: 'neckFrontBend',
        name: t('pose.neck.front_bend'),
        instruction: t('instr.neck.front_bend'),
        requiredView: 'Right',
      },
      {
        id: 'neckBackBend',
        name: t('pose.neck.back_bend'),
        instruction: t('instr.neck.back_bend'),
        requiredView: 'Right',
      },
    ],
    analyze: (dataMap, t): HealthReport | null => {
      const scores: number[] = [];
      const details: string[] = [];

      // neckRightSideBend: joint1=-vertical, joint2=neck, min=0, max=50
      const NECK_RIGHT_SIDE: AngleDef = {
        center: 'manubrium',
        joint1: '-vertical',
        joint2: 'neck',
        min: 0,
        max: 50,
      };
      {
        const { score, angleStr } = scorePose(dataMap, 'neckRightSideBend', NECK_RIGHT_SIDE);
        if (score >= 0) scores.push(score);
        details.push(`${t('pose.neck.right_side_bend')}: ${angleStr}`);
      }

      // neckLeftSideBend: joint2=-vertical, joint1=neck, min=0, max=50
      const NECK_LEFT_SIDE: AngleDef = {
        center: 'manubrium',
        joint2: '-vertical',
        joint1: 'neck',
        min: 0,
        max: 50,
      };
      {
        const { score, angleStr } = scorePose(dataMap, 'neckLeftSideBend', NECK_LEFT_SIDE);
        if (score >= 0) scores.push(score);
        details.push(`${t('pose.neck.left_side_bend')}: ${angleStr}`);
      }

      // neckFrontBend: joint1=rightNeck, joint2=-vertical, min=0, max=60
      const NECK_FRONT: AngleDef = {
        center: 'manubrium',
        joint1: 'rightNeck',
        joint2: '-vertical',
        min: 0,
        max: 60,
      };
      {
        const { score, angleStr } = scorePose(dataMap, 'neckFrontBend', NECK_FRONT);
        if (score >= 0) scores.push(score);
        details.push(`${t('pose.neck.front_bend')}: ${angleStr}`);
      }

      // neckBackBend: joint1=-vertical, joint2=rightNeck, min=-30, max=50
      const NECK_BACK: AngleDef = {
        center: 'manubrium',
        joint1: '-vertical',
        joint2: 'rightNeck',
        min: -30,
        max: 50,
      };
      {
        const { score, angleStr } = scorePose(dataMap, 'neckBackBend', NECK_BACK);
        if (score >= 0) scores.push(score);
        details.push(`${t('pose.neck.back_bend')}: ${angleStr}`);
      }

      const totalScore = getAverageScore(scores);
      return {
        score: totalScore,
        title: t('diag.neck.good'),
        description: t('desc.neck.good'),
        details,
        warnings: [],
      };
    },
  },

  // ── WRIST MOBILITY ────────────────────────────────────────────────────────
  // Source: config/wrist.js  →  wristConfig.angles
  // NOTE: Wrist uses HAND keypoints (leftMiddleFingerMeta, leftHandWrist, etc.)
  // which are NOT available in PoseNet. This test requires a hand-tracking model
  // (MediaPipe Hands). Flagging as unavailable until model is upgraded.
  {
    id: 'wrist_mobility',
    name: t('test.wrist.name'),
    category: 'Wrist',
    description: t('test.wrist.desc'),
    poses: [
      {
        id: 'leftWristRadial',
        name: t('pose.wrist.left_radial'),
        instruction: t('instr.wrist.left_radial'),
        requiredView: 'Front',
      },
      {
        id: 'rightWristRadial',
        name: t('pose.wrist.right_radial'),
        instruction: t('instr.wrist.right_radial'),
        requiredView: 'Front',
      },
    ],
    analyze: (_dataMap, t): HealthReport | null => {
      // Wrist deviation requires hand keypoints (leftHandWrist, leftMiddleFingerMeta, etc.)
      // which are not available in the current PoseNet model.
      // Returning a placeholder until MediaPipe Hands is integrated.
      return {
        score: -1,
        title: t('diag.wrist.unavailable'),
        description: t('desc.wrist.unavailable'),
        details: [t('detail.wrist.needs_hand_model')],
        warnings: [],
      };
    },
  },

  // ── POSTURE ANALYSIS ──────────────────────────────────────────────────────
  // Source: config/basic.js  →  basicConfig
  {
    id: 'posture_analysis',
    name: t('test.posture.name'),
    category: 'Posture',
    description: t('test.posture.desc'),
    poses: [
      {
        id: 'front',
        name: t('pose.posture.front'),
        instruction: t('instr.posture.front'),
        requiredView: 'Front',
      },
      {
        id: 'side',
        name: t('pose.posture.side'),
        instruction: t('instr.posture.side'),
        requiredView: 'Left',
      },
    ],
    analyze: (dataMap, t, patientHeight = 170): HealthReport | null => {
      const scores: number[] = [];
      const details: string[] = [];

      // ── Front: Shoulder tilt
      // Source: scoringShouldersFront → angle(leftShouldher–shoulders axis vs horizontal), linear(20→0)
      {
        const raw = dataMap['front'];
        if (raw) {
          const kps = buildEnrichedSkeleton(raw.skeleton);
          // shoulders joint: leftShoulder→rightShoulder
          const SHOULDER_TILT: AngleDef = {
            center: 'leftShoulder',
            joint2: 'horizontal',
            joint1: '-shoulders',
            min: 20,
            max: 0,
          };
          // 'shoulders' is not in JOINT_DICT yet → compute manually
          const lS = kps['leftShoulder'];
          const rS = kps['rightShoulder'];
          if (lS && rS) {
            // Vector leftShoulder→rightShoulder
            const dx = rS.x - lS.x;
            const dy = rS.y - lS.y;
            // Angle vs horizontal [1,0]
            const ang = Math.atan2(dy, dx) * (180 / Math.PI);
            const absAng = Math.abs(ang);
            scores.push(getLinearScore(absAng, SHOULDER_TILT.min, SHOULDER_TILT.max));
            const dir = dy > 0 ? t('direction.right') : t('direction.left');
            details.push(`${t('detail.posture.shoulder_tilt', absAng.toFixed(1), dir)}`);
          }

          // Hip tilt
          const lH = kps['leftHip'];
          const rH = kps['rightHip'];
          if (lH && rH) {
            const dx = rH.x - lH.x;
            const dy = rH.y - lH.y;
            const absAng = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
            scores.push(getLinearScore(absAng, 20, 0));
            const dir = dy > 0 ? t('direction.right') : t('direction.left');
            details.push(`${t('detail.posture.hip_tilt', absAng.toFixed(1), dir)}`);
          }
        }
      }

      // ── Side: Ear → Ankle horizontal shift (cm)
      // Source: scoringShoulderLeftSide → shiftXCm, linear(20→0)
      {
        const raw = dataMap['side'];
        if (raw) {
          const kps = buildEnrichedSkeleton(raw.skeleton);
          const ankle = kps['leftAnkle'];
          const ear = kps['leftEar'];
          if (ankle && ear) {
            // In normalized 0-1 coords, we approximate cm using patientHeight
            // rough torso fraction ≈ 0.45 of body height
            const nose = kps['nose'];
            const ankleY = kps['leftAnkle']?.y ?? 0;
            const noseY = nose?.y ?? 0;
            const bodyFraction = Math.abs(noseY - ankleY) || 0.5;
            const cmPerUnit = (patientHeight - 10) / bodyFraction;
            const shiftXCm = Math.abs((ankle.x - ear.x) * cmPerUnit);
            scores.push(getLinearScore(shiftXCm, 13, 0)); // max 13cm before score=0
            const dir = ear.x < ankle.x ? t('direction.front') : t('direction.back');
            details.push(`${t('detail.posture.ear_shift', shiftXCm.toFixed(1), dir)}`);
          }

          const lShoulder = kps['leftShoulder'];
          const lAnkle = kps['leftAnkle'];
          if (lShoulder && lAnkle) {
            const nose = kps['nose'];
            const bodyFraction = Math.abs((nose?.y ?? 0) - (lAnkle?.y ?? 0)) || 0.5;
            const cmPerUnit = (patientHeight - 10) / bodyFraction;
            const shiftXCm = Math.abs((lAnkle.x - lShoulder.x) * cmPerUnit);
            scores.push(getLinearScore(shiftXCm, 8, 0));
            const dir = lShoulder.x < lAnkle.x ? t('direction.front') : t('direction.back');
            details.push(`${t('detail.posture.shoulder_shift', shiftXCm.toFixed(1), dir)}`);
          }
        }
      }

      const totalScore = getAverageScore(scores);
      return {
        score: totalScore,
        title: totalScore > 80 ? t('diag.posture.good') : t('diag.posture.imbalance'),
        description: totalScore > 80 ? t('desc.posture.good') : t('desc.posture.imbalance'),
        details,
        warnings: [],
      };
    },
  },
];
