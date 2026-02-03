import { create } from 'zustand';
import type {
  MomentState,
  TunableParameters,
  SimulationState,
} from '../types';
import { generateAllPersonas, generateDayData } from '../data/generators';
import { synthesizeContext, runOrchestrator, generatePhoneScreen } from '../engine/contextEngine';

interface SimulationStore extends SimulationState {
  // Initialization
  initializePersonas: () => void;

  // Selection
  selectPersona: (personaId: string) => void;

  // Time control
  setDay: (dayIndex: number) => void;
  setHour: (hourIndex: number) => void;
  setDateTime: (dayIndex: number, hourIndex: number) => void;

  // Playback
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;

  // Parameters
  setConfidenceThreshold: (value: number) => void;
  setProactivityLevel: (level: TunableParameters['proactivityLevel']) => void;
  setPrivacyBoundary: (boundary: TunableParameters['privacyBoundary']) => void;

  // Internal
  _dayData: Map<string, MomentState[]>;
  _loadDayData: (personaId: string, dayIndex: number) => MomentState[];
  _updateSimulationState: () => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  // Initial state
  selectedPersonaId: null,
  currentDayIndex: 180, // Middle of the year
  currentHourIndex: 9, // 9 AM
  isPlaying: false,
  playbackSpeed: 1,
  parameters: {
    confidenceThreshold: 70,
    proactivityLevel: 'medium',
    privacyBoundary: 'moderate',
  },
  personas: [],
  currentMoment: null,
  contextSynthesis: null,
  orchestratorState: null,
  phoneScreenState: null,
  _dayData: new Map(),

  initializePersonas: () => {
    // Generate 100 personas for the demo (can scale to 1000)
    const personas = generateAllPersonas(100);
    set({ personas });

    // Auto-select first persona
    if (personas.length > 0) {
      get().selectPersona(personas[0].id);
    }
  },

  selectPersona: (personaId: string) => {
    const state = get();
    const persona = state.personas.find((p) => p.id === personaId);
    if (!persona) return;

    set({ selectedPersonaId: personaId });
    get()._updateSimulationState();
  },

  setDay: (dayIndex: number) => {
    set({ currentDayIndex: Math.max(0, Math.min(364, dayIndex)) });
    get()._updateSimulationState();
  },

  setHour: (hourIndex: number) => {
    set({ currentHourIndex: Math.max(0, Math.min(23, hourIndex)) });
    get()._updateSimulationState();
  },

  setDateTime: (dayIndex: number, hourIndex: number) => {
    set({
      currentDayIndex: Math.max(0, Math.min(364, dayIndex)),
      currentHourIndex: Math.max(0, Math.min(23, hourIndex)),
    });
    get()._updateSimulationState();
  },

  togglePlayback: () => {
    const state = get();
    set({ isPlaying: !state.isPlaying });
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed });
  },

  setConfidenceThreshold: (value: number) => {
    set((state) => ({
      parameters: { ...state.parameters, confidenceThreshold: value },
    }));
    get()._updateSimulationState();
  },

  setProactivityLevel: (level: TunableParameters['proactivityLevel']) => {
    set((state) => ({
      parameters: { ...state.parameters, proactivityLevel: level },
    }));
    get()._updateSimulationState();
  },

  setPrivacyBoundary: (boundary: TunableParameters['privacyBoundary']) => {
    set((state) => ({
      parameters: { ...state.parameters, privacyBoundary: boundary },
    }));
    get()._updateSimulationState();
  },

  _loadDayData: (personaId: string, dayIndex: number) => {
    const state = get();
    const cacheKey = `${personaId}-${dayIndex}`;

    if (state._dayData.has(cacheKey)) {
      return state._dayData.get(cacheKey)!;
    }

    const persona = state.personas.find((p) => p.id === personaId);
    if (!persona) return [];

    const dayData = generateDayData(persona, dayIndex);
    state._dayData.set(cacheKey, dayData);

    // Limit cache size
    if (state._dayData.size > 100) {
      const firstKey = state._dayData.keys().next().value;
      if (firstKey) state._dayData.delete(firstKey);
    }

    return dayData;
  },

  _updateSimulationState: () => {
    const state = get();
    const { selectedPersonaId, currentDayIndex, currentHourIndex, parameters, personas } = state;

    if (!selectedPersonaId) {
      set({
        currentMoment: null,
        contextSynthesis: null,
        orchestratorState: null,
        phoneScreenState: null,
      });
      return;
    }

    const persona = personas.find((p) => p.id === selectedPersonaId);
    if (!persona) return;

    // Load day data
    const dayData = state._loadDayData(selectedPersonaId, currentDayIndex);
    const currentMoment = dayData[currentHourIndex];

    if (!currentMoment) return;

    // Run context engine
    const contextSynthesis = synthesizeContext(currentMoment, persona);
    const orchestratorState = runOrchestrator(currentMoment, persona, contextSynthesis, parameters);
    const phoneScreenState = generatePhoneScreen(currentMoment, persona, contextSynthesis, orchestratorState);

    set({
      currentMoment,
      contextSynthesis,
      orchestratorState,
      phoneScreenState,
    });
  },
}));

// Playback interval manager
let playbackInterval: ReturnType<typeof setInterval> | null = null;

export function startPlaybackLoop() {
  if (playbackInterval) return;

  playbackInterval = setInterval(() => {
    const state = useSimulationStore.getState();
    if (!state.isPlaying) return;

    let { currentHourIndex, currentDayIndex } = state;
    currentHourIndex += 1;

    if (currentHourIndex >= 24) {
      currentHourIndex = 0;
      currentDayIndex += 1;
      if (currentDayIndex >= 365) {
        currentDayIndex = 0;
      }
    }

    state.setDateTime(currentDayIndex, currentHourIndex);
  }, 1000); // Update every second at 1x speed
}

export function stopPlaybackLoop() {
  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
}
