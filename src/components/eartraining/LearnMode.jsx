import React, { useState } from 'react';
import { Play, Square, ChevronLeft, ChevronRight, Eye, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChordAudio } from './useChordAudio';

function loadCustomNames() {
  try { return JSON.parse(localStorage.getItem('learn_custom_names') || '{}'); } catch { return {}; }
}
function saveCustomNames(data) {
  localStorage.setItem('learn_custom_names', JSON.stringify(data));
}

// Progressões mais comuns para aprender
const LEARN_PROGRESSIONS = [
  {
    name: 'Progressão Terra (I-IV-V-I)',
    pattern: 'I-IV-V-I',
    description: 'A progressão mais usada no sertanejo. Base de quase toda música caipira.',
    example: 'Usada em centenas de músicas como "Chico Mineiro" e clássicos do sertanejo raiz.',
    chords: ['C', 'F', 'G', 'C'],
    key: 'C',
    tip: 'Sinta a tensão no V (Sol) que resolve no I (Dó). Essa tensão-resolução é o coração do sertanejo.',
    color: 'from-green-900/60 to-green-800/40',
    border: 'border-green-700/50',
  },
  {
    name: 'Progressão do Amor (I-V-IV-I)',
    pattern: 'I-V-IV-I',
    description: 'Variação clássica, muito usada em versos e refrões românticos.',
    example: 'Muito comum no sertanejo universitário e romântico dos anos 90.',
    chords: ['C', 'G', 'F', 'C'],
    key: 'C',
    tip: 'Compare com I-IV-V-I: a ordem do IV e V está invertida, dando um sabor diferente.',
    color: 'from-pink-900/60 to-pink-800/40',
    border: 'border-pink-700/50',
  },
  {
    name: 'Progressão Circular (I-VI-IV-V)',
    pattern: 'I-VI-IV-V',
    description: 'A "progressão pop". Usada em baladas e músicas sentimentais.',
    example: 'Presente em imensos hits de todos os gêneros, inclusive sertanejo moderno.',
    chords: ['C', 'Am', 'F', 'G'],
    key: 'C',
    tip: 'O VIm (Lá menor) dá aquele toque melancólico antes do IV e V.',
    color: 'from-purple-900/60 to-purple-800/40',
    border: 'border-purple-700/50',
  },
  {
    name: 'Progressão Saudade (I-VIm-IIm-V)',
    pattern: 'I-VI-II-V',
    description: 'Progressão jazzística com muito sentimento. Usada em boleros e baiões.',
    example: 'Muito presente em músicas com influência de bolero e música brasileira mais sofisticada.',
    chords: ['C', 'Am', 'Dm', 'G'],
    key: 'C',
    tip: 'Quatro acordes que "giram" de volta ao início. Ouça o movimento descendente nas notas.',
    color: 'from-orange-900/60 to-orange-800/40',
    border: 'border-orange-700/50',
  },
  {
    name: 'Dois Acordes (I-V)',
    pattern: 'I-V',
    description: 'A progressão mais simples. Tensão e resolução na forma mais pura.',
    example: 'Base de muitas intros de modas de viola e toadas simples.',
    chords: ['C', 'G'],
    key: 'C',
    tip: 'Concentre-se no contraste entre o repouso (I) e a tensão (V).',
    color: 'from-teal-900/60 to-teal-800/40',
    border: 'border-teal-700/50',
  },
];

export default function LearnMode({ onBack }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [customNames, setCustomNames] = useState(loadCustomNames);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const { playProgression, stop } = useChordAudio();

  const prog = LEARN_PROGRESSIONS[currentIdx];
  const progId = `prog_${currentIdx}`;
  const displayName = customNames[progId] ?? prog.name;

  const startEdit = () => { setEditName(displayName); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const saveEdit = () => {
    if (!editName.trim()) return;
    setCustomNames(prev => {
      const updated = { ...prev, [progId]: editName.trim() };
      saveCustomNames(updated);
      return updated;
    });
    setEditing(false);
  };
  const resetName = () => {
    setCustomNames(prev => {
      const updated = { ...prev };
      delete updated[progId];
      saveCustomNames(updated);
      return updated;
    });
    setEditing(false);
  };

  const handlePlay = async () => {
    if (isPlaying) {
      stop();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    await playProgression(prog.chords, 70);
    setTimeout(() => setIsPlaying(false), prog.chords.length * 2200 + 500);
  };

  const handleNext = () => {
    stop(); setIsPlaying(false); setShowDetails(false); setEditing(false);
    setCurrentIdx(i => (i + 1) % LEARN_PROGRESSIONS.length);
  };

  const handlePrev = () => {
    stop(); setIsPlaying(false); setShowDetails(false); setEditing(false);
    setCurrentIdx(i => (i - 1 + LEARN_PROGRESSIONS.length) % LEARN_PROGRESSIONS.length);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-[#D4AF37] font-bold text-lg">Modo Aprender</h2>
          <p className="text-stone-400 text-xs">{currentIdx + 1} de {LEARN_PROGRESSIONS.length} progressões</p>
        </div>
      </div>

      {/* Progresso */}
      <div className="flex gap-1.5">
        {LEARN_PROGRESSIONS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i === currentIdx ? 'bg-[#D4AF37]' : i < currentIdx ? 'bg-[#8B6F47]' : 'bg-white/10'}`} />
        ))}
      </div>

      {/* Card principal */}
      <div className={`bg-gradient-to-br ${prog.color} border ${prog.border} rounded-2xl p-6 space-y-4`}>
        <div>
          <p className="text-stone-300 text-xs uppercase tracking-widest mb-1">Progressão</p>
          {editing ? (
            <div className="space-y-2 mt-1">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
                className="w-full bg-white/10 text-white font-bold text-lg rounded-lg px-3 py-2 border border-white/20 focus:border-[#D4AF37]/60 focus:outline-none"
              />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-700/50 hover:bg-emerald-700/80 text-emerald-300 text-xs font-semibold transition-all">
                  <Check className="w-3 h-3" /> Salvar
                </button>
                {customNames[progId] && (
                  <button onClick={resetName} className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-stone-700/50 hover:bg-stone-700/80 text-stone-400 text-xs transition-all">
                    Restaurar padrão
                  </button>
                )}
                <button onClick={cancelEdit} className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/70 text-red-400 text-xs transition-all">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h3 className="text-white font-bold text-xl leading-tight">{displayName}</h3>
              <button onClick={startEdit} className="opacity-0 group-hover:opacity-100 p-1 rounded text-stone-500 hover:text-[#D4AF37] transition-all">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-stone-300 text-sm mt-2 leading-relaxed">{prog.description}</p>
        </div>

        {/* Acordes visuais */}
        <div className="bg-black/30 rounded-xl p-4">
          <p className="text-stone-400 text-xs mb-3 uppercase tracking-wider">Acordes em {prog.key} maior:</p>
          <div className="flex gap-2 flex-wrap">
            {prog.chords.map((chord, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-bold px-4 py-2 rounded-xl text-base">
                  {chord}
                </span>
                <span className="text-stone-500 text-xs mt-1">{prog.pattern.split('-')[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Botão ouvir */}
        <Button
          onClick={handlePlay}
          className={`w-full py-5 font-bold text-base rounded-xl gap-2 ${
            isPlaying ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-[#D4AF37] hover:bg-[#B8962E] text-[#1A0E05]'
          }`}
        >
          {isPlaying ? <><Square className="w-5 h-5" />Parar</> : <><Play className="w-5 h-5" />Ouvir Progressão</>}
        </Button>
      </div>

      {/* Dica / Detalhes */}
      <button
        onClick={() => setShowDetails(d => !d)}
        className="w-full flex items-center justify-between bg-[#2A1A0E] border border-[#8B6F47]/30 rounded-xl px-4 py-3 text-stone-300 hover:border-[#8B6F47]/60 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="w-4 h-4 text-[#D4AF37]" />
          {showDetails ? 'Esconder' : 'Ver'} dica e exemplo
        </div>
        <ChevronRight className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
      </button>

      {showDetails && (
        <div className="bg-[#2A1A0E] border border-[#8B6F47]/30 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-1">💡 Dica de Escuta</p>
            <p className="text-stone-300 text-sm leading-relaxed">{prog.tip}</p>
          </div>
          <div className="border-t border-[#8B6F47]/20 pt-3">
            <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-1">🎵 Onde Escutar</p>
            <p className="text-stone-300 text-sm leading-relaxed">{prog.example}</p>
          </div>
        </div>
      )}

      {/* Navegação */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={handlePrev}
          variant="outline"
          className="border-[#8B6F47]/40 text-stone-300 hover:bg-[#8B6F47]/20 gap-2"
        >
          <ChevronLeft className="w-4 h-4" />Anterior
        </Button>
        <Button
          onClick={handleNext}
          className="bg-[#8B6F47] hover:bg-[#6B5437] text-white gap-2"
        >
          Próxima<ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}