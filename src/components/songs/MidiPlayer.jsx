import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Music, Loader2, ExternalLink } from "lucide-react";

export default function MidiPlayer({ midiUrl }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const synthsRef = useRef([]);
  const toneRef = useRef(null);
  const midiRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const stopPlayback = () => {
    if (synthsRef.current.length > 0) {
      synthsRef.current.forEach(synth => {
        try { synth.dispose(); } catch (e) {}
      });
      synthsRef.current = [];
    }
    if (toneRef.current) {
      try { toneRef.current.Transport.stop(); toneRef.current.Transport.cancel(); } catch (e) {}
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    startTimeRef.current = null;
  };

  const handlePlay = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Dynamic imports para evitar problemas no SSR
      const [ToneModule, { Midi }] = await Promise.all([
        import("tone"),
        import("@tonejs/midi")
      ]);

      const Tone = ToneModule;
      toneRef.current = Tone;

      // Para synths anteriores
      synthsRef.current.forEach(s => { try { s.dispose(); } catch (e) {} });
      synthsRef.current = [];
      Tone.Transport.stop();
      Tone.Transport.cancel();

      // Busca e parseia o MIDI
      const response = await fetch(midiUrl);
      const arrayBuffer = await response.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      midiRef.current = midi;

      const totalDuration = midi.duration;
      setDuration(totalDuration);

      // Inicia o contexto de áudio
      await Tone.start();

      // Cria um synth para cada track com notas
      midi.tracks.forEach(track => {
        if (track.notes.length === 0) return;

        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
          volume: -6
        }).toDestination();

        synthsRef.current.push(synth);

        track.notes.forEach(note => {
          Tone.Transport.schedule(time => {
            synth.triggerAttackRelease(
              note.name,
              note.duration,
              time,
              note.velocity
            );
          }, note.time);
        });
      });

      // Agenda parada automática
      Tone.Transport.schedule(() => {
        stopPlayback();
      }, totalDuration + 0.1);

      Tone.Transport.start();
      startTimeRef.current = Date.now();
      setIsPlaying(true);

      // Atualiza o tempo atual
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setCurrentTime(Math.min(elapsed, totalDuration));
        if (elapsed >= totalDuration) {
          clearInterval(intervalRef.current);
        }
      }, 200);

    } catch (err) {
      console.error("Erro ao reproduzir MIDI:", err);
      setError("Erro ao reproduzir o arquivo MIDI. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <Card className="border-[#D4C5B0] bg-gradient-to-r from-purple-50 to-indigo-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-base">
          <Music className="w-5 h-5 text-purple-500" />
          🎹 Player MIDI - Solo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-white/70 rounded-xl border border-purple-200">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Music className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Barra de progresso */}
            <div className="w-full bg-purple-100 rounded-full h-2 mb-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[#A68A64]">
              <span>{formatTime(currentTime)}</span>
              <span>{duration ? formatTime(duration) : "--:--"}</span>
            </div>
          </div>

          <Button
            onClick={handlePlay}
            disabled={isLoading}
            className={`flex-shrink-0 ${
              isPlaying
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            } text-white`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <><Square className="w-4 h-4 mr-2" />Parar</>
            ) : (
              <><Play className="w-4 h-4 mr-2" />Tocar Solo</>
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-[#A68A64]">
            🎵 Ouça a melodia do solo separadamente
          </p>
          <a
            href={midiUrl}
            download
            className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Baixar MIDI
          </a>
        </div>
      </CardContent>
    </Card>
  );
}