import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Play, Square, X, RotateCcw, Music, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChordAudio } from './useChordAudio';

// Acordes disponíveis para seleção
const CHORD_GROUPS = [
  { label: 'Maiores', chords: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  { label: 'Menores', chords: ['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'] },
  { label: 'Dominantes', chords: ['C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7'] },
  { label: 'Menor 7', chords: ['Am7', 'Dm7', 'Em7', 'Bm7'] },
  { label: 'Maior 7', chords: ['Cmaj7', 'Fmaj7', 'Gmaj7', 'Amaj7'] },
  { label: 'Bemóis / Sustenidos', chords: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'F#', 'C#'] },
  { label: 'Menores ♭/♯', chords: ['Bbm', 'Ebm', 'Abm', 'F#m', 'C#m'] },
  { label: 'Dim / Sus', chords: ['Bdim', 'Cdim', 'F#dim', 'Gsus4', 'Asus4'] },
];

// Sequências predefinidas para referência rápida
const PRESETS = [
  { label: 'ii-V-I (Dó)', chords: ['Dm', 'G7', 'C'], desc: 'Jazz / Popular' },
  { label: 'I-IV-V-I (Dó)', chords: ['C', 'F', 'G', 'C'], desc: 'Sertanejo / Folk' },
  { label: 'I-V-vi-IV (Dó)', chords: ['C', 'G', 'Am', 'F'], desc: 'Pop / Rock' },
  { label: 'i-VII-VI-VII (Lá m)', chords: ['Am', 'G', 'F', 'G'], desc: 'Progressão andaluza' },
  { label: 'I-vi-IV-V (Dó)', chords: ['C', 'Am', 'F', 'G'], desc: 'Anos 50 / Sertanejo' },
  { label: 'i-iv-VII-III (Lá m)', chords: ['Am', 'Dm', 'G', 'C'], desc: 'Clássica / MPB' },
  { label: 'I-IV-I-V (Dó)', chords: ['C', 'F', 'C', 'G'], desc: 'Blues / Simples' },
  { label: 'vi-IV-I-V (Lá m)', chords: ['Am', 'F', 'C', 'G'], desc: 'Alternativa / Pop' },
];

export default function CustomProgressionTrainer({ onBack }) {
  const [sequence, setSequence] = useState([]);
  const [bpm, setBpm] = useState(80);
  const [loop, setLoop] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChordIndex, setActiveChordIndex] = useState(-1);
  const [loopCount, setLoopCount] = useState(0);
  const loopRef = React.useRef(false);
  const stopRef = React.useRef(false);

  const { playProgression, stop, getProgressionDuration } = useChordAudio();

  // Para tudo ao desmontar o componente (ex: usuário navega pra outra página)
  useEffect(() => {
    return () => {
      stopRef.current = true;
      loopRef.current = false;
      stop();
    };
  }, [stop]);

  const addChord = (chord) => {
    if (sequence.length >= 8) return;
    setSequence(s => [...s, chord]);
  };

  const removeChord = (idx) => {
    setSequence(s => s.filter((_, i) => i !== idx));
  };

  const loadPreset = (preset) => {
    setSequence(preset.chords);
  };

  const handlePlay = async () => {
    if (isPlaying) {
      stopRef.current = true;
      loopRef.current = false;
      stop();
      setIsPlaying(false);
      setActiveChordIndex(-1);
      return;
    }
    if (sequence.length === 0) return;

    stopRef.current = false;
    loopRef.current = loop;
    setIsPlaying(true);
    setLoopCount(0);

    const beatsPerMeasure = 4;

    // Duração de cada acorde = 1 compasso inteiro
    const beatDuration = 60 / bpm;
    const chordDuration = beatDuration * beatsPerMeasure * 1000; // ms por acorde

    const playOnce = async (iteration) => {
      if (stopRef.current) return;
      setLoopCount(iteration);
      await playProgression(sequence, bpm, beatsPerMeasure);

      // Anima o acorde ativo
      for (let i = 0; i < sequence.length; i++) {
        if (stopRef.current) break;
        setActiveChordIndex(i);
        await new Promise(r => setTimeout(r, chordDuration));
      }
      setActiveChordIndex(-1);

      if (!stopRef.current && loopRef.current) {
        await new Promise(r => setTimeout(r, 200));
        playOnce(iteration + 1);
      } else {
        setIsPlaying(false);
        setActiveChordIndex(-1);
      }
    };

    playOnce(1);
  };

  const handleLoopToggle = () => {
    const next = !loop;
    setLoop(next);
    loopRef.current = next;
  };

  const totalDuration = sequence.length > 0
    ? ((60 / bpm) * 4 * sequence.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-[#D4AF37] font-bold text-lg">Treinar Cadência</h2>
          <p className="text-stone-500 text-xs">Monte sua sequência e ouça quantas vezes quiser</p>
        </div>
      </div>

      {/* Sequência montada */}
      <div className="bg-[#2A1A0E] rounded-2xl p-4 border border-[#8B6F47]/40 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-stone-300 text-sm font-semibold">Sua sequência</p>
          <div className="flex items-center gap-2 text-stone-500 text-xs">
            {sequence.length > 0 && <span>{totalDuration}s · {sequence.length} acorde{sequence.length !== 1 ? 's' : ''}</span>}
            {sequence.length > 0 && (
              <button onClick={() => setSequence([])} className="text-red-400/70 hover:text-red-400 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Slots de acordes */}
        <div className="flex flex-wrap gap-2 min-h-[52px] items-center">
          {sequence.length === 0 && (
            <p className="text-stone-600 text-sm italic">Toque nos acordes abaixo para adicionar...</p>
          )}
          {sequence.map((chord, i) => (
            <div
              key={i}
              className={`relative flex items-center gap-1 px-3 py-2 rounded-xl font-bold text-sm border transition-all duration-200 ${
                activeChordIndex === i
                  ? 'bg-[#D4AF37] text-[#1A0E05] border-[#D4AF37] scale-110 shadow-lg shadow-[#D4AF37]/30'
                  : 'bg-[#8B6F47]/30 text-[#D4AF37] border-[#8B6F47]/50'
              }`}
            >
              {i > 0 && <span className="text-stone-500 text-xs mr-1">–</span>}
              <span>{chord}</span>
              {!isPlaying && (
                <button
                  onClick={() => removeChord(i)}
                  className="ml-1 text-stone-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {sequence.length < 8 && sequence.length > 0 && !isPlaying && (
            <div className="px-3 py-2 rounded-xl border border-dashed border-[#8B6F47]/30 text-stone-600 text-xs">
              +
            </div>
          )}
        </div>

        {/* BPM */}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-stone-500 text-xs">BPM:</span>
            <input
              type="range"
              min={50}
              max={160}
              step={5}
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              className="flex-1 accent-[#D4AF37] h-1"
              disabled={isPlaying}
            />
            <span className="text-[#D4AF37] font-bold text-sm w-10 text-right">{bpm}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleLoopToggle}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              loop
                ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/60'
                : 'bg-transparent text-stone-500 border-stone-700/40 hover:border-stone-600'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Loop {loop ? 'ON' : 'OFF'}
            {isPlaying && loop && loopCount > 0 && <span className="text-[#D4AF37]/70">× {loopCount}</span>}
          </button>

          <Button
            onClick={handlePlay}
            disabled={sequence.length === 0}
            className={`flex-1 font-bold rounded-xl gap-2 py-4 ${
              isPlaying
                ? 'bg-red-700 hover:bg-red-800 text-white'
                : 'bg-[#8B6F47] hover:bg-[#6B5437] text-white disabled:opacity-40'
            }`}
          >
            {isPlaying
              ? <><Square className="w-4 h-4" />Parar</>
              : <><Play className="w-4 h-4" />Ouvir Cadência</>
            }
          </Button>
        </div>
      </div>

      {/* Presets */}
      <div className="bg-[#1E1008] rounded-2xl p-4 border border-[#8B6F47]/20 space-y-3">
        <p className="text-stone-400 text-xs uppercase tracking-widest font-semibold flex items-center gap-2">
          <Shuffle className="w-3.5 h-3.5" /> Cadências Prontas
        </p>
        <div className="grid grid-cols-1 gap-2">
          {PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => loadPreset(preset)}
              disabled={isPlaying}
              className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#8B6F47]/25 bg-[#2A1A0E] hover:border-[#D4AF37]/40 hover:bg-[#8B6F47]/10 transition-all disabled:opacity-40"
            >
              <div>
                <span className="text-stone-200 text-sm font-semibold">{preset.label}</span>
                <span className="text-stone-500 text-xs ml-2">{preset.desc}</span>
              </div>
              <div className="flex gap-1">
                {preset.chords.map((c, j) => (
                  <span key={j} className="text-[#D4AF37]/80 text-xs font-bold bg-[#8B6F47]/20 px-1.5 py-0.5 rounded">
                    {c}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Teclado de acordes */}
      <div className="bg-[#1E1008] rounded-2xl p-4 border border-[#8B6F47]/20 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-stone-400 text-xs uppercase tracking-widest font-semibold flex items-center gap-2">
            <Music className="w-3.5 h-3.5" /> Adicionar Acordes
          </p>
          <span className="text-stone-600 text-xs">{sequence.length}/8</span>
        </div>

        {CHORD_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-stone-600 text-xs mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.chords.map(chord => (
                <button
                  key={chord}
                  onClick={() => addChord(chord)}
                  disabled={sequence.length >= 8 || isPlaying}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold bg-[#2A1A0E] text-stone-300 border border-[#8B6F47]/30 hover:bg-[#8B6F47]/30 hover:text-[#D4AF37] hover:border-[#8B6F47] transition-all active:scale-95 disabled:opacity-30"
                >
                  {chord}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}