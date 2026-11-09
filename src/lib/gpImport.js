// Conversor Guitar Pro 7/8 (.gp) -> formato tropeiros-tab-v1 (campo Song.solo_tab).
// Sem dependências: lê o zip e o XML por conta própria. Roda no navegador.
// Uso: const { tab, report } = await convertGpFile(file)   // file = File/Blob/ArrayBuffer

// ---------- frações exatas (durações de tercina etc.) ----------
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
class Fr {
  constructor(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); this.n = n / g; this.d = d / g; }
  add(o) { return new Fr(this.n * o.d + o.n * this.d, this.d * o.d); }
  mul(o) { return new Fr(this.n * o.n, this.d * o.d); }
  div(o) { return new Fr(this.n * o.d, this.d * o.n); }
  eq(o) { return this.n === o.n && this.d === o.d; }
  lt(o) { return this.n * o.d < o.n * this.d; }
  val() { return this.n / this.d; }
}
const ZERO = new Fr(0);
const VAL = { Whole: new Fr(4), Half: new Fr(2), Quarter: new Fr(1), Eighth: new Fr(1, 2), '16th': new Fr(1, 4), '32nd': new Fr(1, 8), '64th': new Fr(1, 16) };
const STD_PROPS = new Set(['ConcertPitch', 'Fret', 'Midi', 'String', 'TransposedPitch']);
function num(x) { const v = typeof x === 'number' ? x : x.val(); return Number.isInteger(v) ? v : Math.round(v * 1e6) / 1e6; }

// ---------- leitor de zip mínimo ----------
async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function readZipEntry(buf, wanted) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Arquivo não é um .gp do Guitar Pro 7/8 (não é zip). Arquivos .gp5/.gpx antigos precisam ser salvos de novo no Guitar Pro 7 ou 8.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const loff = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    if (name === wanted) {
      const ln = dv.getUint16(loff + 26, true), le = dv.getUint16(loff + 28, true);
      const data = u8.subarray(loff + 30 + ln + le, loff + 30 + ln + le + csize);
      if (method === 0) return data.slice();
      if (method === 8) return inflateRaw(data);
      throw new Error('Compressão não suportada no .gp');
    }
    p += 46 + nlen + elen + clen;
  }
  throw new Error('Este .gp não tem a partitura (Content/score.gpif). Salve de novo no Guitar Pro 7 ou 8.');
}

// ---------- leitor de XML mínimo ----------
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e) =>
    e === 'amp' ? '&' : e === 'lt' ? '<' : e === 'gt' ? '>' : e === 'quot' ? '"' : e === 'apos' ? "'" :
      String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));
}
class El {
  constructor(tag, attrs) { this.tag = tag; this.attrs = attrs; this.children = []; this.text = null; }
  get(a) { return this.attrs[a]; }
  find(tag) { return this.children.find(c => c.tag === tag) || null; }
  findtext(tag) { const c = this.find(tag); return c ? (c.text ?? '') : null; }
  *iter(tag) { for (const c of this.children) { if (c.tag === tag) yield c; yield* c.iter(tag); } }
}
function parseXml(src) {
  const root = new El('#doc', {}); const stack = [root]; let i = 0;
  const addText = (t) => { const top = stack[stack.length - 1]; if (top.children.length === 0) top.text = (top.text ?? '') + t; };
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;
    if (lt > i) addText(decodeEntities(src.slice(i, lt)));
    if (src.startsWith('<![CDATA[', lt)) { const e = src.indexOf(']]>', lt); addText(src.slice(lt + 9, e)); i = e + 3; continue; }
    if (src.startsWith('<!--', lt)) { i = src.indexOf('-->', lt) + 3; continue; }
    if (src[lt + 1] === '?' || src[lt + 1] === '!') { i = src.indexOf('>', lt) + 1; continue; }
    const gt = src.indexOf('>', lt);
    let body = src.slice(lt + 1, gt);
    if (body[0] === '/') { stack.pop(); i = gt + 1; continue; }
    const selfClose = body.endsWith('/'); if (selfClose) body = body.slice(0, -1);
    const m = body.match(/^([^\s]+)/); const tag = m[1];
    const attrs = {}; const re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g; let a;
    while ((a = re.exec(body.slice(tag.length)))) attrs[a[1]] = decodeEntities(a[3] ?? a[4]);
    const el = new El(tag, attrs);
    stack[stack.length - 1].children.push(el);
    if (!selfClose) stack.push(el);
    i = gt + 1;
  }
  return root.children[0];
}

// ---------- conversão (mesma lógica do gp_para_tablatura.py) ----------
export function convertGpif(root) {
  const idx = (tag) => { const m = {}; const e = root.find(tag); if (e) for (const c of e.children) m[c.get('id')] = c; return m; };
  const bars = idx('Bars'), voices = idx('Voices'), beats = idx('Beats'), notes = idx('Notes'), rh = idx('Rhythms');
  const warn = [];
  const score = root.find('Score');
  const title = (score?.findtext('Title') || '').trim();
  const artist = (score?.findtext('Artist') || '').trim();
  const album = (score?.findtext('Album') || '').trim();

  // andamento
  let tempos = [];
  const mt = root.find('MasterTrack');
  if (mt) for (const a of mt.iter('Automation')) {
    if (a.findtext('Type') === 'Tempo') {
      const v = a.findtext('Value').trim().split(/\s+/);
      tempos.push({ bar: parseInt(a.findtext('Bar'), 10), pos: parseFloat(a.findtext('Position') || 0), bpm: num(parseFloat(v[0])) });
    }
  }
  const dedup = new Map();
  for (const t of tempos) dedup.set(t.bar + '|' + t.pos, t);
  tempos = [...dedup.values()].sort((x, y) => x.bar - y.bar || x.pos - y.pos);
  const start = tempos.filter(t => t.bar === 0);
  const bpm = start.length ? start[start.length - 1].bpm : (tempos.length ? tempos[0].bpm : 120);
  const changes = []; let cur = bpm;
  for (const t of tempos) { if (t.bar === 0) continue; if (t.bpm !== cur) { changes.push(t); cur = t.bpm; } }
  tempos = [{ bar: 0, pos: 0, bpm }, ...changes];

  const tracks = root.find('Tracks').children;
  if (tracks.length > 1) warn.push(`${tracks.length} faixas no arquivo; usada só a primeira (${tracks[0].findtext('Name')})`);
  const track = tracks[0];
  let pitches = null;
  for (const p of track.iter('Property')) {
    if (p.get('name') === 'Tuning' && p.find('Pitches')) { pitches = p.findtext('Pitches').trim().split(/\s+/).map(Number); break; }
  }
  if (!pitches) { warn.push('afinação não encontrada'); pitches = [47, 52, 56, 59, 64]; }
  const nstr = pitches.length;
  const tuning = {}; for (let i = 0; i < nstr; i++) tuning[String(nstr - i)] = pitches[i];

  const dur = (rid) => {
    const e = rh[rid]; let d = VAL[e.findtext('NoteValue')];
    const a = e.find('AugmentationDot');
    if (a) { let add = d; for (let k = 0; k < parseInt(a.get('count'), 10); k++) { add = add.div(new Fr(2)); d = d.add(add); } }
    const t = e.find('PrimaryTuplet');
    if (t) d = d.mul(new Fr(parseInt(t.get('den'), 10), parseInt(t.get('num'), 10)));
    return d;
  };
  const prop = (n, name, child) => { for (const p of n.iter('Property')) if (p.get('name') === name) return p.findtext(child); return null; };

  const techs = {};
  const bump = (k) => { techs[k] = (techs[k] || 0) + 1; };
  const measures = [];
  const mbs = root.find('MasterBars').children;
  mbs.forEach((mb, mi) => {
    const [tn, td] = mb.findtext('Time').split('/').map(Number);
    const barLen = new Fr(tn * 4, td);
    const m = { notes: [], chords: [] };
    if (mi === 0 || mb.findtext('Time') !== mbs[mi - 1].findtext('Time')) m.time = mb.findtext('Time');
    const rep = mb.find('Repeat');
    if (rep) { if (rep.get('start') === 'true') m.repeatStart = true; if (rep.get('end') === 'true') m.repeatEnd = parseInt(rep.get('count') || 2, 10); }
    const alt = mb.findtext('AlternateEndings');
    if (alt && alt.trim()) m.endings = alt.trim().split(/\s+/).map(Number);
    const dirs = mb.find('Directions');
    if (dirs) { const d = dirs.children.map(c => c.text).filter(Boolean); if (d.length) { m.directions = d; warn.push(`compasso ${mi + 1}: indicação de navegação ${JSON.stringify(d)} (D.S./Coda) — conferir ordem de execução`); } }

    const bid = mb.findtext('Bars').trim().split(/\s+/)[0];
    const vids = bars[bid].findtext('Voices').trim().split(/\s+/).filter(v => v !== '-1');
    vids.forEach((vid, vn) => {
      let pos = ZERO;
      for (const bt of (voices[vid].findtext('Beats') || '').trim().split(/\s+/).filter(Boolean)) {
        const b = beats[bt];
        const d = dur(b.find('Rhythm').get('ref'));
        const grace = !!b.find('GraceNotes');
        const ft = b.findtext('FreeText');
        if (ft && vn === 0) m.chords.push([num(pos), ft.trim()]);
        for (const nid of (b.findtext('Notes') || '').trim().split(/\s+/).filter(Boolean)) {
          const n = notes[nid];
          const s = parseInt(prop(n, 'String', 'String'), 10);
          const f = parseInt(prop(n, 'Fret', 'Fret'), 10);
          const par = nstr - s;
          if (f < 0) { warn.push(`compasso ${mi + 1}: nota com casa inválida (${f}) ignorada`); continue; }
          const extra = {};
          const tie = n.find('Tie');
          if (tie && tie.get('destination') === 'true') extra.tieDest = true;
          for (const p of n.iter('Property')) { const nm = p.get('name'); if (!STD_PROPS.has(nm)) { bump(nm); (extra.tech ||= []).push(nm); } }
          for (const tag of ['Vibrato', 'LetRing', 'Accent', 'AntiAccent']) if (n.find(tag)) { bump(tag); (extra.tech ||= []).push(tag); }
          if (grace) { extra.grace = true; bump('GraceNote'); }
          m.notes.push([pos, grace ? ZERO : d, par, f, extra]);
        }
        if (!grace) pos = pos.add(d);
      }
      if (!pos.eq(barLen) && !(mi === 0 && pos.lt(barLen))) warn.push(`compasso ${mi + 1} voz ${vn + 1}: soma ${num(pos)} tempos, esperado ${num(barLen)}`);
    });
    measures.push(m);
  });

  // ligaduras
  const last = {}; const remove = new Set();
  measures.forEach((m, mi) => m.notes.forEach((n, k) => {
    const key = n[2];
    if (n[4].tieDest && key in last) {
      const [pm, pk] = last[key]; const prev = measures[pm].notes[pk];
      if (prev[3] === n[3]) { prev[1] = prev[1].add(n[1]); remove.add(mi + ':' + k); return; }
    }
    last[key] = [mi, k];
  }));
  let out = measures.map((m, mi) => {
    const nl = [];
    m.notes.forEach((n, k) => {
      if (remove.has(mi + ':' + k)) return;
      const ex = { ...n[4] }; delete ex.tieDest;
      const row = [num(n[0]), num(n[1]), n[2], n[3]];
      if (Object.keys(ex).length) row.push(ex);
      nl.push(row);
    });
    nl.sort((a, b) => a[0] - b[0] || a[2] - b[2]);
    const m2 = { ...m }; m2.notes = nl; return m2;
  });

  // "%" ou "/" na cifra = repete o acorde anterior
  let prevChord = null;
  for (const m of out) for (const c of m.chords) { if ((c[1] === '%' || c[1] === '/') && prevChord) c[1] = prevChord; else prevChord = c[1]; }

  // desdobra ritornelos e casas de 1ª/2ª vez
  let unrolled = false;
  if (out.some(m => 'repeatEnd' in m || 'endings' in m)) {
    const n = out.length; let k = 0;
    while (k < n) {
      const m = out[k];
      if ('endings' in m) {
        const ends = m.endings; let j = k; let ahead = null;
        for (let q = k; q < n; q++) {
          const mq = out[q];
          if (q > k && ('endings' in mq || mq.repeatStart)) break;
          if ('repeatEnd' in mq) { ahead = q; break; }
        }
        if (ahead !== null) { for (let q = k + 1; q <= ahead; q++) out[q].endings = ends; j = ahead; }
        else if (ends.includes(1)) {
          let q = k + 1;
          while (q < n && !('endings' in out[q]) && !out[q].repeatStart) { out[q].endings = ends; q++; }
          j = q - 1;
          const all = out.filter(mm => 'endings' in mm).flatMap(mm => mm.endings);
          out[j].repeatEnd = Math.max(...all, 2);
          warn.push(`casas de 1ª/2ª vez sem sinal de ritornelo: repetição considerada do início (ou do último ritornelo) até o compasso ${j + 1}`);
        }
        k = j + 1;
      } else k++;
    }
    const order = []; let i = 0, startI = 0, passn = 1, guard = 0;
    while (i < n && guard < 5000) {
      guard++; const m = out[i];
      if (m.repeatStart && i !== startI) { startI = i; passn = 1; }
      if ('endings' in m && !m.endings.includes(passn)) { i++; continue; }
      order.push(i);
      if ('repeatEnd' in m && passn < m.repeatEnd) { passn++; i = startI; continue; }
      if ('repeatEnd' in m) { passn = 1; startI = i + 1; }
      i++;
    }
    out = order.map(ix => { const c = { ...out[ix] }; delete c.repeatStart; delete c.repeatEnd; delete c.endings; return c; });
    unrolled = true;
  }

  // compassos vazios no fim (comuns em arquivos com várias faixas)
  let trimmed = 0;
  while (out.length > 1 && !out[out.length - 1].notes.length && !out[out.length - 1].chords.length) { out.pop(); trimmed++; }
  if (trimmed > 1) warn.push(`${trimmed} compassos vazios no fim foram removidos`);

  const firstTime = measures[0]?.time || '4/4';
  const [ftn, ftd] = firstTime.split('/').map(Number);
  const tab = {
    format: 'tropeiros-tab-v1', bpm, time: firstTime, beatsPerBar: num(new Fr(ftn * 4, ftd)),
    instrument: nstr >= 6 ? 'violao' : 'viola',
    tuning, octavePairs: nstr === 5 ? [3, 4, 5].filter(p => String(p) in tuning) : [],
    measures: out.map(m => ({ notes: m.notes, chords: m.chords })),
  };
  const tempoChanges = tempos.slice(1);
  const report = {
    title, artist, album, bpm, tempoChanges, time: firstTime, tuning: pitches,
    bars: out.length, originalBars: measures.length, unrolled,
    notes: out.reduce((s, m) => s + m.notes.length, 0),
    chords: out.reduce((s, m) => s + m.chords.length, 0),
    chordNames: [...new Set(out.flatMap(m => m.chords.map(c => c[1])))].sort(),
    muted: techs.Muted || 0, techniques: techs, warnings: warn,
  };
  if (tempoChanges.length) warn.push(`mudança de andamento no meio da música (${tempoChanges.map(t => `${t.bpm} BPM no compasso ${t.bar + 1}`).join(', ')}); o Tocar Junto usa o andamento inicial (${bpm} BPM)`);
  if (nstr >= 6) { if (pitches.join(' ') !== '40 45 50 55 59 64') warn.push(`violão com afinação diferente da padrão: ${pitches.join(' ')}`); }
  else if (pitches.join(' ') !== '47 52 56 59 64') warn.push(`afinação diferente do Cebolão Mi: ${pitches.join(' ')}`);
  if (report.chords === 0) warn.push('arquivo sem cifras (o Tocar Junto mostrará só a tablatura)');
  if (report.muted) warn.push(`${report.muted} notas abafadas serão tocadas como notas normais`);
  return { tab, report };
}

export async function convertGpFile(file) {
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const xml = await readZipEntry(buf, 'Content/score.gpif');
  const root = parseXml(new TextDecoder().decode(xml));
  if (!root || root.tag !== 'GPIF') throw new Error('Conteúdo do .gp não reconhecido.');
  return convertGpif(root);
}