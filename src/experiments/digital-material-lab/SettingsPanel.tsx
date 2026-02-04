import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Download, Upload } from 'lucide-react';
import type { MaterialUniforms, AnimationConfig, Effect } from './index';
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
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-500 font-mono">
          {value.toFixed(3)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-[#2a2a3e] rounded-lg appearance-none cursor-pointer accent-violet-500"
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
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">Timeline Position</span>
        <span className="text-xs text-gray-500 font-mono">
          {(startT * 100).toFixed(0)}% → {(endT * 100).toFixed(0)}%
        </span>
      </div>

      {/* Visual timeline bar */}
      <div className="relative h-6 bg-[#1a1a24] rounded border border-[#2a2a3e] mb-2">
        {/* Active range indicator */}
        <div
          className="absolute top-1 bottom-1 bg-violet-500/30 rounded"
          style={{
            left: `${startT * 100}%`,
            width: `${(endT - startT) * 100}%`,
          }}
        />
        {/* Start marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-emerald-500 rounded"
          style={{ left: `calc(${startT * 100}% - 2px)` }}
        />
        {/* End marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-rose-500 rounded"
          style={{ left: `calc(${endT * 100}% - 2px)` }}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 w-8">Start</span>
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
            className="flex-1 h-1.5 bg-[#2a2a3e] rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-rose-400 w-8">End</span>
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
            className="flex-1 h-1.5 bg-[#2a2a3e] rounded-lg appearance-none cursor-pointer accent-rose-500"
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

  const curvePresets: { name: string; curve: BezierCurve }[] = [
    { name: 'linear', curve: CURVES.linear },
    { name: 'ease', curve: CURVES.ease },
    { name: 'ease-out', curve: CURVES.easeOut },
    { name: 'elastic', curve: CURVES.elastic },
  ];

  // Calculate current value display (for reference)
  const currentStartVal = effect.min + (effect.max - effect.min) * effect.curveStart;
  const currentEndVal = effect.min + (effect.max - effect.min) * effect.curveEnd;

  return (
    <div className="bg-[#1a1a24] rounded-lg p-3 border border-[#2a2a3e]">
      {/* Header with enable toggle */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-300">{effect.name}</span>
        <button
          onClick={() => onChange({ ...effect, enabled: !effect.enabled })}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            effect.enabled
              ? 'bg-violet-500/20 text-violet-300'
              : 'bg-gray-700/30 text-gray-500'
          }`}
        >
          {effect.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {effect.enabled && (
        <>
          {/* Min/Max Range */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Effect Range</span>
              <span className="text-xs text-gray-500 font-mono">
                {effect.min.toFixed(3)} - {effect.max.toFixed(3)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-500">Min</span>
                <input
                  type="number"
                  step={0.001}
                  value={effect.min}
                  onChange={(e) => onChange({ ...effect, min: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-1 bg-[#2a2a3e] rounded text-xs text-gray-300 font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500">Max</span>
                <input
                  type="number"
                  step={0.001}
                  value={effect.max}
                  onChange={(e) => onChange({ ...effect, max: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-1 bg-[#2a2a3e] rounded text-xs text-gray-300 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Current values display */}
          <div className="mb-3 p-2 bg-[#0d0d14] rounded text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-emerald-400">Start Value: {currentStartVal.toFixed(4)}</span>
              <span className="text-rose-400">End Value: {currentEndVal.toFixed(4)}</span>
            </div>
          </div>

          {/* Timeline Position */}
          <TimelineRange
            startT={effect.startT}
            endT={effect.endT}
            onStartChange={(v) => onChange({ ...effect, startT: v })}
            onEndChange={(v) => onChange({ ...effect, endT: v })}
          />

          {/* Curve Editor Toggle */}
          <button
            onClick={() => setShowCurve(!showCurve)}
            className="w-full flex items-center justify-between py-2 text-xs text-gray-400 active:text-white transition-colors"
          >
            <span>Motion Curve</span>
            {showCurve ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>

          {showCurve && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-500 mb-2">
                Drag green/red endpoints to set start/end values (0-1 of range)
              </p>
              <BezierCurveEditor
                value={effect.curve}
                onChange={(curve) => onChange({ ...effect, curve })}
                curveStart={effect.curveStart}
                curveEnd={effect.curveEnd}
                onCurveStartChange={(v) => onChange({ ...effect, curveStart: v })}
                onCurveEndChange={(v) => onChange({ ...effect, curveEnd: v })}
                width={220}
                height={140}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {curvePresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => onChange({ ...effect, curve: preset.curve })}
                    className="px-2 py-0.5 text-[10px] rounded bg-[#2a2a3e] text-gray-400 active:bg-[#3a3a4e] active:text-white transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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
    <div className="border-b border-[#2a2a3e] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-4 text-sm font-medium text-gray-300 active:text-white transition-colors"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
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
    <div className="w-80 bg-[#12121a]/95 backdrop-blur-xl border-l border-[#2a2a3e] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a3e]">
        <h2 className="text-sm font-semibold text-white">Settings</h2>
        <p className="text-xs text-gray-500">Digital Material Lab</p>
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

          <div className="mb-3">
            <span className="text-xs text-gray-400 block mb-2">Master Curve</span>
            <BezierCurveEditor
              value={animConfig.curve}
              onChange={(curve) => onAnimConfigChange({ ...animConfig, curve })}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {curvePresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onAnimConfigChange({ ...animConfig, curve: preset.curve })}
                  className="px-2 py-1 text-xs rounded bg-[#2a2a3e] text-gray-400 active:bg-[#3a3a4e] active:text-white transition-colors"
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
        <Section title="Digital Physics" defaultOpen={false}>
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
            label="Grav. Attention"
            value={uniforms.gravAttention}
            min={0}
            max={1}
            onChange={(v) => updateUniform('gravAttention', v)}
          />
        </Section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#2a2a3e]">
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-violet-500/20 text-violet-300 active:bg-violet-500/30 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleImport}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#2a2a3e] text-gray-300 active:bg-[#3a3a4e] transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-lg bg-[#2a2a3e] text-gray-300 active:bg-[#3a3a4e] transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
