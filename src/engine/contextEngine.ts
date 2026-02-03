import type {
  MomentState,
  Persona,
  ContextSynthesis,
  SignalWeight,
  OrchestratorState,
  AgentDecision,
  SurfacedContent,
  OperationalMode,
  PhoneScreenState,
  TunableParameters,
} from '../types';

// ============================================
// CONTEXT SYNTHESIS
// ============================================

export function synthesizeContext(
  moment: MomentState,
  persona: Persona
): ContextSynthesis {
  // Derive high-level states from signal combinations
  const derivedFocusWindow = deriveFocusWindow(moment, persona);
  const derivedStressState = deriveStressState(moment, persona);
  const derivedTransitionState = deriveTransitionState(moment, persona);
  const derivedPersonalTime = derivePersonalTime(moment, persona);
  const derivedWindDownMode = deriveWindDownMode(moment, persona);

  // Identify active patterns
  const activePatterns = identifyActivePatterns(moment, persona);

  // Calculate signal weights
  const activeWeights = calculateSignalWeights(moment, persona);

  // Rhythm matching
  const rhythmMatch = calculateRhythmMatch(moment, persona);

  return {
    derivedFocusWindow,
    derivedStressState,
    derivedTransitionState,
    derivedPersonalTime,
    derivedWindDownMode,
    activePatterns,
    activeWeights,
    rhythmMatch,
  };
}

function deriveFocusWindow(moment: MomentState, persona: Persona): boolean {
  const { activeInputs, passiveInputs, memoryBuckets } = moment;

  // Focus window: at work, morning, no imminent meetings
  if (activeInputs.semanticLocation !== 'work' && activeInputs.semanticLocation !== 'home') {
    return false;
  }

  const currentHour = passiveInputs.hour;
  const hasImmediateMeeting = passiveInputs.calendarEvents.some(
    (e) => e.startHour === currentHour || e.startHour === currentHour + 1
  );

  if (hasImmediateMeeting) return false;

  // Check if it's a typical focus time (morning or early afternoon)
  const isFocusTime = currentHour >= 9 && currentHour <= 14;

  // Check focus level
  const highFocus = memoryBuckets.currentIntent.focusLevel > 0.6;

  return isFocusTime && (highFocus || persona.archetype === 'remote-worker' || persona.archetype === 'executive');
}

function deriveStressState(moment: MomentState, _persona: Persona): boolean {
  const { activeInputs, passiveInputs } = moment;

  // Elevated heart rate
  const elevatedHR = activeInputs.heartRate > 90 && activeInputs.deviceMotion === 'static';

  // Approaching deadline
  const hasDeadline = passiveInputs.upcomingDeadlines.length > 0;

  // High stress indicator
  const highStress = activeInputs.stressLevel > 0.6;

  // Many unread messages
  const messageOverload = passiveInputs.unreadCount > 10;

  return (elevatedHR && highStress) || (hasDeadline && highStress) || messageOverload;
}

function deriveTransitionState(moment: MomentState, _persona: Persona): boolean {
  const { activeInputs } = moment;

  return (
    activeInputs.semanticLocation === 'commute' ||
    activeInputs.deviceMotion === 'vehicle' ||
    activeInputs.recentGesture === 'pull-from-pocket'
  );
}

function derivePersonalTime(moment: MomentState, persona: Persona): boolean {
  const { activeInputs, passiveInputs } = moment;

  const isHome = activeInputs.semanticLocation === 'home';
  const isEvening = passiveInputs.hour >= 18;
  const isWeekend = passiveInputs.dayOfWeek === 0 || passiveInputs.dayOfWeek === 6;
  const hasNearbyFamily = passiveInputs.nearbyContacts.some((id) =>
    persona.contacts.find((c) => c.id === id && c.relationship === 'family')
  );

  return isHome && (isEvening || isWeekend) && (hasNearbyFamily || passiveInputs.nearbyContacts.length === 0);
}

function deriveWindDownMode(moment: MomentState, _persona: Persona): boolean {
  const { activeInputs, passiveInputs } = moment;

  const isLateNight = passiveInputs.hour >= 21 || passiveInputs.hour < 2;
  const isEntertainment = activeInputs.activeAppCategory === 'entertainment';
  const lowEnergy = moment.memoryBuckets.contextState.energyLevel < 0.4;

  return isLateNight && (isEntertainment || lowEnergy || passiveInputs.isInDarkEnvironment);
}

function identifyActivePatterns(moment: MomentState, persona: Persona): string[] {
  const patterns: string[] = [];
  const { activeInputs, passiveInputs } = moment;

  // Morning routine
  if (passiveInputs.hour >= persona.typicalWakeTime && passiveInputs.hour < persona.typicalWakeTime + 2) {
    patterns.push('morning-routine');
  }

  // Commute pattern
  if (activeInputs.semanticLocation === 'commute') {
    patterns.push('commute');
  }

  // Work focus
  if (activeInputs.semanticLocation === 'work' && moment.memoryBuckets.currentIntent.focusLevel > 0.5) {
    patterns.push('work-focus');
  }

  // Exercise
  if (activeInputs.semanticLocation === 'gym' || activeInputs.deviceMotion === 'running') {
    patterns.push('exercise');
  }

  // Social time
  if (activeInputs.semanticLocation === 'social' || passiveInputs.nearbyContacts.length > 0) {
    patterns.push('social-time');
  }

  // Rest/sleep
  if (passiveInputs.hour >= persona.typicalSleepTime || passiveInputs.hour < persona.typicalWakeTime) {
    patterns.push('rest-period');
  }

  // Meeting mode
  if (passiveInputs.calendarEvents.some((e) => e.startHour <= passiveInputs.hour && e.endHour > passiveInputs.hour)) {
    patterns.push('in-meeting');
  }

  return patterns;
}

function calculateSignalWeights(moment: MomentState, _persona: Persona): SignalWeight[] {
  const weights: SignalWeight[] = [];
  const { activeInputs, passiveInputs } = moment;

  // Location + Time combinations
  if (activeInputs.semanticLocation === 'work' && passiveInputs.hour >= 9 && passiveInputs.hour <= 11) {
    weights.push({
      signalA: 'location:work',
      signalB: 'time:morning',
      weight: 0.85,
      interpretation: 'Prime focus window - minimize interruptions',
    });
  }

  // Biometrics + Schedule
  if (activeInputs.stressLevel > 0.5 && passiveInputs.upcomingDeadlines.length > 0) {
    weights.push({
      signalA: 'biometrics:elevated-stress',
      signalB: 'schedule:deadline',
      weight: 0.9,
      interpretation: 'Stress state - reduce non-critical notifications',
    });
  }

  // Device + Location for audio preference
  if (activeInputs.devicePosition === 'pocket' && activeInputs.semanticLocation === 'commute') {
    weights.push({
      signalA: 'device:pocket',
      signalB: 'location:commute',
      weight: 0.75,
      interpretation: 'In transit - prefer audio interactions',
    });
  }

  // Social proximity + Time for personal filtering
  if (passiveInputs.nearbyContacts.length > 0 && passiveInputs.hour >= 18) {
    weights.push({
      signalA: 'social:nearby-contacts',
      signalB: 'time:evening',
      weight: 0.8,
      interpretation: 'Personal time with others - filter work content',
    });
  }

  // Entertainment + Late night
  if (activeInputs.activeAppCategory === 'entertainment' && passiveInputs.hour >= 22) {
    weights.push({
      signalA: 'usage:entertainment',
      signalB: 'time:late-night',
      weight: 0.7,
      interpretation: 'Wind-down mode - suggest sleep soon',
    });
  }

  // Battery critical
  if (passiveInputs.batteryLevel < 20) {
    weights.push({
      signalA: 'device:low-battery',
      signalB: 'usage:active',
      weight: 0.65,
      interpretation: 'Low battery - suggest power saving',
    });
  }

  // Weather impact
  if (passiveInputs.weather === 'rain' || passiveInputs.weather === 'storm') {
    weights.push({
      signalA: 'environment:bad-weather',
      signalB: 'schedule:upcoming',
      weight: 0.6,
      interpretation: 'Weather may affect plans - proactive alerts',
    });
  }

  return weights;
}

function calculateRhythmMatch(moment: MomentState, persona: Persona): ContextSynthesis['rhythmMatch'] {
  const { passiveInputs, memoryBuckets } = moment;

  // Daily rhythm: How well does current activity match typical pattern for this hour?
  let dailyMatch = 0.5;
  const hour = passiveInputs.hour;

  if (hour >= persona.typicalWakeTime && hour < persona.typicalSleepTime) {
    // Awake hours - check if activity makes sense
    if (memoryBuckets.contextState.currentMode === 'work' && persona.workDays.includes(passiveInputs.dayOfWeek)) {
      dailyMatch = 0.8;
    } else if (memoryBuckets.contextState.currentMode === 'personal' && !persona.workDays.includes(passiveInputs.dayOfWeek)) {
      dailyMatch = 0.85;
    }
  } else {
    // Sleep hours
    if (memoryBuckets.contextState.currentMode === 'rest') {
      dailyMatch = 0.9;
    } else {
      dailyMatch = 0.3; // Unusual to be active during sleep hours
    }
  }

  // Weekly rhythm
  const isWorkDay = persona.workDays.includes(passiveInputs.dayOfWeek);
  const isActuallyWorking = memoryBuckets.contextState.currentMode === 'work';
  const weeklyMatch = isWorkDay === isActuallyWorking ? 0.85 : 0.4;

  // Contextual rhythm
  const contextualMatch = 0.5 + Math.random() * 0.3; // Simplified for now

  return {
    daily: Math.min(1, Math.max(0, dailyMatch + (Math.random() - 0.5) * 0.2)),
    weekly: Math.min(1, Math.max(0, weeklyMatch + (Math.random() - 0.5) * 0.15)),
    contextual: contextualMatch,
  };
}

// ============================================
// SPECIALIST AGENTS
// ============================================

interface AgentContext {
  moment: MomentState;
  persona: Persona;
  synthesis: ContextSynthesis;
  params: TunableParameters;
}

function focusAttentionAgent(ctx: AgentContext): AgentDecision | null {
  const { moment, synthesis, params } = ctx;
  const { activeInputs, passiveInputs } = moment;

  // Decide on focus-related actions
  if (synthesis.derivedFocusWindow) {
    const confidence = 0.7 + synthesis.rhythmMatch.daily * 0.3;

    if (confidence * 100 >= params.confidenceThreshold) {
      return {
        agentId: 'focus-attention',
        agentName: 'Focus & Attention Agent',
        action: 'enable-focus-mode',
        confidence,
        reasoning: `Detected focus window based on location (${activeInputs.semanticLocation}), time (${passiveInputs.hour}:00), and no immediate meetings.`,
        timestamp: Date.now(),
      };
    }
  }

  if (synthesis.derivedStressState && params.proactivityLevel !== 'low') {
    return {
      agentId: 'focus-attention',
      agentName: 'Focus & Attention Agent',
      action: 'reduce-interruptions',
      confidence: 0.75,
      reasoning: `Elevated stress detected (${Math.round(activeInputs.stressLevel * 100)}%). Reducing non-essential notifications.`,
      timestamp: Date.now(),
    };
  }

  return null;
}

function productivityAgent(ctx: AgentContext): AgentDecision | null {
  const { moment, params } = ctx;
  const { passiveInputs, memoryBuckets } = moment;

  // Check for deadline reminders
  if (passiveInputs.upcomingDeadlines.length > 0 && params.proactivityLevel !== 'low') {
    const confidence = 0.8;
    if (confidence * 100 >= params.confidenceThreshold) {
      return {
        agentId: 'productivity',
        agentName: 'Productivity Agent',
        action: 'deadline-reminder',
        confidence,
        reasoning: `Upcoming deadline: "${passiveInputs.upcomingDeadlines[0]}". Current focus level: ${Math.round(memoryBuckets.currentIntent.focusLevel * 100)}%.`,
        timestamp: Date.now(),
      };
    }
  }

  // Check for meeting preparation
  const upcomingMeeting = passiveInputs.calendarEvents.find(
    (e) => e.startHour === passiveInputs.hour + 1
  );

  if (upcomingMeeting && params.proactivityLevel === 'high') {
    return {
      agentId: 'productivity',
      agentName: 'Productivity Agent',
      action: 'meeting-prep',
      confidence: 0.7,
      reasoning: `"${upcomingMeeting.title}" starts in 1 hour. Preparing relevant context.`,
      timestamp: Date.now(),
    };
  }

  return null;
}

function socialAgent(ctx: AgentContext): AgentDecision | null {
  const { moment, persona, synthesis, params } = ctx;
  const { passiveInputs } = moment;

  // Check for important unread messages
  const urgentMessages = passiveInputs.recentMessages.filter((m) => m.priority === 'urgent');

  if (urgentMessages.length > 0) {
    const sender = urgentMessages[0].from;
    const contact = persona.contacts.find((c) => c.id === urgentMessages[0].contactId);

    return {
      agentId: 'social',
      agentName: 'Social Agent',
      action: 'surface-urgent-message',
      confidence: 0.9,
      reasoning: `Urgent message from ${sender} (${contact?.relationship || 'contact'}). Priority based on relationship and message urgency.`,
      timestamp: Date.now(),
    };
  }

  // Filter work during personal time
  if (synthesis.derivedPersonalTime && params.privacyBoundary !== 'minimal') {
    const workMessages = passiveInputs.recentMessages.filter(
      (m) => persona.contacts.find((c) => c.id === m.contactId)?.relationship === 'colleague'
    );

    if (workMessages.length > 0) {
      return {
        agentId: 'social',
        agentName: 'Social Agent',
        action: 'hold-work-messages',
        confidence: 0.75,
        reasoning: `Personal time detected. Holding ${workMessages.length} work-related messages for later.`,
        timestamp: Date.now(),
      };
    }
  }

  return null;
}

// ============================================
// ORCHESTRATOR
// ============================================

export function runOrchestrator(
  moment: MomentState,
  persona: Persona,
  synthesis: ContextSynthesis,
  params: TunableParameters
): OrchestratorState {
  const ctx: AgentContext = { moment, persona, synthesis, params };

  // Collect agent decisions
  const decisions: AgentDecision[] = [];

  const focusDecision = focusAttentionAgent(ctx);
  if (focusDecision) decisions.push(focusDecision);

  const productivityDecision = productivityAgent(ctx);
  if (productivityDecision) decisions.push(productivityDecision);

  const socialDecision = socialAgent(ctx);
  if (socialDecision) decisions.push(socialDecision);

  // Determine operational mode
  let mode: OperationalMode = 'adapt';
  let modeReasoning = '';

  if (synthesis.derivedFocusWindow || synthesis.derivedStressState) {
    mode = 'silent';
    modeReasoning = synthesis.derivedStressState
      ? 'Stress detected - minimizing interruptions'
      : 'Focus window active - notifications held';
  } else if (synthesis.derivedWindDownMode) {
    mode = 'silent';
    modeReasoning = 'Wind-down mode - preparing for rest';
  } else if (synthesis.derivedTransitionState) {
    mode = 'adapt';
    modeReasoning = 'Transition detected - adapting interface for mobility';
  } else if (synthesis.derivedPersonalTime) {
    mode = 'adapt';
    modeReasoning = 'Personal time - filtering work content, allowing personal notifications';
  } else if (decisions.some((d) => d.action.includes('urgent') || d.action.includes('deadline'))) {
    mode = 'notify';
    modeReasoning = 'Important items require attention';
  }

  // Calculate confidence
  const avgConfidence = decisions.length > 0
    ? decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length
    : synthesis.rhythmMatch.daily;

  // Generate surfaced content
  const surfacedContent = generateSurfacedContent(moment, persona, synthesis, decisions, params);

  return {
    currentMode: mode,
    confidenceLevel: avgConfidence,
    activeAgents: decisions.map((d) => d.agentId),
    recentDecisions: decisions,
    surfacedContent,
    modeReasoning,
  };
}

function generateSurfacedContent(
  moment: MomentState,
  persona: Persona,
  synthesis: ContextSynthesis,
  decisions: AgentDecision[],
  params: TunableParameters
): SurfacedContent[] {
  const content: SurfacedContent[] = [];
  const { activeInputs, passiveInputs } = moment;

  // Weather widget for mornings
  if (passiveInputs.hour >= persona.typicalWakeTime && passiveInputs.hour < persona.typicalWakeTime + 2) {
    content.push({
      id: 'weather-morning',
      type: 'widget',
      title: 'Weather',
      body: `${passiveInputs.weather.charAt(0).toUpperCase() + passiveInputs.weather.slice(1)}, ${passiveInputs.trafficLevel} traffic`,
      priority: 0.6,
      source: 'orchestrator',
      confidence: 0.9,
      timestamp: Date.now(),
    });
  }

  // Calendar for work hours
  if (activeInputs.semanticLocation === 'work' || (persona.archetype === 'remote-worker' && passiveInputs.hour >= 9 && passiveInputs.hour <= 17)) {
    const nextMeeting = passiveInputs.calendarEvents.find((e) => e.startHour >= passiveInputs.hour);
    if (nextMeeting) {
      content.push({
        id: 'next-meeting',
        type: 'widget',
        title: 'Next: ' + nextMeeting.title,
        body: `${nextMeeting.startHour}:00 - ${nextMeeting.endHour}:00`,
        priority: 0.8,
        source: 'productivity',
        confidence: 0.95,
        timestamp: Date.now(),
      });
    }
  }

  // Urgent notifications
  const urgentMessages = passiveInputs.recentMessages.filter((m) => m.priority === 'urgent');
  for (const msg of urgentMessages.slice(0, 2)) {
    content.push({
      id: `urgent-${msg.id}`,
      type: 'notification',
      title: msg.from,
      body: msg.preview || `${msg.type} message`,
      priority: 0.95,
      source: 'social',
      confidence: 0.9,
      timestamp: msg.timestamp,
    });
  }

  // Focus mode suggestion
  if (synthesis.derivedFocusWindow && params.proactivityLevel !== 'low') {
    content.push({
      id: 'focus-suggestion',
      type: 'suggestion',
      title: 'Focus Mode Available',
      body: 'No meetings for the next 2 hours. Enable deep focus?',
      priority: 0.5,
      source: 'focus-attention',
      confidence: decisions.find((d) => d.agentId === 'focus-attention')?.confidence || 0.7,
      timestamp: Date.now(),
    });
  }

  // Wind-down suggestion
  if (synthesis.derivedWindDownMode && params.proactivityLevel === 'high') {
    content.push({
      id: 'wind-down',
      type: 'suggestion',
      title: 'Wind Down',
      body: `It's getting late. Consider wrapping up for better sleep.`,
      priority: 0.4,
      source: 'focus-attention',
      confidence: 0.7,
      timestamp: Date.now(),
    });
  }

  // Low battery warning
  if (passiveInputs.batteryLevel < 20) {
    content.push({
      id: 'low-battery',
      type: 'info',
      title: 'Battery Low',
      body: `${passiveInputs.batteryLevel}% remaining`,
      priority: 0.7,
      source: 'orchestrator',
      confidence: 1,
      timestamp: Date.now(),
    });
  }

  // Sort by priority
  content.sort((a, b) => b.priority - a.priority);

  return content.slice(0, 5);
}

// ============================================
// PHONE SCREEN STATE GENERATOR
// ============================================

export function generatePhoneScreen(
  moment: MomentState,
  persona: Persona,
  synthesis: ContextSynthesis,
  orchestrator: OrchestratorState
): PhoneScreenState {
  const { activeInputs, passiveInputs } = moment;

  // Theme based on time and environment
  let theme: PhoneScreenState['theme'] = 'light';
  if (passiveInputs.hour >= 20 || passiveInputs.hour < 6) {
    theme = 'dark';
  } else if (passiveInputs.isInDarkEnvironment) {
    theme = 'dim';
  }

  // Brightness
  let brightness = 0.8;
  if (synthesis.derivedWindDownMode) brightness = 0.4;
  if (passiveInputs.isInDarkEnvironment) brightness = 0.3;

  // Primary widget based on context
  let primaryWidget: PhoneScreenState['primaryWidget'] = 'none';

  if (synthesis.derivedFocusWindow) {
    primaryWidget = 'focus';
  } else if (passiveInputs.hour >= persona.typicalWakeTime && passiveInputs.hour < persona.typicalWakeTime + 2) {
    primaryWidget = 'weather';
  } else if (activeInputs.semanticLocation === 'work') {
    primaryWidget = 'calendar';
  } else if (activeInputs.semanticLocation === 'commute') {
    primaryWidget = 'music';
  } else if (passiveInputs.unreadCount > 3) {
    primaryWidget = 'messages';
  }

  // Quick actions based on context
  const quickActions: string[] = [];

  if (activeInputs.semanticLocation === 'commute') {
    quickActions.push('Navigate', 'Music', 'Call');
  } else if (activeInputs.semanticLocation === 'work') {
    quickActions.push('Calendar', 'Email', 'Notes');
  } else if (synthesis.derivedPersonalTime) {
    quickActions.push('Messages', 'Camera', 'Music');
  } else {
    quickActions.push('Messages', 'Browser', 'Camera');
  }

  // Contextual message
  let contextualMessage: string | undefined;

  if (synthesis.derivedFocusWindow) {
    contextualMessage = 'Focus time - notifications paused';
  } else if (synthesis.derivedStressState) {
    contextualMessage = 'Take a breath - non-urgent items held';
  } else if (synthesis.derivedTransitionState && activeInputs.semanticLocation === 'commute') {
    contextualMessage = passiveInputs.trafficLevel === 'heavy' ? 'Heavy traffic ahead' : 'Smooth commute expected';
  } else if (synthesis.derivedWindDownMode) {
    contextualMessage = 'Wind-down mode active';
  }

  // Format time
  const hour = passiveInputs.hour % 12 || 12;
  const ampm = passiveInputs.hour >= 12 ? 'PM' : 'AM';
  const timeDisplay = `${hour}:00 ${ampm}`;

  // Format date
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dateDisplay = days[passiveInputs.dayOfWeek];

  return {
    brightness,
    theme,
    primaryWidget,
    notifications: orchestrator.surfacedContent.filter((c) => c.type === 'notification'),
    quickActions,
    contextualMessage,
    timeDisplay,
    dateDisplay,
    batteryLevel: passiveInputs.batteryLevel,
    signalStrength: passiveInputs.connectivityQuality,
    doNotDisturb: passiveInputs.isDoNotDisturb || orchestrator.currentMode === 'silent',
  };
}
