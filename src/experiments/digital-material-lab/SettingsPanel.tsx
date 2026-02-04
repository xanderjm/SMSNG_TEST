import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Copy, Download, Upload, Circle, Square, Image, X, Plus, Trash2, GripVertical } from 'lucide-react';
import type { MaterialUniforms, AnimationConfig, Effect, EffectVariable, ViewportMode, ColorStop } from './index';
import { CANVAS_WIDTH, CANVAS_HEIGHT, EFFECT_TEMPLATES } from './index';
import { MultiPointCurveEditor } from './MultiPointCurveEditor';
import { BezierCurveEditor } from './BezierCurveEditor';
import { CURVES } from './animation';
import type { BezierCurve } from './animation';

interface SettingsPanelProps {
  uniforms: MaterialUniforms;
  onUniformsChange: (uniforms: MaterialUniforms) => void;
  animConfig: AnimationConfig;
  onAnimConfigChange: (config: AnimationConfig) => void;
  viewportMode: ViewportMode;
  onViewportModeChange: (mode: ViewportMode) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
}

// Color ramp editor for trail effect
interface ColorRampEditorProps {
  colorRamp: ColorStop[];
  onChange: (colorRamp: ColorStop[]) => void;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1];
}

function ColorRampEditor({ colorRamp, onChange }: ColorRampEditorProps) {
  const updateColor = (index: number, color: [number, number, number]) => {
    const newRamp = [...colorRamp];
    newRamp[index] = { ...newRamp[index], color };
    onChange(newRamp);
  };

  // Create gradient string for preview
  const gradientStops = colorRamp
    .map(stop => `${rgbToHex(stop.color[0], stop.color[1], stop.color[2])} ${stop.position * 100}%`)
    .join(', ');

  return (
    <div className="mt-3">
      <span className="text-[11px] font-medium text-neutral-400 block mb-2">Color Ramp</span>

      {/* Gradient preview */}
      <div
        className="h-6 rounded mb-3 border border-neutral-700"
        style={{ background: `linear-gradient(to right, ${gradientStops})` }}
      />

      {/* Color stops */}
      <div className="grid grid-cols-4 gap-2">
        {colorRamp.map((stop, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <input
              type="color"
              value={rgbToHex(stop.color[0], stop.color[1], stop.color[2])}
              onChange={(e) => updateColor(index, hexToRgb(e.target.value))}
              className="w-8 h-8 rounded cursor-pointer border border-neutral-700 bg-transparent"
            />
            <span className="text-[8px] text-neutral-500">{(stop.position * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Background image picker
interface BackgroundPickerProps {
  backgroundImage?: string;
  onChange: (image: string | undefined) => void;
}

function BackgroundPicker({ backgroundImage, onChange }: BackgroundPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onChange(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  return (
    <div className="mb-4">
      <span className="text-[11px] font-medium text-neutral-400 block mb-2">Background Image</span>

      {backgroundImage ? (
        <div className="relative">
          <img
            src={backgroundImage}
            alt="Background"
            className="w-full h-20 object-cover rounded border border-neutral-700"
          />
          <button
            onClick={handleClear}
            className="absolute top-1 right-1 p-1 rounded bg-neutral-900/80 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded border border-dashed border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-400 transition-colors"
        >
          <Image className="w-4 h-4" />
          <span className="text-xs">Choose Image</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-[9px] text-neutral-600 mt-1.5">
        Image will be scaled to fit canvas
      </p>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}

function Slider({ label, value, min, max, step = 0.01, onChange, unit = '' }: SliderProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] font-medium text-neutral-400">{label}</span>
        <span className="text-[10px] text-neutral-500 font-mono">
          {value.toFixed(2)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-neutral-300
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:border-0"
      />
    </div>
  );
}

interface TimelineRangeProps {
  startT: number;
  endT: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
}

function TimelineRange({ startT, endT, onStartChange, onEndChange }: TimelineRangeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const handleMouseDown = (handle: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(handle);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      if (dragging === 'start') {
        if (x < endT - 0.02) onStartChange(x);
      } else {
        if (x > startT + 0.02) onEndChange(x);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, startT, endT, onStartChange, onEndChange]);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] font-medium text-neutral-400">Timeline</span>
        <span className="text-[10px] text-neutral-500 font-mono">
          {(startT * 100).toFixed(0)}% — {(endT * 100).toFixed(0)}%
        </span>
      </div>

      {/* Interactive timeline bar */}
      <div
        ref={containerRef}
        className="relative h-8 bg-neutral-800 rounded cursor-pointer select-none"
      >
        {/* Active range */}
        <div
          className="absolute top-2 bottom-2 bg-neutral-600 rounded"
          style={{
            left: `${startT * 100}%`,
            width: `${(endT - startT) * 100}%`,
          }}
        />

        {/* Start handle - directly draggable */}
        <div
          className="absolute top-0 bottom-0 w-3 -ml-1.5 flex items-center justify-center cursor-ew-resize group"
          style={{ left: `${startT * 100}%` }}
          onMouseDown={handleMouseDown('start')}
        >
          <div className={`w-1 h-full rounded-full transition-colors ${
            dragging === 'start' ? 'bg-emerald-400' : 'bg-emerald-500 group-hover:bg-emerald-400'
          }`} />
        </div>

        {/* End handle - directly draggable */}
        <div
          className="absolute top-0 bottom-0 w-3 -ml-1.5 flex items-center justify-center cursor-ew-resize group"
          style={{ left: `${endT * 100}%` }}
          onMouseDown={handleMouseDown('end')}
        >
          <div className={`w-1 h-full rounded-full transition-colors ${
            dragging === 'end' ? 'bg-rose-400' : 'bg-rose-500 group-hover:bg-rose-400'
          }`} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-between mt-2 text-[9px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Start
        </span>
        <span className="flex items-center gap-1">
          End
          <span className="w-2 h-2 rounded-full bg-rose-500" />
        </span>
      </div>
    </div>
  );
}

// Inline editor for a variable's min/max range (no curve - uses shared curve)
interface VariableRangeProps {
  variable: EffectVariable;
  curveStart: number;  // Y value at curve start (0-1)
  curveEnd: number;    // Y value at curve end (0-1)
  onChange: (variable: EffectVariable) => void;
}

function VariableRange({ variable, curveStart, curveEnd, onChange }: VariableRangeProps) {
  // Calculate actual values at start/end based on shared curve
  const startVal = variable.min + (variable.max - variable.min) * curveStart;
  const endVal = variable.min + (variable.max - variable.min) * curveEnd;

  return (
    <div className="bg-neutral-800/30 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-neutral-300">{variable.name}</span>
        <span className="text-[9px] font-mono text-neutral-500">
          <span className="text-emerald-400">{startVal.toFixed(2)}</span>
          {' → '}
          <span className="text-rose-400">{endVal.toFixed(2)}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] text-neutral-500 uppercase tracking-wider block mb-1">Min</label>
          <input
            type="number"
            step={0.01}
            value={variable.min}
            onChange={(e) => onChange({ ...variable, min: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label className="text-[9px] text-neutral-500 uppercase tracking-wider block mb-1">Max</label>
          <input
            type="number"
            step={0.01}
            value={variable.max}
            onChange={(e) => onChange({ ...variable, max: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-neutral-500"
          />
        </div>
      </div>
    </div>
  );
}

interface EffectEditorProps {
  effect: Effect;
  onChange: (effect: Effect) => void;
  onRemove: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

function EffectEditor({
  effect,
  onChange,
  onRemove,
  isCollapsed,
  onToggleCollapse,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: EffectEditorProps) {
  const [showCurve, setShowCurve] = useState(true);

  const updateVariable = (variableId: string, updatedVariable: EffectVariable) => {
    const newVariables = effect.variables.map(v =>
      v.id === variableId ? updatedVariable : v
    );
    onChange({ ...effect, variables: newVariables });
  };

  const updateColorRamp = (colorRamp: ColorStop[]) => {
    onChange({ ...effect, colorRamp });
  };

  // Get curve start/end Y values for variable display
  const curveStart = effect.curvePoints[0]?.y ?? 0;
  const curveEnd = effect.curvePoints[effect.curvePoints.length - 1]?.y ?? 1;

  // Check if this effect has a color ramp
  const hasColorRamp = effect.colorRamp !== undefined;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`bg-neutral-800/50 rounded-lg transition-all ${
        isDragging ? 'opacity-50 scale-[0.98]' : ''
      } ${isDragOver ? 'ring-2 ring-neutral-500' : ''}`}
    >
      {/* Header - always visible, clickable to collapse */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        {/* Drag handle */}
        <div
          className="p-1 cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-400"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Collapse indicator */}
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
        )}

        {/* Effect name */}
        <span className="flex-1 text-sm font-medium text-neutral-200">{effect.name}</span>

        {/* Controls */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onChange({ ...effect, enabled: !effect.enabled })}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              effect.enabled ? 'bg-neutral-500' : 'bg-neutral-700'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-neutral-200 transition-transform ${
                effect.enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-700 transition-colors"
            title="Remove effect"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {!isCollapsed && effect.enabled && (
        <div className="px-4 pb-4">
          {/* Mode Toggle */}
          <div className="mb-4">
            <span className="text-[11px] font-medium text-neutral-400 block mb-2">Mode</span>
            <div className="flex gap-2">
              <button
                onClick={() => onChange({ ...effect, mode: 'state' })}
                className={`flex-1 px-3 py-2 text-[10px] rounded transition-colors ${
                  effect.mode === 'state'
                    ? 'bg-neutral-600 text-neutral-100'
                    : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                }`}
              >
                State
              </button>
              <button
                onClick={() => onChange({ ...effect, mode: 'animate' })}
                className={`flex-1 px-3 py-2 text-[10px] rounded transition-colors ${
                  effect.mode === 'animate'
                    ? 'bg-neutral-600 text-neutral-100'
                    : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                }`}
              >
                Animate
              </button>
            </div>
            <p className="text-[9px] text-neutral-600 mt-1.5">
              {effect.mode === 'state'
                ? 'Curve follows expansion state (forward/backward)'
                : 'Curve always plays forward on each trigger'}
            </p>
          </div>

          {/* Timeline Position */}
          <TimelineRange
            startT={effect.startT}
            endT={effect.endT}
            onStartChange={(v) => onChange({ ...effect, startT: v })}
            onEndChange={(v) => onChange({ ...effect, endT: v })}
          />

          {/* Shared Curve Editor */}
          <div className="border-t border-neutral-700 pt-4 mt-4">
            <button
              onClick={() => setShowCurve(!showCurve)}
              className="w-full flex items-center justify-between py-1 text-[11px] font-medium text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              <span>Curve</span>
              {showCurve ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {showCurve && (
              <div className="mt-3">
                <MultiPointCurveEditor
                  points={effect.curvePoints}
                  onChange={(curvePoints) => onChange({ ...effect, curvePoints })}
                  width={260}
                  height={140}
                />
              </div>
            )}
          </div>

          {/* Variables Section - min/max only, uses shared curve */}
          <div className="border-t border-neutral-700 pt-4 mt-4">
            <span className="text-[11px] font-medium text-neutral-400 block mb-1">Variables</span>
            {effect.variables.map((variable) => (
              <VariableRange
                key={variable.id}
                variable={variable}
                curveStart={curveStart}
                curveEnd={curveEnd}
                onChange={(updated) => updateVariable(variable.id, updated)}
              />
            ))}
          </div>

          {/* Color Ramp Section (only for effects with color ramp) */}
          {hasColorRamp && effect.colorRamp && (
            <div className="border-t border-neutral-700 pt-4 mt-4">
              <ColorRampEditor
                colorRamp={effect.colorRamp}
                onChange={updateColorRamp}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-neutral-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-6 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-300 transition-colors"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
}

export function SettingsPanel({
  uniforms,
  onUniformsChange,
  animConfig,
  onAnimConfigChange,
  viewportMode,
  onViewportModeChange,
  isRecording,
  onToggleRecording,
}: SettingsPanelProps) {
  // Track collapsed state for each effect
  const [collapsedEffects, setCollapsedEffects] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [draggedEffectId, setDraggedEffectId] = useState<string | null>(null);
  const [dragOverEffectId, setDragOverEffectId] = useState<string | null>(null);

  const toggleEffectCollapsed = (effectId: string) => {
    setCollapsedEffects(prev => {
      const next = new Set(prev);
      if (next.has(effectId)) {
        next.delete(effectId);
      } else {
        next.add(effectId);
      }
      return next;
    });
  };

  const handleDragStart = (effectId: string) => (e: React.DragEvent) => {
    setDraggedEffectId(effectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', effectId);
  };

  const handleDragOver = (effectId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedEffectId && draggedEffectId !== effectId) {
      setDragOverEffectId(effectId);
    }
  };

  const handleDragEnd = () => {
    if (draggedEffectId && dragOverEffectId && draggedEffectId !== dragOverEffectId) {
      // Reorder effects
      const effects = [...animConfig.effects];
      const draggedIndex = effects.findIndex(e => e.id === draggedEffectId);
      const targetIndex = effects.findIndex(e => e.id === dragOverEffectId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = effects.splice(draggedIndex, 1);
        effects.splice(targetIndex, 0, removed);
        onAnimConfigChange({ ...animConfig, effects });
      }
    }
    setDraggedEffectId(null);
    setDragOverEffectId(null);
  };

  const updateUniform = <K extends keyof MaterialUniforms>(
    key: K,
    value: MaterialUniforms[K]
  ) => {
    onUniformsChange({ ...uniforms, [key]: value });
  };

  const updateEffect = (effectId: string, updatedEffect: Effect) => {
    const newEffects = animConfig.effects.map(e =>
      e.id === effectId ? updatedEffect : e
    );
    onAnimConfigChange({ ...animConfig, effects: newEffects });
  };

  const addEffect = (effectId: string) => {
    const template = EFFECT_TEMPLATES[effectId];
    if (!template) return;
    // Check if effect already exists
    if (animConfig.effects.some(e => e.id === effectId)) return;
    // Deep clone the template
    const newEffect = JSON.parse(JSON.stringify(template));
    onAnimConfigChange({ ...animConfig, effects: [...animConfig.effects, newEffect] });
  };

  const removeEffect = (effectId: string) => {
    const newEffects = animConfig.effects.filter(e => e.id !== effectId);
    onAnimConfigChange({ ...animConfig, effects: newEffects });
  };

  // Get available effects (templates not yet added)
  const availableEffects = Object.entries(EFFECT_TEMPLATES).filter(
    ([id]) => !animConfig.effects.some(e => e.id === id)
  );

  const handleExport = () => {
    const data = {
      uniforms,
      animConfig,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'material-preset.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.uniforms) onUniformsChange(data.uniforms);
          if (data.animConfig) {
            // Intelligently merge effects:
            // - If imported config has effects, use those (preserving customizations)
            // - If imported has no effects or empty array, preserve current effects
            const importedConfig = { ...data.animConfig };
            if (!importedConfig.effects || importedConfig.effects.length === 0) {
              // Old preset or preset with no effects - keep current effects
              importedConfig.effects = animConfig.effects;
            }
            onAnimConfigChange(importedConfig);
          }
        } catch (err) {
          console.error('Failed to parse preset file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleCopy = () => {
    const data = { uniforms, animConfig };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const curvePresets: { name: string; curve: BezierCurve }[] = [
    { name: 'ease', curve: CURVES.ease },
    { name: 'ease-out', curve: CURVES.easeOut },
    { name: 'elastic', curve: CURVES.elastic },
    { name: 'sharp', curve: CURVES.sharp },
  ];

  const handleBackgroundChange = (image: string | undefined) => {
    onAnimConfigChange({ ...animConfig, backgroundImage: image });
  };

  return (
    <div className="w-[340px] bg-neutral-900 border-l border-neutral-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-100">Settings</h2>
        <p className="text-[10px] text-neutral-500 mt-1">Digital Material Lab</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Viewport & Recording Section */}
        <Section title="Viewport & Recording">
          {/* Canvas size info */}
          <div className="mb-4">
            <span className="text-[11px] font-medium text-neutral-400 block mb-2">Canvas Size</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {CANVAS_WIDTH} × {CANVAS_HEIGHT}px
            </span>
          </div>

          {/* Viewport Mode Toggle */}
          <div className="mb-4">
            <span className="text-[11px] font-medium text-neutral-400 block mb-2">Viewport Mode</span>
            <div className="flex gap-2">
              <button
                onClick={() => onViewportModeChange('fit')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-[10px] rounded transition-colors ${
                  viewportMode === 'fit'
                    ? 'bg-neutral-600 text-neutral-100'
                    : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                }`}
              >
                <Square className="w-3 h-3" />
                Fit
              </button>
              <button
                onClick={() => onViewportModeChange('1:1')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-[10px] rounded transition-colors ${
                  viewportMode === '1:1'
                    ? 'bg-neutral-600 text-neutral-100'
                    : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                }`}
              >
                <Circle className="w-3 h-3" />
                1:1
              </button>
            </div>
            <p className="text-[9px] text-neutral-600 mt-1.5">
              {viewportMode === 'fit'
                ? 'Scale to fit screen with padding'
                : 'Actual pixel size (scroll to explore)'}
            </p>
          </div>

          {/* Recording Controls */}
          <div className="mb-4">
            <span className="text-[11px] font-medium text-neutral-400 block mb-2">Recording</span>
            <button
              onClick={onToggleRecording}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded font-medium text-xs transition-colors ${
                isRecording
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-red-500'}`} />
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <p className="text-[9px] text-neutral-600 mt-1.5">
              Records at {CANVAS_WIDTH}×{CANVAS_HEIGHT}px (WebM format)
            </p>
          </div>
        </Section>

        {/* Animation Section */}
        <Section title="Animation">
          <Slider
            label="Duration"
            value={animConfig.duration}
            min={100}
            max={2000}
            step={50}
            onChange={(v) => onAnimConfigChange({ ...animConfig, duration: v })}
            unit="ms"
          />

          <div className="mb-4">
            <span className="text-[11px] font-medium text-neutral-400 block mb-3">Master Curve</span>
            <BezierCurveEditor
              value={animConfig.curve}
              onChange={(curve) => onAnimConfigChange({ ...animConfig, curve })}
              width={260}
              height={120}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {curvePresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onAnimConfigChange({ ...animConfig, curve: preset.curve })}
                  className="px-3 py-1.5 text-[10px] rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Background Section */}
        <Section title="Background">
          <BackgroundPicker
            backgroundImage={animConfig.backgroundImage}
            onChange={handleBackgroundChange}
          />
        </Section>

        {/* Effects Section */}
        <Section title="Effects">
          {/* List of active effects */}
          <div onDragLeave={() => setDragOverEffectId(null)}>
            {animConfig.effects.map((effect, index) => (
              <div key={effect.id} className={index > 0 ? 'mt-3' : ''}>
                <EffectEditor
                  effect={effect}
                  onChange={(updatedEffect) => updateEffect(effect.id, updatedEffect)}
                  onRemove={() => removeEffect(effect.id)}
                  isCollapsed={collapsedEffects.has(effect.id)}
                  onToggleCollapse={() => toggleEffectCollapsed(effect.id)}
                  onDragStart={handleDragStart(effect.id)}
                  onDragOver={handleDragOver(effect.id)}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedEffectId === effect.id}
                  isDragOver={dragOverEffectId === effect.id}
                />
              </div>
            ))}
          </div>

          {/* Empty state */}
          {animConfig.effects.length === 0 && (
            <p className="text-[11px] text-neutral-500 text-center py-4">
              No effects added. Click below to add one.
            </p>
          )}

          {/* Add effect button/dropdown */}
          {availableEffects.length > 0 && (
            <div className={animConfig.effects.length > 0 ? 'mt-4' : ''}>
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addEffect(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full appearance-none bg-neutral-800 border border-dashed border-neutral-700 rounded-lg px-4 py-3 text-xs text-neutral-400 cursor-pointer hover:border-neutral-500 hover:text-neutral-300 transition-colors focus:outline-none focus:border-neutral-500"
                  defaultValue=""
                >
                  <option value="" disabled>
                    + Add Effect...
                  </option>
                  {availableEffects.map(([id, template]) => (
                    <option key={id} value={id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <Plus className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          )}
        </Section>

        {/* Digital Physics Section */}
        <Section title="Physics" defaultOpen={false}>
          <Slider
            label="Viscosity"
            value={uniforms.viscosity}
            min={0}
            max={1}
            onChange={(v) => updateUniform('viscosity', v)}
          />
          <Slider
            label="Elasticity"
            value={uniforms.elasticity}
            min={0}
            max={1}
            onChange={(v) => updateUniform('elasticity', v)}
          />
          <Slider
            label="Surface Tension"
            value={uniforms.surfaceTension}
            min={0}
            max={1}
            onChange={(v) => updateUniform('surfaceTension', v)}
          />
          <Slider
            label="Momentum"
            value={uniforms.momentum}
            min={0}
            max={1}
            onChange={(v) => updateUniform('momentum', v)}
          />
          <Slider
            label="Gravity"
            value={uniforms.gravAttention}
            min={0}
            max={1}
            onChange={(v) => updateUniform('gravAttention', v)}
          />
        </Section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-800">
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded bg-neutral-700 text-neutral-200 text-xs font-medium hover:bg-neutral-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={handleImport}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded bg-neutral-800 text-neutral-400 text-xs font-medium hover:bg-neutral-700 hover:text-neutral-300 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            onClick={handleCopy}
            className="px-3 py-2.5 rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300 transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
