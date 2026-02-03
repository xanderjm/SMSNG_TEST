import { Smartphone, Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-[#1e1e2e] border-b border-[#363650] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              Agentic Device Simulation
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-xs text-gray-500">
              Testing Human-Centered Adaptive Interfaces
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500">Research Tool</div>
            <div className="text-sm text-gray-400">FIELD.IO × Samsung One UI</div>
          </div>
        </div>
      </div>
    </header>
  );
}
