import React, { useState } from 'react';
import { Play, Square, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useBackingTrack, BACKING_TRACK_STYLES } from './useBackingTrack';

export default function BackingTrackPlayer({ defaultBpm = 100 }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('pop');
  const [bpm, setBpm] = useState(defaultBpm);
  const { startBacking, stopBacking, isPlaying } = useBackingTrack();

  const handleToggle = () => {
    if (isPlaying) {
      stopBacking();
    } else {
      startBacking(selectedStyle, bpm);
    }
  };

  const handleStyleChange = (styleId) => {
    const style = BACKING_TRACK_STYLES.find(s => s.id === styleId);
    setSelectedStyle(styleId);
    if (style?.bpmHint) setBpm(style.bpmHint);
    if (isPlaying) startBacking(styleId, style?.bpmHint || bpm);
  };

  const handleBpmChange = (val) => {
    setBpm(val[0]);
    if (isPlaying) startBacking(selectedStyle, val[0]);
  };

  return (
    <div className="bg-[#1A0E05] border border-[#8B6F47]/40 rounded-2xl overflow-hidden">
      {/* Header clicável */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-stone-300 text-sm font-semibold">Backing Track Rítmica</span>
          {isPlaying && (
            <span className="flex items-center gap-1 text-green-400 text-xs animate-pulse font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Tocando · {bpm} BPM
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
      </button>

      {/* Painel expandido */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#8B6F47]/20 pt-3">
          {/* Seletor de estilo */}
          <div>
            <p className="text-stone-500 text-xs uppercase tracking-widest mb-2">Estilo rítmico</p>
            <div className="grid grid-cols-3 gap-2">
              {BACKING_TRACK_STYLES.map(style => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleStyleChange(style.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    selectedStyle === style.id
                      ? 'bg-[#8B6F47] text-white border-[#D4AF37]'
                      : 'bg-[#2A1A0E] text-stone-400 border-[#8B6F47]/30 hover:border-[#8B6F47]'
                  }`}
                >
                  <div className="text-base leading-none mb-1">{style.emoji}</div>
                  <div>{style.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* BPM Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-stone-500 text-xs uppercase tracking-widest">Andamento</p>
              <span className="text-[#D4AF37] font-bold text-sm">{bpm} BPM</span>
            </div>
            <Slider
              min={60}
              max={180}
              step={2}
              value={[bpm]}
              onValueChange={handleBpmChange}
              className="w-full"
            />
            <div className="flex justify-between text-stone-600 text-xs mt-1">
              <span>60</span>
              <span>120</span>
              <span>180</span>
            </div>
          </div>

          {/* Botão play/stop */}
          <Button
            onClick={handleToggle}
            className={`w-full py-4 rounded-xl font-bold gap-2 text-sm ${
              isPlaying
                ? 'bg-red-800 hover:bg-red-900 text-white'
                : 'bg-[#8B6F47] hover:bg-[#6B5437] text-white'
            }`}
          >
            {isPlaying
              ? <><Square className="w-4 h-4" /> Parar Backing Track</>
              : <><Play className="w-4 h-4" /> Iniciar Backing Track</>
            }
          </Button>

          <p className="text-stone-600 text-xs text-center">
            A backing track toca em loop. Use junto com "Ouvir Progressão" para praticar.
          </p>
        </div>
      )}
    </div>
  );
}