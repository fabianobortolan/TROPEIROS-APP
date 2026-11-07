import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Plus, Minus, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

const TIME_SIGNATURES = [
  { value: "4/4", beats: 4, label: "4/4" },
  { value: "3/4", beats: 3, label: "3/4" },
  { value: "2/4", beats: 2, label: "2/4" },
  { value: "6/8", beats: 6, label: "6/8" },
  { value: "2/2", beats: 2, label: "2/2" },
];

const PRESET_TEMPOS = [
  { label: "Largo", bpm: 50 },
  { label: "Adagio", bpm: 70 },
  { label: "Andante", bpm: 90 },
  { label: "Moderato", bpm: 110 },
  { label: "Allegro", bpm: 130 },
  { label: "Vivace", bpm: 160 },
  { label: "Presto", bpm: 180 },
];

export default function Metronome({ compact = false, initialBpm = 100 }) {
  const [bpm, setBpm] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioContextRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const timerIdRef = useRef(null);
  const beatCountRef = useRef(0);

  const getBeatsPerMeasure = () => {
    const sig = TIME_SIGNATURES.find(t => t.value === timeSignature);
    return sig ? sig.beats : 4;
  };

  const playClick = useCallback((isAccent = false) => {
    if (!audioContextRef.current || isMuted) return;

    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();

    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);

    // Som diferente para o primeiro tempo (acento)
    osc.frequency.value = isAccent ? 1000 : 800;
    osc.type = "sine";

    const now = audioContextRef.current.currentTime;
    gain.gain.setValueAtTime(volume * (isAccent ? 1 : 0.7), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);
  }, [volume, isMuted]);

  const scheduler = useCallback(() => {
    const secondsPerBeat = 60.0 / bpm;
    const beatsPerMeasure = getBeatsPerMeasure();

    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
      const isAccent = beatCountRef.current % beatsPerMeasure === 0;
      playClick(isAccent);
      
      setCurrentBeat(beatCountRef.current % beatsPerMeasure);
      beatCountRef.current++;
      
      nextNoteTimeRef.current += secondsPerBeat;
    }

    timerIdRef.current = setTimeout(scheduler, 25);
  }, [bpm, playClick, timeSignature]);

  const startMetronome = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    beatCountRef.current = 0;
    nextNoteTimeRef.current = audioContextRef.current.currentTime;
    setCurrentBeat(0);
    scheduler();
    setIsPlaying(true);
  }, [scheduler]);

  const stopMetronome = useCallback(() => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  const adjustBpm = (delta) => {
    setBpm(prev => Math.max(20, Math.min(300, prev + delta)));
  };

  // Reinicia o metrônomo quando BPM ou compasso muda (se estiver tocando)
  useEffect(() => {
    if (isPlaying) {
      stopMetronome();
      startMetronome();
    }
  }, [bpm, timeSignature]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, []);

  const beatsPerMeasure = getBeatsPerMeasure();
  const tempoLabel = PRESET_TEMPOS.reduce((prev, curr) => 
    Math.abs(curr.bpm - bpm) < Math.abs(prev.bpm - bpm) ? curr : prev
  ).label;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-[#F5F1E8] rounded-xl border border-[#D4C5B0]">
        <Button
          size="sm"
          onClick={togglePlay}
          className={isPlaying 
            ? "bg-red-500 hover:bg-red-600 text-white" 
            : "bg-[#8B6F47] hover:bg-[#A68A64] text-white"
          }
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => adjustBpm(-5)}>
            <Minus className="w-4 h-4" />
          </Button>
          <span className="font-bold text-[#8B6F47] w-16 text-center">{bpm} BPM</span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => adjustBpm(5)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-1">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                isPlaying && currentBeat === i
                  ? i === 0 ? "bg-[#D4AF37] scale-125" : "bg-[#9CAF88] scale-110"
                  : "bg-[#D4C5B0]"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-[#D4C5B0] bg-white/90">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#8B6F47] flex items-center justify-between">
          <span>🎵 Metrônomo</span>
          <Badge className="bg-[#8B6F47]/20 text-[#8B6F47]">{tempoLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Indicador Visual de Beats */}
        <div className="flex justify-center gap-3">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: isPlaying && currentBeat === i ? 1.3 : 1,
                backgroundColor: isPlaying && currentBeat === i 
                  ? (i === 0 ? "#D4AF37" : "#9CAF88")
                  : "#D4C5B0"
              }}
              transition={{ duration: 0.1 }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: "#D4C5B0" }}
            >
              {i + 1}
            </motion.div>
          ))}
        </div>

        {/* BPM Display */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4">
            <Button
              size="icon"
              variant="outline"
              className="h-12 w-12 border-[#D4C5B0]"
              onClick={() => adjustBpm(-5)}
            >
              <Minus className="w-5 h-5" />
            </Button>
            
            <div className="w-32">
              <p className="text-5xl font-bold text-[#8B6F47]">{bpm}</p>
              <p className="text-sm text-[#A68A64]">BPM</p>
            </div>
            
            <Button
              size="icon"
              variant="outline"
              className="h-12 w-12 border-[#D4C5B0]"
              onClick={() => adjustBpm(5)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Slider BPM */}
        <div className="px-4">
          <Slider
            value={[bpm]}
            onValueChange={([v]) => setBpm(v)}
            min={20}
            max={300}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-[#A68A64] mt-1">
            <span>20</span>
            <span>300</span>
          </div>
        </div>

        {/* Presets de Tempo */}
        <div className="flex flex-wrap gap-2 justify-center">
          {PRESET_TEMPOS.map(preset => (
            <Button
              key={preset.label}
              size="sm"
              variant={Math.abs(bpm - preset.bpm) < 10 ? "default" : "outline"}
              className={Math.abs(bpm - preset.bpm) < 10 
                ? "bg-[#8B6F47] text-white" 
                : "border-[#D4C5B0] text-[#8B6F47]"
              }
              onClick={() => setBpm(preset.bpm)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Controles */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-[#8B6F47] font-medium">Compasso</label>
            <Select value={timeSignature} onValueChange={setTimeSignature}>
              <SelectTrigger className="border-[#D4C5B0]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SIGNATURES.map(sig => (
                  <SelectItem key={sig.value} value={sig.value}>{sig.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#8B6F47] font-medium">Volume</label>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={([v]) => {
                  setVolume(v / 100);
                  if (v > 0) setIsMuted(false);
                }}
                max={100}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Play/Pause Button */}
        <Button
          size="lg"
          onClick={togglePlay}
          className={`w-full h-16 text-xl font-bold ${
            isPlaying 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47]"
          } text-white`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-6 h-6 mr-2" />
              Parar
            </>
          ) : (
            <>
              <Play className="w-6 h-6 mr-2" />
              Iniciar
            </>
          )}
        </Button>

        {/* Atalhos de ajuste rápido */}
        <div className="flex justify-center gap-2">
          {[-10, -5, -1, 1, 5, 10].map(delta => (
            <Button
              key={delta}
              size="sm"
              variant="outline"
              className="border-[#D4C5B0] text-[#8B6F47] text-xs px-2"
              onClick={() => adjustBpm(delta)}
            >
              {delta > 0 ? `+${delta}` : delta}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}