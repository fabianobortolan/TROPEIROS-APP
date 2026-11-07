import React, { useState, useRef, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, RotateCcw, CheckCircle2, XCircle, Trophy,
  Music, Volume2, ChevronRight, Star, SkipForward, Lightbulb, Timer
} from "lucide-react";

// Embaralha array
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Gera opções de resposta (correta + 3 distratores)
function buildOptions(correct, allProgressions) {
  const others = allProgressions
    .filter(p => p !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  return shuffle([correct, ...others]);
}

export default function HarmonicDictation() {
  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: progressions = [] } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  // Retorna a URL de áudio disponível: prefere audio_url, cai para playback_url
  const getAudioUrl = (song) => song.audio_url || song.playback_url || null;

  // Músicas válidas: têm áudio ou playback e progressão predominante
  const validSongs = useMemo(() =>
    songs.filter(s => (s.audio_url || s.playback_url) && s.predominant_progression),
    [songs]
  );

  // Todas as progressões conhecidas (nomes)
  const allProgressionNames = useMemo(() => {
    const fromSongs = songs.map(s => s.predominant_progression).filter(Boolean);
    const fromDB = progressions.map(p => p.name).filter(Boolean);
    return [...new Set([...fromSongs, ...fromDB])];
  }, [songs, progressions]);

  // Estado do jogo
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0, total: 0 });
  const [gamePhase, setGamePhase] = useState("idle"); // idle | playing | result
  const [playCount, setPlayCount] = useState(0);
  const [difficulty, setDifficulty] = useState("medio"); // facil | medio | dificil

  const audioRef = useRef(null);

  const currentSong = queue[currentIdx];

  // Iniciar jogo
  const startGame = () => {
    if (validSongs.length === 0) return;
    const shuffled = shuffle(validSongs).slice(0, 10);
    setQueue(shuffled);
    setCurrentIdx(0);
    setScore({ correct: 0, wrong: 0, total: 0 });
    setSelected(null);
    setShowHint(false);
    setPlayCount(0);
    setGamePhase("playing");
  };

  // Quando muda a música atual, gera novas opções
  useEffect(() => {
    if (!currentSong || gamePhase !== "playing") return;
    const opts = buildOptions(currentSong.predominant_progression, allProgressionNames);
    setOptions(opts);
    setSelected(null);
    setShowHint(false);
    setPlayCount(0);
    stopAudio();
  }, [currentIdx, currentSong, gamePhase]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const [audioError, setAudioError] = useState(null);

  const playAudio = () => {
    const url = getAudioUrl(currentSong);
    if (!url) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    setAudioError(null);

    if (!audioRef.current || audioRef.current.src !== url) {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        setAudioError("Não foi possível carregar o áudio desta música.");
      };
    }

    const maxDuration = difficulty === "facil" ? 999 : difficulty === "medio" ? 30 : 15;
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
        setPlayCount(p => p + 1);
        if (difficulty !== "facil") {
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
          }, maxDuration * 1000);
        }
      })
      .catch(() => {
        setIsPlaying(false);
        setAudioError("Erro ao reproduzir o áudio. Verifique a URL do arquivo.");
      });
  };

  const handleAnswer = (option) => {
    if (selected) return;
    stopAudio();
    setSelected(option);
    const isCorrect = option === currentSong.predominant_progression;
    setScore(s => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      wrong: s.wrong + (isCorrect ? 0 : 1),
      total: s.total + 1
    }));
  };

  const nextSong = () => {
    stopAudio();
    if (currentIdx + 1 >= queue.length) {
      setGamePhase("result");
    } else {
      setCurrentIdx(i => i + 1);
    }
  };

  const maxPlays = difficulty === "facil" ? 5 : difficulty === "medio" ? 3 : 2;

  // Cleanup audio on unmount
  useEffect(() => () => stopAudio(), []);

  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  const difficultyConfig = {
    facil: { label: "Fácil", color: "bg-green-100 text-green-700 border-green-200", desc: "Ouça à vontade, sem limite de tempo" },
    medio: { label: "Médio", color: "bg-yellow-100 text-yellow-700 border-yellow-200", desc: "30 segundos por tentativa, até 3 plays" },
    dificil: { label: "Difícil", color: "bg-red-100 text-red-700 border-red-200", desc: "15 segundos por tentativa, até 2 plays" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] to-[#E8DCC4] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-[#8B6F47] to-[#D4AF37] rounded-xl flex items-center justify-center shadow-lg">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#8B6F47]">Ditado Harmônico</h1>
              <p className="text-sm text-[#A68A64]">Ouça a música e identifique a progressão harmônica</p>
            </div>
          </div>
        </motion.div>

        {/* IDLE - Tela inicial */}
        {gamePhase === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {validSongs.length === 0 ? (
              <Card className="border-[#D4C5B0] bg-white/80 text-center p-8">
                <Music className="w-12 h-12 text-[#A68A64] mx-auto mb-3" />
                <h3 className="font-bold text-[#8B6F47] text-lg mb-2">Nenhuma música disponível</h3>
                <p className="text-sm text-[#A68A64] mb-3">
                  Para jogar, suas músicas precisam ter <strong>áudio ou playback</strong> e <strong>progressão predominante</strong> definida.
                </p>
                <div className="text-xs text-left bg-[#F5F1E8] rounded-xl p-3 space-y-1 text-[#8B6F47]">
                  <p>📊 Total de músicas: <strong>{songs.length}</strong></p>
                  <p>🎵 Com áudio/playback: <strong>{songs.filter(s => s.audio_url || s.playback_url).length}</strong></p>
                  <p>🎯 Com progressão definida: <strong>{songs.filter(s => s.predominant_progression).length}</strong></p>
                  <p>✅ Prontas para jogar: <strong>{validSongs.length}</strong></p>
                </div>
                <p className="text-xs text-[#A68A64] mt-3">
                  Vá à Biblioteca, abra uma música e execute a análise harmônica para definir a progressão predominante.
                </p>
              </Card>
            ) : (
              <>
                <Card className="border-[#D4C5B0] bg-white/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#8B6F47] text-base flex items-center gap-2">
                      <Volume2 className="w-4 h-4" /> Como funciona
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-[#A68A64] space-y-2">
                    <p>🎵 Uma música do seu repertório será tocada.</p>
                    <p>🎯 Ouça e identifique a <strong>progressão harmônica predominante</strong>.</p>
                    <p>✅ Escolha entre 4 opções. Acumule pontos!</p>
                    <p>📊 São 10 músicas por rodada.</p>
                  </CardContent>
                </Card>

                <Card className="border-[#D4C5B0] bg-white/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#8B6F47] text-base">Dificuldade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(difficultyConfig).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => setDifficulty(key)}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${difficulty === key ? cfg.color + ' border-current shadow-md' : 'border-[#D4C5B0] text-[#A68A64] hover:border-[#8B6F47]'}`}
                        >
                          <p className="font-bold text-sm">{cfg.label}</p>
                          <p className="text-[10px] mt-1 leading-tight">{cfg.desc}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between text-sm text-[#A68A64] px-1">
                  <span>🎵 {validSongs.length} músicas disponíveis (áudio ou playback)</span>
                </div>

                <Button
                  onClick={startGame}
                  className="w-full h-14 text-lg bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] text-white hover:opacity-90 shadow-xl rounded-2xl"
                >
                  <Play className="w-5 h-5 mr-2" /> Iniciar Ditado
                </Button>
              </>
            )}
          </motion.div>
        )}

        {/* PLAYING - Jogo */}
        {gamePhase === "playing" && currentSong && (
          <motion.div key={currentIdx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* Progresso */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#A68A64]">
                Música {currentIdx + 1} de {queue.length}
              </span>
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> {score.correct}
                </span>
                <span className="flex items-center gap-1 text-red-500 font-bold">
                  <XCircle className="w-4 h-4" /> {score.wrong}
                </span>
              </div>
            </div>
            <div className="w-full bg-[#D4C5B0] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentIdx) / queue.length) * 100}%` }}
              />
            </div>

            {/* Card da música */}
            <Card className="border-[#D4C5B0] bg-white/90 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={playAudio}
                    disabled={!selected && playCount >= maxPlays}
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                      isPlaying
                        ? 'bg-gradient-to-br from-red-400 to-red-600 scale-95'
                        : 'bg-gradient-to-br from-[#8B6F47] to-[#D4AF37] hover:scale-105'
                    } ${(!selected && playCount >= maxPlays) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white" />}
                  </button>
                  <div>
                    {selected ? (
                      <>
                        <p className="font-bold text-[#8B6F47] text-lg">{currentSong.title}</p>
                        <p className="text-sm text-[#A68A64]">{currentSong.artist}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-[#8B6F47] text-lg">🎵 Música mistério</p>
                        <p className="text-sm text-[#A68A64]">Toque e identifique a progressão</p>
                      </>
                    )}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge className="text-[10px] bg-[#8B6F47]/10 text-[#8B6F47]">
                        {playCount}/{maxPlays} plays
                      </Badge>
                      {difficulty !== "facil" && (
                        <Badge className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37]">
                          {difficulty === "medio" ? "30s" : "15s"} por play
                        </Badge>
                      )}
                      {!currentSong.audio_url && currentSong.playback_url && (
                        <Badge className="text-[10px] bg-blue-100 text-blue-600">
                          Playback
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Erro de áudio */}
                {audioError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" /> {audioError}
                  </div>
                )}

                {/* Dica */}
                {!selected && (
                  <div className="mb-4">
                    {showHint ? (
                      <div className="p-3 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/30 text-sm text-[#8B6F47]">
                        <p>🎵 Tom: <strong>{currentSong.main_key || "?"}</strong></p>
                        {currentSong.genre_style && <p>🎸 Estilo: <strong>{currentSong.genre_style.replace(/_/g, ' ')}</strong></p>}
                        {currentSong.rhythm_name && <p>🥁 Ritmo: <strong>{currentSong.rhythm_name}</strong></p>}
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowHint(true)}
                        className="flex items-center gap-1 text-xs text-[#A68A64] hover:text-[#8B6F47] transition-colors"
                      >
                        <Lightbulb className="w-3 h-3" /> Ver dica (tom e estilo)
                      </button>
                    )}
                  </div>
                )}

                {/* Opções */}
                <div className="grid grid-cols-2 gap-3">
                  {options.map((opt, i) => {
                    const isCorrect = opt === currentSong.predominant_progression;
                    const isSelected = opt === selected;
                    let cls = "p-4 rounded-xl border-2 text-left transition-all text-sm font-semibold ";

                    if (!selected) {
                      cls += "border-[#D4C5B0] bg-[#F5F1E8] hover:border-[#8B6F47] hover:bg-[#8B6F47]/5 cursor-pointer";
                    } else if (isCorrect) {
                      cls += "border-green-400 bg-green-50 text-green-700";
                    } else if (isSelected && !isCorrect) {
                      cls += "border-red-400 bg-red-50 text-red-600";
                    } else {
                      cls += "border-[#D4C5B0] bg-[#F5F1E8] opacity-50";
                    }

                    return (
                      <motion.button
                        key={opt}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={cls}
                        onClick={() => handleAnswer(opt)}
                        disabled={!!selected}
                      >
                        <span className="text-xs text-[#A68A64] font-normal block mb-0.5">Opção {i + 1}</span>
                        {opt}
                        {selected && isCorrect && <CheckCircle2 className="inline w-4 h-4 ml-1 text-green-500" />}
                        {selected && isSelected && !isCorrect && <XCircle className="inline w-4 h-4 ml-1 text-red-500" />}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Resultado da resposta */}
                <AnimatePresence>
                  {selected && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 p-4 rounded-xl border ${
                        selected === currentSong.predominant_progression
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      {selected === currentSong.predominant_progression ? (
                        <p className="text-green-700 font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" /> Correto! 🎉
                        </p>
                      ) : (
                        <div>
                          <p className="text-red-600 font-bold flex items-center gap-2 mb-1">
                            <XCircle className="w-5 h-5" /> Incorreto
                          </p>
                          <p className="text-sm text-[#8B6F47]">
                            A progressão correta era: <strong>{currentSong.predominant_progression}</strong>
                          </p>
                        </div>
                      )}
                      {currentSong.predominant_progression_pattern && (
                        <p className="text-xs text-[#A68A64] mt-1">
                          Pattern: <span className="font-mono">{currentSong.predominant_progression_pattern}</span>
                        </p>
                      )}

                      <Button
                        onClick={nextSong}
                        className="mt-3 w-full bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                      >
                        {currentIdx + 1 >= queue.length ? (
                          <><Trophy className="w-4 h-4 mr-2" /> Ver Resultado</>
                        ) : (
                          <><ChevronRight className="w-4 h-4 mr-2" /> Próxima Música</>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pular */}
                {!selected && (
                  <button
                    onClick={nextSong}
                    className="mt-4 text-xs text-[#A68A64] hover:text-[#8B6F47] flex items-center gap-1 mx-auto"
                  >
                    <SkipForward className="w-3 h-3" /> Pular esta música
                  </button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* RESULT */}
        {gamePhase === "result" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <Card className="border-[#D4C5B0] bg-white/90 shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-[#8B6F47] mb-1">Rodada Concluída!</h2>
                <p className="text-[#A68A64] mb-6">
                  Dificuldade: <strong>{difficultyConfig[difficulty].label}</strong>
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                    <p className="text-3xl font-bold text-green-600">{score.correct}</p>
                    <p className="text-xs text-green-600 mt-1">Corretas</p>
                  </div>
                  <div className="p-4 bg-[#D4AF37]/10 rounded-2xl border border-[#D4AF37]/20">
                    <p className="text-3xl font-bold text-[#8B6F47]">{pct}%</p>
                    <p className="text-xs text-[#A68A64] mt-1">Acerto</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <p className="text-3xl font-bold text-red-500">{score.wrong}</p>
                    <p className="text-xs text-red-500 mt-1">Erradas</p>
                  </div>
                </div>

                {/* Medalha */}
                <div className={`p-3 rounded-xl mb-6 ${
                  pct >= 90 ? 'bg-[#D4AF37]/20' : pct >= 70 ? 'bg-[#9CAF88]/20' : 'bg-[#A68A64]/10'
                }`}>
                  <p className="font-bold text-[#8B6F47] text-lg">
                    {pct >= 90 ? '🏆 Excelente! Ouvido de ouro!' :
                     pct >= 70 ? '🥈 Muito bom! Continue praticando!' :
                     pct >= 50 ? '🥉 Bom começo! A prática leva à perfeição.' :
                     '🎸 Continue ouvindo e praticando!'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={startGame}
                    className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] text-white"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Jogar Novamente
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setGamePhase("idle")}
                    className="flex-1 border-[#8B6F47] text-[#8B6F47]"
                  >
                    Alterar Dificuldade
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}