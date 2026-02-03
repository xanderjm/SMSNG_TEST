import { useSimulationStore } from '../store/simulationStore';
import {
  Activity,
  Eye,
  Brain,
  Zap,
  Link2,
  Target,
  Clock,
  BarChart3,
  Gauge,
  Smartphone,
  MapPin,
  Heart,
  Calendar,
  MessageSquare,
  BellOff,
  Volume2,
} from 'lucide-react';

export function ContextDebugPanel() {
  const { currentMoment, contextSynthesis, orchestratorState, personas, selectedPersonaId } =
    useSimulationStore();

  const persona = personas.find((p) => p.id === selectedPersonaId);

  if (!currentMoment || !contextSynthesis || !orchestratorState || !persona) {
    return (
      <div className="p-4 text-gray-500 text-center h-full flex items-center justify-center">
        <div>
          <Brain className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Select a persona to view context analysis</p>
        </div>
      </div>
    );
  }

  const { activeInputs, passiveInputs, memoryBuckets } = currentMoment;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Active Signals */}
      <Section title="Active Inputs" icon={Zap}>
        <div className="grid grid-cols-2 gap-2">
          <SignalItem
            icon={Smartphone}
            label="Position"
            value={activeInputs.devicePosition}
            highlight={activeInputs.devicePosition === 'hand'}
          />
          <SignalItem
            icon={Activity}
            label="Motion"
            value={activeInputs.deviceMotion}
            highlight={activeInputs.isMoving}
          />
          <SignalItem
            icon={MapPin}
            label="Location"
            value={activeInputs.semanticLocation}
            highlight={activeInputs.semanticLocation === 'work'}
          />
          <SignalItem
            icon={Heart}
            label="Heart Rate"
            value={`${activeInputs.heartRate} bpm`}
            highlight={activeInputs.heartRate > 90}
          />
          <SignalItem
            icon={Gauge}
            label="Stress Level"
            value={`${Math.round(activeInputs.stressLevel * 100)}%`}
            highlight={activeInputs.stressLevel > 0.6}
          />
          <SignalItem
            icon={Eye}
            label="Active App"
            value={activeInputs.activeApp || 'None'}
          />
        </div>

        {activeInputs.isOnCall && (
          <div className="mt-2 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
            Currently on a phone call
          </div>
        )}
      </Section>

      {/* Passive Signals */}
      <Section title="Passive Inputs" icon={Eye}>
        <div className="grid grid-cols-2 gap-2">
          <SignalItem
            icon={Clock}
            label="Time"
            value={`${passiveInputs.hour}:00`}
          />
          <SignalItem
            icon={Calendar}
            label="Day"
            value={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][passiveInputs.dayOfWeek]}
          />
          <SignalItem
            icon={Activity}
            label="Weather"
            value={passiveInputs.weather}
          />
          <SignalItem
            icon={Activity}
            label="Traffic"
            value={passiveInputs.trafficLevel}
          />
          <SignalItem
            icon={Activity}
            label="Battery"
            value={`${passiveInputs.batteryLevel}%`}
            highlight={passiveInputs.batteryLevel < 20}
          />
          <SignalItem
            icon={MessageSquare}
            label="Unread"
            value={`${passiveInputs.unreadCount} msgs`}
            highlight={passiveInputs.unreadCount > 5}
          />
        </div>

        <div className="mt-2 flex gap-2">
          {passiveInputs.isDoNotDisturb && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded flex items-center gap-1">
              <BellOff className="w-3 h-3" /> DND
            </span>
          )}
          {passiveInputs.isSilentMode && (
            <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Silent
            </span>
          )}
        </div>

        {passiveInputs.calendarEvents.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Calendar Events:</div>
            {passiveInputs.calendarEvents.slice(0, 3).map((event, i) => (
              <div key={i} className="text-xs text-gray-400 flex justify-between">
                <span>{event.title}</span>
                <span>{event.startHour}:00-{event.endHour}:00</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Derived States */}
      <Section title="Derived States" icon={Brain}>
        <div className="space-y-2">
          <DerivedState
            label="Focus Window"
            active={contextSynthesis.derivedFocusWindow}
            description="Optimal conditions for deep work detected"
          />
          <DerivedState
            label="Stress State"
            active={contextSynthesis.derivedStressState}
            description="Elevated stress indicators present"
          />
          <DerivedState
            label="Transition State"
            active={contextSynthesis.derivedTransitionState}
            description="User is moving between contexts"
          />
          <DerivedState
            label="Personal Time"
            active={contextSynthesis.derivedPersonalTime}
            description="Home/personal context detected"
          />
          <DerivedState
            label="Wind-Down Mode"
            active={contextSynthesis.derivedWindDownMode}
            description="Late night / pre-sleep period"
          />
        </div>
      </Section>

      {/* Active Patterns */}
      <Section title="Active Patterns" icon={Target}>
        <div className="flex flex-wrap gap-1">
          {contextSynthesis.activePatterns.map((pattern) => (
            <span
              key={pattern}
              className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded"
            >
              {pattern}
            </span>
          ))}
          {contextSynthesis.activePatterns.length === 0 && (
            <span className="text-xs text-gray-500">No active patterns</span>
          )}
        </div>
      </Section>

      {/* Signal Weights */}
      <Section title="Signal Weights" icon={Link2}>
        {contextSynthesis.activeWeights.length > 0 ? (
          <div className="space-y-3">
            {contextSynthesis.activeWeights.map((weight, i) => (
              <div key={i} className="bg-[#1e1e2e] rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-indigo-400">{weight.signalA}</span>
                  <Link2 className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-purple-400">{weight.signalB}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#363650] rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      style={{ width: `${weight.weight * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">
                    {Math.round(weight.weight * 100)}%
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  {weight.interpretation}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">No active weight relationships</div>
        )}
      </Section>

      {/* Rhythm Match */}
      <Section title="Rhythm Match" icon={BarChart3}>
        <div className="space-y-2">
          <RhythmBar label="Daily" value={contextSynthesis.rhythmMatch.daily} />
          <RhythmBar label="Weekly" value={contextSynthesis.rhythmMatch.weekly} />
          <RhythmBar label="Contextual" value={contextSynthesis.rhythmMatch.contextual} />
        </div>
      </Section>

      {/* Agent Decisions */}
      <Section title="Agent Decisions" icon={Brain}>
        {orchestratorState.recentDecisions.length > 0 ? (
          <div className="space-y-2">
            {orchestratorState.recentDecisions.map((decision, i) => (
              <div key={i} className="bg-[#1e1e2e] rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">
                    {decision.agentName}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      decision.confidence > 0.8
                        ? 'bg-green-500/20 text-green-400'
                        : decision.confidence > 0.6
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {Math.round(decision.confidence * 100)}%
                  </span>
                </div>
                <div className="text-xs text-indigo-400 mb-1">{decision.action}</div>
                <div className="text-[10px] text-gray-500">{decision.reasoning}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">No agent decisions at this moment</div>
        )}
      </Section>

      {/* Memory State */}
      <Section title="Memory State" icon={Activity}>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Current Mode</span>
            <span className="text-white capitalize">
              {memoryBuckets.contextState.currentMode}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Energy Level</span>
            <span className="text-white">
              {Math.round(memoryBuckets.contextState.energyLevel * 100)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Social Availability</span>
            <span className="text-white">
              {Math.round(memoryBuckets.contextState.socialAvailability * 100)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Focus Level</span>
            <span className="text-white">
              {Math.round(memoryBuckets.currentIntent.focusLevel * 100)}%
            </span>
          </div>
          {memoryBuckets.currentIntent.activeGoal && (
            <div className="mt-2 p-2 bg-[#1e1e2e] rounded">
              <div className="text-gray-500 mb-1">Active Goal</div>
              <div className="text-indigo-400">{memoryBuckets.currentIntent.activeGoal}</div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, children }: SectionProps) {
  return (
    <div className="bg-[#2a2a3e] rounded-lg p-3">
      <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {title}
      </h4>
      {children}
    </div>
  );
}

interface SignalItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}

function SignalItem({ icon: Icon, label, value, highlight }: SignalItemProps) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded ${
        highlight ? 'bg-indigo-500/10' : 'bg-[#1e1e2e]'
      }`}
    >
      <Icon className={`w-3 h-3 ${highlight ? 'text-indigo-400' : 'text-gray-500'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-gray-500">{label}</div>
        <div className={`text-xs truncate ${highlight ? 'text-indigo-300' : 'text-white'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

interface DerivedStateProps {
  label: string;
  active: boolean;
  description: string;
}

function DerivedState({ label, active, description }: DerivedStateProps) {
  return (
    <div
      className={`p-2 rounded flex items-start gap-2 ${
        active ? 'bg-green-500/10' : 'bg-[#1e1e2e]'
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full mt-1 ${
          active ? 'bg-green-500' : 'bg-gray-600'
        }`}
      />
      <div>
        <div className={`text-xs ${active ? 'text-green-400' : 'text-gray-400'}`}>
          {label}
        </div>
        <div className="text-[10px] text-gray-600">{description}</div>
      </div>
    </div>
  );
}

interface RhythmBarProps {
  label: string;
  value: number;
}

function RhythmBar({ label, value }: RhythmBarProps) {
  const color =
    value > 0.7 ? 'from-green-500 to-emerald-500' : value > 0.4 ? 'from-amber-500 to-yellow-500' : 'from-red-500 to-orange-500';

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 bg-[#1e1e2e] rounded-full">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}
