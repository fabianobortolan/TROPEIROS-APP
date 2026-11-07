import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, Music, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChordAudio } from './useChordAudio';

export default function ExercisePlayer({ exercise, onAnswer, showResult, lastAnswer }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const { playProgression, stop } = useChordAudio();

  useEffect(() => {
    return () => stop();
  }, [exercise]);

  const handlePlay = async () => {
    if (isPlaying) {
      stop();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    setPlayCount(c => c + 1);
    const duration = (exercise.chords.length * 2 * 60) / (exercise.bpm || 80) * 1000 + 500;
    await playProgression(exercise.chords, exercise.bpm || 80);
    setTimeout(() => setIsPlaying(false), duration);
  };

  const isCorrect = showResult && lastAnswer === exercise.correctAnswer;
  const isWrong = showResult && lastAnswer !== null && lastAnswer !== exercise.correctAnswer;

  return (
    <div className="bg-[#2A1A0E] rounded-2xl p-6 border border-[#8B6F47]/40 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-widest mb-1">
            {exercise.sourceType === 'song' ? `🎵 ${exercise.songTitle}` : '📚 Progressão do Sistema'}
          </p>
          <p className="text-stone-400 text-sm">
            Tonalidade: <span className="text-stone-200 font-medium">{exercise.key || '?'}</span>
            {exercise.section && <> · Seção: <span className="text-stone-200 font-medium">{exercise.section}</span></>}
          </p>
        </div>
        <Badge className={`text-xs px-3 py-1 ${
          exercise.difficulty === 'facil' ? 'bg-green-800 text-green-200' :
          exercise.difficulty === 'medio' ? 'bg-yellow-800 text-yellow-200' :
          'bg-red-800 text-red-200'
        }`}>
          {exercise.difficulty === 'facil' ? 'Fácil' : exercise.difficulty === 'medio' ? 'Médio' : 'Difícil'}
        </Badge>
      </div>

      {/* Acordes (revelados após resposta) */}
      {showResult && (
        <div className="bg-[#1A0E05] rounded-xl p-4 border border-[#8B6F47]/30">
          <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider">Progressão:</p>
          <div className="flex flex-wrap gap-2">
            {exercise.chords.map((chord, i) => (
              <span key={i} className="bg-[#8B6F47]/30 text-[#D4AF37] font-bold px-3 py-1 rounded-lg text-sm border border-[#8B6F47]/40">
                {chord}
              </span>
            ))}
          </div>
          {exercise.progressionName && (
            <p className="text-stone-400 text-xs mt-2">
              Padrão: <span className="text-stone-200">{exercise.progressionName}</span>
              {exercise.pattern && <> · <span className="text-[#D4AF37]">{exercise.pattern}</span></>}
            </p>
          )}
        </div>
      )}

      {/* Botões de reprodução */}
      <div className="flex gap-3 items-center">
        <Button
          onClick={handlePlay}
          className={`flex-1 gap-2 font-bold text-base py-6 rounded-xl ${
            isPlaying
              ? 'bg-red-700 hover:bg-red-800 text-white'
              : 'bg-[#8B6F47] hover:bg-[#6B5437] text-white'
          }`}
        >
          {isPlaying ? <><Square className="w-5 h-5" /> Parar</> : <><Play className="w-5 h-5" /> {playCount > 0 ? 'Repetir' : 'Ouvir'}</>}
        </Button>
        {playCount > 0 && !showResult && (
          <Button variant="outline" size="icon" onClick={handlePlay}
            className="border-[#8B6F47]/40 text-stone-300 hover:bg-[#8B6F47]/20 w-12 h-12 rounded-xl">
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Feedback */}
      {showResult && (
        <div className={`rounded-xl p-3 text-center font-bold text-sm ${
          isCorrect ? 'bg-green-900/50 text-green-300 border border-green-700' :
          isWrong ? 'bg-red-900/50 text-red-300 border border-red-700' : ''
        }`}>
          {isCorrect ? '✅ Correto! Excelente!' : isWrong ? `❌ Resposta correta: ${exercise.correctAnswer}` : ''}
        </div>
      )}
    </div>
  );
}