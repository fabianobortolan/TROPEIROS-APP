import React from 'react';
import { Ear, BookOpen, Zap, ChevronRight, Piano, ArrowUpDown, Music, LibraryBig, GitCompare, Waves, KeyRound, Guitar } from 'lucide-react';

const modes = [
  {
    id: 'aprender',
    icon: BookOpen,
    title: 'Aprender',
    description: 'Conheça as progressões mais comuns. Ouça, veja os acordes e fixe o padrão.',
    color: 'from-blue-900/60 to-blue-800/40',
    border: 'border-blue-700/50',
    badge: 'Iniciante',
    badgeColor: 'bg-blue-700 text-blue-100',
  },
  {
    id: 'praticar',
    icon: Ear,
    title: 'Praticar',
    description: 'Ouça progressões de músicas da sua biblioteca e identifique qual é.',
    color: 'from-amber-900/60 to-amber-800/40',
    border: 'border-amber-700/50',
    badge: 'Intermediário',
    badgeColor: 'bg-amber-700 text-amber-100',
  },
  {
    id: 'desafio',
    icon: Zap,
    title: 'Desafio',
    description: 'Sem dicas! Apenas ouça e responda. Teste o que você aprendeu.',
    color: 'from-red-900/60 to-red-800/40',
    border: 'border-red-700/50',
    badge: 'Avançado',
    badgeColor: 'bg-red-700 text-red-100',
  },
  {
    id: 'intervalos',
    icon: ArrowUpDown,
    title: 'Intervalos Musicais',
    description: 'Aprenda e identifique os 13 intervalos. Cada um com referência em músicas conhecidas.',
    color: 'from-violet-900/60 to-violet-800/40',
    border: 'border-violet-700/50',
    badge: 'Essencial',
    badgeColor: 'bg-violet-700 text-violet-100',
  },
  {
    id: 'cadencia',
    icon: Piano,
    title: 'Treinar Cadência',
    description: 'Monte sua própria sequência de acordes (ex: ii-V-I) e ouça em loop.',
    color: 'from-emerald-900/60 to-emerald-800/40',
    border: 'border-emerald-700/50',
    badge: 'Livre',
    badgeColor: 'bg-emerald-700 text-emerald-100',
  },
  {
    id: 'musica',
    icon: LibraryBig,
    title: 'Treinar por Música',
    description: 'Escolha uma música da sua biblioteca e treine identificando as progressões dela especificamente.',
    color: 'from-lime-900/60 to-lime-800/40',
    border: 'border-lime-700/50',
    badge: 'Focado',
    badgeColor: 'bg-lime-700 text-lime-100',
  },
  {
    id: 'acordes',
    icon: Music,
    title: 'Identificar Acordes',
    description: 'Ouça um acorde e identifique o tipo: Maior, Menor, Diminuto, Aumentado, Sétimas e mais. Com opção de inversões.',
    color: 'from-pink-900/60 to-pink-800/40',
    border: 'border-pink-700/50',
    badge: 'Intermediário',
    badgeColor: 'bg-pink-700 text-pink-100',
  },
  {
    id: 'comparar_acordes',
    icon: GitCompare,
    title: 'Comparar Acordes',
    description: 'Ouça o mesmo acorde em tipos e posições diferentes. Treine seu ouvido percebendo as diferenças entre Maior, Menor, Diminuto e mais.',
    color: 'from-sky-900/60 to-sky-800/40',
    border: 'border-sky-700/50',
    badge: 'Comparativo',
    badgeColor: 'bg-sky-700 text-sky-100',
  },
  {
    id: 'escalas',
    icon: Waves,
    title: 'Escalas Musicais',
    description: 'Aprenda e identifique 9 escalas pelo ouvido: Maior, Menor, Pentatônicas, Blues, Modos e mais.',
    color: 'from-fuchsia-900/60 to-fuchsia-800/40',
    border: 'border-fuchsia-700/50',
    badge: 'Novo',
    badgeColor: 'bg-fuchsia-600 text-fuchsia-100',
  },
  {
    id: 'tom',
    icon: KeyRound,
    title: 'Identificar Tom',
    description: 'Ouça a progressão I–IV–V–I e identifique qual tonalidade (maior ou menor) está sendo tocada.',
    color: 'from-teal-900/60 to-teal-800/40',
    border: 'border-teal-700/50',
    badge: 'Novo',
    badgeColor: 'bg-teal-600 text-teal-100',
  },
  {
    id: 'improvisacao',
    icon: Guitar,
    title: 'Improvisação + Backing Track',
    description: 'Toque junto a uma base rítmica MP3. O sistema sugere as escalas compatíveis com o tom escolhido.',
    color: 'from-orange-900/60 to-orange-800/40',
    border: 'border-orange-700/50',
    badge: 'Novo',
    badgeColor: 'bg-orange-600 text-orange-100',
  },
];

export default function LearningModeSelector({ onSelect }) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1 mb-6">
        <div className="flex items-center justify-center gap-2">
          <Ear className="w-7 h-7 text-[#D4AF37]" />
          <h1 className="text-2xl font-extrabold text-[#D4AF37]">Treinamento Auditivo</h1>
        </div>
        <p className="text-stone-400 text-sm">Se liberte da cifra — treine seu ouvido harmônico</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={`w-full text-left bg-gradient-to-br ${mode.color} border ${mode.border} rounded-2xl p-4 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg flex flex-col gap-3`}
            >
              <div className="flex items-center justify-between">
                <div className="bg-white/10 rounded-xl p-2.5">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mode.badgeColor}`}>{mode.badge}</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-1">{mode.title}</p>
                <p className="text-stone-300 text-xs leading-snug line-clamp-2">{mode.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}