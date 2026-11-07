import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Play, Pause, Volume2, Music, Upload, Loader2 } from 'lucide-react';

// ─── Mapeamento de tom → escalas sugeridas ────────────────────────────────────
const SCALE_SUGGESTIONS = {
  'C':  [{ name: 'Dó Maior',           formula: '1 2 3 4 5 6 7',    color: '#8B6F47', mode: 'Jônio' },
         { name: 'Lá Menor Natural',   formula: '1 2 b3 4 5 b6 b7', color: '#A68A64', mode: 'Eólio' },
         { name: 'Dó Pentatônica Maior',formula: '1 2 3 5 6',       color: '#9CAF88', mode: 'Pentatônica' }],
  'G':  [{ name: 'Sol Maior',          formula: '1 2 3 4 5 6 7',    color: '#8B6F47', mode: 'Jônio' },
         { name: 'Mi Menor Natural',   formula: '1 2 b3 4 5 b6 b7', color: '#A68A64', mode: 'Eólio' },
         { name: 'Sol Pentatônica Maior',formula: '1 2 3 5 6',      color: '#9CAF88', mode: 'Pentatônica' }],
  'D':  [{ name: 'Ré Maior',           formula: '1 2 3 4 5 6 7',    color: '#8B6F47', mode: 'Jônio' },
         { name: 'Si Menor Natural',   formula: '1 2 b3 4 5 b6 b7', color: '#A68A64', mode: 'Eólio' },
         { name: 'Ré Pentatônica Maior',formula: '1 2 3 5 6',       color: '#9CAF88', mode: 'Pentatônica' }],
  'A':  [{ name: 'Lá Maior',           formula: '1 2 3 4 5 6 7',    color: '#8B6F47', mode: 'Jônio' },
         { name: 'Fá# Menor Natural',  formula: '1 2 b3 4 5 b6 b7', color: '#A68A64', mode: 'Eólio' },
         { name: 'Lá Pentatônica Maior',formula: '1 2 3 5 6',       color: '#9CAF88', mode: 'Pentatônica' }],
  'E':  [{ name: 'Mi Maior',           formula: '1 2 3 4 5 6 7',    color: '#8B6F47', mode: 'Jônio' },
         { name: 'Dó# Menor Natural',  formula: '1 2 b3 4 5 b6 b7', color: '#A68A64', mode: 'Eólio' },
         { name: 'Mi Pentatônica Maior',formula: '1 2 3 5 6',       color: '#9CAF88', mode: 'Pentatônica' }],
  'B':  [{ name: 'Si Maior',           formula: '1 2 3 4 5 6 7',    color: '#8B6F47', mode: 'Jônio' },
         { name: 'Sol# Menor Natural', formula: '1 2 b3 4 5 b6 b7', color: '#A68A64', mode: 'Eólio' },
         { name: 'Si Pentatônica Maior',formula: '1 2 3 5 6',       color: '#9CAF88', mode: 'Pentatônica' }],
  'F':  [{ name: 'Fá Maior',           formula: '1 2 3 4 5 6 7',    color: '#8B6F47', mode: 'Jônio' },
         { name: 'Ré Menor Natural',   formula: '1 2 b3 4 5 b6 b7', color: '#A68A64', mode: 'Eólio' },
         { name: 'Fá Pentatônica Maior',formula: '1 2 3 5 6',       color: '#9CAF88', mode: 'Pentatônica' }],
  'Am': [{ name: 'Lá Menor Natural',   formula: '1 2 b3 4 5 b6 b7', color: '#8B6F47', mode: 'Eólio' },
         { name: 'Lá Menor Pentatônica',formula: '1 b3 4 5 b7',     color: '#A68A64', mode: 'Pentatônica' },
         { name: 'Dó Maior',           formula: '1 2 3 4 5 6 7',    color: '#9CAF88', mode: 'Relativa Maior' }],
  'Em': [{ name: 'Mi Menor Natural',   formula: '1 2 b3 4 5 b6 b7', color: '#8B6F47', mode: 'Eólio' },
         { name: 'Mi Menor Pentatônica',formula: '1 b3 4 5 b7',     color: '#A68A64', mode: 'Pentatônica' },
         { name: 'Sol Maior',          formula: '1 2 3 4 5 6 7',    color: '#9CAF88', mode: 'Relativa Maior' }],
  'Bm': [{ name: 'Si Menor Natural',   formula: '1 2 b3 4 5 b6 b7', color: '#8B6F47', mode: 'Eólio' },
         { name: 'Si Menor Pentatônica',formula: '1 b3 4 5 b7',     color: '#A68A64', mode: 'Pentatônica' },
         { name: 'Ré Maior',           formula: '1 2 3 4 5 6 7',    color: '#9CAF88', mode: 'Relativa Maior' }],
};

const ALL_KEYS = ['C','G','D','A','E','B','F','Am','Em','Bm','Dm','Gm','F#','Bb','Eb'];

function getScalesForKey(key) {
  if (!key) return [];
  const clean = key.replace(/[^A-Gb#m]/g, '').trim();
  return SCALE_SUGGESTIONS[clean] || SCALE_SUGGESTIONS[clean.charAt(0).toUpperCase() + clean.slice(1)] || [];
}

// ─── Piano visual de escala (simples) ────────────────────────────────────────
function ScaleVisual({ scaleName, formula }) {
  const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const whiteKeys = [0,2,4,5,7,9,11];
  // Uma representação simples em texto da fórmula
  return (
    <div className="bg-[#0D0705] rounded-lg p-3 text-center">
      <p className="text-[#D4AF37] text-xs font-bold mb-1">{scaleName}</p>
      <p className="text-stone-400 text-xs font-mono">{formula}</p>
    </div>
  );
}

// ─── Player de MP3 com controle de tempo ─────────────────────────────────────
function Mp3Player({ url, label }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [url]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.loop = true;
      await audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#0D0705] border border-[#8B6F47]/30 rounded-xl p-4 space-y-3">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-3">
        <Button
          onClick={togglePlay}
          size="icon"
          className="w-12 h-12 rounded-full bg-[#D4AF37] hover:bg-[#B8962E] text-black flex-shrink-0"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-stone-200 text-sm font-medium truncate">{label}</p>
          <p className="text-stone-500 text-xs">{formatTime(currentTime)} / {formatTime(duration)} • Loop ativo</p>
        </div>
      </div>

      {/* Progresso */}
      <div
        className="w-full h-2 bg-stone-800 rounded-full cursor-pointer"
        onClick={(e) => {
          if (!audioRef.current || !duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          audioRef.current.currentTime = ratio * duration;
        }}
      >
        <div
          className="h-2 bg-[#D4AF37] rounded-full transition-all"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-stone-500 flex-shrink-0" />
        <Slider
          value={[volume]}
          onValueChange={([v]) => setVolume(v)}
          min={0}
          max={100}
          step={1}
          className="flex-1"
        />
        <span className="text-stone-500 text-xs w-8 text-right">{volume}%</span>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ImprovisationTrainer({ onBack }) {
  const [selectedKey, setSelectedKey] = useState('G');
  const [uploading, setUploading] = useState(false);
  const [customTrackUrl, setCustomTrackUrl] = useState(null);
  const [customTrackName, setCustomTrackName] = useState('');

  const { data: rhythms = [] } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
  });

  const rhythmsWithBacking = rhythms.filter(r => r.backing_track_url && r.backing_track_url.toLowerCase().endsWith('.mp3'));

  const scales = getScalesForKey(selectedKey);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCustomTrackUrl(file_url);
    setCustomTrackName(file.name.replace(/\.[^.]+$/, ''));
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-stone-400 hover:text-stone-200">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-stone-100">🎸 Improvisação com Backing Track</h2>
          <p className="text-stone-400 text-sm">Toque junto à base e use as escalas sugeridas</p>
        </div>
      </div>

      {/* Seletor de Tom */}
      <div className="bg-[#1C1007] border border-[#8B6F47]/30 rounded-xl p-4 space-y-3">
        <p className="text-[#D4AF37] font-semibold text-sm uppercase tracking-wider">Tonalidade de Referência</p>
        <Select value={selectedKey} onValueChange={setSelectedKey}>
          <SelectTrigger className="bg-[#0D0705] border-[#8B6F47]/40 text-stone-200 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1C1007] border-[#8B6F47]/40">
            {ALL_KEYS.map(k => (
              <SelectItem key={k} value={k} className="text-stone-200 hover:bg-[#8B6F47]/20">{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Escalas sugeridas */}
      {scales.length > 0 && (
        <div className="bg-[#1C1007] border border-[#8B6F47]/30 rounded-xl p-4 space-y-3">
          <p className="text-[#D4AF37] font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            <Music className="w-4 h-4" /> Escalas Sugeridas para {selectedKey}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scales.map((scale, i) => (
              <div key={i} className="bg-[#0D0705] rounded-lg p-3 border border-[#8B6F47]/20">
                <Badge className="mb-2 text-xs" style={{ background: scale.color + '33', color: scale.color, border: `1px solid ${scale.color}44` }}>
                  {scale.mode}
                </Badge>
                <p className="text-stone-200 text-sm font-semibold">{scale.name}</p>
                <p className="text-stone-500 text-xs font-mono mt-1">{scale.formula}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backing tracks dos ritmos cadastrados */}
      {rhythmsWithBacking.length > 0 && (
        <div className="bg-[#1C1007] border border-[#8B6F47]/30 rounded-xl p-4 space-y-4">
          <p className="text-[#D4AF37] font-semibold text-sm uppercase tracking-wider">🥁 Backing Tracks por Ritmo</p>
          <div className="space-y-3">
            {rhythmsWithBacking.map(r => (
              <div key={r.id}>
                <p className="text-stone-400 text-xs uppercase font-medium mb-1 ml-1">{r.name} {r.backing_track_bpm ? `• ${r.backing_track_bpm} BPM` : ''}</p>
                <Mp3Player url={r.backing_track_url} label={r.name} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload de backing track avulsa */}
      <div className="bg-[#1C1007] border border-[#8B6F47]/30 rounded-xl p-4 space-y-3">
        <p className="text-[#D4AF37] font-semibold text-sm uppercase tracking-wider">📂 Tocar Backing Track Avulsa</p>
        <label className="flex items-center gap-3 cursor-pointer bg-[#0D0705] border border-dashed border-[#8B6F47]/40 hover:border-[#D4AF37]/60 rounded-lg p-4 transition-colors">
          {uploading ? <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" /> : <Upload className="w-5 h-5 text-[#8B6F47]" />}
          <span className="text-stone-400 text-sm">{uploading ? 'Enviando...' : 'Clique para enviar um arquivo MP3'}</span>
          <input type="file" accept="audio/mp3,audio/mpeg,audio/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {customTrackUrl && (
          <Mp3Player url={customTrackUrl} label={customTrackName || 'Backing Track'} />
        )}
      </div>

      {rhythmsWithBacking.length === 0 && !customTrackUrl && (
        <div className="text-center py-8 text-stone-500 text-sm">
          <p>Nenhuma backing track MP3 cadastrada nos ritmos ainda.</p>
          <p className="text-xs mt-1">Acesse <strong>Ritmos</strong> no menu para fazer upload, ou use a opção acima para tocar um arquivo avulso.</p>
        </div>
      )}
    </div>
  );
}