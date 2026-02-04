import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';
import { createWebGLContext, compileShader, createProgram } from './webgl';
import { AnimationController } from './animation';
import type { CurvePoint } from './MultiPointCurveEditor';
import { evaluateCatmullRom } from './MultiPointCurveEditor';
import { vertexShaderSource, fragmentShaderSource } from './shaders';

// Canvas dimensions (Samsung screen ratio)
export const CANVAS_WIDTH = 1440;
export const CANVAS_HEIGHT = 3120;

// Viewport mode type
export type ViewportMode = 'fit' | '1:1';

// Color stop for gradient ramps
export interface ColorStop {
  position: number;        // 0-1 position in the gradient
  color: [number, number, number];  // RGB values 0-1
}

// Variable definition - each variable maps the shared curve to its own min/max range
export interface EffectVariable {
  id: string;
  name: string;
  min: number;             // Value when curve = 0
  max: number;             // Value when curve = 1
}

// Effect definition - single curve shared by all variables
export interface Effect {
  id: string;
  name: string;
  enabled: boolean;
  mode: 'state' | 'animate';  // 'state' = follows expansion state, 'animate' = always plays forward
  startT: number;          // When effect starts transitioning (0-1 of timeline)
  endT: number;            // When effect finishes transitioning (0-1 of timeline)
  curvePoints: CurvePoint[];  // Single shared curve (all variables use this)
  variables: EffectVariable[];  // Each variable has its own min/max
  colorRamp?: ColorStop[];  // Optional color ramp for effects that use colors (e.g., trail)
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
  backgroundImage?: string;  // Optional background image URL/data URI
}

// Calculate the current value of a specific variable within an effect
// All variables share the same curve - the curve output (0-1) maps to each variable's min/max
// - For 'state' mode: use expansionProgress (0=contracted, 1=expanded)
// - For 'animate' mode: use masterProgress (always 0→1 on each trigger)
export function calculateVariableValue(
  effect: Effect,
  variableId: string,
  expansionProgress: number,
  masterProgress: number
): number {
  const { startT, endT, enabled, mode, curvePoints, variables } = effect;

  // Find the variable
  const variable = variables.find(v => v.id === variableId);
  if (!variable) return 0;

  const { min, max } = variable;

  // Choose which progress to use based on mode
  const progress = mode === 'animate' ? masterProgress : expansionProgress;

  // Get start and end values from the SHARED curve points
  const startValue = curvePoints[0]?.y ?? 0;
  const endValue = curvePoints[curvePoints.length - 1]?.y ?? 1;

  // If disabled, return the minimum value (effect is "off")
  if (!enabled) {
    return min;
  }

  // Before effect's timeline window - stay at start value
  if (progress <= startT) {
    return min + (max - min) * startValue;
  }

  // After effect's timeline window - stay at end value
  if (progress >= endT) {
    return min + (max - min) * endValue;
  }

  // During effect's timeline window - interpolate using shared multi-point curve
  const localProgress = (progress - startT) / (endT - startT);
  const curveOutput = evaluateCatmullRom(curvePoints, localProgress);

  // curveOutput is 0-1, map to this variable's min-max range
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

// Effect templates - available effects that can be added
export const EFFECT_TEMPLATES: Record<string, Effect> = {
  cornerRadius: {
    id: 'cornerRadius',
    name: 'Corner Shape',
    enabled: true,            // Enabled when added
    mode: 'state',            // Follows expansion state (different when expanded vs contracted)
    startT: 0,                // Effect starts at beginning of expansion
    endT: 1,                  // Effect ends at full expansion
    curvePoints: [            // Single shared curve for all variables
      { x: 0, y: 0 },         // Start: contracted state (curve = 0)
      { x: 1, y: 1 },         // End: expanded state (curve = 1)
    ],
    variables: [
      {
        id: 'roundness',
        name: 'Roundness',
        min: 0.01,              // Value at curve=0 (contracted)
        max: 0.15,              // Value at curve=1 (expanded)
      },
      {
        id: 'squircle',
        name: 'Squircle',
        min: 2.0,               // Value at curve=0: standard circle (n=2)
        max: 5.0,               // Value at curve=1: iOS-style squircle (n=5)
      },
    ],
  },
  focus: {
    id: 'focus',
    name: 'Focus',
    enabled: true,            // Enabled when added
    mode: 'animate',          // Always plays forward on each trigger
    startT: 0,                // Effect starts at beginning
    endT: 1,                  // Effect ends at full expansion
    curvePoints: [            // Single curve for blur effect
      { x: 0, y: 1 },         // Start: curve=1 (max blur)
      { x: 1, y: 0 },         // End: curve=0 (no blur)
    ],
    variables: [
      {
        id: 'amount',
        name: 'Blur Amount',
        min: 0,                 // No blur (sharp)
        max: 20,                // Maximum blur amount in pixels
      },
    ],
  },
  trail: {
    id: 'trail',
    name: 'Trail',
    enabled: true,            // Enabled when added
    mode: 'animate',          // Trails follow animation forward
    startT: 0,
    endT: 1,
    curvePoints: [
      { x: 0, y: 1 },         // Start: full trail effect
      { x: 1, y: 0 },         // End: trails fade out
    ],
    variables: [
      {
        id: 'persistence',
        name: 'Persistence',
        min: 0.0,               // No persistence (trails disappear instantly)
        max: 0.95,              // High persistence (trails linger)
      },
      {
        id: 'amount',
        name: 'Amount',
        min: 0,                 // No trails
        max: 1.0,               // Full trail intensity
      },
    ],
    colorRamp: [
      { position: 0.0, color: [0.0, 0.8, 1.0] },    // Cyan
      { position: 0.33, color: [0.5, 0.0, 1.0] },   // Purple
      { position: 0.66, color: [1.0, 0.2, 0.5] },   // Pink
      { position: 1.0, color: [1.0, 1.0, 1.0] },    // White (newest)
    ],
  },
};

const defaultAnimConfig: AnimationConfig = {
  duration: 800,
  curve: [0.34, 1.56, 0.64, 1],
  effects: [],  // Empty by default - effects are added by user
};

export function DigitalMaterialLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationRef = useRef<number>(0);
  const animControllerRef = useRef<AnimationController | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [uniforms, setUniforms] = useState<MaterialUniforms>(defaultUniforms);
  const [animConfig, setAnimConfig] = useState<AnimationConfig>(defaultAnimConfig);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('fit');
  const [viewportScale, setViewportScale] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Trail effect - size history for ghost shapes
  const sizeHistoryRef = useRef<[number, number][]>([]);
  const TRAIL_HISTORY_LENGTH = 8;  // Store more frames, sample 4 for display

  // Background image texture ref
  const backgroundTextureRef = useRef<WebGLTexture | null>(null);

  // Initialize WebGL with fixed canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set fixed canvas dimensions (always render at 1:1 for recording)
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const gl = createWebGLContext(canvas);
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;
    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Main shader program
    const vertShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertShader || !fragShader) {
      console.error('Failed to compile main shaders');
      return;
    }

    const program = createProgram(gl, vertShader, fragShader);
    if (!program) {
      console.error('Failed to create main program');
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

  // Load background image texture when it changes
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;

    if (animConfig.backgroundImage) {
      const image = new Image();
      image.onload = () => {
        // Delete old texture if exists
        if (backgroundTextureRef.current) {
          gl.deleteTexture(backgroundTextureRef.current);
        }

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        backgroundTextureRef.current = texture;
      };
      image.src = animConfig.backgroundImage;
    } else {
      // Clear background texture
      if (backgroundTextureRef.current) {
        gl.deleteTexture(backgroundTextureRef.current);
        backgroundTextureRef.current = null;
      }
    }
  }, [animConfig.backgroundImage]);

  // Calculate viewport scale based on mode and available space
  useEffect(() => {
    const calculateScale = () => {
      const container = viewportContainerRef.current;
      if (!container) return;

      if (viewportMode === '1:1') {
        setViewportScale(1);
        return;
      }

      // Fit mode: scale to fit container with padding
      const padding = 32; // 16px on each side
      const containerWidth = container.clientWidth - padding;
      const containerHeight = container.clientHeight - padding;

      const scaleX = containerWidth / CANVAS_WIDTH;
      const scaleY = containerHeight / CANVAS_HEIGHT;
      const scale = Math.min(scaleX, scaleY, 1); // Don't upscale beyond 1:1

      setViewportScale(scale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [viewportMode]);

  // Recording functions
  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    recordedChunksRef.current = [];

    // Capture stream at 60fps
    const stream = canvas.captureStream(60);

    // Try to use WebM codec (best browser support)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 25000000, // 25 Mbps for high quality
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `digital-material-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      recordedChunksRef.current = [];
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100); // Collect data every 100ms
    setIsRecording(true);
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Render loop
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;
    if (!gl || !program || !canvas) return;

    const startTime = performance.now();
    let lastTime = startTime;

    const render = () => {
      const currentTime = performance.now();
      const elapsed = (currentTime - startTime) / 1000;
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

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

      // Calculate effect values
      // - State mode effects use expansionProgress (follows state)
      // - Animate mode effects use masterProgress (always plays forward)
      const cornerRadiusEffect = animConfig.effects.find(e => e.id === 'cornerRadius');

      // Corner shape: roundness and squircle
      const rawCornerRadius = cornerRadiusEffect
        ? calculateVariableValue(cornerRadiusEffect, 'roundness', expansionProgress, masterProgress)
        : uniforms.cornerRadius;
      const squircleAmount = cornerRadiusEffect
        ? calculateVariableValue(cornerRadiusEffect, 'squircle', expansionProgress, masterProgress)
        : 2.0;

      // Clamp corner radius to half the shortest edge to prevent pinching
      // currentSize stores half-dimensions, so min(w, h) gives us the max valid radius
      const maxCornerRadius = Math.min(currentSize[0], currentSize[1]);
      const currentCornerRadius = Math.min(rawCornerRadius, maxCornerRadius);

      // Calculate focus (blur) effect
      const focusEffect = animConfig.effects.find(e => e.id === 'focus');
      const blurAmount = focusEffect
        ? calculateVariableValue(focusEffect, 'amount', expansionProgress, masterProgress)
        : 0;

      // Calculate trail effect
      const trailEffect = animConfig.effects.find(e => e.id === 'trail');
      const trailEnabled = trailEffect?.enabled ?? false;
      const trailPersistence = trailEffect
        ? calculateVariableValue(trailEffect, 'persistence', expansionProgress, masterProgress)
        : 0;
      const trailAmount = trailEffect
        ? calculateVariableValue(trailEffect, 'amount', expansionProgress, masterProgress)
        : 0;

      // Get trail color ramp (default to white->cyan if not defined)
      const colorRamp = trailEffect?.colorRamp ?? [
        { position: 0.0, color: [0.0, 0.8, 1.0] as [number, number, number] },
        { position: 0.33, color: [0.5, 0.0, 1.0] as [number, number, number] },
        { position: 0.66, color: [1.0, 0.2, 0.5] as [number, number, number] },
        { position: 1.0, color: [1.0, 1.0, 1.0] as [number, number, number] },
      ];

      // Ensure we have 4 color stops for the shader
      const colors = [
        colorRamp[0]?.color ?? [0, 0.8, 1],
        colorRamp[1]?.color ?? [0.5, 0, 1],
        colorRamp[2]?.color ?? [1, 0.2, 0.5],
        colorRamp[3]?.color ?? [1, 1, 1],
      ];
      const positions = [
        colorRamp[0]?.position ?? 0,
        colorRamp[1]?.position ?? 0.33,
        colorRamp[2]?.position ?? 0.66,
        colorRamp[3]?.position ?? 1,
      ];

      gl.useProgram(program);

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

      const setUniform4f = (name: string, x: number, y: number, z: number, w: number) => {
        const loc = gl.getUniformLocation(program, name);
        if (loc) gl.uniform4f(loc, x, y, z, w);
      };

      const setUniform1i = (name: string, value: number) => {
        const loc = gl.getUniformLocation(program, name);
        if (loc) gl.uniform1i(loc, value);
      };

      // Resolution and time
      setUniform2f('u_resolution', canvas.width, canvas.height);
      setUniform1f('u_time', elapsed);
      setUniform1f('u_animProgress', masterProgress);

      // Geometry - use calculated effect values
      setUniform2f('u_rectSize', currentSize[0], currentSize[1]);
      setUniform1f('u_cornerRadius', currentCornerRadius);
      setUniform1f('u_squircle', squircleAmount);
      setUniform1f('u_blur', blurAmount);

      // Update size history for trail effect
      if (trailEnabled) {
        // Add current size to history
        sizeHistoryRef.current.push([...currentSize]);
        // Keep only the last N frames
        if (sizeHistoryRef.current.length > TRAIL_HISTORY_LENGTH) {
          sizeHistoryRef.current.shift();
        }
      } else {
        // Clear history when trail is disabled
        sizeHistoryRef.current = [];
      }

      // Sample 4 ghost sizes from history (evenly spaced)
      const history = sizeHistoryRef.current;
      const histLen = history.length;
      const getHistorySize = (index: number): [number, number] => {
        if (histLen === 0) return currentSize;
        const i = Math.min(index, histLen - 1);
        return history[i] || currentSize;
      };

      // Sample at 0%, 25%, 50%, 75% of history (oldest to newest)
      const trailSize0 = getHistorySize(0);
      const trailSize1 = getHistorySize(Math.floor(histLen * 0.33));
      const trailSize2 = getHistorySize(Math.floor(histLen * 0.66));
      const trailSize3 = getHistorySize(Math.max(0, histLen - 2));

      // Trail effect uniforms
      setUniform1f('u_trailEnabled', trailEnabled ? 1.0 : 0.0);
      setUniform1f('u_trailAmount', trailAmount);

      // Trail ghost sizes
      setUniform2f('u_trailSize0', trailSize0[0], trailSize0[1]);
      setUniform2f('u_trailSize1', trailSize1[0], trailSize1[1]);
      setUniform2f('u_trailSize2', trailSize2[0], trailSize2[1]);
      setUniform2f('u_trailSize3', trailSize3[0], trailSize3[1]);

      // Trail color ramp
      setUniform3f('u_trailColor0', colors[0][0], colors[0][1], colors[0][2]);
      setUniform3f('u_trailColor1', colors[1][0], colors[1][1], colors[1][2]);
      setUniform3f('u_trailColor2', colors[2][0], colors[2][1], colors[2][2]);
      setUniform3f('u_trailColor3', colors[3][0], colors[3][1], colors[3][2]);
      setUniform4f('u_trailColorPositions', positions[0], positions[1], positions[2], positions[3]);

      // Background texture
      const hasBackground = backgroundTextureRef.current !== null;
      setUniform1f('u_hasBackground', hasBackground ? 1.0 : 0.0);

      if (hasBackground) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, backgroundTextureRef.current);
        setUniform1i('u_backgroundTexture', 0);
      }

      // Digital Material
      setUniform1f('u_viscosity', uniforms.viscosity);
      setUniform1f('u_elasticity', uniforms.elasticity);
      setUniform1f('u_surfaceTension', uniforms.surfaceTension);
      setUniform1f('u_momentum', uniforms.momentum);
      setUniform1f('u_gravAttention', uniforms.gravAttention);

      // Clear and draw to screen
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

  // Drag and drop handlers for JSON presets
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(f => f.name.endsWith('.json'));

    if (jsonFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.uniforms) setUniforms(data.uniforms);
          if (data.animConfig) {
            // Intelligently merge effects:
            // - If imported config has effects, use those (preserving customizations)
            // - If imported has no effects or empty array, preserve current effects
            setAnimConfig(prev => {
              const importedConfig = { ...data.animConfig };
              if (!importedConfig.effects || importedConfig.effects.length === 0) {
                // Old preset or preset with no effects - keep current effects
                importedConfig.effects = prev.effects;
              }
              return importedConfig;
            });
          }
        } catch (err) {
          console.error('Failed to parse preset file:', err);
        }
      };
      reader.readAsText(jsonFile);
    }
  }, []);

  // Handle background image change
  const handleBackgroundImageChange = useCallback((imageDataUrl: string | undefined) => {
    setAnimConfig(prev => ({ ...prev, backgroundImage: imageDataUrl }));
  }, []);

  return (
    <div className="h-screen w-screen bg-neutral-500 overflow-hidden relative flex">
      {/* Main Viewport Area - 50% grey background */}
      <div
        ref={viewportContainerRef}
        className={`flex-1 relative flex items-center justify-center ${
          viewportMode === '1:1' ? 'overflow-auto' : 'overflow-hidden'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay indicator */}
        {isDragging && (
          <div className="absolute inset-0 z-[100] bg-emerald-500/20 border-4 border-dashed border-emerald-500 flex items-center justify-center pointer-events-none">
            <div className="bg-neutral-900/90 rounded-xl px-8 py-6 text-center">
              <p className="text-emerald-400 text-lg font-medium">Drop JSON preset file</p>
              <p className="text-neutral-400 text-sm mt-1">Release to load settings</p>
            </div>
          </div>
        )}
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

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 translate-x-16 z-50 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400 font-medium">REC</span>
          </div>
        )}

        {/* Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-gray-600 text-xs">
          <span className="opacity-60">Tap to animate</span>
        </div>

        {/* Canvas Container - scaled for display */}
        <div
          className="relative flex-shrink-0"
          style={{
            width: CANVAS_WIDTH * viewportScale,
            height: CANVAS_HEIGHT * viewportScale,
          }}
        >
          {/* WebGL Canvas - always renders at 1440x3120, scaled via CSS */}
          <canvas
            ref={canvasRef}
            className="cursor-pointer touch-none"
            style={{
              width: CANVAS_WIDTH * viewportScale,
              height: CANVAS_HEIGHT * viewportScale,
            }}
            onClick={handleCanvasClick}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleCanvasClick();
            }}
          />
        </div>
      </div>

      {/* Settings Panel - Always visible */}
      <SettingsPanel
        uniforms={uniforms}
        onUniformsChange={setUniforms}
        animConfig={animConfig}
        onAnimConfigChange={setAnimConfig}
        viewportMode={viewportMode}
        onViewportModeChange={setViewportMode}
        isRecording={isRecording}
        onToggleRecording={toggleRecording}
      />
    </div>
  );
}

export default DigitalMaterialLab;
