import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Play, Square, Repeat, Scissors, Save, Plus, X, Clock, Check, AlertCircle, Loader2 } from 'lucide-react';

// ── Utilitários de tempo ──────────────────────────────────────────
function parseTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  const str = String(ts).trim();
  if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str);
  const m = str.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + (m[3] ? parseFloat(`0.${m[3]}`) : 0);
  return null;
}

function formatTime(sec) {
  if (!sec || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const SECTION_COLORS = [
  { bg: 'bg-blue-500/25', border: 'border-blue-400', handle: 'bg-blue-400', text: 'text-blue-300' },
  { bg: 'bg-purple-500/25', border: 'border-purple-400', handle: 'bg-purple-400', text: 'text-purple-300' },
  { bg: 'bg-green-500/25', border: 'border-green-400', handle: 'bg-green-400', text: 'text-green-300' },
  { bg: 'bg-orange-500/25', border: 'border-orange-400', handle: 'bg-orange-400', text: 'text-orange-300' },
  { bg: 'bg-pink-500/25', border: 'border-pink-400', handle: 'bg-pink-400', text: 'text-pink-300' },
  { bg: 'bg-cyan-500/25', border: 'border-cyan-400', handle: 'bg-cyan-400', text: 'text-cyan-300' },
];

// ── Componente principal ─────────────────────────────────────────
const PlaybackSections = forwardRef(function PlaybackSections({ song, onSaveTimestamps, isAdmin = false }, ref) {
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const timelineRef = useRef(null);
  const localProgressionsRef = useRef(song.progressions || []);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopingSection, setLoopingSection] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [customMarkers, setCustomMarkers] = useState([]);
  const [localProgressions, setLocalProgressions] = useState(song.progressions || []);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [dragState, setDragState] = useState(null);

  useEffect(() => { localProgressionsRef.current = localProgressions; }, [localProgressions]);

  const hasUnsavedChanges = useMemo(() => {
    const original = JSON.stringify(song.progressions || []);
    const current = JSON.stringify(localProgressions || []);
    return original !== current;
  }, [song.progressions, localProgressions]);

  useEffect(() => { setLocalProgressions(song.progressions || []); }, [song.progressions]);

  const playbackUrl = song.playback_url || song.audio_url;

  const sections = useMemo(() => {
    return (localProgressions || [])
      .map((p, i) => ({
        idx: i,
        label: p.section || p.progression_name || `Seção ${i + 1}`,
        progressionName: p.progression_name || '',
        chords: p.chords || [],
        time: parseTimestamp(p.timestamp),
        endTime: parseTimestamp(p.end_timestamp),
        colorIdx: i % SECTION_COLORS.length,
      }))
      .filter(s => s.chords.length >= 2);
  }, [localProgressions]);

  const divisionPoints = useMemo(() => {
    const pts = [];
    sections.forEach(s => {
      if (s.time != null) pts.push({ time: s.time, label: s.label, type: 'section', sectionIdx: s.idx });
    });
    customMarkers.forEach((m, i) => {
      pts.push({ time: m.time, label: m.label || `Marca ${i + 1}`, type: 'custom', markerIdx: i });
    });
    return pts.sort((a, b) => a.time - b.time);
  }, [sections, customMarkers]);

  const getSectionEnd = useCallback((section) => {
    if (section.endTime != null) return section.endTime;
    const nextPt = divisionPoints.find(p => p.time > (section.time ?? Infinity));
    return nextPt ? nextPt.time : duration;
  }, [divisionPoints, duration]);

  // ── Áudio ──
  useEffect(() => {
    if (!playbackUrl) return;
    const audio = new Audio(playbackUrl);
    audio.volume = 0.8;
    audio.preload = 'metadata';
    audioRef.current = audio;
    const onMeta = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => { setIsPlaying(false); setLoopingSection(null); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audioRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playbackUrl]);

  // Loop com end time explícito
  useEffect(() => {
    if (!loopingSection || !audioRef.current) return;
    const section = sections.find(s => s.idx === loopingSection);
    if (!section || section.time == null) return;
    const endTime = getSectionEnd(section);
    const check = () => {
      if (audioRef.current && audioRef.current.currentTime >= endTime - 0.05) {
        audioRef.current.currentTime = section.time;
      }
      rafRef.current = requestAnimationFrame(check);
    };
    rafRef.current = requestAnimationFrame(check);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loopingSection, sections, getSectionEnd]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setIsPlaying(true); }
  }, [isPlaying]);

  const seekTo = useCallback((time) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const playSection = useCallback((sectionIdx) => {
    const section = sections.find(s => s.idx === sectionIdx);
    if (!section || section.time == null || !audioRef.current) return false;
    audioRef.current.currentTime = section.time;
    audioRef.current.play().catch(() => {});
    setIsPlaying(true);
    setLoopingSection(sectionIdx);
    return true;
  }, [sections]);

  useImperativeHandle(ref, () => ({ playSection, togglePlay }), [playSection, togglePlay]);

  const stopLoop = useCallback(() => {
    setLoopingSection(null);
    if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
  }, []);

  // ── Arrasto dos handles na timeline ──
  const timeFromPointer = useCallback((clientX) => {
    if (!timelineRef.current || !duration) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }, [duration]);

  const startDrag = useCallback((e, sectionIdx, edge) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({ sectionIdx, edge });
  }, []);

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e) => {
      e.preventDefault();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const time = timeFromPointer(clientX);
      const field = dragState.edge === 'start' ? 'timestamp' : 'end_timestamp';
      setLocalProgressions(prev => {
        const updated = [...prev];
        if (!updated[dragState.sectionIdx]) return prev;
        // Validação: início não pode passar do fim e vice-versa
        const cur = updated[dragState.sectionIdx];
        const curStart = field === 'timestamp' ? time : (parseTimestamp(cur.timestamp) ?? 0);
        const curEnd = field === 'end_timestamp' ? time : (parseTimestamp(cur.end_timestamp) ?? duration);
        if (field === 'timestamp' && curEnd != null && time > curEnd) return prev;
        if (field === 'end_timestamp' && curStart != null && time < curStart) return prev;
        updated[dragState.sectionIdx] = { ...cur, [field]: formatTime(time) };
        return updated;
      });
    };
    const onUp = () => {
      setDragState(null);
      onSaveTimestamps?.(localProgressionsRef.current);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragState, timeFromPointer, onSaveTimestamps, duration]);

  // ── Edição textual de timestamps ──
  const startEdit = (sectionIdx, field) => {
    const s = sections.find(x => x.idx === sectionIdx);
    setEditingField({ idx: sectionIdx, field });
    const existing = field === 'start' ? s?.time : s?.endTime;
    setEditValue(existing != null ? formatTime(existing) : (currentTime > 0 ? formatTime(currentTime) : ''));
  };

  const captureCurrentTime = () => setEditValue(formatTime(currentTime));

  const saveEdit = () => {
    if (!editingField) return;
    const parsed = parseTimestamp(editValue);
    const field = editingField.field === 'start' ? 'timestamp' : 'end_timestamp';
    const updated = [...(localProgressions || [])];
    if (updated[editingField.idx]) {
      updated[editingField.idx] = { ...updated[editingField.idx], [field]: parsed != null ? formatTime(parsed) : '' };
    }
    setLocalProgressions(updated);
    onSaveTimestamps?.(updated);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
    setEditingField(null);
    setEditValue('');
  };

  const saveAll = async () => {
    if (!onSaveTimestamps) return;
    setSaveStatus('saving');
    try {
      await onSaveTimestamps(localProgressions);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const addMarkerAtCurrent = () => {
    setCustomMarkers(prev => [...prev, { time: Math.round(currentTime), label: '' }].sort((a, b) => a.time - b.time));
  };

  const handleTimelineClick = (e) => {
    if (dragState) return;
    seekTo(timeFromPointer(e.clientX));
  };

  if (!playbackUrl) {
    return (
      <div className="bg-[#2A1A0E] rounded-2xl p-5 border border-[#8B6F47]/40 text-center">
        <p className="text-stone-400 text-sm">Esta música não tem arquivo de playback.</p>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-[#2A1A0E] rounded-2xl p-4 border border-[#8B6F47]/40 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-[#D4AF37] font-bold text-sm">Divisão de Playback</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-stone-500 text-xs font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          {isAdmin && (
            <button onClick={saveAll} disabled={saveStatus === 'saving' || (!hasUnsavedChanges && saveStatus === 'idle')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                saveStatus === 'saved' ? 'bg-green-700 text-white' :
                saveStatus === 'error' ? 'bg-red-700 text-white' :
                saveStatus === 'saving' ? 'bg-stone-600 text-stone-300' :
                hasUnsavedChanges ? 'bg-[#D4AF37] hover:bg-[#B8962E] text-[#1A0E05]' : 'bg-stone-700 text-stone-500'
              }`}
              title={hasUnsavedChanges ? 'Salvar configurações no banco' : 'Sem alterações pendentes'}
            >
              {saveStatus === 'saving' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Salvando...</> :
               saveStatus === 'saved' ? <><Check className="w-3.5 h-3.5" />Salvo!</> :
               saveStatus === 'error' ? <><AlertCircle className="w-3.5 h-3.5" />Erro</> :
               <><Save className="w-3.5 h-3.5" />Salvar</>}
            </button>
          )}
        </div>
      </div>

      {/* Timeline visual com regiões arrastáveis */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className={`relative h-20 bg-black/40 rounded-xl border border-[#8B6F47]/20 overflow-hidden select-none ${dragState ? 'cursor-ew-resize' : 'cursor-pointer'}`}
      >
        {/* Barra de progresso global */}
        <div className="absolute inset-y-0 left-0 bg-[#8B6F47]/15 pointer-events-none" style={{ width: `${progress}%` }} />

        {/* Regiões das seções */}
        {sections.map(s => {
          if (s.time == null) return null;
          const color = SECTION_COLORS[s.colorIdx];
          const end = getSectionEnd(s);
          const left = duration > 0 ? (s.time / duration) * 100 : 0;
          const width = duration > 0 ? Math.max(0, ((end - s.time) / duration) * 100) : 0;
          const isActive = loopingSection === s.idx;
          const isCurrent = currentTime >= s.time && currentTime < end;
          return (
            <div key={s.idx} className="absolute inset-0">
              {/* Região colorida (clique = tocar) */}
              <div
                onClick={(e) => { e.stopPropagation(); playSection(s.idx); }}
                className={`absolute top-1 bottom-1 rounded-md border transition-opacity ${color.bg} ${isActive ? 'border-green-400 ring-1 ring-green-400' : isCurrent ? color.border : 'border-transparent'} hover:opacity-80`}
                style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                title={`${s.label}: ${formatTime(s.time)} → ${formatTime(end)}`}
              >
                <span className={`absolute top-0.5 left-1 text-[8px] font-bold ${color.text} truncate`} style={{ maxWidth: 'calc(100% - 4px)' }}>
                  {s.label}
                </span>
              </div>

              {/* Handle de início */}
              {isAdmin && (
                <div
                  onPointerDown={(e) => startDrag(e, s.idx, 'start')}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-10 flex items-center justify-center group/handle touch-none"
                  style={{ left: `${left}%` }}
                  title="Arraste para ajustar o início"
                >
                  <div className={`w-1 h-full ${color.handle} rounded-full group-hover/handle:w-1.5 transition-all`} />
                </div>
              )}

              {/* Handle de fim */}
              {isAdmin && (
                <div
                  onPointerDown={(e) => startDrag(e, s.idx, 'end')}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-10 flex items-center justify-center group/handle touch-none"
                  style={{ left: `${left + width}%` }}
                  title="Arraste para ajustar o fim"
                >
                  <div className={`w-1 h-full ${color.handle} rounded-full group-hover/handle:w-1.5 transition-all`} />
                </div>
              )}
            </div>
          );
        })}

        {/* Linha atual */}
        <div className="absolute inset-y-0 w-0.5 bg-[#D4AF37] z-20 pointer-events-none" style={{ left: `${progress}%` }} />

        {/* Marcadores custom */}
        {customMarkers.map((m, i) => {
          const left = duration > 0 ? (m.time / duration) * 100 : 0;
          return <div key={i} className="absolute top-0 bottom-0 w-0.5 bg-blue-400 pointer-events-none" style={{ left: `${left}%` }} />;
        })}
      </div>

      {/* Controles de playback */}
      <div className="flex items-center gap-2">
        <button onClick={togglePlay}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isPlaying ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-[#8B6F47] hover:bg-[#6B5437] text-white'
          }`}
        >
          {isPlaying ? <><Square className="w-4 h-4" />Parar</> : <><Play className="w-4 h-4" />Tocar</>}
        </button>
        {loopingSection != null && (
          <button onClick={stopLoop}
            className="px-4 py-2.5 rounded-xl bg-green-900/50 border border-green-700/50 text-green-300 font-semibold text-sm flex items-center gap-2"
          >
            <Repeat className="w-4 h-4" />Parar Loop
          </button>
        )}
        {isAdmin && (
          <button onClick={addMarkerAtCurrent}
            className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 text-sm flex items-center gap-1"
            title="Adicionar marcador na posição atual"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lista de seções com início e fim */}
      <div className="space-y-1.5">
        <p className="text-stone-500 text-xs uppercase tracking-wider flex items-center gap-1">
          <Clock className="w-3 h-3" /> Seções da música
          {isAdmin && <span className="ml-auto text-[10px] normal-case tracking-normal text-stone-600">arraste nas bordas da timeline ↑</span>}
        </p>
        {sections.length === 0 ? (
          <p className="text-stone-600 text-xs text-center py-2">Nenhuma seção catalogada.</p>
        ) : (
          sections.map(s => {
            const end = getSectionEnd(s);
            const isActive = loopingSection === s.idx;
            const isCurrent = s.time != null && currentTime >= s.time && currentTime < end;
            return (
              <div key={s.idx}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border transition-all ${
                  isActive ? 'bg-green-900/30 border-green-700/50' :
                  isCurrent ? 'bg-[#8B6F47]/20 border-[#D4AF37]/40' : 'bg-black/20 border-[#8B6F47]/20'
                }`}
              >
                <button
                  onClick={() => s.time != null ? playSection(s.idx) : null}
                  disabled={s.time == null}
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    s.time != null ? 'bg-[#8B6F47] hover:bg-[#6B5437] text-white' : 'bg-stone-700 text-stone-600 cursor-not-allowed'
                  }`}
                  title={s.time != null ? 'Tocar e repetir esta seção' : 'Defina o timestamp primeiro'}
                >
                  {isActive ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-stone-200 text-xs font-semibold truncate">{s.label}</p>
                  <p className="text-stone-500 text-[10px] truncate">
                    {s.chords.join(' · ')} {s.progressionName ? `· ${s.progressionName}` : ''}
                  </p>
                </div>

                {/* Início e Fim */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {/* Início */}
                  {editingField?.idx === s.idx && editingField?.field === 'start' ? (
                    <div className="flex items-center gap-0.5">
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                        placeholder="0:00" autoFocus
                        className="w-12 bg-black/40 border border-[#D4AF37]/50 rounded px-1 py-0.5 text-xs text-stone-200 text-center focus:outline-none font-mono"
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingField(null); }}
                      />
                      <button onClick={captureCurrentTime} className="p-0.5 rounded bg-[#8B6F47] text-white hover:bg-[#6B5437]" title="Usar tempo atual"><Clock className="w-3 h-3" /></button>
                      <button onClick={saveEdit} className="p-0.5 rounded bg-green-700 text-white hover:bg-green-600"><Save className="w-3 h-3" /></button>
                      <button onClick={() => setEditingField(null)} className="p-0.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <span className="text-[#D4AF37] text-[10px] font-mono font-bold w-9 text-center" title="Início">
                        {s.time != null ? formatTime(s.time) : '--:--'}
                      </span>
                      {isAdmin && (
                        <button onClick={() => startEdit(s.idx, 'start')} className="p-0.5 rounded text-stone-500 hover:text-[#D4AF37] hover:bg-white/10 transition-colors" title="Definir início"><Clock className="w-3 h-3" /></button>
                      )}
                    </div>
                  )}

                  <span className="text-stone-600 text-[10px]">→</span>

                  {/* Fim */}
                  {editingField?.idx === s.idx && editingField?.field === 'end' ? (
                    <div className="flex items-center gap-0.5">
                      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                        placeholder="0:00" autoFocus
                        className="w-12 bg-black/40 border border-[#D4AF37]/50 rounded px-1 py-0.5 text-xs text-stone-200 text-center focus:outline-none font-mono"
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingField(null); }}
                      />
                      <button onClick={captureCurrentTime} className="p-0.5 rounded bg-[#8B6F47] text-white hover:bg-[#6B5437]" title="Usar tempo atual"><Clock className="w-3 h-3" /></button>
                      <button onClick={saveEdit} className="p-0.5 rounded bg-green-700 text-white hover:bg-green-600"><Save className="w-3 h-3" /></button>
                      <button onClick={() => setEditingField(null)} className="p-0.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <span className={`text-[10px] font-mono font-bold w-9 text-center ${s.endTime != null ? 'text-stone-300' : 'text-stone-600'}`} title="Fim">
                        {s.endTime != null ? formatTime(s.endTime) : (duration > 0 ? formatTime(end) : '--:--')}
                      </span>
                      {isAdmin && (
                        <button onClick={() => startEdit(s.idx, 'end')} className="p-0.5 rounded text-stone-500 hover:text-[#D4AF37] hover:bg-white/10 transition-colors" title="Definir fim"><Clock className="w-3 h-3" /></button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Marcadores custom (admin) */}
      {isAdmin && customMarkers.length > 0 && (
        <div className="space-y-1">
          <p className="text-stone-500 text-xs uppercase tracking-wider">Marcadores extras</p>
          {customMarkers.map((m, i) => (
            <div key={i} className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1">
              <button onClick={() => seekTo(m.time)} className="text-blue-400 text-xs font-mono font-bold w-10 text-center hover:underline">{formatTime(m.time)}</button>
              <input type="text" value={m.label}
                onChange={e => setCustomMarkers(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                placeholder="Nome do trecho..."
                className="flex-1 bg-transparent text-stone-300 text-xs focus:outline-none border-b border-transparent focus:border-[#8B6F47]/40"
              />
              <button onClick={() => setCustomMarkers(prev => prev.filter((_, j) => j !== i))} className="text-stone-600 hover:text-red-400"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Dica */}
      <p className="text-stone-600 text-[10px] text-center">
        {isAdmin
          ? 'Arraste as bordas coloridas na timeline para marcar início e fim de cada trecho. Clique num trecho para ouvir em loop.'
          : 'Clique num trecho colorido para ouvir e repetir aquela parte da música.'}
      </p>
    </div>
  );
});

export default PlaybackSections;