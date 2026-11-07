import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Printer, Guitar, Music, BookOpen, Loader2, FileText } from "lucide-react";
import { motion } from "framer-motion";

// ─── Extrai acordes únicos das progressões da música ─────────────────────────
// Usa os acordes salvos em song.progressions[].chords — 100% preciso,
// sem risco de capturar palavras de letras em maiúsculas como acordes.

function extractChordsFromSong(song) {
  if (!song) return [];
  const seen = new Set();
  const result = [];

  // Fonte principal: acordes salvos nas progressões
  const progressions = song.progressions || [];
  for (const prog of progressions) {
    const chords = Array.isArray(prog.chords) ? prog.chords : [];
    for (const ch of chords) {
      if (!ch) continue;
      // Remove o baixo (D/F# → D)
      const clean = ch.split("/")[0].trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        result.push(clean);
      }
    }
  }

  return result;
}

// ─── Gera SVG do diagrama como string pura ───────────────────────────────────

function buildChordSVG(chord, instrument) {
  if (!chord?.strings?.length) return "";
  const isViola = instrument === "viola";
  const n = isViola ? 5 : 6;
  const sp = 22, fh = 22, nf = 5, sx = 22, sy = 30, dr = isViola ? 7 : 6, pg = 2;
  const w = sx + (n - 1) * sp + 22, h = sy + nf * fh + 30;
  const displayStrings = isViola ? chord.strings.filter((_, i) => i % 2 === 0) : chord.strings;

  const dsf = chord.fret != null ? chord.fret : (() => {
    const fu = displayStrings.map(s => (s === 'x' || s === '0') ? Infinity : parseInt(s)).filter(x => !isNaN(x) && x !== Infinity);
    if (chord.barre_fret) fu.push(chord.barre_fret);
    const m = fu.length > 0 ? Math.min(...fu) : 0;
    return m > 3 ? m - 1 : 0;
  })();

  const gv = v => { if (v === 'x' || v === 'X') return 'x'; if (v === '0' || v === 'o' || v === 'O') return '0'; return parseInt(v); };
  const pn = ['B','E','G#','B','E'];
  let L = [];

  // cordas
  for (let i = 0; i < n; i++) {
    const x = sx + i * sp;
    if (isViola) {
      L.push(`<line x1="${x-pg/2}" y1="${sy}" x2="${x-pg/2}" y2="${sy+nf*fh}" stroke="#8B6F47" stroke-width="${(i===0||i===n-1)?2:1.5}"/>`);
      L.push(`<line x1="${x+pg/2}" y1="${sy}" x2="${x+pg/2}" y2="${sy+nf*fh}" stroke="#8B6F47" stroke-width="${(i===0||i===n-1)?2:1.5}"/>`);
      L.push(`<text x="${x}" y="${sy+nf*fh+12}" text-anchor="middle" font-size="8" fill="#9CAF88" font-weight="bold">${pn[i]}</text>`);
    } else {
      L.push(`<line x1="${x}" y1="${sy}" x2="${x}" y2="${sy+nf*fh}" stroke="#8B6F47" stroke-width="${(i===0||i===n-1)?2.5:1.5}"/>`);
    }
  }
  // trastes
  for (let i = 0; i <= nf; i++) L.push(`<line x1="${sx}" y1="${sy+i*fh}" x2="${sx+(n-1)*sp}" y2="${sy+i*fh}" stroke="#8B6F47" stroke-width="${i===0&&dsf===0?4:2}"/>`);
  // números
  for (let i = 0; i < nf; i++) L.push(`<text x="${sx-12}" y="${sy+i*fh+fh/2+3}" text-anchor="middle" font-size="9" fill="#8B6F47" font-weight="bold">${dsf+i+1}</text>`);
  // pestana
  if (chord.barre_fret != null) {
    const bf = parseInt(chord.barre_fret), adj = bf - dsf;
    if (adj >= 1 && adj <= nf) {
      const y = sy + (adj - 0.5) * fh;
      L.push(`<rect x="${sx-5}" y="${y-6}" width="${(n-1)*sp+10}" height="12" rx="6" fill="#D4AF37" opacity="0.7" stroke="#8B6F47" stroke-width="1"/>`);
      L.push(`<text x="${sx+((n-1)*sp)/2}" y="${y+3}" text-anchor="middle" font-size="8" fill="#8B6F47" font-weight="bold">P${bf}</text>`);
    }
  }
  // x / o
  for (let i = 0; i < displayStrings.length; i++) {
    const val = gv(displayStrings[i]), x = sx + i * sp;
    if (val === 'x') {
      L.push(`<line x1="${x-4}" y1="${sy-16}" x2="${x+4}" y2="${sy-8}" stroke="#D32F2F" stroke-width="1.5" stroke-linecap="round"/>`);
      L.push(`<line x1="${x-4}" y1="${sy-8}" x2="${x+4}" y2="${sy-16}" stroke="#D32F2F" stroke-width="1.5" stroke-linecap="round"/>`);
    } else if (val === '0') {
      L.push(`<circle cx="${x}" cy="${sy-12}" r="5" fill="none" stroke="#2E7D32" stroke-width="1.5"/>`);
    }
  }
  // dedos
  for (let i = 0; i < displayStrings.length; i++) {
    const val = gv(displayStrings[i]);
    if (typeof val === 'number' && val > 0) {
      const adj = val - dsf;
      if (adj >= 1 && adj <= nf) {
        const x = sx + i * sp, y = sy + (adj - 0.5) * fh;
        L.push(`<circle cx="${x}" cy="${y}" r="${dr}" fill="#8B6F47" stroke="#A68A64" stroke-width="1"/>`);
        L.push(`<circle cx="${x}" cy="${y}" r="${dr-2}" fill="none" stroke="white" stroke-width="0.5" opacity="0.6"/>`);
      }
    }
  }
  L.push(`<text x="${w/2}" y="16" text-anchor="middle" font-size="11" fill="#8B6F47" font-weight="bold">${chord.name}</text>`);
  L.push(`<text x="${w/2}" y="${h-6}" text-anchor="middle" font-size="7" fill="#A68A64">${isViola?"Viola":"Violão"}</text>`);
  return `<svg width="${w}" height="${h}" style="display:block;">${L.join("")}</svg>`;
}

// ─── Gera HTML do diagrama de ritmo ──────────────────────────────────────────

function buildRhythmDiagramHTML(rhythm) {
  if (!rhythm) return "";
  const parsePattern = (pattern, customDiagram) => {
    if (customDiagram && customDiagram.trim()) {
      const custom = customDiagram.trim().toUpperCase();
      const parsed = [];
      custom.split(/\s+/).forEach(token => {
        if (['B','↓','BAIXO','DOWN','D'].includes(token)) parsed.push({ direction: "down", accent: parsed.length === 0 });
        else if (['A','↑','ALTO','UP','CIMA','U'].includes(token)) parsed.push({ direction: "up", accent: false });
        else if (['X','ABAFADO','MUTED','M'].includes(token)) parsed.push({ direction: "muted", accent: false });
        else if (['L','LEQUE','FAN'].includes(token)) parsed.push({ direction: "fan", accent: false });
      });
      if (parsed.length > 0) return parsed;
    }
    const lower = (pattern || "").toLowerCase();
    if (lower.includes("guarânia")) return [
      { direction: "down", accent: true }, { direction: "up", accent: false }, { direction: "down", accent: false }
    ];
    if (lower.includes("vanera")) return [
      { direction: "down", accent: true }, { direction: "up", accent: false },
      { direction: "down", accent: false }, { direction: "up", accent: false }
    ];
    return [{ direction: "down", accent: true }, { direction: "up", accent: false }];
  };

  const steps = parsePattern(rhythm.pattern, rhythm.diagram_pattern);
  if (!steps || steps.length === 0) return "";

  const symbolMap = { down: "↓", up: "↑", muted: "✕", fan: "⋰" };
  const colorMap = { down: "#8B6F47", up: "#8B6F47", muted: "#D32F2F", fan: "#9CAF88" };

  const symbols = steps.map((s, i) => {
    const sym = symbolMap[s.direction] || "↓";
    const color = s.accent ? "#D4AF37" : colorMap[s.direction] || "#8B6F47";
    const weight = s.accent ? "900" : "700";
    return `<span style="font-size:22px; font-weight:${weight}; color:${color}; margin:0 4px; line-height:1;">${sym}</span>`;
  }).join("");

  const extras = [
    rhythm.time_signature ? `<strong>Compasso:</strong> ${rhythm.time_signature}` : "",
    rhythm.sound ? `<strong>Som:</strong> <em>${rhythm.sound}</em>` : "",
  ].filter(Boolean).join(" &nbsp;•&nbsp; ");

  return `
    <div style="background:#fdf8f2; border:1px solid #e0cfb0; border-radius:6px; padding:10px 16px; display:flex; flex-direction:column; gap:6px;">
      <div style="display:flex; align-items:center; gap:2px;">${symbols}</div>
      ${extras ? `<div style="font-size:9pt; color:#555;">${extras}</div>` : ""}
    </div>`;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function ApostilaPDF({ song: initialSong, onClose }) {
  const [instrument, setInstrument] = useState("violao");
  const [generating, setGenerating] = useState(false);
  const [soloTabText, setSoloTabText] = useState(null); // null = não extraído ainda
  const [soloStatus, setSoloStatus] = useState("idle"); // idle | loading | done | error
  const [freshSong, setFreshSong] = useState(null);
  const [loadingFresh, setLoadingFresh] = useState(true);

  // Busca sempre a versão mais recente da música do servidor ao abrir o modal,
  // para a apostila reflitar correções feitas na cifra original mesmo quando o
  // objeto recebido por prop vem de um cache offline desatualizado.
  useEffect(() => {
    let cancelled = false;
    setLoadingFresh(true);
    base44.entities.Song.get(initialSong.id)
      .then((s) => { if (!cancelled && s) setFreshSong(s); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingFresh(false); });
    return () => { cancelled = true; };
  }, [initialSong.id]);

  const song = freshSong || initialSong;

  const soloUrl = song.solo_pdf_url || "";
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(soloUrl);
  const isPDF = soloUrl && !isImage;



  // Extrai tablatura do PDF via IA ao abrir o modal (apenas se for PDF)
  React.useEffect(() => {
    if (!isPDF) return;
    setSoloStatus("loading");
    base44.integrations.Core.InvokeLLM({
      prompt: `Você é um especialista em música. O arquivo PDF a seguir contém a tablatura/solo de uma música. 
Extraia TODO o conteúdo de tablatura/tab ASCII presente no PDF, preservando exatamente o formato original com as linhas de cordas (E, A, D, G, B, e), números de casa, barras de compasso (|), etc.
Retorne apenas o texto da tablatura, sem explicações adicionais. Se houver múltiplas seções, separe-as com uma linha em branco.
Música: ${song.title} - ${song.artist}`,
      file_urls: [soloUrl],
    })
      .then((res) => {
        const text = typeof res === "string" ? res : res?.text || res?.content || JSON.stringify(res);
        setSoloTabText(text && text.trim().length > 10 ? text.trim() : null);
        setSoloStatus("done");
      })
      .catch(() => {
        setSoloTabText(null);
        setSoloStatus("error");
      });
  }, [soloUrl]);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    initialData: null,
  });

  const { data: allChords = [] } = useQuery({
    queryKey: ["chords-apostila"],
    queryFn: async () => {
      const res = await base44.entities.Chord.list('name', 500);
      return res || [];
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: allRhythms = [] } = useQuery({
    queryKey: ["rhythms"],
    queryFn: () => base44.entities.Rhythm.list(),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Busca o ritmo da música pelo ID ou pelo nome
  const songRhythm = allRhythms.find(r => r.id === song.rhythm_id)
    || allRhythms.find(r => r.name === song.rhythm_name)
    || null;

  const chordsInSong = extractChordsFromSong(song);
  const favoriteChords = currentUser?.favorite_chords || [];

  // Para cada acorde da cifra, busca primeiro o favorito do instrumento selecionado,
  // se não tiver favorito busca qualquer diagrama disponível no banco
  const findChordDiagram = (chordName) => {
    const nameLower = chordName.toLowerCase();
    // 1. Favorito exato do instrumento
    const fav = favoriteChords.find(
      f => f.chord_name === chordName && f.instrument === instrument
    ) || favoriteChords.find(
      f => f.chord_name?.toLowerCase() === nameLower && f.instrument === instrument
    );
    if (fav) {
      const favChord = allChords.find(c => c.id === fav.chord_id);
      if (favChord) return favChord;
    }
    // 2. Qualquer diagrama do banco para o instrumento
    return allChords.find(c => c.name === chordName && c.instrument === instrument)
      || allChords.find(c => c.name?.toLowerCase() === nameLower && c.instrument === instrument)
      || null;
  };

  // Apenas acordes QUE TÊM diagrama
  const chordsWithDiagrams = chordsInSong
    .map(name => ({ name, chord: findChordDiagram(name) }))
    .filter(({ chord }) => chord !== null);

  const totalChords = chordsInSong.length;
  const foundCount = chordsWithDiagrams.length;

  const handlePrint = () => {
    setGenerating(true);
    // Pequeno timeout para permitir o React atualizar o estado do botão antes de abrir a janela
    setTimeout(() => {
      gerarPDF(soloTabText, isImage ? soloUrl : null);
      setGenerating(false);
      // Fecha o modal automaticamente após gerar
      onClose();
    }, 100);
  };

  const gerarPDF = (tabText, imageDataUrl) => {

    // Limpa cifra
    let cifra = song.cifra_text || "";
    cifra = cifra.replace(/\[Intro\]\s*\n(Tom:.*\n)?(BPM:.*\n)?(Ritmo:.*\n)?\s*\n?/gi, "");
    cifra = cifra.replace(/^Pattern:.*$/gim, "");
    cifra = cifra.replace(/^\s+/, "");
    cifra = cifra.replace(/\n{3,}/g, "\n\n");
    cifra = cifra.replace(/(\[Refr[ãa]o\][\s\S]*?)(?=\[|$)/gi, '<span class="refrao">$1</span>');

    // Gera grid de acordes — apenas os que têm diagrama
    const chordBlocks = chordsWithDiagrams
      .map(({ chord }) => `<div class="chord-block">${buildChordSVG(chord, instrument)}</div>`)
      .join("");

    const instrLabel = instrument === "viola" ? "Viola Caipira" : "Violão";

    // Calcula se a imagem precisa ser reduzida para caber na página (A4 útil ~247mm x ~185mm a 96dpi ≈ 700px)
    // Seção do solo — imagem → embed direto (recortada); PDF → texto extraído pela IA
    let soloSection = "";
    if (soloUrl) {
      if (isImage) {
        const imgSrc = imageDataUrl || soloUrl;
        soloSection = `
          <div class="section-title">🎸 Solo / Tablatura</div>
          <div class="solo-embed">
            <img src="${imgSrc}" style="width:100%; max-width:100%; height:auto; display:block;" alt="Solo tablatura" />
          </div>`;
      } else if (tabText && tabText.trim().length > 10) {
        soloSection = `
          <div class="section-title">🎸 Solo / Tablatura</div>
          <div class="tab-content">${escapeHtml(tabText)}</div>`;
      } else {
        soloSection = `
          <div class="section-title">🎸 Solo / Tablatura</div>
          <div class="tab-info">
            <p style="font-size:9pt; color:#666;">Tablatura não pôde ser extraída do PDF.<br/>
            <a href="${soloUrl}" target="_blank" style="color:#8B6F47; font-weight:bold;">Clique aqui para abrir o PDF do solo.</a></p>
          </div>`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Apostila – ${song.title} – ${song.artist}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@600;700;900&display=swap');
    @page { size: A4 portrait; margin: 15mm 20mm; }
    @page :first { margin-top: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; line-height: 1.6; }

    .header { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #8B6F47; padding-bottom: 6px; margin-bottom: 8px; }
    .logo { width: 90px; height: 90px; object-fit: contain; }
    .header-info { flex: 1; }
    .song-title { font-size: 16pt; font-weight: 900; color: #5a3e28; letter-spacing: 0.5px; text-transform: uppercase; }
    .song-title.genre-samba { color: #15803d; }
    .song-title.genre-forro { color: #b8860b; }
    .song-artist { font-size: 11pt; font-weight: 700; color: #8B6F47; margin-top: 1px; }
    .song-meta { font-size: 9pt; color: #666; margin-top: 2px; }
    .badge { display:inline-block; background:#D4AF37; color:#fff; border-radius:4px; padding:2px 8px; font-size:9pt; font-weight:700; margin-left:6px; }

    /* TÍTULOS DE SEÇÃO */
    .section-title { font-size: 10pt; font-weight: 900; color: #5a3e28; border-left: 4px solid #D4AF37; padding: 3px 0 3px 10px; margin: 10px 0 5px 0; text-transform: uppercase; letter-spacing: 1px; page-break-after: avoid; break-after: avoid; background: linear-gradient(to right, rgba(212,175,55,0.08), transparent); border-radius: 0 4px 4px 0; }

    /* SOLO */
    .solo-embed { width: 100%; margin-bottom: 10px; page-break-inside: avoid; }
    .tab-content { font-family: 'Courier New', Courier, monospace; font-size: 9pt; line-height: 1.8; white-space: pre-wrap; word-break: break-word; background: #1a1a2e; color: #e8d5b7; border-radius: 8px; padding: 16px 20px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .tab-info { background: #fdf8f2; border: 1px solid #e0cfb0; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; }

    /* CIFRA */
    .cifra { font-family: 'Azeret Mono', 'Courier New', monospace; font-size: 16pt; line-height: 1.35; font-weight: 700; white-space: pre-wrap; word-break: break-word; background: #fdf8f2; border: 1.5px solid #c8a97a; border-radius: 10px; padding: 16px 22px; box-shadow: 0 3px 10px rgba(139,111,71,0.13); }
    .cifra.condensed { font-size: 14pt; line-height: 1.35; padding: 12px 18px; }
    .cifra.very-condensed { font-size: 12pt; line-height: 1.35; padding: 10px 14px; }
    .refrao { font-weight: 800; background: rgba(212,175,55,0.18); display: block; padding: 5px 2px; border-left: 2px solid #D4AF37; padding-left: 6px; margin: 2px 0; }

    /* PROGRESSÕES */
    .prog-item { page-break-inside: avoid; break-inside: avoid; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #e8d8c0; }
    .prog-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .prog-container { background: #fdf8f2; border: 1px solid #d4b896; border-radius: 8px; padding: 8px 12px; page-break-inside: avoid; break-inside: avoid; font-size: 8pt; box-shadow: 0 2px 6px rgba(139,111,71,0.1); }

    /* DIAGRAMAS */
    .chords-grid { display: flex; flex-wrap: wrap; gap: 14px; padding: 14px; background: #fdf8f2; border: 1px solid #d4b896; border-radius: 8px; box-shadow: 0 2px 6px rgba(139,111,71,0.1); }
    .chord-block { display: flex; flex-direction: column; align-items: center; transform: scale(0.82); transform-origin: top center; margin-bottom: -10px; }

    .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #e0cfb0; font-size: 8pt; color: #999; text-align: center; letter-spacing: 0.5px; }

    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .header { page-break-after: avoid; }
      .chords-grid { page-break-inside: avoid; }
      .tab-content { color: #e8d5b7 !important; background: #1a1a2e !important; }
      .prog-container { page-break-inside: avoid; break-inside: avoid; }
      .section-title { page-break-after: avoid; break-after: avoid; }
      .section-title + * { page-break-before: avoid; break-before: avoid; }
    }
  </style>
</head>
<body>

  <!-- CABEÇALHO -->
  <div class="header">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6900add80614fb22512134a9/522fde112_LOGO-PNG.png" class="logo" alt="Logo"/>
    <div class="header-info">
      <div class="song-title${song.genre_style === "samba" ? " genre-samba" : song.genre_style === "forro" ? " genre-forro" : ""}">${song.title}</div>
      <div class="song-artist">${song.artist}</div>
      <div class="song-meta">
        ${song.main_key ? `<strong>Tom:</strong> ${song.main_key}` : ""}
        ${song.rhythm_name ? ` &nbsp;•&nbsp; <strong>Ritmo:</strong> ${song.rhythm_name}` : ""}
        ${song.tempo ? ` &nbsp;•&nbsp; <strong>BPM:</strong> ${song.tempo}` : ""}
        ${song.genre_style ? ` &nbsp;•&nbsp; ${song.genre_style.replace(/_/g, " ")}` : ""}
        <span class="badge">${instrLabel}</span>
      </div>
    </div>
  </div>

  <!-- 1. CIFRA COMPLETA (começa logo após o cabeçalho na página 1) -->
  ${cifra ? (() => {
    const lines = cifra.split('\n').length;
    const cifraClass = lines > 70 ? 'cifra very-condensed' : lines > 42 ? 'cifra condensed' : 'cifra';
    return `
  <div class="section-title">📄 Cifra Completa</div>
  <div class="${cifraClass}">${cifra}</div>`;
  })() : ""}

  <!-- 2. SOLO / TABLATURA (após a cifra) -->
  ${soloSection ? `<div style="page-break-before: always;"></div>${soloSection}` : ""}

  <!-- PÁGINA TÉCNICA: continua o fluxo, só quebra se não couber -->
  <div>

  <!-- DIAGRAMAS DE ACORDES -->
  ${chordsWithDiagrams.length > 0 ? `
  <div class="section-title">🎸 Diagramas de Acordes (${instrLabel})</div>
  <div class="chords-grid">${chordBlocks}</div>
  ` : ""}

  <!-- DIAGRAMA DO RITMO -->
  ${songRhythm ? `
  <div class="section-title">🥁 Diagrama do Ritmo – ${songRhythm.name}</div>
  ${buildRhythmDiagramHTML(songRhythm)}
  ` : ""}

  <!-- PROGRESSÕES HARMÔNICAS -->
  ${song.progressions && song.progressions.length > 0 ? `
  <div class="section-title" style="page-break-after:avoid;">🎼 Progressões Harmônicas</div>
  <div class="prog-container">
    ${song.progressions.map(prog => `
      <div class="prog-item">
        <div style="display:flex; gap:6px; align-items:baseline; flex-wrap:wrap;">
          <span style="font-weight:900; font-size:9pt; color:#5a3e28;">${prog.section || "Seção"}</span>
          ${prog.key ? `<span style="font-size:7.5pt; color:#8B6F47; font-weight:700;">Tom: ${prog.key}${prog.modulated_key ? ` → ${prog.modulated_key}` : ""}</span>` : ""}
          ${prog.progression_name ? `<span style="background:#D4AF37; color:#fff; border-radius:3px; padding:1px 5px; font-size:7pt; font-weight:700;">${prog.progression_name}</span>` : ""}
          ${prog.pattern ? `<span style="font-size:7.5pt; color:#666; font-family:monospace;">${prog.pattern}</span>` : ""}
        </div>
        ${prog.chords && prog.chords.length > 0 ? `<div style="margin-top:2px; font-size:8pt; font-family:'Courier New', monospace; color:#1a1a1a; font-weight:600;">${prog.chords.join(" → ")}</div>` : ""}
      </div>
    `).join("")}
  </div>
  ` : ""}

  <!-- 6. DISTRIBUIÇÃO DAS FUNÇÕES HARMÔNICAS -->
  ${(() => {
    if (!song.progressions || song.progressions.length === 0) return "";
    const HARMONIC_FUNCTIONS = {
      'I': 'Tônica', 'i': 'Tônica', 'iii': 'Tônica', 'III': 'Tônica', 'vi': 'Tônica', 'VI': 'Tônica',
      'II': 'Subdominante', 'ii': 'Subdominante', 'IV': 'Subdominante', 'iv': 'Subdominante',
      'V': 'Dominante', 'V7': 'Dominante', 'VII': 'Dominante', 'vii°': 'Dominante',
    };
    const counts = { Tônica: 0, Subdominante: 0, Dominante: 0 };
    song.progressions.forEach(prog => {
      if (!prog.pattern) return;
      prog.pattern.split('-').filter(d => d && d.trim()).forEach(degree => {
        let clean = degree.replace(/7|°|\+|ø|dim|aug|sus|maj/g, '');
        let fn = HARMONIC_FUNCTIONS[clean] || HARMONIC_FUNCTIONS[clean.toUpperCase()];
        if (fn) counts[fn]++;
      });
    });
    const total = counts.Tônica + counts.Subdominante + counts.Dominante;
    if (total === 0) return "";
    const pct = k => total > 0 ? ((counts[k] / total) * 100).toFixed(1) : 0;
    const tPct = pct('Tônica'), sPct = pct('Subdominante'), dPct = pct('Dominante');
    let balance = 'Equilibrada';
    if (parseFloat(dPct) > 40) balance = 'Tensão Dominante';
    else if (parseFloat(tPct) > 50) balance = 'Repouso Predominante';
    else if (parseFloat(sPct) > 40) balance = 'Preparação Constante';
    return `
    <div class="section-title" style="page-break-after:avoid; break-after:avoid;">🎯 Distribuição das Funções Harmônicas</div>
    <div class="prog-container" style="page-break-inside:avoid; break-inside:avoid;">
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:4px; margin-bottom:5px;">
        <div style="text-align:center; padding:3px 4px; background:linear-gradient(135deg,#dcfce7,#fff); border:1.5px solid #86efac; border-radius:5px;">
          <div style="font-size:11pt; font-weight:900; color:#16a34a;">${tPct}%</div>
          <div style="font-size:6.5pt; font-weight:700; color:#15803d; text-transform:uppercase;">Tônica</div>
          <div style="font-size:6.5pt; color:#16a34a;">${counts.Tônica} acrd · I, iii, vi</div>
        </div>
        <div style="text-align:center; padding:3px 4px; background:linear-gradient(135deg,#dbeafe,#fff); border:1.5px solid #93c5fd; border-radius:5px;">
          <div style="font-size:11pt; font-weight:900; color:#2563eb;">${sPct}%</div>
          <div style="font-size:6.5pt; font-weight:700; color:#1d4ed8; text-transform:uppercase;">Subdominante</div>
          <div style="font-size:6.5pt; color:#2563eb;">${counts.Subdominante} acrd · ii, IV</div>
        </div>
        <div style="text-align:center; padding:3px 4px; background:linear-gradient(135deg,#fee2e2,#fff); border:1.5px solid #fca5a5; border-radius:5px;">
          <div style="font-size:11pt; font-weight:900; color:#dc2626;">${dPct}%</div>
          <div style="font-size:6.5pt; font-weight:700; color:#b91c1c; text-transform:uppercase;">Dominante</div>
          <div style="font-size:6.5pt; color:#dc2626;">${counts.Dominante} acrd · V, V7</div>
        </div>
      </div>
      <div style="height:7px; border-radius:4px; overflow:hidden; border:1px solid #e0cfb0; display:flex; margin-bottom:4px;">
        <div style="width:${tPct}%; background:#22c55e;"></div>
        <div style="width:${sPct}%; background:#3b82f6;"></div>
        <div style="width:${dPct}%; background:#ef4444;"></div>
      </div>
      <div style="font-size:7.5pt; color:#5a3e28; background:#fdf8f2; border-left:3px solid #D4AF37; padding:3px 8px; border-radius:0 4px 4px 0;">
        <strong>Equilíbrio: ${balance}</strong>
      </div>
    </div>`;
  })()}

  </div><!-- fim página técnica -->

  <!-- print via parent -->
</body>
</html>`;

    // Usa blob URL para compatibilidade máxima com mobile
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Libera o blob após um tempo
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-white" />
              <div>
                <h2 className="font-bold text-white text-lg">Gerar Apostila PDF</h2>
                <p className="text-white/80 text-sm">Solo • Cifra • Diagramas • Progressões</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Info música */}
          <div className="bg-[#F5F1E8] rounded-xl p-4">
            <p className="font-bold text-[#8B6F47] text-lg uppercase">{song.title}</p>
            <p className="text-[#A68A64] text-sm">{song.artist}</p>
            <div className="flex gap-2 flex-wrap mt-2">
              {song.main_key && <Badge className="bg-[#9CAF88] text-white">Tom: {song.main_key}</Badge>}
              {song.rhythm_name && <Badge className="bg-[#D4AF37] text-white">{song.rhythm_name}</Badge>}
              {song.solo_pdf_url && <Badge className="bg-purple-500 text-white">✓ Solo PDF</Badge>}
            </div>
          </div>

          {/* Instrumento */}
          <div>
            <p className="text-sm font-semibold text-[#8B6F47] mb-3">Instrumento para os diagramas:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setInstrument("violao")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  instrument === "violao"
                    ? "border-[#8B6F47] bg-[#8B6F47]/10 text-[#8B6F47]"
                    : "border-[#D4C5B0] text-[#A68A64] hover:border-[#8B6F47]"
                }`}
              >
                <Guitar className="w-7 h-7" />
                <span className="font-bold text-sm">Violão</span>
                <span className="text-xs opacity-70">6 cordas</span>
              </button>
              <button
                onClick={() => setInstrument("viola")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  instrument === "viola"
                    ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]"
                    : "border-[#D4C5B0] text-[#A68A64] hover:border-[#D4AF37]"
                }`}
              >
                <Music className="w-7 h-7" />
                <span className="font-bold text-sm">Viola Caipira</span>
                <span className="text-xs opacity-70">10 cordas (5 pares)</span>
              </button>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-[#F5F1E8] rounded-xl p-4">
            <p className="text-sm font-semibold text-[#8B6F47] mb-3">A apostila vai incluir (nesta ordem):</p>
            <ol className="space-y-1.5 text-sm list-none">
              <li className={`flex items-center gap-2 ${song.cifra_text ? "text-green-700" : "text-gray-400"}`}>
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold" style={{borderColor: song.cifra_text ? '#16a34a' : '#ccc'}}>1</span>
                Cifra completa {song.cifra_text ? "" : "(sem cifra)"}
              </li>
              <li className={`flex items-center gap-2 ${soloUrl ? "text-green-700" : "text-gray-400"}`}>
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold" style={{borderColor: soloUrl ? '#16a34a' : '#ccc'}}>2</span>
                {isImage
                  ? "Solo / Tablatura (imagem incorporada)"
                  : isPDF
                    ? soloStatus === "loading"
                      ? <span className="flex items-center gap-1">Solo / Tablatura <Loader2 className="w-3 h-3 animate-spin" /> extraindo via IA...</span>
                      : soloStatus === "done" && soloTabText
                        ? "Solo / Tablatura (texto extraído pela IA ✓)"
                        : soloStatus === "error" || (soloStatus === "done" && !soloTabText)
                          ? "Solo / Tablatura (link para PDF incluído)"
                          : "Solo / Tablatura"
                    : "(sem arquivo de solo)"}
              </li>
              <li className={`flex items-center gap-2 ${foundCount > 0 ? "text-green-700" : "text-gray-400"}`}>
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold" style={{borderColor: foundCount > 0 ? '#16a34a' : '#ccc'}}>3</span>
                Diagramas de acordes ({foundCount} de {totalChords} com diagrama)
              </li>
              <li className={`flex items-center gap-2 ${songRhythm ? "text-green-700" : "text-gray-400"}`}>
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold" style={{borderColor: songRhythm ? '#16a34a' : '#ccc'}}>4</span>
                Diagrama do ritmo {songRhythm ? `(${songRhythm.name} ✓)` : "(sem ritmo cadastrado)"}
              </li>
              <li className={`flex items-center gap-2 ${song.progressions?.length > 0 ? "text-green-700" : "text-gray-400"}`}>
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold" style={{borderColor: song.progressions?.length > 0 ? '#16a34a' : '#ccc'}}>5</span>
                Progressões harmônicas ({song.progressions?.length || 0} seções)
              </li>
            </ol>
            {foundCount < totalChords && (
              <p className="text-xs text-orange-600 mt-3 bg-orange-50 p-2 rounded-lg">
                ⚠️ {totalChords - foundCount} acorde(s) sem diagrama no banco para {instrument === "viola" ? "viola" : "violão"} — serão omitidos da apostila.
              </p>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-12 border-2 border-[#D4C5B0] text-[#8B6F47] font-bold rounded-xl hover:bg-[#F5F1E8]"
            >
              <X className="w-5 h-5 mr-2" /> Cancelar
            </Button>
            <Button
              onClick={handlePrint}
              disabled={generating || soloStatus === "loading" || loadingFresh}
              className="flex-1 h-12 bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] text-white text-base font-bold rounded-xl shadow-lg hover:opacity-90 disabled:opacity-60"
            >
              {loadingFresh ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Atualizando cifra...</>
              ) : generating || soloStatus === "loading" ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {soloStatus === "loading" ? "Extraindo via IA..." : "Gerando..."}</>
              ) : (
                <><Printer className="w-5 h-5 mr-2" /> Gerar e Imprimir</>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-[#A68A64]">
            O diálogo de impressão será aberto automaticamente.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}