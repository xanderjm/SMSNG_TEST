/**
 * Animation system with cubic bezier easing
 *
 * Implements a global timeline architecture. Effect calculations
 * are handled separately via the calculateEffectValue function in index.tsx.
 */

export type BezierCurve = [number, number, number, number];

// Simplified config - just needs duration and master curve
// Effects are handled separately
export interface AnimationConfig {
  duration: number;
  curve: BezierCurve;
}

export interface AnimationState {
  isAnimating: boolean;
  globalTime: number;      // 0-1 position on timeline (after master curve applied)
  rawProgress: number;     // 0-1 raw progress (before curve)
  startTimestamp: number;  // When animation started
}

// Preset curves
export const CURVES = {
  linear: [0, 0, 1, 1] as BezierCurve,
  ease: [0.25, 0.1, 0.25, 1] as BezierCurve,
  easeIn: [0.42, 0, 1, 1] as BezierCurve,
  easeOut: [0, 0, 0.58, 1] as BezierCurve,
  easeInOut: [0.42, 0, 0.58, 1] as BezierCurve,
  elastic: [0.34, 1.56, 0.64, 1] as BezierCurve,
  bounce: [0.68, -0.55, 0.265, 1.55] as BezierCurve,
  sharp: [0.4, 0, 0.2, 1] as BezierCurve,
  smooth: [0.4, 0, 0.2, 1] as BezierCurve,
};

/**
 * Evaluate cubic bezier at parameter t
 * Using Newton-Raphson iteration for numerical stability
 */
export function cubicBezier(t: number, curve: BezierCurve): number {
  const [x1, y1, x2, y2] = curve;

  // Newton-Raphson iteration to find t for given x
  const epsilon = 1e-6;
  let tGuess = t;

  for (let i = 0; i < 8; i++) {
    const x = bezierX(tGuess, x1, x2) - t;
    if (Math.abs(x) < epsilon) break;
    const dx = bezierDX(tGuess, x1, x2);
    if (Math.abs(dx) < epsilon) break;
    tGuess -= x / dx;
  }

  return bezierY(tGuess, y1, y2);
}

function bezierX(t: number, x1: number, x2: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  return 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3;
}

function bezierY(t: number, y1: number, y2: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  return 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3;
}

/**
 * Evaluate bezier Y with custom start/end Y values
 * P0.y = y0, P1.y = y1, P2.y = y2, P3.y = y3
 */
function bezierYFull(t: number, y0: number, y1: number, y2: number, y3: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  return mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3;
}

/**
 * Solve for bezier parameter t given x value
 * Uses Newton-Raphson iteration
 */
export function solveBezierT(x: number, x1: number, x2: number): number {
  const epsilon = 1e-6;
  let tGuess = x;

  for (let i = 0; i < 8; i++) {
    const currentX = bezierX(tGuess, x1, x2) - x;
    if (Math.abs(currentX) < epsilon) break;
    const dx = bezierDX(tGuess, x1, x2);
    if (Math.abs(dx) < epsilon) break;
    tGuess -= currentX / dx;
    tGuess = Math.max(0, Math.min(1, tGuess));
  }

  return tGuess;
}

/**
 * Evaluate bezier curve with custom Y endpoints
 * This allows curves where start and end are the same but control points create a parabola
 *
 * @param x - The x position (0-1)
 * @param curve - [x1, y1, x2, y2] control points
 * @param yStart - Y value at x=0
 * @param yEnd - Y value at x=1
 */
export function cubicBezierWithEndpoints(
  x: number,
  curve: BezierCurve,
  yStart: number,
  yEnd: number
): number {
  const [x1, y1, x2, y2] = curve;
  const t = solveBezierT(x, x1, x2);
  return bezierYFull(t, yStart, y1, y2, yEnd);
}

function bezierDX(t: number, x1: number, x2: number): number {
  const t2 = t * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  return 3 * mt2 * x1 + 6 * mt * t * (x2 - x1) + 3 * t2 * (1 - x2);
}

/**
 * Animation Controller
 *
 * Manages the global timeline progress. Individual effect values
 * are calculated externally using calculateEffectValue().
 */
export class AnimationController {
  private duration: number;
  private curve: BezierCurve;
  private state: AnimationState;

  constructor(config: AnimationConfig) {
    this.duration = config.duration;
    this.curve = config.curve;
    this.state = {
      isAnimating: false,
      globalTime: 0,
      rawProgress: 0,
      startTimestamp: 0,
    };
  }

  setConfig(config: AnimationConfig) {
    this.duration = config.duration;
    this.curve = config.curve;
  }

  start(timestamp: number) {
    this.state.isAnimating = true;
    this.state.startTimestamp = timestamp;
    this.state.globalTime = 0;
    this.state.rawProgress = 0;
  }

  reset() {
    this.state.isAnimating = false;
    this.state.globalTime = 0;
    this.state.rawProgress = 0;
  }

  update(timestamp: number) {
    if (!this.state.isAnimating) return;

    const elapsed = timestamp - this.state.startTimestamp;
    const rawProgress = Math.min(elapsed / this.duration, 1);
    this.state.rawProgress = rawProgress;

    // Apply master curve
    this.state.globalTime = cubicBezier(rawProgress, this.curve);

    // Check if animation completed
    if (rawProgress >= 1) {
      this.state.isAnimating = false;
      this.state.globalTime = 1;
      this.state.rawProgress = 1;
    }
  }

  getProgress(): number {
    return this.state.globalTime;
  }

  getRawProgress(): number {
    return this.state.rawProgress;
  }

  isAnimating(): boolean {
    return this.state.isAnimating;
  }

  getState(): AnimationState {
    return { ...this.state };
  }
}

/**
 * Interpolate between two values using eased progress
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate between two arrays
 */
export function lerpArray(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => lerp(v, b[i], t));
}

/**
 * Spring physics for elastic animations
 */
export function spring(
  current: number,
  target: number,
  velocity: number,
  stiffness: number = 100,
  damping: number = 10,
  mass: number = 1,
  dt: number = 1 / 60
): { position: number; velocity: number } {
  const springForce = -stiffness * (current - target);
  const dampingForce = -damping * velocity;
  const acceleration = (springForce + dampingForce) / mass;

  const newVelocity = velocity + acceleration * dt;
  const newPosition = current + newVelocity * dt;

  return { position: newPosition, velocity: newVelocity };
}
