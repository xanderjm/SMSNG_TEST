import type {
  Archetype,
  Persona,
  Contact,
  MomentState,
  ActiveInputs,
  PassiveInputs,
  MemoryBuckets,
  DevicePosition,
  DeviceMotion,
  AppCategory,
  SemanticLocation,
  CalendarEvent,
  IncomingMessage,
} from '../types';
import { ARCHETYPE_DISTRIBUTION } from '../types';

// ============================================
// RANDOM UTILITIES
// ============================================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  gaussian(mean: number, stdDev: number): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }
}

// ============================================
// NAME GENERATION
// ============================================

const FIRST_NAMES = [
  'James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'Oliver', 'Isabella',
  'Elijah', 'Mia', 'Lucas', 'Charlotte', 'Mason', 'Amelia', 'Ethan', 'Harper', 'Aiden', 'Evelyn',
  'Alexander', 'Abigail', 'Henry', 'Emily', 'Sebastian', 'Elizabeth', 'Jack', 'Sofia', 'Daniel', 'Avery',
  'Michael', 'Ella', 'Owen', 'Scarlett', 'Samuel', 'Grace', 'Ryan', 'Chloe', 'Nathan', 'Victoria',
  'Carlos', 'Maria', 'Hiroshi', 'Yuki', 'Raj', 'Priya', 'Wei', 'Mei', 'Ahmed', 'Fatima',
  'Ivan', 'Natasha', 'Diego', 'Camila', 'Lars', 'Ingrid', 'Kofi', 'Amara', 'Chen', 'Lin',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Kim', 'Patel', 'Chen', 'Wang', 'Singh', 'Tanaka', 'Sato', 'Müller', 'Schmidt', 'Ivanov',
];

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#f59e0b',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#a855f7', '#d946ef',
];

// ============================================
// ARCHETYPE CONFIGURATIONS
// ============================================

interface ArchetypeConfig {
  ageRange: [number, number];
  wakeRange: [number, number];
  sleepRange: [number, number];
  workDaysOptions: number[][];
  occupations: string[];
  routineVarianceRange: [number, number];
  notificationToleranceRange: [number, number];
  socialCircleSizeRange: [number, number];
  communicationStyles: ('sync-preferred' | 'async-preferred' | 'mixed')[];
  appWeightBias: Partial<Record<keyof Persona['appPreferences'], number>>;
  uniquePatternTemplates: string[];
}

const ARCHETYPE_CONFIGS: Record<Archetype, ArchetypeConfig> = {
  'young-professional': {
    ageRange: [24, 35],
    wakeRange: [7, 9],
    sleepRange: [22, 24],
    workDaysOptions: [[1, 2, 3, 4, 5]],
    occupations: ['Marketing Manager', 'Software Engineer', 'Financial Analyst', 'Product Designer', 'Consultant'],
    routineVarianceRange: [0.2, 0.5],
    notificationToleranceRange: [0.5, 0.8],
    socialCircleSizeRange: [8, 20],
    communicationStyles: ['mixed', 'async-preferred'],
    appWeightBias: { communication: 0.3, entertainment: 0.25 },
    uniquePatternTemplates: [
      'Gym sessions 3x weekly after work',
      'Happy hour on Fridays',
      'Weekend brunch with friends',
      'Heavy social media usage in evenings',
    ],
  },
  'parent': {
    ageRange: [28, 45],
    wakeRange: [5, 7],
    sleepRange: [21, 23],
    workDaysOptions: [[1, 2, 3, 4, 5]],
    occupations: ['Teacher', 'Accountant', 'Sales Representative', 'HR Manager', 'Small Business Owner'],
    routineVarianceRange: [0.4, 0.7],
    notificationToleranceRange: [0.3, 0.6],
    socialCircleSizeRange: [5, 15],
    communicationStyles: ['async-preferred'],
    appWeightBias: { communication: 0.35, memory: 0.2 },
    uniquePatternTemplates: [
      'School drop-off at 8am daily',
      'Kids activities on weekends',
      'Meal planning on Sundays',
      'Family video calls with grandparents',
    ],
  },
  'student': {
    ageRange: [18, 26],
    wakeRange: [8, 11],
    sleepRange: [23, 2],
    workDaysOptions: [[1, 2, 3, 4, 5], [1, 3, 5]],
    occupations: ['Undergraduate Student', 'Graduate Student', 'PhD Candidate', 'Medical Student', 'Law Student'],
    routineVarianceRange: [0.5, 0.9],
    notificationToleranceRange: [0.6, 0.9],
    socialCircleSizeRange: [10, 30],
    communicationStyles: ['sync-preferred', 'mixed'],
    appWeightBias: { entertainment: 0.35, research: 0.25 },
    uniquePatternTemplates: [
      'All-nighters before deadlines',
      'Library sessions during exams',
      'Late-night social gaming',
      'Heavy social media throughout day',
    ],
  },
  'remote-worker': {
    ageRange: [25, 50],
    wakeRange: [7, 10],
    sleepRange: [22, 24],
    workDaysOptions: [[1, 2, 3, 4, 5]],
    occupations: ['Software Developer', 'Content Writer', 'Data Analyst', 'UX Designer', 'Project Manager'],
    routineVarianceRange: [0.3, 0.6],
    notificationToleranceRange: [0.4, 0.7],
    socialCircleSizeRange: [5, 15],
    communicationStyles: ['async-preferred', 'mixed'],
    appWeightBias: { productivity: 0.3, communication: 0.25 },
    uniquePatternTemplates: [
      'Multiple daily video calls',
      'Flexible lunch breaks',
      'Work from coffee shops occasionally',
      'Strict end-of-day boundaries',
    ],
  },
  'executive': {
    ageRange: [40, 60],
    wakeRange: [5, 6],
    sleepRange: [22, 23],
    workDaysOptions: [[1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5]],
    occupations: ['CEO', 'CFO', 'VP of Operations', 'Director', 'Managing Partner'],
    routineVarianceRange: [0.2, 0.4],
    notificationToleranceRange: [0.2, 0.5],
    socialCircleSizeRange: [10, 25],
    communicationStyles: ['sync-preferred'],
    appWeightBias: { communication: 0.4, travel: 0.2 },
    uniquePatternTemplates: [
      'Early morning email review',
      'Frequent business travel',
      'Back-to-back meetings',
      'Weekend work during crises',
    ],
  },
  'retiree': {
    ageRange: [60, 80],
    wakeRange: [6, 8],
    sleepRange: [21, 22],
    workDaysOptions: [[]],
    occupations: ['Retired Teacher', 'Retired Engineer', 'Retired Nurse', 'Retired Executive', 'Retired Craftsperson'],
    routineVarianceRange: [0.1, 0.3],
    notificationToleranceRange: [0.2, 0.4],
    socialCircleSizeRange: [5, 12],
    communicationStyles: ['sync-preferred'],
    appWeightBias: { health: 0.35, memory: 0.25 },
    uniquePatternTemplates: [
      'Morning walks daily',
      'Weekly video calls with family',
      'Regular health app check-ins',
      'Afternoon reading time',
    ],
  },
  'shift-worker': {
    ageRange: [25, 55],
    wakeRange: [4, 16],
    sleepRange: [20, 8],
    workDaysOptions: [[1, 2, 3], [4, 5, 6], [0, 1, 2], [3, 4, 5, 6]],
    occupations: ['Nurse', 'Factory Worker', 'Security Guard', 'Paramedic', 'Hotel Staff'],
    routineVarianceRange: [0.5, 0.8],
    notificationToleranceRange: [0.2, 0.5],
    socialCircleSizeRange: [4, 12],
    communicationStyles: ['async-preferred'],
    appWeightBias: { health: 0.3, communication: 0.25 },
    uniquePatternTemplates: [
      'Rotating shift patterns',
      'Sleep schedule varies by week',
      'Checks weather before commute',
      'Meal prep on days off',
    ],
  },
  'freelancer': {
    ageRange: [25, 50],
    wakeRange: [7, 10],
    sleepRange: [22, 1],
    workDaysOptions: [[1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6]],
    occupations: ['Graphic Designer', 'Writer', 'Photographer', 'Consultant', 'Web Developer'],
    routineVarianceRange: [0.5, 0.8],
    notificationToleranceRange: [0.5, 0.8],
    socialCircleSizeRange: [8, 20],
    communicationStyles: ['async-preferred', 'mixed'],
    appWeightBias: { productivity: 0.3, communication: 0.25 },
    uniquePatternTemplates: [
      'Project-based intense work periods',
      'Irregular income anxiety',
      'Client communication bursts',
      'Networking events monthly',
    ],
  },
  'caregiver': {
    ageRange: [35, 65],
    wakeRange: [5, 7],
    sleepRange: [21, 23],
    workDaysOptions: [[0, 1, 2, 3, 4, 5, 6]],
    occupations: ['Home Caregiver', 'Part-time Worker', 'Healthcare Aide', 'Family Caregiver'],
    routineVarianceRange: [0.4, 0.7],
    notificationToleranceRange: [0.3, 0.5],
    socialCircleSizeRange: [3, 10],
    communicationStyles: ['sync-preferred'],
    appWeightBias: { health: 0.35, communication: 0.3 },
    uniquePatternTemplates: [
      'Medical appointments weekly',
      'On-call for emergencies',
      'Brief personal time windows',
      'Support group connections',
    ],
  },
  'digital-nomad': {
    ageRange: [25, 40],
    wakeRange: [6, 11],
    sleepRange: [22, 2],
    workDaysOptions: [[1, 2, 3, 4, 5], [0, 1, 2, 3, 4]],
    occupations: ['Remote Developer', 'Content Creator', 'Online Entrepreneur', 'Travel Writer', 'Digital Marketer'],
    routineVarianceRange: [0.6, 0.9],
    notificationToleranceRange: [0.5, 0.8],
    socialCircleSizeRange: [15, 35],
    communicationStyles: ['async-preferred'],
    appWeightBias: { travel: 0.35, communication: 0.25 },
    uniquePatternTemplates: [
      'Timezone adjustments frequently',
      'Connectivity anxiety',
      'Location research sessions',
      'Digital community engagement',
    ],
  },
};

// ============================================
// PERSONA GENERATOR
// ============================================

export function generatePersona(id: number, rng: SeededRandom): Persona {
  // Select archetype based on distribution
  const archetypes = Object.keys(ARCHETYPE_DISTRIBUTION) as Archetype[];
  let cumulative = 0;
  const roll = rng.next();
  let selectedArchetype: Archetype = 'young-professional';

  for (const archetype of archetypes) {
    cumulative += ARCHETYPE_DISTRIBUTION[archetype];
    if (roll <= cumulative) {
      selectedArchetype = archetype;
      break;
    }
  }

  const config = ARCHETYPE_CONFIGS[selectedArchetype];

  // Generate name
  const firstName = rng.pick(FIRST_NAMES);
  const lastName = rng.pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;

  // Generate age
  const age = rng.nextInt(config.ageRange[0], config.ageRange[1]);

  // Generate wake/sleep times
  let wakeTime = rng.nextInt(config.wakeRange[0], config.wakeRange[1]);
  let sleepTime = rng.nextInt(config.sleepRange[0], config.sleepRange[1]);
  if (sleepTime > 24) sleepTime -= 24;
  if (sleepTime < wakeTime && sleepTime < 6) sleepTime += 24;

  // Generate work days
  const workDays = rng.pick(config.workDaysOptions);

  // Generate app preferences
  const baseWeight = 1 / 7;
  const appPreferences: Persona['appPreferences'] = {
    communication: baseWeight,
    health: baseWeight,
    memory: baseWeight,
    research: baseWeight,
    travel: baseWeight,
    entertainment: baseWeight,
    productivity: baseWeight,
  };

  // Apply archetype bias
  for (const [key, bias] of Object.entries(config.appWeightBias)) {
    const k = key as keyof typeof appPreferences;
    appPreferences[k] = bias!;
  }

  // Normalize to sum to 1
  const sum = Object.values(appPreferences).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(appPreferences) as (keyof typeof appPreferences)[]) {
    appPreferences[key] /= sum;
  }

  // Generate contacts
  const socialCircleSize = rng.nextInt(config.socialCircleSizeRange[0], config.socialCircleSizeRange[1]);
  const contacts: Contact[] = [];

  for (let i = 0; i < socialCircleSize; i++) {
    const contactFirstName = rng.pick(FIRST_NAMES);
    const contactLastName = rng.pick(LAST_NAMES);

    const relationshipRoll = rng.next();
    let relationship: Contact['relationship'];
    if (relationshipRoll < 0.2) relationship = 'family';
    else if (relationshipRoll < 0.5) relationship = 'friend';
    else if (relationshipRoll < 0.8) relationship = 'colleague';
    else relationship = 'acquaintance';

    const priorityRoll = rng.next();
    let priority: Contact['priority'];
    if (priorityRoll < 0.2) priority = 'high';
    else if (priorityRoll < 0.6) priority = 'medium';
    else priority = 'low';

    contacts.push({
      id: `contact-${id}-${i}`,
      name: `${contactFirstName} ${contactLastName}`,
      relationship,
      priority,
      communicationStyle: rng.next() < 0.5 ? 'sync' : 'async',
    });
  }

  // Generate unique patterns
  const shuffledPatterns = rng.shuffle(config.uniquePatternTemplates);
  const uniquePatterns = shuffledPatterns.slice(0, rng.nextInt(2, 4));

  return {
    id: `persona-${id}`,
    name,
    age,
    archetype: selectedArchetype,
    occupation: rng.pick(config.occupations),
    location: rng.pick(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Seattle', 'Denver', 'Boston', 'Atlanta', 'Miami']),
    routineVariance: rng.next() * (config.routineVarianceRange[1] - config.routineVarianceRange[0]) + config.routineVarianceRange[0],
    notificationTolerance: rng.next() * (config.notificationToleranceRange[1] - config.notificationToleranceRange[0]) + config.notificationToleranceRange[0],
    socialCircleSize,
    communicationStyle: rng.pick(config.communicationStyles),
    typicalWakeTime: wakeTime,
    typicalSleepTime: sleepTime % 24,
    workDays,
    appPreferences,
    contacts,
    uniquePatterns,
    avatarColor: rng.pick(AVATAR_COLORS),
  };
}

// ============================================
// MOMENT STATE GENERATOR
// ============================================

export function generateMomentState(
  persona: Persona,
  dayIndex: number,
  hourIndex: number,
  rng: SeededRandom
): MomentState {
  const dayOfWeek = dayIndex % 7;
  const isWorkDay = persona.workDays.includes(dayOfWeek);

  // Determine if person is awake
  let isAwake = true;
  const effectiveSleepTime = persona.typicalSleepTime < persona.typicalWakeTime
    ? persona.typicalSleepTime + 24
    : persona.typicalSleepTime;

  if (hourIndex < persona.typicalWakeTime || hourIndex >= effectiveSleepTime) {
    isAwake = rng.next() > 0.9; // Small chance of being awake outside normal hours
  }

  // Add variance to routines
  const variance = persona.routineVariance;
  if (rng.next() < variance * 0.3) {
    isAwake = !isAwake;
  }

  // Determine semantic location
  let semanticLocation: SemanticLocation = 'home';

  if (isAwake) {
    if (isWorkDay) {
      // Work day patterns
      if (hourIndex >= persona.typicalWakeTime && hourIndex < persona.typicalWakeTime + 1) {
        semanticLocation = 'home'; // Getting ready
      } else if (hourIndex >= persona.typicalWakeTime + 1 && hourIndex < persona.typicalWakeTime + 2) {
        semanticLocation = rng.next() < 0.7 ? 'commute' : 'home';
      } else if (hourIndex >= persona.typicalWakeTime + 2 && hourIndex < 17) {
        semanticLocation = persona.archetype === 'remote-worker' ? 'home' : 'work';
      } else if (hourIndex >= 17 && hourIndex < 18) {
        semanticLocation = persona.archetype === 'remote-worker' ? 'home' : 'commute';
      } else if (hourIndex >= 18) {
        const eveningRoll = rng.next();
        if (eveningRoll < 0.6) semanticLocation = 'home';
        else if (eveningRoll < 0.75) semanticLocation = 'gym';
        else if (eveningRoll < 0.9) semanticLocation = 'social';
        else semanticLocation = 'shopping';
      }
    } else {
      // Non-work day patterns
      const weekendRoll = rng.next();
      if (weekendRoll < 0.5) semanticLocation = 'home';
      else if (weekendRoll < 0.65) semanticLocation = 'social';
      else if (weekendRoll < 0.75) semanticLocation = 'shopping';
      else if (weekendRoll < 0.85) semanticLocation = 'outdoor';
      else if (weekendRoll < 0.9) semanticLocation = 'gym';
      else semanticLocation = 'traveling';
    }
  }

  // Generate active inputs
  const activeInputs = generateActiveInputs(persona, hourIndex, isAwake, semanticLocation, rng);

  // Generate passive inputs
  const passiveInputs = generatePassiveInputs(persona, dayIndex, hourIndex, isWorkDay, rng);

  // Generate memory buckets
  const memoryBuckets = generateMemoryBuckets(persona, hourIndex, semanticLocation, isWorkDay, rng);

  return {
    timestamp: Date.now() - (364 - dayIndex) * 24 * 60 * 60 * 1000 + hourIndex * 60 * 60 * 1000,
    personaId: persona.id,
    dayIndex,
    hourIndex,
    activeInputs,
    passiveInputs,
    memoryBuckets,
  };
}

function generateActiveInputs(
  persona: Persona,
  hourIndex: number,
  isAwake: boolean,
  semanticLocation: SemanticLocation,
  rng: SeededRandom
): ActiveInputs {
  // Device position based on context
  let devicePosition: DevicePosition = 'pocket';
  if (!isAwake) {
    devicePosition = rng.pick(['table-down', 'table-up']);
  } else if (semanticLocation === 'work') {
    devicePosition = rng.pick(['table-up', 'hand', 'pocket']);
  } else if (semanticLocation === 'commute') {
    devicePosition = rng.pick(['hand', 'pocket', 'bag']);
  } else if (semanticLocation === 'home') {
    devicePosition = rng.pick(['table-up', 'hand', 'pocket']);
  } else if (semanticLocation === 'gym') {
    devicePosition = rng.pick(['pocket', 'bag']);
  }

  // Device motion
  let deviceMotion: DeviceMotion = 'static';
  if (semanticLocation === 'commute') {
    deviceMotion = rng.pick(['vehicle', 'walking']);
  } else if (semanticLocation === 'gym') {
    deviceMotion = rng.pick(['running', 'walking', 'static']);
  } else if (semanticLocation === 'outdoor') {
    deviceMotion = rng.pick(['walking', 'static']);
  } else if (semanticLocation === 'shopping') {
    deviceMotion = 'walking';
  }

  // App usage
  let activeAppCategory: AppCategory = 'none';
  let activeApp: string | null = null;
  let sessionDuration = 0;

  if (isAwake && devicePosition === 'hand') {
    const categories: AppCategory[] = ['communication', 'health', 'memory', 'research', 'travel', 'entertainment', 'productivity'];
    const weights = categories.map((cat) => persona.appPreferences[cat as keyof typeof persona.appPreferences] || 0.1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = rng.next() * totalWeight;
    for (let i = 0; i < categories.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        activeAppCategory = categories[i];
        break;
      }
    }

    const appNames: Record<AppCategory, string[]> = {
      communication: ['Messages', 'WhatsApp', 'Slack', 'Email', 'Teams'],
      health: ['Health', 'Fitness', 'MyFitnessPal', 'Headspace', 'Sleep Cycle'],
      memory: ['Photos', 'Notes', 'Journal', 'Camera', 'Voice Memos'],
      research: ['Browser', 'Wikipedia', 'News', 'Reddit', 'Podcast'],
      travel: ['Maps', 'Uber', 'Flights', 'Hotels', 'Transit'],
      entertainment: ['Netflix', 'YouTube', 'Spotify', 'Games', 'TikTok'],
      productivity: ['Calendar', 'Tasks', 'Notion', 'Office', 'Files'],
      none: [],
    };

    if (activeAppCategory !== 'none') {
      activeApp = rng.pick(appNames[activeAppCategory]);
      sessionDuration = rng.nextInt(1, 45);
    }
  }

  // Biometrics
  let heartRate = rng.gaussian(70, 10);
  let respirationRate = rng.gaussian(15, 3);
  let stressLevel = rng.next() * 0.3;

  if (deviceMotion === 'running') {
    heartRate = rng.gaussian(140, 20);
    respirationRate = rng.gaussian(30, 5);
    stressLevel = 0.2 + rng.next() * 0.3;
  } else if (deviceMotion === 'walking') {
    heartRate = rng.gaussian(90, 10);
    respirationRate = rng.gaussian(20, 3);
  }

  // Time-based stress
  if (hourIndex >= 9 && hourIndex <= 17 && semanticLocation === 'work') {
    stressLevel += 0.2;
  }

  heartRate = Math.max(50, Math.min(180, heartRate));
  respirationRate = Math.max(10, Math.min(40, respirationRate));
  stressLevel = Math.max(0, Math.min(1, stressLevel));

  return {
    devicePosition,
    deviceMotion,
    isOnCall: isAwake && rng.next() < 0.05,
    activeApp,
    activeAppCategory,
    sessionDuration,
    heartRate: Math.round(heartRate),
    respirationRate: Math.round(respirationRate),
    stressLevel,
    semanticLocation,
    isMoving: deviceMotion !== 'static',
    isFamiliarLocation: rng.next() < 0.85,
    scrollVelocity: devicePosition === 'hand' ? rng.next() : 0,
    typingCadence: devicePosition === 'hand' && activeAppCategory === 'communication' ? rng.next() : 0,
    recentGesture: rng.next() < 0.1 ? rng.pick(['pull-from-pocket', 'turn-over', 'rotate', 'shake']) : 'none',
  };
}

function generatePassiveInputs(
  persona: Persona,
  dayIndex: number,
  hourIndex: number,
  isWorkDay: boolean,
  rng: SeededRandom
): PassiveInputs {
  const dayOfWeek = (dayIndex % 7) as PassiveInputs['dayOfWeek'];

  // Season based on day of year
  let season: PassiveInputs['season'];
  if (dayIndex < 80 || dayIndex >= 355) season = 'winter';
  else if (dayIndex < 172) season = 'spring';
  else if (dayIndex < 264) season = 'summer';
  else season = 'fall';

  // Weather
  const weatherOptions: PassiveInputs['weather'][] = ['clear', 'cloudy', 'rain', 'snow', 'storm'];
  const weatherWeights = season === 'winter'
    ? [0.3, 0.3, 0.2, 0.15, 0.05]
    : season === 'summer'
      ? [0.5, 0.3, 0.15, 0, 0.05]
      : [0.35, 0.35, 0.25, 0.02, 0.03];

  let weather: PassiveInputs['weather'] = 'clear';
  let roll = rng.next();
  for (let i = 0; i < weatherOptions.length; i++) {
    roll -= weatherWeights[i];
    if (roll <= 0) {
      weather = weatherOptions[i];
      break;
    }
  }

  // Traffic level based on time
  let trafficLevel: PassiveInputs['trafficLevel'] = 'light';
  if ((hourIndex >= 7 && hourIndex <= 9) || (hourIndex >= 16 && hourIndex <= 18)) {
    trafficLevel = rng.pick(['moderate', 'heavy', 'heavy']);
  } else if (hourIndex >= 10 && hourIndex <= 15) {
    trafficLevel = rng.pick(['light', 'moderate']);
  }

  // Calendar events
  const calendarEvents: CalendarEvent[] = [];
  if (isWorkDay) {
    // Possibly add meetings
    const meetingCount = rng.nextInt(0, 5);
    for (let i = 0; i < meetingCount; i++) {
      const startHour = rng.nextInt(9, 16);
      calendarEvents.push({
        id: `event-${dayIndex}-${i}`,
        title: rng.pick(['Team Standup', 'Project Review', 'Client Call', '1:1 Meeting', 'Planning Session']),
        startHour,
        endHour: startHour + 1,
        type: 'meeting',
        importance: rng.pick(['high', 'medium', 'low']),
      });
    }
  }

  // Deadlines
  const upcomingDeadlines: string[] = [];
  if (rng.next() < 0.3) {
    upcomingDeadlines.push(rng.pick(['Project submission', 'Report due', 'Review deadline', 'Payment due']));
  }

  // Messages
  const recentMessages: IncomingMessage[] = [];
  const messageCount = rng.nextInt(0, Math.round(persona.socialCircleSize * 0.3));

  for (let i = 0; i < messageCount; i++) {
    const contact = rng.pick(persona.contacts);
    const messageType = rng.pick(['text', 'email', 'social', 'app-notification', 'call']) as IncomingMessage['type'];

    recentMessages.push({
      id: `msg-${dayIndex}-${hourIndex}-${i}`,
      from: contact.name,
      contactId: contact.id,
      type: messageType,
      priority: contact.priority === 'high' ? 'urgent' : contact.priority === 'medium' ? 'normal' : 'low',
      timestamp: Date.now() - rng.nextInt(0, 60) * 60 * 1000,
      preview: messageType === 'text' || messageType === 'email'
        ? rng.pick(['Hey, are you free?', 'Don\'t forget about...', 'Quick question:', 'Update on...', 'Can we talk?'])
        : undefined,
    });
  }

  // Nearby contacts
  const nearbyContacts: string[] = [];
  if (rng.next() < 0.2) {
    const nearbyCount = rng.nextInt(1, 3);
    for (let i = 0; i < nearbyCount; i++) {
      const contact = rng.pick(persona.contacts);
      if (!nearbyContacts.includes(contact.id)) {
        nearbyContacts.push(contact.id);
      }
    }
  }

  return {
    hour: hourIndex,
    dayOfWeek,
    season,
    weather,
    trafficLevel,
    calendarEvents,
    upcomingDeadlines,
    isSpecialDay: rng.next() < 0.02,
    nearbyContacts,
    ambientNoiseLevel: rng.next() * 0.7,
    isInDarkEnvironment: hourIndex < 6 || hourIndex > 20,
    batteryLevel: rng.nextInt(15, 100),
    connectivityQuality: rng.next() * 0.5 + 0.5,
    isDoNotDisturb: hourIndex < persona.typicalWakeTime || hourIndex >= persona.typicalSleepTime,
    isSilentMode: rng.next() < 0.2,
    recentMessages,
    unreadCount: recentMessages.length,
    missedCallsCount: rng.nextInt(0, 2),
  };
}

function generateMemoryBuckets(
  persona: Persona,
  hourIndex: number,
  semanticLocation: SemanticLocation,
  isWorkDay: boolean,
  rng: SeededRandom
): MemoryBuckets {
  // Current mode based on context
  let currentMode: MemoryBuckets['contextState']['currentMode'];
  if (semanticLocation === 'work') currentMode = 'work';
  else if (semanticLocation === 'commute') currentMode = 'transit';
  else if (semanticLocation === 'social' || semanticLocation === 'outdoor') currentMode = 'social';
  else if (hourIndex >= persona.typicalSleepTime - 2 || hourIndex < persona.typicalWakeTime + 1) currentMode = 'rest';
  else currentMode = 'personal';

  // Energy level based on time
  let energyLevel = 0.7;
  if (hourIndex < persona.typicalWakeTime + 2) energyLevel = 0.4 + rng.next() * 0.3;
  else if (hourIndex >= 10 && hourIndex <= 14) energyLevel = 0.7 + rng.next() * 0.3;
  else if (hourIndex >= 14 && hourIndex <= 16) energyLevel = 0.5 + rng.next() * 0.3; // Afternoon slump
  else if (hourIndex >= persona.typicalSleepTime - 2) energyLevel = 0.3 + rng.next() * 0.3;

  return {
    preferences: {
      preferredNotificationTimes: [9, 12, 18],
      dislikedNotificationTypes: rng.shuffle(['promotions', 'social-games', 'news-alerts']).slice(0, 2),
      frequentApps: ['Messages', 'Calendar', 'Browser'],
      communicationPreferences: {},
    },
    currentIntent: {
      activeGoal: isWorkDay && semanticLocation === 'work'
        ? rng.pick(['Complete project', 'Prepare presentation', 'Review documents', null])
        : null,
      taskInProgress: rng.next() < 0.3 ? rng.pick(['Writing email', 'Reading article', 'Browsing', null]) : null,
      focusLevel: currentMode === 'work' ? 0.5 + rng.next() * 0.5 : rng.next() * 0.5,
    },
    recentInteractions: {
      lastAppUsed: rng.pick(['Messages', 'Email', 'Browser', 'Calendar', null]),
      lastContactCommunicated: persona.contacts.length > 0 ? rng.pick(persona.contacts).id : null,
      recentSearches: [],
      sessionCount24h: rng.nextInt(5, 50),
    },
    contextState: {
      currentMode,
      energyLevel,
      socialAvailability: currentMode === 'work' ? 0.3 : currentMode === 'social' ? 0.9 : 0.6,
    },
  };
}

// ============================================
// BATCH GENERATORS
// ============================================

export function generateAllPersonas(count: number = 1000): Persona[] {
  const personas: Persona[] = [];
  for (let i = 0; i < count; i++) {
    const rng = new SeededRandom(i * 12345);
    personas.push(generatePersona(i, rng));
  }
  return personas;
}

export function generateDayData(persona: Persona, dayIndex: number): MomentState[] {
  const moments: MomentState[] = [];
  const rng = new SeededRandom(parseInt(persona.id.split('-')[1]) * 1000 + dayIndex);

  for (let hour = 0; hour < 24; hour++) {
    moments.push(generateMomentState(persona, dayIndex, hour, rng));
  }

  return moments;
}
