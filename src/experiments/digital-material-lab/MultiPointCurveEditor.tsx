import { useState, useCallback, useRef, useEffect } from 'react';

export interface CurvePoint {
  x: number;  // 0-1 position on timeline
  y: number;  // 0-1 effect value
}

interface MultiPointCurveEditorProps {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
  width?: number;
  height?: number;
}

/**
 * Evaluate Catmull-Rom spline at position t
 * Returns y value for given x position
 */
function evaluateCatmullRom(points: CurvePoint[], x: number): number {
  if (points.length < 2) return points[0]?.y ?? 0;
  if (x <= 0) return points[0].y;
  if (x >= 1) return points[points.length - 1].y;

  // Find which segment we're in
  let i = 0;
  for (i = 0; i < points.length - 1; i++) {
    if (x >= points[i].x && x <= points[i + 1].x) break;
  }

  // Get 4 points for Catmull-Rom (p0, p1, p2, p3)
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(points.length - 1, i + 2)];

  // Local t within segment
  const segmentLength = p2.x - p1.x;
  if (segmentLength === 0) return p1.y;
  const t = (x - p1.x) / segmentLength;

  // Catmull-Rom interpolation
  const t2 = t * t;
  const t3 = t2 * t;

  const y = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * t +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );

  return Math.max(0, Math.min(1, y));
}

/**
 * Generate path data for the curve
 */
function generateCurvePath(points: CurvePoint[], toSvgX: (x: number) => number, toSvgY: (y: number) => number): string {
  if (points.length < 2) return '';

  const steps = 50;
  const pathPoints: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const y = evaluateCatmullRom(points, x);
    const svgX = toSvgX(x);
    const svgY = toSvgY(y);
    pathPoints.push(`${i === 0 ? 'M' : 'L'} ${svgX} ${svgY}`);
  }

  return pathPoints.join(' ');
}

export function MultiPointCurveEditor({
  points,
  onChange,
  width = 220,
  height = 140,
}: MultiPointCurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [lastClickTime, setLastClickTime] = useState(0);

  const padding = 12;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // Convert to/from SVG coordinates
  const toSvgX = (x: number) => padding + x * innerWidth;
  const toSvgY = (y: number) => padding + (1 - y) * innerHeight;
  const fromSvgX = (svgX: number) => Math.max(0, Math.min(1, (svgX - padding) / innerWidth));
  const fromSvgY = (svgY: number) => Math.max(0, Math.min(1, 1 - (svgY - padding) / innerHeight));

  const pathD = generateCurvePath(points, toSvgX, toSvgY);

  const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const isDoubleClick = now - lastClickTime < 300;

    if (isDoubleClick && index > 0 && index < points.length - 1) {
      // Double-click on intermediate point - remove it
      const newPoints = points.filter((_, i) => i !== index);
      onChange(newPoints);
      setLastClickTime(0);
      return;
    }

    setLastClickTime(now);
    setDraggingIndex(index);
  }, [points, onChange, lastClickTime]);

  const handleSvgDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    const x = fromSvgX(svgX);
    const y = fromSvgY(svgY);

    // Don't add if too close to start/end
    if (x < 0.05 || x > 0.95) return;

    // Find where to insert the new point
    let insertIndex = 1;
    for (let i = 0; i < points.length - 1; i++) {
      if (x > points[i].x) insertIndex = i + 1;
    }

    const newPoints = [...points];
    newPoints.splice(insertIndex, 0, { x, y });
    onChange(newPoints);
  }, [points, onChange, fromSvgX, fromSvgY]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingIndex === null || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;

    let x = fromSvgX(svgX);
    const y = fromSvgY(svgY);

    const newPoints = [...points];

    // Start and end points: only allow Y movement
    if (draggingIndex === 0) {
      newPoints[0] = { x: 0, y };
    } else if (draggingIndex === points.length - 1) {
      newPoints[draggingIndex] = { x: 1, y };
    } else {
      // Intermediate points: constrain X between neighbors
      const minX = points[draggingIndex - 1].x + 0.02;
      const maxX = points[draggingIndex + 1].x - 0.02;
      x = Math.max(minX, Math.min(maxX, x));
      newPoints[draggingIndex] = { x, y };
    }

    onChange(newPoints);
  }, [draggingIndex, points, onChange, fromSvgX, fromSvgY]);

  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingIndex, handleMouseMove, handleMouseUp]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-white rounded border border-neutral-200"
        style={{ cursor: draggingIndex !== null ? 'grabbing' : 'crosshair' }}
        onDoubleClick={handleSvgDoubleClick}
      >
        {/* Grid */}
        <defs>
          <pattern
            id="grid-light"
            width={innerWidth / 4}
            height={innerHeight / 4}
            patternUnits="userSpaceOnUse"
            x={padding}
            y={padding}
          >
            <path
              d={`M ${innerWidth / 4} 0 L 0 0 0 ${innerHeight / 4}`}
              fill="none"
              stroke="#f0f0f0"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect
          x={padding}
          y={padding}
          width={innerWidth}
          height={innerHeight}
          fill="url(#grid-light)"
        />

        {/* Axis lines */}
        <line
          x1={padding}
          y1={toSvgY(0)}
          x2={padding + innerWidth}
          y2={toSvgY(0)}
          stroke="#e5e5e5"
          strokeWidth="1"
        />
        <line
          x1={padding}
          y1={toSvgY(1)}
          x2={padding + innerWidth}
          y2={toSvgY(1)}
          stroke="#e5e5e5"
          strokeWidth="1"
        />

        {/* Diagonal reference */}
        <line
          x1={toSvgX(0)}
          y1={toSvgY(points[0]?.y ?? 0)}
          x2={toSvgX(1)}
          y2={toSvgY(points[points.length - 1]?.y ?? 1)}
          stroke="#e5e5e5"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#171717"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Points */}
        {points.map((point, index) => {
          const isStart = index === 0;
          const isEnd = index === points.length - 1;
          const isEndpoint = isStart || isEnd;

          return (
            <g key={index}>
              {/* Vertical guide line for intermediate points */}
              {!isEndpoint && (
                <line
                  x1={toSvgX(point.x)}
                  y1={padding}
                  x2={toSvgX(point.x)}
                  y2={padding + innerHeight}
                  stroke="#e5e5e5"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}
              <circle
                cx={toSvgX(point.x)}
                cy={toSvgY(point.y)}
                r={isEndpoint ? 5 : 4}
                fill={isStart ? '#10b981' : isEnd ? '#f43f5e' : '#171717'}
                stroke="white"
                strokeWidth="2"
                style={{ cursor: isEndpoint ? 'ns-resize' : 'grab' }}
                onMouseDown={handleMouseDown(index)}
              />
            </g>
          );
        })}
      </svg>

      {/* Instructions */}
      <div className="flex justify-between mt-2 text-[9px] text-neutral-400">
        <span>Double-click to add point</span>
        <span>Double-click point to remove</span>
      </div>
    </div>
  );
}

// Export the evaluation function for use in animation
export { evaluateCatmullRom };
