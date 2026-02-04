import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Download, Upload } from 'lucide-react';
import type { MaterialUniforms, AnimationConfig } from './index';
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
        className="w-full h-2 bg-[#2a2a3e] rounded-lg appearance-none cursor-pointer accent-violet-500"
      />
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

  return (
    <div className="w-72 bg-[#12121a]/95 backdrop-blur-xl border-l border-[#2a2a3e] flex flex-col overflow-hidden">
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

        {/* Digital Physics Section */}
        <Section title="Digital Physics">
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

        {/* Geometry Section */}
        <Section title="Geometry" defaultOpen={false}>
          <Slider
            label="Corner Radius"
            value={uniforms.cornerRadius}
            min={0.01}
            max={0.2}
            onChange={(v) => updateUniform('cornerRadius', v)}
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
