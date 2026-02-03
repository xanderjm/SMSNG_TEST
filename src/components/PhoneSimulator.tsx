import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '../store/simulationStore';
import {
  Battery,
  Wifi,
  BellOff,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Calendar,
  Music,
  MessageSquare,
  ChevronRight,
  Clock,
  MapPin,
  Heart,
  Moon,
  Coffee,
  Car,
  Home,
  Users,
  Dumbbell,
  Phone,
  Camera,
  Plane,
  AlertCircle,
  CheckCircle,
  Brain,
  Sparkles,
  Timer,
  Shield,
  Volume2,
  VolumeX,
  Headphones,
  Navigation,
  Bell,
  FileText,
  Video,
  Mic,
  Play,
  SkipForward,
  Activity,
  Sunrise,
  Star,
  BookOpen,
  ShoppingBag,
} from 'lucide-react';
import type { PhoneScreenState, MomentState, Persona, ContextSynthesis, OrchestratorState } from '../types';

// Define the different contextual spaces
type SpaceType =
  | 'morning-routine'
  | 'commute'
  | 'work-focus'
  | 'meeting'
  | 'exercise'
  | 'social'
  | 'personal'
  | 'wind-down'
  | 'rest'
  | 'travel'
  | 'errand'
  | 'default';

interface SpaceConfig {
  name: string;
  icon: React.ElementType;
  gradient: string;
  accentColor: string;
  description: string;
}

const SPACE_CONFIGS: Record<SpaceType, SpaceConfig> = {
  'morning-routine': {
    name: 'Morning',
    icon: Sunrise,
    gradient: 'from-amber-400 via-orange-300 to-yellow-200',
    accentColor: 'text-amber-600',
    description: 'Starting your day',
  },
  'commute': {
    name: 'Commute',
    icon: Car,
    gradient: 'from-blue-500 via-cyan-400 to-teal-300',
    accentColor: 'text-blue-600',
    description: 'On the move',
  },
  'work-focus': {
    name: 'Focus',
    icon: Brain,
    gradient: 'from-indigo-600 via-purple-500 to-violet-400',
    accentColor: 'text-indigo-600',
    description: 'Deep work mode',
  },
  'meeting': {
    name: 'Meeting',
    icon: Users,
    gradient: 'from-slate-700 via-slate-600 to-slate-500',
    accentColor: 'text-slate-300',
    description: 'In session',
  },
  'exercise': {
    name: 'Active',
    icon: Dumbbell,
    gradient: 'from-green-500 via-emerald-400 to-teal-300',
    accentColor: 'text-green-600',
    description: 'Workout mode',
  },
  'social': {
    name: 'Social',
    icon: Users,
    gradient: 'from-pink-500 via-rose-400 to-red-300',
    accentColor: 'text-pink-600',
    description: 'With others',
  },
  'personal': {
    name: 'Home',
    icon: Home,
    gradient: 'from-purple-400 via-violet-300 to-indigo-200',
    accentColor: 'text-purple-600',
    description: 'Personal time',
  },
  'wind-down': {
    name: 'Wind Down',
    icon: Moon,
    gradient: 'from-indigo-900 via-purple-800 to-violet-700',
    accentColor: 'text-indigo-300',
    description: 'Preparing for rest',
  },
  'rest': {
    name: 'Rest',
    icon: Moon,
    gradient: 'from-slate-900 via-gray-800 to-zinc-700',
    accentColor: 'text-gray-400',
    description: 'Sleep mode',
  },
  'travel': {
    name: 'Travel',
    icon: Plane,
    gradient: 'from-sky-500 via-blue-400 to-indigo-300',
    accentColor: 'text-sky-600',
    description: 'Away from home',
  },
  'errand': {
    name: 'Errands',
    icon: ShoppingBag,
    gradient: 'from-orange-400 via-amber-300 to-yellow-200',
    accentColor: 'text-orange-600',
    description: 'Getting things done',
  },
  'default': {
    name: 'Ready',
    icon: Sparkles,
    gradient: 'from-gray-100 via-slate-100 to-zinc-100',
    accentColor: 'text-gray-700',
    description: 'At your service',
  },
};

// Determine the current space based on context
function determineSpace(
  moment: MomentState,
  persona: Persona,
  synthesis: ContextSynthesis | null
): SpaceType {
  const { activeInputs, passiveInputs, memoryBuckets } = moment;
  const hour = passiveInputs.hour;
  const location = activeInputs.semanticLocation;

  // Rest period
  if (hour < persona.typicalWakeTime || hour >= persona.typicalSleepTime + 1) {
    return 'rest';
  }

  // Wind-down mode
  if (synthesis?.derivedWindDownMode || (hour >= persona.typicalSleepTime - 2 && hour < persona.typicalSleepTime)) {
    return 'wind-down';
  }

  // Morning routine
  if (hour >= persona.typicalWakeTime && hour < persona.typicalWakeTime + 2) {
    return 'morning-routine';
  }

  // In meeting
  const inMeeting = passiveInputs.calendarEvents.some(
    e => e.startHour <= hour && e.endHour > hour && e.type === 'meeting'
  );
  if (inMeeting) {
    return 'meeting';
  }

  // Exercise
  if (location === 'gym' || activeInputs.deviceMotion === 'running') {
    return 'exercise';
  }

  // Commute
  if (location === 'commute' || activeInputs.deviceMotion === 'vehicle') {
    return 'commute';
  }

  // Travel
  if (location === 'traveling') {
    return 'travel';
  }

  // Shopping/errands
  if (location === 'shopping') {
    return 'errand';
  }

  // Social
  if (location === 'social' || passiveInputs.nearbyContacts.length > 1) {
    return 'social';
  }

  // Work focus
  if (synthesis?.derivedFocusWindow || (location === 'work' && memoryBuckets.currentIntent.focusLevel > 0.5)) {
    return 'work-focus';
  }

  // Personal/home time
  if (location === 'home' && (passiveInputs.dayOfWeek === 0 || passiveInputs.dayOfWeek === 6 || hour >= 18)) {
    return 'personal';
  }

  return 'default';
}

export function PhoneSimulator() {
  const { phoneScreenState, orchestratorState, currentMoment, contextSynthesis, personas, selectedPersonaId } =
    useSimulationStore();

  const persona = personas.find((p) => p.id === selectedPersonaId);

  if (!phoneScreenState || !persona || !currentMoment) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-center">
          {/* Samsung Galaxy S25 Ultra - empty state */}
          <div className="w-[280px] h-[608px] border-[3px] border-gray-600 rounded-[1.25rem] mx-auto mb-4 flex items-center justify-center bg-gray-900/50 shadow-xl"
               style={{ boxShadow: 'inset 0 0 0 2px #1a1a2e, 0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div className="text-center px-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <span className="text-sm opacity-50">Select a persona to begin simulation</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentSpace = determineSpace(currentMoment, persona, contextSynthesis);
  const spaceConfig = SPACE_CONFIGS[currentSpace];
  const isDarkSpace = ['wind-down', 'rest', 'meeting'].includes(currentSpace);

  return (
    <div className="flex flex-col items-center justify-center h-full py-4">
      {/* Samsung Galaxy S25 Ultra Frame */}
      <div className="relative">
        {/* Titanium Outer Frame - S25 Ultra has flat edges and subtle corners */}
        <div
          className="w-[290px] h-[628px] rounded-[1.5rem] p-[3px] shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, #4a4a5a 0%, #2a2a3a 50%, #3a3a4a 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.1)'
          }}
        >
          {/* Inner bezel */}
          <div className="w-full h-full bg-[#0a0a0f] rounded-[1.35rem] p-[2px]">
            {/* Screen */}
            <motion.div
              key={currentSpace}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`w-full h-full rounded-[1.25rem] overflow-hidden relative bg-gradient-to-b ${spaceConfig.gradient}`}
              style={{ opacity: 0.4 + phoneScreenState.brightness * 0.6 }}
            >
              {/* Punch-hole camera - S25 Ultra style (centered) */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rounded-full z-20 ring-1 ring-gray-800" />

            {/* Status Bar */}
            <StatusBar phoneState={phoneScreenState} isDark={isDarkSpace} />

            {/* Main Content */}
            <div className="px-4 pt-10 pb-4 h-full flex flex-col relative z-10">
              {/* Space Header */}
              <SpaceHeader
                space={currentSpace}
                config={spaceConfig}
                moment={currentMoment}
                isDark={isDarkSpace}
              />

              {/* Primary Content Area */}
              <div className="flex-1 mt-4 space-y-3 overflow-hidden">
                <SpaceContent
                  space={currentSpace}
                  moment={currentMoment}
                  persona={persona}
                  orchestrator={orchestratorState}
                  isDark={isDarkSpace}
                />
              </div>

              {/* Bottom Actions */}
              <SpaceActions
                space={currentSpace}
                isDark={isDarkSpace}
              />

              {/* Home Indicator - Samsung style (thinner) */}
              <div className="flex justify-center mt-3">
                <div className={`w-28 h-[3px] rounded-full ${isDarkSpace ? 'bg-white/30' : 'bg-black/30'}`} />
              </div>
            </div>
          </motion.div>
          </div>
        </div>

        {/* Space Badge */}
        <div
          className={`absolute -right-2 top-16 px-3 py-2 rounded-l-xl text-xs font-medium shadow-lg ${
            isDarkSpace ? 'bg-white/90 text-gray-800' : 'bg-gray-900/90 text-white'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <spaceConfig.icon className="w-3.5 h-3.5" />
            <span>{spaceConfig.name}</span>
          </div>
        </div>

        {/* Mode Badge */}
        {orchestratorState && (
          <div
            className={`absolute -right-2 top-28 px-2.5 py-1 rounded-l-lg text-[10px] font-medium ${
              orchestratorState.currentMode === 'silent'
                ? 'bg-amber-500 text-amber-950'
                : orchestratorState.currentMode === 'notify'
                ? 'bg-blue-500 text-white'
                : 'bg-green-500 text-green-950'
            }`}
          >
            {orchestratorState.currentMode.toUpperCase()}
          </div>
        )}
      </div>

      {/* Context Info - Fixed height to prevent layout shift */}
      <div className="mt-4 text-center max-w-sm h-12 flex flex-col justify-start">
        <p className="text-xs text-gray-500">{spaceConfig.description}</p>
        <p className="text-xs text-gray-400 mt-1 truncate">
          {orchestratorState?.modeReasoning || '\u00A0'}
        </p>
      </div>
    </div>
  );
}

function StatusBar({ phoneState, isDark }: { phoneState: PhoneScreenState; isDark: boolean }) {
  const textColor = isDark ? 'text-white' : 'text-gray-800';

  return (
    <div className={`absolute top-0 left-0 right-0 px-5 pt-2 flex justify-between items-center ${textColor} text-xs z-10`}>
      <div className="text-[11px] font-medium">{phoneState.timeDisplay}</div>
      {/* Leave space for punch-hole camera in center */}
      <div className="flex items-center gap-1.5">
        {phoneState.doNotDisturb && <BellOff className="w-3 h-3" />}
        <Wifi className="w-3.5 h-3.5" style={{ opacity: 0.5 + phoneState.signalStrength * 0.5 }} />
        <div className="flex items-center gap-0.5">
          <Battery className={`w-4 h-4 ${phoneState.batteryLevel < 20 ? 'text-red-500' : ''}`} />
          <span className="text-[10px]">{phoneState.batteryLevel}%</span>
        </div>
      </div>
    </div>
  );
}

function SpaceHeader({
  space,
  config,
  moment,
  isDark
}: {
  space: SpaceType;
  config: SpaceConfig;
  moment: MomentState;
  isDark: boolean;
}) {
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subTextColor = isDark ? 'text-white/70' : 'text-gray-600';
  const hour = moment.passiveInputs.hour;
  const h = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[moment.passiveInputs.dayOfWeek];

  return (
    <div className="text-center">
      <motion.div
        key={`time-${hour}`}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`text-5xl font-extralight tracking-tight ${textColor}`}
      >
        {h}:{String(hour % 60).padStart(2, '0')} <span className="text-2xl">{ampm}</span>
      </motion.div>
      <div className={`text-sm mt-1 ${subTextColor}`}>
        {dayName}
      </div>

      {/* Contextual greeting based on space */}
      <motion.div
        key={`greeting-${space}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm ${
          isDark ? 'bg-white/10 text-white/90' : 'bg-black/5 text-gray-700'
        }`}
      >
        <config.icon className="w-4 h-4" />
        <span>{getGreeting(space, moment)}</span>
      </motion.div>
    </div>
  );
}

function getGreeting(space: SpaceType, moment: MomentState): string {
  const greetings: Record<SpaceType, string[]> = {
    'morning-routine': ['Good morning', 'Rise and shine', 'New day ahead'],
    'commute': ['Safe travels', 'On your way', 'Commute mode'],
    'work-focus': ['Deep focus active', 'In the zone', 'Focus time'],
    'meeting': ['In meeting', 'Session active', 'Focused'],
    'exercise': ['Keep moving', 'Stay active', 'Workout time'],
    'social': ['Enjoy the moment', 'Quality time', 'Be present'],
    'personal': ['Relax and unwind', 'Your time', 'Home sweet home'],
    'wind-down': ['Time to relax', 'Winding down', 'Evening mode'],
    'rest': ['Sleep well', 'Rest mode', 'Goodnight'],
    'travel': ['Adventure awaits', 'Exploring', 'On the go'],
    'errand': ['Getting things done', 'Task mode', 'On a mission'],
    'default': ['Ready to help', 'At your service', 'Hello'],
  };

  const options = greetings[space];
  const index = moment.dayIndex % options.length;
  return options[index];
}

function SpaceContent({
  space,
  moment,
  persona,
  orchestrator,
  isDark,
}: {
  space: SpaceType;
  moment: MomentState;
  persona: Persona;
  orchestrator: OrchestratorState | null;
  isDark: boolean;
}) {
  const cardBg = isDark ? 'bg-white/10 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm';
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-white/60' : 'text-gray-500';

  // Render different content based on space
  switch (space) {
    case 'morning-routine':
      return (
        <MorningContent
          moment={moment}
          persona={persona}
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    case 'commute':
      return (
        <CommuteContent
          moment={moment}
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    case 'work-focus':
      return (
        <WorkFocusContent
          moment={moment}
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    case 'meeting':
      return (
        <MeetingContent
          moment={moment}
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    case 'exercise':
      return (
        <ExerciseContent
          moment={moment}
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    case 'social':
      return (
        <SocialContent
          moment={moment}
          persona={persona}
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    case 'personal':
      return (
        <PersonalContent
          moment={moment}
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    case 'wind-down':
      return (
        <WindDownContent
          moment={moment}
          persona={persona}
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    case 'rest':
      return (
        <RestContent
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    case 'travel':
      return (
        <TravelContent
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    case 'errand':
      return (
        <ErrandContent
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    default:
      return (
        <DefaultContent
          moment={moment}
          orchestrator={orchestrator}
          cardBg={cardBg}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
  }
}

// Morning Routine Space
function MorningContent({ moment, persona, cardBg, textColor, subTextColor }: any) {
  const weather = moment.passiveInputs.weather;
  const traffic = moment.passiveInputs.trafficLevel;
  const weatherIcons = { clear: Sun, cloudy: Cloud, rain: CloudRain, snow: CloudSnow, storm: CloudLightning } as const;
  const WeatherIcon = weatherIcons[weather as keyof typeof weatherIcons] || Sun;
  const firstEvent = moment.passiveInputs.calendarEvents[0];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {/* Weather Card */}
        <div className={`${cardBg} rounded-2xl p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-xs ${subTextColor}`}>Today's Weather</div>
              <div className={`text-xl font-medium capitalize ${textColor}`}>{weather}</div>
              <div className={`text-xs ${subTextColor} mt-1`}>
                {traffic === 'heavy' ? '🚗 Heavy traffic expected' : traffic === 'moderate' ? '🚗 Moderate traffic' : '🚗 Roads are clear'}
              </div>
            </div>
            <WeatherIcon className={`w-14 h-14 ${textColor} opacity-80`} />
          </div>
        </div>

        {/* Commute Preview */}
        <div className={`${cardBg} rounded-2xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className={`text-sm font-medium ${textColor}`}>Commute to Work</div>
              <div className={`text-xs ${subTextColor}`}>
                {traffic === 'heavy' ? '~45 min' : traffic === 'moderate' ? '~30 min' : '~20 min'} • Leave by {(persona.typicalWakeTime + 1) % 12 || 12}:30 AM
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 ${subTextColor}`} />
          </div>
        </div>

        {/* First Event */}
        {firstEvent && (
          <div className={`${cardBg} rounded-2xl p-4`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${textColor}`}>{firstEvent.title}</div>
                <div className={`text-xs ${subTextColor}`}>{firstEvent.startHour}:00 - {firstEvent.endHour}:00</div>
              </div>
            </div>
          </div>
        )}

        {/* Overnight Messages */}
        {moment.passiveInputs.unreadCount > 0 && (
          <div className={`${cardBg} rounded-2xl p-4`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${textColor}`}>{moment.passiveInputs.unreadCount} messages</div>
                <div className={`text-xs ${subTextColor}`}>Received overnight</div>
              </div>
              <div className="px-2 py-0.5 bg-green-500 rounded-full text-[10px] text-white font-medium">
                {moment.passiveInputs.unreadCount}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Commute Space
function CommuteContent({ moment, cardBg, textColor, subTextColor }: any) {
  const traffic = moment.passiveInputs.trafficLevel;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Navigation Card */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`text-xs ${subTextColor}`}>Navigation</div>
          <div className={`text-xs px-2 py-0.5 rounded-full ${traffic === 'heavy' ? 'bg-red-500/20 text-red-400' : traffic === 'moderate' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
            {traffic} traffic
          </div>
        </div>
        <div className={`text-2xl font-medium ${textColor}`}>
          {traffic === 'heavy' ? '45' : traffic === 'moderate' ? '28' : '18'} min
        </div>
        <div className={`text-xs ${subTextColor} mt-1`}>ETA at destination</div>
        <div className="mt-3 h-2 bg-black/10 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }} />
        </div>
      </div>

      {/* Audio Controls */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Headphones className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className={`text-sm font-medium ${textColor}`}>Commute Playlist</div>
            <div className={`text-xs ${subTextColor}`}>Morning Energy Mix</div>
          </div>
          <div className="flex items-center gap-2">
            <button className={`w-8 h-8 rounded-full bg-black/10 flex items-center justify-center ${textColor}`}>
              <Play className="w-4 h-4" />
            </button>
            <button className={`w-8 h-8 rounded-full bg-black/10 flex items-center justify-center ${textColor}`}>
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`${cardBg} rounded-xl p-3`}>
          <Clock className={`w-4 h-4 ${subTextColor} mb-1`} />
          <div className={`text-lg font-medium ${textColor}`}>9:00</div>
          <div className={`text-[10px] ${subTextColor}`}>First meeting</div>
        </div>
        <div className={`${cardBg} rounded-xl p-3`}>
          <MessageSquare className={`w-4 h-4 ${subTextColor} mb-1`} />
          <div className={`text-lg font-medium ${textColor}`}>{moment.passiveInputs.unreadCount}</div>
          <div className={`text-[10px] ${subTextColor}`}>Unread</div>
        </div>
      </div>
    </motion.div>
  );
}

// Work Focus Space
function WorkFocusContent({ moment, cardBg, textColor, subTextColor }: any) {
  const focusLevel = moment.memoryBuckets.currentIntent.focusLevel;
  const events = moment.passiveInputs.calendarEvents;
  const nextEvent = events.find((e: any) => e.startHour > moment.passiveInputs.hour);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Focus Status */}
      <div className={`${cardBg} rounded-2xl p-4 text-center`}>
        <Brain className={`w-10 h-10 mx-auto mb-2 ${textColor} opacity-80`} />
        <div className={`text-lg font-medium ${textColor}`}>Focus Mode Active</div>
        <div className={`text-xs ${subTextColor} mt-1`}>
          Non-essential notifications held
        </div>
        <div className="mt-3 flex justify-center gap-4">
          <div className="text-center">
            <div className={`text-xl font-medium ${textColor}`}>{Math.round(focusLevel * 100)}%</div>
            <div className={`text-[10px] ${subTextColor}`}>Focus Level</div>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <div className={`text-xl font-medium ${textColor}`}>{moment.passiveInputs.unreadCount}</div>
            <div className={`text-[10px] ${subTextColor}`}>Held</div>
          </div>
        </div>
      </div>

      {/* Current Task */}
      {moment.memoryBuckets.currentIntent.activeGoal && (
        <div className={`${cardBg} rounded-2xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className={`text-xs ${subTextColor}`}>Current Task</div>
              <div className={`text-sm font-medium ${textColor}`}>{moment.memoryBuckets.currentIntent.activeGoal}</div>
            </div>
          </div>
        </div>
      )}

      {/* Next Meeting */}
      {nextEvent && (
        <div className={`${cardBg} rounded-2xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className={`text-xs ${subTextColor}`}>Up Next</div>
              <div className={`text-sm font-medium ${textColor}`}>{nextEvent.title}</div>
              <div className={`text-xs ${subTextColor}`}>at {nextEvent.startHour}:00</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Meeting Space
function MeetingContent({ moment, cardBg, textColor, subTextColor }: any) {
  const events = moment.passiveInputs.calendarEvents;
  const currentEvent = events.find((e: any) => e.startHour <= moment.passiveInputs.hour && e.endHour > moment.passiveInputs.hour);
  const endTime = currentEvent?.endHour || moment.passiveInputs.hour + 1;
  const timeLeft = endTime - moment.passiveInputs.hour;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Meeting Status */}
      <div className={`${cardBg} rounded-2xl p-5 text-center`}>
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
          <Video className="w-8 h-8 text-white/80" />
        </div>
        <div className={`text-lg font-medium ${textColor}`}>
          {currentEvent?.title || 'In Meeting'}
        </div>
        <div className={`text-sm ${subTextColor} mt-1`}>
          {timeLeft > 0 ? `${timeLeft * 60} min remaining` : 'Ending soon'}
        </div>

        {/* Mute indicators */}
        <div className="flex justify-center gap-3 mt-4">
          <div className="px-3 py-1.5 rounded-full bg-white/10 flex items-center gap-1.5">
            <VolumeX className="w-3.5 h-3.5" />
            <span className="text-xs">Notifications muted</span>
          </div>
        </div>
      </div>

      {/* Emergency contacts only */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-3">
          <AlertCircle className={`w-5 h-5 ${subTextColor}`} />
          <div className={`text-xs ${subTextColor}`}>
            Only emergency contacts can reach you
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <button className={`${cardBg} rounded-xl p-3 flex flex-col items-center gap-1`}>
          <Mic className={`w-5 h-5 ${textColor}`} />
          <span className={`text-[10px] ${subTextColor}`}>Mute</span>
        </button>
        <button className={`${cardBg} rounded-xl p-3 flex flex-col items-center gap-1`}>
          <Video className={`w-5 h-5 ${textColor}`} />
          <span className={`text-[10px] ${subTextColor}`}>Video</span>
        </button>
        <button className={`${cardBg} rounded-xl p-3 flex flex-col items-center gap-1`}>
          <Phone className={`w-5 h-5 text-red-400`} />
          <span className={`text-[10px] ${subTextColor}`}>Leave</span>
        </button>
      </div>
    </motion.div>
  );
}

// Exercise Space
function ExerciseContent({ moment, cardBg, textColor, subTextColor }: any) {
  const hr = moment.activeInputs.heartRate;
  const motion_type = moment.activeInputs.deviceMotion;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Heart Rate */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-xs ${subTextColor}`}>Heart Rate</div>
            <div className={`text-3xl font-bold ${textColor}`}>{hr}</div>
            <div className={`text-xs ${subTextColor}`}>BPM</div>
          </div>
          <div className="relative">
            <Heart className={`w-14 h-14 text-red-500 ${hr > 120 ? 'animate-pulse' : ''}`} />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <div className={`flex-1 text-center p-2 rounded-lg ${hr < 100 ? 'bg-blue-500/20' : hr < 140 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className={`text-xs ${hr < 100 ? 'text-blue-400' : hr < 140 ? 'text-green-400' : 'text-red-400'}`}>
              {hr < 100 ? 'Warm Up' : hr < 140 ? 'Fat Burn' : 'Cardio'}
            </div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <div className={`text-sm font-medium ${textColor} capitalize`}>{motion_type}</div>
            <div className={`text-xs ${subTextColor}`}>Current activity</div>
          </div>
        </div>
      </div>

      {/* Music Control Mini */}
      <div className={`${cardBg} rounded-2xl p-3`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className={`text-xs font-medium ${textColor}`}>Workout Mix</div>
          </div>
          <Play className={`w-5 h-5 ${textColor}`} />
        </div>
      </div>
    </motion.div>
  );
}

// Social Space
function SocialContent({ moment, persona, cardBg, textColor, subTextColor }: any) {
  const nearbyContacts = moment.passiveInputs.nearbyContacts;
  const nearbyNames = nearbyContacts.map((id: string) => {
    const contact = persona.contacts.find((c: any) => c.id === id);
    return contact?.name || 'Someone';
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Present Mode */}
      <div className={`${cardBg} rounded-2xl p-5 text-center`}>
        <Users className={`w-12 h-12 mx-auto mb-3 ${textColor} opacity-80`} />
        <div className={`text-lg font-medium ${textColor}`}>Be Present</div>
        <div className={`text-sm ${subTextColor} mt-1`}>
          Enjoy your time together
        </div>
        {nearbyNames.length > 0 && (
          <div className={`mt-3 text-xs ${subTextColor}`}>
            With {nearbyNames.slice(0, 2).join(', ')}
            {nearbyNames.length > 2 && ` +${nearbyNames.length - 2} others`}
          </div>
        )}
      </div>

      {/* Status */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-3">
          <Bell className={`w-5 h-5 ${subTextColor}`} />
          <div className={`text-xs ${subTextColor}`}>
            Work notifications filtered • Personal messages allowed
          </div>
        </div>
      </div>

      {/* Quick capture */}
      <div className="grid grid-cols-2 gap-2">
        <button className={`${cardBg} rounded-xl p-3 flex items-center justify-center gap-2`}>
          <Camera className={`w-5 h-5 ${textColor}`} />
          <span className={`text-xs ${textColor}`}>Capture</span>
        </button>
        <button className={`${cardBg} rounded-xl p-3 flex items-center justify-center gap-2`}>
          <Star className={`w-5 h-5 ${textColor}`} />
          <span className={`text-xs ${textColor}`}>Memory</span>
        </button>
      </div>
    </motion.div>
  );
}

// Personal/Home Space
function PersonalContent({ moment, cardBg, textColor, subTextColor }: any) {
  const unread = moment.passiveInputs.unreadCount;
  const energyLevel = moment.memoryBuckets.contextState.energyLevel;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Welcome Home */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Home className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className={`text-lg font-medium ${textColor}`}>Your Evening</div>
            <div className={`text-xs ${subTextColor}`}>
              {energyLevel > 0.6 ? 'Energy level good' : energyLevel > 0.3 ? 'Take it easy' : 'Time to recharge'}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Summary */}
      {unread > 0 && (
        <div className={`${cardBg} rounded-2xl p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className={`w-5 h-5 ${textColor}`} />
              <div>
                <div className={`text-sm font-medium ${textColor}`}>{unread} unread</div>
                <div className={`text-xs ${subTextColor}`}>Personal messages only</div>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 ${subTextColor}`} />
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className={`text-xs ${subTextColor} mb-2`}>Suggested</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-black/5">
            <BookOpen className={`w-4 h-4 ${textColor}`} />
            <span className={`text-sm ${textColor}`}>Continue reading</span>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-black/5">
            <Music className={`w-4 h-4 ${textColor}`} />
            <span className={`text-sm ${textColor}`}>Evening playlist</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Wind-Down Space
function WindDownContent({ moment, persona, cardBg, textColor, subTextColor }: any) {
  const sleepTime = persona.typicalSleepTime;
  const currentHour = moment.passiveInputs.hour;
  const hoursUntilSleep = sleepTime > currentHour ? sleepTime - currentHour : sleepTime + 24 - currentHour;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Sleep countdown */}
      <div className={`${cardBg} rounded-2xl p-5 text-center`}>
        <Moon className={`w-10 h-10 mx-auto mb-2 text-indigo-300`} />
        <div className={`text-sm ${subTextColor}`}>Bedtime in</div>
        <div className={`text-3xl font-light ${textColor}`}>{hoursUntilSleep}h</div>
        <div className={`text-xs ${subTextColor} mt-2`}>
          Screen brightness reduced
        </div>
      </div>

      {/* Tomorrow preview */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className={`text-xs ${subTextColor} mb-2`}>Tomorrow</div>
        <div className="flex items-center gap-3">
          <Sunrise className={`w-5 h-5 text-amber-400`} />
          <div>
            <div className={`text-sm ${textColor}`}>Wake at {persona.typicalWakeTime % 12 || 12}:00 {persona.typicalWakeTime >= 12 ? 'PM' : 'AM'}</div>
            <div className={`text-xs ${subTextColor}`}>
              {moment.passiveInputs.calendarEvents.length > 0
                ? `${moment.passiveInputs.calendarEvents.length} events scheduled`
                : 'No events scheduled'}
            </div>
          </div>
        </div>
      </div>

      {/* Quiet mode status */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-3">
          <VolumeX className={`w-5 h-5 text-indigo-300`} />
          <div className={`text-xs ${subTextColor}`}>
            Only priority contacts can reach you
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Rest/Sleep Space
function RestContent({ cardBg, textColor, subTextColor }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3 flex flex-col items-center justify-center h-full"
    >
      <div className={`${cardBg} rounded-2xl p-8 text-center w-full`}>
        <Moon className={`w-16 h-16 mx-auto mb-4 text-gray-400/50`} />
        <div className={`text-lg ${textColor} opacity-60`}>Rest Mode</div>
        <div className={`text-xs ${subTextColor} mt-2`}>
          All notifications silenced
        </div>
        <div className={`text-xs ${subTextColor} mt-1`}>
          Emergency contacts only
        </div>
      </div>
    </motion.div>
  );
}

// Travel Space
function TravelContent({ cardBg, textColor, subTextColor }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-3">
          <Plane className={`w-6 h-6 ${textColor}`} />
          <div>
            <div className={`text-lg font-medium ${textColor}`}>Travel Mode</div>
            <div className={`text-xs ${subTextColor}`}>Away from home</div>
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className={`text-xs ${subTextColor} mb-2`}>Quick Access</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-black/5">
            <MapPin className={`w-4 h-4 ${textColor}`} />
            <span className={`text-xs ${textColor}`}>Maps</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-black/5">
            <Camera className={`w-4 h-4 ${textColor}`} />
            <span className={`text-xs ${textColor}`}>Camera</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-black/5">
            <FileText className={`w-4 h-4 ${textColor}`} />
            <span className={`text-xs ${textColor}`}>Documents</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-black/5">
            <Phone className={`w-4 h-4 ${textColor}`} />
            <span className={`text-xs ${textColor}`}>Contacts</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Errand Space
function ErrandContent({ cardBg, textColor, subTextColor }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-3">
          <ShoppingBag className={`w-6 h-6 ${textColor}`} />
          <div>
            <div className={`text-lg font-medium ${textColor}`}>Errand Mode</div>
            <div className={`text-xs ${subTextColor}`}>Quick task focus</div>
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className={`text-xs ${subTextColor} mb-2`}>Quick Actions</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-black/5">
            <CheckCircle className={`w-4 h-4 ${textColor}`} />
            <span className={`text-sm ${textColor}`}>Shopping list</span>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-black/5">
            <MapPin className={`w-4 h-4 ${textColor}`} />
            <span className={`text-sm ${textColor}`}>Navigate</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Default Space
function DefaultContent({ moment, orchestrator, cardBg, textColor, subTextColor }: any) {
  const unread = moment.passiveInputs.unreadCount;
  const events = moment.passiveInputs.calendarEvents;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Messages */}
      {unread > 0 && (
        <div className={`${cardBg} rounded-2xl p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className={`text-sm font-medium ${textColor}`}>{unread} unread messages</div>
                <div className={`text-xs ${subTextColor}`}>Tap to view</div>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 ${subTextColor}`} />
          </div>
        </div>
      )}

      {/* Next event */}
      {events.length > 0 && (
        <div className={`${cardBg} rounded-2xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className={`text-sm font-medium ${textColor}`}>{events[0].title}</div>
              <div className={`text-xs ${subTextColor}`}>{events[0].startHour}:00</div>
            </div>
          </div>
        </div>
      )}

      {/* Surfaced suggestions */}
      {orchestrator?.surfacedContent.filter((c: any) => c.type === 'suggestion').slice(0, 2).map((suggestion: any, i: number) => (
        <div key={i} className={`${cardBg} rounded-2xl p-4`}>
          <div className="flex items-center gap-3">
            <Sparkles className={`w-5 h-5 ${textColor}`} />
            <div className="flex-1">
              <div className={`text-sm font-medium ${textColor}`}>{suggestion.title}</div>
              {suggestion.body && <div className={`text-xs ${subTextColor}`}>{suggestion.body}</div>}
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function SpaceActions({
  space,
  isDark,
}: {
  space: SpaceType;
  isDark: boolean;
}) {
  const bgColor = isDark ? 'bg-white/10' : 'bg-black/5';
  const textColor = isDark ? 'text-white' : 'text-gray-700';

  // Define actions per space
  const actionSets: Record<SpaceType, { icon: React.ElementType; label: string }[]> = {
    'morning-routine': [
      { icon: Coffee, label: 'Routine' },
      { icon: Calendar, label: 'Schedule' },
      { icon: MessageSquare, label: 'Messages' },
      { icon: Music, label: 'Music' },
    ],
    'commute': [
      { icon: Navigation, label: 'Navigate' },
      { icon: Music, label: 'Audio' },
      { icon: Phone, label: 'Call' },
      { icon: MessageSquare, label: 'Voice' },
    ],
    'work-focus': [
      { icon: Timer, label: 'Timer' },
      { icon: FileText, label: 'Notes' },
      { icon: Calendar, label: 'Calendar' },
      { icon: Bell, label: 'Unmute' },
    ],
    'meeting': [
      { icon: Mic, label: 'Mute' },
      { icon: Video, label: 'Video' },
      { icon: MessageSquare, label: 'Chat' },
      { icon: FileText, label: 'Notes' },
    ],
    'exercise': [
      { icon: Music, label: 'Music' },
      { icon: Timer, label: 'Timer' },
      { icon: Heart, label: 'Health' },
      { icon: Camera, label: 'Photo' },
    ],
    'social': [
      { icon: Camera, label: 'Capture' },
      { icon: MessageSquare, label: 'Share' },
      { icon: Bell, label: 'DND' },
      { icon: Star, label: 'Memory' },
    ],
    'personal': [
      { icon: MessageSquare, label: 'Messages' },
      { icon: Music, label: 'Music' },
      { icon: Camera, label: 'Camera' },
      { icon: BookOpen, label: 'Read' },
    ],
    'wind-down': [
      { icon: Moon, label: 'Sleep' },
      { icon: Music, label: 'Sounds' },
      { icon: BookOpen, label: 'Read' },
      { icon: Bell, label: 'Alarm' },
    ],
    'rest': [
      { icon: Bell, label: 'Alarm' },
      { icon: Moon, label: 'Sleep' },
      { icon: Volume2, label: 'Sounds' },
      { icon: Shield, label: 'DND' },
    ],
    'travel': [
      { icon: MapPin, label: 'Maps' },
      { icon: Camera, label: 'Camera' },
      { icon: FileText, label: 'Docs' },
      { icon: Phone, label: 'Contact' },
    ],
    'errand': [
      { icon: CheckCircle, label: 'List' },
      { icon: MapPin, label: 'Navigate' },
      { icon: Phone, label: 'Call' },
      { icon: Camera, label: 'Scan' },
    ],
    'default': [
      { icon: MessageSquare, label: 'Messages' },
      { icon: Camera, label: 'Camera' },
      { icon: Calendar, label: 'Calendar' },
      { icon: Music, label: 'Music' },
    ],
  };

  const actions = actionSets[space] || actionSets.default;

  return (
    <div className="mt-auto pt-4">
      <div className="flex justify-around">
        {actions.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-12 h-12 ${bgColor} rounded-2xl flex items-center justify-center`}>
              <action.icon className={`w-5 h-5 ${textColor}`} />
            </div>
            <span className={`text-[10px] ${textColor} opacity-70`}>{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
