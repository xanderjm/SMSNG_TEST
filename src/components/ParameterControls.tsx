import { useSimulationStore } from '../store/simulationStore';
import { Settings, Sliders, Eye, Shield } from 'lucide-react';
import type { TunableParameters } from '../types';

export function ParameterControls() {
  const {
    parameters,
    setConfidenceThreshold,
    setProactivityLevel,
    setPrivacyBoundary,
  } = useSimulationStore();

  return (
    <div className="bg-[#2a2a3e] rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Tunable Parameters
      </h3>

      {/* Confidence Threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-400 flex items-center gap-1.5">
            <Sliders className="w-3 h-3" />
            Confidence Threshold
          </label>
          <span className="text-xs text-indigo-400">{parameters.confidenceThreshold}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={parameters.confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
          className="w-full h-1.5 bg-[#1e1e2e] rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <p className="text-[10px] text-gray-600">
          How certain the system must be before taking action
        </p>
      </div>

      {/* Proactivity Level */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 flex items-center gap-1.5">
          <Eye className="w-3 h-3" />
          Proactivity Level
        </label>
        <div className="flex gap-1">
          {(['low', 'medium', 'high'] as TunableParameters['proactivityLevel'][]).map(
            (level) => (
              <button
                key={level}
                onClick={() => setProactivityLevel(level)}
                className={`flex-1 py-1.5 text-xs rounded transition-colors capitalize ${
                  parameters.proactivityLevel === level
                    ? 'bg-indigo-500 text-white'
                    : 'bg-[#1e1e2e] text-gray-400 hover:bg-[#363650]'
                }`}
              >
                {level}
              </button>
            )
          )}
        </div>
        <p className="text-[10px] text-gray-600">
          How forward the device should be with suggestions
        </p>
      </div>

      {/* Privacy Boundary */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 flex items-center gap-1.5">
          <Shield className="w-3 h-3" />
          Privacy Boundary
        </label>
        <div className="flex gap-1">
          {(['minimal', 'moderate', 'maximum'] as TunableParameters['privacyBoundary'][]).map(
            (boundary) => (
              <button
                key={boundary}
                onClick={() => setPrivacyBoundary(boundary)}
                className={`flex-1 py-1.5 text-xs rounded transition-colors capitalize ${
                  parameters.privacyBoundary === boundary
                    ? 'bg-indigo-500 text-white'
                    : 'bg-[#1e1e2e] text-gray-400 hover:bg-[#363650]'
                }`}
              >
                {boundary}
              </button>
            )
          )}
        </div>
        <p className="text-[10px] text-gray-600">
          How much inference is acceptable from personal data
        </p>
      </div>

      {/* Parameter Explanation */}
      <div className="bg-[#1e1e2e] rounded-lg p-3 mt-4">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Current Configuration</h4>
        <ul className="space-y-1 text-[10px] text-gray-500">
          <li>
            {parameters.confidenceThreshold >= 80
              ? 'Only high-confidence actions will be taken'
              : parameters.confidenceThreshold >= 50
              ? 'Moderate confidence required for actions'
              : 'Lower confidence threshold allows more proactive behavior'}
          </li>
          <li>
            {parameters.proactivityLevel === 'low'
              ? 'Device will mostly wait for user input'
              : parameters.proactivityLevel === 'medium'
              ? 'Device will make contextual suggestions'
              : 'Device will actively surface information and suggestions'}
          </li>
          <li>
            {parameters.privacyBoundary === 'minimal'
              ? 'Maximum inference from all available signals'
              : parameters.privacyBoundary === 'moderate'
              ? 'Balanced approach to personal data inference'
              : 'Minimal inference, focusing on explicit signals only'}
          </li>
        </ul>
      </div>
    </div>
  );
}
