// Construtores de HTML/CSS para a capa e os divisores de ritmo da Apostila
// Estilo rústico "Tropeiros do Bebedouro" — pergaminho, borda de corda, tipografia western.

function escapeHtml(text) {
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6900add80614fb22512134a9/522fde112_LOGO-PNG.png";

const SEASON_YEAR = new Date().getFullYear();

// CSS compartilhado entre capa e divisores de ritmo
export function buildCoverCSS() {
  return `
  /* ── Fundo pergaminho + borda de corda (capa e divisores) ── */
  .rustic-page {
    page-break-after: always; break-after: page;
    min-height: 267mm;
    background:
      radial-gradient(ellipse at 25% 18%, rgba(255,240,200,0.45) 0%, transparent 55%),
      radial-gradient(ellipse at 75% 82%, rgba(120,80,40,0.18) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(230,211,173,0.3) 0%, transparent 70%),
      linear-gradient(135deg, #e6d3ad 0%, #d8c49c 35%, #cbb488 65%, #c4a97a 100%);
    padding: 14mm 12mm;
    position: relative;
    display: flex; flex-direction: column;
    align-items: center; text-align: center;
    color: #3e2617;
    font-family: 'Georgia','Times New Roman',serif;
  }
  /* Borda externa grossa + interna fina = efeito corda */
  .rustic-page::before {
    content: ""; position: absolute; top: 5mm; left: 5mm; right: 5mm; bottom: 5mm;
    border: 5px solid #5a3a1a; border-radius: 5px;
    box-shadow: inset 0 0 0 2px #c4a97a, inset 0 0 0 7px transparent, inset 0 0 0 8px #5a3a1a;
    pointer-events: none;
  }
  .rustic-page::after {
    content: ""; position: absolute; top: 9mm; left: 9mm; right: 9mm; bottom: 9mm;
    border: 1px solid rgba(90,58,26,0.35); border-radius: 3px;
    pointer-events: none;
  }

  /* ── Capa ── */
  .cover-top { z-index: 1; padding-top: 6mm; display: flex; flex-direction: column; align-items: center; }
  .cover-label { font-size: 13pt; font-weight: 700; letter-spacing: 5px; color: #5a3a1a; text-transform: uppercase; }
  .cover-title-big {
    font-size: 40pt; font-weight: 900; letter-spacing: 2px; color: #3e2617;
    text-transform: uppercase; line-height: 1; margin-top: 5mm;
    text-shadow: 1px 1px 0 rgba(196,169,122,0.5);
  }
  .cover-star-line { display: flex; align-items: center; gap: 14px; margin-top: 7mm; color: #5a3a1a; width: 100%; justify-content: center; }
  .cover-star-line::before, .cover-star-line::after { content: ""; flex: 0 1 60px; height: 1.5px; background: #5a3a1a; }
  .cover-star { font-size: 14pt; }
  .cover-subhead { font-size: 11pt; font-weight: 600; letter-spacing: 3px; color: #5a3a1a; text-transform: uppercase; margin-top: 6mm; font-family: 'Arial',sans-serif; }
  .cover-subhead2 { font-size: 17pt; font-weight: 800; letter-spacing: 1px; color: #3e2617; text-transform: uppercase; margin-top: 2mm; }
  .cover-logo-wrap { z-index: 1; margin: 8mm 0 4mm; }
  .cover-logo { width: 55mm; height: 55mm; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }
  .cover-tagline { font-size: 11pt; font-style: italic; color: #5a3a1a; max-width: 130mm; line-height: 1.5; margin-top: 3mm; z-index: 1; }
  .cover-season {
    z-index: 1; margin-top: 7mm;
    background: linear-gradient(180deg, #3e2617 0%, #2a1a0e 100%);
    color: #D4AF37; font-size: 12pt; font-weight: 800; letter-spacing: 3px;
    padding: 4mm 18mm; border-radius: 4px; text-transform: uppercase;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 0 0 1px #D4AF37;
    display: flex; align-items: center; gap: 12px;
  }
  .cover-season-star { color: #D4AF37; font-size: 10pt; }
  .cover-fields { z-index: 1; width: 125mm; margin-top: 8mm; padding: 5mm 6mm; border: 1.5px solid rgba(90,58,26,0.5); border-radius: 4px; background: rgba(230,211,173,0.35); }
  .cover-field { display: flex; align-items: center; gap: 8px; margin: 3mm 0; font-size: 11pt; color: #3e2617; font-weight: 600; }
  .cover-field-icon { font-size: 14pt; flex-shrink: 0; }
  .cover-field-label { flex-shrink: 0; }
  .cover-field-line { flex: 1; border-bottom: 1.5px solid #5a3a1a; height: 1px; }

  @media print {
    .rustic-page { min-height: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
  `;
}

// Gera o HTML da capa
export function buildCoverPage(sertanejoCount, popRockCount) {
  const total = sertanejoCount + popRockCount;
  return `
<div class="rustic-page apostila-cover" data-pagebreak="1">
  <div class="cover-top">
    <div class="cover-label">Caderno de</div>
    <div class="cover-title-big">Repertório</div>
    <div class="cover-star-line"><span class="cover-star">★</span></div>
    <div class="cover-subhead">Orquestra de Violeiros</div>
    <div class="cover-subhead2">Tropeiros do Bebedouro</div>
  </div>
  <div class="cover-logo-wrap">
    <img src="${LOGO_URL}" class="cover-logo" alt="Logo Tropeiros do Bebedouro" />
  </div>
  <div class="cover-tagline">Preservando a tradição da viola caipira e da cultura tropeira.</div>
  <div class="cover-season">
    <span class="cover-season-star">★</span>
    Temporada ${SEASON_YEAR}
    <span class="cover-season-star">★</span>
  </div>
  <div class="cover-fields">
    <div class="cover-field">
      <span class="cover-field-icon">🤠</span>
      <span class="cover-field-label">Nome do Integrante:</span>
      <span class="cover-field-line"></span>
    </div>
    <div class="cover-field">
      <span class="cover-field-icon">🎸</span>
      <span class="cover-field-label">Instrumento:</span>
      <span class="cover-field-line"></span>
    </div>
  </div>
</div>`;
}