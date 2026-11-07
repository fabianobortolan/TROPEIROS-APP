import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Printer, Guitar, Music, BookOpen, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// ─── Utilitários ──────────────────────────────────────────────────────────────

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("[")) return false;
  const hasLongWord = /[a-záàâãéêíóôõúüçñ]{5,}/i.test(trimmed);
  if (hasLongWord) return false;
  return /\b([A-G][#b]?(m|maj|min|dim|aug|sus|add|M|°|º|ø)?(\d+)?)\b/.test(trimmed);
}

function extractChordsFromCifra(cifraText) {
  if (!cifraText) return [];
  const seen = new Set();
  const result = [];
  for (const line of cifraText.split("\n")) {
    if (!isChordLine(line)) continue;
    const matches = line.match(/\b([A-G][#b]?(m|maj|min|dim|aug|sus|add|M|°|º|ø)?(\d+)?)\b/g);
    if (matches) {
      for (const ch of matches) {
        const clean = ch.trim();
        if (clean && !seen.has(clean)) { seen.add(clean); result.push(clean); }
      }
    }
  }
  return result;
}

function buildChordSVG(chord, instrument) {
  if (!chord?.strings?.length) return "";
  const isViola = instrument === "viola";
  const n = isViola ? 5 : 6;
  const sp = 22, fh = 22, nf = 5, sx = 22, sy = 30, dr = isViola ? 7 : 6, pg = 2;
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
  for (let i = 0; i <= nf; i++) L.push(`<line x1="${sx}" y1="${sy+i*fh}" x2="${sx+(n-1)*sp}" y2="${sy+i*fh}" stroke="#8B6F47" stroke-width="${i===0&&dsf===0?4:2}"/>`);
  for (let i = 0; i < nf; i++) L.push(`<text x="${sx-12}" y="${sy+i*fh+fh/2+3}" text-anchor="middle" font-size="9" fill="#8B6F47" font-weight="bold">${dsf+i+1}</text>`);
  if (chord.barre_fret != null) {
    const bf = parseInt(chord.barre_fret), adj = bf - dsf;
    if (adj >= 1 && adj <= nf) {
      const y = sy + (adj - 0.5) * fh;
      L.push(`<rect x="${sx-5}" y="${y-6}" width="${(n-1)*sp+10}" height="12" rx="6" fill="#D4AF37" opacity="0.7" stroke="#8B6F47" stroke-width="1"/>`);
      L.push(`<text x="${sx+((n-1)*sp)/2}" y="${y+3}" text-anchor="middle" font-size="8" fill="#8B6F47" font-weight="bold">P${bf}</text>`);
    }
  }
  for (let i = 0; i < displayStrings.length; i++) {
    const val = gv(displayStrings[i]), x = sx + i * sp;
    if (val === 'x') {
      L.push(`<line x1="${x-4}" y1="${sy-16}" x2="${x+4}" y2="${sy-8}" stroke="#D32F2F" stroke-width="1.5" stroke-linecap="round"/>`);
      L.push(`<line x1="${x-4}" y1="${sy-8}" x2="${x+4}" y2="${sy-16}" stroke="#D32F2F" stroke-width="1.5" stroke-linecap="round"/>`);
    } else if (val === '0') {
      L.push(`<circle cx="${x}" cy="${sy-12}" r="5" fill="none" stroke="#2E7D32" stroke-width="1.5"/>`);
    }
  }
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
  const w = sx + (n - 1) * sp + 22, h = sy + nf * fh + 30;
  L.push(`<text x="${w/2}" y="16" text-anchor="middle" font-size="11" fill="#8B6F47" font-weight="bold">${chord.name}</text>`);
  L.push(`<text x="${w/2}" y="${h-6}" text-anchor="middle" font-size="7" fill="#A68A64">${isViola?"Viola":"Violão"}</text>`);
  return `<svg width="${w}" height="${h}" style="display:block;">${L.join("")}</svg>`;
}

function escapeHtml(text) {
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function SetlistApostila({ setlist, songs, onClose }) {
  const [instrument, setInstrument] = useState("violao");
  const [generating, setGenerating] = useState(false);
  const [solosData, setSolosData] = useState({}); // { songId: { status, tabText } }

  const setlistSongs = (setlist.songs || [])
    .map(id => songs.find(s => s.id === id))
    .filter(Boolean);

  const { data: allChords = [] } = useQuery({
    queryKey: ["chords"],
    queryFn: () => base44.entities.Chord.list(),
    initialData: [],
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    initialData: null,
  });

  // Extrai solos dos PDFs via IA ao montar
  useEffect(() => {
    const songsWithPdfSolo = setlistSongs.filter(s => {
      const url = s.solo_pdf_url || "";
      return url && !/\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    });

    songsWithPdfSolo.forEach(song => {
      setSolosData(prev => ({ ...prev, [song.id]: { status: "loading", tabText: null } }));
      base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em música. O arquivo PDF contém a tablatura/solo da música "${song.title}" de ${song.artist}. 
Extraia TODO o conteúdo de tablatura/tab ASCII presente no PDF, preservando o formato com as linhas de cordas (E, A, D, G, B, e), números de casa, barras de compasso (|), etc.
Retorne apenas o texto da tablatura, sem explicações.`,
        file_urls: [song.solo_pdf_url],
      })
        .then(res => {
          const text = typeof res === "string" ? res : res?.text || res?.content || "";
          setSolosData(prev => ({
            ...prev,
            [song.id]: { status: "done", tabText: text?.trim()?.length > 10 ? text.trim() : null }
          }));
        })
        .catch(() => {
          setSolosData(prev => ({ ...prev, [song.id]: { status: "error", tabText: null } }));
        });
    });
  }, []);

  const loadingCount = Object.values(solosData).filter(d => d.status === "loading").length;
  const isExtracting = loadingCount > 0;

  const favoriteChords = currentUser?.favorite_chords || [];

  const findChordDiagram = (chordName) => {
    const nameLower = chordName.toLowerCase();
    const fav = favoriteChords.find(f => f.chord_name === chordName && f.instrument === instrument)
      || favoriteChords.find(f => f.chord_name?.toLowerCase() === nameLower && f.instrument === instrument);
    if (fav) {
      const favChord = allChords.find(c => c.id === fav.chord_id);
      if (favChord) return favChord;
    }
    return allChords.find(c => c.name === chordName && c.instrument === instrument)
      || allChords.find(c => c.name?.toLowerCase() === nameLower && c.instrument === instrument)
      || null;
  };

  const instrLabel = instrument === "viola" ? "Viola Caipira" : "Violão";

  const handlePrint = () => {
    setGenerating(true);

    const songBlocks = setlistSongs.map((song, index) => {
      const soloUrl = song.solo_pdf_url || "";
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(soloUrl);
      const isPDF = soloUrl && !isImage;
      const soloInfo = solosData[song.id];

      let soloSection = "";
      if (soloUrl) {
        if (isImage) {
          soloSection = `<div class="section-title">🎸 Solo / Tablatura</div>
<div class="solo-embed"><img src="${soloUrl}" style="width:100%;border-radius:6px;" alt="Solo" /></div>`;
        } else if (isPDF && soloInfo?.tabText) {
          soloSection = `<div class="section-title">🎸 Solo / Tablatura</div>
<div class="tab-content">${escapeHtml(soloInfo.tabText)}</div>`;
        } else if (isPDF) {
          soloSection = `<div class="section-title">🎸 Solo / Tablatura</div>
<div class="tab-info"><p style="font-size:9pt;color:#666;">Tablatura não pôde ser extraída.<br/><a href="${soloUrl}" target="_blank" style="color:#8B6F47;font-weight:bold;">Abrir PDF do solo</a></p></div>`;
        }
      }

      // Acordes da música
      const chordsInSong = extractChordsFromCifra(song.cifra_text);
      const chordsWithDiagrams = chordsInSong
        .map(name => ({ name, chord: findChordDiagram(name) }))
        .filter(({ chord }) => chord !== null);
      const chordBlocks = chordsWithDiagrams.map(({ chord }) =>
        `<div class="chord-block">${buildChordSVG(chord, instrument)}</div>`
      ).join("");

      let cifra = song.cifra_text || "";
      cifra = cifra.replace(/\[Intro\]\s*\n(Tom:.*\n)?(BPM:.*\n)?(Ritmo:.*\n)?\s*\n?/gi, "");
      cifra = cifra.replace(/^Pattern:.*$/gim, "");
      cifra = cifra.replace(/^\s+/, "").replace(/\n{3,}/g, "\n\n");

      return `
<div class="song-section">
  <div class="song-header">
    <div class="song-num">${index + 1}</div>
    <div class="song-header-info">
      <div class="song-title">${escapeHtml(song.title)}</div>
      <div class="song-artist">${escapeHtml(song.artist)}</div>
      <div class="song-meta">
        ${song.main_key ? `<strong>Tom:</strong> ${song.main_key}` : ""}
        ${song.rhythm_name ? ` &nbsp;•&nbsp; <strong>Ritmo:</strong> ${song.rhythm_name}` : ""}
        ${song.tempo ? ` &nbsp;•&nbsp; <strong>BPM:</strong> ${song.tempo}` : ""}
        <span class="badge-instr">${instrLabel}</span>
      </div>
    </div>
  </div>

  ${soloSection}

  ${cifra ? `<div class="section-title">📄 Cifra</div><div class="cifra">${cifra}</div>` : ""}

  ${chordsWithDiagrams.length > 0 ? `
  <div class="section-title">🎸 Diagramas (${instrLabel})</div>
  <div class="chords-grid">${chordBlocks}</div>` : ""}

  ${song.progressions?.length > 0 ? `
  <div class="section-title">🎼 Progressões</div>
  <div class="prog-box">
    ${song.progressions.map(prog => `
    <div class="prog-item">
      <span class="prog-section">${prog.section || "Seção"}</span>
      ${prog.progression_name ? `<span class="prog-badge">${prog.progression_name}</span>` : ""}
      ${prog.pattern ? `<span class="prog-pattern">${prog.pattern}</span>` : ""}
      ${prog.chords?.length > 0 ? `<div class="prog-chords">${prog.chords.join(" → ")}</div>` : ""}
    </div>`).join("")}
  </div>` : ""}
</div>`;
    });

    // Índice
    const indexBlock = `
<div class="index-page">
  <div class="index-title">📋 Índice do Repertório</div>
  <div class="index-subtitle">${setlist.name}${setlist.event_date ? ` — ${new Date(setlist.event_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}</div>
  <table class="index-table">
    ${setlistSongs.map((song, i) => `
    <tr class="index-row">
      <td class="index-num">${i + 1}</td>
      <td class="index-song-title">${escapeHtml(song.title)}</td>
      <td class="index-artist">${escapeHtml(song.artist)}</td>
      <td class="index-key">${song.main_key || ""}</td>
      <td class="index-rhythm">${song.rhythm_name || ""}</td>
    </tr>`).join("")}
  </table>
</div>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Apostila – ${escapeHtml(setlist.name)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 16mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11pt; color:#1a1a1a; background:#fff; line-height:1.5; }

  /* CAPA */
  .cover { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:80mm; border-bottom:3px solid #8B6F47; margin-bottom:14px; padding-bottom:14px; }
  .cover-logo { width:90px; height:90px; object-fit:contain; margin-bottom:12px; }
  .cover-title { font-size:26pt; font-weight:900; color:#5a3e28; text-transform:uppercase; text-align:center; }
  .cover-sub { font-size:14pt; color:#8B6F47; margin-top:6px; text-align:center; }
  .cover-meta { font-size:11pt; color:#666; margin-top:8px; text-align:center; }
  .cover-badge { display:inline-block; background:#D4AF37; color:#fff; border-radius:4px; padding:2px 10px; font-size:10pt; font-weight:700; margin-top:8px; }

  /* ÍNDICE */
  .index-page { margin-bottom:20px; page-break-after:always; }
  .index-title { font-size:15pt; font-weight:900; color:#5a3e28; border-left:4px solid #D4AF37; padding-left:8px; margin-bottom:6px; text-transform:uppercase; }
  .index-subtitle { font-size:10pt; color:#8B6F47; margin-bottom:10px; }
  .index-table { width:100%; border-collapse:collapse; font-size:10pt; }
  .index-row { border-bottom:1px solid #e0cfb0; }
  .index-row:nth-child(even) { background:#fdf8f2; }
  .index-num { color:#8B6F47; font-weight:900; padding:5px 8px; min-width:24px; }
  .index-song-title { font-weight:700; color:#1a1a1a; padding:5px 8px; }
  .index-artist { color:#666; padding:5px 8px; }
  .index-key { color:#8B6F47; font-weight:700; padding:5px 8px; min-width:36px; }
  .index-rhythm { color:#D4AF37; font-weight:600; padding:5px 8px; }

  /* MÚSICA */
  .song-section { page-break-before:always; margin-bottom:20px; }
  .song-section:first-of-type { page-break-before:auto; }
  .song-header { display:flex; align-items:flex-start; gap:12px; border-bottom:3px solid #8B6F47; padding-bottom:10px; margin-bottom:12px; }
  .song-num { background:#8B6F47; color:#fff; font-size:16pt; font-weight:900; min-width:42px; height:42px; display:flex; align-items:center; justify-content:center; border-radius:8px; flex-shrink:0; }
  .song-title { font-size:18pt; font-weight:900; color:#5a3e28; text-transform:uppercase; letter-spacing:0.5px; }
  .song-artist { font-size:12pt; font-weight:700; color:#8B6F47; }
  .song-meta { font-size:10pt; color:#666; margin-top:4px; }
  .badge-instr { display:inline-block; background:#D4AF37; color:#fff; border-radius:4px; padding:1px 8px; font-size:9pt; font-weight:700; margin-left:6px; }

  .section-title { font-size:12pt; font-weight:900; color:#5a3e28; border-left:4px solid #D4AF37; padding-left:8px; margin:14px 0 6px; text-transform:uppercase; letter-spacing:0.5px; page-break-after:avoid; }

  .solo-embed { margin-bottom:10px; }
  .tab-content { font-family:'Courier New',Courier,monospace; font-size:9pt; line-height:1.7; white-space:pre-wrap; word-break:break-word; background:#1a1a2e; color:#e8d5b7; border-radius:6px; padding:12px 14px; margin-bottom:10px; }
  .tab-info { background:#fdf8f2; border:1px solid #e0cfb0; border-radius:6px; padding:8px 12px; margin-bottom:10px; }

  .cifra { font-family:'Courier New',Courier,monospace; font-size:10pt; line-height:1.55; font-weight:600; white-space:pre-wrap; word-break:break-word; background:#fdf8f2; border:1px solid #e0cfb0; border-radius:6px; padding:10px 14px; margin-bottom:10px; }

  .chords-grid { display:flex; flex-wrap:wrap; gap:10px; padding:8px; background:#fdf8f2; border:1px solid #e0cfb0; border-radius:6px; margin-bottom:10px; }
  .chord-block { display:flex; flex-direction:column; align-items:center; }

  .prog-box { background:#fdf8f2; border:1px solid #e0cfb0; border-radius:6px; padding:8px 12px; margin-bottom:10px; }
  .prog-item { display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #e0cfb0; }
  .prog-item:last-child { margin-bottom:0; border-bottom:none; padding-bottom:0; }
  .prog-section { font-weight:900; font-size:11pt; color:#5a3e28; }
  .prog-badge { background:#D4AF37; color:#fff; border-radius:4px; padding:1px 7px; font-size:8pt; font-weight:700; }
  .prog-pattern { font-size:9pt; color:#666; font-family:monospace; }
  .prog-chords { font-size:10pt; font-family:'Courier New',monospace; color:#1a1a1a; font-weight:600; width:100%; }

  .footer { margin-top:16px; padding-top:8px; border-top:1px solid #e0cfb0; font-size:8pt; color:#999; text-align:center; page-break-before:avoid; }

  @media print {
    body { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
    .tab-content { color:#e8d5b7 !important; background:#1a1a2e !important; }
  }
</style>
</head>
<body>

<div class="cover">
  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6900add80614fb22512134a9/522fde112_LOGO-PNG.png" class="cover-logo" alt="Logo"/>
  <div class="cover-title">📚 Apostila do Repertório</div>
  <div class="cover-sub">${escapeHtml(setlist.name)}</div>
  ${setlist.description ? `<div class="cover-meta">${escapeHtml(setlist.description)}</div>` : ""}
  ${setlist.event_date ? `<div class="cover-meta">📅 ${new Date(setlist.event_date + "T00:00:00").toLocaleDateString("pt-BR", {day:"numeric",month:"long",year:"numeric"})}</div>` : ""}
  ${setlist.location ? `<div class="cover-meta">📍 ${escapeHtml(setlist.location)}</div>` : ""}
  <div class="cover-meta">${setlistSongs.length} música${setlistSongs.length !== 1 ? "s" : ""}</div>
  <span class="cover-badge">${instrLabel}</span>
</div>

${indexBlock}

${songBlocks.join("")}

<div class="footer">Tropeiros do Bebedouro &nbsp;•&nbsp; Apostila gerada em ${new Date().toLocaleDateString("pt-BR")} &nbsp;•&nbsp; ${instrLabel}</div>

<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    const pw = window.open("", "_blank");
    pw.document.write(html);
    pw.document.close();
    setGenerating(false);
  };

  const totalChords = setlistSongs.reduce((acc, s) => acc + extractChordsFromCifra(s.cifra_text).length, 0);
  const totalWithDiagrams = setlistSongs.reduce((acc, s) => {
    const ch = extractChordsFromCifra(s.cifra_text);
    return acc + ch.filter(name => findChordDiagram(name) !== null).length;
  }, 0);

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-white" />
              <div>
                <h2 className="font-bold text-white text-lg">Apostila do Repertório</h2>
                <p className="text-white/80 text-sm">{setlist.name} — {setlistSongs.length} músicas</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Instrumento */}
          <div>
            <p className="text-sm font-semibold text-[#8B6F47] mb-3">Instrumento para os diagramas:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setInstrument("violao")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${instrument === "violao" ? "border-[#8B6F47] bg-[#8B6F47]/10 text-[#8B6F47]" : "border-[#D4C5B0] text-[#A68A64] hover:border-[#8B6F47]"}`}
              >
                <Guitar className="w-7 h-7" />
                <span className="font-bold text-sm">Violão</span>
                <span className="text-xs opacity-70">6 cordas</span>
              </button>
              <button
                onClick={() => setInstrument("viola")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${instrument === "viola" ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]" : "border-[#D4C5B0] text-[#A68A64] hover:border-[#D4AF37]"}`}
              >
                <Music className="w-7 h-7" />
                <span className="font-bold text-sm">Viola Caipira</span>
                <span className="text-xs opacity-70">10 cordas</span>
              </button>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-[#F5F1E8] rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-[#8B6F47]">A apostila vai incluir:</p>
            <ul className="text-sm space-y-1 text-[#8B6F47]">
              <li>✅ Capa com dados do repertório</li>
              <li>✅ Índice com todas as músicas</li>
              <li>✅ Para cada música: solo, cifra, diagramas e progressões</li>
              <li className={isExtracting ? "text-orange-600" : ""}>
                {isExtracting
                  ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Extraindo solos PDF via IA ({loadingCount} restante{loadingCount > 1 ? "s" : ""})...</span>
                  : `✅ Diagramas: ${totalWithDiagrams} de ${totalChords} acordes com diagrama`
                }
              </li>
            </ul>
            <div className="pt-2 space-y-1">
              {setlistSongs.map((song, i) => {
                const soloUrl = song.solo_pdf_url || "";
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(soloUrl);
                const isPDF = soloUrl && !isImage;
                const info = solosData[song.id];
                return (
                  <div key={song.id} className="flex items-center gap-2 text-xs text-[#8B6F47]">
                    <span className="font-bold min-w-[18px]">{i + 1}.</span>
                    <span className="flex-1 truncate">{song.title}</span>
                    {isImage && <Badge className="bg-blue-500 text-white text-[10px]">img</Badge>}
                    {isPDF && info?.status === "loading" && <Loader2 className="w-3 h-3 animate-spin text-orange-500" />}
                    {isPDF && info?.status === "done" && info.tabText && <Badge className="bg-green-600 text-white text-[10px]">tab ✓</Badge>}
                    {isPDF && (info?.status === "error" || (info?.status === "done" && !info?.tabText)) && <Badge className="bg-orange-400 text-white text-[10px]">link</Badge>}
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handlePrint}
            disabled={generating || isExtracting}
            className="w-full h-12 bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] text-white text-base font-bold rounded-xl shadow-lg hover:opacity-90"
          >
            {isExtracting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Aguardando extração de solos...</>
            ) : generating ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando...</>
            ) : (
              <><Printer className="w-5 h-5 mr-2" /> Gerar Apostila Completa</>
            )}
          </Button>

          <p className="text-xs text-center text-[#A68A64]">
            Uma nova aba será aberta com a apostila completa do repertório.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}