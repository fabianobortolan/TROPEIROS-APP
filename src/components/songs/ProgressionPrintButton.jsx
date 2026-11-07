import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { getHarmonicField } from "@/utils/progressionUtils";

// Extrai o "acorde base" para comparação: B7 → B, Bm7 → Bm, F#dim/F#° → F#
const chordBase = (c) => {
  const m = (c || "").trim().match(/^([A-G][#b]?)m?/);
  return m ? m[1] : (c || "").trim();
};

function fieldHtml(keyName, chords) {
  const field = getHarmonicField(keyName);
  if (!field) return '';
  const usedBases = new Set((chords || []).map(chordBase));
  return `
    <div class="field-row">
      <span class="field-label">CAMPO HARMÔNICO DE ${keyName}:</span>
      ${field.map(({ degree, chord }) => `
        <span class="field-chip ${usedBases.has(chordBase(chord)) ? 'used' : ''}">${chord}<i>${degree}</i></span>
      `).join('')}
    </div>`;
}

function buildPrintHtml(song, progressions) {
  const infoLine = [
    song?.rhythm_name || '',
    song?.tempo ? `${song.tempo} BPM` : '',
    song?.main_key ? `Tom: ${song.main_key}` : ''
  ].filter(Boolean).join(' • ');

  const cardsHtml = progressions.map((prog) => {
    const chords = Array.isArray(prog.chords) ? prog.chords : [];
    return `
      <div class="card">
        <div class="card-header">
          <span class="section-title">♪ ${(prog.section || 'Seção').toUpperCase()}</span>
          <span class="divider"></span>
          <span class="prog-name">${prog.progression_name ? prog.progression_name.toUpperCase() : '<i>Não identificada</i>'}${prog.variation_name ? ` <span class="variation">(${prog.variation_name})</span>` : ''}</span>
          <span class="meta-item">${prog.pattern ? `Padrão: <b>${prog.pattern}</b>` : ''}</span>
          <span class="meta-item">${prog.key ? `Tom: <b>${prog.key}</b>` : ''}</span>
          <span class="meta-item mod">${prog.modulated_key ? `Mod: <b>${prog.modulated_key}</b>` : ''}</span>
        </div>
        ${chords.length > 0 ? `
        <div class="chords-row">
          <span class="chords-label">ACORDES:</span>
          ${chords.map(c => `<span class="chord-pill">${c}</span>`).join(' ')}
        </div>` : ''}
        ${prog.key ? fieldHtml(prog.key, chords) : ''}
        ${prog.modulated_key && prog.modulated_key !== prog.key ? fieldHtml(prog.modulated_key, chords).replace('CAMPO HARMÔNICO DE', 'CAMPO HARMÔNICO DE (MODULAÇÃO)') : ''}
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Progressões por Seção - ${song?.title || 'Música'}</title>
    <style>
      @page { margin: 1.2cm 1.5cm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #000; background: #fff; font-size: 13px; line-height: 1.5; }
      .header { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 3px solid #000; display: flex; align-items: center; gap: 15px; }
      .logo { width: 70px; height: 70px; object-fit: contain; }
      .header-text { flex: 1; }
      .title { font-size: 22px; font-weight: 900; letter-spacing: 1px; }
      .artist { font-size: 15px; font-weight: 700; color: #444; }
      .info { font-size: 13px; font-weight: 700; margin-top: 3px; color: #8B6F47; }
      .card { background: #FDFBF2; border: 1px solid #D4C5B0; border-radius: 10px; margin-bottom: 10px; overflow: hidden; page-break-inside: avoid; }
      .card-header { display: flex; align-items: center; gap: 10px; padding: 8px 14px; flex-wrap: wrap; }
      .section-title { font-weight: 800; color: #7A694F; font-size: 14px; letter-spacing: 0.5px; }
      .divider { width: 1px; height: 18px; background: #C9BBA5; display: inline-block; }
      .prog-name { font-weight: 700; color: #6B5437; font-size: 13px; flex: 1; }
      .variation { font-weight: 400; font-size: 11px; color: #A68A64; }
      .meta-item { font-size: 11px; color: #A68A64; background: #F5F1E8; border: 1px solid #D4C5B0; border-radius: 6px; padding: 2px 8px; }
      .meta-item.mod { background: #FFF4EC; border-color: #F0C9A0; color: #C07830; }
      .chords-row { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; padding: 7px 14px; border-top: 1px solid #E5DCC9; }
      .chords-label { font-size: 9px; font-weight: 700; color: #A39682; letter-spacing: 0.5px; }
      .chord-pill { background: #8B6F47; color: #fff; border-radius: 5px; padding: 2px 9px; font-size: 12px; font-weight: 700; }
      .field-row { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; padding: 7px 14px; border-top: 1px solid #E5DCC9; background: #FAF7F0; }
      .field-label { font-size: 9px; font-weight: 700; color: #A39682; letter-spacing: 0.5px; margin-right: 4px; }
      .field-chip { border: 1px solid #D4C5B0; background: #fff; color: #8B6F47; border-radius: 5px; padding: 1px 7px; font-size: 10px; font-weight: 700; }
      .field-chip i { font-style: normal; font-weight: 600; color: #A68A64; margin-left: 3px; font-size: 9px; }
      .field-chip.used { background: #8B6F47; color: #fff; border-color: #8B6F47; }
      .field-chip.used i { color: #E8DCC4; }
      .footer { margin-top: 15px; padding-top: 8px; border-top: 1px solid #000; font-size: 10px; text-align: center; font-weight: 700; color: #666; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="/img/522fde112_LOGO-PNG.png" alt="Tropeiros do Bebedouro" class="logo" />
      <div class="header-text">
        <span class="title">${(song?.title || 'Análise Harmônica').toUpperCase()}</span>
        <span class="artist"> — ${song?.artist || ''}</span>
        <div class="info">PROGRESSÕES HARMÔNICAS POR SEÇÃO${infoLine ? ` • ${infoLine}` : ''}</div>
      </div>
    </div>
    ${cardsHtml}
    <div class="footer">Tropeiros do Bebedouro • ${new Date().toLocaleDateString('pt-BR')}</div>
    <script>window.onload = function() { window.print(); };</script>
  </body>
</html>`;
}

/**
 * Botão que imprime a análise de progressões por seção em PDF,
 * com o mesmo layout dos cards exibidos na tela.
 */
export default function ProgressionPrintButton({ progressions, song }) {
  const handlePrint = () => {
    if (!progressions || progressions.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(buildPrintHtml(song, progressions));
    printWindow.document.close();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
    >
      <Printer className="w-4 h-4 mr-2" />
      Imprimir Análise
    </Button>
  );
}