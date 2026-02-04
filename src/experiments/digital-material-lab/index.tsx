import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings as SettingsIcon, RotateCcw } from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';
import { createWebGLContext, compileShader, createProgram } from './webgl';
import { AnimationController } from './animation';
import { vertexShaderSource, fragmentShaderSource } from './shaders';

export interface MaterialUniforms {
  // Animation
  animProgress: number;
  rectSize: [number, number];
  cornerRadius: number;

  // Lighting
  lightIntensity: number;
  lightColor: [number, number, number];
  lightDiffusion: number;
  lightDirection: [number, number];
  lightFocus: number;

  // Material
  emission: number;
  transparency: number;
  refraction: number;
  dispersion: number;
  absorption: number;
  scattering: number;
  reflection: number;

  // Shadows
  shadowIntensity: number;
  shadowSoftness: number;
  shadowOffset: [number, number];

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
  motions: Array<{
    name: string;
    startT: number;
    endT: number;
    curve: [number, number, number, number];
  }>;
}

const defaultUniforms: MaterialUniforms = {
  animProgress: 0,
  rectSize: [0.2, 0.15],
  cornerRadius: 0.08,

  lightIntensity: 1.5,
  lightColor: [0.7, 0.5, 1.0],
  lightDiffusion: 0.5,
  lightDirection: [0.0, 0.3],
  lightFocus: 0.6,

  emission: 0.8,
  transparency: 0.2,
  refraction: 0.15,
  dispersion: 0.02,
  absorption: 0.3,
  scattering: 0.4,
  reflection: 0.1,

  shadowIntensity: 0.4,
  shadowSoftness: 0.3,
  shadowOffset: [0.02, -0.04],

  viscosity: 0.5,
  elasticity: 0.6,
  surfaceTension: 0.4,
  momentum: 0.5,
  gravAttention: 0.3,
};

const defaultAnimConfig: AnimationConfig = {
  duration: 800,
  curve: [0.34, 1.56, 0.64, 1],
  motions: [
    { name: 'size', startT: 0, endT: 0.6, curve: [0.34, 1.56, 0.64, 1] },
    { name: 'glow', startT: 0.1, endT: 0.8, curve: [0.25, 0.1, 0.25, 1] },
    { name: 'radius', startT: 0, endT: 0.5, curve: [0.4, 0, 0.2, 1] },
  ],
};

export function DigitalMaterialLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationRef = useRef<number>(0);
  const animControllerRef = useRef<AnimationController | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [uniforms, setUniforms] = useState<MaterialUniforms>(defaultUniforms);
  const [animConfig, setAnimConfig] = useState<AnimationConfig>(defaultAnimConfig);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pointerPos, setPointerPos] = useState<[number, number]>([0, 0]);

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

    let startTime = performance.now();

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
      const targetSize: [number, number] = isExpanded ? [0.35, 0.25] : [0.2, 0.15];
      const baseSize: [number, number] = isExpanded ? [0.2, 0.15] : [0.35, 0.25];
      const targetRadius = isExpanded ? 0.12 : 0.08;
      const baseRadius = isExpanded ? 0.08 : 0.12;

      const currentSize: [number, number] = [
        baseSize[0] + (targetSize[0] - baseSize[0]) * animProgress,
        baseSize[1] + (targetSize[1] - baseSize[1]) * animProgress,
      ];
      const currentRadius = baseRadius + (targetRadius - baseRadius) * animProgress;

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

      const setUniform3f = (name: string, x: number, y: number, z: number) => {
        const loc = gl.getUniformLocation(program, name);
        if (loc) gl.uniform3f(loc, x, y, z);
      };

      // Resolution and time
      setUniform2f('u_resolution', canvas.width, canvas.height);
      setUniform1f('u_time', elapsed);
      setUniform1f('u_animProgress', animProgress);

      // Geometry
      setUniform2f('u_rectSize', currentSize[0], currentSize[1]);
      setUniform1f('u_cornerRadius', currentRadius);

      // Lighting
      setUniform1f('u_lightIntensity', uniforms.lightIntensity);
      setUniform3f('u_lightColor', uniforms.lightColor[0], uniforms.lightColor[1], uniforms.lightColor[2]);
      setUniform1f('u_lightDiffusion', uniforms.lightDiffusion);
      setUniform2f('u_lightDirection', uniforms.lightDirection[0], uniforms.lightDirection[1]);
      setUniform1f('u_lightFocus', uniforms.lightFocus);

      // Material
      setUniform1f('u_emission', uniforms.emission);
      setUniform1f('u_transparency', uniforms.transparency);
      setUniform1f('u_refraction', uniforms.refraction);
      setUniform1f('u_dispersion', uniforms.dispersion);
      setUniform1f('u_absorption', uniforms.absorption);
      setUniform1f('u_scattering', uniforms.scattering);
      setUniform1f('u_reflection', uniforms.reflection);

      // Shadows
      setUniform1f('u_shadowIntensity', uniforms.shadowIntensity);
      setUniform1f('u_shadowSoftness', uniforms.shadowSoftness);
      setUniform2f('u_shadowOffset', uniforms.shadowOffset[0], uniforms.shadowOffset[1]);

      // Digital Material
      setUniform1f('u_viscosity', uniforms.viscosity);
      setUniform1f('u_elasticity', uniforms.elasticity);
      setUniform1f('u_surfaceTension', uniforms.surfaceTension);
      setUniform1f('u_momentum', uniforms.momentum);
      setUniform1f('u_gravAttention', uniforms.gravAttention);

      // Pointer
      setUniform2f('u_pointerPos', pointerPos[0], pointerPos[1]);

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
  }, [uniforms, isExpanded, pointerPos]);

  // Handle canvas click
  const handleCanvasClick = useCallback(() => {
    const animController = animControllerRef.current;
    if (animController) {
      setIsExpanded(!isExpanded);
      animController.start(performance.now());
    }
  }, [isExpanded]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setPointerPos([x, y]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setShowSettings(prev => !prev);
      } else if (e.key === ' ') {
        e.preventDefault();
        handleCanvasClick();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setUniforms(defaultUniforms);
        setAnimConfig(defaultAnimConfig);
        setIsExpanded(false);
        if (animControllerRef.current) {
          animControllerRef.current.reset();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCanvasClick]);

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
    <div className="h-screen w-screen bg-[#0d0d14] overflow-hidden relative">
      {/* Back Navigation */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a24]/80 backdrop-blur-sm text-gray-400 hover:text-white hover:bg-[#2a2a3e] transition-all text-sm border border-[#2a2a3e]/50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lab</span>
        </Link>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a24]/80 backdrop-blur-sm text-gray-400 hover:text-white hover:bg-[#2a2a3e] transition-all text-sm border border-[#2a2a3e]/50"
          title="Reset (R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm transition-all text-sm border ${
            showSettings
              ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
              : 'bg-[#1a1a24]/80 text-gray-400 hover:text-white hover:bg-[#2a2a3e] border-[#2a2a3e]/50'
          }`}
          title="Settings (S)"
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-4 left-4 z-50 text-gray-600 text-xs">
        <span className="opacity-60">Click canvas to animate</span>
        <span className="mx-2 opacity-40">|</span>
        <span className="opacity-60">S: Settings</span>
        <span className="mx-2 opacity-40">|</span>
        <span className="opacity-60">R: Reset</span>
        <span className="mx-2 opacity-40">|</span>
        <span className="opacity-60">Space: Toggle</span>
      </div>

      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 text-center">
        <h1 className="text-lg font-medium text-white/80">Digital Material Lab</h1>
        <p className="text-xs text-gray-500 mt-0.5">Phase 1: Foundation</p>
      </div>

      {/* WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
        onPointerMove={handlePointerMove}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        uniforms={uniforms}
        onUniformsChange={setUniforms}
        animConfig={animConfig}
        onAnimConfigChange={setAnimConfig}
      />
    </div>
  );
}

export default DigitalMaterialLab;
