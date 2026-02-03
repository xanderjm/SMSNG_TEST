// ============================================
// PERSONA TYPES
// ============================================

export type Archetype =
  | 'young-professional'
  | 'parent'
  | 'student'
  | 'remote-worker'
  | 'executive'
  | 'retiree'
  | 'shift-worker'
  | 'freelancer'
  | 'caregiver'
  | 'digital-nomad';

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  'young-professional': 'Young Professional',
  'parent': 'Parent (Young Children)',
  'student': 'Student',
  'remote-worker': 'Remote Worker',
  'executive': 'Executive',
  'retiree': 'Retiree',
  'shift-worker': 'Shift Worker',
  'freelancer': 'Freelancer',
  'caregiver': 'Caregiver',
  'digital-nomad': 'Digital Nomad',
};

export const ARCHETYPE_DISTRIBUTION: Record<Archetype, number> = {
  'young-professional': 0.15,
  'parent': 0.12,
  'student': 0.10,
  'remote-worker': 0.12,
  'executive': 0.08,
  'retiree': 0.08,
  'shift-worker': 0.10,
  'freelancer': 0.10,
  'caregiver': 0.08,
  'digital-nomad': 0.07,
};

export interface Contact {
  id: string;
  name: string;
  relationship: 'family' | 'friend' | 'colleague' | 'acquaintance';
  priority: 'high' | 'medium' | 'low';
  communicationStyle: 'sync' | 'async';
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  archetype: Archetype;
  occupation: string;
  location: string;

  // Behavioral characteristics
  routineVariance: number; // 0-1: how consistent vs chaotic
  notificationTolerance: number; // 0-1: threshold for interruption
  socialCircleSize: number;
  communicationStyle: 'sync-preferred' | 'async-preferred' | 'mixed';

  // Schedule patterns
  typicalWakeTime: number; // hour (0-23)
  typicalSleepTime: number; // hour (0-23)
  workDays: number[]; // 0=Sunday, 6=Saturday

  // App preferences (weights sum to 1)
  appPreferences: {
    communication: number;
    health: number;
    memory: number;
    research: number;
    travel: number;
    entertainment: number;
    productivity: number;
  };

  // Social circle
  contacts: Contact[];

  // Unique patterns (text descriptions)
  uniquePatterns: string[];

  // Avatar color for UI
  avatarColor: string;
}

// ============================================
// SIGNAL TYPES - ACTIVE INPUTS
// ============================================

export type DevicePosition = 'pocket' | 'bag' | 'hand' | 'table-up' | 'table-down';
export type DeviceMotion = 'static' | 'walking' | 'vehicle' | 'running';
export type AppCategory = 'communication' | 'health' | 'memory' | 'research' | 'travel' | 'entertainment' | 'productivity' | 'none';
export type SemanticLocation = 'home' | 'work' | 'commute' | 'traveling' | 'gym' | 'social' | 'outdoor' | 'shopping' | 'other';

export interface ActiveInputs {
  // Device Position / Orientation
  devicePosition: DevicePosition;
  deviceMotion: DeviceMotion;

  // Device Current Usage
  isOnCall: boolean;
  activeApp: string | null;
  activeAppCategory: AppCategory;
  sessionDuration: number; // minutes

  // Biometric Signals
  heartRate: number;
  respirationRate: number;
  stressLevel: number; // 0-1 derived

  // Active Location
  semanticLocation: SemanticLocation;
  isMoving: boolean;
  isFamiliarLocation: boolean;

  // Interaction Patterns
  scrollVelocity: number; // 0-1
  typingCadence: number; // 0-1
  recentGesture: 'none' | 'pull-from-pocket' | 'turn-over' | 'rotate' | 'shake';
}

// ============================================
// SIGNAL TYPES - PASSIVE INPUTS
// ============================================

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm';
export type TrafficLevel = 'light' | 'moderate' | 'heavy';

export interface CalendarEvent {
  id: string;
  title: string;
  startHour: number;
  endHour: number;
  type: 'meeting' | 'deadline' | 'reminder' | 'social' | 'health';
  importance: 'high' | 'medium' | 'low';
}

export interface IncomingMessage {
  id: string;
  from: string;
  contactId?: string;
  type: 'call' | 'text' | 'email' | 'social' | 'app-notification';
  priority: 'urgent' | 'normal' | 'low';
  timestamp: number;
  preview?: string;
}

export interface PassiveInputs {
  // Temporal Context
  hour: number; // 0-23
  dayOfWeek: DayOfWeek;
  season: Season;
  weather: Weather;
  trafficLevel: TrafficLevel;

  // Schedule
  calendarEvents: CalendarEvent[];
  upcomingDeadlines: string[];
  isSpecialDay: boolean; // birthday, anniversary, etc.

  // Social Proximity
  nearbyContacts: string[]; // contact IDs

  // Sensory Environment
  ambientNoiseLevel: number; // 0-1
  isInDarkEnvironment: boolean;

  // Device State
  batteryLevel: number; // 0-100
  connectivityQuality: number; // 0-1
  isDoNotDisturb: boolean;
  isSilentMode: boolean;

  // Incoming Streams
  recentMessages: IncomingMessage[];
  unreadCount: number;
  missedCallsCount: number;
}

// ============================================
// MEMORY BUCKETS
// ============================================

export interface MemoryBuckets {
  // Long-term preferences
  preferences: {
    preferredNotificationTimes: number[]; // hours
    dislikedNotificationTypes: string[];
    frequentApps: string[];
    communicationPreferences: Record<string, 'call' | 'text' | 'email'>;
  };

  // Current intent
  currentIntent: {
    activeGoal: string | null;
    taskInProgress: string | null;
    focusLevel: number; // 0-1
  };

  // Recent interactions
  recentInteractions: {
    lastAppUsed: string | null;
    lastContactCommunicated: string | null;
    recentSearches: string[];
    sessionCount24h: number;
  };

  // Context state
  contextState: {
    currentMode: 'work' | 'personal' | 'rest' | 'social' | 'transit';
    energyLevel: number; // 0-1
    socialAvailability: number; // 0-1
  };
}

// ============================================
// COMPLETE MOMENT STATE
// ============================================

export interface MomentState {
  timestamp: number; // Unix timestamp
  personaId: string;
  dayIndex: number; // 0-364
  hourIndex: number; // 0-23

  activeInputs: ActiveInputs;
  passiveInputs: PassiveInputs;
  memoryBuckets: MemoryBuckets;
}

// ============================================
// CONTEXT ENGINE TYPES
// ============================================

export type OperationalMode = 'silent' | 'adapt' | 'notify';

export interface SignalWeight {
  signalA: string;
  signalB: string;
  weight: number; // 0-1
  interpretation: string;
}

export interface ContextSynthesis {
  // Derived states
  derivedFocusWindow: boolean;
  derivedStressState: boolean;
  derivedTransitionState: boolean;
  derivedPersonalTime: boolean;
  derivedWindDownMode: boolean;

  // Active patterns
  activePatterns: string[];

  // Signal weights currently in play
  activeWeights: SignalWeight[];

  // Rhythm detection
  rhythmMatch: {
    daily: number; // 0-1 how well current state matches daily pattern
    weekly: number;
    contextual: number;
  };
}

export interface AgentDecision {
  agentId: string;
  agentName: string;
  action: string;
  confidence: number;
  reasoning: string;
  timestamp: number;
}

export interface OrchestratorState {
  currentMode: OperationalMode;
  confidenceLevel: number;

  // Which agents are active
  activeAgents: string[];

  // Recent decisions
  recentDecisions: AgentDecision[];

  // What's being surfaced
  surfacedContent: SurfacedContent[];

  // Explanation for debug
  modeReasoning: string;
}

export interface SurfacedContent {
  id: string;
  type: 'notification' | 'suggestion' | 'widget' | 'action' | 'info';
  title: string;
  body?: string;
  priority: number;
  source: string; // which agent surfaced this
  confidence: number;
  timestamp: number;
}

// ============================================
// UI TYPES
// ============================================

export interface PhoneScreenState {
  brightness: number; // 0-1
  theme: 'light' | 'dark' | 'dim';

  // What's shown
  primaryWidget: 'weather' | 'calendar' | 'music' | 'messages' | 'focus' | 'none';
  notifications: SurfacedContent[];
  quickActions: string[];

  // Contextual content
  contextualMessage?: string;
  timeDisplay: string;
  dateDisplay: string;

  // Status indicators
  batteryLevel: number;
  signalStrength: number;
  doNotDisturb: boolean;
}

export interface TunableParameters {
  confidenceThreshold: number; // 0-100
  proactivityLevel: 'low' | 'medium' | 'high';
  privacyBoundary: 'minimal' | 'moderate' | 'maximum';
}

// ============================================
// SIMULATION STATE
// ============================================

export interface SimulationState {
  // Current selection
  selectedPersonaId: string | null;
  currentDayIndex: number;
  currentHourIndex: number;

  // Playback
  isPlaying: boolean;
  playbackSpeed: number; // 1 = 1 hour per second

  // Parameters
  parameters: TunableParameters;

  // Loaded data
  personas: Persona[];
  currentMoment: MomentState | null;

  // Engine state
  contextSynthesis: ContextSynthesis | null;
  orchestratorState: OrchestratorState | null;
  phoneScreenState: PhoneScreenState | null;
}
