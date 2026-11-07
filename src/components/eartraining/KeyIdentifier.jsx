import React, { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { ChevronLeft, Play, RotateCcw, CheckCircle2, XCircle, Volume2, Lightbulb, Music2, AlignJustify } from 'lucide-react';

// Todas as tonalidades maiores e menores
const ALL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

const KEY_NAMES_PT = {
  'C': 'Dó', 'C#': 'Dó#', 'D': 'Ré', 'D#': 'Ré#', 'E': 'Mi',
  'F': 'Fá', 'F#': 'Fá#', 'G': 'Sol', 'G#': 'Sol#', 'A': 'Lá', 'A#': 'Lá#', 'B': 'Si'
};

// Campo harmônico maior: graus I, IV, V (tríades)
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

// Notas MIDI de referência (C4 = 60)
const NOTE_MIDI = { C: 60, 'C#': 61, D: 62, 'D#': 63, E: 64, F: 65, 'F#': 66, G: 67, 'G#': 68, A: 69, 'A#': 70, B: 71 };

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getChordNotes(rootMidi, type) {
  // type: 'major' | 'minor'
  const offsets = type === 'major' ? [0, 4, 7] : [0, 3, 7];
  return offsets.map(o => midiToFreq(rootMidi + o));
}

function buildKeyExercise(key, mode) {
  // Toca: I → IV → V → I (campo harmônico para identificar o tom)
  const rootMidi = NOTE_MIDI[key];
  const scale = mode === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
  const chordTypes = mode === 'major'
    ? ['major', 'major', 'major'] // I, IV, V
    : ['minor', 'minor', 'major']; // i, iv, V
  const degrees = [0, 3, 4]; // I, IV, V
  const chords = degrees.map((deg, i) => ({
    notes: getChordNotes(rootMidi + scale[deg], chordTypes[i]),
    label: ['I', 'IV', 'V'][i],
  }));
  return chords;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestion(usedKeys = []) {
  const mode = Math.random() > 0.4 ? 'major' : 'minor';
  const available = ALL_KEYS.filter(k => !usedKeys.slice(-4).includes(k + '_' + mode));
  const key = available[Math.floor(Math.random() * available.length)] || ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)];
  const chords = buildKeyExercise(key, mode);

  // Gera 4 opções: resposta correta + 3 distratores
  const correct = key + (mode === 'minor' ? 'm' : '');
  const correctLabel = KEY_NAMES_PT[key] + (mode === 'minor' ? ' menor' : ' maior');

  const distractors = shuffleArray(
    ALL_KEYS
      .filter(k => k !== key)
      .map(k => ({ value: k + (mode === 'minor' ? 'm' : ''), label: KEY_NAMES_PT[k] + (mode === 'minor' ? ' menor' : ' maior') }))
  ).slice(0, 3);

  const options = shuffleArray([
    { value: correct, label: correctLabel },
    ...distractors,
  ]);

  return { key, mode, chords, correct, correctLabel, options, id: key + '_' + mode + '_' + Date.now() };
}

export default function KeyIdentifier({ onBack }) {
  const [question, setQuestion] = useState(() => generateQuestion());
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [playing, setPlaying] = useState(false);
  const [playingMode, setPlayingMode] = useState(null); // 'harmonic' | 'melodic'
  const [listenMode, setListenMode] = useState('harmonic'); // modo padrão de escuta
  const [showHint, setShowHint] = useState(false);
  const usedRef = useRef([]);

  const isAnswered = selected !== null;

  // Todos os acordes da progressão incluindo a tônica final
  function getAllChords() {
    const rootChord = getChordNotes(NOTE_MIDI[question.key], question.mode === 'minor' ? 'minor' : 'major');
    return [...question.chords, { notes: rootChord, label: 'I' }];
  }

  // Modo Harmônico: cada acorde tocado simultaneamente (bloco)
  async function playHarmonic() {
    if (playing) return;
    setPlaying(true);
    setPlayingMode('harmonic');
    await Tone.start();

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 1.2 },
      volume: -8,
    }).toDestination();

    const allChords = getAllChords();
    const now = Tone.now();
    allChords.forEach((chord, i) => {
      synth.triggerAttackRelease(chord.notes, '2n', now + i * 1.2);
    });

    const totalDuration = allChords.length * 1.2 * 1000 + 1500;
    setTimeout(() => { synth.dispose(); setPlaying(false); setPlayingMode(null); }, totalDuration);
  }

  // Modo Melódico: notas de cada acorde tocadas em arpejo (uma por uma)
  async function playMelodic() {
    if (playing) return;
    setPlaying(true);
    setPlayingMode('melodic');
    await Tone.start();

    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.8 },
      volume: -6,
    }).toDestination();

    const allChords = getAllChords();
    const noteStep = 0.28; // tempo entre cada nota do arpejo
    const chordGap = 0.2;  // pausa entre acordes
    const now = Tone.now();
    let t = now;

    allChords.forEach((chord) => {
      chord.notes.forEach((freq) => {
        synth.triggerAttackRelease(freq, '8n', t);
        t += noteStep;
      });
      t += chordGap;
    });

    const totalDuration = (t - now) * 1000 + 800;
    setTimeout(() => { synth.dispose(); setPlaying(false); setPlayingMode(null); }, totalDuration);
  }

  function play() {
    if (listenMode === 'harmonic') playHarmonic();
    else playMelodic();
  }

  function handleAnswer(value) {
    if (isAnswered) return;
    setSelected(value);
    setScore(s => ({ correct: s.correct + (value === question.correct ? 1 : 0), total: s.total + 1 }));
  }

  function nextQuestion() {
    usedRef.current.push(question.key + '_' + question.mode);
    setQuestion(generateQuestion(usedRef.current));
    setSelected(null);
    setShowHint(false);
  }

  // Auto-play quando muda a questão
  useEffect(() => {
    const timer = setTimeout(() => play(), 400);
    return () => clearTimeout(timer);
  }, [question.id]);

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Voltar</span>
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-[#D4AF37]">Identificar Tom</h2>
          <p className="text-stone-500 text-xs">Ouça e identifique a tonalidade</p>
        </div>
        <div className="text-right">
          <p className="text-[#D4AF37] font-bold text-lg">{accuracy}%</p>
          <p className="text-stone-500 text-xs">{score.correct}/{score.total}</p>
        </div>
      </div>

      {/* Card principal */}
      <div className="bg-gradient-to-br from-teal-900/60 to-teal-800/40 border border-teal-700/50 rounded-2xl p-6 text-center space-y-4">
        <p className="text-stone-300 text-sm">Ouça a progressão I → IV → V → I e identifique o tom:</p>

        {/* Acordes visuais */}
        <div className="flex justify-center gap-3">
          {[...question.chords, { label: 'I' }].map((ch, i) => (
            <div key={i} className="bg-white/10 rounded-xl px-3 py-2 text-center">
              <span className="text-[#D4AF37] font-bold text-lg">{ch.label}</span>
              {i < question.chords.length && <p className="text-stone-400 text-xs mt-0.5">acorde {i + 1}</p>}
            </div>
          ))}
        </div>

        {/* Seletor de modo de escuta */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setListenMode('harmonic')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              listenMode === 'harmonic'
                ? 'bg-teal-600 border-teal-500 text-white'
                : 'bg-white/5 border-white/20 text-stone-400 hover:text-white'
            }`}
          >
            <AlignJustify className="w-3.5 h-3.5" />
            Harmônico
          </button>
          <button
            onClick={() => setListenMode('melodic')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              listenMode === 'melodic'
                ? 'bg-teal-600 border-teal-500 text-white'
                : 'bg-white/5 border-white/20 text-stone-400 hover:text-white'
            }`}
          >
            <Music2 className="w-3.5 h-3.5" />
            Melódico
          </button>
        </div>

        {/* Botões de Play */}
        <div className="flex justify-center gap-3">
          <button
            onClick={playHarmonic}
            disabled={playing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 border ${
              playingMode === 'harmonic'
                ? 'bg-teal-600 border-teal-500 text-white'
                : 'bg-[#8B6F47] hover:bg-[#A68A64] border-transparent text-white'
            }`}
          >
            {playingMode === 'harmonic' ? <Volume2 className="w-4 h-4 animate-pulse" /> : <AlignJustify className="w-4 h-4" />}
            Harmônico
          </button>
          <button
            onClick={playMelodic}
            disabled={playing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 border ${
              playingMode === 'melodic'
                ? 'bg-teal-600 border-teal-500 text-white'
                : 'bg-[#8B6F47] hover:bg-[#A68A64] border-transparent text-white'
            }`}
          >
            {playingMode === 'melodic' ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Music2 className="w-4 h-4" />}
            Melódico
          </button>
        </div>

        {/* Dica */}
        <button
          onClick={() => setShowHint(v => !v)}
          className="flex items-center gap-1 mx-auto text-stone-400 hover:text-yellow-400 text-xs transition-colors"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {showHint ? 'Ocultar dica' : 'Mostrar dica'}
        </button>
        {showHint && (
          <div className="bg-yellow-900/30 border border-yellow-700/40 rounded-xl p-3 text-xs text-yellow-200 leading-relaxed">
            💡 <strong>Técnica:</strong> O acorde I soa como "lar" — você se sente em repouso. O IV tem uma sensação de "saída suave" e o V cria tensão que "quer voltar" para o I. Preste atenção na nota mais grave de cada acorde.
          </div>
        )}
      </div>

      {/* Opções de resposta */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map(opt => {
          let style = 'bg-stone-800/60 border-stone-700/50 text-stone-200 hover:bg-stone-700/60';
          if (isAnswered) {
            if (opt.value === question.correct) style = 'bg-green-800/60 border-green-600/60 text-green-100';
            else if (opt.value === selected) style = 'bg-red-800/60 border-red-600/60 text-red-100';
            else style = 'bg-stone-800/40 border-stone-700/30 text-stone-500';
          }
          return (
            <button
              key={opt.value}
              onClick={() => handleAnswer(opt.value)}
              disabled={isAnswered}
              className={`border rounded-xl p-4 text-center font-semibold transition-all ${style}`}
            >
              <span className="text-base">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {isAnswered && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 ${selected === question.correct ? 'bg-green-900/40 border border-green-700/50' : 'bg-red-900/40 border border-red-700/50'}`}>
          {selected === question.correct
            ? <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
            : <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
          }
          <div className="flex-1">
            {selected === question.correct
              ? <p className="text-green-300 font-semibold">Correto! O tom era {question.correctLabel}</p>
              : <p className="text-red-300 font-semibold">Incorreto. Era <span className="text-white">{question.correctLabel}</span></p>
            }
            <p className="text-stone-400 text-xs mt-0.5">
              {question.mode === 'major'
                ? `Tom Maior: o I (${KEY_NAMES_PT[question.key]}) soa brilhante e estável`
                : `Tom Menor: o i (${KEY_NAMES_PT[question.key]}) soa sombrio e melancólico`
              }
            </p>
          </div>
          <button
            onClick={nextQuestion}
            className="flex items-center gap-1 bg-[#8B6F47] hover:bg-[#A68A64] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all flex-shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}