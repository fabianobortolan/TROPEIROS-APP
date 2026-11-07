import React, { useState, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { buildChordNotes } from './useChordAudio';
import { Volume2, ArrowLeft, RefreshCw, GitCompare } from 'lucide-react';

// Todos os tipos de acordes com qualidade e cor
const CHORD_TYPES = [
  { id: 'maior',     label: 'Maior',         quality: '',      description: 'Som brilhante e alegre',          color: 'bg-amber-700/40 border-amber-600/60',    active: 'bg-amber-600 border-amber-400'   },
  { id: 'menor',     label: 'Menor',         quality: 'm',     description: 'Som melancólico e expressivo',     color: 'bg-blue-700/40 border-blue-600/60',      active: 'bg-blue-600 border-blue-400'     },
  { id: 'diminuto',  label: 'Diminuto',      quality: 'dim',   description: 'Som tenso e instável',             color: 'bg-red-800/40 border-red-700/60',        active: 'bg-red-700 border-red-400'       },
  { id: 'aumentado', label: 'Aumentado',     quality: 'aug',   description: 'Som misterioso e suspenso',        color: 'bg-purple-800/40 border-purple-700/60',  active: 'bg-purple-700 border-purple-400' },
  { id: 'dom7',      label: 'Sétima Dom.',   quality: '7',     description: 'Tensão que pede resolução',        color: 'bg-orange-800/40 border-orange-700/60',  active: 'bg-orange-700 border-orange-400' },
  { id: 'maj7',      label: 'Maior 7ª',      quality: 'maj7',  description: 'Som suave e sofisticado',          color: 'bg-teal-800/40 border-teal-700/60',      active: 'bg-teal-700 border-teal-400'     },
  { id: 'menor7',    label: 'Menor 7ª',      quality: 'm7',    description: 'Som jazzístico e suave',           color: 'bg-cyan-800/40 border-cyan-700/60',      active: 'bg-cyan-700 border-cyan-400'     },
  { id: 'dim7',      label: 'Diminuto 7ª',   quality: 'dim7',  description: 'Tensão máxima, som dramático',     color: 'bg-rose-900/40 border-rose-800/60',      active: 'bg-rose-700 border-rose-400'     },
];

const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// ── Inversões ───────────────────────────────────────────────────────
function applyInversion(notes, invIdx) {
  if (invIdx === 0) return notes;
  const parsed = notes.map(n => {
    const m = n.match(/^([A-G][#b]?)(\d)$/);
    return m ? { name: m[1], oct: parseInt(m[2]) } : { name: n.slice(0, -1), oct: 4 };
  });
  for (let i = 0; i < invIdx; i++) {
    const s = parsed.shift();
    parsed.push({ name: s.name, oct: s.oct + 1 });
  }
  return parsed.map(p => `${p.name}${p.oct}`);
}

const INV_LABELS = ['Fund.', '1ª Inv.', '2ª Inv.', '3ª Inv.'];

export default function ChordComparison({ onBack }) {
  const [root, setRoot] = useState('C');
  const [selectedTypes, setSelectedTypes] = useState(['maior', 'menor']);
  const [playMode, setPlayMode] = useState('harmonic'); // 'harmonic' | 'melodic'
  const [inversionIdx, setInversionIdx] = useState(0);
  const [playingId, setPlayingId] = useState(null);
  const synthRef = useRef(null);

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

  const playChord = useCallback(async (typeId) => {
    if (playingId) return;
    await Tone.start();
    const type = CHORD_TYPES.find(t => t.id === typeId);
    const chordName = `${root}${type.quality}`;
    const baseNotes = buildChordNotes(chordName);
    if (!baseNotes || baseNotes.length === 0) return;
    const maxInv = Math.min(baseNotes.length - 1, 3);
    const safeInv = Math.min(inversionIdx, maxInv);
    const notes = applyInversion(baseNotes, safeInv);

    const synth = getSynth();
    synth.releaseAll();
    setPlayingId(typeId);
    const now = Tone.now() + 0.05;

    if (playMode === 'melodic') {
      notes.forEach((note, i) => synth.triggerAttackRelease(note, '4n', now + i * 0.38, 0.75));
      setTimeout(() => setPlayingId(null), notes.length * 380 + 300);
    } else {
      synth.triggerAttackRelease(notes, '2n', now, 0.75);
      setTimeout(() => setPlayingId(null), 1300);
    }
  }, [root, inversionIdx, playMode, playingId, getSynth]);

  const toggleType = (id) => {
    setSelectedTypes(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(x => x !== id) : prev
        : [...prev, id]
    );
  };

  const selectAll = () => setSelectedTypes(CHORD_TYPES.map(t => t.id));
  const selectNone = () => setSelectedTypes(['maior']);

  const shownTypes = CHORD_TYPES.filter(t => selectedTypes.includes(t.id));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-300" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-[#D4AF37] flex items-center gap-2">
            <GitCompare className="w-5 h-5" /> Comparar Acordes
          </h2>
          <p className="text-stone-400 text-xs">Ouça o mesmo acorde em tipos diferentes</p>
        </div>
      </div>

      {/* Seleção de raiz */}
      <div className="bg-white/5 rounded-2xl p-4 space-y-2">
        <p className="text-stone-300 text-xs uppercase tracking-wider font-semibold">Nota raiz</p>
        <div className="flex flex-wrap gap-2">
          {ROOTS.map(r => (
            <button
              key={r}
              onClick={() => setRoot(r)}
              className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                root === r
                  ? 'bg-[#D4AF37] text-black shadow-lg scale-105'
                  : 'bg-white/10 text-stone-300 hover:bg-white/20'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Modo de playback e inversão */}
      <div className="grid grid-cols-2 gap-3">
        {/* Modo */}
        <div className="bg-white/5 rounded-2xl p-3 space-y-2">
          <p className="text-stone-300 text-xs uppercase tracking-wider font-semibold">Modo</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPlayMode('harmonic')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                playMode === 'harmonic' ? 'bg-[#D4AF37] text-black' : 'bg-white/10 text-stone-400 hover:bg-white/15'
              }`}
            >
              Harmônico
            </button>
            <button
              onClick={() => setPlayMode('melodic')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                playMode === 'melodic' ? 'bg-[#D4AF37] text-black' : 'bg-white/10 text-stone-400 hover:bg-white/15'
              }`}
            >
              Melódico
            </button>
          </div>
        </div>

        {/* Inversão */}
        <div className="bg-white/5 rounded-2xl p-3 space-y-2">
          <p className="text-stone-300 text-xs uppercase tracking-wider font-semibold">Posição</p>
          <div className="flex gap-1.5">
            {INV_LABELS.map((lbl, i) => (
              <button
                key={i}
                onClick={() => setInversionIdx(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  inversionIdx === i ? 'bg-[#D4AF37] text-black' : 'bg-white/10 text-stone-400 hover:bg-white/15'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Seleção de tipos */}
      <div className="bg-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-stone-300 text-xs uppercase tracking-wider font-semibold">Tipos de acorde para comparar</p>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-[#D4AF37] hover:underline">Todos</button>
            <span className="text-stone-600">|</span>
            <button onClick={selectNone} className="text-xs text-stone-400 hover:text-stone-200">Limpar</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CHORD_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => toggleType(type.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedTypes.includes(type.id)
                  ? 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#D4AF37]'
                  : 'bg-white/5 border-white/10 text-stone-500 hover:text-stone-300 hover:border-white/20'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de acordes para ouvir */}
      <div className="space-y-2">
        <p className="text-stone-400 text-xs text-center uppercase tracking-wider">
          Toque cada acorde e compare — raiz: <span className="text-[#D4AF37] font-bold">{root}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          {shownTypes.map(type => {
            const isPlaying = playingId === type.id;
            const chordLabel = `${root}${type.quality || ''}`;
            return (
              <button
                key={type.id}
                onClick={() => playChord(type.id)}
                disabled={!!playingId && !isPlaying}
                className={`relative border rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-default ${
                  isPlaying
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 scale-[1.02]'
                    : `${type.color} border`
                }`}
              >
                {/* Animação de ondas quando tocando */}
                {isPlaying && (
                  <div className="absolute top-3 right-3 flex gap-0.5 items-end h-4">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="w-0.5 bg-[#D4AF37] rounded-full animate-pulse"
                        style={{
                          height: `${[60, 100, 70, 90][i]}%`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="pr-6">
                  <p className="text-[#D4AF37] font-bold text-base font-mono">{chordLabel}</p>
                  <p className="text-white font-semibold text-sm">{type.label}</p>
                  <p className="text-stone-400 text-xs mt-0.5 leading-tight">{type.description}</p>
                </div>

                <div className={`mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  isPlaying ? 'text-[#D4AF37]' : 'text-stone-500'
                }`}>
                  <Volume2 className="w-3 h-3" />
                  {isPlaying ? 'Tocando...' : 'Toque para ouvir'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dica */}
      <div className="bg-[#2A1A0E] border border-[#8B6F47]/30 rounded-xl p-4">
        <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-1.5">💡 Como usar</p>
        <ul className="text-stone-300 text-xs space-y-1 leading-relaxed">
          <li>• Escolha uma nota raiz e vários tipos de acorde</li>
          <li>• Toque cada um em sequência e perceba as diferenças</li>
          <li>• Alterne entre <strong className="text-stone-200">Harmônico</strong> (notas juntas) e <strong className="text-stone-200">Melódico</strong> (nota a nota)</li>
          <li>• Experimente as inversões para treinar o mesmo acorde em posições diferentes</li>
        </ul>
      </div>
    </div>
  );
}