import { useState, useCallback, useRef, useEffect } from 'react';

export interface CurvePoint {
  x: number;  // 0-1 position on timeline
  y: number;  // 0-1 effect value
  // Bezier handle offsets (relative to point position)
  handleIn?: { x: number; y: number };   // Handle coming in (left)
  handleOut?: { x: number; y: number };  // Handle going out (right)
}

interface MultiPointCurveEditorProps {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
  width?: number;
  height?: number;
}

/**
 * Evaluate cubic bezier segment between two points
 */
function cubicBezierY(t: number, p0y: number, c0y: number, c1y: number, p1y: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  return mt3 * p0y + 3 * mt2 * t * c0y + 3 * mt * t2 * c1y + t3 * p1y;
}

function cubicBezierX(t: number, p0x: number, c0x: number, c1x: number, p1x: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  return mt3 * p0x + 3 * mt2 * t * c0x + 3 * mt * t2 * c1x + t3 * p1x;
}

/**
 * Find t value for given x using Newton's method
 */
function findTForX(targetX: number, p0x: number, c0x: number, c1x: number, p1x: number): number {
  let t = 0.5;
  for (let i = 0; i < 10; i++) {
    const x = cubicBezierX(t, p0x, c0x, c1x, p1x);
    const error = x - targetX;
    if (Math.abs(error) < 0.0001) break;
    // Derivative
    const dx = 3 * (1 - t) * (1 - t) * (c0x - p0x) +
               6 * (1 - t) * t * (c1x - c0x) +
               3 * t * t * (p1x - c1x);
    if (Math.abs(dx) < 0.0001) break;
    t -= error / dx;
    t = Math.max(0, Math.min(1, t));
  }
  return t;
}

/**
 * Evaluate the multi-point bezier curve at position x
 */
function evaluateCurve(points: CurvePoint[], x: number): number {
  if (points.length < 2) return points[0]?.y ?? 0;
  if (x <= 0) return points[0].y;
  if (x >= 1) return points[points.length - 1].y;

  // Find which segment we're in
  let segmentIndex = 0;
  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i].x && x <= points[i + 1].x) {
      segmentIndex = i;
      break;
    }
  }

  const p0 = points[segmentIndex];
  const p1 = points[segmentIndex + 1];

  // Get control points
  const handleOut = p0.handleOut ?? { x: 0.3, y: 0 };
  const handleIn = p1.handleIn ?? { x: -0.3, y: 0 };

  const c0x = p0.x + handleOut.x * (p1.x - p0.x);
  const c0y = p0.y + handleOut.y;
  const c1x = p1.x + handleIn.x * (p1.x - p0.x);
  const c1y = p1.y + handleIn.y;

  // Find t for this x value
  const t = findTForX(x, p0.x, c0x, c1x, p1.x);

  // Get y at this t
  const y = cubicBezierY(t, p0.y, c0y, c1y, p1.y);

  return Math.max(0, Math.min(1, y));
}

/**
 * Generate SVG path for a bezier segment
 */
function generateSegmentPath(
  p0: CurvePoint,
  p1: CurvePoint,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number
): string {
  const handleOut = p0.handleOut ?? { x: 0.3, y: 0 };
  const handleIn = p1.handleIn ?? { x: -0.3, y: 0 };

  const segmentWidth = p1.x - p0.x;

  const c0x = p0.x + handleOut.x * segmentWidth;
  const c0y = p0.y + handleOut.y;
  const c1x = p1.x + handleIn.x * segmentWidth;
  const c1y = p1.y + handleIn.y;

  return `C ${toSvgX(c0x)} ${toSvgY(c0y)}, ${toSvgX(c1x)} ${toSvgY(c1y)}, ${toSvgX(p1.x)} ${toSvgY(p1.y)}`;
}

/**
 * Generate full curve path
 */
function generateCurvePath(
  points: CurvePoint[],
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number
): string {
  if (points.length < 2) return '';

  let path = `M ${toSvgX(points[0].x)} ${toSvgY(points[0].y)}`;

  for (let i = 0; i < points.length - 1; i++) {
    path += ' ' + generateSegmentPath(points[i], points[i + 1], toSvgX, toSvgY);
  }

  return path;
}

type DragTarget =
  | { type: 'point'; index: number }
  | { type: 'handleIn'; index: number }
  | { type: 'handleOut'; index: number }
  | null;

export function MultiPointCurveEditor({
  points,
  onChange,
  width = 220,
  height = 140,
}: MultiPointCurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [isOutsideBounds, setIsOutsideBounds] = useState(false);

  const padding = 12;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // Convert to/from SVG coordinates
  const toSvgX = (x: number) => padding + x * innerWidth;
  const toSvgY = (y: number) => padding + (1 - y) * innerHeight;
  const fromSvgX = (svgX: number) => (svgX - padding) / innerWidth;
  const fromSvgY = (svgY: number) => 1 - (svgY - padding) / innerHeight;

  const pathD = generateCurvePath(points, toSvgX, toSvgY);

  const handleMouseDown = useCallback((target: DragTarget) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(target);
    setIsOutsideBounds(false);
  }, []);

  const handleSvgDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    const x = fromSvgX(svgX);
    const y = fromSvgY(svgY);

    // Don't add if too close to start/end or outside bounds
    if (x < 0.05 || x > 0.95 || y < 0 || y > 1) return;

    // Find where to insert the new point
    let insertIndex = 1;
    for (let i = 0; i < points.length - 1; i++) {
      if (x > points[i].x) insertIndex = i + 1;
    }

    const newPoints = [...points];
    newPoints.splice(insertIndex, 0, {
      x,
      y,
      handleIn: { x: -0.3, y: 0 },
      handleOut: { x: 0.3, y: 0 },
    });
    onChange(newPoints);
  }, [points, onChange, fromSvgX, fromSvgY]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;

    // Check if dragging outside bounds (for deletion)
    const outsideMargin = 30;
    const outside = svgX < -outsideMargin || svgX > width + outsideMargin ||
                    svgY < -outsideMargin || svgY > height + outsideMargin;
    setIsOutsideBounds(outside);

    const x = fromSvgX(svgX);
    const y = fromSvgY(svgY);

    const newPoints = [...points];

    if (dragging.type === 'point') {
      const idx = dragging.index;
      const clampedY = Math.max(0, Math.min(1, y));

      // Start and end points: only allow Y movement
      if (idx === 0) {
        newPoints[0] = { ...newPoints[0], x: 0, y: clampedY };
      } else if (idx === points.length - 1) {
        newPoints[idx] = { ...newPoints[idx], x: 1, y: clampedY };
      } else {
        // Intermediate points: constrain X between neighbors
        const minX = points[idx - 1].x + 0.02;
        const maxX = points[idx + 1].x - 0.02;
        const clampedX = Math.max(minX, Math.min(maxX, x));
        newPoints[idx] = { ...newPoints[idx], x: clampedX, y: clampedY };
      }
    } else if (dragging.type === 'handleOut') {
      const idx = dragging.index;
      const point = points[idx];
      const nextPoint = points[idx + 1];
      if (!nextPoint) return;

      const segmentWidth = nextPoint.x - point.x;
      const handleX = segmentWidth > 0 ? (x - point.x) / segmentWidth : 0;
      const handleY = y - point.y;

      newPoints[idx] = {
        ...newPoints[idx],
        handleOut: {
          x: Math.max(0, Math.min(1, handleX)),
          y: Math.max(-1, Math.min(1, handleY))
        },
      };
    } else if (dragging.type === 'handleIn') {
      const idx = dragging.index;
      const point = points[idx];
      const prevPoint = points[idx - 1];
      if (!prevPoint) return;

      const segmentWidth = point.x - prevPoint.x;
      const handleX = segmentWidth > 0 ? (x - point.x) / segmentWidth : 0;
      const handleY = y - point.y;

      newPoints[idx] = {
        ...newPoints[idx],
        handleIn: {
          x: Math.min(0, Math.max(-1, handleX)),
          y: Math.max(-1, Math.min(1, handleY))
        },
      };
    }

    onChange(newPoints);
  }, [dragging, points, onChange, fromSvgX, fromSvgY, width, height]);

  const handleMouseUp = useCallback(() => {
    // If dragging an intermediate point outside bounds, remove it
    if (dragging?.type === 'point' && isOutsideBounds) {
      const idx = dragging.index;
      if (idx > 0 && idx < points.length - 1) {
        const newPoints = points.filter((_, i) => i !== idx);
        onChange(newPoints);
      }
    }
    setDragging(null);
    setIsOutsideBounds(false);
  }, [dragging, isOutsideBounds, points, onChange]);

  useEffect(() => {
    if (dragging !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="relative overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-neutral-800 rounded border border-neutral-700"
        style={{ cursor: dragging !== null ? 'grabbing' : 'crosshair' }}
        onDoubleClick={handleSvgDoubleClick}
      >
        {/* Grid */}
        <defs>
          <pattern
            id="grid-multi"
            width={innerWidth / 4}
            height={innerHeight / 4}
            patternUnits="userSpaceOnUse"
            x={padding}
            y={padding}
          >
            <path
              d={`M ${innerWidth / 4} 0 L 0 0 0 ${innerHeight / 4}`}
              fill="none"
              stroke="#404040"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect
          x={padding}
          y={padding}
          width={innerWidth}
          height={innerHeight}
          fill="url(#grid-multi)"
        />

        {/* Axis lines */}
        <line
          x1={padding}
          y1={toSvgY(0)}
          x2={padding + innerWidth}
          y2={toSvgY(0)}
          stroke="#525252"
          strokeWidth="1"
        />
        <line
          x1={padding}
          y1={toSvgY(1)}
          x2={padding + innerWidth}
          y2={toSvgY(1)}
          stroke="#525252"
          strokeWidth="1"
        />

        {/* Diagonal reference */}
        <line
          x1={toSvgX(0)}
          y1={toSvgY(points[0]?.y ?? 0)}
          x2={toSvgX(1)}
          y2={toSvgY(points[points.length - 1]?.y ?? 1)}
          stroke="#525252"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Handle lines and points */}
        {points.map((point, index) => {
          const isStart = index === 0;
          const isEnd = index === points.length - 1;
          const isDraggingThis = dragging?.type === 'point' && dragging.index === index;
          const showDelete = isDraggingThis && isOutsideBounds && !isStart && !isEnd;

          // Calculate handle positions
          const prevPoint = points[index - 1];
          const nextPoint = points[index + 1];

          const handleIn = point.handleIn ?? { x: -0.3, y: 0 };
          const handleOut = point.handleOut ?? { x: 0.3, y: 0 };

          // Handle positions in SVG space
          const handleInPos = prevPoint ? {
            x: toSvgX(point.x + handleIn.x * (point.x - prevPoint.x)),
            y: toSvgY(point.y + handleIn.y),
          } : null;

          const handleOutPos = nextPoint ? {
            x: toSvgX(point.x + handleOut.x * (nextPoint.x - point.x)),
            y: toSvgY(point.y + handleOut.y),
          } : null;

          return (
            <g key={index}>
              {/* Handle in line and point */}
              {handleInPos && (
                <>
                  <line
                    x1={toSvgX(point.x)}
                    y1={toSvgY(point.y)}
                    x2={handleInPos.x}
                    y2={handleInPos.y}
                    stroke="#737373"
                    strokeWidth="1"
                  />
                  <circle
                    cx={handleInPos.x}
                    cy={handleInPos.y}
                    r={3}
                    fill="#737373"
                    stroke="#262626"
                    strokeWidth="1"
                    style={{ cursor: 'grab' }}
                    onMouseDown={handleMouseDown({ type: 'handleIn', index })}
                  />
                </>
              )}

              {/* Handle out line and point */}
              {handleOutPos && (
                <>
                  <line
                    x1={toSvgX(point.x)}
                    y1={toSvgY(point.y)}
                    x2={handleOutPos.x}
                    y2={handleOutPos.y}
                    stroke="#737373"
                    strokeWidth="1"
                  />
                  <circle
                    cx={handleOutPos.x}
                    cy={handleOutPos.y}
                    r={3}
                    fill="#737373"
                    stroke="#262626"
                    strokeWidth="1"
                    style={{ cursor: 'grab' }}
                    onMouseDown={handleMouseDown({ type: 'handleOut', index })}
                  />
                </>
              )}

              {/* Main point */}
              <circle
                cx={toSvgX(point.x)}
                cy={toSvgY(point.y)}
                r={isStart || isEnd ? 6 : 5}
                fill={showDelete ? '#ef4444' : isStart ? '#10b981' : isEnd ? '#f43f5e' : '#e5e5e5'}
                stroke="#262626"
                strokeWidth="2"
                style={{ cursor: isStart || isEnd ? 'ns-resize' : 'grab' }}
                onMouseDown={handleMouseDown({ type: 'point', index })}
              />
            </g>
          );
        })}
      </svg>

      {/* Instructions */}
      <div className="flex justify-between mt-2 text-[9px] text-neutral-500">
        <span>Double-click to add</span>
        <span>Drag point out to remove</span>
      </div>
    </div>
  );
}

// Export the evaluation function for use in animation
export { evaluateCurve as evaluateCatmullRom };
