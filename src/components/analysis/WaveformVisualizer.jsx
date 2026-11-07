import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WaveformVisualizer({ audioUrl, title }) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Configurar AudioContext e Analyser
    const setupAudioContext = () => {
      try {
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 2048;
          analyserRef.current = analyser;

          const source = audioContextRef.current.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(audioContextRef.current.destination);
        }
      } catch (err) {
        console.error("Erro ao configurar AudioContext:", err);
        setError("Não foi possível configurar o visualizador de áudio");
      }
    };

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setupAudioContext();
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  // Desenhar forma de onda
  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#F5F1E8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8B6F47';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Indicador de progresso
      const progressX = (currentTime / duration) * canvas.width;
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(progressX - 1, 0, 2, canvas.height);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTime, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.error("Erro ao reproduzir áudio:", err);
        setError("Não foi possível reproduzir o áudio");
      });
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / canvas.width;
    audio.currentTime = percentage * duration;
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return (
      <Card className="border-[#D4C5B0]">
        <CardContent className="p-6 text-center">
          <Volume2 className="w-12 h-12 text-[#A68A64] mx-auto mb-3" />
          <p className="text-[#A68A64]">Nenhum áudio disponível para visualização</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-[#D4C5B0]">
        <CardTitle className="text-[#8B6F47] flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Visualizador de Forma de Onda
        </CardTitle>
        {title && <p className="text-sm text-[#A68A64]">{title}</p>}
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <audio ref={audioRef} src={audioUrl} />

        <div className="bg-[#F5F1E8] rounded-lg p-2">
          <canvas
            ref={canvasRef}
            width={800}
            height={150}
            className="w-full cursor-pointer rounded"
            onClick={handleSeek}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={togglePlay}
              size="icon"
              className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:opacity-90"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              onClick={toggleMute}
              size="icon"
              variant="outline"
              className="border-[#D4C5B0]"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>

          <div className="text-sm text-[#A68A64] font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="text-xs text-[#A68A64] text-center">
          💡 Clique na forma de onda para navegar pela música
        </div>
      </CardContent>
    </Card>
  );
}