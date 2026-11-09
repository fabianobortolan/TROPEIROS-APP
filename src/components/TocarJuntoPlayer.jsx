import React, { useEffect, useRef } from "react";

/* Player "Tocar junto" — cópia fiel do protótipo do Claude.
   mountTocarJunto(container, solo_tab) monta tudo dentro do container e devolve uma função de limpeza. */
function mountTocarJunto(root, SONG) {
  const CSS = `
.tj{--bg:#F7F5F1;--surface:#FFFFFF;--ink:#211B14;--muted:#6E6457;--line:#D9D2C6;--staff:#9C9183;--accent:#9A6410;--accent-ink:#FFFFFF;--accent-weak:rgba(154,100,16,.12);--play:#B23A1E;
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;line-height:1.4;color:var(--ink);display:flex;flex-direction:column;gap:8px}
.tj *{box-sizing:border-box}
.tj .chips{display:flex;flex-wrap:wrap;gap:6px}
.tj .chip{border:1px solid var(--line);border-radius:999px;padding:2px 10px;font-size:12px;color:var(--muted)}
.tj .chip b{color:var(--ink)}
.tj .tabs{display:flex;gap:4px;border-bottom:1px solid var(--line)}
.tj .tabs button{appearance:none;background:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:6px 14px;font:inherit;font-weight:700;color:var(--muted);cursor:pointer}
.tj .tabs button[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--accent)}
.tj .panel{display:flex;flex-direction:column;gap:8px}
.tj [hidden]{display:none!important}
.tj .transport{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center}
.tj .playbtn{width:44px;height:44px;border-radius:50%;border:0;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;cursor:pointer}
.tj .playbtn svg{width:18px;height:18px;fill:currentColor}
.tj .pos{display:flex;flex-direction:column;gap:4px;min-width:0}
.tj .posline{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.tj .posline b{color:var(--ink)}
.tj input[type=range]{width:100%;accent-color:var(--accent);margin:0}
.tj .viewport{position:relative;height:152px;overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--surface);touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none}
.tj .viewport.dragging{cursor:grabbing}
.tj .viewport svg.tj-main{position:absolute;top:2px;left:0;will-change:transform;transition:none}
.tj .viewport::before,.tj .viewport::after{content:"";position:absolute;top:0;bottom:0;width:36px;z-index:2;pointer-events:none}
.tj .viewport::before{left:0;background:linear-gradient(90deg,var(--surface),transparent)}
.tj .viewport::after{right:0;background:linear-gradient(270deg,var(--surface),transparent)}
.tj .playhead{position:absolute;top:0;bottom:0;left:28%;width:2px;background:var(--play);z-index:3;pointer-events:none}
.tj .playhead::before{content:"";position:absolute;top:0;left:-5px;border:6px solid transparent;border-top-color:var(--play)}
.tj .hint{font-size:11px;color:var(--muted);margin:0;text-align:center}
.tj .toggles{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.tj .tog{appearance:none;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:7px 6px;font:inherit;font-weight:700;font-size:13px;cursor:pointer}
.tj .tog[aria-pressed="true"]{background:var(--accent-weak);border-color:var(--accent);color:var(--accent)}
.tj .box{border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:8px 12px;display:flex;flex-direction:column;gap:6px}
.tj .boxhead{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700}
.tj .boxhead .val{font-size:13px;letter-spacing:0;text-transform:none;color:var(--ink)}
.tj .speedrow{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}
.tj .stepper{width:30px;height:30px;border-radius:50%;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit;font-size:18px;line-height:1;cursor:pointer}
.tj .looprow{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.tj .looprow select{font:inherit;padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink)}
.tj .sheet{display:flex;flex-direction:column;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:10px 8px}
.tj .sheet svg{width:100%;height:auto;display:block;cursor:pointer}
.tj .sheet-tools{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--muted)}
.tj .staff{stroke:var(--staff);stroke-width:1}
.tj .bar{stroke:var(--ink);stroke-width:1.4}
.tj .bar.end{stroke-width:4}
.tj .tablabel{font-weight:700;font-size:15px;fill:var(--ink)}
.tj .tsig{font-weight:700;font-size:22px;fill:var(--ink);font-family:Georgia,serif}
.tj .mnum{font-size:11px;fill:var(--muted)}
.tj .chord{font-weight:700;font-size:20px;fill:var(--ink);font-family:Georgia,serif}
.tj .n rect{fill:var(--surface)}
.tj .n text{font-weight:700;font-size:15px;fill:var(--ink)}
.tj .n.grace text{font-size:11px;fill:var(--muted)}
.tj .n.on rect{fill:var(--accent)}
.tj .n.on text{fill:var(--accent-ink)}
.tj .stem,.tj .flag,.tj .rest,.tj .slide{stroke:var(--ink);stroke-width:1.4;fill:none}
.tj .slide{stroke:var(--muted)}
.tj .beam,.tj .dot{fill:var(--ink)}
.tj .loopband{fill:var(--accent-weak)}
@media (max-width:520px){.tj .tog{font-size:13px}}`;

  root.innerHTML = `<style>${CSS}</style>
<div class="tj">
  <div class="chips" data-r="chips"></div>
  <div class="tabs" role="tablist">
    <button data-r="tab-play" role="tab" aria-selected="true">Tocar junto</button>
    <button data-r="tab-sheet" role="tab" aria-selected="false">Tablatura</button>
  </div>
  <section class="panel" data-r="p-play">
    <div class="transport">
      <button class="playbtn" data-r="play" aria-label="Tocar">
        <svg data-r="ico-play" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>
        <svg data-r="ico-pause" viewBox="0 0 24 24" hidden><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>
      </button>
      <div class="pos">
        <div class="posline"><span>Compasso <b data-r="mnow">1</b> de <span data-r="mtotal">1</span></span><span data-r="beatnow">tempo 1</span></div>
        <input type="range" data-r="seek" min="0" max="1" step="0.25" value="0" aria-label="Posição na música">
      </div>
    </div>
    <div class="viewport" data-r="viewport"><div class="playhead"></div></div>
    <p class="hint">Arraste a tablatura para voltar ou avançar. Espaço toca e pausa.</p>
    <div class="toggles">
      <button class="tog" data-r="t-metro" aria-pressed="false">Metrônomo</button>
      <button class="tog" data-r="t-loop" aria-pressed="false">Repetir</button>
      <button class="tog" data-r="t-count" aria-pressed="true">Contagem</button>
    </div>
    <div class="box" data-r="loopbox" hidden>
      <div class="boxhead"><span>Repetir trecho</span><span class="val" data-r="loopval"></span></div>
      <div class="looprow">Do compasso <select data-r="loopA"></select> ao <select data-r="loopB"></select></div>
    </div>
    <div class="box">
      <div class="boxhead"><span>Velocidade</span><span class="val" data-r="speedval">100%</span></div>
      <div class="speedrow">
        <button class="stepper" data-r="slower" aria-label="Mais devagar">−</button>
        <input type="range" data-r="speed" min="50" max="100" step="5" value="100" aria-label="Velocidade">
        <button class="stepper" data-r="faster" aria-label="Mais rápido">+</button>
      </div>
    </div>
  </section>
  <section class="panel" data-r="p-sheet" hidden>
    <div class="sheet-tools"><span>Toque num compasso para tocar a partir dele.</span><span data-r="sheetpos">Compasso 1</span></div>
    <div class="sheet" data-r="sheet"></div>
  </section>
</div>`;

  const $ = r => root.querySelector(`[data-r="${r}"]`);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const TICK = 0.25;
  // nº de cordas = maior par/corda da afinação (viola 5, violão 6)
  const NSTR = Math.max(5, ...Object.keys(SONG.tuning || {}).map(Number).filter(n => n > 0));
  const INSTR = SONG.instrument === 'violao' || SONG.instrument === 'viola' ? SONG.instrument : (NSTR >= 6 ? 'violao' : 'viola');
  const X0 = 64, PAD = 16, STAFF_TOP = 64, STAFF_BOT = STAFF_TOP + (NSTR - 1) * 20, H = STAFF_BOT + 62;
  const LINE_Y = s => 64 + (s - 1) * 20;
  const BPB = SONG.beatsPerBar, NB = SONG.measures.length, TOTAL = NB * BPB;

  const NOTES = [];
  SONG.measures.forEach((m, mi) => (m.notes || []).forEach(r => {
    const ex = r[4] || {};
    NOTES.push({ b: mi * BPB + r[0], d: r[1], s: r[2], f: r[3], grace: !!ex.grace, slide: (ex.tech || []).includes('Slide') });
  }));
  NOTES.sort((a, b) => a.b - b.b || (a.grace === b.grace ? 0 : (a.grace ? -1 : 1)) || a.s - b.s);
  NOTES.forEach((n, i) => n.i = i);
  const BY_TICK = new Map();
  NOTES.forEach(n => { const k = Math.round(n.b / TICK); if (!BY_TICK.has(k)) BY_TICK.set(k, []); BY_TICK.get(k).push(n); });
  const fine = NOTES.some(n => !n.grace && (Math.abs(n.b * 2 - Math.round(n.b * 2)) > 1e-6 || n.d < 0.5));
  const PB = fine ? 104 : 76;
  const xOf = b => X0 + PAD + b * PB;
  const barX = m => X0 + m * BPB * PB;
  const W = barX(NB) + 40;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function buildSVG() {
    const p = [];
    p.push(`<rect class="loopband" data-loopband="1" x="0" y="20" width="0" height="${H - 24}" style="display:none"/>`);
    for (let s = 1; s <= NSTR; s++) { const y = LINE_Y(s); p.push(`<line class="staff" x1="${X0 - 50}" y1="${y}" x2="${barX(NB)}" y2="${y}"/>`); }
    p.push(`<text class="tablabel" x="${X0 - 50}" y="${LINE_Y(1) + 14}">T</text><text class="tablabel" x="${X0 - 50}" y="${(STAFF_TOP + STAFF_BOT) / 2 + 5}">A</text><text class="tablabel" x="${X0 - 50}" y="${STAFF_BOT - 4}">B</text>`);
    const [tn, td] = SONG.time.split('/');
    p.push(`<text class="tsig" x="${X0 - 28}" y="${(STAFF_TOP * 3 + STAFF_BOT) / 4 + 8}">${tn}</text><text class="tsig" x="${X0 - 28}" y="${(STAFF_TOP + STAFF_BOT * 3) / 4 + 8}">${td}</text>`);
    for (let m = 0; m <= NB; m++) {
      const x = barX(m);
      p.push(`<line class="bar${m === NB ? ' end' : ''}" x1="${x}" y1="${STAFF_TOP}" x2="${x}" y2="${STAFF_BOT}"/>`);
      if (m < NB) p.push(`<text class="mnum" x="${x + 4}" y="${STAFF_TOP - 8}">${m + 1}</text>`);
    }
    SONG.measures.forEach((m, mi) => (m.chords || []).forEach(([o, name]) => p.push(`<text class="chord" x="${xOf(mi * BPB + o)}" y="34" text-anchor="middle">${esc(name)}</text>`)));
    const SY = STAFF_BOT + 10, EY = STAFF_BOT + 46, SHORT = STAFF_BOT + 30;
    const onsets = [], seen = new Map();
    NOTES.forEach(n => { if (n.grace) return; const k = Math.round(n.b / TICK);
      if (!seen.has(k)) { seen.set(k, { b: n.b, d: n.d }); onsets.push(seen.get(k)); } else seen.get(k).d = Math.max(seen.get(k).d, n.d); });
    onsets.sort((a, b) => a.b - b.b);
    const covered = new Array(Math.ceil(TOTAL)).fill(false);
    onsets.forEach(o => { for (let t = Math.floor(o.b); t < o.b + o.d - 1e-6 && t < covered.length; t++) covered[t] = true; });
    covered.forEach((c, t) => { if (!c) { const x = xOf(t); p.push(`<path class="rest" d="M${x - 3} ${STAFF_TOP + 22} L${x + 4} ${STAFF_TOP + 31} L${x - 2} ${STAFF_TOP + 39} L${x + 5} ${STAFF_TOP + 48} Q${x - 6} ${STAFF_TOP + 44} ${x} ${STAFF_TOP + 56}"/>`); } });
    const groups = new Map();
    onsets.forEach(o => { const x = xOf(o.b);
      if (o.d >= 2) p.push(`<line class="stem" x1="${x}" y1="${SHORT}" x2="${x}" y2="${EY}"/>`);
      else p.push(`<line class="stem" x1="${x}" y1="${SY}" x2="${x}" y2="${EY}"/>`);
      const dots = [0.75, 1.5, 3].some(v => Math.abs(o.d - v) < 1e-6) ? 1 : [1.75, 3.5].some(v => Math.abs(o.d - v) < 1e-6) ? 2 : 0;
      for (let k = 0; k < dots; k++) p.push(`<circle class="dot" cx="${x + 7 + k * 6}" cy="${EY - 6}" r="2.2"/>`);
      if (o.d < 1) { const g = Math.floor(o.b + 1e-6); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(o); }
    });
    groups.forEach(list => {
      if (list.length === 1) { const o = list[0], x = xOf(o.b); const flags = o.d <= 0.25 + 1e-6 ? 2 : 1;
        for (let k = 0; k < flags; k++) p.push(`<path class="flag" d="M${x} ${EY - k * 7} Q${x + 3} ${EY - 6 - k * 7} ${x + 10} ${EY - 16 - k * 7}"/>`); return; }
      const x1 = xOf(list[0].b), x2 = xOf(list[list.length - 1].b);
      p.push(`<rect class="beam" x="${x1}" y="${EY - 4}" width="${x2 - x1}" height="4"/>`);
      list.forEach((o, k) => { if (o.d > 0.25 + 1e-6) return; const x = xOf(o.b);
        const nx = list[k + 1] && list[k + 1].d <= 0.25 + 1e-6 ? xOf(list[k + 1].b) : null;
        if (nx !== null) p.push(`<rect class="beam" x="${x}" y="${EY - 11}" width="${nx - x}" height="4"/>`);
        else if (!(list[k - 1] && list[k - 1].d <= 0.25 + 1e-6)) { const dir = k === list.length - 1 ? -1 : 1; p.push(`<rect class="beam" x="${dir > 0 ? x : x - 9}" y="${EY - 11}" width="9" height="4"/>`); }
      });
    });
    NOTES.forEach(n => {
      const y = LINE_Y(n.s);
      if (n.grace) { const x = xOf(n.b) - PB * 0.16;
        p.push(`<g class="n grace" data-i="${n.i}"><rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="3"/><text x="${x}" y="${y + 4}" text-anchor="middle">${n.f}</text></g>`); return; }
      const x = xOf(n.b), w = n.f > 9 ? 22 : 14;
      p.push(`<g class="n" data-i="${n.i}"><rect x="${x - w / 2}" y="${y - 9}" width="${w}" height="18" rx="4"/><text x="${x}" y="${y + 5}" text-anchor="middle">${n.f}</text></g>`);
      if (n.slide) p.push(`<line class="slide" x1="${x + w / 2 + 2}" y1="${y + 5}" x2="${x + w / 2 + 12}" y2="${y - 5}"/>`);
    });
    return p.join('');
  }
  const INNER = buildSVG();
  const viewport = $('viewport');
  viewport.style.height = `${STAFF_BOT + 8}px`;
  const svgMain = document.createElementNS(SVGNS, 'svg');
  svgMain.setAttribute('class', 'tj-main');
  svgMain.setAttribute('width', W); svgMain.setAttribute('height', H); svgMain.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgMain.innerHTML = INNER; viewport.appendChild(svgMain);

  const t = SONG.tuning, tk = Array.from({ length: NSTR }, (_, k) => t[String(NSTR - k)]).join(',');
  const tuningName = ({
    '47,52,56,59,64': 'Cebolão Mi', '45,50,54,57,62': 'Cebolão Ré', '46,51,55,58,63': 'Cebolão Ré#', '43,50,55,59,62': 'Rio Abaixo',
    '40,45,50,55,59,64': 'afinação padrão', '38,45,50,55,59,64': 'Drop D (Ré)', '39,44,49,54,58,63': 'meio tom abaixo', '38,43,48,53,57,62': 'um tom abaixo',
  })[tk] || 'afinação própria';
  const instrLabel = INSTR === 'violao' ? 'Violão' : 'Viola';
  $('chips').innerHTML = [`${instrLabel} em <b>${tuningName}</b>`, `Compasso <b>${SONG.time}</b>`, `<b>${SONG.bpm}</b> BPM`, `<b>${NB}</b> compassos`].map(s => `<span class="chip">${s}</span>`).join('');
  $('mtotal').textContent = NB;
  $('seek').max = TOTAL;

  /* ---------- tablatura completa ---------- */
  const sheet = $('sheet');
  function buildSheet() {
    const per = sheet.clientWidth < 560 ? 2 : 4;
    sheet.innerHTML = '';
    for (let m0 = 0; m0 < NB; m0 += per) {
      const m1 = Math.min(NB, m0 + per);
      const x0 = m0 === 0 ? 0 : barX(m0) - 8;
      const fullW = per * BPB * PB + X0 + 16;
      const s = document.createElementNS(SVGNS, 'svg');
      s.setAttribute('viewBox', `${x0} 0 ${fullW} ${H}`); s.setAttribute('preserveAspectRatio', 'xMinYMin meet');
      s.innerHTML = INNER;
      s.addEventListener('click', e => {
        const r = s.getBoundingClientRect(); const ux = x0 + (e.clientX - r.left) / r.width * fullW;
        let m = Math.floor((ux - X0) / (BPB * PB)); m = Math.max(m0, Math.min(m1 - 1, m));
        seek(m * BPB); showTab('play'); if (!playing) play();
      });
      sheet.appendChild(s);
    }
    lastOn = new Set(); updateLoopBand();
  }

  /* ---------- som ---------- */
  let ctx = null, master = null, clickGain = null; const bufCache = new Map();
  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp).connect(ctx.destination);
    clickGain = ctx.createGain(); clickGain.gain.value = 0.5; clickGain.connect(ctx.destination);
  }
  /* Destravamento do áudio no celular: o navegador só libera o som depois de um toque
     do usuário e de um buffer "mudo" tocado na sessão. Sem isso o context fica suspenso/mudo. */
  let unlocked = false;
  function warmup() {
    if (unlocked) return;
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    unlocked = true;
  }
  // iPhone: com a chave lateral no silencioso o Web Audio fica mudo. Tocar um <audio> silencioso
  // em loop no mesmo toque muda a sessão de áudio para "reprodução" e o som sai mesmo no silencioso.
  let keepAlive = null;
  function silentWavUrl() {
    const sr = 8000, n = sr / 2, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  function startKeepAlive() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      if (!keepAlive) {
        keepAlive = document.createElement('audio');
        keepAlive.src = silentWavUrl(); keepAlive.loop = true; keepAlive.preload = 'auto';
        keepAlive.setAttribute('playsinline', ''); keepAlive.setAttribute('webkit-playsinline', '');
      }
      if (keepAlive.paused) { const p = keepAlive.play(); if (p && p.catch) p.catch(() => {}); }
    } catch (e) {}
  }
  function stopKeepAlive() {
    try { if (keepAlive && !keepAlive.paused) keepAlive.pause(); } catch (e) {}
  }
  function unlock() {
    startKeepAlive();
    ensureCtx();
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    warmup();
  }
  function pluckBuffer(midi) {
    if (bufCache.has(midi)) return bufCache.get(midi);
    const f = 440 * Math.pow(2, (midi - 69) / 12), sr = ctx.sampleRate, len = Math.floor(sr * 2.6);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / f)), ring = new Float32Array(N);
    let prev = 0; for (let i = 0; i < N; i++) { const r = Math.random() * 2 - 1; prev = prev * 0.35 + r * 0.65; ring[i] = prev; }
    const decay = f > 600 ? 0.9965 : 0.998; let idx = 0;
    for (let i = 0; i < len; i++) { const a = ring[idx], b = ring[(idx + 1) % N]; d[i] = a; ring[idx] = decay * 0.5 * (a + b); idx = (idx + 1) % N; }
    let peak = 0; for (let i = 0; i < Math.min(len, 4000); i++) peak = Math.max(peak, Math.abs(d[i]));
    const k = peak ? 0.9 / peak : 1, fade = Math.floor(sr * 0.25);
    for (let i = 0; i < len; i++) { d[i] *= k; if (i > len - fade) d[i] *= (len - i) / fade; }
    bufCache.set(midi, buf); return buf;
  }
  let voices = []; const lastOnString = {};
  function playNote(n, at) {
    const base = SONG.tuning[String(n.s)] + n.f;
    const vol = n.grace ? 0.7 : 1;
    const layers = [[base, 1, 0.30 * vol], [base, 1.0025, 0.19 * vol]];
    if (INSTR === 'viola' && (SONG.octavePairs || []).includes(n.s)) layers.push([base + 12, 1, 0.14 * vol]);
    if (lastOnString[n.s]) lastOnString[n.s].forEach(v => { try { v.g.gain.setTargetAtTime(0, at, 0.02); v.src.stop(at + 0.25); } catch (e) {} });
    const group = [];
    layers.forEach(([m, rate, v]) => {
      const src = ctx.createBufferSource(); src.buffer = pluckBuffer(m); src.playbackRate.value = rate;
      const g = ctx.createGain(); g.gain.value = v; src.connect(g).connect(master); src.start(at);
      const o = { src, g }; group.push(o); voices.push(o); src.onended = () => { voices = voices.filter(x => x !== o); };
    });
    lastOnString[n.s] = group;
  }
  function click(at, accent) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = accent ? 1760 : 1180;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.6, at + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    o.connect(g).connect(clickGain); o.start(at); o.stop(at + 0.08);
  }
  function silence() {
    if (!ctx) return; const now = ctx.currentTime;
    voices.forEach(v => { try { v.g.gain.cancelScheduledValues(now); v.g.gain.setTargetAtTime(0, now, 0.02); v.src.stop(now + 0.15); } catch (e) {} });
    voices = []; for (const k in lastOnString) delete lastOnString[k];
  }

  /* ---------- transporte ---------- */
  let playing = false, pos = 0, speed = 1, metro = false, countIn = true;
  const loop = { on: false, a: 1, b: Math.min(4, NB) };
  let nextTick = 0, nextTime = 0, timeline = [], timer = null, ended = false;
  const spb = () => 60 / (SONG.bpm * speed);
  const loopStart = () => (loop.a - 1) * BPB, loopEnd = () => loop.b * BPB;

  async function play(skipCount) {
    unlock();
    for (let i = 0; i < 3 && ctx.state !== 'running'; i++) {
      try { await ctx.resume(); } catch (e) {}
      if (ctx.state !== 'running') await new Promise(r => setTimeout(r, 80));
    }
    if (ctx.state !== 'running') { $('beatnow').textContent = 'toque de novo'; return; }
    warmup();
    if (pos >= TOTAL - 0.01) pos = 0;
    if (loop.on && (pos < loopStart() || pos >= loopEnd())) pos = loopStart();
    let t0 = ctx.currentTime + 0.1;
    if (countIn && !skipCount) { for (let k = 0; k < BPB; k++) click(t0 + k * spb(), k === 0); t0 += BPB * spb(); }
    nextTick = Math.ceil(pos / TICK - 1e-6) * TICK; nextTime = t0 + (nextTick - pos) * spb();
    timeline = [{ time: t0, tick: pos }]; ended = false; playing = true;
    schedule(); timer = setInterval(schedule, 25); setPlayUI();
  }
  function stopTransport() { playing = false; clearInterval(timer); timer = null; silence(); }
  function pause() { if (!playing) return; pos = currentPos(); stopTransport(); stopKeepAlive(); setPlayUI(); }
  function schedule() {
    const ahead = ctx.currentTime + 0.15;
    while (!ended && nextTime < ahead) {
      const end = loop.on ? loopEnd() : TOTAL;
      if (nextTick >= end - 1e-9) {
        if (loop.on) { nextTick = loopStart(); timeline.push({ time: nextTime, tick: nextTick }); }
        else { timeline.push({ time: nextTime, tick: TOTAL, end: true }); ended = true; break; }
      }
      const ns = BY_TICK.get(Math.round(nextTick / TICK));
      if (ns) ns.forEach(n => playNote(n, n.grace ? Math.max(ctx.currentTime, nextTime - 0.06) : nextTime));
      if (metro && Math.abs(nextTick - Math.round(nextTick)) < 1e-6) click(nextTime, Math.round(nextTick) % BPB === 0);
      nextTime += TICK * spb(); nextTick += TICK;
    }
    const now = ctx.currentTime; while (timeline.length > 2 && timeline[1].time < now - 1) timeline.shift();
  }
  // relógio contínuo: hora do áudio que está sendo ouvido, suavizada pelo relógio de tela
  function audioNow() {
    if (ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp();
      if (ts && ts.contextTime > 0 && ts.performanceTime > 0) return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
    return ctx.currentTime;
  }
  // posição a partir de uma única âncora (só muda ao começar, repetir trecho ou mudar a velocidade)
  function posAt(now) {
    let e = timeline[0];
    for (const x of timeline) { if (x.time <= now) e = x; else break; }
    if (e.end) return TOTAL;
    if (now < e.time) return e.tick;
    const p = e.tick + (now - e.time) / spb();
    const lim = loop.on && e.tick < loopEnd() ? loopEnd() - 1e-3 : TOTAL;
    return Math.min(p, lim);
  }
  function currentPos() {
    if (!playing) return pos;
    return posAt(audioNow());
  }
  function seek(p, resume) {
    const was = playing; if (playing) stopTransport();
    pos = Math.max(0, Math.min(TOTAL, p));
    if (was || resume) play(true); else render();
  }

  /* ---------- controles ---------- */
  const listeners = [];
  const on = (el, ev, fn) => { el.addEventListener(ev, fn); listeners.push([el, ev, fn]); };
  on(root, 'pointerdown', unlock);
  on(root, 'touchend', unlock);
  const playBtn = $('play'), seekEl = $('seek');
  function setPlayUI() { $('ico-play').hidden = playing; $('ico-pause').hidden = !playing; playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Tocar'); }
  on(playBtn, 'click', () => playing ? pause() : play());
  on(document, 'keydown', e => {
    if (!root.isConnected || e.target.matches('input,select,textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    if (e.code === 'ArrowRight') seek((Math.floor(currentPos() / BPB) + 1) * BPB);
    if (e.code === 'ArrowLeft') seek((Math.ceil(currentPos() / BPB) - 1) * BPB);
  });
  on(seekEl, 'input', () => seek(parseFloat(seekEl.value)));

  let drag = null;
  on(viewport, 'pointerdown', e => {
    drag = { x: e.clientX, p: currentPos(), was: playing };
    if (playing) { pos = currentPos(); stopTransport(); setPlayUI(); }
    viewport.setPointerCapture(e.pointerId); viewport.classList.add('dragging');
  });
  on(viewport, 'pointermove', e => { if (!drag) return; pos = Math.max(0, Math.min(TOTAL, drag.p - (e.clientX - drag.x) / PB)); render(); });
  const endDrag = () => { if (!drag) return; viewport.classList.remove('dragging'); const was = drag.was; drag = null; if (was) play(true); };
  on(viewport, 'pointerup', endDrag); on(viewport, 'pointercancel', endDrag);

  function bindToggle(r, get, set) { const b = $(r); on(b, 'click', () => { set(!get()); b.setAttribute('aria-pressed', String(get())); }); }
  bindToggle('t-metro', () => metro, v => metro = v);
  bindToggle('t-count', () => countIn, v => countIn = v);
  bindToggle('t-loop', () => loop.on, v => {
    loop.on = v; $('loopbox').hidden = !v;
    if (v) { const m = Math.floor(Math.min(currentPos(), TOTAL - 0.01) / BPB) + 1; loop.a = m; loop.b = Math.min(NB, m + 3); syncLoopUI();
      if (playing) { const p = currentPos(); if (p < loopStart() || p >= loopEnd()) seek(loopStart()); } }
    updateLoopBand();
  });
  const selA = $('loopA'), selB = $('loopB');
  for (let m = 1; m <= NB; m++) { selA.add(new Option(m, m)); selB.add(new Option(m, m)); }
  function syncLoopUI() { selA.value = loop.a; selB.value = loop.b; $('loopval').textContent = loop.a === loop.b ? `compasso ${loop.a}` : `compassos ${loop.a}–${loop.b}`; updateLoopBand(); }
  on(selA, 'change', () => { loop.a = +selA.value; if (loop.b < loop.a) loop.b = loop.a; syncLoopUI(); if (playing) seek(loopStart()); });
  on(selB, 'change', () => { loop.b = +selB.value; if (loop.a > loop.b) loop.a = loop.b; syncLoopUI(); if (playing) { const p = currentPos(); if (p >= loopEnd() || p < loopStart()) seek(loopStart()); } });
  function updateLoopBand() {
    root.querySelectorAll('[data-loopband]').forEach(r => {
      if (!loop.on) { r.style.display = 'none'; return; }
      r.style.display = ''; r.setAttribute('x', barX(loop.a - 1)); r.setAttribute('width', barX(loop.b) - barX(loop.a - 1));
    });
  }
  syncLoopUI();

  const speedEl = $('speed');
  function setSpeed(pct) {
    pct = Math.max(50, Math.min(100, Math.round(pct / 5) * 5)); speedEl.value = pct;
    if (playing) { const t = ctx.currentTime; const p = posAt(t); speed = pct / 100; timeline = [{ time: t, tick: p }]; nextTime = t + (nextTick - p) * spb(); }
    else speed = pct / 100;
    $('speedval').textContent = `${pct}% · ${Math.round(SONG.bpm * pct / 100)} BPM`;
  }
  on(speedEl, 'input', () => setSpeed(+speedEl.value));
  on($('slower'), 'click', () => setSpeed(+speedEl.value - 5));
  on($('faster'), 'click', () => setSpeed(+speedEl.value + 5));
  setSpeed(100);

  function showTab(which) {
    const isPlay = which === 'play';
    $('tab-play').setAttribute('aria-selected', String(isPlay)); $('tab-sheet').setAttribute('aria-selected', String(!isPlay));
    $('p-play').hidden = !isPlay; $('p-sheet').hidden = isPlay;
    if (!isPlay) buildSheet();
  }
  on($('tab-play'), 'click', () => showTab('play'));
  on($('tab-sheet'), 'click', () => showTab('sheet'));
  on(window, 'resize', () => { if (!$('p-sheet').hidden) buildSheet(); });

  /* ---------- quadro a quadro (sem estado do React) ---------- */
  let lastOn = new Set(), raf = 0, lastM = -1, lastBeat = '';
  const mnow = $('mnow'), sheetpos = $('sheetpos'), beatnow = $('beatnow');
  let lastP = 0;
  function render() {
    let p = currentPos();
    // nunca andar para trás por oscilação do relógio (só em saltos reais: repetir, arrastar, voltar)
    if (playing && p < lastP && lastP - p < 0.05) p = lastP;
    lastP = p;
    if (playing && ended && p >= TOTAL) { stopTransport(); pos = TOTAL; setPlayUI(); }
    svgMain.style.transform = `translate3d(${viewport.clientWidth * 0.28 - xOf(p)}px,0,0)`;
    const m = Math.min(NB, Math.floor(Math.min(p, TOTAL - 0.001) / BPB) + 1);
    if (m !== lastM) { mnow.textContent = m; sheetpos.textContent = `Compasso ${m}`; lastM = m; }
    const bt = p >= TOTAL ? 'fim' : `tempo ${Math.floor(p % BPB) + 1}`;
    if (bt !== lastBeat) { beatnow.textContent = bt; lastBeat = bt; }
    if (!drag && document.activeElement !== seekEl) seekEl.value = p;
    const onSet = new Set();
    if (playing || drag || p > 0) for (const n of NOTES) {
      const len = n.grace ? 0.12 : Math.min(n.d, 0.5);
      if (n.b - (n.grace ? 0.12 : 0) <= p + 0.02 && p < n.b + len + 0.02) onSet.add(n.i);
      if (n.b > p + 0.2) break;
    }
    lastOn.forEach(i => { if (!onSet.has(i)) root.querySelectorAll(`.n[data-i="${i}"]`).forEach(g => g.classList.remove('on')); });
    onSet.forEach(i => { if (!lastOn.has(i)) root.querySelectorAll(`.n[data-i="${i}"]`).forEach(g => g.classList.add('on')); });
    lastOn = onSet;
  }
  (function frame() { render(); raf = requestAnimationFrame(frame); })();

  return function destroy() {
    cancelAnimationFrame(raf);
    stopTransport();
    listeners.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
    if (ctx) { try { ctx.close(); } catch (e) {} }
    if (keepAlive) { try { keepAlive.pause(); URL.revokeObjectURL(keepAlive.src); } catch (e) {} keepAlive = null; }
    root.innerHTML = '';
  };
}

export default function TocarJuntoPlayer({ soloTab }) {
  const ref = useRef(null);
  const key = soloTab ? JSON.stringify(soloTab) : "";
  useEffect(() => {
    if (!ref.current || !soloTab || !soloTab.measures) return;
    const destroy = mountTocarJunto(ref.current, soloTab);
    return destroy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <div ref={ref} />;
}