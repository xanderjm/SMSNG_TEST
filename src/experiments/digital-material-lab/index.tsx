import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';
import { createWebGLContext, compileShader, createProgram } from './webgl';
import { AnimationController } from './animation';
import { vertexShaderSource, fragmentShaderSource } from './shaders';

export interface MaterialUniforms {
  // Animation
  animProgress: number;
  rectSize: [number, number];
  cornerRadius: number;

  // Digital Material (keeping only these)
  viscosity: number;
  elasticity: number;
  surfaceTension: number;
  momentum: number;
  gravAttention: number;
}

export interface AnimationConfig {
  duration: number;
  curve: [number, number, number, number];
  motions: Array<{
    name: string;
    startT: number;
    endT: number;
    curve: [number, number, number, number];
  }>;
}

// Capsule dimensions in pixels (based on ~1440 height viewport)
// Contracted: 1260 x 180 with 60px corners
// Expanded: 1260 x 1440
// Convert to normalized UV space (divided by viewport height, then halved for half-size)
const CONTRACTED_SIZE: [number, number] = [1260 / 2 / 1440, 180 / 2 / 1440]; // [0.4375, 0.0625]
const EXPANDED_SIZE: [number, number] = [1260 / 2 / 1440, 1440 / 2 / 1440];   // [0.4375, 0.5]
const CORNER_RADIUS = 60 / 1440; // 0.042

const defaultUniforms: MaterialUniforms = {
  animProgress: 0,
  rectSize: CONTRACTED_SIZE,
  cornerRadius: CORNER_RADIUS,

  // Digital Physics
  viscosity: 0.5,
  elasticity: 0.6,
  surfaceTension: 0.4,
  momentum: 0.5,
  gravAttention: 0.0, // Disabled by default for mobile
};

const defaultAnimConfig: AnimationConfig = {
  duration: 800,
  curve: [0.34, 1.56, 0.64, 1],
  motions: [
    { name: 'size', startT: 0, endT: 0.6, curve: [0.34, 1.56, 0.64, 1] },
    { name: 'radius', startT: 0, endT: 0.5, curve: [0.4, 0, 0.2, 1] },
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

    // Compile shaders and create program
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

    // Create fullscreen quad
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

    // Initialize animation controller
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
      let animProgress = uniforms.animProgress;
      if (animController) {
        animController.update(currentTime);
        animProgress = animController.getProgress();
      }

      // Calculate animated values based on expansion state and progress
      const targetSize: [number, number] = isExpanded ? EXPANDED_SIZE : CONTRACTED_SIZE;
      const baseSize: [number, number] = isExpanded ? CONTRACTED_SIZE : EXPANDED_SIZE;

      const currentSize: [number, number] = [
        baseSize[0] + (targetSize[0] - baseSize[0]) * animProgress,
        baseSize[1] + (targetSize[1] - baseSize[1]) * animProgress,
      ];

      gl.useProgram(program);

      // Set uniforms
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
      setUniform1f('u_animProgress', animProgress);

      // Geometry
      setUniform2f('u_rectSize', currentSize[0], currentSize[1]);
      setUniform1f('u_cornerRadius', uniforms.cornerRadius);

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
  }, [uniforms, isExpanded]);

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
