import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, Play, Pause, ChevronLeft, ChevronRight, Minus, Plus, Settings2, Maximize, Minimize, ArrowUpToLine, Headphones,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isChordLine, chordStartIndex, transposeCifraText, transposeKey, preferFlatsForKey } from "@/utils/transposition";
import { translateCifraText } from "@/components/utils/chordTranslator";
import { tituloLegivel } from "@/components/songs/SongRow";
import { quebrarCifra } from "./cifraPalco";
import { simplificarCifra, NIVEIS_SIMPLIFICACAO, lerNivelSimplificacao, gravarNivelSimplificacao } from "@/utils/simplificarAcordes";

// ---------------------------------------------------------------------------
// MODO PALCO — uma tela só para tocar ao vivo.
// • Uma música (biblioteca) ou um repertório inteiro (anterior/próxima).
// • Rolagem automática com velocidade ajustável; contagem de 3 s (ajustável) antes de rolar.
// • Letra ajustada à largura da tela (acordes não desalinham); A−/A+ para ajustar.
// • Tom − / + na hora. Tela não apaga. Tema escuro, claro ou alto contraste.
// • Pedal bluetooth / teclado: ↓ PgDn Espaço = desce uma tela; ↑ PgUp = sobe;
//   → próxima música; ← anterior; Enter ou P = rolar/pausar; B = playback; Esc = sair.
// • Toque no meio da tela mostra/esconde os controles; deslize para os lados
//   troca de música.
// ---------------------------------------------------------------------------

const TEMAS = {
  escuro: { nome: "Escuro", fundo: "#14100C", texto: "#FFF6E0", acorde: "#FFC940", secao: "#C9A876", barra: "#14100C", borda: "rgba(255,246,224,.12)", botao: "rgba(255,246,224,.08)" },
  claro: { nome: "Claro", fundo: "#FBF6EA", texto: "#2E2418", acorde: "#A0522D", secao: "#8B6F47", barra: "#FFFDF8", borda: "#E6DCC8", botao: "#F3EAD6" },
  contraste: { nome: "Alto contraste", fundo: "#000000", texto: "#FFFFFF", acorde: "#FFFF00", secao: "#7DD3FC", barra: "#000000", borda: "rgba(255,255,255,.25)", botao: "rgba(255,255,255,.12)" },
};

const VEL_MIN = 10, VEL_MAX = 200, VEL_PASSO = 5;
const FONTE_MIN = 12, FONTE_MAX = 44;
const ESPERAS = [0, 3, 5, 10, 15, 20, 30];
const ESPERA_PADRAO = 3; // segundos de contagem antes de começar a rolar

// Valores antigos (0,5 etc.) eram de outra escala: usa 40 como padrão
const velInicial = (s) => {
  const v = Number(s?.scroll_speed);
  return v >= VEL_MIN ? Math.min(VEL_MAX, Math.round(v / VEL_PASSO) * VEL_PASSO) : 40;
};

const lerJSON = (k, padrao) => { try { return { ...padrao, ...JSON.parse(localStorage.getItem(k) || "{}") }; } catch { return padrao; } };
const gravarJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem espaço */ } };

export default function PalcoView({ songs = [], startIndex = 0, titulo, onClose }) {
  const lista = useMemo(() => songs.filter(Boolean), [songs]);
  const [indice, setIndice] = useState(Math.min(Math.max(startIndex, 0), Math.max(lista.length - 1, 0)));
  const song = lista[indice];

  const [global, setGlobal] = useState(() => lerJSON("palco:global", { tema: "escuro", nomesPT: false, espera: ESPERA_PADRAO }));
  const [nivelSimpl, setNivelSimpl] = useState(lerNivelSimplificacao);
  const mudarNivelSimpl = (v) => { setNivelSimpl(v); gravarNivelSimplificacao(v); };
  // Velocidades gravadas nesta sessão (a lista que abriu o palco pode estar desatualizada)
  const velGravadaRef = useRef({});
  // Preferências da música: o que foi ajustado neste aparelho; a velocidade gravada
  // na música vale se for mais nova (ajustada em outro aparelho pelo administrador)
  const prefsPadrao = useCallback((s) => {
    const base = { vel: velInicial(s), fonte: null, semitons: 0 };
    const loc = lerJSON(`palco:${s?.id}`, {});
    const p = { ...base, ...loc };
    const naMusica = s?.updated_date ? Date.parse(s.updated_date) : 0;
    if (loc.vel != null && loc.velEm && naMusica > loc.velEm + 5000) p.vel = base.vel;
    if (s?.id && velGravadaRef.current[s.id] != null) p.vel = velGravadaRef.current[s.id];
    return p;
  }, []);
  const [prefs, setPrefs] = useState(() => prefsPadrao(song));

  const [rolando, setRolando] = useState(false);
  const [contagem, setContagem] = useState(0);
  const [controles, setControles] = useState(true);
  const [ajustes, setAjustes] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [larguraArea, setLarguraArea] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const raizRef = useRef(null);
  const areaRef = useRef(null);
  const animRef = useRef(null);
  const acumuladoRef = useRef(0);
  const esconderRef = useRef(null);
  const toqueRef = useRef(null);
  const baseRef = useRef(null);
  const [baseTocando, setBaseTocando] = useState(false);
  const [baseCarregando, setBaseCarregando] = useState(false);

  const t = TEMAS[global.tema] || TEMAS.escuro;

  useEffect(() => { base44.auth.me().then((u) => setIsAdmin(u?.role === "admin")).catch(() => {}); }, []);

  // Troca de música: carrega as preferências dela, volta ao topo, para a rolagem
  useEffect(() => {
    setPrefs(prefsPadrao(song));
    setRolando(false);
    setContagem(0);
    acumuladoRef.current = 0;
    if (areaRef.current) areaRef.current.scrollTop = 0;
    if (baseRef.current) { baseRef.current.pause(); baseRef.current.currentTime = 0; }
    setBaseTocando(false);
  }, [song?.id, prefsPadrao]);

  // Playback (base) da música
  const alternarBase = async () => {
    const a = baseRef.current;
    if (!a) return;
    if (!a.paused) { a.pause(); return; }
    try { setBaseCarregando(true); await a.play(); } catch { /* bloqueado ou sem rede */ } finally { setBaseCarregando(false); }
  };

  const mudarPrefs = (patch) => setPrefs((p) => {
    const novo = { ...p, ...patch };
    if (song?.id) gravarJSON(`palco:${song.id}`, novo);
    return novo;
  });
  const mudarGlobal = (patch) => setGlobal((g) => { const novo = { ...g, ...patch }; gravarJSON("palco:global", novo); return novo; });

  // Velocidade ajustada fica gravada NA MÚSICA (administrador) para as próximas apresentações.
  // Grava 1,5 s depois do último ajuste, e na hora ao trocar de música ou sair do palco.
  const pendenteRef = useRef(null);
  const timerVelRef = useRef(null);
  const isAdminRef = useRef(false);
  useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);
  const gravarVelocidade = useCallback(() => {
    clearTimeout(timerVelRef.current);
    const p = pendenteRef.current;
    pendenteRef.current = null;
    if (!p || !isAdminRef.current) return;
    velGravadaRef.current[p.id] = p.vel;
    base44.entities.Song.update(p.id, { scroll_speed: p.vel }).catch(() => {});
  }, []);
  useEffect(() => () => gravarVelocidade(), [song?.id, gravarVelocidade]); // trocou de música ou saiu
  const marcarVelocidade = (vel) => {
    if (!song?.id) return;
    pendenteRef.current = { id: song.id, vel };
    clearTimeout(timerVelRef.current);
    timerVelRef.current = setTimeout(gravarVelocidade, 1500);
  };

  // Cifra pronta para exibir (tom, nomes em português)
  const tomBase = song?.main_key || song?.original_key || "";
  const usarBemois = preferFlatsForKey(tomBase ? transposeKey(tomBase, prefs.semitons) : "C");
  const linhas = useMemo(() => {
    let texto = song?.cifra_text || "";
    if (prefs.semitons) texto = transposeCifraText(texto, prefs.semitons, usarBemois);
    if (nivelSimpl) texto = simplificarCifra(texto, nivelSimpl);
    // Letra em maiúsculas; linhas de acorde ficam como estão (senão "Bb" virava "BB")
    texto = texto.split("\n").map((l) => {
      if (!isChordLine(l)) return l.toUpperCase();
      const ini = chordStartIndex(l);
      return ini ? l.slice(0, ini).toUpperCase() + l.slice(ini) : l;
    }).join("\n");
    if (global.nomesPT) texto = translateCifraText(texto);
    return texto.replace(/\r/g, "").replace(/\t/g, "    ").split("\n");
  }, [song?.cifra_text, prefs.semitons, usarBemois, global.nomesPT, nivelSimpl]);
  const tomAtual = tomBase ? transposeKey(tomBase, prefs.semitons, usarBemois) : "";

  // Tamanho que faz a linha mais longa caber na largura (fonte monoespaçada ≈ 0,6 em por letra)
  const maiorLinha = useMemo(() => Math.max(20, ...linhas.map((l) => l.trimEnd().length)), [linhas]);
  useEffect(() => {
    const area = areaRef.current;
    const medir = () => setLarguraArea(Math.min(area?.clientWidth || 0, document.documentElement.clientWidth || Infinity));
    medir();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    if (ro && area) ro.observe(area);
    window.addEventListener("resize", medir);
    return () => { ro?.disconnect(); window.removeEventListener("resize", medir); };
  }, []);
  // Largura real de uma letra na fonte da cifra (medida na tela, não suposta)
  const [proporcao, setProporcao] = useState(0.6);
  const reguaRef = useRef(null);
  useEffect(() => {
    const medir = () => {
      const r = reguaRef.current;
      if (r && r.offsetWidth) setProporcao(r.offsetWidth / (40 * 100));
    };
    medir();
    document.fonts?.ready?.then(medir).catch(() => {});
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);
  const fonteQueCabe = larguraArea ? Math.floor(((larguraArea - 32) / (maiorLinha * proporcao)) * 2) / 2 : 18;
  const fonte = Math.min(FONTE_MAX, Math.max(FONTE_MIN, prefs.fonte ?? Math.min(30, Math.max(16, fonteQueCabe))));
  const colunas = larguraArea ? Math.floor((larguraArea - 32) / (fonte * proporcao)) - 1 : 0;
  const blocos = useMemo(() => quebrarCifra(linhas, colunas, isChordLine), [linhas, colunas]);

  // Tela sempre acesa
  useEffect(() => {
    let lock = null;
    const pedir = async () => { try { if ("wakeLock" in navigator) lock = await navigator.wakeLock.request("screen"); } catch { /* sem suporte */ } };
    pedir();
    const aoVoltar = () => { if (document.visibilityState === "visible") pedir(); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { document.removeEventListener("visibilitychange", aoVoltar); lock?.release?.().catch(() => {}); };
  }, []);

  // Trava a rolagem da página por trás
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, []);

  // Contagem regressiva antes de começar a rolar
  useEffect(() => {
    if (contagem <= 0) return;
    const id = setTimeout(() => {
      if (contagem === 1) { setContagem(0); setRolando(true); } else setContagem(contagem - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [contagem]);

  // Rolagem automática
  useEffect(() => {
    if (!rolando) { cancelAnimationFrame(animRef.current); return; }
    let ultimo = performance.now();
    const passo = (agora) => {
      const area = areaRef.current;
      const dt = Math.min(0.1, (agora - ultimo) / 1000);
      ultimo = agora;
      if (area) {
        acumuladoRef.current += prefs.vel * dt;
        const inteiro = Math.floor(acumuladoRef.current);
        if (inteiro >= 1) { area.scrollTop += inteiro; acumuladoRef.current -= inteiro; }
        if (area.scrollTop + area.clientHeight >= area.scrollHeight - 2) { setRolando(false); setControles(true); return; }
      }
      animRef.current = requestAnimationFrame(passo);
    };
    animRef.current = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(animRef.current);
  }, [rolando, prefs.vel]);

  // Controles somem sozinhos enquanto rola
  const mostrarControles = useCallback(() => {
    setControles(true);
    clearTimeout(esconderRef.current);
    esconderRef.current = setTimeout(() => setControles(false), 4000);
  }, []);
  useEffect(() => {
    if (rolando) mostrarControles(); else { clearTimeout(esconderRef.current); setControles(true); }
    return () => clearTimeout(esconderRef.current);
  }, [rolando, mostrarControles]);

  const alternarRolagem = useCallback(() => {
    if (rolando || contagem > 0) { setRolando(false); setContagem(0); return; }
    const area = areaRef.current;
    if (area && area.scrollTop + area.clientHeight >= area.scrollHeight - 2) area.scrollTop = 0;
    // Contagem antes de rolar: a espera escolhida no começo da música;
    // ao continuar do meio (depois de pausar), no máximo 3 s
    const espera = Number(global.espera) || 0;
    const segundos = area && area.scrollTop <= 2 ? espera : Math.min(espera, 3);
    if (segundos > 0) setContagem(segundos);
    else setRolando(true);
  }, [rolando, contagem, global.espera]);

  const irPara = useCallback((i) => { if (i >= 0 && i < lista.length) setIndice(i); }, [lista.length]);
  const pagina = useCallback((dir) => {
    const area = areaRef.current;
    if (!area) return;
    area.scrollBy({ top: dir * area.clientHeight * 0.85, behavior: "smooth" });
  }, []);
  const velocidade = (d) => {
    const vel = Math.min(VEL_MAX, Math.max(VEL_MIN, prefs.vel + d * VEL_PASSO));
    mudarPrefs({ vel, velEm: Date.now() });
    marcarVelocidade(vel);
  };
  const tamanho = (d) => mudarPrefs({ fonte: Math.min(FONTE_MAX, Math.max(FONTE_MIN, Math.round((fonte + d) * 2) / 2)) });

  // Pedal bluetooth e teclado
  useEffect(() => {
    const tecla = (e) => {
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "SELECT") return;
      const area = areaRef.current;
      const noFim = area && area.scrollTop + area.clientHeight >= area.scrollHeight - 2;
      switch (e.key) {
        case "ArrowDown": case "PageDown": case " ":
          e.preventDefault();
          if (noFim && indice < lista.length - 1) irPara(indice + 1); else pagina(1);
          break;
        case "ArrowUp": case "PageUp":
          e.preventDefault(); pagina(-1); break;
        case "ArrowRight": e.preventDefault(); irPara(indice + 1); break;
        case "ArrowLeft": e.preventDefault(); irPara(indice - 1); break;
        case "Enter": case "p": case "P": e.preventDefault(); alternarRolagem(); break;
        case "b": case "B": e.preventDefault(); alternarBase(); break;
        case "+": case "=": velocidade(1); break;
        case "-": velocidade(-1); break;
        case "Escape": if (!document.fullscreenElement) onClose?.(); break;
        default:
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  // Toque: deslizar para os lados troca de música; um toque simples mostra/esconde os controles
  const suprimirCliqueRef = useRef(false);
  const aoTocar = (e) => { const p = e.touches?.[0]; if (p) toqueRef.current = { x: p.clientX, y: p.clientY }; };
  const aoSoltar = (e) => {
    const ini = toqueRef.current; toqueRef.current = null;
    const p = e.changedTouches?.[0];
    if (!ini || !p) return;
    const dx = p.clientX - ini.x, dy = p.clientY - ini.y;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5 && lista.length > 1) {
      suprimirCliqueRef.current = true;
      irPara(indice + (dx < 0 ? 1 : -1));
    }
  };
  const aoClicar = () => {
    if (suprimirCliqueRef.current) { suprimirCliqueRef.current = false; return; }
    if (controles && rolando) { clearTimeout(esconderRef.current); setControles(false); } else mostrarControles();
  };

  const telaCheiaAlternar = async () => {
    try {
      if (!document.fullscreenElement) { await (raizRef.current?.requestFullscreen?.() || raizRef.current?.webkitRequestFullscreen?.()); setTelaCheia(true); }
      else { await document.exitFullscreen?.(); setTelaCheia(false); }
    } catch { /* sem suporte (iPhone) */ }
  };
  useEffect(() => {
    const f = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  if (!song) return null;

  const proxima = lista[indice + 1];
  const botao = { background: t.botao, color: t.texto };
  const visivel = controles || !rolando;

  return (
    <div ref={raizRef} className="fixed inset-0 z-[90] flex flex-col select-none" style={{ background: t.fundo, color: t.texto }} role="dialog" aria-label={`Modo palco: ${tituloLegivel(song.title)}`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;800&display=swap');`}</style>
      {/* Topo */}
      <div
        className="absolute top-0 inset-x-0 z-10 flex items-center gap-2 px-2 transition-transform duration-300"
        style={{ background: t.barra, borderBottom: `1px solid ${t.borda}`, paddingTop: "env(safe-area-inset-top)", transform: visivel ? "none" : "translateY(-110%)" }}
      >
        <button type="button" onClick={onClose} aria-label="Sair do modo palco" className="w-12 h-12 flex items-center justify-center rounded-xl flex-shrink-0">
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0 py-1.5">
          <div className="font-bold text-[17px] leading-tight truncate">{tituloLegivel(song.title)}</div>
          <div className="text-[13px] opacity-75 truncate">
            {tituloLegivel(song.artist)}
            {lista.length > 1 && ` · ${indice + 1} de ${lista.length}${titulo ? ` · ${titulo}` : ""}`}
          </div>
        </div>
        {tomAtual && (
          <div className="flex-shrink-0 px-2.5 h-9 flex items-center rounded-lg text-sm font-bold" style={{ background: t.botao, color: t.acorde }}>
            Tom {tomAtual}
          </div>
        )}
        {song.playback_url && (
          <button
            type="button"
            onClick={alternarBase}
            aria-label={baseTocando ? "Pausar playback" : "Tocar playback"}
            className="flex-shrink-0 h-9 px-2.5 flex items-center gap-1.5 rounded-lg text-sm font-bold"
            style={baseTocando ? { background: t.acorde, color: t.fundo } : { background: t.botao, color: t.texto }}
          >
            {baseTocando ? <Pause className="w-4 h-4" fill="currentColor" /> : <Headphones className="w-4 h-4" />}
            <span>{baseCarregando ? "…" : "Base"}</span>
          </button>
        )}
        <button type="button" onClick={() => setAjustes(true)} aria-label="Ajustes" className="w-12 h-12 flex items-center justify-center rounded-xl flex-shrink-0">
          <Settings2 className="w-6 h-6" />
        </button>
      </div>

      {song.playback_url && (
        <audio
          ref={baseRef}
          src={song.playback_url}
          preload="none"
          onPlay={() => setBaseTocando(true)}
          onPause={() => setBaseTocando(false)}
          onEnded={() => setBaseTocando(false)}
        />
      )}

      {/* Cifra */}
      <div
        ref={areaRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ paddingTop: "calc(64px + env(safe-area-inset-top))", paddingBottom: 140, WebkitOverflowScrolling: "touch" }}
        onTouchStart={aoTocar}
        onTouchEnd={aoSoltar}
        onClick={aoClicar}
      >
        <span
          ref={reguaRef}
          aria-hidden="true"
          style={{ position: "absolute", visibility: "hidden", whiteSpace: "pre", fontFamily: "'JetBrains Mono', 'Azeret Mono', ui-monospace, Menlo, monospace", fontSize: 100, fontWeight: 800 }}
        >{"MÃ".repeat(20)}</span>
        <pre
          className="m-0 px-4"
          style={{ fontFamily: "'JetBrains Mono', 'Azeret Mono', ui-monospace, Menlo, monospace", fontSize: fonte, lineHeight: 1.38, whiteSpace: "pre", fontWeight: 600 }}
        >
          {song.cifra_text ? blocos.map(({ texto: linha, tipo }, i) => {
            const limpa = linha.trim();
            const secao = /^\[[^\]]*\]$/.test(limpa);
            const acorde = !secao && (tipo === "acorde" || (tipo == null && isChordLine(linha)));
            return (
              <span
                key={i}
                style={{
                  display: "block",
                  color: acorde ? t.acorde : secao ? t.secao : t.texto,
                  fontWeight: acorde ? 800 : secao ? 700 : 600,
                  fontSize: secao ? "0.8em" : undefined,
                  letterSpacing: secao ? ".06em" : undefined,
                  marginTop: secao && i > 0 ? "0.6em" : undefined,
                }}
              >
                {linha || "\u00A0"}
              </span>
            );
          }) : <span style={{ opacity: .7 }}>Esta música ainda não tem cifra cadastrada.</span>}
        </pre>

        {proxima && (
          <div className="px-4 pt-8">
            <button type="button" onClick={(e) => { e.stopPropagation(); irPara(indice + 1); }} className="w-full rounded-2xl px-4 py-4 text-left flex items-center gap-3" style={botao}>
              <div className="flex-1 min-w-0">
                <div className="text-xs opacity-70">Próxima</div>
                <div className="text-lg font-bold truncate">{tituloLegivel(proxima.title)}</div>
              </div>
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>
        )}
      </div>


      {/* Barra de baixo */}
      <div
        className="absolute bottom-0 inset-x-0 z-10 transition-transform duration-300"
        style={{ background: t.barra, borderTop: `1px solid ${t.borda}`, paddingBottom: "env(safe-area-inset-bottom)", transform: visivel ? "none" : "translateY(110%)" }}
      >
        <div className="flex items-center justify-between gap-2 px-2 py-2 max-w-3xl mx-auto">
          {lista.length > 1 ? (
            <button type="button" onClick={() => irPara(indice - 1)} disabled={indice === 0} aria-label="Música anterior" className="w-14 h-14 flex items-center justify-center rounded-2xl disabled:opacity-30" style={botao}>
              <ChevronLeft className="w-8 h-8" />
            </button>
          ) : (
            <button type="button" onClick={() => { if (areaRef.current) areaRef.current.scrollTop = 0; }} aria-label="Voltar ao início" className="w-14 h-14 flex items-center justify-center rounded-2xl" style={botao}>
              <ArrowUpToLine className="w-6 h-6" />
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => velocidade(-1)} aria-label="Mais devagar" className="w-12 h-14 flex items-center justify-center rounded-2xl" style={botao}>
              <Minus className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={alternarRolagem}
              aria-label={rolando || contagem > 0 ? "Pausar rolagem" : "Começar a rolar"}
              className="h-16 min-w-[96px] px-4 flex flex-col items-center justify-center rounded-2xl font-bold"
              style={{ background: t.acorde, color: t.fundo }}
            >
              {rolando || contagem > 0 ? <Pause className="w-7 h-7" fill="currentColor" /> : <Play className="w-7 h-7 ml-0.5" fill="currentColor" />}
              <span className="text-[11px] leading-none mt-0.5">vel. {prefs.vel}</span>
            </button>
            <button type="button" onClick={() => velocidade(1)} aria-label="Mais rápido" className="w-12 h-14 flex items-center justify-center rounded-2xl" style={botao}>
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {lista.length > 1 ? (
            <button type="button" onClick={() => irPara(indice + 1)} disabled={indice >= lista.length - 1} aria-label="Próxima música" className="w-14 h-14 flex items-center justify-center rounded-2xl disabled:opacity-30" style={botao}>
              <ChevronRight className="w-8 h-8" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button type="button" onClick={() => tamanho(-1)} aria-label="Diminuir letra" className="w-11 h-14 rounded-2xl text-sm font-bold" style={botao}>A−</button>
              <button type="button" onClick={() => tamanho(1)} aria-label="Aumentar letra" className="w-11 h-14 rounded-2xl text-lg font-bold" style={botao}>A+</button>
            </div>
          )}
        </div>
      </div>

      {/* Ajustes */}
      {ajustes && (
        <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,.55)" }} onClick={() => setAjustes(false)}>
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-5 max-h-[85vh] overflow-y-auto"
            style={{ background: global.tema === "claro" ? "#FFFDF8" : "#1F1914", color: t.texto, paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">Ajustes do palco</div>
              <button type="button" onClick={() => setAjustes(false)} aria-label="Fechar ajustes" className="w-11 h-11 flex items-center justify-center rounded-xl" style={botao}><X className="w-5 h-5" /></button>
            </div>

            <Linha rotulo="Tom" detalhe={tomAtual ? `${tomAtual}${prefs.semitons ? ` (original ${tomBase})` : ""}` : "sem tom definido"}>
              <Passo onMenos={() => mudarPrefs({ semitons: prefs.semitons - 1 })} onMais={() => mudarPrefs({ semitons: prefs.semitons + 1 })} estilo={botao} />
              {prefs.semitons !== 0 && <button type="button" onClick={() => mudarPrefs({ semitons: 0 })} className="h-11 px-3 rounded-xl text-sm" style={botao}>Original</button>}
            </Linha>

            <div>
              <div className="font-semibold">Acordes</div>
              <div className="text-sm opacity-70 mb-2">Simplificar tira as notas de enfeite (9, 7M, 6…); a cifra original não muda.</div>
              <div className="flex gap-1.5">
                {NIVEIS_SIMPLIFICACAO.map((n) => (
                  <button
                    key={n.id || "orig"}
                    type="button"
                    onClick={() => mudarNivelSimpl(n.id)}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold"
                    style={nivelSimpl === n.id ? { background: t.acorde, color: t.fundo } : botao}
                  >
                    {n.nome}
                  </button>
                ))}
              </div>
            </div>

            <Linha rotulo="Tamanho da letra" detalhe={prefs.fonte ? `${fonte}px` : `automático (${fonte}px)`}>
              <Passo onMenos={() => tamanho(-1)} onMais={() => tamanho(1)} estilo={botao} />
              {prefs.fonte != null && <button type="button" onClick={() => mudarPrefs({ fonte: null })} className="h-11 px-3 rounded-xl text-sm" style={botao}>Ajustar</button>}
            </Linha>

            <Linha rotulo="Velocidade da rolagem" detalhe={`${prefs.vel}`}>
              <Passo onMenos={() => velocidade(-1)} onMais={() => velocidade(1)} estilo={botao} />
            </Linha>

            <div>
              <div className="font-semibold">Contagem antes de rolar</div>
              <div className="text-sm opacity-70 mb-2">Depois do play, conta alguns segundos antes de começar. Vale para todas as músicas.</div>
              <div className="flex flex-wrap gap-2">
                {ESPERAS.map((s) => (
                  <button key={s} type="button" onClick={() => mudarGlobal({ espera: s })} className="h-10 px-3 rounded-xl text-sm font-semibold"
                    style={(Number(global.espera) || 0) === s ? { background: t.acorde, color: t.fundo } : botao}>
                    {s === 0 ? "Sem espera" : `${s} s`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-semibold mb-2">Tema</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TEMAS).map(([id, tt]) => (
                  <button key={id} type="button" onClick={() => mudarGlobal({ tema: id })} className="h-10 px-3 rounded-xl text-sm font-semibold"
                    style={global.tema === id ? { background: t.acorde, color: t.fundo } : botao}>
                    {tt.nome}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="font-semibold block">Acordes em português</span>
                <span className="text-sm opacity-70">Dó, Ré, Mi… no lugar de C, D, E…</span>
              </span>
              <input type="checkbox" checked={!!global.nomesPT} onChange={(e) => mudarGlobal({ nomesPT: e.target.checked })} className="w-6 h-6 accent-amber-500" />
            </label>

            {document.fullscreenEnabled && (
              <button type="button" onClick={telaCheiaAlternar} className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold" style={botao}>
                {telaCheia ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                {telaCheia ? "Sair da tela cheia" : "Tela cheia"}
              </button>
            )}

            <p className="text-xs opacity-60 leading-relaxed">
              Pedal ou teclado: ↓ / Espaço desce uma tela, ↑ sobe, → próxima música, ← anterior, Enter rola/pausa.
              No celular, deslize para os lados para trocar de música e toque no meio para mostrar os botões.
              Os ajustes ficam guardados para cada música neste aparelho.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({ rotulo, detalhe, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold">{rotulo}</div>
        <div className="text-sm opacity-70 truncate">{detalhe}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
    </div>
  );
}

function Passo({ onMenos, onMais, estilo }) {
  return (
    <div className="flex gap-1">
      <button type="button" onClick={onMenos} aria-label="Menos" className="w-11 h-11 flex items-center justify-center rounded-xl" style={estilo}><Minus className="w-5 h-5" /></button>
      <button type="button" onClick={onMais} aria-label="Mais" className="w-11 h-11 flex items-center justify-center rounded-xl" style={estilo}><Plus className="w-5 h-5" /></button>
    </div>
  );
}
