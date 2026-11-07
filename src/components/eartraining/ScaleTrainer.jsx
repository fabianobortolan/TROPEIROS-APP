import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Volume2, CheckCircle2, XCircle, RotateCcw, ChevronRight } from 'lucide-react';
import * as Tone from 'tone';

// Definição das escalas com notas (a partir de C)
const SCALES = [
  {
    id: 'maior',
    name: 'Escala Maior',
    intervals: [0, 2, 4, 5, 7, 9, 11, 12],
    formula: 'T - T - ST - T - T - T - ST',
    description: 'Som alegre e brilhante. Base do sertanejo universitário.',
    color: 'from-yellow-900/60 to-yellow-800/40',
    border: 'border-yellow-600/50',
    badgeColor: 'bg-yellow-700 text-yellow-100',
    emoji: '☀️',
    example: 'Base de "Ai Se Eu Te Pego"',
  },
  {
    id: 'menor_natural',
    name: 'Escala Menor Natural',
    intervals: [0, 2, 3, 5, 7, 8, 10, 12],
    formula: 'T - ST - T - T - ST - T - T',
    description: 'Som melancólico e profundo. Muito usada no sertanejo raiz.',
    color: 'from-blue-900/60 to-blue-800/40',
    border: 'border-blue-600/50',
    badgeColor: 'bg-blue-700 text-blue-100',
    emoji: '🌙',
    example: 'Sonoridade de modas de viola antigas',
  },
  {
    id: 'menor_harmonica',
    name: 'Escala Menor Harmônica',
    intervals: [0, 2, 3, 5, 7, 8, 11, 12],
    formula: 'T - ST - T - T - ST - T½ - ST',
    description: 'Tom dramático e oriental. O 7º grau elevado cria tensão.',
    color: 'from-purple-900/60 to-purple-800/40',
    border: 'border-purple-600/50',
    badgeColor: 'bg-purple-700 text-purple-100',
    emoji: '🎭',
    example: 'Usada em solos de viola expressivos',
  },
  {
    id: 'menor_melodica',
    name: 'Escala Menor Melódica',
    intervals: [0, 2, 3, 5, 7, 9, 11, 12],
    formula: 'T - ST - T - T - T - T - ST',
    description: 'Sobe com 6ª e 7ª elevadas, desce como a menor natural.',
    color: 'from-teal-900/60 to-teal-800/40',
    border: 'border-teal-600/50',
    badgeColor: 'bg-teal-700 text-teal-100',
    emoji: '🌊',
    example: 'Linha melódica sofisticada e jazzística',
  },
  {
    id: 'pentatonica_maior',
    name: 'Pentatônica Maior',
    intervals: [0, 2, 4, 7, 9, 12],
    formula: 'T - T - T½ - T - T½',
    description: '5 notas. Som country e sertanejo raiz. Muito usada em solos.',
    color: 'from-orange-900/60 to-orange-800/40',
    border: 'border-orange-600/50',
    badgeColor: 'bg-orange-700 text-orange-100',
    emoji: '🌾',
    example: 'Solos de viola sertaneja clássica',
  },
  {
    id: 'pentatonica_menor',
    name: 'Pentatônica Menor',
    intervals: [0, 3, 5, 7, 10, 12],
    formula: 'T½ - T - T - T½ - T',
    description: '5 notas. Blues e rock. Muito expressiva em solos.',
    color: 'from-red-900/60 to-red-800/40',
    border: 'border-red-600/50',
    badgeColor: 'bg-red-700 text-red-100',
    emoji: '🎸',
    example: 'Base do blues e rock brasileiro',
  },
  {
    id: 'blues',
    name: 'Escala Blues',
    intervals: [0, 3, 5, 6, 7, 10, 12],
    formula: 'Pentatônica menor + nota "blue" (b5)',
    description: 'Pentatônica menor com a "blue note" (b5). Tensão e expressividade.',
    color: 'from-indigo-900/60 to-indigo-800/40',
    border: 'border-indigo-600/50',
    badgeColor: 'bg-indigo-700 text-indigo-100',
    emoji: '🎷',
    example: 'Pop/rock com feeling de blues',
  },
  {
    id: 'dorica',
    name: 'Escala Dórica',
    intervals: [0, 2, 3, 5, 7, 9, 10, 12],
    formula: 'Menor natural com 6ª maior',
    description: 'Modo menor com 6ª elevada. Som latino e funky.',
    color: 'from-cyan-900/60 to-cyan-800/40',
    border: 'border-cyan-600/50',
    badgeColor: 'bg-cyan-700 text-cyan-100',
    emoji: '🌴',
    example: 'Sonoridade latina e sertanejo moderno',
  },
  {
    id: 'mixolidia',
    name: 'Escala Mixolídia',
    intervals: [0, 2, 4, 5, 7, 9, 10, 12],
    formula: 'Maior com 7ª menor',
    description: 'Modo maior com 7ª abaixada. Som country e rock.',
    color: 'from-lime-900/60 to-lime-800/40',
    border: 'border-lime-600/50',
    badgeColor: 'bg-lime-700 text-lime-100',
    emoji: '🤠',
    example: 'Muito usada em solos de country e sertanejo moderno',
  },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVE = 4;

function getNoteName(semitone) {
  return NOTE_NAMES[semitone % 12] + OCTAVE;
}

function buildScaleNotes(rootSemitone, intervals) {
  return intervals.map(i => getNoteName((rootSemitone + i) % 12));
}

export default function ScaleTrainer({ onBack }) {
  const [subMode, setSubMode] = useState(null); // null | 'aprender' | 'identificar'
  const [currentScale, setCurrentScale] = useState(null);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rootNote, setRootNote] = useState(0); // C
  const [ascending, setAscending] = useState(true);
  const [learnIndex, setLearnIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const synthRef = useRef(null);

  const stopSynth = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.releaseAll?.();
      synthRef.current.dispose?.();
      synthRef.current = null;
    }
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    setIsPlaying(false);
  }, []);

  const playScale = useCallback(async (scale, root = rootNote, asc = ascending) => {
    stopSynth();
    await Tone.start();
    setIsPlaying(true);

    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.5 },
    }).toDestination();
    synthRef.current = synth;

    const notes = buildScaleNotes(root, scale.intervals);
    const sequence = asc ? notes : [...notes].reverse();

    let time = Tone.now() + 0.1;
    sequence.forEach((note, i) => {
      synth.triggerAttackRelease(note, '8n', time + i * 0.35);
    });

    const totalDuration = (sequence.length * 0.35 + 0.6) * 1000;
    setTimeout(() => setIsPlaying(false), totalDuration);
  }, [rootNote, ascending, stopSynth]);

  const generateQuestion = useCallback(() => {
    const shuffled = [...SCALES].sort(() => Math.random() - 0.5);
    const correct = shuffled[0];
    const wrong = shuffled.slice(1, 3);
    const allOpts = [correct, ...wrong].sort(() => Math.random() - 0.5);
    const root = Math.floor(Math.random() * 12);

    setCurrentScale(correct);
    setOptions(allOpts);
    setSelected(null);
    setRootNote(root);
    setAscending(Math.random() > 0.3);

    setTimeout(() => playScale(correct, root, Math.random() > 0.3), 300);
  }, [playScale]);

  const handleAnswer = (scale) => {
    if (selected) return;
    setSelected(scale.id);
    setScore(s => ({
      correct: s.correct + (scale.id === currentScale.id ? 1 : 0),
      total: s.total + 1,
    }));
  };

  // MODO APRENDER
  if (subMode === 'aprender') {
    const scale = SCALES[learnIndex];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setSubMode(null)} className="text-stone-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <span className="text-stone-400 text-sm">{learnIndex + 1} / {SCALES.length}</span>
        </div>

        <div className={`bg-gradient-to-br ${scale.color} border ${scale.border} rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl">{scale.emoji}</span>
              <h2 className="text-xl font-bold text-white mt-1">{scale.name}</h2>
              <Badge className={`${scale.badgeColor} mt-1 text-xs`}>Fórmula: {scale.formula}</Badge>
            </div>
            <Button
              onClick={() => playScale(scale, 0, true)}
              disabled={isPlaying}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-xl"
            >
              {isPlaying ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5" />}
            </Button>
          </div>

          <p className="text-stone-200 text-sm leading-relaxed">{scale.description}</p>
          <p className="text-stone-400 text-xs italic">🎵 {scale.example}</p>

          {/* Visualização das notas */}
          <div>
            <p className="text-xs text-stone-400 mb-2">Notas (em C):</p>
            <div className="flex flex-wrap gap-2">
              {buildScaleNotes(0, scale.intervals).map((note, i) => (
                <span key={i} className="bg-white/20 text-white text-sm font-mono px-3 py-1 rounded-lg">
                  {note.replace('4', '')}
                </span>
              ))}
            </div>
          </div>

          {/* Controles de direção */}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => playScale(scale, 0, true)} disabled={isPlaying} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs">
              ↑ Ascendente
            </Button>
            <Button size="sm" onClick={() => playScale(scale, 0, false)} disabled={isPlaying} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs">
              ↓ Descendente
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setLearnIndex(i => Math.max(0, i - 1))}
            disabled={learnIndex === 0}
            variant="outline"
            className="flex-1 border-stone-700 text-stone-300"
          >
            ← Anterior
          </Button>
          <Button
            onClick={() => setLearnIndex(i => Math.min(SCALES.length - 1, i + 1))}
            disabled={learnIndex === SCALES.length - 1}
            className="flex-1 bg-[#8B6F47] hover:bg-[#6B5437] text-white"
          >
            Próxima →
          </Button>
        </div>

        {/* Grid todas as escalas */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {SCALES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setLearnIndex(i)}
              className={`text-xs py-2 px-2 rounded-xl border transition-all ${
                i === learnIndex
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold'
                  : 'bg-white/5 text-stone-400 border-stone-700 hover:bg-white/10'
              }`}
            >
              {s.emoji} {s.name.split(' ').slice(-1)[0]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // MODO IDENTIFICAR
  if (subMode === 'identificar') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" onClick={() => { setSubMode(null); setScore({ correct: 0, total: 0 }); stopSynth(); }} className="text-stone-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          {score.total > 0 && (
            <span className="text-sm text-stone-400">
              ✅ {score.correct}/{score.total} ({Math.round(score.correct / score.total * 100)}%)
            </span>
          )}
        </div>

        {!currentScale ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-stone-400">Pronto para identificar escalas pelo ouvido?</p>
            <Button onClick={generateQuestion} className="bg-[#D4AF37] hover:bg-[#b8962e] text-black font-bold px-8 py-3 text-lg rounded-xl">
              Começar!
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Player */}
            <div className="bg-white/5 border border-stone-700 rounded-2xl p-5 text-center space-y-3">
              <p className="text-stone-400 text-sm">Ouça a escala e identifique qual é:</p>
              <p className="text-xs text-stone-500">Tom: {NOTE_NAMES[rootNote]} | {ascending ? '↑ Ascendente' : '↓ Descendente'}</p>
              <Button
                onClick={() => playScale(currentScale, rootNote, ascending)}
                disabled={isPlaying}
                className="bg-[#D4AF37] hover:bg-[#b8962e] text-black font-bold px-8 py-3 rounded-xl"
              >
                {isPlaying ? <Volume2 className="w-5 h-5 animate-pulse mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                {isPlaying ? 'Tocando...' : 'Ouvir Escala'}
              </Button>
            </div>

            {/* Opções */}
            <div className="grid grid-cols-1 gap-3">
              {options.map(opt => {
                const isCorrect = opt.id === currentScale.id;
                const isSelected = selected === opt.id;
                let cls = `w-full text-left p-4 rounded-xl border transition-all font-medium `;
                if (!selected) {
                  cls += `bg-white/5 border-stone-700 hover:bg-white/10 hover:border-stone-500 text-stone-200`;
                } else if (isCorrect) {
                  cls += `bg-green-900/50 border-green-500 text-green-200`;
                } else if (isSelected) {
                  cls += `bg-red-900/50 border-red-500 text-red-200`;
                } else {
                  cls += `bg-white/5 border-stone-700 text-stone-500 opacity-50`;
                }
                return (
                  <button key={opt.id} onClick={() => handleAnswer(opt)} disabled={!!selected} className={cls}>
                    <div className="flex items-center justify-between">
                      <span>{opt.emoji} {opt.name}</span>
                      {selected && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                      {selected && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                    </div>
                    {selected && isCorrect && (
                      <p className="text-xs text-green-300 mt-1">{opt.formula}</p>
                    )}
                  </button>
                );
              })}
            </div>

            {selected && (
              <Button onClick={generateQuestion} className="w-full bg-[#8B6F47] hover:bg-[#6B5437] text-white font-bold py-3 rounded-xl">
                <ChevronRight className="w-5 h-5 mr-2" /> Próxima Escala
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // MENU DO SCALE TRAINER
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-stone-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>

      <div className="text-center space-y-1 mb-6">
        <div className="text-4xl">🎼</div>
        <h2 className="text-xl font-bold text-[#D4AF37]">Escalas Musicais</h2>
        <p className="text-stone-400 text-sm">Aprenda e treine o reconhecimento auditivo das escalas</p>
        <Badge className="bg-stone-700 text-stone-300 text-xs">{SCALES.length} escalas disponíveis</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => { setLearnIndex(0); setSubMode('aprender'); }}
          className="w-full text-left bg-gradient-to-br from-blue-900/60 to-blue-800/40 border border-blue-700/50 rounded-2xl p-5 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-xl p-3 text-2xl">📖</div>
            <div>
              <p className="text-white font-bold">Aprender Escalas</p>
              <p className="text-stone-300 text-xs mt-1">Veja todas as escalas, ouça e entenda as fórmulas</p>
              <Badge className="bg-blue-700 text-blue-100 text-xs mt-2">Iniciante</Badge>
            </div>
          </div>
        </button>

        <button
          onClick={() => { setCurrentScale(null); setScore({ correct: 0, total: 0 }); setSubMode('identificar'); }}
          className="w-full text-left bg-gradient-to-br from-amber-900/60 to-amber-800/40 border border-amber-700/50 rounded-2xl p-5 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-xl p-3 text-2xl">👂</div>
            <div>
              <p className="text-white font-bold">Identificar pelo Ouvido</p>
              <p className="text-stone-300 text-xs mt-1">Ouça e descubra qual escala está tocando</p>
              <Badge className="bg-amber-700 text-amber-100 text-xs mt-2">Intermediário</Badge>
            </div>
          </div>
        </button>
      </div>

      {/* Preview mini das escalas */}
      <div className="mt-4">
        <p className="text-xs text-stone-500 mb-3 uppercase tracking-wider">Escalas disponíveis</p>
        <div className="grid grid-cols-3 gap-2">
          {SCALES.map(s => (
            <div key={s.id} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-xl p-2 text-center`}>
              <div className="text-lg">{s.emoji}</div>
              <p className="text-white text-xs font-medium leading-tight mt-1">{s.name.replace('Escala ', '').replace('Pentatônica ', 'Pent. ')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}