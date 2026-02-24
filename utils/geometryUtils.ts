import { Point, EditorPoint, EditorConnection, EditorAngle, EditorLayout } from '../types';

// Generate unique ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Calculate distance between two points
export const getDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Calculate squared distance for internal optimization
const distSq = (x1: number, y1: number, x2: number, y2: number) =>
  (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);

// Calculate distance from point (p) to line segment (v-w)
const getDistanceToSegment = (p: Point, v: Point, w: Point) => {
  const l2 = distSq(v.x, v.y, w.x, w.y);
  if (l2 === 0) return getDistance(p, v);

  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projection = {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y),
  };

  return getDistance(p, projection);
};

// Calculate angle between three points (p1 -> center -> p2) in degrees
export const calculateAngle = (p1: Point, center: Point, p2: Point): number => {
  const p1x = p1.x - center.x;
  const p1y = p1.y - center.y;
  const p2x = p2.x - center.x;
  const p2y = p2.y - center.y;

  const angleRad = Math.atan2(p2y, p2x) - Math.atan2(p1y, p1x);
  let angleDeg = Math.abs((angleRad * 180) / Math.PI);

  if (angleDeg > 180) {
    angleDeg = 360 - angleDeg;
  }

  return Math.round(angleDeg);
};

// HELPER: Project normalized coordinates to screen coordinates based on layout
const project = (normP: EditorPoint, layout: EditorLayout): Point => ({
  x: layout.offsetX + normP.x * layout.renderW,
  y: layout.offsetY + normP.y * layout.renderH,
});

// Calculate Angle deviation from Vertical Axis (0 degrees is perfectly vertical up/down)
// Used for "Forward Head" or "Spine alignment"
export const calculateVerticalDeviation = (top: Point, bottom: Point): number => {
  const dx = bottom.x - top.x; // Normalized coordinates, usually x is width
  const dy = bottom.y - top.y; // Normalized coordinates, usually y is height (increases downwards)

  // atan2(dx, dy) gives angle from vertical Y axis in radians if we treat dy as adjacent
  // Ideally, if top is directly above bottom, dx=0.
  const rad = Math.atan2(dx, dy);
  const deg = Math.abs((rad * 180) / Math.PI);
  return Math.round(deg);
};

// Calculate Slope (Angle from Horizontal) - Used for Shoulder Level
export const calculateHorizontalDeviation = (left: Point, right: Point): number => {
  const dy = right.y - left.y;
  const dx = right.x - left.x;
  const rad = Math.atan2(dy, dx);
  const deg = Math.abs((rad * 180) / Math.PI);
  return Math.round(deg);
};

// Hit test for a point (with tolerance)
export const hitTestPoint = (
  x: number,
  y: number,
  points: EditorPoint[],
  layout: EditorLayout,
  tolerance: number = 20
): string | null => {
  for (const p of points) {
    const screenP = project(p, layout);
    if (getDistance({ x, y }, screenP) < tolerance) {
      return p.id;
    }
  }
  return null;
};

// Hit test for a connection (line segment)
export const hitTestConnection = (
  x: number,
  y: number,
  connections: EditorConnection[],
  points: EditorPoint[],
  layout: EditorLayout,
  tolerance: number = 15
): string | null => {
  for (const conn of connections) {
    const p1 = points.find((p) => p.id === conn.from);
    const p2 = points.find((p) => p.id === conn.to);

    if (p1 && p2) {
      const v = project(p1, layout);
      const w = project(p2, layout);
      const p = { x, y };

      const dist = getDistanceToSegment(p, v, w);
      if (dist < tolerance) {
        return conn.id;
      }
    }
  }
  return null;
};

// Hit test for an angle (checking proximity to the text/arc label)
export const hitTestAngle = (
  x: number,
  y: number,
  angles: EditorAngle[],
  points: EditorPoint[],
  layout: EditorLayout,
  tolerance: number = 25 // Radius around the text label
): string | null => {
  for (const angle of angles) {
    const p1 = points.find((p) => p.id === angle.p1);
    const pc = points.find((p) => p.id === angle.center);
    const p2 = points.find((p) => p.id === angle.p2);

    if (p1 && pc && p2) {
      const sc = project(pc, layout);
      const s1 = project(p1, layout);
      const s2 = project(p2, layout);

      const cx = sc.x;
      const cy = sc.y;
      const ax = s1.x;
      const ay = s1.y;
      const bx = s2.x;
      const by = s2.y;

      // Logic to find text position (midpoint of arc)
      const startAngle = Math.atan2(ay - cy, ax - cx);
      const endAngle = Math.atan2(by - cy, bx - cx);

      let diff = endAngle - startAngle;
      // Normalize to -PI to +PI to find shortest path
      if (diff > Math.PI) diff -= 2 * Math.PI;
      else if (diff <= -Math.PI) diff += 2 * Math.PI;

      const midAngle = startAngle + diff / 2;
      const textRadius = 45; // Match drawing radius
      const tx = cx + Math.cos(midAngle) * textRadius;
      const ty = cy + Math.sin(midAngle) * textRadius;

      if (getDistance({ x, y }, { x: tx, y: ty }) < tolerance) {
        return angle.id;
      }
    }
  }
  return null;
};
