/**
 * Gera o HTML completo para impressão de cifra
 */
export function buildPrintCifraHtml(song, transposedData, transpose) {
  let cifraParaImprimir = transposedData.cifra_text || '';
  cifraParaImprimir = cifraParaImprimir.replace(/\[Intro\]\s*\n(Tom:.*\n)?(BPM:.*\n)?(Ritmo:.*\n)?\s*\n?/gi, '');
  cifraParaImprimir = cifraParaImprimir.replace(/^Pattern:.*$/gmi, '');
  cifraParaImprimir = cifraParaImprimir.replace(/^\s+/, '');
  cifraParaImprimir = cifraParaImprimir.replace(/\n\n\n+/g, '\n\n');
  cifraParaImprimir = cifraParaImprimir.replace(
    /(\[Refr[ãa]o\][\s\S]*?)(?=\[|$)/gi,
    '<span class="refrao">$1</span>'
  );

  const infoLine = [
    transposedData.main_key ? `Tom: ${transposedData.main_key}${transpose !== 0 ? ` (${transpose > 0 ? '+' : ''}${transpose})` : ''}` : '',
    song.rhythm_name ? song.rhythm_name : '',
    song.tempo ? `${song.tempo} BPM` : ''
  ].filter(Boolean).join(' • ');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${song.title} - ${song.artist}</title>
    <style>
      @page { margin: 1.2cm 1.5cm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', Courier, monospace; color: #000; background: #fff; font-size: 18px; line-height: 1.6; }
      .header { margin-bottom: 10px; padding-bottom: 6px; border-bottom: 3px solid #000; display: flex; align-items: center; gap: 15px; }
      .logo { width: 80px; height: 80px; object-fit: contain; }
      .header-text { flex: 1; }
      .title-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
      .title { font-size: 24px; font-weight: 900; letter-spacing: 1px; }
      .artist { font-size: 16px; font-weight: 700; }
      .info { font-size: 14px; font-weight: 900; margin-top: 3px; }
      .cifra { white-space: pre-wrap; word-wrap: break-word; font-size: 18px; line-height: 1.6; font-weight: 900; }
      .cifra .refrao { font-size: 22px; font-weight: 900; background: rgba(212,175,55,0.1); padding: 8px 0; margin: 8px 0; }
      .footer { margin-top: 15px; padding-top: 6px; border-top: 1px solid #000; font-size: 10px; text-align: center; font-weight: 700; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6900add80614fb22512134a9/522fde112_LOGO-PNG.png" alt="Tropeiros do Bebedouro" class="logo" />
      <div class="header-text">
        <div class="title-row">
          <span class="title">${song.title}</span>
          <span class="artist">${song.artist}</span>
        </div>
        <div class="info">${infoLine}</div>
      </div>
    </div>
    <div class="cifra">${cifraParaImprimir}</div>
    <div class="footer"><p>Tropeiros do Bebedouro • ${new Date().toLocaleDateString('pt-BR')}</p></div>
    <script>window.onload = function() { window.print(); };</script>
  </body>
</html>`;
}

/**
 * Gera o HTML completo para envio de cifra por email
 */
export function buildShareEmailHtml(song, transposedData, transpose) {
  const infoLine = [
    transposedData.main_key ? `Tom: ${transposedData.main_key}${transpose !== 0 ? ` (transposto ${transpose > 0 ? '+' : ''}${transpose})` : ''}` : '',
    song.rhythm_name || '',
    song.tempo ? `${song.tempo} BPM` : ''
  ].filter(Boolean).join(' • ');

  const progressionsHtml = transposedData.progressions && transposedData.progressions.length > 0 ? `
  <div style="margin-top:20px;padding:15px;background:#f9f9f9;border-left:4px solid #8B6F47;">
    <h3 style="margin-top:0;color:#8B6F47;">PROGRESSÕES HARMÔNICAS:</h3>
    ${transposedData.progressions.map((prog, i) => `
    <div style="margin:10px 0;padding:10px;background:#fff;border-radius:4px;">
      <strong>${i + 1}. ${prog.section || 'Progressão'}${prog.progression_name ? ` (${prog.progression_name})` : ''}</strong><br>
      Acordes: ${Array.isArray(prog.chords) ? prog.chords.join(' - ') : prog.chords || 'N/A'}<br>
      Padrão: ${prog.pattern || 'N/A'} • Tom: ${prog.key || 'N/A'}
    </div>`).join('')}
  </div>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { font-family: 'Courier New', Courier, monospace; line-height: 1.6; color: #000; background: #fff; padding: 20px; max-width: 800px; margin: 0 auto; }
  .header { border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
  .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
  .artist { font-size: 18px; color: #555; margin-bottom: 10px; }
  .info { font-size: 14px; font-weight: bold; margin-bottom: 15px; }
  .cifra { font-family: 'Courier New'; white-space: pre; font-size: 16px; line-height: 1.6; background: #f5f5f5; padding: 20px; border-radius: 8px; }
  .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #ddd; text-align: center; font-size: 12px; color: #666; }
</style>
</head>
<body>
  <div class="header">
    <div class="title">${song.title.toUpperCase()}</div>
    <div class="artist">${song.artist}</div>
    <div class="info">${infoLine}</div>
  </div>
  <div class="cifra">${transposedData.cifra_text || 'Cifra não disponível'}</div>
  ${progressionsHtml}
  <div class="footer">
    <p><strong>Compartilhado via Tropeiros do Bebedouro</strong></p>
    <p>${new Date().toLocaleDateString('pt-BR')}</p>
    <p style="margin-top:10px;color:#8B6F47;">💡 Acordes com fonte monoespaçada (Courier New) para leitura precisa</p>
  </div>
</body>
</html>`;
}