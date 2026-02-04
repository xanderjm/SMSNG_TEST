import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, X, Copy, Download, Upload } from 'lucide-react';
import type { MaterialUniforms, AnimationConfig } from './index';
import { BezierCurveEditor } from './BezierCurveEditor';
import { CURVES } from './animation';
import type { BezierCurve } from './animation';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
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
        className="w-full h-1.5 bg-[#2a2a3e] rounded-lg appearance-none cursor-pointer accent-violet-500"
      />
    </div>
  );
}

interface ColorPickerProps {
  label: string;
  value: [number, number, number];
  onChange: (value: [number, number, number]) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const hexColor = `#${value.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;

  const handleChange = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    onChange([r, g, b]);
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-500 font-mono">{hexColor}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hexColor}
          onChange={(e) => handleChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
        />
        <div
          className="flex-1 h-6 rounded"
          style={{ backgroundColor: hexColor }}
        />
      </div>
    </div>
  );
}

interface Vector2ControlProps {
  label: string;
  value: [number, number];
  min: number;
  max: number;
  onChange: (value: [number, number]) => void;
}

function Vector2Control({ label, value, min, max, onChange }: Vector2ControlProps) {
  const size = 80;
  const padding = 8;
  const innerSize = size - padding * 2;

  const normalizedX = (value[0] - min) / (max - min);
  const normalizedY = (value[1] - min) / (max - min);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left - padding) / innerSize));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top - padding) / innerSize));
    onChange([
      min + x * (max - min),
      min + y * (max - min),
    ]);
  }, [min, max, onChange, innerSize]);

  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-500 font-mono">
          [{value[0].toFixed(2)}, {value[1].toFixed(2)}]
        </span>
      </div>
      <div
        className="relative bg-[#1a1a24] rounded-lg border border-[#2a2a3e] cursor-crosshair"
        style={{ width: size, height: size }}
        onMouseDown={(e) => {
          setIsDragging(true);
          handleMouseMove(e);
        }}
        onMouseMove={(e) => isDragging && handleMouseMove(e)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {/* Grid lines */}
        <div className="absolute inset-0" style={{ padding }}>
          <div className="w-full h-full relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#2a2a3e]" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-[#2a2a3e]" />
          </div>
        </div>

        {/* Control point */}
        <div
          className="absolute w-3 h-3 bg-violet-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: padding + normalizedX * innerSize,
            top: padding + (1 - normalizedY) * innerSize,
          }}
        />
      </div>
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
        className="w-full flex items-center justify-between py-3 px-4 text-sm font-medium text-gray-300 hover:text-white transition-colors"
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
  isOpen,
  onClose,
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
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-[#12121a]/95 backdrop-blur-xl border-l border-[#2a2a3e] z-50 transform transition-transform duration-300 overflow-hidden flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a3e]">
          <div>
            <h2 className="text-sm font-semibold text-white">Settings</h2>
            <p className="text-xs text-gray-500">Digital Material Lab</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a3e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
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
                    className="px-2 py-1 text-xs rounded bg-[#2a2a3e] text-gray-400 hover:text-white hover:bg-[#3a3a4e] transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Lighting Section */}
          <Section title="Lighting">
            <Slider
              label="Intensity"
              value={uniforms.lightIntensity}
              min={0}
              max={3}
              onChange={(v) => updateUniform('lightIntensity', v)}
            />
            <ColorPicker
              label="Color"
              value={uniforms.lightColor}
              onChange={(v) => updateUniform('lightColor', v)}
            />
            <Slider
              label="Diffusion"
              value={uniforms.lightDiffusion}
              min={0}
              max={1}
              onChange={(v) => updateUniform('lightDiffusion', v)}
            />
            <Slider
              label="Focus"
              value={uniforms.lightFocus}
              min={0}
              max={1}
              onChange={(v) => updateUniform('lightFocus', v)}
            />
            <Vector2Control
              label="Direction"
              value={uniforms.lightDirection}
              min={-1}
              max={1}
              onChange={(v) => updateUniform('lightDirection', v)}
            />
          </Section>

          {/* Material Section */}
          <Section title="Material" defaultOpen={false}>
            <Slider
              label="Emission"
              value={uniforms.emission}
              min={0}
              max={2}
              onChange={(v) => updateUniform('emission', v)}
            />
            <Slider
              label="Transparency"
              value={uniforms.transparency}
              min={0}
              max={1}
              onChange={(v) => updateUniform('transparency', v)}
            />
            <Slider
              label="Refraction"
              value={uniforms.refraction}
              min={0}
              max={0.5}
              onChange={(v) => updateUniform('refraction', v)}
            />
            <Slider
              label="Dispersion"
              value={uniforms.dispersion}
              min={0}
              max={0.1}
              onChange={(v) => updateUniform('dispersion', v)}
            />
            <Slider
              label="Absorption"
              value={uniforms.absorption}
              min={0}
              max={1}
              onChange={(v) => updateUniform('absorption', v)}
            />
            <Slider
              label="Scattering"
              value={uniforms.scattering}
              min={0}
              max={1}
              onChange={(v) => updateUniform('scattering', v)}
            />
            <Slider
              label="Reflection"
              value={uniforms.reflection}
              min={0}
              max={1}
              onChange={(v) => updateUniform('reflection', v)}
            />
          </Section>

          {/* Shadows Section */}
          <Section title="Shadows" defaultOpen={false}>
            <Slider
              label="Intensity"
              value={uniforms.shadowIntensity}
              min={0}
              max={1}
              onChange={(v) => updateUniform('shadowIntensity', v)}
            />
            <Slider
              label="Softness"
              value={uniforms.shadowSoftness}
              min={0}
              max={1}
              onChange={(v) => updateUniform('shadowSoftness', v)}
            />
            <Vector2Control
              label="Offset"
              value={uniforms.shadowOffset}
              min={-0.1}
              max={0.1}
              onChange={(v) => updateUniform('shadowOffset', v)}
            />
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
              label="Gravitational Attention"
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
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleImport}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-colors text-sm"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-lg bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e] transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
