import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Copy, Download, Upload } from 'lucide-react';
import type { MaterialUniforms, AnimationConfig, Effect } from './index';
import { MultiPointCurveEditor } from './MultiPointCurveEditor';
import { BezierCurveEditor } from './BezierCurveEditor';
import { CURVES } from './animation';
import type { BezierCurve } from './animation';

interface SettingsPanelProps {
  uniforms: MaterialUniforms;
  onUniformsChange: (uniforms: MaterialUniforms) => void;
  animConfig: AnimationConfig;
  onAnimConfigChange: (config: AnimationConfig) => void;
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

interface EffectEditorProps {
  effect: Effect;
  onChange: (effect: Effect) => void;
}

function EffectEditor({ effect, onChange }: EffectEditorProps) {
  const [showCurve, setShowCurve] = useState(true);

  // Calculate actual values at contracted/expanded states
  const startValue = effect.curvePoints[0]?.y ?? 0;
  const endValue = effect.curvePoints[effect.curvePoints.length - 1]?.y ?? 1;
  const contractedVal = effect.min + (effect.max - effect.min) * startValue;
  const expandedVal = effect.min + (effect.max - effect.min) * endValue;

  return (
    <div className="bg-neutral-800/50 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-neutral-200">{effect.name}</span>
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
      </div>

      {effect.enabled && (
        <>
          {/* Value Range */}
          <div className="mb-4">
            <span className="text-[11px] font-medium text-neutral-400 block mb-2">Range</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-neutral-500 uppercase tracking-wider block mb-1">Min</label>
                <input
                  type="number"
                  step={0.001}
                  value={effect.min}
                  onChange={(e) => onChange({ ...effect, min: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-2 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-neutral-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-neutral-500 uppercase tracking-wider block mb-1">Max</label>
                <input
                  type="number"
                  step={0.001}
                  value={effect.max}
                  onChange={(e) => onChange({ ...effect, max: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-2 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-neutral-500"
                />
              </div>
            </div>
          </div>

          {/* Current State Values */}
          <div className="mb-4 flex justify-between text-[10px] font-mono bg-neutral-800 rounded px-3 py-2">
            <span className="text-emerald-400">
              Contracted: {contractedVal.toFixed(4)}
            </span>
            <span className="text-rose-400">
              Expanded: {expandedVal.toFixed(4)}
            </span>
          </div>

          {/* Timeline Position */}
          <TimelineRange
            startT={effect.startT}
            endT={effect.endT}
            onStartChange={(v) => onChange({ ...effect, startT: v })}
            onEndChange={(v) => onChange({ ...effect, endT: v })}
          />

          {/* Curve Editor */}
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
                  height={160}
                />
              </div>
            )}
          </div>
        </>
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
}: SettingsPanelProps) {
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
          if (data.animConfig) onAnimConfigChange(data.animConfig);
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

  const cornerRadiusEffect = animConfig.effects.find(e => e.id === 'cornerRadius');
  const focusEffect = animConfig.effects.find(e => e.id === 'focus');

  return (
    <div className="w-[340px] bg-neutral-900 border-l border-neutral-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-100">Settings</h2>
        <p className="text-[10px] text-neutral-500 mt-1">Digital Material Lab</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
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

        {/* Effects Section */}
        <Section title="Effects">
          {cornerRadiusEffect && (
            <EffectEditor
              effect={cornerRadiusEffect}
              onChange={(effect) => updateEffect('cornerRadius', effect)}
            />
          )}
          {focusEffect && (
            <div className="mt-4">
              <EffectEditor
                effect={focusEffect}
                onChange={(effect) => updateEffect('focus', effect)}
              />
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
