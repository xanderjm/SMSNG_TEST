import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';
import { createWebGLContext, compileShader, createProgram } from './webgl';
import { AnimationController } from './animation';
import type { CurvePoint } from './MultiPointCurveEditor';
import { evaluateCatmullRom } from './MultiPointCurveEditor';
import { vertexShaderSource, fragmentShaderSource } from './shaders';

// Effect definition - the basis for all animated effects
// Effects use a multi-point curve to define how the value changes during expansion
export interface Effect {
  id: string;
  name: string;
  enabled: boolean;
  min: number;             // Minimum possible value (absolute)
  max: number;             // Maximum possible value (absolute)
  startT: number;          // When effect starts transitioning (0-1 of expansion)
  endT: number;            // When effect finishes transitioning (0-1 of expansion)
  curvePoints: CurvePoint[];  // Multi-point curve (x=timeline position, y=effect value 0-1)
}

export interface MaterialUniforms {
  // Animation
  animProgress: number;
  rectSize: [number, number];
  cornerRadius: number;

  // Digital Material
  viscosity: number;
  elasticity: number;
  surfaceTension: number;
  momentum: number;
  gravAttention: number;
}

export interface AnimationConfig {
  duration: number;
  curve: [number, number, number, number];
  effects: Effect[];
}

// Calculate the current value of an effect based on expansion progress
// expansionProgress: 0 = fully contracted, 1 = fully expanded
export function calculateEffectValue(effect: Effect, expansionProgress: number): number {
  const { startT, endT, min, max, curvePoints, enabled } = effect;

  // Get start and end values from curve points
  const startValue = curvePoints[0]?.y ?? 0;
  const endValue = curvePoints[curvePoints.length - 1]?.y ?? 1;

  // If disabled, return the value at curve start position (contracted state)
  if (!enabled) {
    return min + (max - min) * startValue;
  }

  // Before effect's timeline window - stay at start value
  if (expansionProgress <= startT) {
    return min + (max - min) * startValue;
  }

  // After effect's timeline window - stay at end value
  if (expansionProgress >= endT) {
    return min + (max - min) * endValue;
  }

  // During effect's timeline window - interpolate using multi-point curve
  const localProgress = (expansionProgress - startT) / (endT - startT);
  const curveOutput = evaluateCatmullRom(curvePoints, localProgress);

  // curveOutput is already in 0-1 effect space, map to min-max
  return min + (max - min) * curveOutput;
}

// Capsule dimensions in pixels (based on ~1440 height viewport)
const CONTRACTED_SIZE: [number, number] = [1260 / 2 / 1440, 180 / 2 / 1440];
const EXPANDED_SIZE: [number, number] = [1260 / 2 / 1440, 1440 / 2 / 1440];

const defaultUniforms: MaterialUniforms = {
  animProgress: 0,
  rectSize: CONTRACTED_SIZE,
  cornerRadius: 60 / 1440,

  // Digital Physics
  viscosity: 0.5,
  elasticity: 0.6,
  surfaceTension: 0.4,
  momentum: 0.5,
  gravAttention: 0.0,
};

const defaultAnimConfig: AnimationConfig = {
  duration: 800,
  curve: [0.34, 1.56, 0.64, 1],
  effects: [
    {
      id: 'cornerRadius',
      name: 'Corner Roundness',
      enabled: true,
      min: 0.01,              // Minimum corner radius
      max: 0.15,              // Maximum corner radius
      startT: 0,              // Effect starts at beginning of expansion
      endT: 1,                // Effect ends at full expansion
      curvePoints: [          // Multi-point curve (add points by double-clicking)
        { x: 0, y: 0 },       // Start: contracted state (min value)
        { x: 1, y: 1 },       // End: expanded state (max value)
      ],
    },
  ],
};

export function DigitalMaterialLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationRef = useRef<number>(0);
  const animControllerRef = useRef<AnimationController | null>(null);

  const [uniforms, setUniforms] = useState<MaterialUniforms>(defaultUniforms);
  const [animConfig, setAnimConfig] = useState<AnimationConfig>(defaultAnimConfig);
  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = createWebGLContext(canvas);
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    const vertShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertShader || !fragShader) {
      console.error('Failed to compile shaders');
      return;
    }

    const program = createProgram(gl, vertShader, fragShader);
    if (!program) {
      console.error('Failed to create program');
      return;
    }
    programRef.current = program;

    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    animControllerRef.current = new AnimationController(animConfig);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const gl = glRef.current;
      if (!canvas || !gl) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render loop
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;
    if (!gl || !program || !canvas) return;

    const startTime = performance.now();

    const render = () => {
      const currentTime = performance.now();
      const elapsed = (currentTime - startTime) / 1000;

      // Update animation
      const animController = animControllerRef.current;
      let masterProgress = 0;
      if (animController) {
        animController.update(currentTime);
        masterProgress = animController.getProgress();
      }

      // Calculate expansion progress (0 = contracted, 1 = expanded)
      // When expanding: expansionProgress goes 0→1
      // When collapsing: expansionProgress goes 1→0
      const expansionProgress = isExpanded ? masterProgress : (1 - masterProgress);

      // Calculate current size based on expansion progress
      const currentSize: [number, number] = [
        CONTRACTED_SIZE[0] + (EXPANDED_SIZE[0] - CONTRACTED_SIZE[0]) * expansionProgress,
        CONTRACTED_SIZE[1] + (EXPANDED_SIZE[1] - CONTRACTED_SIZE[1]) * expansionProgress,
      ];

      // Calculate effect values using expansion progress
      const cornerRadiusEffect = animConfig.effects.find(e => e.id === 'cornerRadius');
      const rawCornerRadius = cornerRadiusEffect
        ? calculateEffectValue(cornerRadiusEffect, expansionProgress)
        : uniforms.cornerRadius;

      // Clamp corner radius to half the shortest edge to prevent pinching
      // currentSize stores half-dimensions, so min(w, h) gives us the max valid radius
      const maxCornerRadius = Math.min(currentSize[0], currentSize[1]);
      const currentCornerRadius = Math.min(rawCornerRadius, maxCornerRadius);

      gl.useProgram(program);

      const setUniform1f = (name: string, value: number) => {
        const loc = gl.getUniformLocation(program, name);
        if (loc) gl.uniform1f(loc, value);
      };

      const setUniform2f = (name: string, x: number, y: number) => {
        const loc = gl.getUniformLocation(program, name);
        if (loc) gl.uniform2f(loc, x, y);
      };

      // Resolution and time
      setUniform2f('u_resolution', canvas.width, canvas.height);
      setUniform1f('u_time', elapsed);
      setUniform1f('u_animProgress', masterProgress);

      // Geometry - use calculated effect values
      setUniform2f('u_rectSize', currentSize[0], currentSize[1]);
      setUniform1f('u_cornerRadius', currentCornerRadius);

      // Digital Material
      setUniform1f('u_viscosity', uniforms.viscosity);
      setUniform1f('u_elasticity', uniforms.elasticity);
      setUniform1f('u_surfaceTension', uniforms.surfaceTension);
      setUniform1f('u_momentum', uniforms.momentum);
      setUniform1f('u_gravAttention', uniforms.gravAttention);

      // Clear and draw
      gl.clearColor(0.05, 0.05, 0.08, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [uniforms, isExpanded, animConfig]);

  // Handle canvas click (touch-friendly)
  const handleCanvasClick = useCallback(() => {
    const animController = animControllerRef.current;
    if (animController) {
      setIsExpanded(!isExpanded);
      animController.start(performance.now());
    }
  }, [isExpanded]);

  // Update animation config
  useEffect(() => {
    if (animControllerRef.current) {
      animControllerRef.current.setConfig(animConfig);
    }
  }, [animConfig]);

  const handleReset = () => {
    setUniforms(defaultUniforms);
    setAnimConfig(defaultAnimConfig);
    setIsExpanded(false);
    if (animControllerRef.current) {
      animControllerRef.current.reset();
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0d0d14] overflow-hidden relative flex">
      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {/* Back Navigation */}
        <div className="absolute top-4 left-4 z-50">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a24]/80 backdrop-blur-sm text-gray-400 active:bg-[#2a2a3e] transition-all text-sm border border-[#2a2a3e]/50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>

        {/* Reset Button */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a24]/80 backdrop-blur-sm text-gray-400 active:bg-[#2a2a3e] transition-all text-sm border border-[#2a2a3e]/50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 text-center">
          <h1 className="text-lg font-medium text-white/80">Digital Material Lab</h1>
        </div>

        {/* Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-gray-600 text-xs">
          <span className="opacity-60">Tap to animate</span>
        </div>

        {/* WebGL Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer touch-none"
          onClick={handleCanvasClick}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleCanvasClick();
          }}
        />
      </div>

      {/* Settings Panel - Always visible */}
      <SettingsPanel
        uniforms={uniforms}
        onUniformsChange={setUniforms}
        animConfig={animConfig}
        onAnimConfigChange={setAnimConfig}
      />
    </div>
  );
}

export default DigitalMaterialLab;
