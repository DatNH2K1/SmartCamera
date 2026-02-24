import { OrthopedicTest, SkeletonData, HealthReport, Translator } from '../types';
import {
  calculateAngle,
  calculateHorizontalDeviation,
  calculateVerticalDeviation,
} from '../utils/geometryUtils';

// Function to get tests with localized strings
export const getOrthopedicTests = (t: Translator): OrthopedicTest[] => [
  {
    id: 'shoulder_level',
    name: t('test.shoulder.name'),
    category: 'Shoulder',
    description: t('test.shoulder.desc'),
    instruction: t('test.shoulder.instr'),
    requiredView: 'Front',
    analyze: (data: SkeletonData, t: Translator): HealthReport | null => {
      const left = data.leftShoulder;
      const right = data.rightShoulder;

      if (!left || !right) return null;

      const deviation = calculateHorizontalDeviation(left, right);

      let score = 100;
      let title = t('diag.shoulder.balanced');
      const warnings = [];

      if (deviation > 5) {
        score = Math.max(0, 100 - deviation * 5);
        title = t('diag.shoulder.significant');
        warnings.push({
          level: deviation > 10 ? ('high' as const) : ('medium' as const),
          message: t('diag.shoulder.msg_significant', deviation),
          futureRisk: t('risk.shoulder.chronic'),
        });
      } else if (deviation > 2) {
        score = 90;
        title = t('diag.shoulder.mild');
        warnings.push({
          level: 'low' as const,
          message: t('diag.shoulder.msg_mild', deviation),
          futureRisk: t('risk.shoulder.muscle'),
        });
      }

      return {
        score,
        title,
        description: deviation <= 2 ? t('desc.shoulder.good') : t('desc.shoulder.bad'),
        details: [t('detail.shoulder.angle', deviation)],
        warnings,
      };
    },
  },
  {
    id: 'forward_head',
    name: t('test.head.name'),
    category: 'Posture',
    description: t('test.head.desc'),
    instruction: t('test.head.instr'),
    requiredView: 'Side',
    analyze: (data: SkeletonData, t: Translator): HealthReport | null => {
      // We generally check Left side points first, fall back to Right if confident
      const ear = data.leftEar || data.rightEar;
      const shoulder = data.leftShoulder || data.rightShoulder;

      if (!ear || !shoulder) return null;

      const deviation = calculateVerticalDeviation(ear, shoulder);

      let score = 100;
      let title = t('diag.head.good');
      const warnings = [];

      if (deviation > 25) {
        score = 50;
        title = t('diag.head.severe');
        warnings.push({
          level: 'high' as const,
          message: t('diag.head.msg_severe', deviation),
          futureRisk: t('risk.head.severe'),
        });
      } else if (deviation > 15) {
        score = 75;
        title = t('diag.head.mild');
        warnings.push({
          level: 'medium' as const,
          message: t('diag.head.msg_mild', deviation),
          futureRisk: t('risk.head.mild'),
        });
      }

      return {
        score,
        title,
        description: deviation <= 15 ? t('desc.head.good') : t('desc.head.bad'),
        details: [t('detail.head.angle', deviation)],
        warnings,
      };
    },
  },
  {
    id: 'leg_alignment',
    name: t('test.leg.name'),
    category: 'Legs',
    description: t('test.leg.desc'),
    instruction: t('test.leg.instr'),
    requiredView: 'Front',
    analyze: (data: SkeletonData, t: Translator): HealthReport | null => {
      const lHip = data.leftHip;
      const lKnee = data.leftKnee;
      const lAnkle = data.leftAnkle;

      const rHip = data.rightHip;
      const rKnee = data.rightKnee;
      const rAnkle = data.rightAnkle;

      if (!lHip || !lKnee || !lAnkle || !rHip || !rKnee || !rAnkle) return null;

      // Calculate angle at knee.
      const leftAngle = calculateAngle(lHip, lKnee, lAnkle);
      const rightAngle = calculateAngle(rHip, rKnee, rAnkle);

      let score = 100;
      let title = t('diag.leg.good');
      let description = t('diag.leg.desc_good');
      const warnings = [];

      // Valgus (X-legs): Angle < 170
      if (leftAngle < 165 || rightAngle < 165) {
        score = 60;
        title = t('diag.leg.valgus');
        description = t('diag.leg.desc_valgus');
        warnings.push({
          level: 'medium' as const,
          message: t('diag.leg.msg', leftAngle, rightAngle),
          futureRisk: t('risk.leg.acl'),
        });
      } else if (leftAngle > 185 || rightAngle > 185) {
        score = 80;
      }

      return {
        score,
        title,
        description,
        details: [t('detail.leg.left', leftAngle), t('detail.leg.right', rightAngle)],
        warnings,
      };
    },
  },
];
