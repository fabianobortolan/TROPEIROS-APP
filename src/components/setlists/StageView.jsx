import React, { useState, useEffect, useRef } from "react";
import useOfflineSongCache from "@/hooks/useOfflineSongCache";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Music2, Key, Activity, Music4, Play, Pause, Gauge, Type, Palette, Settings, Maximize, Minimize, ChevronLeft, ChevronRight, Volume2, RotateCcw, Languages, Download } from "lucide-react";
import { translateCifraText, cifraToUpperCase } from "@/components/utils/chordTranslator";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const getSpeedLabel = (speed) => {
  if (speed <= 15) return "Super Lento";
  if (speed <= 30) return "Muito Lento";
  if (speed <= 55) return "Lento";
  if (speed <= 90) return "Médio";
  if (speed <= 130) return "Rápido";
  if (speed <= 170) return "Muito Rápido";
  return "Ultra Rápido";
};

const THEMES = {
  claro: { bg: "#F5F1E8", text: "#2d1810", name: "Claro", chordColor: "#8B6F47" },
  escuro: { bg: "#1a1a1a", text: "#F5F1E8", name: "Escuro", chordColor: "#D4AF37" },
  sertanejo: { bg: "#2d1810", text: "#F5E6D3", name: "Sertanejo", chordColor: "#FFD700" },
  azul: { bg: "#0f172a", text: "#e0f2fe", name: "Azul Noite", chordColor: "#60a5fa" },
  verde: { bg: "#052e16", text: "#dcfce7", name: "Verde Mata", chordColor: "#86efac" },
  contraste: { bg: "#000000", text: "#FFFF00", name: "Alto Contraste", chordColor: "#FFFFFF" },
  palco: { bg: "#1a1410", text: "#FFFACD", name: "Modo Palco", chordColor: "#ADFF2F" },
};

export default function StageView({ setlist, songs, onClose }) {
  const setlistSongs = setlist.songs?.map(id => songs.find(s => s.id === id)).filter(Boolean) || [];
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(setlistSongs[0]?.scroll_speed || 50);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('stageview_fontsize');
    return saved ? parseInt(saved) : 18;
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('stageview_theme') || "palco");
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(41);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const [showPortugueseChords, setShowPortugueseChords] = useState(false);
  const [showHeader, setShowHeader] = useState(false);

  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);
  const delayTimeoutRef = useRef(null);
  const playbackAudioRef = useRef(null);
  const lastManualScrollRef = useRef(0);
  const wakeLockRef = useRef(null);
  const pinchRef = useRef({ active: false, startDist: 0, startFontSize: 18 });
  const fontSizeRef = useRef(18);

  const { cacheStatus, cacheSongs } = useOfflineSongCache();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const currentTheme = THEMES[theme];
  const currentSong = setlistSongs[currentSongIndex];

  // Mantém ref sincronizada com fontSize para uso nos handlers de touch
  useEffect(() => { fontSizeRef.current = fontSize; }, [fontSize]);

  // Monitora status de conexão
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Pré-cacheia todas as músicas do setlist ao montar o modo palco
  useEffect(() => {
    cacheSongs(setlistSongs);
  }, []);

  // Wake Lock: impede a tela de apagar durante o Modo Palco
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock não disponível:', err);
      }
    };
    requestWakeLock();
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') await requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; }
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const elem = containerRef.current;
      if (!elem) return;
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) await elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
        else if (elem.mozRequestFullScreen) await elem.mozRequestFullScreen();
        else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) await document.mozCancelFullScreen();
        else if (document.msExitFullscreen) await document.msExitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Erro ao alternar tela cheia:", err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const startAutoScroll = async () => {
    if (!document.fullscreenElement && containerRef.current) {
      try { await containerRef.current.requestFullscreen(); setIsFullscreen(true); }
      catch (err) { console.error("Erro ao entrar em tela cheia:", err); }
    }
    if (!countdownStarted) {
      setCountdownStarted(true);
      setCountdown(countdownDuration);
      const countInterval = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(countInterval); return 0; } return prev - 1; });
      }, 1000);
      delayTimeoutRef.current = setTimeout(() => { setIsScrolling(true); setCountdown(0); }, countdownDuration * 1000);
    } else {
      setIsScrolling(true);
    }
  };

  const stopAutoScroll = () => {
    setIsScrolling(false);
    if (scrollIntervalRef.current) { cancelAnimationFrame(scrollIntervalRef.current); scrollIntervalRef.current = null; }
  };

  const resetEverything = () => {
    setIsScrolling(false); setCountdown(0); setCountdownStarted(false);
    if (delayTimeoutRef.current) { clearTimeout(delayTimeoutRef.current); delayTimeoutRef.current = null; }
    if (scrollIntervalRef.current) { cancelAnimationFrame(scrollIntervalRef.current); scrollIntervalRef.current = null; }
  };

  const toggleScroll = () => { if (isScrolling) stopAutoScroll(); else startAutoScroll(); };

  // Interação manual no container de scroll + pinch-to-zoom para ajuste de fonte
  useEffect(() => {
    const scrollContainer = document.getElementById('setlist-scroll-container');
    if (!scrollContainer) return;

    const getPinchDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const handleWheel = () => { lastManualScrollRef.current = performance.now(); };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinchRef.current.active = true;
        pinchRef.current.startDist = getPinchDist(e.touches);
        pinchRef.current.startFontSize = fontSizeRef.current;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current.active) {
        const newDist = getPinchDist(e.touches);
        const scale = newDist / pinchRef.current.startDist;
        const newSize = Math.min(60, Math.max(8, Math.round(pinchRef.current.startFontSize * scale)));
        setFontSize(newSize);
        localStorage.setItem('stageview_fontsize', String(newSize));
      } else if (e.touches.length === 1) {
        lastManualScrollRef.current = performance.now();
      }
    };

    const handleTouchEnd = () => {
      pinchRef.current.active = false;
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: true });
    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
    scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
      scrollContainer.removeEventListener('touchstart', handleTouchStart);
      scrollContainer.removeEventListener('touchmove', handleTouchMove);
      scrollContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentSongIndex]);

  // Auto-scroll loop
  useEffect(() => {
    const scrollContainer = document.getElementById('setlist-scroll-container');
    if (!isScrolling || !scrollContainer) {
      if (scrollIntervalRef.current) { cancelAnimationFrame(scrollIntervalRef.current); scrollIntervalRef.current = null; }
      return;
    }
    lastManualScrollRef.current = 0;
    let lastTime = performance.now();
    const scrollStartTime = performance.now();
    const EASE_IN_DURATION = 800; // ms
    let animationFrameId = null;
    const scroll = () => {
      const now = performance.now();
      const deltaTime = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (lastManualScrollRef.current > 0 && (now - lastManualScrollRef.current) < 2000) {
        animationFrameId = requestAnimationFrame(scroll);
        scrollIntervalRef.current = animationFrameId;
        return;
      }
      const { scrollHeight, clientHeight, scrollTop } = scrollContainer;
      if (scrollHeight - clientHeight <= 0) {
        animationFrameId = requestAnimationFrame(scroll);
        scrollIntervalRef.current = animationFrameId;
        return;
      }
      // Ease-in: acelera suavemente nos primeiros 800ms
      const elapsed = now - scrollStartTime;
      const easeIn = elapsed < EASE_IN_DURATION ? elapsed / EASE_IN_DURATION : 1;
      // Ease-out: desacelera nos últimos 10% do conteúdo
      const progress = scrollTop / (scrollHeight - clientHeight);
      const easeOut = progress > 0.90 ? Math.max(0.15, 1 - (progress - 0.90) / 0.10) : 1;
      const scrollAmount = scrollSpeed * deltaTime * easeIn * easeOut;
      scrollContainer.scrollTop = scrollTop + scrollAmount;
      if (scrollTop + clientHeight >= scrollHeight - 5) { setIsScrolling(false); return; }
      animationFrameId = requestAnimationFrame(scroll);
      scrollIntervalRef.current = animationFrameId;
    };
    animationFrameId = requestAnimationFrame(scroll);
    scrollIntervalRef.current = animationFrameId;
    return () => { if (animationFrameId) { cancelAnimationFrame(animationFrameId); scrollIntervalRef.current = null; } };
  }, [isScrolling, scrollSpeed, currentSongIndex]);

  const goToNextSong = () => {
    if (currentSongIndex < setlistSongs.length - 1) {
      resetEverything(); stopPlayback();
      const nextIdx = currentSongIndex + 1;
      setCurrentSongIndex(nextIdx);
      setScrollSpeed(setlistSongs[nextIdx]?.scroll_speed || 50);
      const sc = document.getElementById('setlist-scroll-container');
      if (sc) sc.scrollTop = 0;
    }
  };

  const goToPreviousSong = () => {
    if (currentSongIndex > 0) {
      resetEverything(); stopPlayback();
      const prevIdx = currentSongIndex - 1;
      setCurrentSongIndex(prevIdx);
      setScrollSpeed(setlistSongs[prevIdx]?.scroll_speed || 50);
      const sc = document.getElementById('setlist-scroll-container');
      if (sc) sc.scrollTop = 0;
    }
  };

  const togglePlayback = () => {
    if (playbackAudioRef.current) {
      if (isPlaybackPlaying) { playbackAudioRef.current.pause(); }
      else {
        playbackAudioRef.current.play().catch(err => console.error("Erro ao tocar playback:", err));
        if (!isScrolling) startAutoScroll();
      }
    }
  };

  const restartPlayback = () => {
    if (playbackAudioRef.current) { playbackAudioRef.current.pause(); playbackAudioRef.current.currentTime = 0; setIsPlaybackPlaying(false); }
    resetEverything();
    const sc = document.getElementById('setlist-scroll-container');
    if (sc) sc.scrollTop = 0;
  };

  const stopPlayback = () => {
    if (playbackAudioRef.current) { playbackAudioRef.current.pause(); playbackAudioRef.current.currentTime = 0; }
    setIsPlaybackPlaying(false);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); toggleScroll(); }
      else if (e.key === 'Escape') {
        if (document.fullscreenElement) { document.exitFullscreen(); setIsFullscreen(false); stopAutoScroll(); }
        else { resetEverything(); stopPlayback(); onClose(); }
      } else if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const sc = document.getElementById('setlist-scroll-container');
        if (sc) { sc.scrollTop -= 100; lastManualScrollRef.current = performance.now(); }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const sc = document.getElementById('setlist-scroll-container');
        if (sc) { sc.scrollTop += 100; lastManualScrollRef.current = performance.now(); }
      } else if (e.key === 'ArrowRight') { e.preventDefault(); goToNextSong(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); goToPreviousSong(); }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isScrolling, scrollSpeed, currentSongIndex, onClose]);

  const saveScrollSpeed = async (newSpeed) => {
    if (!currentSong) return;
    try { await base44.entities.Song.update(currentSong.id, { scroll_speed: newSpeed }); }
    catch (err) { console.error("Erro ao salvar velocidade:", err); }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        ref={containerRef}
        style={{
          backgroundColor: currentTheme.bg,
          color: currentTheme.text,
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw', height: '100vh', minHeight: '100vh',
          overflow: 'hidden', margin: 0, padding: 0,
          zIndex: 9999, display: 'flex', flexDirection: 'column'
        }}
      >
        {/* Cabeçalho fixo - visibilidade controlada */}
        <div
          className="flex-shrink-0 w-full"
          style={{
            margin: 0, padding: 0,
            transition: 'opacity 0.4s ease, max-height 0.4s ease',
            opacity: showHeader ? 1 : 0,
            maxHeight: showHeader ? '400px' : '0px',
            overflow: 'hidden',
            pointerEvents: showHeader ? 'auto' : 'none',
          }}
        >
          <div className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] p-2 md:p-4" style={{ margin: 0, width: '100%' }}>
            {/* Primeira linha: Título do setlist e Sair */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-base md:text-2xl font-bold text-white uppercase truncate">{setlist.name}</h1>
                <p className="text-[#F5F1E8] text-xs uppercase truncate">
                  {currentSong && <span>{currentSong.title} — {currentSong.artist}</span>}
                  <span className="ml-2 opacity-60">({currentSongIndex + 1}/{setlistSongs.length})</span>
                </p>
              </div>
              <Button
                onClick={(e) => { e.stopPropagation(); resetEverything(); stopPlayback(); if (document.fullscreenElement) document.exitFullscreen(); onClose(); }}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full min-h-[48px] min-w-[48px] md:h-9 px-3 md:px-4 text-xs md:text-sm font-bold flex-shrink-0 touch-manipulation"
                title="Sair do Modo Palco (Esc)"
              >
                <X className="w-5 h-5 md:mr-1" />
                <span className="hidden md:inline">Sair</span>
              </Button>
            </div>

            {/* Segunda linha: Todos os controles */}
            <div className="flex items-center justify-end gap-1 mb-2 flex-wrap">

              {/* Playback da música atual */}
              {currentSong?.playback_url && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
                    className={`min-w-[44px] min-h-[44px] md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 touch-manipulation ${isPlaybackPlaying ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-white/20 hover:bg-white/30"}`}
                    title={isPlaybackPlaying ? "Pausar playback" : "Tocar playback"}
                  >
                    {isPlaybackPlaying ? <Pause className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); restartPlayback(); }}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 bg-white/20 hover:bg-white/30"
                    title="Reiniciar"
                  >
                    <RotateCcw className="w-4 h-4 text-white" />
                  </button>
                  <audio
                    ref={playbackAudioRef}
                    src={currentSong.playback_url}
                    onPlay={() => setIsPlaybackPlaying(true)}
                    onPause={() => setIsPlaybackPlaying(false)}
                    onEnded={() => setIsPlaybackPlaying(false)}
                    preload="metadata"
                  />
                </>
              )}

              {/* Play/Pause rolagem */}
              <Button
                onClick={(e) => { e.stopPropagation(); toggleScroll(); }}
                className={`min-h-[44px] min-w-[44px] md:h-9 md:w-9 rounded-full shadow-lg touch-manipulation ${isScrolling ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                title={isScrolling ? "Pausar rolagem" : "Iniciar rolagem"}
              >
                {isScrolling ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />}
              </Button>

              {/* Velocidade */}
              <div className="bg-white rounded-full shadow-lg px-1.5 md:px-2 py-0.5 md:py-1 flex items-center gap-0.5">
                <Button size="sm" variant="ghost"
                  onClick={async (e) => { e.stopPropagation(); const v = Math.max(5, scrollSpeed - 5); setScrollSpeed(v); await saveScrollSpeed(v); }}
                  className="h-5 w-5 md:h-6 md:w-6 p-0 text-xs font-bold text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white">−</Button>
                <div className="text-center min-w-[28px] md:min-w-[36px]">
                  <div className="text-[10px] md:text-xs font-bold text-[#8B6F47]">{Math.round(scrollSpeed)}</div>
                </div>
                <Button size="sm" variant="ghost"
                  onClick={async (e) => { e.stopPropagation(); const v = Math.min(200, scrollSpeed + 5); setScrollSpeed(v); await saveScrollSpeed(v); }}
                  className="h-5 w-5 md:h-6 md:w-6 p-0 text-xs font-bold text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white">+</Button>
              </div>

              {/* Navegação entre músicas */}
              <Button
                onClick={(e) => { e.stopPropagation(); goToPreviousSong(); }}
                disabled={currentSongIndex === 0}
                className="min-h-[44px] min-w-[44px] md:h-9 md:w-9 rounded-full shadow-lg bg-white hover:bg-gray-100 text-[#8B6F47] disabled:opacity-30 touch-manipulation"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                onClick={(e) => { e.stopPropagation(); goToNextSong(); }}
                disabled={currentSongIndex === setlistSongs.length - 1}
                className="min-h-[44px] min-w-[44px] md:h-9 md:w-9 rounded-full shadow-lg bg-white hover:bg-gray-100 text-[#8B6F47] disabled:opacity-30 touch-manipulation"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>

              {/* Zoom */}
              <div className="bg-white rounded-full shadow-lg px-1.5 md:px-2 py-0.5 md:py-1 flex items-center gap-0.5">
                <Button size="sm" variant="ghost"
                  onClick={(e) => { e.stopPropagation(); setFontSize(prev => { const v = Math.max(8, prev - 2); localStorage.setItem('stageview_fontsize', String(v)); return v; }); }}
                  className="h-5 w-5 md:h-6 md:w-6 p-0 text-xs font-bold text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white rounded-full" title="Diminuir texto">A−</Button>
                <span className="text-[9px] md:text-[10px] font-bold text-[#8B6F47] min-w-[18px] md:min-w-[22px] text-center">{fontSize}</span>
                <Button size="sm" variant="ghost"
                  onClick={(e) => { e.stopPropagation(); setFontSize(prev => { const v = Math.min(48, prev + 2); localStorage.setItem('stageview_fontsize', String(v)); return v; }); }}
                  className="h-5 w-5 md:h-6 md:w-6 p-0 text-xs font-bold text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white rounded-full" title="Aumentar texto">A+</Button>
              </div>

              {/* Configurações */}
              <Popover open={showSettings} onOpenChange={setShowSettings}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" onClick={(e) => e.stopPropagation()}
                    className="text-white hover:bg-white/20 rounded-full h-7 w-7 md:h-9 md:w-9 p-0" title="Configurações">
                    <Settings className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" onClick={(e) => e.stopPropagation()} side="bottom" align="center">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                        <Type className="w-4 h-4" />Tamanho da Fonte: {fontSize}px
                      </label>
                      <Slider value={[fontSize]} onValueChange={([val]) => { setFontSize(val); localStorage.setItem('stageview_fontsize', String(val)); }}
                        min={8} max={48} step={2} className="mt-2" />
                      <div className="flex justify-between text-xs text-[#A68A64] mt-1"><span>Menor</span><span>Maior</span></div>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                        <Gauge className="w-4 h-4" />Tempo de Início: {countdownDuration}s
                      </label>
                      <Slider value={[countdownDuration]} onValueChange={([val]) => setCountdownDuration(val)}
                        min={5} max={60} step={5} className="mt-2" />
                      <div className="flex justify-between text-xs text-[#A68A64] mt-1"><span>5s</span><span>60s</span></div>
                      <p className="text-xs text-[#A68A64] mt-2">Ajuste o tempo de espera antes da rolagem iniciar</p>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                        <Palette className="w-4 h-4" />Tema de Cores
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(THEMES).map(([key, { bg, text, name }]) => (
                          <button key={key}
                            onClick={() => { setTheme(key); localStorage.setItem('stageview_theme', key); }}
                            className={`p-3 rounded-lg border-2 transition-all ${theme === key ? 'border-[#8B6F47] shadow-lg' : 'border-gray-200'}`}
                            style={{ backgroundColor: bg, color: text }}>
                            <div className="text-xs font-bold text-center">{name}</div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-green-600 mt-2">✓ Tema salvo automaticamente</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Tradução de notas */}
              <Button variant="ghost"
                onClick={(e) => { e.stopPropagation(); setShowPortugueseChords(prev => !prev); }}
                className={`rounded-full h-7 w-7 md:h-9 md:w-9 p-0 ${showPortugueseChords ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'text-white hover:bg-white/20'}`}
                title={showPortugueseChords ? "Mostrar cifras (A, B, C...)" : "Mostrar nomes (Dó, Ré, Mi...)"}>
                <Languages className="w-3 h-3 md:w-4 md:h-4" />
              </Button>

              {/* Tela cheia */}
              <Button variant="ghost"
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className="text-white hover:bg-white/20 rounded-full h-7 w-7 md:h-9 md:w-9 p-0"
                title={isFullscreen ? "Sair Tela Cheia (F11)" : "Tela Cheia (F11)"}>
                {isFullscreen ? <Minimize className="w-3 h-3 md:w-4 md:h-4" /> : <Maximize className="w-3 h-3 md:w-4 md:h-4" />}
              </Button>
            </div>

            {/* Terceira linha: Badges da música atual */}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {currentSong?.main_key && (
                <Badge className="text-xs font-bold uppercase" style={{ backgroundColor: currentTheme.chordColor, color: currentTheme.bg }}>
                  <Key className="w-3 h-3 mr-1" />{currentSong.main_key}
                </Badge>
              )}
              {currentSong?.rhythm_name && (
                <Badge className="text-xs font-bold uppercase" style={{ backgroundColor: currentTheme.chordColor, color: currentTheme.bg, opacity: 0.9 }}>
                  <Music4 className="w-3 h-3 mr-1" />{currentSong.rhythm_name}
                </Badge>
              )}
              {currentSong?.tempo && (
                <Badge className="text-xs font-bold uppercase" style={{ backgroundColor: currentTheme.chordColor, color: currentTheme.bg, opacity: 0.8 }}>
                  <Activity className="w-3 h-3 mr-1" />{currentSong.tempo} BPM
                </Badge>
              )}
              {countdown > 0 && (
                <Badge className="bg-yellow-500 text-white animate-pulse uppercase text-xs font-bold">
                  Iniciando em {countdown}s
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Barra de controle — sempre visível — acima da cifra */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '4px 12px', backgroundColor: currentTheme.bg, borderBottom: `1px solid ${currentTheme.text}20` }}>
          <button
            onClick={(e) => { e.stopPropagation(); goToPreviousSong(); }}
            disabled={currentSongIndex === 0}
            className="flex items-center justify-center rounded-full font-bold text-xs transition-all active:scale-95 touch-manipulation"
            style={{
              width: 36, height: 36,
              background: currentSongIndex === 0 ? 'rgba(139,111,71,0.3)' : 'rgba(139,111,71,0.9)',
              color: '#fff',
              border: '1.5px solid #D4AF37',
              opacity: currentSongIndex === 0 ? 0.4 : 1,
            }}
            title="Música anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowHeader(h => !h); }}
            className="flex items-center gap-1.5 px-4 py-1 rounded-full font-bold text-xs transition-all active:scale-95"
            style={{
              background: showHeader ? 'rgba(239,68,68,0.85)' : 'rgba(139,111,71,0.9)',
              color: '#fff',
              border: showHeader ? '1.5px solid rgba(239,68,68,0.5)' : '1.5px solid #D4AF37',
            }}
          >
            <Settings className="w-3 h-3" />
            {showHeader ? 'Ocultar Controles' : 'Mostrar Controles'}
          </button>

          {/* Indicador de status offline */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: isOnline
                ? (cacheStatus === 'done' ? 'rgba(34,197,94,0.85)' : 'rgba(234,179,8,0.85)')
                : 'rgba(239,68,68,0.85)',
              color: '#fff',
              fontSize: '10px',
            }}
            title={isOnline ? (cacheStatus === 'done' ? 'Músicas salvas offline' : 'Salvando offline...') : 'Sem conexão (cache ativo)'}
          >
            {isOnline
              ? (cacheStatus === 'caching' ? '⏳' : '✓')
              : '📵'}
            {isOnline
              ? (cacheStatus === 'caching' ? 'Salvando' : 'Offline OK')
              : 'Offline'}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); goToNextSong(); }}
            disabled={currentSongIndex === setlistSongs.length - 1}
            className="flex items-center justify-center rounded-full font-bold text-xs transition-all active:scale-95 touch-manipulation"
            style={{
              width: 36, height: 36,
              background: currentSongIndex === setlistSongs.length - 1 ? 'rgba(139,111,71,0.3)' : 'rgba(139,111,71,0.9)',
              color: '#fff',
              border: '1.5px solid #D4AF37',
              opacity: currentSongIndex === setlistSongs.length - 1 ? 0.4 : 1,
            }}
            title="Próxima música"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Área de rolagem da cifra */}
        <div
          id="setlist-scroll-container"
          style={{
            flex: 1, overflowY: 'scroll', overflowX: 'hidden',
            backgroundColor: currentTheme.bg, width: '100%',
            margin: 0, padding: 0, position: 'relative', WebkitOverflowScrolling: 'auto',
          }}
        >
          <div className="w-full" style={{ margin: '0 auto', padding: '12px 8px 128px 8px' }}>
            {setlistSongs.length === 0 ? (
              <p className="text-center py-16 uppercase opacity-60">Nenhuma música no setlist</p>
            ) : currentSong ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSong.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentSong.cifra_text ? (
                    <div className="rounded-lg p-3 border-2"
                      style={{ backgroundColor: theme === "claro" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.3)", borderColor: currentTheme.text + "40" }}>
                      <pre className="font-mono whitespace-pre-wrap leading-relaxed"
                        style={{ fontSize: `${fontSize}px`, color: currentTheme.text, lineHeight: '1.8', fontWeight: 'bold' }}>
                        {(showPortugueseChords ? cifraToUpperCase(translateCifraText(currentSong.cifra_text)) : cifraToUpperCase(currentSong.cifra_text))
                          .split('\n')
                          .map((line, i) => {
                            const trimmed = line.trim();
                            const isSection = trimmed.startsWith('[');
                            const cleanedForTest = trimmed.replace(/^\|/, '').replace(/\d+X$/i, '').replace(/[-|]/g, ' ').trim();
                            const isChordLine = !isSection && cleanedForTest.length > 0 &&
                              /^([A-G][#b]?(?:m(?:aj)?|dim|aug|sus|add)?(?:\d+)?(?:\/[A-G][#b]?)?[\s%]+)*[A-G][#b]?(?:m(?:aj)?|dim|aug|sus|add)?(?:\d+)?(?:\/[A-G][#b]?)?$/.test(cleanedForTest) &&
                              !/[a-záàâãéêíóôõúçA-ZÁÀÂÃÉÊÍÓÔÕÚÇ]{4,}/.test(cleanedForTest);
                            return (
                              <span key={i} style={{ display: 'block', color: isChordLine ? currentTheme.chordColor : currentTheme.text, fontWeight: (isChordLine || isSection) ? '900' : 'bold' }}>
                                {line || '\u00A0'}
                              </span>
                            );
                          })
                        }
                      </pre>
                    </div>
                  ) : (
                    <div className="rounded-lg p-8 border-2 text-center"
                      style={{ backgroundColor: theme === "claro" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.3)", borderColor: currentTheme.text + "40" }}>
                      <p className="text-xl italic uppercase" style={{ color: currentTheme.text, opacity: 0.6 }}>CIFRA NÃO DISPONÍVEL</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : null}
          </div>
        </div>

        {/* Atalhos do teclado - apenas desktop, visível com header */}
        <div
          className="hidden md:block fixed bottom-20 right-4"
          style={{ opacity: showHeader ? 1 : 0, transition: 'opacity 0.4s', pointerEvents: showHeader ? 'auto' : 'none' }}
        >
          <div className="bg-black/80 text-white p-3 rounded-lg text-xs space-y-1 max-w-xs backdrop-blur-sm">
            <p className="font-bold mb-2 text-[#D4AF37]">⌨️ Atalhos:</p>
            <p>• <strong>Espaço:</strong> Play/Pause</p>
            <p>• <strong>↑/↓:</strong> Rolar para Cima/Baixo</p>
            <p>• <strong>←/→:</strong> Música Anterior/Próxima</p>
            <p>• <strong>Scroll/Toque:</strong> Ajuste Manual</p>
            <p>• <strong>F11:</strong> Tela Cheia</p>
            <p>• <strong>Esc:</strong> Sair</p>
          </div>
        </div>

        <style>{`
          html, body {
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100vw !important;
          }
          #root, #root > * { width: 100% !important; height: 100% !important; }
          @media (max-width: 768px) {
            html { height: -webkit-fill-available !important; }
            body { min-height: 100vh !important; min-height: -webkit-fill-available !important; }
            #setlist-scroll-container {
              -webkit-overflow-scrolling: auto !important;
              overscroll-behavior: none;
              touch-action: pan-y pinch-zoom;
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}