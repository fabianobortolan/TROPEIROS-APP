import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Play, Square, ChevronLeft, ChevronRight, BarChart2, RefreshCw, Shuffle, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChordAudio } from './useChordAudio';
import { useExerciseEngine } from './useExerciseEngine';
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PracticeMode({ songs, progressions, challengeMode = false, onBack }) {
  const { allExercises, generateOptions } = useExerciseEngine(songs, progressions);

  // Filtrar apenas músicas da biblioteca
  const exercises = React.useMemo(() => {
    const fromLib = allExercises.filter(e => e.sourceType === 'song');
    return fromLib.length > 0 ? fromLib : allExercises;
  }, [allExercises]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastAnswer, setLastAnswer] = useState(null);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const { playProgression, stop, getProgressionDuration } = useChordAudio();
  const playbackAudioRef = useRef(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);

  const currentExercise = exercises[currentIndex];
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  useEffect(() => {
    if (currentExercise) {
      setOptions(generateOptions(currentExercise));
      setAnswered(false);
      setLastAnswer(null);
      setPlayCount(0);
      stop();
      setIsPlaying(false);
      // Para o playback independente também
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
        playbackAudioRef.current = null;
      }
      setPlaybackPlaying(false);
    }
  }, [currentIndex, exercises]);

  const handlePlay = async () => {
    if (isPlaying) {
      stop();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    setPlayCount(c => c + 1);
    const bpm = currentExercise.bpm || 80;
    const duration = getProgressionDuration(currentExercise.chords, bpm);
    await playProgression(currentExercise.chords, bpm);
    setTimeout(() => setIsPlaying(false), duration);
  };

  const handleTogglePlayback = () => {
    if (playbackPlaying) {
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
        playbackAudioRef.current.currentTime = 0;
        playbackAudioRef.current = null;
      }
      setPlaybackPlaying(false);
    } else {
      const audio = new Audio(currentExercise.playbackUrl);
      audio.volume = 0.8;
      audio.addEventListener('ended', () => setPlaybackPlaying(false));
      audio.play().catch(() => {});
      playbackAudioRef.current = audio;
      setPlaybackPlaying(true);
    }
  };

  const handleAnswer = useCallback((value) => {
    if (answered) return;
    setLastAnswer(value);
    setAnswered(true);
    const isCorrect = value === currentExercise.correctAnswer;
    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    setHistory(h => [...h, { exercise: currentExercise, answer: value, correct: isCorrect }]);
  }, [answered, currentExercise]);

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleSkip = () => {
    stop();
    setIsPlaying(false);
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    setPlaybackPlaying(false);
    const nextIdx = currentIndex < exercises.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(nextIdx);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setScore({ correct: 0, total: 0 });
    setHistory([]);
    setShowHistory(false);
    setAnswered(false);
    setLastAnswer(null);
  };

  if (!currentExercise) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-[#D4AF37] font-bold text-lg">{challengeMode ? 'Modo Desafio' : 'Modo Prática'}</h2>
        </div>
        <div className="bg-[#2A1A0E] rounded-2xl p-10 text-center border border-[#8B6F47]/30 space-y-3">
          <p className="text-stone-400">Nenhuma música com progressões na biblioteca.</p>
          <p className="text-stone-500 text-sm">Analise músicas na biblioteca para gerar exercícios.</p>
          <Button onClick={onBack} variant="outline" className="border-[#8B6F47]/40 text-stone-300">Voltar</Button>
        </div>
      </div>
    );
  }

  const isCorrect = answered && lastAnswer === currentExercise.correctAnswer;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-[#D4AF37] font-bold text-lg">{challengeMode ? 'Modo Desafio' : 'Modo Prática'}</h2>
            <p className="text-stone-400 text-xs">Exercício {currentIndex + 1} de {exercises.length}</p>
          </div>
        </div>
        {/* Score */}
        <div className="text-right">
          <p className={`text-xl font-bold ${accuracy >= 70 ? 'text-green-400' : accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {score.correct}/{score.total}
          </p>
          <p className="text-stone-500 text-xs">{accuracy}% acertos</p>
        </div>
      </div>

      {/* Card do exercício */}
      <div className="bg-[#2A1A0E] rounded-2xl p-5 border border-[#8B6F47]/40 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-widest mb-1">
              🎵 {currentExercise.songTitle || 'Biblioteca'}
              {currentExercise.songArtist && <span className="text-stone-500 normal-case ml-1">· {currentExercise.songArtist}</span>}
            </p>
            <p className="text-stone-400 text-sm">
              Tom: <span className="text-stone-200 font-medium">{currentExercise.key || '?'}</span>
              {currentExercise.section && <> · <span className="text-stone-400">{currentExercise.section}</span></>}
            </p>
            <p className="text-stone-500 text-xs mt-1">
              {currentExercise.chords.length} acordes na progressão
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 ml-2">
            <Badge className={`text-xs px-2 py-1 flex-shrink-0 ${
              currentExercise.difficulty === 'facil' ? 'bg-green-800 text-green-200' :
              currentExercise.difficulty === 'medio' ? 'bg-yellow-800 text-yellow-200' :
              'bg-red-800 text-red-200'
            }`}>
              {currentExercise.difficulty === 'facil' ? 'Fácil' : currentExercise.difficulty === 'medio' ? 'Médio' : 'Difícil'}
            </Badge>
            {!answered && (
              <button
                onClick={handleSkip}
                title="Trocar música"
                className="flex items-center gap-1 text-stone-500 hover:text-[#D4AF37] transition-colors text-xs"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Trocar</span>
              </button>
            )}
          </div>
        </div>

        {/* Trecho da letra — visível sempre (contexto para o aluno) */}
        {currentExercise.lyricSnippet && !answered && (
          <div className="bg-black/20 rounded-xl p-3 border border-[#8B6F47]/20">
            <p className="text-stone-400 text-xs mb-1 uppercase tracking-wider">🎤 Trecho da letra:</p>
            <p className="text-stone-200 text-sm italic leading-relaxed whitespace-pre-line">
              "{currentExercise.lyricSnippet}"
            </p>
          </div>
        )}

        {/* Acordes + trecho da letra revelados após resposta */}
        {answered && (
          <div className="bg-black/30 rounded-xl p-3 border border-[#8B6F47]/20 space-y-3">
            <div>
              <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider">Progressão:</p>
              <div className="flex flex-wrap gap-2">
                {currentExercise.chords.map((chord, i) => (
                  <span key={i} className="bg-[#8B6F47]/30 text-[#D4AF37] font-bold px-3 py-1 rounded-lg text-sm border border-[#8B6F47]/40">
                    {chord}
                  </span>
                ))}
              </div>
              {currentExercise.pattern && (
                <p className="text-stone-500 text-xs mt-2">Padrão: <span className="text-[#D4AF37]">{currentExercise.pattern}</span></p>
              )}
            </div>
            {currentExercise.lyricSnippet && (
              <div className="border-t border-[#8B6F47]/20 pt-3">
                <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider">🎤 Trecho da letra:</p>
                <p className="text-stone-200 text-sm italic leading-relaxed whitespace-pre-line">
                  "{currentExercise.lyricSnippet}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Controles de áudio — separados e independentes */}
        <div className="flex flex-col gap-2">
          {/* 1. Progressão sintetizada */}
          <Button
            onClick={handlePlay}
            className={`w-full py-5 font-bold text-base rounded-xl gap-2 ${
              isPlaying ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-[#8B6F47] hover:bg-[#6B5437] text-white'
            }`}
          >
            {isPlaying
              ? <><Square className="w-5 h-5" />Parar Progressão</>
              : <><Play className="w-5 h-5" />{playCount > 0 ? 'Ouvir Progressão Novamente' : 'Ouvir Progressão'}</>
            }
          </Button>

          {/* 2. Playback da música — independente, só se disponível */}
          {currentExercise.playbackUrl && (
            <Button
              onClick={handleTogglePlayback}
              className={`w-full py-3 font-semibold text-sm rounded-xl gap-2 ${
                playbackPlaying
                  ? 'bg-red-900/60 hover:bg-red-900 text-red-300 border border-red-700/50'
                  : 'bg-[#1A1A2E] hover:bg-[#12122A] text-blue-300 border border-blue-800/50'
              }`}
            >
              {playbackPlaying
                ? <><Square className="w-4 h-4" />Parar Playback da Música</>
                : <><Music2 className="w-4 h-4" />Tocar Playback da Música</>
              }
            </Button>
          )}

          {currentExercise.playbackUrl && (
            <p className="text-stone-600 text-xs text-center">
              🎵 Playback e progressão são independentes — ouça separado para comparar
            </p>
          )}
        </div>
      </div>

      {/* Opções de resposta */}
      {playCount > 0 && !answered && (
        <div className="space-y-2">
          <p className="text-stone-300 text-sm font-medium text-center">
            {challengeMode ? '🎯 Qual progressão você ouviu?' : '🎧 Identifique a progressão:'}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt.value)}
                className="w-full text-left px-4 py-3 rounded-xl border border-[#8B6F47]/40 bg-[#2A1A0E] text-stone-200 hover:bg-[#8B6F47]/20 hover:border-[#D4AF37] transition-all duration-200 font-medium text-sm"
              >
                <span className="text-[#D4AF37] font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                <span className="font-bold">{opt.progressionName}</span>
                {!challengeMode && opt.pattern && <span className="text-stone-400 ml-2 text-xs">{opt.pattern}</span>}
              </button>
            ))}
          </div>
          {!challengeMode && (
            <p className="text-stone-600 text-xs text-center">Ouça quantas vezes precisar antes de responder</p>
          )}
        </div>
      )}

      {playCount === 0 && !answered && (
        <p className="text-stone-500 text-sm text-center animate-pulse">👆 Clique em "Ouvir Progressão" para começar</p>
      )}

      {/* Resultado após resposta */}
      {answered && (
        <div className={`rounded-xl p-4 text-center font-bold border ${
          isCorrect ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-red-900/40 text-red-300 border-red-700'
        }`}>
          {isCorrect ? (
            <span>✅ Correto! Excelente ouvido!</span>
          ) : (
            <span>❌ Era: <span className="text-white">{currentExercise.correctAnswer}</span><br />
              <span className="text-sm font-normal text-red-300/80">Você respondeu: {lastAnswer}</span>
            </span>
          )}
        </div>
      )}

      {/* Próximo */}
      {answered && (
        <Button
          onClick={handleNext}
          className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-[#1A0E05] font-bold py-5 rounded-xl text-base gap-2"
        >
          {currentIndex < exercises.length - 1 ? 'Próximo Exercício' : 'Reiniciar'}
          <ChevronRight className="w-5 h-5" />
        </Button>
      )}

      {/* Histórico */}
      {score.total > 0 && (
        <div className="flex gap-2">
          <Button variant="outline"
            className="flex-1 border-[#8B6F47]/40 text-stone-400 hover:bg-[#8B6F47]/20 text-sm gap-2"
            onClick={() => setShowHistory(s => !s)}>
            <BarChart2 className="w-4 h-4" />{showHistory ? 'Ocultar' : 'Ver'} Histórico
          </Button>
          <Button variant="outline"
            className="border-[#8B6F47]/40 text-stone-400 hover:bg-red-900/30 hover:text-red-300 text-sm gap-2"
            onClick={handleReset}>
            <RefreshCw className="w-4 h-4" /> Resetar
          </Button>
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div className="bg-[#2A1A0E] rounded-2xl p-4 border border-[#8B6F47]/30 space-y-2">
          <p className="text-stone-300 font-semibold text-sm mb-3">Histórico da Sessão</p>
          {history.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-xs border-b border-[#8B6F47]/20 pb-2">
              <div>
                <span>{h.correct ? '✅' : '❌'}</span>
                <span className="text-stone-300 ml-2">{h.exercise.progressionName}</span>
                {h.exercise.songTitle && <span className="text-stone-500 ml-1">· {h.exercise.songTitle}</span>}
              </div>
              {!h.correct && <span className="text-stone-500">Resp: {h.answer}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}