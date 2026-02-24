import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import {
  AIAnalysisResult,
  Point,
  EditorData,
  EditorPoint,
  EditorConnection,
  EditorAngle,
  EditorTool,
  EditorLayout,
} from '../../types';
import {
  generateId,
  calculateAngle,
  hitTestPoint,
  hitTestConnection,
  hitTestAngle,
} from '../../utils/geometryUtils';

interface ResultOverlayProps {
  imageSrc: string;
  data: AIAnalysisResult;
  width: number;
  height: number;
  hideFace: boolean;
  showSkeleton: boolean;
  activeTool: EditorTool;
  onDataChange?: (data: EditorData) => void;
}

export interface ResultOverlayHandle {
  saveCanvas: () => string;
}

// Initial connections map (PoseNet standard)
const DEFAULT_CONNECTIONS = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
];

// Face parts to exclude from skeleton editor
const FACE_PARTS = ['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar'];

export const EditorCanvas = forwardRef<ResultOverlayHandle, ResultOverlayProps>(
  ({ imageSrc, data, width, height, hideFace, showSkeleton, activeTool, onDataChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

    // Editor State
    const [editorData, setEditorData] = useState<EditorData>({
      points: [],
      connections: [],
      angles: [],
    });
    const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
    const [connectingStartId, setConnectingStartId] = useState<string | null>(null);

    // Selection state for Tools
    // For Angle tool: stores Connection IDs
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);

    // Layout State
    const [layout, setLayout] = useState<EditorLayout>({
      renderW: 0,
      renderH: 0,
      offsetX: 0,
      offsetY: 0,
    });

    // Expose save function
    useImperativeHandle(ref, () => ({
      saveCanvas: () => {
        if (canvasRef.current) return canvasRef.current.toDataURL('image/jpeg', 0.9);
        return '';
      },
    }));

    // 1. Load Image (Only when src changes)
    useEffect(() => {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        setImgElement(img);
      };
    }, [imageSrc]);

    // 2. Calculate Layout (Runs when image is loaded OR window dimensions change)
    useEffect(() => {
      if (!imgElement) return;

      const imgAspect = imgElement.width / imgElement.height;
      const canvasAspect = width / height;
      let renderW, renderH, offsetX, offsetY;

      if (imgAspect < canvasAspect) {
        renderH = height;
        renderW = height * imgAspect;
        offsetX = (width - renderW) / 2;
        offsetY = 0;
      } else {
        renderW = width;
        renderH = width / imgAspect;
        offsetX = 0;
        offsetY = (height - renderH) / 2;
      }
      setLayout({ renderW, renderH, offsetX, offsetY });
    }, [imgElement, width, height]);

    // 3. Initialize Editor Data from AI Result
    useEffect(() => {
      if (!data || !data.skeleton) return;

      // Only init if empty (prevents overwriting edits on re-render if props change slightly)
      if (editorData.points.length > 0) return;

      const newPoints: EditorPoint[] = [];
      const newConnections: EditorConnection[] = [];

      // Convert SkeletonData to EditorPoint array
      Object.entries(data.skeleton).forEach(([key, val]) => {
        // EXCLUDE FACE PARTS
        if (FACE_PARTS.includes(key)) return;

        const p = val as Point | undefined;
        if (p) {
          newPoints.push({ id: key, x: p.x, y: p.y });
        }
      });

      // Create default connections if points exist
      DEFAULT_CONNECTIONS.forEach(([p1, p2]) => {
        if (data.skeleton[p1] && data.skeleton[p2]) {
          newConnections.push({ id: generateId(), from: p1, to: p2 });
        }
      });

      setEditorData({ points: newPoints, connections: newConnections, angles: [] });
    }, [data]);

    // Reset selection when tool changes
    useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedElementIds([]);
       
      setConnectingStartId(null);
       
      setDraggingPointId(null);
    }, [activeTool]);

    // 4. Main Drawing Loop
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !imgElement) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { renderW, renderH, offsetX, offsetY } = layout;

      // --- Helpers ---
      const getX = (normX: number) => offsetX + normX * renderW;
      const getY = (normY: number) => offsetY + normY * renderH;

      // Clear
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      // Draw Image
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(imgElement, offsetX, offsetY, renderW, renderH);

      // Draw Mosaic
      if (hideFace && data.faceBox) {
        const { ymin, xmin, ymax, xmax } = data.faceBox;
        const destX = getX(xmin);
        const destY = getY(ymin);
        const destW = (xmax - xmin) * renderW;
        const destH = (ymax - ymin) * renderH;
        const srcX = xmin * imgElement.width;
        const srcY = ymin * imgElement.height;
        const srcW = (xmax - xmin) * imgElement.width;
        const srcH = (ymax - ymin) * imgElement.height;

        if (destW > 0 && destH > 0) {
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            const tinyW = Math.max(2, Math.floor(destW * 0.05));
            const tinyH = Math.max(2, Math.floor(destH * 0.05));
            tempCanvas.width = tinyW;
            tempCanvas.height = tinyH;
            tempCtx.drawImage(imgElement, srcX, srcY, srcW, srcH, 0, 0, tinyW, tinyH);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tempCanvas, 0, 0, tinyW, tinyH, destX, destY, destW, destH);
            ctx.imageSmoothingEnabled = true;
          }
        }
      }

      // Draw Skeleton (Interactive)
      if (showSkeleton) {
        // Draw Connections
        editorData.connections.forEach((conn) => {
          const p1 = editorData.points.find((p) => p.id === conn.from);
          const p2 = editorData.points.find((p) => p.id === conn.to);

          if (p1 && p2) {
            const isSelected = selectedElementIds.includes(conn.id);

            // COLOR CODING: LEFT vs RIGHT
            // Left side (user's left) usually key names contain 'left'
            // Right side (user's right) usually key names contain 'right'
            // Center (hips/shoulders connecting across) -> White

            let strokeColor = '#ffffff'; // Default Center (White)

            const isLeft = (id: string) => id.toLowerCase().includes('left');
            const isRight = (id: string) => id.toLowerCase().includes('right');

            if (isLeft(conn.from) && isLeft(conn.to)) {
              strokeColor = '#00FFFF'; // Cyan for Left
            } else if (isRight(conn.from) && isRight(conn.to)) {
              strokeColor = '#FF00FF'; // Magenta for Right
            }
            // If cross connection (leftHip -> rightHip), keeps white

            if (isSelected) strokeColor = '#FFFF00'; // Yellow selection override

            ctx.beginPath();
            ctx.moveTo(getX(p1.x), getY(p1.y));
            ctx.lineTo(getX(p2.x), getY(p2.y));
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = isSelected ? 5 : 3;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        });

        // Draw Angles
        editorData.angles.forEach((ang) => {
          const p1 = editorData.points.find((p) => p.id === ang.p1);
          const pc = editorData.points.find((p) => p.id === ang.center);
          const p2 = editorData.points.find((p) => p.id === ang.p2);

          if (p1 && pc && p2) {
            const cx = getX(pc.x);
            const cy = getY(pc.y);
            const ax = getX(p1.x);
            const ay = getY(p1.y);
            const bx = getX(p2.x);
            const by = getY(p2.y);

            const degrees = calculateAngle(p1, pc, p2);

            const startAngle = Math.atan2(ay - cy, ax - cx);
            const endAngle = Math.atan2(by - cy, bx - cx);

            let diff = endAngle - startAngle;
            if (diff > Math.PI) diff -= 2 * Math.PI;
            else if (diff <= -Math.PI) diff += 2 * Math.PI;

            ctx.beginPath();
            ctx.arc(cx, cy, 30, startAngle, startAngle + diff, diff < 0);

            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.lineTo(cx, cy);
            ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            ctx.fill();

            const midAngle = startAngle + diff / 2;
            const textRadius = 45;
            const tx = cx + Math.cos(midAngle) * textRadius;
            const ty = cy + Math.sin(midAngle) * textRadius;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(`${degrees}°`, tx, ty);
            ctx.fillText(`${degrees}°`, tx, ty);
          }
        });

        // Draw Points
        editorData.points.forEach((p) => {
          const x = getX(p.x);
          const y = getY(p.y);

          const isTarget = p.id === connectingStartId;
          const radius = isTarget ? 8 : 5;
          const color = isTarget
            ? '#ffff00'
            : p.id.includes('left')
              ? '#00FFFF'
              : p.id.includes('right')
                ? '#FF00FF'
                : '#ffffff';

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#000';
          ctx.stroke();
        });
      }
    }, [
      imgElement,
      width,
      height,
      hideFace,
      showSkeleton,
      editorData,
      layout,
      activeTool,
      connectingStartId,
      selectedElementIds,
      data.faceBox,
    ]);

    // 5. Interactions
    const getNormPos = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      let cx, cy;
      if ('touches' in e) {
        cx = e.touches[0].clientX - rect.left;
        cy = e.touches[0].clientY - rect.top;
      } else {
        cx = (e as React.MouseEvent).clientX - rect.left;
        cy = (e as React.MouseEvent).clientY - rect.top;
      }
      return { x: cx, y: cy };
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e) {
        e.stopPropagation();
      }

      if (!showSkeleton) return;
      const { x, y } = getNormPos(e);

      const hitPointId = hitTestPoint(x, y, editorData.points, layout, 45);
      const hitLineId = hitTestConnection(
        x,
        y,
        editorData.connections,
        editorData.points,
        layout,
        30
      );
      const hitAngleId = hitTestAngle(x, y, editorData.angles, editorData.points, layout, 35);

      if (activeTool === EditorTool.MOVE) {
        if (hitPointId) setDraggingPointId(hitPointId);
      } else if (activeTool === EditorTool.ADD_POINT) {
        if (!hitPointId) {
          const normX = (x - layout.offsetX) / layout.renderW;
          const normY = (y - layout.offsetY) / layout.renderH;
          if (normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1) {
            const newP = { id: generateId(), x: normX, y: normY };
            setEditorData((prev) => ({ ...prev, points: [...prev.points, newP] }));
          }
        }
      } else if (activeTool === EditorTool.CONNECT) {
        if (hitPointId) {
          if (connectingStartId && connectingStartId !== hitPointId) {
            const exists = editorData.connections.some(
              (c) =>
                (c.from === connectingStartId && c.to === hitPointId) ||
                (c.from === hitPointId && c.to === connectingStartId)
            );

            if (!exists) {
              const newConn = { id: generateId(), from: connectingStartId, to: hitPointId };
              setEditorData((prev) => ({ ...prev, connections: [...prev.connections, newConn] }));
            }
            setConnectingStartId(null);
          } else {
            setConnectingStartId(hitPointId);
          }
        } else {
          setConnectingStartId(null);
        }
      } else if (activeTool === EditorTool.DELETE) {
        if (hitAngleId) {
          setEditorData((prev) => ({
            ...prev,
            angles: prev.angles.filter((a) => a.id !== hitAngleId),
          }));
        } else if (hitPointId) {
          setEditorData((prev) => ({
            points: prev.points.filter((p) => p.id !== hitPointId),
            connections: prev.connections.filter(
              (c) => c.from !== hitPointId && c.to !== hitPointId
            ),
            angles: prev.angles.filter(
              (a) => a.p1 !== hitPointId && a.center !== hitPointId && a.p2 !== hitPointId
            ),
          }));
        } else if (hitLineId) {
          const conn = editorData.connections.find((c) => c.id === hitLineId);
          if (conn) {
            const pA = conn.from;
            const pB = conn.to;
            setEditorData((prev) => ({
              ...prev,
              connections: prev.connections.filter((c) => c.id !== hitLineId),
              angles: prev.angles.filter((a) => {
                const usesConnAsArm1 = a.center === pA && (a.p1 === pB || a.p2 === pB);
                const usesConnAsArm2 = a.center === pB && (a.p1 === pA || a.p2 === pA);
                return !(usesConnAsArm1 || usesConnAsArm2);
              }),
            }));
          }
        }
      } else if (activeTool === EditorTool.ANGLE) {
        if (hitLineId) {
          let newSelection = [...selectedElementIds];
          if (newSelection.includes(hitLineId)) {
            newSelection = newSelection.filter((id) => id !== hitLineId);
          } else {
            newSelection.push(hitLineId);
          }

          if (newSelection.length === 2) {
            const conn1 = editorData.connections.find((c) => c.id === newSelection[0]);
            const conn2 = editorData.connections.find((c) => c.id === newSelection[1]);

            if (conn1 && conn2) {
              let centerId: string | null = null;
              let p1Id: string | null = null;
              let p2Id: string | null = null;

              if (conn1.from === conn2.from) {
                centerId = conn1.from;
                p1Id = conn1.to;
                p2Id = conn2.to;
              } else if (conn1.from === conn2.to) {
                centerId = conn1.from;
                p1Id = conn1.to;
                p2Id = conn2.from;
              } else if (conn1.to === conn2.from) {
                centerId = conn1.to;
                p1Id = conn1.from;
                p2Id = conn2.to;
              } else if (conn1.to === conn2.to) {
                centerId = conn1.to;
                p1Id = conn1.from;
                p2Id = conn2.from;
              }

              if (centerId && p1Id && p2Id) {
                const alreadyExists = editorData.angles.some(
                  (a) =>
                    a.center === centerId &&
                    ((a.p1 === p1Id && a.p2 === p2Id) || (a.p1 === p2Id && a.p2 === p1Id))
                );

                if (!alreadyExists) {
                  const newAngle = { id: generateId(), p1: p1Id, center: centerId, p2: p2Id };
                  setEditorData((prev) => ({ ...prev, angles: [...prev.angles, newAngle] }));
                }
                newSelection = [];
              } else {
                newSelection = [hitLineId];
              }
            }
          }
          setSelectedElementIds(newSelection);
        } else {
          setSelectedElementIds([]);
        }
      }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e && draggingPointId) {
        e.preventDefault();
      }

      if (activeTool === EditorTool.MOVE && draggingPointId) {
        const { x, y } = getNormPos(e);
        const normX = (x - layout.offsetX) / layout.renderW;
        const normY = (y - layout.offsetY) / layout.renderH;

        setEditorData((prev) => ({
          ...prev,
          points: prev.points.map((p) =>
            p.id === draggingPointId ? { ...p, x: normX, y: normY } : p
          ),
        }));
      }
    };

    const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e) {
        e.preventDefault();
      }
      setDraggingPointId(null);
    };

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full object-contain touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    );
  }
);
