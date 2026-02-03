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
  Focus,
  ChevronRight,
  Clock,
  MapPin,
  Heart,
} from 'lucide-react';
import type { PhoneScreenState, SurfacedContent } from '../types';

export function PhoneSimulator() {
  const { phoneScreenState, orchestratorState, currentMoment, personas, selectedPersonaId } =
    useSimulationStore();

  const persona = personas.find((p) => p.id === selectedPersonaId);

  if (!phoneScreenState || !persona) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-center">
          <div className="w-48 h-96 border-4 border-gray-700 rounded-[3rem] mx-auto mb-4 flex items-center justify-center">
            <span className="text-sm">Select a persona</span>
          </div>
        </div>
      </div>
    );
  }

  const bgColor =
    phoneScreenState.theme === 'dark'
      ? 'bg-gray-900'
      : phoneScreenState.theme === 'dim'
      ? 'bg-gray-800'
      : 'bg-gradient-to-b from-blue-50 to-blue-100';

  const textColor =
    phoneScreenState.theme === 'dark' || phoneScreenState.theme === 'dim'
      ? 'text-white'
      : 'text-gray-900';

  return (
    <div className="flex flex-col items-center justify-center h-full py-4">
      {/* Phone Frame */}
      <div className="relative">
        {/* Outer Frame */}
        <div className="w-[280px] h-[580px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
          {/* Inner Screen */}
          <div
            className={`w-full h-full rounded-[2.5rem] overflow-hidden relative ${bgColor}`}
            style={{ opacity: 0.3 + phoneScreenState.brightness * 0.7 }}
          >
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-b-2xl z-10" />

            {/* Status Bar */}
            <StatusBar phoneState={phoneScreenState} />

            {/* Main Content */}
            <div className={`px-4 pt-12 pb-4 h-full flex flex-col ${textColor}`}>
              {/* Time Display */}
              <div className="text-center mb-4">
                <div className="text-5xl font-light tracking-tight">
                  {phoneScreenState.timeDisplay}
                </div>
                <div className="text-sm opacity-70 mt-1">
                  {phoneScreenState.dateDisplay}
                </div>
              </div>

              {/* Contextual Message */}
              <AnimatePresence mode="wait">
                {phoneScreenState.contextualMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mb-4 text-center"
                  >
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                        phoneScreenState.theme === 'light'
                          ? 'bg-white/80 text-gray-700'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      {orchestratorState?.currentMode === 'silent' ? (
                        <BellOff className="w-3 h-3" />
                      ) : (
                        <Focus className="w-3 h-3" />
                      )}
                      {phoneScreenState.contextualMessage}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Primary Widget */}
              <div className="mb-4">
                <PrimaryWidget
                  widget={phoneScreenState.primaryWidget}
                  theme={phoneScreenState.theme}
                  moment={currentMoment}
                />
              </div>

              {/* Notifications */}
              <div className="flex-1 space-y-2 overflow-hidden">
                <AnimatePresence>
                  {phoneScreenState.notifications.slice(0, 3).map((notif, i) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <NotificationCard
                        notification={notif}
                        theme={phoneScreenState.theme}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Quick Actions */}
              <div className="mt-auto">
                <div className="flex justify-center gap-4">
                  {phoneScreenState.quickActions.slice(0, 4).map((action) => (
                    <QuickActionButton
                      key={action}
                      action={action}
                      theme={phoneScreenState.theme}
                    />
                  ))}
                </div>
              </div>

              {/* Home Indicator */}
              <div className="flex justify-center mt-4">
                <div
                  className={`w-32 h-1 rounded-full ${
                    phoneScreenState.theme === 'light' ? 'bg-gray-300' : 'bg-white/30'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mode Badge */}
        {orchestratorState && (
          <div
            className={`absolute -right-2 top-20 px-3 py-1.5 rounded-l-lg text-xs font-medium ${
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

      {/* Mode Reasoning */}
      {orchestratorState?.modeReasoning && (
        <div className="mt-4 text-center max-w-xs">
          <p className="text-sm text-gray-400">{orchestratorState.modeReasoning}</p>
        </div>
      )}
    </div>
  );
}

function StatusBar({ phoneState }: { phoneState: PhoneScreenState }) {
  const textColor = phoneState.theme === 'light' ? 'text-gray-700' : 'text-white';

  return (
    <div className={`absolute top-0 left-0 right-0 px-6 pt-2 flex justify-between items-center ${textColor} text-xs z-5`}>
      <div className="w-20" />
      <div className="flex items-center gap-1">
        {phoneState.doNotDisturb && <BellOff className="w-3 h-3" />}
        <Wifi className="w-3 h-3" style={{ opacity: phoneState.signalStrength }} />
        <div className="flex items-center gap-0.5">
          <Battery className="w-4 h-4" />
          <span className="text-[10px]">{phoneState.batteryLevel}%</span>
        </div>
      </div>
    </div>
  );
}

function PrimaryWidget({
  widget,
  theme,
  moment,
}: {
  widget: PhoneScreenState['primaryWidget'];
  theme: PhoneScreenState['theme'];
  moment: any;
}) {
  const cardBg = theme === 'light' ? 'bg-white/80' : 'bg-white/10';
  const cardText = theme === 'light' ? 'text-gray-800' : 'text-white';

  if (widget === 'none' || !moment) return null;

  const weatherIcons = {
    clear: Sun,
    cloudy: Cloud,
    rain: CloudRain,
    snow: CloudSnow,
    storm: CloudLightning,
  } as const;
  const WeatherIcon = weatherIcons[moment.passiveInputs.weather as keyof typeof weatherIcons] || Sun;

  const widgets: Record<string, React.ReactNode> = {
    weather: (
      <div className={`${cardBg} rounded-2xl p-4 flex items-center justify-between`}>
        <div>
          <div className={`text-sm opacity-70 ${cardText}`}>Today's Weather</div>
          <div className={`text-2xl font-medium capitalize ${cardText}`}>
            {moment.passiveInputs.weather}
          </div>
          <div className={`text-xs opacity-60 ${cardText}`}>
            {moment.passiveInputs.trafficLevel} traffic
          </div>
        </div>
        <WeatherIcon className={`w-12 h-12 opacity-80 ${cardText}`} />
      </div>
    ),
    calendar: (
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <Calendar className={`w-4 h-4 ${cardText}`} />
          <span className={`text-sm opacity-70 ${cardText}`}>Schedule</span>
        </div>
        {moment.passiveInputs.calendarEvents.slice(0, 2).map((event: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-1">
            <span className={`text-sm ${cardText}`}>{event.title}</span>
            <span className={`text-xs opacity-60 ${cardText}`}>
              {event.startHour}:00
            </span>
          </div>
        ))}
        {moment.passiveInputs.calendarEvents.length === 0 && (
          <div className={`text-sm opacity-60 ${cardText}`}>No upcoming events</div>
        )}
      </div>
    ),
    music: (
      <div className={`${cardBg} rounded-2xl p-4 flex items-center gap-3`}>
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <Music className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className={`text-sm font-medium ${cardText}`}>Now Playing</div>
          <div className={`text-xs opacity-60 ${cardText}`}>Commute Playlist</div>
        </div>
        <ChevronRight className={`w-5 h-5 opacity-50 ${cardText}`} />
      </div>
    ),
    messages: (
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className={`w-4 h-4 ${cardText}`} />
          <span className={`text-sm opacity-70 ${cardText}`}>
            {moment.passiveInputs.unreadCount} unread messages
          </span>
        </div>
        {moment.passiveInputs.recentMessages.slice(0, 2).map((msg: any, i: number) => (
          <div key={i} className="py-1">
            <div className={`text-sm font-medium ${cardText}`}>{msg.from}</div>
            <div className={`text-xs opacity-60 truncate ${cardText}`}>
              {msg.preview || `${msg.type} message`}
            </div>
          </div>
        ))}
      </div>
    ),
    focus: (
      <div className={`${cardBg} rounded-2xl p-4 text-center`}>
        <Focus className={`w-8 h-8 mx-auto mb-2 opacity-80 ${cardText}`} />
        <div className={`text-sm font-medium ${cardText}`}>Focus Mode Active</div>
        <div className={`text-xs opacity-60 ${cardText}`}>
          Notifications paused for deep work
        </div>
      </div>
    ),
  };

  return widgets[widget] || null;
}

function NotificationCard({
  notification,
  theme,
}: {
  notification: SurfacedContent;
  theme: PhoneScreenState['theme'];
}) {
  const cardBg = theme === 'light' ? 'bg-white/90' : 'bg-white/10';
  const cardText = theme === 'light' ? 'text-gray-800' : 'text-white';

  const icons: Record<string, React.ElementType> = {
    notification: MessageSquare,
    suggestion: Focus,
    widget: Calendar,
    action: ChevronRight,
    info: Clock,
  };

  const Icon = icons[notification.type] || MessageSquare;

  return (
    <div className={`${cardBg} backdrop-blur-sm rounded-xl p-3 flex items-start gap-3`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          notification.priority > 0.8
            ? 'bg-red-500/20 text-red-400'
            : notification.priority > 0.5
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-gray-500/20 text-gray-400'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${cardText}`}>
          {notification.title}
        </div>
        {notification.body && (
          <div className={`text-xs opacity-60 truncate ${cardText}`}>
            {notification.body}
          </div>
        )}
      </div>
      <div className="text-[10px] opacity-40 text-gray-400">
        {Math.round(notification.confidence * 100)}%
      </div>
    </div>
  );
}

function QuickActionButton({
  action,
  theme,
}: {
  action: string;
  theme: PhoneScreenState['theme'];
}) {
  const iconMap: Record<string, React.ElementType> = {
    Messages: MessageSquare,
    Calendar: Calendar,
    Music: Music,
    Navigate: MapPin,
    Email: MessageSquare,
    Notes: Clock,
    Call: MessageSquare,
    Camera: Focus,
    Browser: Focus,
    Health: Heart,
  };

  const Icon = iconMap[action] || Focus;
  const bgColor = theme === 'light' ? 'bg-white/80' : 'bg-white/10';
  const textColor = theme === 'light' ? 'text-gray-700' : 'text-white';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${textColor}`} />
      </div>
      <span className={`text-[10px] ${textColor} opacity-70`}>{action}</span>
    </div>
  );
}
