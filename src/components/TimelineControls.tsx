import { useEffect } from 'react';
import { useSimulationStore, startPlaybackLoop, stopPlaybackLoop } from '../store/simulationStore';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from 'lucide-react';

export function TimelineControls() {
  const {
    currentDayIndex,
    currentHourIndex,
    isPlaying,
    setDay,
    setHour,
    setDateTime,
    togglePlayback,
    selectedPersonaId,
  } = useSimulationStore();

  // Start/stop playback loop based on isPlaying state
  useEffect(() => {
    if (isPlaying) {
      startPlaybackLoop();
    } else {
      stopPlaybackLoop();
    }

    return () => stopPlaybackLoop();
  }, [isPlaying]);

  const formatDate = (dayIndex: number) => {
    const baseDate = new Date(2025, 0, 1); // Jan 1, 2025
    baseDate.setDate(baseDate.getDate() + dayIndex);
    return baseDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${h}:00 ${ampm}`;
  };

  const getDayOfWeek = (dayIndex: number) => {
    return dayIndex % 7;
  };

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Get time of day icon
  const getTimeIcon = (hour: number) => {
    if (hour >= 5 && hour < 8) return Sunrise;
    if (hour >= 8 && hour < 18) return Sun;
    if (hour >= 18 && hour < 21) return Sunset;
    return Moon;
  };

  const TimeIcon = getTimeIcon(currentHourIndex);

  if (!selectedPersonaId) {
    return (
      <div className="bg-[#1e1e2e] border-t border-[#363650] p-4 text-center text-gray-500">
        Select a persona to control the timeline
      </div>
    );
  }

  return (
    <div className="bg-[#1e1e2e] border-t border-[#363650] p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Time Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TimeIcon className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-light text-white">
                {formatHour(currentHourIndex)}
              </span>
            </div>
            <div className="text-gray-400">
              {formatDate(currentDayIndex)}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDateTime(currentDayIndex - 1, currentHourIndex)}
              className="p-2 hover:bg-[#2a2a3e] rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Previous Day"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHour(currentHourIndex - 1)}
              className="p-2 hover:bg-[#2a2a3e] rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Previous Hour"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlayback}
              className={`p-3 rounded-full transition-colors ${
                isPlaying
                  ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                  : 'bg-indigo-500 text-white hover:bg-indigo-400'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setHour(currentHourIndex + 1)}
              className="p-2 hover:bg-[#2a2a3e] rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Next Hour"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDateTime(currentDayIndex + 1, currentHourIndex)}
              className="p-2 hover:bg-[#2a2a3e] rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Next Day"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Jump */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHour(8)}
              className="px-2 py-1 text-xs bg-[#2a2a3e] hover:bg-[#363650] rounded text-gray-400 hover:text-white transition-colors"
            >
              Morning
            </button>
            <button
              onClick={() => setHour(12)}
              className="px-2 py-1 text-xs bg-[#2a2a3e] hover:bg-[#363650] rounded text-gray-400 hover:text-white transition-colors"
            >
              Noon
            </button>
            <button
              onClick={() => setHour(18)}
              className="px-2 py-1 text-xs bg-[#2a2a3e] hover:bg-[#363650] rounded text-gray-400 hover:text-white transition-colors"
            >
              Evening
            </button>
            <button
              onClick={() => setHour(23)}
              className="px-2 py-1 text-xs bg-[#2a2a3e] hover:bg-[#363650] rounded text-gray-400 hover:text-white transition-colors"
            >
              Night
            </button>
          </div>
        </div>

        {/* Hour Scrubber */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>12:00 AM</span>
            <span>6:00 AM</span>
            <span>12:00 PM</span>
            <span>6:00 PM</span>
            <span>12:00 AM</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="23"
              value={currentHourIndex}
              onChange={(e) => setHour(parseInt(e.target.value))}
              className="w-full h-2 bg-[#2a2a3e] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(currentHourIndex / 23) * 100}%, #2a2a3e ${(currentHourIndex / 23) * 100}%, #2a2a3e 100%)`,
              }}
            />
            {/* Hour markers */}
            <div className="absolute top-full mt-1 w-full flex justify-between px-1">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className={`w-0.5 h-2 rounded-full ${
                    i === currentHourIndex
                      ? 'bg-indigo-500'
                      : i % 6 === 0
                      ? 'bg-gray-600'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Week View */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDay(currentDayIndex - 7)}
            className="p-1 hover:bg-[#2a2a3e] rounded transition-colors text-gray-500 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 flex gap-1">
            {[...Array(7)].map((_, i) => {
              const dayOffset = i - 3;
              const targetDay = currentDayIndex + dayOffset;
              const isSelected = dayOffset === 0;
              const dayOfWeek = getDayOfWeek(targetDay);
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <button
                  key={i}
                  onClick={() => setDay(targetDay)}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-indigo-500 text-white'
                      : 'bg-[#2a2a3e] hover:bg-[#363650] text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="text-[10px] opacity-70">{dayNames[dayOfWeek]}</div>
                  <div className={`text-sm ${isWeekend && !isSelected ? 'text-amber-400' : ''}`}>
                    {((targetDay % 365) + 1).toString().padStart(3, '0')}
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setDay(currentDayIndex + 7)}
            className="p-1 hover:bg-[#2a2a3e] rounded transition-colors text-gray-500 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Year Progress */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Day {currentDayIndex + 1} of 365</span>
          <div className="flex-1 h-1 bg-[#2a2a3e] rounded-full">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${((currentDayIndex + 1) / 365) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{Math.round(((currentDayIndex + 1) / 365) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
