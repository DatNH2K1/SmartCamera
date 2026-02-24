import * as posenet from '@tensorflow-models/posenet';
import '@tensorflow/tfjs';
import { AIAnalysisResult, SkeletonData, BoundingBox } from '../types';

let net: posenet.PoseNet | null = null;

// Load the PoseNet model
export const loadModel = async () => {
  if (net) return;
  console.log('Loading PoseNet model...');
  net = await posenet.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: { width: 500, height: 500 }, // Balance speed/accuracy
    multiplier: 0.75,
  });
  console.log('PoseNet model loaded.');
};

// Helper to convert Image source to HTMLImageElement
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

export const analyzePose = async (base64Image: string): Promise<AIAnalysisResult> => {
  if (!net) {
    await loadModel();
  }

  if (!net) throw new Error('Model failed to load');

  const imageElement = await createImage(base64Image);
  const w = imageElement.width;
  const h = imageElement.height;

  // PoseNet inference
  const pose = await net.estimateSinglePose(imageElement, {
    flipHorizontal: false,
  });

  // Transform PoseNet Keypoints Array to our SkeletonData Object Map
  const skeleton: SkeletonData = {};
  pose.keypoints.forEach((point) => {
    if (point.score > 0.5) {
      // Only take confident points
      skeleton[point.part] = { x: point.position.x, y: point.position.y };
    }
  });

  // Calculate Face Bounding Box based on facial keypoints
  let faceBox: BoundingBox | undefined;
  const faceParts = ['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar'];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let hasFaceData = false;

  faceParts.forEach((part) => {
    if (skeleton[part]) {
      hasFaceData = true;
      const p = skeleton[part]!;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  });

  if (hasFaceData) {
    // Calculate center of features
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Determine size.
    // Face features (eyes/nose/ears) are usually a horizontal band.
    // Width (ear-to-ear) is a good proxy for face scale.
    const featureWidth = maxX - minX;
    const featureHeight = maxY - minY;

    // Use the larger dimension found (usually width) multiplied by a factor to cover chin and forehead.
    // 1.5x to 1.6x is usually sufficient to make a square covering the whole head.
    // We default to at least 50px if features are clustered (e.g. only nose found).
    const baseSize = Math.max(featureWidth, featureHeight, 50);
    const boxSize = baseSize * 1.6;
    const halfSize = boxSize / 2;

    faceBox = {
      xmin: Math.max(0, centerX - halfSize) / w,
      ymin: Math.max(0, centerY - halfSize) / h,
      xmax: Math.min(w, centerX + halfSize) / w,
      ymax: Math.min(h, centerY + halfSize) / h,
    };
  }

  // Also normalize skeleton points
  Object.keys(skeleton).forEach((key) => {
    if (skeleton[key]) {
      skeleton[key]!.x = skeleton[key]!.x / w;
      skeleton[key]!.y = skeleton[key]!.y / h;
    }
  });

  return {
    skeleton,
    faceBox,
    confidence: pose.score,
  };
};
