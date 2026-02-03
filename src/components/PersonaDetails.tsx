import { useSimulationStore } from '../store/simulationStore';
import { ARCHETYPE_LABELS } from '../types';
import {
  User,
  MapPin,
  Briefcase,
  Clock,
  Users,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

export function PersonaDetails() {
  const { personas, selectedPersonaId } = useSimulationStore();
  const persona = personas.find((p) => p.id === selectedPersonaId);

  if (!persona) {
    return (
      <div className="p-4 text-gray-500 text-center">
        <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Select a persona to view details</p>
      </div>
    );
  }

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${h}:00 ${ampm}`;
  };

  const workDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
          style={{ backgroundColor: persona.avatarColor }}
        >
          {persona.name
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{persona.name}</h3>
          <p className="text-sm text-indigo-400">
            {ARCHETYPE_LABELS[persona.archetype]}
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard icon={User} label="Age" value={`${persona.age} years`} />
        <InfoCard icon={MapPin} label="Location" value={persona.location} />
        <InfoCard
          icon={Briefcase}
          label="Occupation"
          value={persona.occupation}
          colSpan={2}
        />
      </div>

      {/* Schedule */}
      <div className="bg-[#2a2a3e] rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Schedule
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Wake Time</span>
            <span className="text-white">{formatHour(persona.typicalWakeTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Sleep Time</span>
            <span className="text-white">{formatHour(persona.typicalSleepTime)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Work Days</span>
            <div className="flex gap-1">
              {workDayNames.map((day, i) => (
                <span
                  key={day}
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    persona.workDays.includes(i)
                      ? 'bg-indigo-500 text-white'
                      : 'bg-[#363650] text-gray-500'
                  }`}
                >
                  {day[0]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral Traits */}
      <div className="bg-[#2a2a3e] rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Behavioral Traits
        </h4>
        <div className="space-y-3">
          <TraitBar
            label="Routine Consistency"
            value={1 - persona.routineVariance}
            lowLabel="Chaotic"
            highLabel="Consistent"
          />
          <TraitBar
            label="Notification Tolerance"
            value={persona.notificationTolerance}
            lowLabel="Low"
            highLabel="High"
          />
        </div>
      </div>

      {/* Communication */}
      <div className="bg-[#2a2a3e] rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> Communication
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Style</span>
            <span className="text-white capitalize">
              {persona.communicationStyle.replace('-', ' ')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Social Circle</span>
            <span className="text-white">{persona.socialCircleSize} contacts</span>
          </div>
        </div>
      </div>

      {/* App Preferences */}
      <div className="bg-[#2a2a3e] rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-400 mb-2">App Preferences</h4>
        <div className="space-y-2">
          {Object.entries(persona.appPreferences)
            .sort((a, b) => b[1] - a[1])
            .map(([category, weight]) => (
              <div key={category} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-24 capitalize">{category}</span>
                <div className="flex-1 h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    style={{ width: `${weight * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {Math.round(weight * 100)}%
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Unique Patterns */}
      <div className="bg-[#2a2a3e] rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Unique Patterns</h4>
        <ul className="space-y-1">
          {persona.uniquePatterns.map((pattern, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              {pattern}
            </li>
          ))}
        </ul>
      </div>

      {/* Top Contacts */}
      <div className="bg-[#2a2a3e] rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" /> Key Contacts
        </h4>
        <div className="space-y-2">
          {persona.contacts
            .filter((c) => c.priority === 'high')
            .slice(0, 5)
            .map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-300">{contact.name}</span>
                <span className="text-xs text-gray-500 capitalize">
                  {contact.relationship}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

interface InfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  colSpan?: number;
}

function InfoCard({ icon: Icon, label, value, colSpan = 1 }: InfoCardProps) {
  return (
    <div
      className={`bg-[#2a2a3e] rounded-lg p-3 ${colSpan === 2 ? 'col-span-2' : ''}`}
    >
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-sm text-white">{value}</div>
    </div>
  );
}

interface TraitBarProps {
  label: string;
  value: number;
  lowLabel: string;
  highLabel: string;
}

function TraitBar({ label, value, lowLabel, highLabel }: TraitBarProps) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">{Math.round(value * 100)}%</span>
      </div>
      <div className="relative">
        <div className="h-2 bg-[#1e1e2e] rounded-full">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all"
            style={{ width: `${value * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      </div>
    </div>
  );
}
