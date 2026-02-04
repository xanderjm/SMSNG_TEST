import { useState } from 'react';
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
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] font-medium text-neutral-600">{label}</span>
        <span className="text-[10px] text-neutral-400 font-mono">
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
        className="w-full h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-neutral-800
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:border-2
                   [&::-webkit-slider-thumb]:border-white
                   [&::-webkit-slider-thumb]:shadow-sm"
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
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] font-medium text-neutral-600">Timeline</span>
        <span className="text-[10px] text-neutral-400 font-mono">
          {(startT * 100).toFixed(0)}% — {(endT * 100).toFixed(0)}%
        </span>
      </div>

      {/* Visual timeline bar */}
      <div className="relative h-5 bg-neutral-100 rounded border border-neutral-200 mb-2">
        {/* Active range */}
        <div
          className="absolute top-0.5 bottom-0.5 bg-neutral-800 rounded-sm"
          style={{
            left: `${startT * 100}%`,
            width: `${(endT - startT) * 100}%`,
          }}
        />
        {/* Start handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-500"
          style={{ left: `${startT * 100}%` }}
        />
        {/* End handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-rose-500"
          style={{ left: `${endT * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={startT}
            onChange={(e) => {
              const newStart = parseFloat(e.target.value);
              if (newStart < endT) onStartChange(newStart);
            }}
            className="flex-1 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-2.5
                       [&::-webkit-slider-thumb]:h-2.5
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-emerald-500
                       [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={endT}
            onChange={(e) => {
              const newEnd = parseFloat(e.target.value);
              if (newEnd > startT) onEndChange(newEnd);
            }}
            className="flex-1 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-2.5
                       [&::-webkit-slider-thumb]:h-2.5
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-rose-500
                       [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
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
    <div className="bg-white rounded-lg p-4 border border-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-neutral-800">{effect.name}</span>
        <button
          onClick={() => onChange({ ...effect, enabled: !effect.enabled })}
          className={`w-10 h-5 rounded-full transition-colors relative ${
            effect.enabled ? 'bg-neutral-800' : 'bg-neutral-200'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              effect.enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {effect.enabled && (
        <>
          {/* Value Range */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-medium text-neutral-600">Range</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-neutral-400 uppercase tracking-wider">Min</label>
                <input
                  type="number"
                  step={0.001}
                  value={effect.min}
                  onChange={(e) => onChange({ ...effect, min: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-800 font-mono focus:outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="text-[9px] text-neutral-400 uppercase tracking-wider">Max</label>
                <input
                  type="number"
                  step={0.001}
                  value={effect.max}
                  onChange={(e) => onChange({ ...effect, max: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-800 font-mono focus:outline-none focus:border-neutral-400"
                />
              </div>
            </div>
          </div>

          {/* Current State Values */}
          <div className="mb-4 flex justify-between text-[10px] font-mono px-1">
            <span className="text-emerald-600">
              Contracted: {contractedVal.toFixed(4)}
            </span>
            <span className="text-rose-600">
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
          <div className="border-t border-neutral-100 pt-3 mt-3">
            <button
              onClick={() => setShowCurve(!showCurve)}
              className="w-full flex items-center justify-between py-1 text-[11px] font-medium text-neutral-600"
            >
              <span>Curve</span>
              {showCurve ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {showCurve && (
              <div className="mt-2">
                <MultiPointCurveEditor
                  points={effect.curvePoints}
                  onChange={(curvePoints) => onChange({ ...effect, curvePoints })}
                  width={232}
                  height={140}
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
    <div className="border-b border-neutral-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-5 text-xs font-semibold text-neutral-700 uppercase tracking-wider"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-5">
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

  return (
    <div className="w-72 bg-neutral-50 border-l border-neutral-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-neutral-200">
        <h2 className="text-sm font-bold text-neutral-900">Settings</h2>
        <p className="text-[10px] text-neutral-400 mt-0.5">Digital Material Lab</p>
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
            <span className="text-[11px] font-medium text-neutral-600 block mb-2">Master Curve</span>
            <BezierCurveEditor
              value={animConfig.curve}
              onChange={(curve) => onAnimConfigChange({ ...animConfig, curve })}
              width={232}
              height={100}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {curvePresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onAnimConfigChange({ ...animConfig, curve: preset.curve })}
                  className="px-2.5 py-1 text-[10px] rounded-full bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition-colors"
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
            label="Gravity Attention"
            value={uniforms.gravAttention}
            min={0}
            max={1}
            onChange={(v) => updateUniform('gravAttention', v)}
          />
        </Section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 bg-white">
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={handleImport}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
