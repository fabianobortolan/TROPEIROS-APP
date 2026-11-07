import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useChordAudio, buildChordNotes } from './useChordAudio';
import { ArrowLeft, Volume2, RotateCcw, CheckCircle, XCircle, Layers } from 'lucide-react';
import * as Tone from 'tone';

// ── Definições de tipos de acordes para o quiz ──────────────────────
const CHORD_TYPES = [
  { id: 'maior',     label: 'Maior',          quality: '',      description: 'Som brilhante e alegre',           color: 'from-amber-800/50 to-amber-700/30',  border: 'border-amber-600/60'  },
  { id: 'menor',     label: 'Menor',          quality: 'm',     description: 'Som melancólico e expressivo',      color: 'from-blue-800/50 to-blue-700/30',    border: 'border-blue-600/60'   },
  { id: 'diminuto',  label: 'Diminuto',       quality: 'dim',   description: 'Som tenso e instável',              color: 'from-red-900/50 to-red-800/30',      border: 'border-red-700/60'    },
  { id: 'aumentado', label: 'Aumentado',      quality: 'aug',   description: 'Som misterioso e suspenso',         color: 'from-purple-900/50 to-purple-800/30',border: 'border-purple-700/60' },
  { id: 'dom7',      label: 'Sétima (Dom.)',  quality: '7',     description: 'Tensão que pede resolução',         color: 'from-orange-900/50 to-orange-800/30',border: 'border-orange-700/60' },
  { id: 'maj7',      label: 'Maior 7ª',       quality: 'maj7',  description: 'Som suave e sofisticado',           color: 'from-teal-900/50 to-teal-800/30',    border: 'border-teal-700/60'   },
  { id: 'menor7',    label: 'Menor 7ª',       quality: 'm7',    description: 'Som jazzístico e suave',            color: 'from-cyan-900/50 to-cyan-800/30',    border: 'border-cyan-700/60'   },
  { id: 'dim7',      label: 'Diminuto 7ª',    quality: 'dim7',  description: 'Tensão máxima, som dramático',      color: 'from-rose-900/50 to-rose-800/30',    border: 'border-rose-700/60'   },
];

const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'F#', 'Bb', 'Eb', 'Ab', 'Db'];

// ── Lógica de inversão ────────────────────────────────────────────
function applyInversion(notes, inversionIndex) {
  // notes = ["C3", "E4", "G4"]
  // inversão 0 = fundamental, 1 = primeira inversão, 2 = segunda inversão, etc.
  if (inversionIndex === 0) return notes;

  const parsed = notes.map(n => {
    const match = n.match(/^([A-G][#b]?)(\d)$/);
    return match ? { name: match[1], oct: parseInt(match[2]) } : { name: n.slice(0, -1), oct: 4 };
  });

  // Rotaciona: move as primeiras notas para uma oitava acima
  for (let i = 0; i < inversionIndex; i++) {
    const shifted = parsed.shift();
    parsed.push({ name: shifted.name, oct: shifted.oct + 1 });
  }

  return parsed.map(p => `${p.name}${p.oct}`);
}

// ── Nomes das inversões ───────────────────────────────────────────
const INVERSION_LABELS = ['Estado Fundamental', '1ª Inversão', '2ª Inversão', '3ª Inversão'];

// ── Gerar quiz ────────────────────────────────────────────────────
function generateQuestion(inversionMode) {
  const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
  const typeIndex = Math.floor(Math.random() * CHORD_TYPES.length);
  const type = CHORD_TYPES[typeIndex];
  const chordName = `${root}${type.quality}`;
  const baseNotes = buildChordNotes(chordName);
  const maxInv = Math.min(baseNotes.length - 1, 3);
  const inversionIndex = inversionMode ? Math.floor(Math.random() * (maxInv + 1)) : 0;
  const notes = applyInversion(baseNotes, inversionIndex);

  // 4 opções: correta + 3 aleatórias
  const options = [type];
  while (options.length < 4) {
    const rand = CHORD_TYPES[Math.floor(Math.random() * CHORD_TYPES.length)];
    if (!options.find(o => o.id === rand.id)) options.push(rand);
  }
  // Embaralha
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { root, type, chordName, notes, inversionIndex, options };
}

// ── Componente principal ─────────────────────────────────────────
export default function ChordIdentifier({ onBack }) {
  const [inversionMode, setInversionMode] = useState(false);
  const [question, setQuestion] = useState(() => generateQuestion(false));
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [playing, setPlaying] = useState(false);
  const synthRef = useRef(null);

  // Reinicia questão quando muda o modo de inversão
  useEffect(() => {
    newQuestion();
  }, [inversionMode]);

  const getSynth = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.65, release: 1.8 },
        volume: -8,
      }).toDestination();
    }
    return synthRef.current;
  }, []);

  const playChord = useCallback(async (notes, melodic = false) => {
    await Tone.start();
    const synth = getSynth();
    synth.releaseAll();
    setPlaying(true);

    const now = Tone.now() + 0.1;

    if (melodic) {
      // Toca nota por nota (melódico)
      notes.forEach((note, i) => {
        synth.triggerAttackRelease(note, '4n', now + i * 0.35, 0.7);
      });
      setTimeout(() => setPlaying(false), notes.length * 350 + 300);
    } else {
      // Toca todas juntas (harmônico)
      synth.triggerAttackRelease(notes, '2n', now, 0.7);
      setTimeout(() => setPlaying(false), 1200);
    }
  }, [getSynth]);

  const newQuestion = useCallback(() => {
    setQuestion(generateQuestion(inversionMode));
    setSelected(null);
    setAnswered(false);
  }, [inversionMode]);

  const handleAnswer = (option) => {
    if (answered) return;
    setSelected(option.id);
    setAnswered(true);
    const correct = option.id === question.type.id;
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-300" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-[#D4AF37]">Identificar Acordes</h2>
          <p className="text-stone-400 text-xs">Ouça e identifique o tipo do acorde</p>
        </div>
        <div className="ml-auto text-right">
          <span className="text-[#D4AF37] font-bold text-lg">{accuracy}%</span>
          <p className="text-stone-500 text-xs">{score.correct}/{score.total}</p>
        </div>
      </div>

      {/* Toggle inversão */}
      <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-[#D4AF37]" />
          <div>
            <p className="text-white font-semibold text-sm">Inversões de Acordes</p>
            <p className="text-stone-400 text-xs">{inversionMode ? 'Acorde pode estar em qualquer posição' : 'Apenas estado fundamental'}</p>
          </div>
        </div>
        <button
          onClick={() => setInversionMode(v => !v)}
          className={`w-12 h-6 rounded-full transition-all duration-200 relative ${inversionMode ? 'bg-[#D4AF37]' : 'bg-stone-700'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${inversionMode ? 'left-[26px]' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Card da questão */}
      <div className="bg-[#0D0600]/60 border border-[#3D2B1F] rounded-2xl p-6 space-y-5">
        {/* Informação da inversão se ativada */}
        {inversionMode && answered && (
          <div className="text-center">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-800/50 text-purple-300 border border-purple-700/50">
              {INVERSION_LABELS[question.inversionIndex]}
            </span>
          </div>
        )}

        {/* Botões de playback */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => playChord(question.notes, false)}
            disabled={playing}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C49F27] disabled:opacity-50 text-black font-bold transition-all text-sm"
          >
            <Volume2 className="w-4 h-4" />
            {playing ? 'Tocando...' : 'Ouvir Harmônico'}
          </button>
          <button
            onClick={() => playChord(question.notes, true)}
            disabled={playing}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-semibold transition-all text-sm"
          >
            <Volume2 className="w-4 h-4" />
            Melódico
          </button>
        </div>

        <p className="text-center text-stone-400 text-sm">Qual é o tipo deste acorde?</p>

        {/* Opções */}
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((option) => {
            const isCorrect = option.id === question.type.id;
            const isSelected = selected === option.id;
            let borderClass = `border ${option.border} bg-gradient-to-br ${option.color}`;
            if (answered) {
              if (isCorrect) borderClass = 'border-2 border-green-500 bg-green-900/30';
              else if (isSelected) borderClass = 'border-2 border-red-500 bg-red-900/30';
              else borderClass = 'border border-stone-700/40 bg-stone-900/30 opacity-50';
            }

            return (
              <button
                key={option.id}
                onClick={() => handleAnswer(option)}
                disabled={answered}
                className={`${borderClass} rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-default relative`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-white font-bold text-sm">{option.label}</span>
                  {answered && isCorrect && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                  {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                </div>
                <p className="text-stone-400 text-xs mt-1 leading-tight">{option.description}</p>
              </button>
            );
          })}
        </div>

        {/* Resultado */}
        {answered && (
          <div className={`rounded-xl p-4 text-center ${selected === question.type.id ? 'bg-green-900/30 border border-green-700/50' : 'bg-red-900/30 border border-red-700/50'}`}>
            <p className={`font-bold text-sm ${selected === question.type.id ? 'text-green-300' : 'text-red-300'}`}>
              {selected === question.type.id ? '✓ Correto!' : `✗ Era ${question.type.label}`}
            </p>
            <p className="text-stone-400 text-xs mt-1">
              Acorde: <span className="text-white font-semibold">{question.root} {question.type.label}</span>
              {inversionMode && question.inversionIndex > 0 && (
                <span className="text-purple-300"> • {INVERSION_LABELS[question.inversionIndex]}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Próxima questão */}
      {answered && (
        <button
          onClick={newQuestion}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] text-black font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Próximo Acorde
        </button>
      )}

      {/* Referência dos tipos */}
      <details className="bg-white/5 rounded-2xl overflow-hidden">
        <summary className="px-4 py-3 text-stone-300 text-sm font-semibold cursor-pointer select-none hover:text-white transition-colors">
          📖 Guia de Tipos de Acordes
        </summary>
        <div className="px-4 pb-4 space-y-2 pt-2">
          {CHORD_TYPES.map(ct => (
            <div key={ct.id} className={`flex items-center justify-between p-3 rounded-xl bg-gradient-to-r ${ct.color} border ${ct.border}`}>
              <div>
                <span className="text-white font-semibold text-sm">{ct.label}</span>
                <p className="text-stone-400 text-xs">{ct.description}</p>
              </div>
              <span className="text-stone-400 text-xs font-mono bg-black/30 px-2 py-1 rounded-lg">C{ct.quality || ' Maior'}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}