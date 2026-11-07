import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Play, Square, CheckCircle2, XCircle, RotateCcw, BookOpen, Dumbbell, ArrowRight, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Tone from 'tone';

// ─────────────────────────────────────────────────────────────────
//  TABELA DE INTERVALOS
//  semitons: distância em semitons
//  referencia: música conhecida com esse intervalo
//  direcao: 'asc' | 'desc' (qual nota da referência exemplifica)
// ─────────────────────────────────────────────────────────────────
export const INTERVALS = [
  {
    id: 'unissono',
    nome: 'Uníssono',
    abrev: 'P1',
    semitons: 0,
    tipo: 'perfeito',
    descricao: 'Duas notas idênticas. Ponto de repouso absoluto.',
    referencia: 'Do Re Mi (mesma nota repetida)',
    referenciaArtista: 'A Felicidade — Tom Jobim (nota repetida)',
    cor: 'from-slate-800/80 to-slate-700/60',
    borda: 'border-slate-600/50',
  },
  {
    id: 'segunda_menor',
    nome: '2ª Menor',
    abrev: 'm2',
    semitons: 1,
    tipo: 'menor',
    descricao: 'O intervalo mais tenso e dissonante. Cria suspense.',
    referencia: 'Jaws (Tubarão) — John Williams',
    referenciaArtista: 'Tema do Tubarão — John Williams',
    cor: 'from-red-900/60 to-red-800/40',
    borda: 'border-red-700/50',
  },
  {
    id: 'segunda_maior',
    nome: '2ª Maior',
    abrev: 'M2',
    semitons: 2,
    tipo: 'maior',
    descricao: 'Passos da escala maior. Sensação de movimento natural.',
    referencia: 'Parabéns pra você (2 primeiras notas)',
    referenciaArtista: 'Parabéns pra Você — Tradicional',
    cor: 'from-orange-900/60 to-orange-800/40',
    borda: 'border-orange-700/50',
  },
  {
    id: 'terca_menor',
    nome: '3ª Menor',
    abrev: 'm3',
    semitons: 3,
    tipo: 'menor',
    descricao: 'Base do acorde menor. Som melancólico e expressivo.',
    referencia: 'Smoke on the Water — Deep Purple (intro)',
    referenciaArtista: 'Smoke on the Water — Deep Purple',
    cor: 'from-blue-900/60 to-blue-800/40',
    borda: 'border-blue-700/50',
  },
  {
    id: 'terca_maior',
    nome: '3ª Maior',
    abrev: 'M3',
    semitons: 4,
    tipo: 'maior',
    descricao: 'Base do acorde maior. Som brilhante e alegre.',
    referencia: 'When the Saints Go Marching In (início)',
    referenciaArtista: 'Quando os Santos — Tradicional',
    cor: 'from-yellow-900/60 to-yellow-800/40',
    borda: 'border-yellow-700/50',
  },
  {
    id: 'quarta_justa',
    nome: '4ª Justa',
    abrev: 'P4',
    semitons: 5,
    tipo: 'perfeito',
    descricao: 'Intervalo estável e forte. Muito presente no sertanejo.',
    referencia: 'Hino Nacional Brasileiro (Sol-Dó)',
    referenciaArtista: 'Hino Nacional — Francisca Gonzaga',
    cor: 'from-lime-900/60 to-lime-800/40',
    borda: 'border-lime-700/50',
  },
  {
    id: 'tritono',
    nome: 'Trítono',
    abrev: 'TT',
    semitons: 6,
    tipo: 'aumentado',
    descricao: 'O "diabo na música". Máxima tensão, pede resolução.',
    referencia: 'Maria (West Side Story) — Bernstein',
    referenciaArtista: 'Maria — West Side Story',
    cor: 'from-purple-900/60 to-purple-800/40',
    borda: 'border-purple-700/50',
  },
  {
    id: 'quinta_justa',
    nome: '5ª Justa',
    abrev: 'P5',
    semitons: 7,
    tipo: 'perfeito',
    descricao: 'O intervalo mais estável. Base do acorde perfeito.',
    referencia: 'Star Wars — John Williams (tema principal)',
    referenciaArtista: 'Tema de Star Wars — John Williams',
    cor: 'from-teal-900/60 to-teal-800/40',
    borda: 'border-teal-700/50',
  },
  {
    id: 'sexta_menor',
    nome: '6ª Menor',
    abrev: 'm6',
    semitons: 8,
    tipo: 'menor',
    descricao: 'Soa levemente melancólico e dramático.',
    referencia: 'The Entertainer — Scott Joplin (início)',
    referenciaArtista: 'The Entertainer — Scott Joplin',
    cor: 'from-cyan-900/60 to-cyan-800/40',
    borda: 'border-cyan-700/50',
  },
  {
    id: 'sexta_maior',
    nome: '6ª Maior',
    abrev: 'M6',
    semitons: 9,
    tipo: 'maior',
    descricao: 'Brilhante e aberto. Muito usado em melodias otimistas.',
    referencia: 'My Bonnie Lies Over the Ocean (início)',
    referenciaArtista: 'My Bonnie — Tradicional Escocês',
    cor: 'from-sky-900/60 to-sky-800/40',
    borda: 'border-sky-700/50',
  },
  {
    id: 'setima_menor',
    nome: '7ª Menor',
    abrev: 'm7',
    semitons: 10,
    tipo: 'menor',
    descricao: 'Tensão suave que pede resolução. Base do acorde dominante.',
    referencia: 'Somewhere (West Side Story) — Bernstein',
    referenciaArtista: 'Somewhere — West Side Story',
    cor: 'from-violet-900/60 to-violet-800/40',
    borda: 'border-violet-700/50',
  },
  {
    id: 'setima_maior',
    nome: '7ª Maior',
    abrev: 'M7',
    semitons: 11,
    tipo: 'maior',
    descricao: 'A nota que "quase chegou" à oitava. Tensão elegante, jazzística.',
    referencia: 'Take On Me — A-ha (melodia do refrão)',
    referenciaArtista: 'Take On Me — A-ha',
    cor: 'from-fuchsia-900/60 to-fuchsia-800/40',
    borda: 'border-fuchsia-700/50',
  },
  {
    id: 'oitava',
    nome: 'Oitava (8ª)',
    abrev: 'P8',
    semitons: 12,
    tipo: 'perfeito',
    descricao: 'A mesma nota, uma oitava acima. Resolução perfeita.',
    referencia: 'Somewhere Over the Rainbow (2 primeiras notas)',
    referenciaArtista: 'Somewhere Over the Rainbow — Judy Garland',
    cor: 'from-emerald-900/60 to-emerald-800/40',
    borda: 'border-emerald-700/50',
  },
];

// ─────────────────────────────────────────────────────────────────
//  MOTOR DE ÁUDIO DE INTERVALOS
// ─────────────────────────────────────────────────────────────────
const NOTE_MIDI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const MIDI_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToTone(midi) {
  const oct = Math.floor(midi / 12) - 1;
  const name = MIDI_NOTE[midi % 12];
  return `${name}${oct}`;
}

// Toca duas notas em sequência (harmônico ou melódico)
async function playInterval(semitons, harmonic = false, rootMidi = 60) {
  await Tone.start();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.04, decay: 0.3, sustain: 0.6, release: 2.0 },
    volume: -8,
  }).toDestination();

  const note1 = midiToTone(rootMidi);
  const note2 = midiToTone(rootMidi + semitons);
  const now = Tone.now() + 0.1;

  if (harmonic) {
    // Toca as duas juntas
    synth.triggerAttackRelease([note1, note2], '2n', now, 0.6);
  } else {
    // Melódico: 1ª nota, pausa, 2ª nota
    synth.triggerAttackRelease(note1, '4n', now, 0.65);
    synth.triggerAttackRelease(note2, '4n', now + 0.65, 0.65);
  }

  // Retorna duração estimada em ms
  return harmonic ? 1800 : 2400;
}

// ─────────────────────────────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────
export default function IntervalTrainer({ onBack }) {
  const [subMode, setSubMode] = useState(null); // null | 'aprender' | 'treinar'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={subMode ? () => setSubMode(null) : onBack}
          className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-[#D4AF37] font-bold text-lg">Treinamento de Intervalos</h2>
          <p className="text-stone-500 text-xs">
            {subMode === 'aprender' ? 'Aprenda cada intervalo com referências' :
             subMode === 'treinar' ? 'Identifique o intervalo que você ouviu' :
             'Reconheça distâncias entre notas'}
          </p>
        </div>
      </div>

      {/* Seleção de sub-modo */}
      {!subMode && (
        <div className="space-y-3">
          <button
            onClick={() => setSubMode('aprender')}
            className="w-full text-left bg-gradient-to-r from-blue-900/60 to-blue-800/40 border border-blue-700/50 rounded-2xl p-5 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/10 rounded-xl p-3"><BookOpen className="w-6 h-6 text-white" /></div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-bold text-base">Aprender Intervalos</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-700 text-blue-100 font-semibold">Estudo</span>
                </div>
                <p className="text-stone-300 text-sm">Veja todos os 13 intervalos, ouça e associe a músicas de referência.</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSubMode('treinar')}
            className="w-full text-left bg-gradient-to-r from-amber-900/60 to-amber-800/40 border border-amber-700/50 rounded-2xl p-5 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/10 rounded-xl p-3"><Dumbbell className="w-6 h-6 text-white" /></div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-bold text-base">Treinar Identificação</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-700 text-amber-100 font-semibold">Prática</span>
                </div>
                <p className="text-stone-300 text-sm">Ouça um intervalo aleatório e escolha qual é entre 4 opções.</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {subMode === 'aprender' && <LearnIntervals />}
      {subMode === 'treinar' && <PracticeIntervals />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SUB-COMPONENTE: APRENDER INTERVALOS (catálogo)
// ─────────────────────────────────────────────────────────────────
// Carrega customizações do localStorage
function loadCustomRefs() {
  try { return JSON.parse(localStorage.getItem('interval_custom_refs') || '{}'); } catch { return {}; }
}
function saveCustomRefs(data) {
  localStorage.setItem('interval_custom_refs', JSON.stringify(data));
}

function LearnIntervals() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [playMode, setPlayMode] = useState('melodico');
  const [isPlaying, setIsPlaying] = useState(false);
  const [customRefs, setCustomRefs] = useState(loadCustomRefs);
  const [editing, setEditing] = useState(false);
  const [editReferencia, setEditReferencia] = useState('');
  const [editArtista, setEditArtista] = useState('');

  const interval = INTERVALS[activeIdx];
  const custom = customRefs[interval.id];
  const refTexto = custom?.referencia ?? interval.referencia;
  const refArtista = custom?.referenciaArtista ?? interval.referenciaArtista;

  // Fecha editor e reseta campos ao trocar de intervalo
  useEffect(() => {
    setEditing(false);
    setEditReferencia('');
    setEditArtista('');
  }, [activeIdx]);

  const startEdit = () => {
    // Pré-preenche com o valor atual (personalizado ou padrão)
    const cur = customRefs[interval.id];
    setEditReferencia(cur?.referencia ?? interval.referencia);
    setEditArtista(cur?.referenciaArtista ?? interval.referenciaArtista);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    if (!editReferencia.trim()) return;
    setCustomRefs(prev => {
      const updated = { ...prev, [interval.id]: { referencia: editReferencia.trim(), referenciaArtista: editArtista.trim() } };
      saveCustomRefs(updated);
      return updated;
    });
    setEditing(false);
  };

  const resetRef = () => {
    setCustomRefs(prev => {
      const updated = { ...prev };
      delete updated[interval.id];
      saveCustomRefs(updated);
      return updated;
    });
    setEditing(false);
  };

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    const dur = await playInterval(interval.semitons, playMode === 'harmonico', 60);
    setTimeout(() => setIsPlaying(false), dur);
  };

  return (
    <div className="space-y-4">
      {/* Barra de progresso */}
      <div className="flex gap-1">
        {INTERVALS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActiveIdx(i); setIsPlaying(false); }}
            className={`h-1.5 flex-1 rounded-full transition-all ${i === activeIdx ? 'bg-[#D4AF37]' : i < activeIdx ? 'bg-[#8B6F47]' : 'bg-white/10'}`}
          />
        ))}
      </div>

      {/* Card do intervalo */}
      <div className={`bg-gradient-to-br ${interval.cor} border ${interval.borda} rounded-2xl p-5 space-y-4`}>
        {/* Nome e info */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/15 text-white font-mono font-bold px-2.5 py-1 rounded-lg text-sm">{interval.abrev}</span>
              <span className="text-stone-400 text-xs capitalize">{interval.tipo}</span>
            </div>
            <h3 className="text-white font-extrabold text-2xl">{interval.nome}</h3>
            <p className="text-[#D4AF37] font-semibold text-sm">{interval.semitons} semitom{interval.semitons !== 1 ? 's' : ''}</p>
          </div>
          {/* Visualização gráfica do intervalo */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1 items-end">
              {[...Array(13)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-sm transition-all ${
                    i === 0 ? 'h-6 bg-[#D4AF37]' :
                    i === interval.semitons ? 'h-6 bg-[#D4AF37]' :
                    i < interval.semitons ? 'h-3 bg-white/20' : 'h-2 bg-white/10'
                  }`}
                />
              ))}
            </div>
            <span className="text-stone-500 text-xs">semitons</span>
          </div>
        </div>

        <p className="text-stone-200 text-sm leading-relaxed">{interval.descricao}</p>

        {/* Referência musical */}
        <div className="bg-black/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-stone-400 text-xs uppercase tracking-wider">🎵 Referência para memória</p>
            {!editing && (
              <button onClick={startEdit} className="flex items-center gap-1 text-xs text-stone-500 hover:text-[#D4AF37] transition-colors">
                <Pencil className="w-3 h-3" /> Editar
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <input
                value={editReferencia}
                onChange={e => setEditReferencia(e.target.value)}
                placeholder="Ex: Smoke on the Water (intro)"
                className="w-full bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/20 focus:border-[#D4AF37]/60 focus:outline-none placeholder-stone-600"
              />
              <input
                value={editArtista}
                onChange={e => setEditArtista(e.target.value)}
                placeholder="Ex: Deep Purple"
                className="w-full bg-white/10 text-stone-300 text-xs rounded-lg px-3 py-2 border border-white/20 focus:border-[#D4AF37]/60 focus:outline-none placeholder-stone-600"
              />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-700/50 hover:bg-emerald-700/80 text-emerald-300 text-xs font-semibold transition-all">
                  <Check className="w-3 h-3" /> Salvar
                </button>
                {custom && (
                  <button onClick={resetRef} className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-stone-700/50 hover:bg-stone-700/80 text-stone-400 text-xs transition-all">
                    Restaurar padrão
                  </button>
                )}
                <button onClick={cancelEdit} className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/70 text-red-400 text-xs transition-all">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-white font-semibold text-sm">{refTexto}</p>
              <p className="text-stone-400 text-xs">{refArtista}</p>

            </>
          )}
        </div>

        {/* Modo de escuta */}
        <div className="flex gap-2">
          <button
            onClick={() => setPlayMode('melodico')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${playMode === 'melodico' ? 'bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/50' : 'bg-white/5 text-stone-400 border border-white/10'}`}
          >
            Melódico ↗
          </button>
          <button
            onClick={() => setPlayMode('harmonico')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${playMode === 'harmonico' ? 'bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/50' : 'bg-white/5 text-stone-400 border border-white/10'}`}
          >
            Harmônico ♩♩
          </button>
        </div>

        <Button
          onClick={handlePlay}
          disabled={isPlaying}
          className="w-full py-4 font-bold rounded-xl gap-2 bg-[#D4AF37] hover:bg-[#B8962E] text-[#1A0E05] disabled:opacity-50"
        >
          {isPlaying ? <><Square className="w-4 h-4 animate-pulse" />Tocando...</> : <><Play className="w-4 h-4" />Ouvir {interval.nome}</>}
        </Button>
      </div>

      {/* Navegação */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => { setActiveIdx(i => Math.max(0, i - 1)); setIsPlaying(false); }}
          disabled={activeIdx === 0}
          variant="outline"
          className="border-[#8B6F47]/40 text-stone-300 hover:bg-[#8B6F47]/20 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />Anterior
        </Button>
        <Button
          onClick={() => { setActiveIdx(i => Math.min(INTERVALS.length - 1, i + 1)); setIsPlaying(false); }}
          disabled={activeIdx === INTERVALS.length - 1}
          className="bg-[#8B6F47] hover:bg-[#6B5437] text-white"
        >
          Próximo<ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SUB-COMPONENTE: TREINO DE IDENTIFICAÇÃO
// ─────────────────────────────────────────────────────────────────
function PracticeIntervals() {
  const [question, setQuestion] = useState(() => generateQuestion());
  const [selected, setSelected] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [playMode, setPlayMode] = useState('melodico');

  function generateQuestion() {
    // Escolhe 4 intervalos distintos aleatórios, um deles é o correto
    const shuffled = [...INTERVALS].sort(() => Math.random() - 0.5);
    const options = shuffled.slice(0, 4);
    const correct = options[Math.floor(Math.random() * options.length)];
    // Raiz aleatória entre C4 (60) e G4 (67) para não sair do registro
    const rootMidi = 60 + Math.floor(Math.random() * 8);
    return { correct, options, rootMidi };
  }

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    const dur = await playInterval(question.correct.semitons, playMode === 'harmonico', question.rootMidi);
    setTimeout(() => setIsPlaying(false), dur);
  };

  const handleAnswer = (interval) => {
    if (selected) return;
    setSelected(interval);
    setScore(s => ({
      correct: s.correct + (interval.id === question.correct.id ? 1 : 0),
      total: s.total + 1,
    }));
  };

  const handleNext = () => {
    setSelected(null);
    setIsPlaying(false);
    setQuestion(generateQuestion());
  };

  const isCorrect = selected?.id === question.correct.id;
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;

  return (
    <div className="space-y-4">
      {/* Placar */}
      <div className="flex items-center justify-between bg-[#2A1A0E] rounded-xl px-4 py-2.5 border border-[#8B6F47]/30">
        <div className="flex items-center gap-3">
          <span className="text-stone-400 text-sm">Acertos:</span>
          <span className="text-[#D4AF37] font-bold text-lg">{score.correct}/{score.total}</span>
        </div>
        {accuracy !== null && (
          <span className={`text-sm font-bold ${accuracy >= 70 ? 'text-emerald-400' : accuracy >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
            {accuracy}% precisão
          </span>
        )}
        <button onClick={() => setScore({ correct: 0, total: 0 })} className="text-stone-600 hover:text-stone-400 transition-colors">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Modo melódico / harmônico */}
      <div className="flex gap-2">
        <button
          onClick={() => setPlayMode('melodico')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${playMode === 'melodico' ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50' : 'bg-white/5 text-stone-500 border border-white/10'}`}
        >
          Melódico ↗
        </button>
        <button
          onClick={() => setPlayMode('harmonico')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${playMode === 'harmonico' ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50' : 'bg-white/5 text-stone-500 border border-white/10'}`}
        >
          Harmônico ♩♩
        </button>
      </div>

      {/* Botão de tocar */}
      <div className="bg-[#2A1A0E] border border-[#8B6F47]/40 rounded-2xl p-5 text-center space-y-3">
        <p className="text-stone-400 text-sm">Qual intervalo você está ouvindo?</p>
        <Button
          onClick={handlePlay}
          disabled={isPlaying}
          className="w-full py-5 font-bold text-base rounded-xl gap-2 bg-[#8B6F47] hover:bg-[#6B5437] text-white disabled:opacity-50"
        >
          {isPlaying
            ? <><Square className="w-5 h-5 animate-pulse" />Tocando...</>
            : <><Play className="w-5 h-5" />Ouvir Intervalo</>}
        </Button>
        {!selected && score.total === 0 && (
          <p className="text-stone-600 text-xs">Toque o intervalo antes de responder</p>
        )}
      </div>

      {/* Opções */}
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((opt) => {
          const isSelected = selected?.id === opt.id;
          const isRight = opt.id === question.correct.id;
          let cls = 'bg-[#2A1A0E] border-[#8B6F47]/30 text-stone-300 hover:border-[#8B6F47]/60 hover:bg-[#8B6F47]/10';
          if (selected) {
            if (isRight) cls = 'bg-emerald-900/50 border-emerald-500 text-white';
            else if (isSelected) cls = 'bg-red-900/50 border-red-500 text-white';
            else cls = 'bg-[#2A1A0E] border-[#8B6F47]/20 text-stone-500 opacity-50';
          }
          return (
            <button
              key={opt.id}
              onClick={() => handleAnswer(opt)}
              disabled={!!selected}
              className={`border rounded-xl p-3 text-left transition-all ${cls}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-bold text-sm">{opt.nome}</span>
                <span className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">{opt.abrev}</span>
              </div>
              <span className="text-xs opacity-70">{opt.semitons} st</span>
            </button>
          );
        })}
      </div>

      {/* Feedback após resposta */}
      {selected && (
        <div className={`rounded-2xl p-4 border space-y-2 ${isCorrect ? 'bg-emerald-900/30 border-emerald-600/50' : 'bg-red-900/30 border-red-600/50'}`}>
          <div className="flex items-center gap-2">
            {isCorrect
              ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              : <XCircle className="w-5 h-5 text-red-400" />}
            <span className={`font-bold ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
              {isCorrect ? 'Correto! 🎉' : `Era ${question.correct.nome} (${question.correct.abrev})`}
            </span>
          </div>
          <p className="text-stone-300 text-sm">{question.correct.descricao}</p>
          <div className="bg-black/30 rounded-lg px-3 py-2">
            <span className="text-[#D4AF37] text-xs font-semibold">🎵 Referência: </span>
            <span className="text-stone-300 text-xs">{question.correct.referencia}</span>
          </div>
          <Button onClick={handleNext} className="w-full bg-[#8B6F47] hover:bg-[#6B5437] text-white rounded-xl gap-2 mt-1">
            Próximo Intervalo <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}