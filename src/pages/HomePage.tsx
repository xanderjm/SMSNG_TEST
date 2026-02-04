import { Link } from 'react-router-dom';
import { Smartphone, Sparkles, ArrowRight, Beaker } from 'lucide-react';

interface ExperimentCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  path: string;
  gradient: string;
  status: 'live' | 'wip' | 'planned';
  tags: string[];
}

const experiments: ExperimentCard[] = [
  {
    id: 'agentic-device-simulator',
    title: 'Agentic Device Simulator',
    subtitle: 'Context-Aware Phone UI',
    description: 'Explore how a smartphone\'s contextual AI adapts to human behavior patterns across 12 contextual spaces with 100 unique personas.',
    icon: Smartphone,
    path: '/experiments/agentic-device-simulator',
    gradient: 'from-indigo-500 to-purple-600',
    status: 'live',
    tags: ['React', 'Zustand', 'Context AI', 'Samsung One UI'],
  },
  {
    id: 'digital-material-lab',
    title: 'Digital Material Lab',
    subtitle: 'WebGL Material Exploration',
    description: 'A material behavior lab exploring digital surfaces with viscosity, elasticity, and gravitational attention. Physics-inspired but not physics-bound.',
    icon: Sparkles,
    path: '/experiments/digital-material-lab',
    gradient: 'from-violet-500 to-fuchsia-600',
    status: 'live',
    tags: ['WebGL', 'GLSL Shaders', 'SDF', 'Animation'],
  },
];

const statusColors = {
  live: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  wip: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  planned: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusLabels = {
  live: 'Live',
  wip: 'In Progress',
  planned: 'Planned',
};

export function HomePage() {
  return (
    <div className="min-h-screen bg-[#0d0d14] text-white">
      {/* Header */}
      <header className="border-b border-[#2a2a3e]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Beaker className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold">Experiment Lab</h1>
          </div>
          <p className="text-gray-400 text-lg">
            A collection of prototypes exploring interaction design, adaptive interfaces, and digital materials.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Experiments Grid */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">
            Experiments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {experiments.map((experiment) => (
              <Link
                key={experiment.id}
                to={experiment.path}
                className="group relative block"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl"
                     style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }} />
                <div className={`relative bg-[#16161e] border border-[#2a2a3e] rounded-2xl p-6 transition-all duration-300 group-hover:border-[#3a3a4e] group-hover:translate-y-[-2px] group-hover:shadow-xl group-hover:shadow-black/20`}>
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[experiment.status]}`}>
                      {statusLabels[experiment.status]}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Icon and Title */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${experiment.gradient} flex items-center justify-center flex-shrink-0`}>
                      <experiment.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-white transition-colors">
                        {experiment.title}
                      </h3>
                      <p className="text-sm text-gray-500">{experiment.subtitle}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">
                    {experiment.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {experiment.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-[#1e1e2e] rounded-md text-xs text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="mt-16 pt-12 border-t border-[#2a2a3e]">
          <div className="max-w-2xl">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Philosophy
            </h2>
            <p className="text-gray-400 leading-relaxed">
              These experiments exist at the intersection of technology and human experience.
              Each prototype explores a question: How should interfaces adapt? What makes digital
              materials feel alive? How do we design for context rather than just content?
            </p>
            <p className="text-gray-500 mt-4 text-sm">
              The goal isn't simulation. It's expression.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a3e] mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-gray-600 text-sm">
            FIELD.IO Research Lab
          </p>
        </div>
      </footer>
    </div>
  );
}
