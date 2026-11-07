// Roda o adaptador REAL do app (src/api/base44Client.js) via Vite, contra o Supabase.
// Uso: SENHA_TESTE=... node scripts/teste_adaptador.mjs comum|admin  (precisa de um usuário teste-migracao@tropeiros.invalid)
const { createServer } = await import('vite');
import { readFileSync } from 'node:fs';
const APP = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const fase = process.argv[2];
const senha = (process.env.SENHA_TESTE || readFileSync(new URL('./.senha_teste', import.meta.url), 'utf8')).trim();
const server = await createServer({ root: APP, configFile: APP + '/vite.config.js', server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { base44, supabase } = await server.ssrLoadModule('/src/api/base44Client.js');
let ok = 0, falhas = 0;
const t = async (nome, fn) => {
  try { const r = await fn(); if (r === false) throw new Error('condição falhou'); ok++; console.log('  ✓', nome, typeof r === 'string' ? '— ' + r : ''); }
  catch (e) { falhas++; console.log('  ✗', nome, '→', e.status || '', e.message); }
};
const espera = async (fn, status) => { try { await fn(); return false; } catch (e) { return status ? e.status === status : true; } };

await t('sem login: me() recusa com 401', () => espera(() => base44.auth.me(), 401));
await t('sem login: banco não entrega músicas', async () => (await base44.entities.Song.list('-created_date', 5)).length === 0);
const { error } = await supabase.auth.signInWithPassword({ email: 'teste-migracao@tropeiros.invalid', password: senha });
if (error) { console.log('login falhou', error.message); process.exit(1); }
const S = base44.entities;

if (fase === 'comum') {
  console.log('== Usuário comum');
  await t('me()', async () => { const u = await base44.auth.me(); return u.role === 'user' && u.email === 'teste-migracao@tropeiros.invalid' && `${u.full_name} / ${u.role}`; });
  await t('Song.list() traz todas', async () => { const r = await S.Song.list(); return r.length === 743 && `${r.length} músicas`; });
  await t('Song.list("-created_date", 5)', async () => { const r = await S.Song.list('-created_date', 5); return r.length === 5 && r[0].created_date >= r[4].created_date && !!r[0].title; });
  await t('Song.list("title", 2000) ordem alfabética', async () => { const r = await S.Song.list('title', 2000); const tt = r.map(x => x.title || ''); return r.length === 743 && tt.slice(0, 200).every((v, i, a) => i === 0 || new Intl.Collator('pt-BR', { sensitivity: 'base' }).compare(a[i - 1], v) <= 0) && `${tt[0]} … ${tt[742]}`; });
  await t('Song.list("-title", 10, 20) (paginação)', async () => { const a = await S.Song.list('-title', 30); const b = await S.Song.list('-title', 10, 20); return b.length === 10 && b[0].id === a[20].id; });
  const amostra = (await S.Song.list('-created_date', 3));
  await t('Song.get(id)', async () => { const s = await S.Song.get(amostra[0].id); return s.id === amostra[0].id && s.title === amostra[0].title && s.created_by !== undefined; });
  await t('Song.get(inexistente) → 404', () => espera(() => S.Song.get('nao-existe'), 404));
  await t('filter({ title }) igualdade', async () => { const r = await S.Song.filter({ title: amostra[0].title }); return r.length >= 1 && r.every(x => x.title === amostra[0].title); });
  await t('filter({ title }, { limit, fields }) → {items}', async () => { const r = await S.Song.filter({ title: amostra[0].title }, { limit: 20, fields: ['title', 'artist'] }); return Array.isArray(r.items) && r.items[0].title === amostra[0].title && r.items[0].cifra_text === undefined && 'id' in r.items[0]; });
  await t('filter({ id: { $in } }, { limit: 50 })', async () => { const ids = amostra.map(x => x.id); const r = await S.Song.filter({ id: { $in: ids } }, { limit: 50 }); return r.items.length === 3; });
  await t('list({ distinct: "artist" })', async () => { const r = await S.Song.list({ distinct: 'artist' }); return r.items.length > 50 && typeof r.items[0] === 'string' && `${r.items.length} artistas`; });
  await t('Aula.filter({}, "numero", 200) ordem numérica', async () => { const r = await S.Aula.filter({}, 'numero', 200); const n = r.map(x => x.numero); return r.length === 16 && n.every((v, i) => i === 0 || n[i - 1] <= v) && n.join(','); });
  await t('Chord.filter({ instrument: "viola" })', async () => { const r = await S.Chord.filter({ instrument: 'viola' }); return r.length > 0 && r.every(c => c.instrument === 'viola') && `${r.length} acordes`; });
  await t('LearningPattern.filter(..., "-created_date", 500)', async () => { const r = await S.LearningPattern.filter({ progression_name: 'Feedback do Usuário' }, '-created_date', 500); return Array.isArray(r) && `${r.length} registros`; });
  await t('fetchAllSongs() (cursor)', async () => { const r = await base44.fetchAllSongs(); return r.length === 743 && new Set(r.map(x => x.id)).size === 743; });
  await t('CadernosCifras.list("-data_upload")', async () => { const r = await S.CadernosCifras.list('-data_upload'); return r.length === 92 && r.reduce((a, c) => a + (c.cifras_extraidas || []).length, 0) === 8450 && '8.450 cifras'; });
  await t('comum NÃO altera música', () => espera(() => S.Song.update(amostra[0].id, { tempo: 1 })));
  await t('comum NÃO cria música', () => espera(() => S.Song.create({ title: 'x', artist: 'y' })));
  await t('comum NÃO vê pagamentos/plano de outro aluno', async () => (await S.Pagamento.list()).length === 0 && (await S.StudyPlan.list()).length === 0);
  let setlist;
  await t('comum cria setlist (autor = ele)', async () => { setlist = await S.Setlist.create({ name: 'TESTE MIGRAÇÃO', songs: [amostra[0].id], id: 'tentativa-de-id', created_by: 'falso@x' }); return setlist.created_by === 'teste-migracao@tropeiros.invalid' && setlist.id !== 'tentativa-de-id' && setlist.name === 'TESTE MIGRAÇÃO'; });
  await t('comum altera a própria setlist (mescla campos)', async () => { const r = await S.Setlist.update(setlist.id, { notes: 'ok' }); return r.notes === 'ok' && r.name === 'TESTE MIGRAÇÃO' && r.songs.length === 1; });
  await t('comum apaga a própria setlist', async () => { await S.Setlist.delete(setlist.id); return espera(() => S.Setlist.get(setlist.id), 404); });
  await t('updateMe mescla dados e não muda papel', async () => { const r = await base44.auth.updateMe({ song_history: [{ song_id: 'a' }], role: 'admin' }); const m = await base44.auth.me(); return m.role === 'user' && m.song_history?.length === 1 && m.full_name === 'Teste Migração'; });
  await t('User.list() só mostra o próprio perfil', async () => (await S.User.list()).length === 1);
}

if (fase === 'admin') {
  console.log('== Administrador');
  await t('admin apaga arquivos de testes anteriores', async () => { const { data } = await supabase.storage.from('arquivos').remove(['uploads/2026-11/2e2c4b3cb_Teste_Acao_c.txt', 'uploads/2026-11/945e828cd_Teste_Acao_c.txt']); return data?.length === 2 && '2 apagados'; });
  await t('me() é admin', async () => (await base44.auth.me()).role === 'admin');
  const [s] = await S.Song.list('-created_date', 1);
  await t('update parcial preserva o resto', async () => { const antes = s.tempo; const r = await S.Song.update(s.id, { tempo: 123 }); const ok1 = r.tempo === 123 && r.cifra_text === s.cifra_text && r.created_by === s.created_by; await S.Song.update(s.id, { tempo: antes ?? null }); const d = await S.Song.get(s.id); return ok1 && d.tempo === (antes ?? null); });
  await t('update não troca id/autor/data', async () => { const r = await S.Song.update(s.id, { created_by: 'hacker', id: 'x', created_date: '2000-01-01' }); return r.created_by === s.created_by && r.id === s.id && r.created_date === s.created_date; });
  let criados;
  await t('bulkCreate', async () => { criados = await S.Chord.bulkCreate([{ name: 'ZZTESTE1', instrument: 'viola' }, { name: 'ZZTESTE2', instrument: 'viola' }]); return criados.length === 2 && criados[0].name === 'ZZTESTE1'; });
  await t('bulkUpdate', async () => { await S.Chord.bulkUpdate(criados.map(c => ({ id: c.id, description: 'teste' }))); const r = await S.Chord.get(criados[1].id); return r.description === 'teste' && r.name === 'ZZTESTE2'; });
  await t('filter $in em campo de dados', async () => (await S.Chord.filter({ name: { $in: ['ZZTESTE1', 'ZZTESTE2'] } })).length === 2);
  await t('deleteMany({ description })', async () => { const r = await S.Chord.deleteMany({ description: 'teste' }); return r.deleted === 2 && (await S.Chord.filter({ name: { $in: ['ZZTESTE1', 'ZZTESTE2'] } })).length === 0; });
  await t('User.list() mostra todos', async () => (await S.User.list()).length >= 1);
  await t('UploadFile envia ao Storage e devolve link público', async () => {
    const file = new File([new TextEncoder().encode('teste da migração')], 'Teste Ação ç.txt', { type: 'text/plain' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const txt = await (await fetch(file_url)).text();
    const caminho = decodeURIComponent(new URL(file_url).pathname.split('/object/public/arquivos/')[1]);
    const { data: rem } = await supabase.storage.from('arquivos').remove([caminho]);
    return txt === 'teste da migração' && rem?.length === 1 && `enviado e apagado: ${caminho}`;
  });
  await t('functions.invoke de função inexistente dá erro claro', () => espera(() => base44.functions.invoke('nao-existe', {})));
}
console.log(`\nResultado: ${ok} ok, ${falhas} falha(s)`);
await supabase.auth.signOut();
await server.close();
process.exit(falhas ? 1 : 0);
