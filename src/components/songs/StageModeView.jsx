import React, { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Music2, Key, Activity, Music4, Play, Pause, Gauge, Type, Palette, Settings, Maximize, Minimize, Volume2, RotateCcw, Languages } from "lucide-react";
import { translateCifraText, cifraToUpperCase } from "@/components/utils/chordTranslator";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { base44 } from "@/api/base44Client";
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

export default function StageModeView({ song, onClose }) {
  const [isScrolling, setIsScrolling] = useState(false);
  // scrollSpeed em px/s: 20 = muito lento, 200 = muito rápido. Padrão salvo ou 50px/s
  const [scrollSpeed, setScrollSpeed] = useState(song.scroll_speed || 50);
  const [fontSize, setFontSize] = useState(18);
  const pinchRef = useRef({ active: false, startDist: 0, startFontSize: 18 });
  const fontSizeRef = useRef(18);
  const [theme, setTheme] = useState("palco");
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(song.countdown_duration || 41);
  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);
  const delayTimeoutRef = useRef(null);
  const playbackAudioRef = useRef(null);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const lastManualScrollRef = useRef(0); // 0 = nunca houve interação manual (não bloqueia)
  const [showPortugueseChords, setShowPortugueseChords] = useState(false);
  const [mirrorWindow, setMirrorWindow] = useState(null);
  const [isMirroring, setIsMirroring] = useState(false);
  const [showHeader, setShowHeader] = useState(false);
  const wakeLockRef = useRef(null);
  
  const currentTheme = THEMES[theme];

  // Mantém ref sincronizada com fontSize para uso nos handlers de touch
  useEffect(() => { fontSizeRef.current = fontSize; }, [fontSize]);

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

    // Reativa o wake lock quando a página voltar ao foco (ex: troca de aba)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  const openMirrorWindow = () => {
    if (mirrorWindow && !mirrorWindow.closed) {
      mirrorWindow.close();
      setMirrorWindow(null);
      setIsMirroring(false);
      return;
    }

    const cifraContent = showPortugueseChords
      ? cifraToUpperCase(translateCifraText(song.cifra_text || ""))
      : cifraToUpperCase(song.cifra_text || "");

    const th = THEMES[theme];
    const chordLineRegex = /^[\sA-G#bm7649adjsuin°º%\/\(\)]{2,}$/;

    const lines = cifraContent.split('\n').map(line => {
      const isSection = line.trim().startsWith('[');
      const isChord = !isSection && chordLineRegex.test(line.trim()) && line.trim().length > 0 && !/[a-záàâãéêíóôõúç]{3,}/.test(line);
      const escaped = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      if (isSection) return `<span style="color:${th.chordColor};font-weight:900;font-size:${fontSize * 1.1}px">${escaped}</span>`;
      if (isChord) return `<span style="color:${th.chordColor};font-weight:700">${escaped}</span>`;
      return `<span>${escaped}</span>`;
    }).join('\n');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${song.title} - ${song.artist} | Espelho</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@700;900&display=swap');
  html,body{margin:0;padding:0;background:${th.bg};color:${th.text};overflow:hidden;width:100vw;height:100vh;}
  #content{padding:24px 16px;font-family:'Azeret Mono',monospace;font-size:${fontSize}px;line-height:1.35;white-space:pre-wrap;word-break:break-word;font-weight:bold;}
  #header{background:linear-gradient(90deg,#8B6F47,#A68A64);padding:12px 20px;display:flex;gap:12px;align-items:center;}
  #header h1{color:#fff;margin:0;font-size:18px;font-weight:900;text-transform:uppercase;}
  #header p{color:rgba(255,255,255,0.85);margin:0;font-size:13px;}
  #scroll{overflow-y:auto;height:calc(100vh - 60px);}
</style></head><body>
<div id="header"><div><h1>${song.title}</h1><p>${song.artist}${song.main_key ? ' • Tom: '+song.main_key : ''}${song.rhythm_name ? ' • '+song.rhythm_name : ''}</p></div></div>
<div id="scroll"><div id="content">${lines}</div></div>
<script>
  window.__speed=${scrollSpeed};
  window.__scrolling=false;
  window.__raf=null;
  var last=0;
  function loop(ts){
    if(!window.__scrolling){window.__raf=requestAnimationFrame(loop);return;}
    var delta=last?Math.min((ts-last)/1000,0.05):0;last=ts;
    var el=document.getElementById('scroll');
    el.scrollTop+=window.__speed*delta;
    if(el.scrollTop+el.clientHeight>=el.scrollHeight-5){window.__scrolling=false;}
    window.__raf=requestAnimationFrame(loop);
  }
  window.__raf=requestAnimationFrame(loop);
  window.addEventListener('message',function(e){
    if(e.data.type==='scroll'){window.__scrolling=e.data.playing;}
    if(e.data.type==='speed'){window.__speed=e.data.speed;}
    if(e.data.type==='reset'){document.getElementById('scroll').scrollTop=0;window.__scrolling=false;}
    if(e.data.type==='theme'){document.body.style.background=e.data.bg;document.getElementById('content').style.color=e.data.text;}
  });
</script></body></html>`;

    const w = window.open('', '_blank', 'width=1280,height=720,toolbar=no,menubar=no,scrollbars=no,resizable=yes');
    if (!w) { alert('Permita pop-ups para usar o espelho de tela.'); return; }
    w.document.write(html);
    w.document.close();
    w.onbeforeunload = () => { setMirrorWindow(null); setIsMirroring(false); };
    setMirrorWindow(w);
    setIsMirroring(true);
  };

  // Sincroniza estado de rolagem com a janela espelho
  useEffect(() => {
    if (!mirrorWindow || mirrorWindow.closed) return;
    mirrorWindow.postMessage({ type: 'scroll', playing: isScrolling }, '*');
  }, [isScrolling, mirrorWindow]);

  useEffect(() => {
    if (!mirrorWindow || mirrorWindow.closed) return;
    mirrorWindow.postMessage({ type: 'speed', speed: scrollSpeed }, '*');
  }, [scrollSpeed, mirrorWindow]);

  const toggleFullscreen = async () => {
    try {
      const elem = containerRef.current;
      if (!elem) return;

      if (!document.fullscreenElement) {
        // Tenta diferentes métodos de fullscreen para compatibilidade mobile
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Erro ao alternar tela cheia:", err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const startAutoScroll = async () => {
    // Entrar em tela cheia automaticamente
    if (!document.fullscreenElement && containerRef.current) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Erro ao entrar em tela cheia:", err);
      }
    }

    // Iniciar contagem regressiva APENAS se não foi iniciada ainda
    if (!countdownStarted) {
      setCountdownStarted(true);
      setCountdown(countdownDuration);
      
      const countInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Após o tempo configurado, iniciar rolagem
      delayTimeoutRef.current = setTimeout(() => {
        setIsScrolling(true);
        setCountdown(0);
      }, countdownDuration * 1000);
    } else {
      // Se já passou a contagem, inicia direto
      setIsScrolling(true);
    }
  };

  const stopAutoScroll = () => {
    setIsScrolling(false);
    // NÃO reseta countdown nem countdownStarted para manter o estado
    
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const resetEverything = () => {
    setIsScrolling(false);
    setCountdown(0);
    setCountdownStarted(false);
    
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }
    
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const toggleScroll = () => {
    if (isScrolling) {
      stopAutoScroll();
    } else {
      startAutoScroll();
    }
  };

  // Detecta interação manual do usuário (apenas scroll/touch na área da cifra, não cliques em botões)
  // E também o pinch-to-zoom para ajuste de fonte
  useEffect(() => {
    const scrollContainer = document.getElementById('lyrics-scroll-container');
    if (!scrollContainer) return;

    const getPinchDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const handleWheel = () => {
      lastManualScrollRef.current = performance.now();
    };

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
  }, []);

  useEffect(() => {
    const scrollContainer = document.getElementById('lyrics-scroll-container');
    
    if (!isScrolling || !scrollContainer) {
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
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
      const scrollableDistance = scrollHeight - clientHeight;

      if (scrollableDistance <= 0) {
        animationFrameId = requestAnimationFrame(scroll);
        scrollIntervalRef.current = animationFrameId;
        return;
      }

      // Ease-in: acelera suavemente nos primeiros 800ms
      const elapsed = now - scrollStartTime;
      const easeIn = elapsed < EASE_IN_DURATION
        ? elapsed / EASE_IN_DURATION
        : 1;

      // Ease-out: desacelera nos últimos 10% do conteúdo
      const progress = scrollTop / scrollableDistance;
      const easeOut = progress > 0.90
        ? Math.max(0.15, 1 - (progress - 0.90) / 0.10)
        : 1;

      const easeFactor = easeIn * easeOut;
      const scrollAmount = scrollSpeed * deltaTime * easeFactor;
      scrollContainer.scrollTop = scrollTop + scrollAmount;

      if (scrollTop + clientHeight >= scrollHeight - 5) {
        setIsScrolling(false);
        return;
      }

      animationFrameId = requestAnimationFrame(scroll);
      scrollIntervalRef.current = animationFrameId;
    };

    animationFrameId = requestAnimationFrame(scroll);
    scrollIntervalRef.current = animationFrameId;

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        scrollIntervalRef.current = null;
      }
    };
  }, [isScrolling, scrollSpeed]);



  const handleContentClick = (e) => {
    // Permite interação livre
  };

  const togglePlayback = () => {
    if (playbackAudioRef.current) {
      if (isPlaybackPlaying) {
        playbackAudioRef.current.pause();
      } else {
        playbackAudioRef.current.play().catch(err => {
          console.error("Erro ao tocar playback:", err);
        });
        // Inicia a rolagem automaticamente junto com o playback
        if (!isScrolling) {
          startAutoScroll();
        }
      }
    }
  };

  const restartPlayback = () => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current.currentTime = 0;
      setIsPlaybackPlaying(false);
    }
    // Reseta também a rolagem
    resetEverything();
    const scrollContainer = document.getElementById('lyrics-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  };

  const stopPlayback = () => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current.currentTime = 0;
    }
    setIsPlaybackPlaying(false);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        toggleScroll();
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          setIsFullscreen(false);
          stopAutoScroll();
        } else {
          resetEverything();
          stopPlayback();
          onClose();
        }
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const scrollContainer = document.getElementById('lyrics-scroll-container');
        if (scrollContainer) {
          scrollContainer.scrollTop -= 100;
          lastManualScrollRef.current = performance.now();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const scrollContainer = document.getElementById('lyrics-scroll-container');
        if (scrollContainer) {
          scrollContainer.scrollTop += 100;
          lastManualScrollRef.current = performance.now();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isScrolling, scrollSpeed, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ 
          backgroundColor: currentTheme.bg, 
          color: currentTheme.text,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          overflow: 'hidden',
          margin: 0,
          padding: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={handleContentClick}
        ref={containerRef}
      >
        {/* Cabeçalho fixo no topo - otimizado para mobile */}
        <div
          className="flex-shrink-0 w-full"
          style={{
            margin: 0, padding: 0,
            transition: 'opacity 0.4s ease, max-height 0.4s ease',
            opacity: showHeader ? 1 : 0,
            maxHeight: showHeader ? '300px' : '0px',
            overflow: 'hidden',
            pointerEvents: showHeader ? 'auto' : 'none',
          }}
        >
          <div className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] p-2 md:p-4" style={{ margin: 0, width: '100%' }}>
            {/* Primeira linha: Título e Sair */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-base md:text-3xl font-bold text-white uppercase truncate" style={{ letterSpacing: '0.5px' }}>
                  {song.title}
                </h1>
                <p className="text-[#F5F1E8] text-xs md:text-sm uppercase flex items-center gap-1">
                  <Music2 className="w-3 h-3" />
                  {song.artist}
                </p>
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  resetEverything();
                  stopPlayback();
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  }
                  onClose();
                }}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full min-h-[48px] min-w-[48px] md:h-9 px-3 md:px-4 text-xs md:text-sm font-bold flex-shrink-0 touch-manipulation"
                title="Sair do Modo Palco (Esc)"
              >
                <X className="w-5 h-5 md:mr-1" />
                <span className="hidden md:inline">Sair</span>
              </Button>
            </div>

            {/* Segunda linha: Controles à direita */}
            <div className="flex items-center justify-end gap-1 mb-2">
              {/* Playback controls */}
              {song.playback_url && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayback();
                    }}
                    className={`min-w-[44px] min-h-[44px] md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 touch-manipulation ${
                      isPlaybackPlaying 
                        ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                        : "bg-white/20 hover:bg-white/30"
                    }`}
                    title={isPlaybackPlaying ? "Pausar playback" : "Tocar playback"}
                  >
                    {isPlaybackPlaying ? (
                      <Pause className="w-4 h-4 md:w-4 md:h-4 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 md:w-4 md:h-4 text-white" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      restartPlayback();
                    }}
                    className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 bg-white/20 hover:bg-white/30"
                    title="Reiniciar playback e rolagem"
                  >
                    <RotateCcw className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </button>

                  <audio
                    ref={playbackAudioRef}
                    src={song.playback_url}
                    onPlay={() => setIsPlaybackPlaying(true)}
                    onPause={() => setIsPlaybackPlaying(false)}
                    onEnded={() => setIsPlaybackPlaying(false)}
                    onError={(e) => console.error("Erro no áudio:", e)}
                    preload="metadata"
                  />
                </>
              )}



              {/* Controles de Zoom */}
              <div className="bg-white rounded-full shadow-lg px-1.5 md:px-2 py-0.5 md:py-1 flex items-center gap-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFontSize(prev => Math.max(8, prev - 2));
                  }}
                  className="h-5 w-5 md:h-6 md:w-6 p-0 text-xs font-bold text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white rounded-full"
                  title="Diminuir texto"
                >
                  A−
                </Button>
                <span className="text-[9px] md:text-[10px] font-bold text-[#8B6F47] min-w-[18px] md:min-w-[22px] text-center">
                  {fontSize}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFontSize(prev => Math.min(48, prev + 2));
                  }}
                  className="h-5 w-5 md:h-6 md:w-6 p-0 text-xs font-bold text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white rounded-full"
                  title="Aumentar texto"
                >
                  A+
                </Button>
              </div>

              <Popover open={showSettings} onOpenChange={setShowSettings}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                    className="text-white hover:bg-white/20 rounded-full h-7 w-7 md:h-9 md:w-9 p-0"
                    title="Configurações"
                  >
                    <Settings className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </PopoverTrigger>
                    <PopoverContent 
                      className="w-80 p-4" 
                      onClick={(e) => e.stopPropagation()}
                      side="bottom"
                      align="center"
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                            <Type className="w-4 h-4" />
                            Tamanho da Fonte: {fontSize}px
                          </label>
                          <Slider
                            value={[fontSize]}
                            onValueChange={([val]) => setFontSize(val)}
                            min={8}
                            max={48}
                            step={2}
                            className="mt-2"
                          />
                          <div className="flex justify-between text-xs text-[#A68A64] mt-1">
                            <span>Menor</span>
                            <span>Maior</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            Tema de Cores
                          </label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {Object.entries(THEMES).map(([key, { bg, text, name }]) => (
                              <button
                                key={key}
                                onClick={() => setTheme(key)}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  theme === key ? 'border-[#8B6F47] shadow-lg' : 'border-gray-200'
                                }`}
                                style={{ backgroundColor: bg, color: text }}
                              >
                                <div className="text-xs font-bold text-center">
                                  {name}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPortugueseChords(prev => !prev);
                }}
                className={`rounded-full h-7 w-7 md:h-9 md:w-9 p-0 ${showPortugueseChords ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'text-white hover:bg-white/20'}`}
                title={showPortugueseChords ? "Mostrar cifras (A, B, C...)" : "Mostrar nomes (Dó, Ré, Mi...)"}
              >
                <Languages className="w-3 h-3 md:w-4 md:h-4" />
              </Button>

              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="text-white hover:bg-white/20 rounded-full h-7 w-7 md:h-9 md:w-9 p-0"
                title={isFullscreen ? "Sair Tela Cheia (F11)" : "Tela Cheia (F11)"}
              >
                {isFullscreen ? <Minimize className="w-3 h-3 md:w-4 md:h-4" /> : <Maximize className="w-3 h-3 md:w-4 md:h-4" />}
              </Button>
            </div>

                {/* Terceira linha: Badges de informações */}
                <div className="flex items-center justify-between gap-2 mt-2">
                {song.main_key && (
                  <Badge 
                    className="text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 uppercase font-bold"
                    style={{ backgroundColor: currentTheme.chordColor, color: currentTheme.bg }}
                  >
                    <Key className="w-3 h-3 mr-1" />
                    {song.main_key}
                  </Badge>
                )}
                {song.rhythm_name && (
                  <Badge 
                    className="text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 uppercase font-bold"
                    style={{ backgroundColor: currentTheme.chordColor, color: currentTheme.bg, opacity: 0.9 }}
                  >
                    <Music4 className="w-3 h-3 mr-1" />
                    {song.rhythm_name}
                  </Badge>
                )}
                {song.tempo && (
                  <Badge 
                    className="text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 uppercase font-bold"
                    style={{ backgroundColor: currentTheme.chordColor, color: currentTheme.bg, opacity: 0.8 }}
                  >
                    <Activity className="w-3 h-3 mr-1" />
                    {song.tempo} BPM
                  </Badge>
                )}
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                {countdown > 0 && (
                  <Badge className="bg-yellow-500 text-white animate-pulse uppercase text-xs font-bold">
                    Iniciando em {countdown}s
                  </Badge>
                )}
              </div>
            </div>
          </div>

        {/* Barra de controle acima da cifra */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 12px',
            backgroundColor: currentTheme.bg,
            borderBottom: `1px solid ${currentTheme.text}20`,
          }}
        >
          {/* Botão Play ao lado esquerdo */}
          {song.playback_url && (
            <button
              onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs transition-all active:scale-95 ${
                isPlaybackPlaying ? 'animate-pulse' : ''
              }`}
              style={{
                background: isPlaybackPlaying ? 'rgba(239,68,68,0.85)' : 'rgba(34,197,94,0.85)',
                color: '#fff',
                border: isPlaybackPlaying ? '1.5px solid rgba(239,68,68,0.5)' : '1.5px solid rgba(34,197,94,0.5)',
              }}
              title={isPlaybackPlaying ? "Pausar playback" : "Tocar playback"}
            >
              {isPlaybackPlaying ? <Pause className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              {isPlaybackPlaying ? 'Pausar' : 'Play'}
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setShowHeader(h => !h); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs transition-all active:scale-95"
            style={{
              background: showHeader ? 'rgba(239,68,68,0.85)' : 'rgba(139,111,71,0.9)',
              color: '#fff',
              border: showHeader ? '1.5px solid rgba(239,68,68,0.5)' : '1.5px solid #D4AF37',
            }}
          >
            <Settings className="w-3 h-3" />
            Control
          </button>

          {/* Controle de velocidade */}
          <div className="bg-white rounded-full shadow-lg px-2 py-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); resetEverything(); const sc = document.getElementById('lyrics-scroll-container'); if(sc) sc.scrollTop=0; }}
              className="text-red-500 hover:text-red-700 flex-shrink-0 transition-colors"
              title="Resetar rolagem"
            >
              <X className="w-3 h-3" />
            </button>
            <span className="text-sm leading-none select-none" title="Mais lento">🐢</span>
            <Slider
              value={[scrollSpeed]}
              onValueChange={async ([val]) => {
                setScrollSpeed(val);
                try {
                  await base44.entities.Song.update(song.id, { scroll_speed: val });
                } catch (err) {
                  console.error("Erro ao salvar velocidade:", err);
                }
              }}
              min={5}
              max={200}
              step={1}
              className="w-10 md:w-16"
            />
            <span className="text-sm leading-none select-none" title="Mais rápido">🐇</span>
            <button
              onClick={(e) => { e.stopPropagation(); toggleScroll(); }}
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                isScrolling ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              title={isScrolling ? "Pausar rolagem" : "Iniciar rolagem"}
            >
              {isScrolling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
            </button>
          </div>

          {/* Botão Sair */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetEverything();
              stopPlayback();
              if (document.fullscreenElement) document.exitFullscreen();
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs transition-all active:scale-95"
            style={{
              background: 'rgba(239,68,68,0.85)',
              color: '#fff',
              border: '1.5px solid rgba(239,68,68,0.5)',
            }}
            title="Sair do Modo Palco"
          >
            <X className="w-3 h-3" />
            Sair
          </button>
        </div>

        {/* Área de rolagem da cifra */}
        <div 
          style={{ 
            flex: 1,
            overflowY: 'scroll',
            overflowX: 'hidden',
            backgroundColor: currentTheme.bg,
            width: '100%',
            margin: 0,
            padding: 0,
            position: 'relative',
            WebkitOverflowScrolling: 'auto',
          }}
          id="lyrics-scroll-container"
        >
          <div className="w-full pb-32" style={{ margin: '0 auto', padding: '12px 8px 128px 8px' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >

              {song.cifra_text ? (
                <div 
                className="rounded-lg p-3 border-2"
                  style={{ 
                    backgroundColor: theme === "claro" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.3)",
                    borderColor: currentTheme.text + "40"
                  }}
                >
                  <pre 
                    className="whitespace-pre-wrap"
                    style={{ 
                      fontSize: `${fontSize}px`,
                      color: currentTheme.text,
                      lineHeight: '1.35',
                      fontWeight: 'bold',
                      fontFamily: "'Azeret Mono', monospace",
                    }}
                  >
                    {(showPortugueseChords ? cifraToUpperCase(translateCifraText(song.cifra_text)) : cifraToUpperCase(song.cifra_text))
                      .split('\n')
                      .map((line, i) => {
                        const trimmed = line.trim();
                        const isSection = trimmed.startsWith('[');
                        // Remove caracteres decorativos comuns em cifras antes de testar
                        const cleanedForTest = trimmed.replace(/^\|/, '').replace(/\d+X$/i, '').replace(/[-|]/g, ' ').trim();
                        // Detecta linha de acordes: após limpeza, contém apenas acordes válidos e espaços
                        const isChordLine = !isSection && cleanedForTest.length > 0 &&
                          /^([A-G][#b]?(?:m(?:aj)?|dim|aug|sus|add)?(?:\d+)?(?:\/[A-G][#b]?)?[\s%]+)*[A-G][#b]?(?:m(?:aj)?|dim|aug|sus|add)?(?:\d+)?(?:\/[A-G][#b]?)?$/.test(cleanedForTest) &&
                          !/[a-záàâãéêíóôõúçA-ZÁÀÂÃÉÊÍÓÔÕÚÇ]{4,}/.test(cleanedForTest);
                        return (
                          <span
                            key={i}
                            style={{
                              display: 'block',
                              color: isChordLine ? currentTheme.chordColor : currentTheme.text,
                              fontWeight: (isChordLine || isSection) ? '900' : 'bold',
                            }}
                          >
                            {line || '\u00A0'}
                          </span>
                        );
                      })
                    }
                  </pre>
                </div>
              ) : (
                <div 
                  className="rounded-lg p-8 border-2 text-center"
                  style={{ 
                    backgroundColor: theme === "claro" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.3)",
                    borderColor: currentTheme.text + "40"
                  }}
                >
                  <p className="text-xl italic uppercase" style={{ color: currentTheme.text, opacity: 0.6 }}>
                    CIFRA NÃO DISPONÍVEL
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>



        {/* Instruções de atalhos do teclado - Oculta no mobile */}
        <div 
          className="hidden md:block fixed bottom-20 right-4"
          style={{ opacity: showHeader ? 1 : 0, transition: 'opacity 0.4s', pointerEvents: showHeader ? 'auto' : 'none' }}
        >
          <div className="bg-black/80 text-white p-3 rounded-lg text-xs space-y-1 max-w-xs backdrop-blur-sm">
          <p className="font-bold mb-2 text-[#D4AF37]">⌨️ Atalhos:</p>
          <p>• <strong>Espaço:</strong> Play/Pause</p>
          <p>• <strong>↑/↓:</strong> Rolar para Cima/Baixo</p>
          <p>• <strong>Scroll/Toque:</strong> Ajuste Manual</p>
          <p>• <strong>F11:</strong> Tela Cheia</p>
          <p>• <strong>Esc:</strong> Sair</p>
          </div>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@700;900&display=swap');

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: .8;
            }
          }

          /* Mobile - Garante tela cheia sem margens */
          html, body {
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100vw !important;
          }
          
          #root, #root > * {
            width: 100% !important;
            height: 100% !important;
          }

          @media (max-width: 768px) {
            html {
              height: -webkit-fill-available !important;
            }
            
            body {
              min-height: 100vh !important;
              min-height: -webkit-fill-available !important;
            }

            #lyrics-scroll-container {
              /* Força scroll nativo no iOS sem inércia, para o auto-scroll funcionar corretamente */
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