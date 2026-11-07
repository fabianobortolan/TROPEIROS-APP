import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Printer, BookOpen, Loader2, Library as LibraryIcon, Music, Search, CheckSquare, Square, Filter, Columns, Type, Layers, Settings2, ChevronRight, RotateCcw, Scissors, Eye, Maximize, Check, ChevronUp, ChevronDown, GripVertical, Pencil, RefreshCw, ArrowLeft, ListOrdered } from "lucide-react";
import { motion } from "framer-motion";
import ApostilaSongEditor from "@/components/songs/ApostilaSongEditor";
import ApostilaSavedManager from "@/components/songs/ApostilaSavedManager";
import ApostilaEditSongs from "@/components/songs/ApostilaEditSongs";
import SeqPositionBadge from "@/components/songs/SeqPositionBadge";
import SongAdjustPanel from "@/components/songs/SongAdjustPanel";
import { translateCifraText } from "@/components/utils/chordTranslator";

// ─── Gêneros Pop/Rock (mesma lista das Library pages) ─────────────────────────
const POP_ROCK_GENRES = [
  "pop", "rock", "pop_rock", "hard_rock", "metal", "punk", "blues_rock",
  "indie", "alternativo", "classico_rock", "pop_internacional"
];

function escapeHtml(text) {
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const APOSTILA_LOGO_URL = "/img/522fde112_LOGO-PNG.png";

// Destaca o bloco inteiro de Refrão com uma caixa amarela (cabeçalho + todas as linhas do refrão)
function boldRefrãoTokens(text) {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  const tokens = [];
  let refraoBuffer = null;
  const flushRefrão = () => {
    if (refraoBuffer) {
      tokens.push(
        `<div style="background:#FFE08A;border:1.5px solid #E6C200;border-radius:5px;padding:3px 7px;margin:2px 0;box-shadow:0 0 0 1px #E6C200;break-inside:avoid;">${refraoBuffer.join("\n")}</div>`
      );
      refraoBuffer = null;
    }
  };
  for (const line of lines) {
    const escaped = escapeHtml(line);
    const isRefrãoHeader = /^\s*\[Refr[ãa]o/i.test(line) || /^\s*Refr[ãa]o\s*[:\)]?\s*$/i.test(line);
    const isOtherSection = /^\s*\[(Intro|Verso|Ponte|Solo|Final|Fim|Coda|Estrofe|Parte|Dobrado|Base|Riff|Instrumental|Pré)/i.test(line);
    if (isRefrãoHeader) {
      flushRefrão();
      refraoBuffer = [`<span style="font-weight:900;">${escaped}</span>`];
    } else if (isOtherSection) {
      flushRefrão();
      tokens.push(escaped);
    } else if (line.trim() === "") {
      if (refraoBuffer) {
        // Linha em branco DENTRO do refrão permanece dentro da caixa amarela;
        // o bloco só fecha no próximo cabeçalho de seção ou no fim do texto.
        refraoBuffer.push(escaped);
      } else {
        tokens.push(escaped);
      }
    } else if (refraoBuffer) {
      refraoBuffer.push(`<span style="font-weight:800;">${escaped}</span>`);
    } else {
      tokens.push(escaped);
    }
  }
  flushRefrão();
  return tokens;
}

function boldRefrãoHtml(text) {
  return boldRefrãoTokens(text).join("\n");
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function LibraryApostila({ onClose }) {
  const [generating, setGenerating] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [sertanejoSongs, setSertanejoSongs] = useState([]);
  const [popRockSongs, setPopRockSongs] = useState([]);
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRhythms, setSelectedRhythms] = useState(new Set());
  const [layoutColumns, setLayoutColumns] = useState(1);
  const [layoutFontSize, setLayoutFontSize] = useState("medio");
  const [layoutCompact, setLayoutCompact] = useState(false);
  const [layoutMargin, setLayoutMargin] = useState("normal");
  const [layoutLineHeight, setLayoutLineHeight] = useState(1.5);
  const [layoutLetterSpacing, setLayoutLetterSpacing] = useState(0);
  const [layoutSongSpacing, setLayoutSongSpacing] = useState(14);
  const [layoutAutoFit, setLayoutAutoFit] = useState(false);
  const [layoutChordNames, setLayoutChordNames] = useState(false);
  const [songOverrides, setSongOverrides] = useState({});
  const [loadedOverrideIds, setLoadedOverrideIds] = useState(new Set());
  const [expandedSongId, setExpandedSongId] = useState(null);
  const [step, setStep] = useState("selecionar"); // "selecionar" | "organizar"
  const [groupByRhythm, setGroupByRhythm] = useState(false); // exceção: agrupar apostila por ritmo
  const [loadedApostila, setLoadedApostila] = useState(null); // apostila salva em edição
  // Trabalho não salvo (sequência, inclusões/exclusões) — protege contra
  // fechamento acidental da apostila em edição
  const [dirty, setDirty] = useState(false);
  // Garante que a seleção inicial ("nenhuma música marcada") é aplicada uma
  // única vez e nunca sobrescreve uma apostila salva carregada pelo usuário
  const selectionInitRef = useRef(false);

  const requestClose = () => {
    if (dirty && !confirm("Sair da edição da apostila?\n\nHá alterações não salvas (sequência, inclusões ou exclusões de músicas). Clique em \"Salvar\" na barra superior para guardá-las antes de sair.")) {
      return;
    }
    onClose();
  };

  // Carrega todas as músicas (paginação até carregar tudo)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSongs(true);
      try {
        let all = [];
        let skip = 0;
        const limit = 200;
        let hasMore = true;
        while (hasMore && !cancelled) {
          const batch = await base44.entities.Song.list('-title', limit, skip);
          all = all.concat(batch || []);
          hasMore = (batch || []).length === limit;
          skip += limit;
        }
        if (cancelled) return;
        all.sort((a, b) => (a.title || "").localeCompare(b.title || "", 'pt-BR'));
        const sert = all.filter(s => !POP_ROCK_GENRES.includes(s.genre_style));
        const pop = all.filter(s => POP_ROCK_GENRES.includes(s.genre_style));
        setSertanejoSongs(sert);
        setPopRockSongs(pop);
        // Por padrão NENHUMA música está marcada — o usuário seleciona (✓)
        // apenas as que quer na apostila. Antes todas entravam automaticamente,
        // o que fazia o gerador buscar a biblioteca inteira (339 músicas).
        if (!selectionInitRef.current) {
          selectionInitRef.current = true;
          setExcludedIds(new Set(all.map(s => s.id)));
        }
        // Carrega ajustes de apostila salvos no banco
        const loaded = {};
        const loadedIds = new Set();
        all.forEach(s => {
          if (s.apostila_settings && typeof s.apostila_settings === 'object' && Object.keys(s.apostila_settings).length > 0) {
            loaded[s.id] = { ...s.apostila_settings };
            loadedIds.add(s.id);
          }
        });
        if (Object.keys(loaded).length > 0) {
          setSongOverrides(loaded);
          setLoadedOverrideIds(loadedIds);
        }
      } catch (e) {
        console.error("Erro ao carregar músicas:", e);
      } finally {
        if (!cancelled) setLoadingSongs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filtra músicas visíveis na busca
  const filterBySearch = (songs) => {
    let result = songs;
    if (selectedRhythms.size > 0) {
      result = result.filter(s => selectedRhythms.has(s.rhythm_name || ""));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.artist || "").toLowerCase().includes(q)
      );
    }
    return result;
  };

  const allRhythms = useMemo(() => {
    const set = new Set();
    [...sertanejoSongs, ...popRockSongs].forEach(s => {
      if (s.rhythm_name) set.add(s.rhythm_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [sertanejoSongs, popRockSongs]);

  const visibleSertanejo = filterBySearch(sertanejoSongs);
  const visiblePopRock = filterBySearch(popRockSongs);

  // Reordenação manual — troca na lista VISÍVEL e reconstrói a lista completa
  const moveSong = (fullList, setFullList, visibleList, songId, dir) => {
    setDirty(true);
    const visIdx = visibleList.findIndex(s => s.id === songId);
    if (visIdx === -1) return;
    const target = visIdx + dir;
    if (target < 0 || target >= visibleList.length) return;
    const newVisible = [...visibleList];
    [newVisible[visIdx], newVisible[target]] = [newVisible[target], newVisible[visIdx]];
    const visibleIds = new Set(visibleList.map(s => s.id));
    let vi = 0;
    const newFull = fullList.map(s => visibleIds.has(s.id) ? newVisible[vi++] : s);
    setFullList(newFull);
  };
  const moveSertanejo = (songId, dir) => moveSong(sertanejoSongs, setSertanejoSongs, visibleSertanejo, songId, dir);
  const movePopRock = (songId, dir) => moveSong(popRockSongs, setPopRockSongs, visiblePopRock, songId, dir);
  // Reordenação na etapa de organização — opera somente entre as músicas selecionadas
  const moveSelectedSertanejo = (songId, dir) => moveSong(sertanejoSongs, setSertanejoSongs, finalSertanejo, songId, dir);
  const moveSelectedPopRock = (songId, dir) => moveSong(popRockSongs, setPopRockSongs, finalPopRock, songId, dir);
  // Move uma música para uma posição absoluta (1-based) dentro da sequência selecionada
  const moveSongToPosition = (fullList, setFullList, visibleList, songId, targetPos) => {
    setDirty(true);
    const visIdx = visibleList.findIndex(s => s.id === songId);
    if (visIdx === -1) return;
    let target = Math.max(0, Math.min(targetPos - 1, visibleList.length - 1));
    if (target === visIdx) return;
    const newVisible = [...visibleList];
    const [moved] = newVisible.splice(visIdx, 1);
    newVisible.splice(target, 0, moved);
    const visibleIds = new Set(visibleList.map(s => s.id));
    let vi = 0;
    const newFull = fullList.map(s => visibleIds.has(s.id) ? newVisible[vi++] : s);
    setFullList(newFull);
  };
  const moveToPositionSertanejo = (songId, pos) => moveSongToPosition(sertanejoSongs, setSertanejoSongs, finalSertanejo, songId, pos);
  const moveToPositionPopRock = (songId, pos) => moveSongToPosition(popRockSongs, setPopRockSongs, finalPopRock, songId, pos);

  // Move uma música para o final da lista completa (usado ao inserir na apostila)
  const moveToEnd = (fullList, setFullList, songId) => {
    if (!fullList.some(s => s.id === songId)) return;
    setFullList(prev => {
      const song = prev.find(s => s.id === songId);
      if (!song) return prev;
      return [...prev.filter(s => s.id !== songId), song];
    });
  };

  // Insere uma música de volta na sequência (remove da lista de excluídas)
  const addToSequence = (song) => {
    setDirty(true);
    setExcludedIds(prev => {
      const next = new Set(prev);
      next.delete(song.id);
      return next;
    });
    // Toda música inserida entra sempre no final da sequência
    moveToEnd(sertanejoSongs, setSertanejoSongs, song.id);
    moveToEnd(popRockSongs, setPopRockSongs, song.id);
  };

  const toggleExclude = (songId) => {
    setDirty(true);
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
    // Ao incluir uma música, ela entra no final da sequência
    if (excludedIds.has(songId)) {
      moveToEnd(sertanejoSongs, setSertanejoSongs, songId);
      moveToEnd(popRockSongs, setPopRockSongs, songId);
    }
  };

  const toggleAllSertanejo = () => {
    setDirty(true);
    setExcludedIds(prev => {
      const next = new Set(prev);
      const list = visibleSertanejo.length > 0 ? visibleSertanejo : sertanejoSongs;
      const allExcluded = list.every(s => next.has(s.id));
      list.forEach(s => {
        if (allExcluded) next.delete(s.id);
        else next.add(s.id);
      });
      return next;
    });
  };

  const toggleAllPopRock = () => {
    setDirty(true);
    setExcludedIds(prev => {
      const next = new Set(prev);
      const list = visiblePopRock.length > 0 ? visiblePopRock : popRockSongs;
      const allExcluded = list.every(s => next.has(s.id));
      list.forEach(s => {
        if (allExcluded) next.delete(s.id);
        else next.add(s.id);
      });
      return next;
    });
  };

  const toggleRhythm = (rhythm) => {
    setSelectedRhythms(prev => {
      const next = new Set(prev);
      if (next.has(rhythm)) next.delete(rhythm);
      else next.add(rhythm);
      return next;
    });
  };

  const selectOnlyRhythms = () => {
    if (selectedRhythms.size === 0) return;
    setDirty(true);
    setExcludedIds(prev => {
      const next = new Set(prev);
      [...sertanejoSongs, ...popRockSongs].forEach(s => {
        if (!selectedRhythms.has(s.rhythm_name || "")) next.add(s.id);
        else next.delete(s.id);
      });
      return next;
    });
  };

  // Listas finais (sem as excluídas)
  const finalSertanejo = useMemo(() => sertanejoSongs.filter(s => !excludedIds.has(s.id)), [sertanejoSongs, excludedIds]);
  const finalPopRock = useMemo(() => popRockSongs.filter(s => !excludedIds.has(s.id)), [popRockSongs, excludedIds]);
  const totalSelected = finalSertanejo.length + finalPopRock.length;

  const fontSizeMap = { pequeno: "8pt", medio: "10pt", grande: "12pt", extra: "14pt", gigante: "16pt", xxg: "18pt" };
  const marginMap = { estreito: "10mm", normal: "16mm", largo: "22mm" };

  // Resolve os ajustes efetivos de uma música (override individual ou padrão global)
  const getSongSettings = (songId) => {
    const ov = songOverrides[songId];
    if (!ov) {
      return {
        fontSize: layoutFontSize,
        columns: layoutColumns,
        pageBreak: !layoutCompact,
        lineHeight: layoutLineHeight,
        letterSpacing: layoutLetterSpacing,
        breakLines: [],
        autoFit: layoutAutoFit,
        customCifra: undefined,
        hasOverride: false,
      };
    }
    return {
      fontSize: ov.fontSize || layoutFontSize,
      columns: ov.columns ?? layoutColumns,
      pageBreak: ov.pageBreak ?? !layoutCompact,
      lineHeight: ov.lineHeight ?? layoutLineHeight,
      letterSpacing: ov.letterSpacing ?? layoutLetterSpacing,
      breakLines: ov.breakLines || [],
      autoFit: ov.autoFit ?? layoutAutoFit,
      customCifra: ov.customCifra,
      customCifraBase: ov.customCifraBase,
      hasOverride: true,
    };
  };

  const setSongOverride = (songId, field, value) => {
    setSongOverrides(prev => {
      const next = { ...prev, [songId]: { ...(prev[songId] || {}), [field]: value } };
      persistSongOverride(songId, next[songId]);
      return next;
    });
  };

  // Salva as quebras de linha definidas no editor visual (persistência individual)
  const saveBreakLines = (songId, breakLines) => {
    setSongOverrides(prev => {
      const next = { ...prev, [songId]: { ...(prev[songId] || {}), breakLines } };
      persistSongOverride(songId, next[songId]);
      return next;
    });
  };

  // Salva a cifra editada para a apostila junto com a "base" (snapshot da
  // cifra original no momento do save). Assim, se a original for corrigida
  // depois, a apostila detecta que o snapshot está desatualizado e volta a
  // usar a original corrigida. Se a edição ficou idêntica à original, remove
  // o override (desnecessário).
  const saveCustomCifra = (songId, cifra, base) => {
    setSongOverrides(prev => {
      const cur = { ...(prev[songId] || {}) };
      if (cifra && cifra !== base) {
        cur.customCifra = cifra;
        cur.customCifraBase = base;
      } else {
        delete cur.customCifra;
        delete cur.customCifraBase;
      }
      const next = { ...prev, [songId]: cur };
      persistSongOverride(songId, cur);
      return next;
    });
  };

  // Sincroniza TODAS as músicas que têm edição de cifra salva na apostila,
  // descartando o snapshot e fazendo a apostila usar a cifra original atualizada.
  const syncAllCifras = () => {
    const allSongs = [...sertanejoSongs, ...popRockSongs];
    const withCustom = allSongs.filter(s => !!(getSongSettings(s.id).customCifra));
    if (withCustom.length === 0) {
      alert("Nenhuma música tem edição de cifra salva na apostila.");
      return;
    }
    if (!confirm(`Sincronizar ${withCustom.length} música(s) com a cifra original atualizada?\n\nAs edições específicas da apostila serão descartadas (os ajustes de layout/quebras são mantidos).`)) return;
    withCustom.forEach(s => saveCustomCifra(s.id, null, null));
    alert(`✅ ${withCustom.length} cifra(s) sincronizada(s) com a original!`);
  };

  // Estado para qual música tem o editor aberto
  const [editorSong, setEditorSong] = useState(null);
  const [editorStartInEdit, setEditorStartInEdit] = useState(false);

  const clearSongOverride = (songId) => {
    setSongOverrides(prev => {
      const next = { ...prev };
      delete next[songId];
      return next;
    });
    persistSongOverride(songId, null);
  };

  // Persiste o ajuste de UMA música no banco (salvamento individual automático)
  const persistSongOverride = async (songId, override) => {
    try {
      await base44.entities.Song.update(songId, { apostila_settings: override || null });
      setLoadedOverrideIds(prev => {
        const next = new Set(prev);
        if (override) next.add(songId); else next.delete(songId);
        return next;
      });
    } catch (e) {
      console.error("Erro ao salvar ajuste individual da música:", e);
    }
  };

  // Limpa o texto da cifra removendo cabeçalhos repetitivos
  const cleanCifra = (raw) => {
    let c = raw || "";
    c = c.replace(/\[Intro\]\s*\n(Tom:.*\n)?(BPM:.*\n)?(Ritmo:.*\n)?\s*\n?/gi, "");
    c = c.replace(/^Pattern:.*$/gim, "");
    c = c.replace(/^\s+/, "").replace(/\n{3,}/g, "\n\n");
    return c;
  };

  // Compara o CONTEÚDO de duas versões de cifra ignorando tags de seção
  // ([INTRO], [REFRÃO]…) e espaçamento — mudanças apenas cosméticas na
  // original NÃO invalidam a edição salva da apostila.
  const normalizeForSync = (c) => (c || "").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();

  // ─── Gera o bloco HTML de uma música (somente cifra) ──────────────────────
  const buildSongBlock = (song, index, settings, previewOnly = false) => {
    const currentOriginal = cleanCifra(song.cifra_text);
    // customCifra é um snapshot da original no momento da edição. Se a original
    // foi corrigida depois (base != original atual), o snapshot está desatualizado
    // e a apostila passa a usar a cifra original corrigida automaticamente.
    const staleCifra = !!(settings.customCifra && settings.customCifraBase && normalizeForSync(settings.customCifraBase) !== normalizeForSync(currentOriginal));
    let cifra = (settings.customCifra && !staleCifra) ? settings.customCifra : currentOriginal;
    if (layoutChordNames) cifra = translateCifraText(cifra);
    const cifraFont = fontSizeMap[settings.fontSize] || "10pt";
    const twoCols = settings.columns === 2;
    const breakCss = settings.pageBreak ? "page-break-before:always;break-before:page;" : "";
    // Divisor visual de quebra de página — visível apenas na prévia
    const pageBreakMarker = (previewOnly && settings.pageBreak && index > 0)
      ? `<div style="margin:18px -2px 0;padding:8px 12px;background:#F5F1E8;border:2px dashed #8B6F47;border-radius:8px;color:#6B5437;font-size:11pt;font-weight:700;text-align:center;letter-spacing:1px;">⤓ QUEBRA DE PÁGINA ⤒</div>`
      : "";

    let cifraHtml = "";
    if (cifra && cifra.trim()) {
      const lines = cifra.split("\n");
      const breakSet = new Set(settings.breakLines || []);
      // Agrupa linhas em blocos separados pelas quebras
      const groups = [];
      let current = [];
      lines.forEach((line, i) => {
        if (breakSet.has(i)) {
          current.push(line);
          groups.push(current);
          current = [];
        } else {
          current.push(line);
        }
      });
      groups.push(current);

      const baseStyle = `font-size:${cifraFont}; line-height:${settings.lineHeight}; letter-spacing:${settings.letterSpacing}px;`;
      if (twoCols) {
        // Quebra ANTES da linha i: a linha i inicia a coluna 2 (espelha o editor)
        const colGroups = [];
        let cur = [];
        lines.forEach((line, i) => {
          if (breakSet.has(i) && i > 0) { colGroups.push(cur); cur = []; }
          cur.push(line);
        });
        colGroups.push(cur);

        const hasManualBreak = (settings.breakLines || []).some(i => i > 0);
        if (hasManualBreak) {
          // Colunas EXPLÍCITAS (grid): divisão exata e confiável no ponto de quebra.
          // Coluna 1 = linhas antes da 1ª quebra; Coluna 2 = restante.
          const col1Text = (colGroups[0] || []).join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
          const col2Text = colGroups.slice(1).map(g => g.join("\n")).join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
          const marker = previewOnly
            ? `<div style="margin:0 0 6px 0;padding:4px 10px;background:#FFF8E1;border:1px dashed #D4AF37;border-radius:6px;color:#A68A64;font-size:9pt;font-weight:600;text-align:center;">✂ Quebra de coluna</div>`
            : "";
          // Tokens completos embarcados para a paginação JS por página (quando o
          // conteúdo ultrapassa 1 página A4, a quebra manual é substituída por
          // uma distribuição equilibrada em pares de colunas por página).
          const fullText = colGroups.map(g => g.join("\n")).join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
          const tokens = boldRefrãoTokens(fullText);
          const tokensJson = JSON.stringify(tokens).replace(/</g, "\\u003c");
          cifraHtml = `<div class="cifra-2col-manual" data-base-style="${baseStyle.replace(/"/g, "&quot;")}" style="display:grid;grid-template-columns:1fr 1fr;column-gap:18px;align-items:start;">
<div class="cifra" style="${baseStyle}">${boldRefrãoHtml(col1Text)}</div>
<div class="cifra" style="${baseStyle}">${marker}${boldRefrãoHtml(col2Text)}</div>
<span class="col-break" style="display:none"></span>
</div><script type="application/json" class="cifra-tokens">${tokensJson}</script>`;
        } else {
          // Sem quebras manuais: auto-balanceamento do navegador.
          // Embrica os tokens (linhas/blocos [Refrão]) como JSON para a paginação
          // JS por página (cada página A4 vira um bloco grid de 2 colunas próprio).
          const fullText = (colGroups[0] || []).join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
          const tokens = boldRefrãoTokens(fullText);
          const tokensJson = JSON.stringify(tokens).replace(/</g, "\\u003c");
          cifraHtml = `<div class="cifra cifra-2col-auto" data-base-style="${baseStyle.replace(/"/g, "&quot;")}" style="${baseStyle} column-count:2; column-gap:18px;">${tokens.join("\n")}</div><script type="application/json" class="cifra-tokens">${tokensJson}</script>`;
        }
      } else {
        // Coluna única: quebras viram quebra de página
        cifraHtml = groups.map((group, gi) => {
          const text = group.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
          if (!text) return "";
          const manualBreakMarker = previewOnly && gi > 0
            ? `<div style="margin:10px -2px;padding:6px 12px;background:#FFF8E1;border:1px dashed #D4AF37;border-radius:6px;color:#A68A64;font-size:9pt;font-weight:600;text-align:center;">✂ Quebra manual de página</div><div class="manual-break" style="page-break-before:always;break-before:page;"></div>`
            : (gi > 0 ? '<div class="manual-break" style="page-break-before:always;break-before:page;"></div>' : "");
          return `${manualBreakMarker}<div class="cifra" style="${baseStyle}">${boldRefrãoHtml(text)}</div>`;
        }).join("");
      }
    } else {
      cifraHtml = `<p class="no-cifra">(sem cifra cadastrada)</p>`;
    }

    return `
${pageBreakMarker}
<div class="song-section" data-song-id="${song.id}" data-pagebreak="${settings.pageBreak ? "1" : "0"}" data-autofit="${settings.autoFit ? "1" : "0"}" style="${breakCss} margin-bottom:${layoutSongSpacing}px;">
  <div class="song-header">
    <div class="song-num">${index + 1}</div>
    <div class="song-header-info">
      <div class="song-title-line"><span class="song-title${song.genre_style === "samba" ? " genre-samba" : song.genre_style === "forro" ? " genre-forro" : ""}">${escapeHtml(song.title)}</span> <span class="song-artist">— ${escapeHtml(song.artist)}</span></div>
      <div class="song-meta">
        ${song.main_key ? `<strong>Tom:</strong> ${song.main_key}` : ""}
        ${song.rhythm_name ? ` &nbsp;•&nbsp; <strong>Ritmo:</strong> ${song.rhythm_name}` : ""}
        ${song.tempo ? ` &nbsp;•&nbsp; <strong>BPM:</strong> ${song.tempo}` : ""}
      </div>
    </div>
    <img class="song-logo" src="${APOSTILA_LOGO_URL}" alt="Tropeiros do Bebedouro" />
  </div>
  ${cifraHtml}
</div>`;
  };

  // ─── Gera o índice de uma biblioteca (agrupado por ritmo) ────────────────
  const buildIndex = (songs, sectionTitle, accentColor) => {
    const groups = {};
    const rhythmOrder = [];
    songs.forEach(s => {
      const r = s.rhythm_name || "Sem ritmo";
      if (!groups[r]) { groups[r] = []; rhythmOrder.push(r); }
      groups[r].push(s);
    });
    // Ordem dos ritmos = ordem de primeira ocorrência (fiel à ordem do caderno, não alfabética)
    const groupedHtml = rhythmOrder.map(r => `
    <div class="index-rhythm-group">
      <div class="index-rhythm-header" style="color:${accentColor};">🎵 ${escapeHtml(r)} <span class="index-rhythm-count">${groups[r].length} música${groups[r].length !== 1 ? "s" : ""}</span></div>
      <table class="index-table">
        ${groups[r].map((song, i) => `
        <tr class="index-row">
          <td class="index-num">${i + 1}</td>
          <td class="index-song-title">${escapeHtml(song.title)}</td>
          <td class="index-artist">${escapeHtml(song.artist)}</td>
          <td class="index-key">${song.main_key || ""}</td>
          <td class="index-page-num" data-page-for="${song.id}">—</td>
        </tr>`).join("")}
      </table>
    </div>`).join("");
    // Índice plano (sequência exata, sem agrupar por ritmo)
    const flatHtml = `
    <div class="index-rhythm-group">
      <table class="index-table">
        ${songs.map((song, i) => `
        <tr class="index-row">
          <td class="index-num">${i + 1}</td>
          <td class="index-song-title">${escapeHtml(song.title)}</td>
          <td class="index-artist">${escapeHtml(song.artist)}</td>
          <td class="index-key">${song.main_key || ""}</td>
          <td class="index-page-num" data-page-for="${song.id}">—</td>
        </tr>`).join("")}
      </table>
    </div>`;
    return `
<div class="index-page" data-pagebreak="1">
  <div class="index-title" style="border-left-color:${accentColor};">📋 Índice — ${sectionTitle}</div>
  <div class="index-subtitle">${songs.length} música${songs.length !== 1 ? "s" : ""}</div>
  ${groupByRhythm ? groupedHtml : flatHtml}
</div>`;
  };

  // ─── Gera o divisor de seção ─────────────────────────────────────────────
  const buildSectionDivider = (title, subtitle, accentColor, icon) => `
<div class="section-divider" data-pagebreak="1" style="border-top-color:${accentColor};border-bottom-color:${accentColor};">
  <div class="divider-icon" style="color:${accentColor};">${icon}</div>
  <div class="divider-title" style="color:${accentColor};">${escapeHtml(title)}</div>
  <div class="divider-sub">${escapeHtml(subtitle)}</div>
</div>`;

  // ─── Agrupa por ritmo preservando a ordem manual (fiel ao caderno) ──────
  // Ritmos na ordem de primeira ocorrência; dentro de cada ritmo, a ordem
  // da lista original (reordenação manual do usuário) — sem ordenação alfabética.
  const groupedByRhythm = (list) => {
    const groups = {};
    const rhythmOrder = [];
    list.forEach(s => {
      const r = s.rhythm_name || "Sem ritmo";
      if (!groups[r]) { groups[r] = []; rhythmOrder.push(r); }
      groups[r].push(s);
    });
    const flat = rhythmOrder.flatMap(r => groups[r]);
    return { flat, rhythmOrder, groups };
  };

  // ─── Gera blocos de música em sequência ──────────────────────────────────
  const buildSongsSequential = (songs, previewOnly) => {
    let html = "";
    songs.forEach((s, i) => {
      const settings = getSongSettings(s.id);
      html += buildSongBlock(s, i, settings, previewOnly);
    });
    return html;
  };

  // ─── Impressão via iframe oculto ──────────────────────────────────────────
  // window.open é frequentemente bloqueado pelo navegador (bloqueador de popups),
  // o que impedia a impressão. Aqui o HTML é escrito num iframe invisível na
  // própria página e o diálogo de impressão do navegador é aberto a partir dele —
  // não depende de permissão de popups.
  const printHtmlInIframe = (html) => {
    const iframe = document.createElement("iframe");
    // O iframe PRECISA de tamanho real: iframes 0x0 geram impressão/PDF em
    // branco no Chrome. Fica invisível (opacity 0) e não captura cliques.
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:800px;height:1100px;border:0;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    try {
      win.addEventListener("afterprint", () => setTimeout(() => iframe.remove(), 1000));
    } catch (e) { /* limpeza best-effort */ }
    const doc = win.document;
    doc.open();
    doc.write(html);
    doc.close();
  };

  // ─── Prévia da impressão de uma única música ─────────────────────────────
  // Usa o MESMO HTML/CSS do livro final e abre direto no diálogo de impressão
  // do navegador, cuja prévia mostra a paginação real (quebras automáticas + manuais).
  const handlePreviewSong = (song, customCifraOverride) => {
    let settings = getSongSettings(song.id);
    if (customCifraOverride !== undefined) settings = { ...settings, customCifra: customCifraOverride };
    const sideMargin = marginMap[layoutMargin] || "16mm";
    const songBlock = buildSongBlock(song, 0, settings);
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Prévia — ${escapeHtml(song.title)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm ${sideMargin} 14mm ${sideMargin}; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11pt; color:#1a1a1a; background:#fff; line-height:1.5; }
  .song-section { margin-bottom:${layoutSongSpacing}px; }
  .song-header { display:flex; align-items:center; gap:10px; border-bottom:2px solid #8B6F47; padding-bottom:5px; margin-bottom:8px; }
  .song-num { background:#8B6F47; color:#fff; font-size:12pt; font-weight:900; min-width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:6px; flex-shrink:0; }
  .song-title-line { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
  .song-title { font-size:14pt; font-weight:900; color:#5a3e28; text-transform:uppercase; letter-spacing:0.5px; }
  .song-title.genre-samba { color:#15803d; }
  .song-title.genre-forro { color:#b8860b; }
  .song-artist { font-size:11pt; font-weight:600; color:#8B6F47; }
  .song-meta { font-size:9pt; color:#666; margin-top:2px; }
  .song-logo { margin-left:auto; height:48px; width:auto; max-width:160px; flex-shrink:0; object-fit:contain; }
  .cifra { font-family:'Courier New',Courier,monospace; font-weight:600; white-space:pre-wrap; word-break:break-word; margin-bottom:10px; }
  .no-cifra { font-size:10pt; color:#999; font-style:italic; text-align:center; padding:16px; }
  .manual-break { page-break-before:always; break-before:page; }
  @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
</style>
</head>
<body>
${songBlock}
<script>
    window.onload = function() {
  function autoFit() {
    var section = document.querySelector('.song-section[data-autofit="1"]');
    if (!section) { window.print(); return; }
    /* Não aplica autoFit em músicas com quebras manuais (página ou coluna) — o usuário definiu as quebras */
    if (section.querySelector('.manual-break, .col-break')) { window.print(); return; }
    var cifra = section.querySelector('.cifra');
    if (!cifra) { window.print(); return; }
    var sideMarginMm = ${parseFloat((marginMap[layoutMargin] || "16mm").replace("mm",""))};
    var printWidthPx = (210 - 2 * sideMarginMm) * 3.7795;
    var pageHeightPx = (297 - 28) * 3.7795;
    var measureWrap = document.createElement('div');
    measureWrap.style.width = printWidthPx + 'px';
    measureWrap.style.position = 'absolute';
    measureWrap.style.visibility = 'hidden';
    var origParent = section.parentNode;
    var nextSibling = section.nextSibling;
    measureWrap.appendChild(section);
    document.body.appendChild(measureWrap);
    var fontPt = parseFloat(window.getComputedStyle(cifra).fontSize) * 72 / 96;
    var minFont = 6;
    var attempts = 0;
    while (section.scrollHeight > pageHeightPx && fontPt > minFont && attempts < 80) {
      fontPt -= 0.5;
      cifra.style.fontSize = fontPt + 'pt';
      attempts++;
    }
    var lh = parseFloat(cifra.style.lineHeight) || ${settings.lineHeight};
    while (section.scrollHeight > pageHeightPx && lh > 0.7 && attempts < 120) {
      lh -= 0.1;
      cifra.style.lineHeight = lh.toFixed(1);
      attempts++;
    }
    document.body.removeChild(measureWrap);
    origParent.insertBefore(section, nextSibling);
    window.print();
  }
  setTimeout(function() {
    try { autoFit(); }
    catch (e) { window.print(); }
  }, 300);
  };
</script>
</body>
</html>`;
    // Abre a aba direto no clique (gesto do usuário) — nunca é bloqueada, e a
    // impressão numa aba visível sempre abre o diálogo do navegador
    const pw = window.open("", "_blank");
    if (pw) {
      pw.document.write(html);
      pw.document.close();
    } else {
      printHtmlInIframe(html);
    }
  };

  // ─── Gera o livro completo ───────────────────────────────────────────────
  const handleGenerate = (previewOnly = false) => {
    setGenerating(true);
    const sideMargin = marginMap[layoutMargin] || "16mm";
    const pageMarginTop = "14mm";
    const pageMarginBottom = "14mm";
    const songBorder = layoutCompact ? "border-bottom:2px dashed #D4C5B0; padding-bottom:12px;" : "";
    // Abre a aba AGORA, direto no clique (gesto do usuário) — bloqueadores de
    // popup só autorizam window.open quando ele acontece sincronamente ao
    // clique. O HTML é escrito nela dentro do timeout abaixo. Impressão/PDF
    // em aba VISÍVEL funciona em todos os navegadores (imprimir a partir de
    // iframes ocultos é instável no Chrome e às vezes não faz nada).
    const printTab = window.open("", "_blank");
    setTimeout(() => {
      const sertList = groupByRhythm ? groupedByRhythm(finalSertanejo).flat : finalSertanejo;
      const popList = groupByRhythm ? groupedByRhythm(finalPopRock).flat : finalPopRock;
      const sertBlocks = buildSongsSequential(sertList, previewOnly);
      const popBlocks = buildSongsSequential(popList, previewOnly);
      const previewBanner = previewOnly ? `
  <div style="position:sticky;top:0;background:#D4AF37;color:#3a2a10;font-weight:700;font-size:10pt;padding:6px 12px;text-align:center;z-index:10;border-bottom:1px solid #b8941f;">
    🔍 MODO PRÉVIA — as linhas vermelhas marcam as quebras reais de página A4. Cada música/quebra forçada é alinhada ao topo da próxima página, igual à impressão. Feche esta aba quando terminar.
  </div>` : "";

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Apostila de Cifras — Tropeiros do Bebedouro</title>
<style>
  @page { size: A4 portrait; margin: ${pageMarginTop} ${sideMargin} ${pageMarginBottom} ${sideMargin}; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11pt; color:#1a1a1a; background:#fff; line-height:1.5; }

  .cover { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:240mm; text-align:center; }
  .cover-logo { width:120px; height:120px; object-fit:contain; margin-bottom:20px; }
  .cover-title { font-size:30pt; font-weight:900; color:#5a3e28; text-transform:uppercase; letter-spacing:1px; }
  .cover-sub { font-size:16pt; color:#8B6F47; margin-top:10px; }
  .cover-meta { font-size:12pt; color:#666; margin-top:12px; }
  .cover-stats { display:flex; gap:20px; margin-top:24px; }
  .cover-stat { background:#F5F1E8; border:1px solid #D4C5B0; border-radius:8px; padding:12px 20px; }
  .cover-stat-num { font-size:22pt; font-weight:900; color:#8B6F47; }
  .cover-stat-label { font-size:9pt; color:#A68A64; text-transform:uppercase; letter-spacing:0.5px; }

  .section-divider { page-break-before:always; page-break-after:always; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:200mm; text-align:center; border-top:4px solid; border-bottom:4px solid; padding:40px 0; }
  .divider-icon { font-size:48pt; margin-bottom:16px; }
  .divider-title { font-size:28pt; font-weight:900; text-transform:uppercase; letter-spacing:1px; }
  .divider-sub { font-size:14pt; color:#666; margin-top:8px; }

  .index-page { margin-bottom:20px; }
  .index-title { font-size:15pt; font-weight:900; color:#5a3e28; border-left:4px solid #D4AF37; padding-left:8px; margin-bottom:6px; text-transform:uppercase; }
  .index-subtitle { font-size:10pt; color:#8B6F47; margin-bottom:10px; }
  .index-table { width:100%; border-collapse:collapse; font-size:9pt; }
  .index-row { border-bottom:1px solid #e0cfb0; }
  .index-row:nth-child(even) { background:#fdf8f2; }
  .index-num { color:#8B6F47; font-weight:900; padding:4px 6px; min-width:24px; }
  .index-song-title { font-weight:700; color:#1a1a1a; padding:4px 6px; }
  .index-artist { color:#666; padding:4px 6px; }
  .index-key { color:#8B6F47; font-weight:700; padding:4px 6px; min-width:36px; }
  .index-page-num { color:#5a3e28; font-weight:900; padding:4px 6px; min-width:34px; text-align:right; }
  .index-rhythm { color:#D4AF37; font-weight:600; padding:4px 6px; }
  .index-rhythm-group { margin-bottom:14px; page-break-inside:avoid; break-inside:avoid; }
  .index-rhythm-header { font-size:11pt; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid; padding:4px 8px; margin:10px 0 4px; display:flex; align-items:center; gap:8px; }
  .index-rhythm-count { font-size:9pt; font-weight:600; color:#A68A64; text-transform:none; letter-spacing:0; }

  .song-section { ${songBorder} }
  .song-header { display:flex; align-items:center; gap:10px; border-bottom:2px solid #8B6F47; padding-bottom:5px; margin-bottom:8px; }
  .song-num { background:#8B6F47; color:#fff; font-size:12pt; font-weight:900; min-width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:6px; flex-shrink:0; }
  .song-title-line { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
  .song-title { font-size:14pt; font-weight:900; color:#5a3e28; text-transform:uppercase; letter-spacing:0.5px; }
  .song-title.genre-samba { color:#15803d; }
  .song-title.genre-forro { color:#b8860b; }
  .song-artist { font-size:11pt; font-weight:600; color:#8B6F47; }
  .song-meta { font-size:9pt; color:#666; margin-top:2px; }
  .song-logo { margin-left:auto; height:48px; width:auto; max-width:160px; flex-shrink:0; object-fit:contain; }

  .cifra { font-family:'Courier New',Courier,monospace; font-weight:600; white-space:pre-wrap; word-break:break-word; margin-bottom:10px; }
  .no-cifra { font-size:10pt; color:#999; font-style:italic; text-align:center; padding:16px; }
  .manual-break { page-break-before:always; break-before:page; }

  .footer { margin-top:16px; padding-top:8px; border-top:1px solid #e0cfb0; font-size:8pt; color:#999; text-align:center; }

  /* ── Prévia: simulação de folhas A4 ── */
  body.preview-mode { background:#c9c9c9; padding:18px 0 40px; }
  body.preview-mode .preview-paper {
    width:210mm; margin:0 auto; background:#fff; position:relative;
    box-shadow:0 8px 30px rgba(0,0,0,0.35);
    padding:14mm ${sideMargin} 14mm ${sideMargin};
  }
  body.preview-mode .preview-paper::after {
    content:""; position:absolute; left:0; right:0; top:0; bottom:0; pointer-events:none;
    background-image:repeating-linear-gradient(to bottom,
      transparent 0, transparent calc(297mm - 2px),
      rgba(220,38,38,0.45) calc(297mm - 2px), rgba(220,38,38,0.45) 297mm);
    z-index:50;
  }
  body.preview-mode .page-label {
    position:absolute; right:4mm; background:#dc2626; color:#fff;
    font-size:8pt; font-weight:800; padding:2px 9px; border-radius:0 0 6px 6px;
    z-index:60; box-shadow:0 1px 4px rgba(0,0,0,0.3); letter-spacing:0.5px;
  }

  @media print {
    body { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
    .section-divider { min-height:0; }
  }
</style>
</head>
<body class="${previewOnly ? 'preview-mode' : ''}">
${previewBanner}
<div class="preview-paper">
<div class="cover">
  <img src="${APOSTILA_LOGO_URL}" class="cover-logo" alt="Logo Tropeiros do Bebedouro" />
  <div class="cover-title">Apostila de Cifras</div>
  <div class="cover-sub">Tropeiros do Bebedouro</div>
  <div class="cover-meta">Temporada ${new Date().getFullYear()}</div>
  <div class="cover-stats">
    ${finalSertanejo.length > 0 ? `<div class="cover-stat"><div class="cover-stat-num">${finalSertanejo.length}</div><div class="cover-stat-label">Sertanejas</div></div>` : ""}
    ${finalPopRock.length > 0 ? `<div class="cover-stat"><div class="cover-stat-num">${finalPopRock.length}</div><div class="cover-stat-label">Pop/Rock</div></div>` : ""}
  </div>
</div>

${finalSertanejo.length > 0 ? buildSectionDivider("Biblioteca Sertaneja", `${finalSertanejo.length} músicas`, "#8B6F47", "🤠") : ""}
${finalSertanejo.length > 0 ? buildIndex(sertList, "Biblioteca Sertaneja", "#8B6F47") : ""}
${sertBlocks}

${finalPopRock.length > 0 ? buildSectionDivider("Biblioteca Pop/Rock", `${finalPopRock.length} músicas`, "#6B4C9A", "🎸") : ""}
${finalPopRock.length > 0 ? buildIndex(popList, "Biblioteca Pop/Rock", "#6B4C9A") : ""}
${popBlocks}

</div>

<script>
window.onafterprint = function() { window.close(); };
window.onload = function() {
  function autoFitAll() {
    var sideMarginMm = ${parseFloat((marginMap[layoutMargin] || "16mm").replace("mm",""))};
    var printWidthPx = (210 - 2 * sideMarginMm) * 3.7795;
    var pageHeightPx = (297 - 28) * 3.7795;
    var sections = document.querySelectorAll('.song-section[data-autofit="1"]');
    sections.forEach(function(section) {
      /* Não aplica autoFit em músicas com quebras manuais (página ou coluna) — o usuário definiu as quebras */
      if (section.querySelector('.manual-break, .col-break')) return;
      var cifra = section.querySelector('.cifra');
      if (!cifra) return;
      var origParent = section.parentNode;
      var nextSibling = section.nextSibling;
      var measureWrap = document.createElement('div');
      measureWrap.style.width = printWidthPx + 'px';
      measureWrap.style.position = 'absolute';
      measureWrap.style.visibility = 'hidden';
      measureWrap.appendChild(section);
      document.body.appendChild(measureWrap);
      var fontPt = parseFloat(window.getComputedStyle(cifra).fontSize) * 72 / 96;
      var minFont = 6;
      var attempts = 0;
      while (section.scrollHeight > pageHeightPx && fontPt > minFont && attempts < 80) {
        fontPt -= 0.5;
        cifra.style.fontSize = fontPt + 'pt';
        attempts++;
      }
      var lh = parseFloat(cifra.style.lineHeight) || ${layoutLineHeight};
      while (section.scrollHeight > pageHeightPx && lh > 0.7 && attempts < 120) {
        lh -= 0.1;
        cifra.style.lineHeight = lh.toFixed(1);
        attempts++;
      }
      document.body.removeChild(measureWrap);
      origParent.insertBefore(section, nextSibling);
    });
    try {
      paginateTwoColAuto();
      computePageNumbers();
      ${previewOnly ? "alignPreviewPages();" : ""}
    } catch (e) { /* paginação falhou — imprime mesmo assim */ }
    ${previewOnly ? "" : "setTimeout(window.print, 150);"}
  }
  // ── Paginação por página para cifras em 2 colunas (auto e quebra manual) ──
  // O Chrome flui column-count:2 e grids de 2 colunas de forma CONTÍNUA
  // (col1 ocupa todas as páginas antes de iniciar a col2). Aqui medimos a
  // altura de cada token numa coluna-protótipo, empacotamos os tokens em
  // colunas que cabem na altura útil de 1 página A4, e agrupamos cada par de
  // colunas numa página própria (grid de 2 colunas). Assim cada página tem
  // suas próprias 2 colunas (pág1 = cols 1-2, pág2 = cols 3-4, ...).
  function paginateTwoColAuto() {
    var pageWmm = 210, pageHmm = 297;
    var vMarginMm = 14;
    var hMarginMm = ${parseFloat((marginMap[layoutMargin] || "16mm").replace("mm",""))};
    var colGapPx = 18;
    var pxPerMm = 3.7795;
    var pageContentHpx = (pageHmm - vMarginMm * 2) * pxPerMm;
    var colWidthPx = ((pageWmm - hMarginMm * 2) * pxPerMm - colGapPx) / 2;
    var blocks = document.querySelectorAll('.cifra-2col-auto, .cifra-2col-manual');
    blocks.forEach(function(block) {
      var section = block.closest ? block.closest('.song-section') : null;
      var dataEl = section ? section.querySelector('.cifra-tokens') : null;
      if (!dataEl) return;
      var tokens;
      try { tokens = JSON.parse(dataEl.textContent); } catch (e) { return; }
      if (!tokens || !tokens.length) return;
      // Mede a altura REAL do cabeçalho (título/ritmo/logo) nesta seção, em vez
      // de chutar um valor fixo — assim a coluna esquerda preenche até o fim da
      // página sem sobrar espaço em branco.
      var realHeaderH = section.offsetHeight - block.scrollHeight;
      if (!isFinite(realHeaderH) || realHeaderH < 0) realHeaderH = 48;
      var availFirst = (pageContentHpx - realHeaderH) * 0.99;
      var availRest = pageContentHpx * 0.99;
      // Sempre repagina por altura real (auto-fill): preenche a coluna esquerda até
      // o fim da página, então passa para a direita, então para a próxima página.
      // Não divide proporcionalmente nem respeita quebra manual fixa.
      // Estilo dinâmico (pós-autoFit): lê o estilo inline atual do bloco
      var dyn = '';
      if (block.style.fontSize) dyn += 'font-size:' + block.style.fontSize + ';';
      if (block.style.lineHeight) dyn += 'line-height:' + block.style.lineHeight + ';';
      if (block.style.letterSpacing) dyn += 'letter-spacing:' + block.style.letterSpacing + ';';
      if (!dyn) dyn = block.getAttribute('data-base-style') || '';
      // Mede a altura de cada token numa coluna-protótipo escondida
      var probe = document.createElement('div');
      probe.className = 'cifra';
      probe.style.cssText = 'position:absolute;left:-99999px;top:0;width:' + colWidthPx + 'px;visibility:hidden;' + dyn;
      document.body.appendChild(probe);
      var heights = tokens.map(function(t) {
        probe.innerHTML = t;
        return probe.scrollHeight;
      });
      document.body.removeChild(probe);
      // Empacota tokens em colunas: pág.1 (cols 0-1) reservam o cabeçalho,
      // páginas seguintes usam a altura útil cheia.
      var columns = [];
      var cur = [], curH = 0, colIndex = 0;
      for (var i = 0; i < tokens.length; i++) {
        var h = heights[i];
        var avail = (colIndex < 2) ? availFirst : availRest;
        if (cur.length && curH + h > avail) {
          columns.push(cur); cur = []; curH = 0; colIndex++;
        }
        cur.push(tokens[i]); curH += h;
      }
      if (cur.length) columns.push(cur);
      var numPages = Math.ceil(columns.length / 2);
      var html = '';
      for (var p = 0; p < numPages; p++) {
        var c1 = columns[p * 2] || [];
        var c2 = columns[p * 2 + 1] || [];
        var pb = p > 0 ? '<div class="manual-break" style="page-break-before:always;break-before:page;"></div>' : '';
        html += pb + '<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:' + colGapPx + 'px;align-items:start;">'
          + '<div class="cifra" style="' + dyn + '">' + c1.join('\n') + '</div>'
          + '<div class="cifra" style="' + dyn + '">' + c2.join('\n') + '</div>'
          + '<span class="col-break" style="display:none"></span></div>';
      }
      block.outerHTML = html;
    });
  }
  // Preenche o número da página de cada música no índice, simulando a
  // paginação real: capa, divisores (quebra antes+depois), índice e músicas
  // (com quebra de página quando ativada). Conta a capa como página 1.
  function computePageNumbers() {
    var paper = document.querySelector('.preview-paper');
    if (!paper) return;
    var pxPerMm = 3.7795;
    var pageContentH = 269; // mm úteis (297 - 14 topo - 14 rodapé)
    var page = 0, y = 0, forceNext = false;
    var map = {};
    var children = paper.children;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var isCover = child.classList && child.classList.contains('cover');
      var isDivider = child.classList && child.classList.contains('section-divider');
      var styleAttr = child.getAttribute ? (child.getAttribute('style') || '') : '';
      var hasBreakBefore = isDivider || /page-break-before:\s*always/.test(styleAttr);
      if (isCover) { page = 0; y = 0; forceNext = false; }
      else if (forceNext || hasBreakBefore) { page++; y = 0; forceNext = false; }
      var sid = child.getAttribute ? child.getAttribute('data-song-id') : null;
      if (sid) map[sid] = page + 1;
      var h = child.offsetHeight / pxPerMm;
      y += h;
      if (isDivider) forceNext = true;
      else { while (y > pageContentH + 0.5) { page++; y -= pageContentH; } }
    }
    document.querySelectorAll('[data-page-for]').forEach(function(el){
      var id = el.getAttribute('data-page-for');
      if (map[id]) el.textContent = map[id];
    });
  }
  function alignPreviewPages() {
    var paper = document.querySelector('.preview-paper');
    if (!paper) return;
    var pH = 297 * 3.7795;
    var mT = 14 * 3.7795;
    paper.querySelectorAll('.page-label').forEach(function(l){ l.remove(); });
    /* Alinha tanto quebras automáticas (data-pagebreak) quanto manuais (.manual-break)
       ao topo da próxima página, exatamente como acontece na impressão */
    paper.querySelectorAll('[data-pagebreak="1"], .manual-break').forEach(function(el) {
      el.style.marginTop = '';
      var relTop = el.offsetTop;
      var pageNum = Math.floor(relTop / pH);
      var contentStart = pageNum * pH + mT;
      if (Math.abs(relTop - contentStart) < 6) return;
      var nextContentStart = (pageNum + 1) * pH + mT;
      var push = nextContentStart - relTop;
      if (push > 0) el.style.marginTop = push + 'px';
    });
    var total = paper.offsetHeight;
    var pages = Math.max(1, Math.ceil(total / pH));
    for (var p = 1; p <= pages; p++) {
      var lab = document.createElement('div');
      lab.className = 'page-label';
      lab.textContent = 'Página ' + p;
      lab.style.top = ((p - 1) * pH + 2) + 'px';
      paper.appendChild(lab);
    }
  }
  setTimeout(function() {
    try { autoFitAll(); }
    catch (e) { /* ajuste falhou — abre a impressão do mesmo jeito */ ${previewOnly ? "" : "window.print();"} }
  }, 400);
};
</script>
</body>
</html>`;

      // Prévia precisa de uma aba visível para navegar; a impressão real usa
      // o iframe oculto (imune a bloqueadores de popup).
      if (printTab) {
        printTab.document.write(html);
        printTab.document.close();
      } else {
        // Bloqueador de popup impediu a aba — último recurso é o iframe invisível
        printHtmlInIframe(html);
        if (previewOnly) {
          alert("Seu navegador bloqueou a aba de prévia. Libere popups para este site e tente de novo.");
        }
      }
      setGenerating(false);
    }, 100);
  };

  // ─── Render da lista de seleção de uma biblioteca ────────────────────────
  const renderSongList = (songs, accentColor, onToggleAll, allExcluded, onMove) => {
    if (songs.length === 0) return null;
    return (
      <div className="space-y-1">
        <button
          onClick={onToggleAll}
          className="w-full flex items-center gap-2 text-xs font-bold uppercase tracking-wide px-2 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
          style={{ color: accentColor }}
        >
          {allExcluded ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
          {allExcluded ? "Marcar todas" : "Desmarcar todas"}
        </button>
        {songs.map(song => {
          const isExcluded = excludedIds.has(song.id);
          const settings = getSongSettings(song.id);
          const isExpanded = expandedSongId === song.id;
          // Cifra alterada: existe edição específica da apostila ativa (snapshot da
          // base coincide com a original atual → edição em uso, não revertida).
          const isCifraEdited = !!(settings.customCifra && settings.customCifraBase && normalizeForSync(settings.customCifraBase) === normalizeForSync(cleanCifra(song.cifra_text)));
          return (
            <div key={song.id} className={`rounded-lg transition-all ${isExcluded ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-1 px-2 py-1.5 hover:bg-black/5">
                {/* Toggle checkbox */}
                <label
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                  onClick={() => toggleExclude(song.id)}
                >
                  {isExcluded
                    ? <Square className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    : <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-700 truncate flex items-center gap-1">
                      {!isExcluded && (
                        <span className="text-[9px] font-bold text-stone-400 tabular-nums flex-shrink-0">{(songs.findIndex(s => s.id === song.id)) + 1}º</span>
                      )}
                      {song.title}
                      {settings.hasOverride && (
                        <Settings2 className="w-3 h-3 text-[#D4AF37]" style={{ fill: '#D4AF37' }} />
                      )}
                    </p>
                    <p className="text-[10px] text-stone-500 truncate flex items-center gap-1">{song.artist}{song.main_key ? ` • Tom: ${song.main_key}` : ''}
                      {isCifraEdited && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (confirm("Limpar a marcação de cifra alterada?\n\nA edição específica da apostila será descartada e a música voltará a usar a cifra original (ajustes de layout/quebras são mantidos).")) {
                              saveCustomCifra(song.id, null, null);
                            }
                          }}
                          className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.5 rounded flex-shrink-0 hover:bg-amber-200 transition-colors"
                          title="Clique para limpar a marcação e usar a cifra original"
                        >
                          <Pencil className="w-2.5 h-2.5" /> Cifra alterada ✕
                        </button>
                      )}
                    </p>
                  </div>
                  {!song.cifra_text && (
                    <span className="text-[9px] text-orange-500 font-bold flex-shrink-0">sem cifra</span>
                  )}
                </label>
                {/* Reorder buttons */}
                {!isExcluded && (
                  <div className="flex flex-col flex-shrink-0 gap-0.5" style={{ minHeight: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMove && onMove(song.id, -1); }}
                      className="p-0.5 text-stone-400 hover:text-[#8B6F47] hover:bg-black/5 rounded-md transition-colors leading-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                      style={{ minHeight: 0, minWidth: 0, height: 20, width: 20 }}
                      title="Mover para cima"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMove && onMove(song.id, 1); }}
                      className="p-0.5 text-stone-400 hover:text-[#8B6F47] hover:bg-black/5 rounded-md transition-colors leading-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                      style={{ minHeight: 0, minWidth: 0, height: 20, width: 20 }}
                      title="Mover para baixo"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {/* Per-song settings toggle */}
                {!isExcluded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedSongId(isExpanded ? null : song.id);
                    }}
                    className={`p-1 rounded-md flex-shrink-0 transition-colors flex items-center justify-center ${
                      isExpanded ? 'bg-[#8B6F47] text-white' : 'text-stone-400 hover:text-[#8B6F47] hover:bg-black/5'
                    }`}
                    style={{ minHeight: 0, minWidth: 0, height: 24, width: 24 }}
                    title="Ajustes individuais desta música"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Per-song settings panel */}
              {isExpanded && !isExcluded && (
                <div className="ml-6 mr-2 mb-1.5 p-2.5 bg-amber-50 border border-[#D4AF37]/40 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#8B6F47] uppercase tracking-wide">Ajustes desta música</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-[#9CAF88] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Salvo automaticamente
                      </span>
                      {settings.hasOverride && (
                        <button
                          onClick={() => clearSongOverride(song.id)}
                          className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-red-500 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Padrão
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Font size */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-stone-600 w-10">Fonte:</span>
                    {[
                      { v: "pequeno", l: "P" },
                      { v: "medio", l: "M" },
                      { v: "grande", l: "G" },
                      { v: "extra", l: "GG" },
                      { v: "gigante", l: "XG" },
                      { v: "xxg", l: "XX" },
                    ].map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => setSongOverride(song.id, 'fontSize', opt.v)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                          settings.fontSize === opt.v
                            ? 'bg-[#8B6F47] text-white'
                            : 'bg-white text-[#8B6F47] border border-[#D4C5B0]'
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                  {/* Columns */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-stone-600 w-10">Colunas:</span>
                    {[1, 2].map(n => (
                      <button
                        key={n}
                        onClick={() => setSongOverride(song.id, 'columns', n)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                          settings.columns === n
                            ? 'bg-[#8B6F47] text-white'
                            : 'bg-white text-[#8B6F47] border border-[#D4C5B0]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {/* Page break */}
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.pageBreak}
                      onChange={e => setSongOverride(song.id, 'pageBreak', e.target.checked)}
                      className="w-3 h-3 accent-[#8B6F47]"
                    />
                    <span className="text-[10px] text-stone-600">Iniciar em página nova</span>
                  </label>
                  {/* Auto-fit (caber numa página) */}
                  <label className="flex items-center gap-1.5 cursor-pointer bg-[#D4AF37]/10 rounded-md px-1.5 py-1">
                    <input
                      type="checkbox"
                      checked={settings.autoFit}
                      onChange={e => setSongOverride(song.id, 'autoFit', e.target.checked)}
                      className="w-3 h-3 accent-[#D4AF37]"
                    />
                    <span className="text-[10px] font-bold text-[#8B6F47] flex items-center gap-1">
                      <Maximize className="w-3 h-3" /> Caber em 1 página (auto)
                    </span>
                  </label>
                  {/* Line height */}
                  <div>
                    <label className="text-[10px] text-stone-600 flex justify-between">
                      <span>Espaçamento de linhas:</span>
                      <span className="font-bold text-[#8B6F47]">{settings.lineHeight.toFixed(1)}</span>
                    </label>
                    <input
                      type="range"
                      min="0.7"
                      max="2.5"
                      step="0.1"
                      value={settings.lineHeight}
                      onChange={e => setSongOverride(song.id, 'lineHeight', parseFloat(e.target.value))}
                      className="w-full accent-[#8B6F47] h-3"
                    />
                  </div>
                  {/* Letter spacing (condensar/expandir caracteres) */}
                  <div>
                    <label className="text-[10px] text-stone-600 flex justify-between">
                      <span>Espaçamento entre caracteres:</span>
                      <span className="font-bold text-[#8B6F47]">{settings.letterSpacing.toFixed(1)}</span>
                    </label>
                    <input
                      type="range"
                      min="-1"
                      max="3"
                      step="0.1"
                      value={settings.letterSpacing}
                      onChange={e => setSongOverride(song.id, 'letterSpacing', parseFloat(e.target.value))}
                      className="w-full accent-[#8B6F47] h-3"
                    />
                  </div>
                  {/* Editar cifra da apostila */}
                  {song.cifra_text && (
                    <button
                      onClick={() => { setEditorSong(song); setEditorStartInEdit(true); }}
                      className="w-full flex items-center justify-between py-1.5 px-2.5 text-[10px] font-bold rounded-lg bg-[#5a3e28] text-white hover:opacity-90 transition-opacity"
                    >
                      <span className="flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5" /> Editar cifra da apostila
                      </span>
                      {settings.customCifra && (
                        <span className="text-[9px] bg-white/25 px-1.5 py-0.5 rounded">editada</span>
                      )}
                    </button>
                  )}
                  {/* Sincronizar: descarta a edição e usa a cifra original atualizada */}
                  {settings.customCifra && (
                    <button
                      onClick={() => {
                        if (confirm("Usar a cifra original atualizada para esta música na apostila?\n\nA edição específica da apostila será descartada (ajustes de layout/quebras são mantidos).")) {
                          saveCustomCifra(song.id, null, null);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Sincronizar com cifra original
                    </button>
                  )}
                  {/* Editor visual de quebras */}
                  {song.cifra_text && (
                    <button
                      onClick={() => { setEditorSong(song); setEditorStartInEdit(false); }}
                      className="w-full flex items-center justify-between py-1.5 px-2.5 text-[10px] font-bold rounded-lg bg-[#D4AF37] text-white hover:opacity-90 transition-opacity"
                    >
                      <span className="flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5" /> Editor de quebras
                      </span>
                      {settings.breakLines.length > 0 && (
                        <span className="text-[9px] bg-white/25 px-1.5 py-0.5 rounded">{settings.breakLines.length} quebra(s)</span>
                      )}
                    </button>
                  )}
                  {/* Botão de prévia da impressão */}
                  <button
                    onClick={() => handlePreviewSong(song)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold rounded-lg bg-[#8B6F47] text-white hover:opacity-90 transition-opacity"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver prévia da impressão
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Seletor de notação dos acordes — disponível na seleção E na apostila montada
  const renderChordNotation = () => (
    <div className="bg-[#F5F1E8] rounded-xl p-3 border border-[#D4C5B0] space-y-2">
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-[#8B6F47] flex-shrink-0" />
        <span className="text-xs font-bold text-[#8B6F47]">Notação dos acordes</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => { setDirty(true); setLayoutChordNames(false); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
            !layoutChordNames
              ? 'bg-[#8B6F47] text-white'
              : 'bg-white text-[#8B6F47] border border-[#D4C5B0] hover:bg-[#F5F1E8]'
          }`}
        >
          Cifra (Am, G7)
        </button>
        <button
          onClick={() => { setDirty(true); setLayoutChordNames(true); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
            layoutChordNames
              ? 'bg-[#8B6F47] text-white'
              : 'bg-white text-[#8B6F47] border border-[#D4C5B0] hover:bg-[#F5F1E8]'
          }`}
        >
          Nomes (Lá m, Sol 7)
        </button>
      </div>
    </div>
  );

  const allSertExcluded = visibleSertanejo.length > 0 && visibleSertanejo.every(s => excludedIds.has(s.id));
  const allPopExcluded = visiblePopRock.length > 0 && visiblePopRock.every(s => excludedIds.has(s.id));

  // Monta a configuração atual da apostila para salvar
  const buildConfig = () => ({
    excludedIds: Array.from(excludedIds),
    sertanejoOrder: sertanejoSongs.map(s => s.id),
    popRockOrder: popRockSongs.map(s => s.id),
    groupByRhythm,
    layoutColumns,
    layoutFontSize,
    layoutCompact,
    layoutMargin,
    layoutLineHeight,
    layoutLetterSpacing,
    layoutSongSpacing,
    layoutAutoFit,
    layoutChordNames,
    // Ajustes individuais por música (fontSize, columns, pageBreak, lineHeight, letterSpacing, breakLines, autoFit, customCifra)
    songOverrides: songOverrides && typeof songOverrides === 'object' ? songOverrides : {},
  });

  // Aplica uma configuração salva, reconstruindo a ordem das listas
  const handleLoadConfig = (config, apostila) => {
    if (!config) return;
    // A seleção vem da apostila salva — a inicialização padrão não se aplica
    selectionInitRef.current = true;
    setLoadedApostila(apostila || null);
    // A configuração carregada representa o estado salvo — nada sujo ainda
    setDirty(false);
    // Restaura ajustes de layout
    if (typeof config.groupByRhythm === "boolean") setGroupByRhythm(config.groupByRhythm);
    if (config.layoutColumns) setLayoutColumns(config.layoutColumns);
    if (config.layoutFontSize) setLayoutFontSize(config.layoutFontSize);
    if (typeof config.layoutCompact === "boolean") setLayoutCompact(config.layoutCompact);
    if (config.layoutMargin) setLayoutMargin(config.layoutMargin);
    if (config.layoutLineHeight) setLayoutLineHeight(config.layoutLineHeight);
    if (typeof config.layoutLetterSpacing === "number") setLayoutLetterSpacing(config.layoutLetterSpacing);
    if (config.layoutSongSpacing) setLayoutSongSpacing(config.layoutSongSpacing);
    if (typeof config.layoutAutoFit === "boolean") setLayoutAutoFit(config.layoutAutoFit);
    if (typeof config.layoutChordNames === "boolean") setLayoutChordNames(config.layoutChordNames);
    // Restaura ajustes individuais por música. A formatação ATUAL de cada
    // música (gravada na própria música) sempre prevalece sobre o snapshot
    // da apostila salva — o snapshot só preenche músicas que não têm ajuste
    // atual. Assim, ajustes feitos em qualquer apostila permanecem em todas.
    if (config.songOverrides && typeof config.songOverrides === 'object') {
      setSongOverrides(prev => ({ ...config.songOverrides, ...prev }));
    }
    // Restaura exclusões + exclui automaticamente as músicas adicionadas ao
    // repertório DEPOIS do salvamento (a apostila salva não as conhecia —
    // antes elas eram inseridas sozinhas no fim da sequência)
    const savedIds = new Set([...(config.sertanejoOrder || []), ...(config.popRockOrder || [])]);
    const unknownIds = [...sertanejoSongs, ...popRockSongs]
      .filter(s => !savedIds.has(s.id))
      .map(s => s.id);
    setExcludedIds(new Set([...(config.excludedIds || []), ...unknownIds]));
    // Reconstrói a ordem: músicas salvas na ordem definida + músicas novas no final
    const reorder = (current, savedOrder) => {
      const orderMap = new Map();
      savedOrder.forEach((id, i) => orderMap.set(id, i));
      const known = current.filter(s => orderMap.has(s.id));
      known.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));
      const knownIds = new Set(known.map(s => s.id));
      const news = current.filter(s => !knownIds.has(s.id));
      news.sort((a, b) => (a.title || "").localeCompare(b.title || "", 'pt-BR'));
      return [...known, ...news];
    };
    setSertanejoSongs(prev => reorder(prev, config.sertanejoOrder || []));
    setPopRockSongs(prev => reorder(prev, config.popRockOrder || []));
    setStep("organizar");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={requestClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl flex flex-col h-[96vh] sm:h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-white" />
              <div>
                <h2 className="font-bold text-white text-lg">Apostila de Cifras</h2>
                <p className="text-white/80 text-sm">Somente cifras • selecione as músicas</p>
              </div>
            </div>
            <button onClick={requestClose} className="text-white/80 hover:text-white" title="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
          {!loadingSongs && (
            <div className="mt-3">
              <ApostilaSavedManager
                buildConfig={buildConfig}
                onLoad={handleLoadConfig}
                totalSelected={totalSelected}
                loadedApostila={loadedApostila}
                setLoadedApostila={setLoadedApostila}
                onSaved={() => setDirty(false)}
              />
            </div>
          )}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {loadingSongs ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#8B6F47]" />
              <p className="text-sm text-[#A68A64]">Carregando músicas...</p>
            </div>
          ) : (
            <>
            {step === "selecionar" ? (
              <>
              {/* Resumo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F5F1E8] rounded-xl p-3 text-center border-2 border-[#8B6F47]/30">
                  <LibraryIcon className="w-5 h-5 text-[#8B6F47] mx-auto mb-0.5" />
                  <div className="text-xl font-bold text-[#8B6F47]">{finalSertanejo.length}<span className="text-xs text-stone-400">/{sertanejoSongs.length}</span></div>
                  <div className="text-[10px] text-[#A68A64] uppercase tracking-wide">Sertanejas</div>
                </div>
                <div className="bg-violet-50 rounded-xl p-3 text-center border-2 border-violet-300">
                  <Music className="w-5 h-5 text-violet-600 mx-auto mb-0.5" />
                  <div className="text-xl font-bold text-violet-600">{finalPopRock.length}<span className="text-xs text-stone-400">/{popRockSongs.length}</span></div>
                  <div className="text-[10px] text-violet-400 uppercase tracking-wide">Pop/Rock</div>
                </div>
              </div>

              <div className="text-center text-sm text-[#A68A64]">
                {totalSelected} música{totalSelected !== 1 ? "s" : ""} selecionada{totalSelected !== 1 ? "s" : ""}
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar música..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#D4C5B0] focus:border-[#8B6F47] focus:outline-none"
                />
              </div>

              {/* Filtro por ritmo (seleção múltipla) */}
              {allRhythms.length > 0 && (
                <div className="bg-[#F5F1E8] rounded-xl p-3 border border-[#D4C5B0]">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="w-4 h-4 text-[#8B6F47] flex-shrink-0" />
                    <span className="text-xs font-bold text-[#8B6F47]">Filtrar por ritmos</span>
                    <span className="text-[10px] text-[#A68A64] ml-auto">
                      {selectedRhythms.size === 0 ? "Todos" : `${selectedRhythms.size} selecionado(s)`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {allRhythms.map(r => {
                      const active = selectedRhythms.has(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => toggleRhythm(r)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                            active
                              ? 'bg-[#8B6F47] text-white border-[#8B6F47]'
                              : 'bg-white text-[#8B6F47] border-[#D4C5B0] hover:bg-[#F5F1E8]'
                          }`}
                        >
                          {active && "✓ "}{r}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#D4C5B0]/60">
                    <button
                      type="button"
                      onClick={() => setSelectedRhythms(new Set())}
                      className="text-[10px] text-stone-500 hover:text-[#8B6F47] font-semibold transition-colors"
                    >
                      Limpar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRhythms(new Set(allRhythms))}
                      className="text-[10px] text-stone-500 hover:text-[#8B6F47] font-semibold transition-colors"
                    >
                      Selecionar todos
                    </button>
                    <Button
                      size="sm"
                      onClick={selectOnlyRhythms}
                      disabled={selectedRhythms.size === 0}
                      className="ml-auto h-7 text-[10px] bg-[#D4AF37] hover:bg-[#b8941f] text-white border-0"
                    >
                      Só os selecionados
                    </Button>
                  </div>
                </div>
              )}

              {/* Ajustes individuais por música */}
              <div className="bg-[#F5F1E8] rounded-xl p-3 border border-[#D4C5B0] space-y-1.5">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-[#8B6F47] flex-shrink-0" />
                  <p className="text-xs text-[#8B6F47] leading-snug">
                    <strong>Reordenar:</strong> use as setas ▲▼ ao lado de cada música para definir a ordem exata na apostila (somente sem busca/filtro ativo).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-[#8B6F47] flex-shrink-0" />
                  <p className="text-xs text-[#8B6F47] leading-snug">
                    Ajustes de layout individuais em cada música (ícone ⚙️). Cada música inicia em página própria.
                  </p>
                </div>
                <button
                  onClick={syncAllCifras}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sincronizar TODAS as cifras com a original
                </button>
              </div>

              {/* Notação dos acordes */}
              {renderChordNotation()}

              {/* Tamanho da fonte da cifra */}
              <div className="bg-[#F5F1E8] rounded-xl p-3 border border-[#D4C5B0] space-y-2">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-[#8B6F47] flex-shrink-0" />
                  <span className="text-xs font-bold text-[#8B6F47]">Tamanho da fonte da cifra</span>
                </div>
                <div className="flex gap-2">
                  {[
                    { key: "pequeno", label: "Pequeno", pt: "8pt" },
                    { key: "medio", label: "Médio", pt: "10pt" },
                    { key: "grande", label: "Grande", pt: "12pt" },
                    { key: "extra", label: "GG", pt: "14pt" },
                    { key: "gigante", label: "XG", pt: "16pt" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setDirty(true); setLayoutFontSize(opt.key); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                        layoutFontSize === opt.key
                          ? 'bg-[#8B6F47] text-white'
                          : 'bg-white text-[#8B6F47] border border-[#D4C5B0] hover:bg-[#F5F1E8]'
                      }`}
                    >
                      {opt.label}<span className="block text-[9px] font-normal opacity-70">{opt.pt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista Sertaneja */}
              {visibleSertanejo.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#8B6F47] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <LibraryIcon className="w-3.5 h-3.5" /> Sertanejas
                  </p>
                  {renderSongList(visibleSertanejo, "#8B6F47", toggleAllSertanejo, allSertExcluded, moveSertanejo)}
                </div>
              )}

              {/* Lista Pop/Rock */}
              {visiblePopRock.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Music className="w-3.5 h-3.5" /> Pop/Rock
                  </p>
                  {renderSongList(visiblePopRock, "#6B4C9A", toggleAllPopRock, allPopExcluded, movePopRock)}
                </div>
              )}

              {/* Botões — Seleção */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={requestClose}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-[#D4C5B0] text-[#8B6F47] font-bold rounded-xl hover:bg-[#F5F1E8]"
                >
                  <X className="w-5 h-5 mr-2" /> Cancelar
                </Button>
                <Button
                  onClick={() => setStep("organizar")}
                  disabled={totalSelected === 0}
                  className="flex-[2] h-12 bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] text-white text-base font-bold rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50"
                >
                  <ListOrdered className="w-5 h-5 mr-2" /> Organizar sequência ({totalSelected})
                </Button>
              </div>

              <p className="text-xs text-center text-[#A68A64]">
                Selecione as músicas e avance para definir a ordem na apostila. A apostila terá apenas as cifras.
              </p>
              </>
            ) : (
              <>
              {/* ── Etapa: Organizar sequência ── */}
              <div className="text-center">
                <div className="text-sm text-[#A68A64]">
                  <strong className="text-[#8B6F47]">{totalSelected}</strong> música{totalSelected !== 1 ? "s" : ""} na sequência
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">Use as setas ▲▼ para definir a ordem exata das músicas. Clique no ⚙️ de cada música para ajustes individuais (fonte, colunas, quebras, cifra).</p>
              </div>

              {/* Opção exceção: dividir por ritmo */}
              <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-50 border-2 border-dashed border-[#D4AF37] cursor-pointer hover:bg-amber-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={groupByRhythm}
                  onChange={(e) => { setDirty(true); setGroupByRhythm(e.target.checked); }}
                  className="w-4 h-4 accent-[#D4AF37] cursor-pointer flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-[#8B6F47] flex items-center gap-1">
                    <Music className="w-3.5 h-3.5" /> Dividir por ritmo (exceção)
                  </span>
                  <span className="text-[10px] text-stone-500 block leading-tight">Por padrão a apostila segue a sequência exata abaixo. Ative para reagrupar as músicas por ritmo.</span>
                </div>
              </label>

              {/* Notação dos acordes — também ajustável com a apostila montada */}
              {renderChordNotation()}

              <ApostilaEditSongs
                allSongs={[...sertanejoSongs, ...popRockSongs]}
                excludedIds={excludedIds}
                onAdd={addToSequence}
                onRemove={(s) => toggleExclude(s.id)}
              />

              {finalSertanejo.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#8B6F47] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <LibraryIcon className="w-3.5 h-3.5" /> Sertanejas ({finalSertanejo.length})
                  </p>
                  <div className="space-y-1">
                    {finalSertanejo.map((song, idx) => (
                      <div key={song.id}>
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#F5F1E8]/70 hover:bg-[#F5F1E8] transition-colors">
                          <SeqPositionBadge position={idx + 1} onApply={(pos) => moveToPositionSertanejo(song.id, pos)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-stone-700 truncate">{song.title}</p>
                            <p className="text-[10px] text-stone-500 truncate">{song.artist}{song.main_key ? ` • ${song.main_key}` : ''}</p>
                          </div>
                          <div className="flex flex-col flex-shrink-0 gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveSelectedSertanejo(song.id, -1); }}
                              disabled={idx === 0}
                              className="p-0.5 text-stone-400 hover:text-[#8B6F47] hover:bg-black/5 rounded-md leading-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                              style={{ height: 20, width: 20 }}
                              title="Mover para cima"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveSelectedSertanejo(song.id, 1); }}
                              disabled={idx === finalSertanejo.length - 1}
                              className="p-0.5 text-stone-400 hover:text-[#8B6F47] hover:bg-black/5 rounded-md leading-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                              style={{ height: 20, width: 20 }}
                              title="Mover para baixo"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExclude(song.id); }}
                              className="p-0.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md leading-none flex items-center justify-center"
                              style={{ height: 20, width: 20 }}
                              title="Remover da apostila"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <SongAdjustPanel
                          song={song}
                          settings={getSongSettings(song.id)}
                          onSetOverride={setSongOverride}
                          onClearOverride={clearSongOverride}
                          onClearCustomCifra={(id) => saveCustomCifra(id, null, null)}
                          onEditCifra={() => { setEditorSong(song); setEditorStartInEdit(true); }}
                          onBreakEditor={() => { setEditorSong(song); setEditorStartInEdit(false); }}
                          onPreview={() => handlePreviewSong(song)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {finalPopRock.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Music className="w-3.5 h-3.5" /> Pop/Rock ({finalPopRock.length})
                  </p>
                  <div className="space-y-1">
                    {finalPopRock.map((song, idx) => (
                      <div key={song.id}>
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-violet-50/70 hover:bg-violet-50 transition-colors">
                          <SeqPositionBadge position={idx + 1} onApply={(pos) => moveToPositionPopRock(song.id, pos)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-stone-700 truncate">{song.title}</p>
                            <p className="text-[10px] text-stone-500 truncate">{song.artist}{song.main_key ? ` • ${song.main_key}` : ''}</p>
                          </div>
                          <div className="flex flex-col flex-shrink-0 gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveSelectedPopRock(song.id, -1); }}
                              disabled={idx === 0}
                              className="p-0.5 text-stone-400 hover:text-violet-600 hover:bg-black/5 rounded-md leading-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                              style={{ height: 20, width: 20 }}
                              title="Mover para cima"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveSelectedPopRock(song.id, 1); }}
                              disabled={idx === finalPopRock.length - 1}
                              className="p-0.5 text-stone-400 hover:text-violet-600 hover:bg-black/5 rounded-md leading-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                              style={{ height: 20, width: 20 }}
                              title="Mover para baixo"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExclude(song.id); }}
                              className="p-0.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md leading-none flex items-center justify-center"
                              style={{ height: 20, width: 20 }}
                              title="Remover da apostila"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <SongAdjustPanel
                          song={song}
                          settings={getSongSettings(song.id)}
                          onSetOverride={setSongOverride}
                          onClearOverride={clearSongOverride}
                          onClearCustomCifra={(id) => saveCustomCifra(id, null, null)}
                          onEditCifra={() => { setEditorSong(song); setEditorStartInEdit(true); }}
                          onBreakEditor={() => { setEditorSong(song); setEditorStartInEdit(false); }}
                          onPreview={() => handlePreviewSong(song)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões — Organização */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setStep("selecionar")}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-[#D4C5B0] text-[#8B6F47] font-bold rounded-xl hover:bg-[#F5F1E8]"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
                </Button>
                <Button
                  onClick={() => handleGenerate(true)}
                  disabled={generating || totalSelected === 0}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-[#D4AF37] text-[#8B6F47] font-bold rounded-xl hover:bg-[#D4AF37]/10"
                >
                  {generating ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando...</>
                  ) : (
                    <><Eye className="w-5 h-5 mr-2" /> Prévia</>
                  )}
                </Button>
                <Button
                  onClick={() => handleGenerate(false)}
                  disabled={generating || totalSelected === 0}
                  className="flex-[2] h-12 bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] text-white text-base font-bold rounded-xl shadow-lg hover:opacity-90"
                >
                  {generating ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando...</>
                  ) : (
                    <><Printer className="w-5 h-5 mr-2" /> Gerar</>
                  )}
                </Button>
              </div>
              </>
            )}
            </>
          )}
        </div>
      </motion.div>

      {/* Editor visual de quebras de página */}
      {editorSong && (
        <ApostilaSongEditor
          song={editorSong}
          settings={getSongSettings(editorSong.id)}
          initialEditMode={editorStartInEdit}
          onSetOverride={(field, value) => setSongOverride(editorSong.id, field, value)}
          onSave={(breakLines) => saveBreakLines(editorSong.id, breakLines)}
          onSaveCifra={(cifra, base) => saveCustomCifra(editorSong.id, cifra, base)}
          onClose={() => { setEditorSong(null); setEditorStartInEdit(false); }}
          onPreview={(editedCifra) => handlePreviewSong(editorSong, editedCifra)}
        />
      )}
    </motion.div>
  );
}