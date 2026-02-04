import { useState, useCallback, useRef, useEffect } from 'react';
import type { BezierCurve } from './animation';

interface BezierCurveEditorProps {
  value: BezierCurve;
  onChange: (value: BezierCurve) => void;
  width?: number;
  height?: number;
}

export function BezierCurveEditor({
  value,
  onChange,
  width = 200,
  height = 120,
}: BezierCurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);

  const padding = 16;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // Control points in normalized space (0-1)
  const [x1, y1, x2, y2] = value;

  // Convert to SVG coordinates
  const toSvgX = (x: number) => padding + x * innerWidth;
  const toSvgY = (y: number) => padding + (1 - y) * innerHeight;

  // Convert from SVG coordinates
  const fromSvgX = (svgX: number) => Math.max(0, Math.min(1, (svgX - padding) / innerWidth));
  const fromSvgY = (svgY: number) => Math.max(0, Math.min(1, 1 - (svgY - padding) / innerHeight));

  // Fixed start and end points
  const p0 = { x: toSvgX(0), y: toSvgY(0) };
  const p3 = { x: toSvgX(1), y: toSvgY(1) };

  // Control point positions
  const p1 = { x: toSvgX(x1), y: toSvgY(y1) };
  const p2 = { x: toSvgX(x2), y: toSvgY(y2) };

  // Generate the bezier path
  const pathD = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;

  const handleMouseDown = useCallback((point: 'p1' | 'p2') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(point);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;

    const x = fromSvgX(svgX);
    const y = fromSvgY(svgY);

    if (dragging === 'p1') {
      onChange([x, y, x2, y2]);
    } else {
      onChange([x1, y1, x, y]);
    }
  }, [dragging, onChange, x1, y1, x2, y2]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Generate sample points for the curve visualization
  const samplePoints: string[] = [];
  for (let t = 0; t <= 1; t += 0.02) {
    // De Casteljau's algorithm
    const mt = 1 - t;
    const x = mt * mt * mt * 0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * 1;
    const y = mt * mt * mt * 0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * 1;
    samplePoints.push(`${toSvgX(x)},${toSvgY(y)}`);
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-[#1a1a24] rounded-lg border border-[#2a2a3e]"
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
      >
        {/* Grid */}
        <defs>
          <pattern
            id="grid"
            width={innerWidth / 4}
            height={innerHeight / 4}
            patternUnits="userSpaceOnUse"
            x={padding}
            y={padding}
          >
            <path
              d={`M ${innerWidth / 4} 0 L 0 0 0 ${innerHeight / 4}`}
              fill="none"
              stroke="#2a2a3e"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect
          x={padding}
          y={padding}
          width={innerWidth}
          height={innerHeight}
          fill="url(#grid)"
        />

        {/* Diagonal reference line */}
        <line
          x1={p0.x}
          y1={p0.y}
          x2={p3.x}
          y2={p3.y}
          stroke="#2a2a3e"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Control handles */}
        <line
          x1={p0.x}
          y1={p0.y}
          x2={p1.x}
          y2={p1.y}
          stroke="#6366f1"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <line
          x1={p3.x}
          y1={p3.y}
          x2={p2.x}
          y2={p2.y}
          stroke="#6366f1"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Bezier curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Start point */}
        <circle
          cx={p0.x}
          cy={p0.y}
          r="4"
          fill="#1a1a24"
          stroke="#6366f1"
          strokeWidth="2"
        />

        {/* End point */}
        <circle
          cx={p3.x}
          cy={p3.y}
          r="4"
          fill="#1a1a24"
          stroke="#6366f1"
          strokeWidth="2"
        />

        {/* Control point P1 */}
        <circle
          cx={p1.x}
          cy={p1.y}
          r="6"
          fill="#6366f1"
          stroke="#fff"
          strokeWidth="2"
          style={{ cursor: 'grab' }}
          onMouseDown={handleMouseDown('p1')}
        />

        {/* Control point P2 */}
        <circle
          cx={p2.x}
          cy={p2.y}
          r="6"
          fill="#6366f1"
          stroke="#fff"
          strokeWidth="2"
          style={{ cursor: 'grab' }}
          onMouseDown={handleMouseDown('p2')}
        />
      </svg>

      {/* Numeric values */}
      <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
        <span>({x1.toFixed(2)}, {y1.toFixed(2)})</span>
        <span>({x2.toFixed(2)}, {y2.toFixed(2)})</span>
      </div>
    </div>
  );
}
