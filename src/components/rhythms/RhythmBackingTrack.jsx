import React, { useRef, useState, useEffect } from 'react';
import { Music, Upload, Play, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const isMidi = (url) => url && (url.toLowerCase().includes('.mid') || url.toLowerCase().includes('midi'));

function MidiBackingPlayer({ url }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const synthsRef = useRef([]);
  const toneRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => () => stopPlayback(), []);

  const stopPlayback = () => {
    synthsRef.current.forEach(s => { try { s.dispose(); } catch (e) {} });
    synthsRef.current = [];
    if (toneRef.current) {
      try { toneRef.current.Transport.stop(); toneRef.current.Transport.cancel(); } catch (e) {}
    }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handlePlay = async () => {
    if (isPlaying) { stopPlayback(); return; }
    setIsLoading(true);
    setError(null);
    try {
      const [ToneModule, { Midi }] = await Promise.all([import('tone'), import('@tonejs/midi')]);
      const Tone = ToneModule;
      toneRef.current = Tone;
      synthsRef.current.forEach(s => { try { s.dispose(); } catch (e) {} });
      synthsRef.current = [];
      Tone.Transport.stop();
      Tone.Transport.cancel();

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      setDuration(midi.duration);

      await Tone.start();

      midi.tracks.forEach(track => {
        if (track.notes.length === 0) return;
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
          volume: -6,
        }).toDestination();
        synthsRef.current.push(synth);
        track.notes.forEach(note => {
          Tone.Transport.schedule(time => {
            synth.triggerAttackRelease(note.name, note.duration, time, note.velocity);
          }, note.time);
        });
      });

      Tone.Transport.schedule(() => stopPlayback(), midi.duration + 0.1);
      Tone.Transport.start();
      startTimeRef.current = Date.now();
      setIsPlaying(true);

      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setCurrentTime(Math.min(elapsed, midi.duration));
        if (elapsed >= midi.duration) clearInterval(intervalRef.current);
      }, 200);
    } catch (err) {
      setError('Erro ao reproduzir o arquivo MIDI.');
    } finally {
      setIsLoading(false);
    }
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const fmt = (s) => { if (!s) return '0:00'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 bg-white/70 rounded-xl border border-purple-200">
        <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Music className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="w-full bg-purple-100 rounded-full h-1.5 mb-1">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-[#A68A64]">
            <span>{fmt(currentTime)}</span>
            <span>{duration ? fmt(duration) : '--:--'}</span>
          </div>
        </div>
        <Button
          onClick={handlePlay}
          disabled={isLoading}
          size="sm"
          className={isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlaying ? <><Square className="w-3 h-3 mr-1" />Parar</> : <><Play className="w-3 h-3 mr-1" />Tocar</>}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}
      <p className="text-xs text-purple-500 font-medium">🎹 Backing Track MIDI</p>
    </div>
  );
}

export default function RhythmBackingTrack({ rhythm, isAdmin = false, onUpload }) {
  const [uploadingBacking, setUploadingBacking] = useState(false);
  const fileRef = useRef();

  const hasRealBacking = !!rhythm?.backing_track_url;
  const backingIsMidi = isMidi(rhythm?.backing_track_url);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    setUploadingBacking(true);
    try {
      await onUpload(file);
    } finally {
      setUploadingBacking(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#FDF8F0] to-[#F5F0E8] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#8B6F47]/10 border-b border-[#D4AF37]/20">
        <Music className="w-4 h-4 text-[#8B6F47]" />
        <span className="text-[#8B6F47] text-sm font-bold">Backing Track</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Player */}
        {hasRealBacking ? (
          backingIsMidi ? (
            <MidiBackingPlayer url={rhythm.backing_track_url} />
          ) : (
            <audio controls className="w-full rounded-lg" src={rhythm.backing_track_url} />
          )
        ) : (
          !isAdmin && (
            <p className="text-xs text-[#A68A64] text-center py-2">Nenhuma backing track disponível.</p>
          )
        )}

        {/* Upload — apenas admin */}
        {isAdmin && (
          <div className={hasRealBacking ? 'pt-2 border-t border-[#D4C5B0]' : ''}>
            {hasRealBacking && (
              <p className="text-xs text-[#A68A64] mb-2">🔄 Substituir arquivo:</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mid,.midi"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingBacking}
              className="border-[#D4C5B0] text-[#8B6F47] hover:bg-[#8B6F47]/10 w-full gap-2"
            >
              <Upload className="w-3 h-3" />
              {uploadingBacking ? 'Enviando...' : 'Upload Backing Track (áudio ou MIDI)'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}