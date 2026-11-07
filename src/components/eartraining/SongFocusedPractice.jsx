import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ArrowLeft, Search, Music2, Play, Square, ChevronRight, RefreshCw, CheckCircle, XCircle, Shuffle } from 'lucide-react';
import { useChordAudio } from './useChordAudio';
import { base44 } from '@/api/base44Client';
import PlaybackSections from './PlaybackSections';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Tela de seleção de música ─────────────────────────────────────
function SongSelector({ songs, onSelect, onBack }) {
  const [search, setSearch] = useState('');

  const filtered = songs
    .filter(s => s.progressions?.length > 0)
    .filter(s => {
      const q = search.toLowerCase();
      return !q || s.title?.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q);
    })
    .slice(0, 50);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-300" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-[#D4AF37]">Treino por Música</h2>
          <p className="text-stone-400 text-xs">Escolha uma música para treinar suas progressões</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          type="text"
          placeholder="Buscar por título ou artista..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#2A1A0E] border border-[#8B6F47]/40 rounded-xl pl-10 pr-4 py-3 text-stone-200 placeholder-stone-500 text-sm focus:outline-none focus:border-[#D4AF37]/60"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-stone-500 text-sm">
          {search ? 'Nenhuma música encontrada.' : 'Nenhuma música com progressões na biblioteca.'}
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map(song => (
            <button
              key={song.id}
              onClick={() => onSelect(song)}
              className="w-full text-left bg-[#2A1A0E] border border-[#8B6F47]/30 rounded-xl px-4 py-3 hover:border-[#D4AF37]/50 hover:bg-[#3A2A1E] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-stone-100 font-semibold text-sm group-hover:text-[#D4AF37] transition-colors">{song.title}</p>
                  <p className="text-stone-500 text-xs">{song.artist}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-[#8B6F47]/30 text-[#D4AF37] px-2 py-0.5 rounded-full">
                    {song.progressions.length} progressões
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-[#D4AF37] transition-colors" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tela de seleção de progressões ───────────────────────────────


// ── Tela de prática focada em 1 música ───────────────────────────
function FocusedSession({ song, selectedProgressions, progressions, onBack, onChangeSong }) {
  // Gera os exercícios a partir das progressões selecionadas
  const exercises = React.useMemo(() => {
    const allProgs = song.progressions || [];
    return (selectedProgressions || []).map(p => ({
      chords: p.chords,
      key: p.key || song.main_key || '?',
      section: p.section || '',
      progressionName: p.progression_name,
      pattern: p.pattern || '',
      bpm: song.tempo || 80,
      playbackUrl: song.playback_url || song.audio_url || null,
      originalIdx: allProgs.indexOf(p),
    }));
  }, [selectedProgressions, song]);

  // Pool de distratores: outros nomes de progressões
  const distractorPool = React.useMemo(() => {
    const names = new Set(exercises.map(e => e.progressionName));
    progressions?.forEach(p => { if (p.name) names.add(p.name); });
    return [...names];
  }, [exercises, progressions]);

  function generateOptions(correctName) {
    const others = distractorPool.filter(n => n !== correctName);
    const picks = shuffleArray(others).slice(0, 3);
    const fallbacks = ['Harmônica', 'Quadradinho', 'Progressão Terra', 'Dois Acordes'];
    let fi = 0;
    while (picks.length < 3 && fi < fallbacks.length) {
      const fb = fallbacks[fi++];
      if (!picks.includes(fb) && fb !== correctName) picks.push(fb);
    }
    return shuffleArray([correctName, ...picks]);
  }

  const [idx, setIdx] = useState(0);
  const [options, setOptions] = useState(() => generateOptions(exercises[0]?.progressionName || ''));
  const [playCount, setPlayCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const playbackRef = useRef(null);

  const { playProgression, stop, getProgressionDuration } = useChordAudio();

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  const handleSaveTimestamps = useCallback(async (updatedProgressions) => {
    await base44.entities.Song.update(song.id, { progressions: updatedProgressions });
  }, [song.id]);

  // Para o áudio ao desmontar o componente (sair da página)
  useEffect(() => {
    return () => { stop(); };
  }, []);

  const current = exercises[idx];

  const goTo = useCallback((newIdx) => {
    stop();
    setIsPlaying(false);
    setAnswered(false);
    setSelected(null);
    setPlayCount(0);
    const ex = exercises[newIdx];
    if (ex) setOptions(generateOptions(ex.progressionName));
    setIdx(newIdx);
    // Tenta tocar a seção correspondente no playback; se não houver timestamp, toca synth
    if (ex) {
      const played = playbackRef.current?.playSection(ex.originalIdx);
      if (!played) {
        setPlayCount(1);
        setIsPlaying(true);
        const dur = getProgressionDuration(ex.chords, ex.bpm);
        playProgression(ex.chords, ex.bpm);
        setTimeout(() => setIsPlaying(false), dur);
      }
    }
  }, [exercises, stop, playProgression, getProgressionDuration]);

  const handlePlay = async () => {
    if (isPlaying) { stop(); setIsPlaying(false); return; }
    setIsPlaying(true);
    setPlayCount(c => c + 1);
    const dur = getProgressionDuration(current.chords, current.bpm);
    await playProgression(current.chords, current.bpm);
    setTimeout(() => setIsPlaying(false), dur);
  };

  const handleAnswer = (opt) => {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
    const correct = opt === current.progressionName;
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  if (!current) {
    return (
      <div className="space-y-4 text-center py-10">
        <p className="text-stone-400">Esta música não tem progressões catalogadas.</p>
        <button onClick={onBack} className="text-[#D4AF37] text-sm underline">Escolher outra música</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-300" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[#D4AF37] font-bold text-base truncate">{song.title}</h2>
          <p className="text-stone-400 text-xs truncate">{song.artist}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-lg ${accuracy >= 70 ? 'text-green-400' : accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {score.correct}/{score.total}
          </p>
          <p className="text-stone-500 text-xs">{accuracy}%</p>
        </div>
      </div>

      {/* Progresso — clicável */}
      <div className="flex gap-1">
        {exercises.map((ex, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            title={ex.section || `Progressão ${i + 1}`}
            className={`h-2 flex-1 rounded-full transition-all duration-150 hover:scale-y-150 hover:opacity-100 ${
              i < idx ? 'bg-[#D4AF37]' : i === idx ? 'bg-[#8B6F47]' : 'bg-stone-700 opacity-50'
            }`}
          />
        ))}
      </div>

      {/* Card exercício */}
      <div className="bg-[#2A1A0E] rounded-2xl p-5 border border-[#8B6F47]/40 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wider">
              {current.section || 'Progressão'} · Tom: <span className="text-stone-200">{current.key}</span>
            </p>
            <p className="text-stone-500 text-xs mt-0.5">{current.chords.length} acordes</p>
          </div>
          <button onClick={() => goTo(idx < exercises.length - 1 ? idx + 1 : 0)}
            className="flex items-center gap-1 text-stone-500 hover:text-[#D4AF37] text-xs transition-colors">
            <Shuffle className="w-3.5 h-3.5" /> Trocar
          </button>
        </div>

        {/* Acordes revelados após resposta */}
        {answered && (
          <div className="bg-black/30 rounded-xl p-3 border border-[#8B6F47]/20">
            <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider">Progressão:</p>
            <div className="flex flex-wrap gap-2">
              {current.chords.map((chord, i) => (
                <span key={i} className="bg-[#8B6F47]/30 text-[#D4AF37] font-bold px-3 py-1 rounded-lg text-sm border border-[#8B6F47]/40">{chord}</span>
              ))}
            </div>
            {current.pattern && <p className="text-stone-500 text-xs mt-2">Padrão: <span className="text-[#D4AF37]">{current.pattern}</span></p>}
          </div>
        )}

        {/* Botões de áudio */}
        <div className="flex flex-col gap-2">
          {current.playbackUrl && (
            <PlaybackSections
              ref={playbackRef}
              song={song}
              isAdmin={isAdmin}
              onSaveTimestamps={handleSaveTimestamps}
            />
          )}
        </div>
      </div>

      {/* Opções */}
      {!answered && (
        <div className="space-y-2">
          <p className="text-stone-300 text-sm text-center">Qual é a progressão?</p>
          <div className="grid grid-cols-1 gap-2">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="w-full text-left px-4 py-3 rounded-xl border border-[#8B6F47]/40 bg-[#2A1A0E] text-stone-200 hover:bg-[#8B6F47]/20 hover:border-[#D4AF37] transition-all text-sm font-medium"
              >
                <span className="text-[#D4AF37] font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}



      {/* Resultado */}
      {answered && (
        <div className={`rounded-xl p-4 text-center font-bold border ${
          selected === current.progressionName ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-red-900/40 text-red-300 border-red-700'
        }`}>
          {selected === current.progressionName
            ? <span className="flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />Correto!</span>
            : <span>
                <span className="flex items-center justify-center gap-2 mb-1"><XCircle className="w-5 h-5" />Incorreto</span>
                <span className="text-sm font-normal">Era: <span className="text-white font-bold">{current.progressionName}</span></span>
              </span>
          }
        </div>
      )}

      {/* Próximo / Trocar música */}
      {answered && (
        <div className="flex gap-2">
          <button
            onClick={() => goTo(idx < exercises.length - 1 ? idx + 1 : 0)}
            className="flex-1 py-4 rounded-xl bg-[#D4AF37] hover:bg-[#B8962E] text-[#1A0E05] font-bold text-sm flex items-center justify-center gap-2"
          >
            {idx < exercises.length - 1 ? 'Próxima Progressão' : 'Reiniciar Música'}
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onChangeSong}
            className="px-4 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 transition-colors"
            title="Escolher outra música"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Componente raiz ───────────────────────────────────────────────
export default function SongFocusedPractice({ songs, progressions, onBack }) {
  const [selectedSong, setSelectedSong] = useState(null);

  if (!selectedSong) {
    return <SongSelector songs={songs} onSelect={setSelectedSong} onBack={onBack} />;
  }

  return (
    <FocusedSession
      song={selectedSong}
      selectedProgressions={(selectedSong.progressions || []).filter(p => p.chords?.length >= 2 && p.progression_name)}
      progressions={progressions}
      onBack={() => setSelectedSong(null)}
      onChangeSong={() => setSelectedSong(null)}
    />
  );
}