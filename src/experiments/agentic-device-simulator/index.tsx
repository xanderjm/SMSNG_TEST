import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSimulationStore } from '../../store/simulationStore';
import { Header } from '../../components/Header';
import { PersonSelector } from '../../components/PersonSelector';
import { PersonaDetails } from '../../components/PersonaDetails';
import { PhoneSimulator } from '../../components/PhoneSimulator';
import { ContextDebugPanel } from '../../components/ContextDebugPanel';
import { TimelineControls } from '../../components/TimelineControls';
import { ParameterControls } from '../../components/ParameterControls';
import { Loader2, Users, Brain, Settings, ArrowLeft } from 'lucide-react';

type TabId = 'persona' | 'debug' | 'params';

export function AgenticDeviceSimulator() {
  const { initializePersonas, personas } = useSimulationStore();
  const [isLoading, setIsLoading] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<TabId>('debug');

  useEffect(() => {
    // Initialize personas on mount
    initializePersonas();
    setIsLoading(false);
  }, [initializePersonas]);

  if (isLoading || personas.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e1e2e]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Generating personas...</p>
          <p className="text-xs text-gray-600 mt-2">Creating 100 unique personas with behavioral patterns</p>
        </div>
      </div>
    );
  }

  const rightTabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'debug', label: 'Context', icon: Brain },
    { id: 'persona', label: 'Persona', icon: Users },
    { id: 'params', label: 'Params', icon: Settings },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#1e1e2e] overflow-hidden">
      {/* Back Navigation */}
      <div className="absolute top-4 left-4 z-50">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2a2a3e]/80 backdrop-blur-sm text-gray-400 hover:text-white hover:bg-[#3a3a4e] transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lab</span>
        </Link>
      </div>

      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Person Selector */}
        <div className="w-72 flex-shrink-0">
          <PersonSelector />
        </div>

        {/* Center - Phone Simulator */}
        <div className="flex-1 flex flex-col bg-[#16161e]">
          <div className="flex-1 overflow-hidden">
            <PhoneSimulator />
          </div>
        </div>

        {/* Right Sidebar - Context Debug / Persona Details / Parameters */}
        <div className="w-96 flex-shrink-0 border-l border-[#363650] flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-[#363650]">
            {rightTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveRightTab(tab.id)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeRightTab === tab.id
                    ? 'text-white border-b-2 border-indigo-500 bg-[#2a2a3e]'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#252532]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeRightTab === 'debug' && <ContextDebugPanel />}
            {activeRightTab === 'persona' && <PersonaDetails />}
            {activeRightTab === 'params' && (
              <div className="p-4 overflow-y-auto h-full">
                <ParameterControls />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom - Timeline Controls */}
      <TimelineControls />
    </div>
  );
}

export default AgenticDeviceSimulator;
