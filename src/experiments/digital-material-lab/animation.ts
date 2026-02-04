/**
 * Animation system with cubic bezier easing
 *
 * Implements a global timeline architecture where individual motions
 * can be positioned, overlapped, and independently eased.
 */

export type BezierCurve = [number, number, number, number];

export interface Motion {
  name: string;
  startT: number; // Start position on timeline (0-1)
  endT: number;   // End position on timeline (0-1)
  curve: BezierCurve;
}

export interface AnimationConfig {
  duration: number;
  curve: BezierCurve;
  motions: Motion[];
}

export interface AnimationState {
  isAnimating: boolean;
  globalTime: number;      // 0-1 position on timeline
  startTimestamp: number;  // When animation started
  motionProgress: Map<string, number>;
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
 * Using de Casteljau's algorithm for numerical stability
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

function bezierDX(t: number, x1: number, x2: number): number {
  const t2 = t * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  return 3 * mt2 * x1 + 6 * mt * t * (x2 - x1) + 3 * t2 * (1 - x2);
}

/**
 * Animation Controller
 *
 * Manages the global timeline and individual motion progress
 */
export class AnimationController {
  private config: AnimationConfig;
  private state: AnimationState;

  constructor(config: AnimationConfig) {
    this.config = config;
    this.state = {
      isAnimating: false,
      globalTime: 0,
      startTimestamp: 0,
      motionProgress: new Map(),
    };
  }

  setConfig(config: AnimationConfig) {
    this.config = config;
  }

  start(timestamp: number) {
    this.state.isAnimating = true;
    this.state.startTimestamp = timestamp;
    this.state.globalTime = 0;
    this.state.motionProgress.clear();
  }

  reset() {
    this.state.isAnimating = false;
    this.state.globalTime = 0;
    this.state.motionProgress.clear();
  }

  update(timestamp: number) {
    if (!this.state.isAnimating) return;

    const elapsed = timestamp - this.state.startTimestamp;
    const rawProgress = Math.min(elapsed / this.config.duration, 1);

    // Apply master curve
    this.state.globalTime = cubicBezier(rawProgress, this.config.curve);

    // Update individual motions
    for (const motion of this.config.motions) {
      const motionProgress = this.calculateMotionProgress(rawProgress, motion);
      this.state.motionProgress.set(motion.name, motionProgress);
    }

    // Check if animation completed
    if (rawProgress >= 1) {
      this.state.isAnimating = false;
      this.state.globalTime = 1;
    }
  }

  private calculateMotionProgress(globalT: number, motion: Motion): number {
    const { startT, endT, curve } = motion;

    // Check if we're before the motion starts
    if (globalT < startT) return 0;

    // Check if we're after the motion ends
    if (globalT >= endT) return 1;

    // Calculate local progress within motion's time range
    const localT = (globalT - startT) / (endT - startT);

    // Apply motion's curve
    return cubicBezier(localT, curve);
  }

  getProgress(): number {
    return this.state.globalTime;
  }

  getMotionProgress(name: string): number {
    return this.state.motionProgress.get(name) ?? 0;
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
