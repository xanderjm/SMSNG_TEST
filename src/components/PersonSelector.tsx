import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import type { Persona } from '../types';
import { ARCHETYPE_LABELS } from '../types';

export function PersonSelector() {
  const { personas, selectedPersonaId, selectPersona } = useSimulationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedArchetype, setExpandedArchetype] = useState<string | null>(null);

  // Group personas by archetype
  const groupedPersonas = useMemo(() => {
    const groups: Record<string, Persona[]> = {};

    personas.forEach((persona) => {
      if (!groups[persona.archetype]) {
        groups[persona.archetype] = [];
      }
      groups[persona.archetype].push(persona);
    });

    return groups;
  }, [personas]);

  // Filter based on search
  const filteredPersonas = useMemo(() => {
    if (!searchQuery.trim()) return personas;

    const query = searchQuery.toLowerCase();
    return personas.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.occupation.toLowerCase().includes(query) ||
        ARCHETYPE_LABELS[p.archetype].toLowerCase().includes(query)
    );
  }, [personas, searchQuery]);

  // Filter grouped personas
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedPersonas;

    const groups: Record<string, Persona[]> = {};
    filteredPersonas.forEach((persona) => {
      if (!groups[persona.archetype]) {
        groups[persona.archetype] = [];
      }
      groups[persona.archetype].push(persona);
    });
    return groups;
  }, [groupedPersonas, filteredPersonas, searchQuery]);

  const toggleArchetype = (archetype: string) => {
    setExpandedArchetype((prev) => (prev === archetype ? null : archetype));
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e] border-r border-[#363650]">
      <div className="p-4 border-b border-[#363650]">
        <h2 className="text-lg font-semibold text-white mb-3">Personas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search personas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#2a2a3e] border border-[#363650] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {filteredPersonas.length} of {personas.length} personas
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(filteredGroups).map(([archetype, archetypePersonas]) => (
          <div key={archetype} className="border-b border-[#2a2a3e]">
            <button
              onClick={() => toggleArchetype(archetype)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#2a2a3e] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">
                  {ARCHETYPE_LABELS[archetype as keyof typeof ARCHETYPE_LABELS]}
                </span>
                <span className="text-xs text-gray-500 bg-[#363650] px-2 py-0.5 rounded-full">
                  {archetypePersonas.length}
                </span>
              </div>
              {expandedArchetype === archetype ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedArchetype === archetype && (
              <div className="pb-2">
                {archetypePersonas.map((persona) => (
                  <PersonaItem
                    key={persona.id}
                    persona={persona}
                    isSelected={persona.id === selectedPersonaId}
                    onSelect={() => selectPersona(persona.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface PersonaItemProps {
  persona: Persona;
  isSelected: boolean;
  onSelect: () => void;
}

function PersonaItem({ persona, isSelected, onSelect }: PersonaItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full px-4 py-2 flex items-center gap-3 transition-colors ${
        isSelected
          ? 'bg-indigo-500/20 border-l-2 border-indigo-500'
          : 'hover:bg-[#2a2a3e] border-l-2 border-transparent'
      }`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
        style={{ backgroundColor: persona.avatarColor }}
      >
        {persona.name
          .split(' ')
          .map((n) => n[0])
          .join('')}
      </div>
      <div className="flex-1 text-left">
        <div className={`text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
          {persona.name}
        </div>
        <div className="text-xs text-gray-500">{persona.occupation}</div>
      </div>
      <div className="text-xs text-gray-500">{persona.age}</div>
    </button>
  );
}
