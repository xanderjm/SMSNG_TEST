import { useState, useCallback, useRef, useEffect } from 'react';
import type { BezierCurve } from './animation';

interface BezierCurveEditorProps {
  value: BezierCurve;
  onChange: (value: BezierCurve) => void;
  // Optional: allow start/end Y points to be adjustable
  curveStart?: number;
  curveEnd?: number;
  onCurveStartChange?: (value: number) => void;
  onCurveEndChange?: (value: number) => void;
  width?: number;
  height?: number;
}

export function BezierCurveEditor({
  value,
  onChange,
  curveStart,
  curveEnd,
  onCurveStartChange,
  onCurveEndChange,
  width = 200,
  height = 120,
}: BezierCurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'p0' | 'p1' | 'p2' | 'p3' | null>(null);

  const hasAdjustableEndpoints = curveStart !== undefined && curveEnd !== undefined;

  const padding = 16;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // Control points in normalized space (0-1)
  const [x1, y1, x2, y2] = value;

  // Start and end Y values (0 and 1 if not adjustable)
  const startY = curveStart ?? 0;
  const endY = curveEnd ?? 1;

  // Convert to SVG coordinates
  const toSvgX = (x: number) => padding + x * innerWidth;
  const toSvgY = (y: number) => padding + (1 - y) * innerHeight;

  // Convert from SVG coordinates
  const fromSvgX = (svgX: number) => Math.max(0, Math.min(1, (svgX - padding) / innerWidth));
  const fromSvgY = (svgY: number) => Math.max(0, Math.min(1, 1 - (svgY - padding) / innerHeight));

  // Points in SVG space
  const p0 = { x: toSvgX(0), y: toSvgY(startY) };
  const p3 = { x: toSvgX(1), y: toSvgY(endY) };
  const p1 = { x: toSvgX(x1), y: toSvgY(y1) };
  const p2 = { x: toSvgX(x2), y: toSvgY(y2) };

  // Generate the bezier path
  const pathD = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;

  const handleMouseDown = useCallback((point: 'p0' | 'p1' | 'p2' | 'p3') => (e: React.MouseEvent) => {
    e.preventDefault();
    // Only allow p0/p3 dragging if endpoints are adjustable
    if ((point === 'p0' || point === 'p3') && !hasAdjustableEndpoints) return;
    setDragging(point);
  }, [hasAdjustableEndpoints]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;

    const x = fromSvgX(svgX);
    const y = fromSvgY(svgY);

    if (dragging === 'p0' && onCurveStartChange) {
      onCurveStartChange(y);
    } else if (dragging === 'p3' && onCurveEndChange) {
      onCurveEndChange(y);
    } else if (dragging === 'p1') {
      onChange([x, y, x2, y2]);
    } else if (dragging === 'p2') {
      onChange([x1, y1, x, y]);
    }
  }, [dragging, onChange, onCurveStartChange, onCurveEndChange, x1, y1, x2, y2]);

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

        {/* Diagonal reference line (from startY to endY) */}
        <line
          x1={p0.x}
          y1={p0.y}
          x2={p3.x}
          y2={p3.y}
          stroke="#2a2a3e"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Horizontal reference lines for adjustable endpoints */}
        {hasAdjustableEndpoints && (
          <>
            <line
              x1={padding}
              y1={p0.y}
              x2={padding + innerWidth}
              y2={p0.y}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.3"
            />
            <line
              x1={padding}
              y1={p3.y}
              x2={padding + innerWidth}
              y2={p3.y}
              stroke="#f43f5e"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.3"
            />
          </>
        )}

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

        {/* Start point (P0) - draggable if adjustable */}
        <circle
          cx={p0.x}
          cy={p0.y}
          r={hasAdjustableEndpoints ? 6 : 4}
          fill={hasAdjustableEndpoints ? '#10b981' : '#1a1a24'}
          stroke={hasAdjustableEndpoints ? '#fff' : '#6366f1'}
          strokeWidth="2"
          style={{ cursor: hasAdjustableEndpoints ? 'ns-resize' : 'default' }}
          onMouseDown={handleMouseDown('p0')}
        />

        {/* End point (P3) - draggable if adjustable */}
        <circle
          cx={p3.x}
          cy={p3.y}
          r={hasAdjustableEndpoints ? 6 : 4}
          fill={hasAdjustableEndpoints ? '#f43f5e' : '#1a1a24'}
          stroke={hasAdjustableEndpoints ? '#fff' : '#6366f1'}
          strokeWidth="2"
          style={{ cursor: hasAdjustableEndpoints ? 'ns-resize' : 'default' }}
          onMouseDown={handleMouseDown('p3')}
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
      <div className="flex justify-between mt-2 text-[10px] font-mono">
        {hasAdjustableEndpoints ? (
          <>
            <span className="text-emerald-400">Start: {startY.toFixed(2)}</span>
            <span className="text-rose-400">End: {endY.toFixed(2)}</span>
          </>
        ) : (
          <>
            <span className="text-gray-500">({x1.toFixed(2)}, {y1.toFixed(2)})</span>
            <span className="text-gray-500">({x2.toFixed(2)}, {y2.toFixed(2)})</span>
          </>
        )}
      </div>
    </div>
  );
}
