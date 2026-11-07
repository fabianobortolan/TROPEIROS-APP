const { createServer } = await import('vite');
import { readFileSync } from 'node:fs';
const APP = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const senha = (process.env.SENHA_TESTE || '').trim();
const server = await createServer({ root: APP, configFile: APP + '/vite.config.js', server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { base44, supabase } = await server.ssrLoadModule('/src/api/base44Client.js');
const IA = base44.integrations.Core.InvokeLLM;
let ok = 0, falhas = 0;
const t = async (nome, fn) => { const t0 = Date.now();
  try { const r = await fn(); if (r === false) throw new Error('condição falhou'); ok++; console.log('  ✓', nome, `(${((Date.now()-t0)/1000).toFixed(0)}s)`, typeof r === 'string' ? '— ' + r.slice(0, 300) : ''); }
  catch (e) { falhas++; console.log('  ✗', nome, `(${((Date.now()-t0)/1000).toFixed(0)}s)`, '→', e.status || '', e.message); } };

await t('sem login: IA recusa', async () => { try { await IA({ prompt: 'oi' }); return false; } catch (e) { return [401, 403].includes(e.status) && `recusado (${e.status})`; } });
const { error } = await supabase.auth.signInWithPassword({ email: 'teste-migracao@tropeiros.invalid', password: senha });
if (error) { console.log('login falhou', error.message); process.exit(1); }

await t('texto simples (sem esquema) devolve texto', async () => { const r = await IA({ prompt: 'Responda só com a palavra: viola' }); return typeof r === 'string' && /viola/i.test(r) && r; });
await t('esquema simples devolve objeto', async () => { const r = await IA({ prompt: 'Quais são as notas do acorde de Sol maior (G)?', response_json_schema: { type: 'object', properties: { acorde: { type: 'string' }, notas: { type: 'array', items: { type: 'string' } } } } }); return Array.isArray(r.notas) && r.notas.length === 3 && JSON.stringify(r); });
await t('esquema aninhado (como a tela Analisar) com cifra', async () => {
  const cifra = `[Intro] G D7 G\n\nG                D7\nEstrada da vida tão longa\n                  G\nNa curva eu me perdi\n G7          C\nDa saudade ninguém foge\n     D7          G\nVou voltar pra onde nasci`;
  const r = await IA({ prompt: `Analise a harmonia desta cifra e identifique as progressões por seção. Tom provável e graus.\n\n${cifra}`,
    response_json_schema: { type: 'object', properties: { main_key: { type: 'string' }, tempo: { type: 'number' }, general_notes: { type: 'string' },
      progressions: { type: 'array', items: { type: 'object', properties: { section: { type: 'string' }, chords: { type: 'array', items: { type: 'string' } }, pattern: { type: 'string' }, progression_name: { type: 'string' } } } } } } });
  return typeof r.main_key === 'string' && Array.isArray(r.progressions) && r.progressions.length > 0 && `tom ${r.main_key}; ${r.progressions.length} seções; ex.: ${r.progressions[0].section}: ${r.progressions[0].pattern}`; });
await t('lê PDF do Storage (file_urls)', async () => { const r = await IA({ prompt: 'Extraia o título e as primeiras linhas deste documento.', file_urls: ['https://xjeluakxtrvluzednjsf.supabase.co/storage/v1/object/public/arquivos/base44/83510dc49_Modulo2-Licao1.pdf'], response_json_schema: { type: 'object', properties: { text: { type: 'string' } } } }); return typeof r.text === 'string' && r.text.length > 20 && r.text.replace(/\s+/g, ' ').slice(0, 160); });
await t('pesquisa na internet + esquema', async () => { const r = await IA({ prompt: 'Quem são os compositores da música "Estrada da Vida", gravada por Milionário e José Rico, e em que ano foi lançada?', add_context_from_internet: true, response_json_schema: { type: 'object', properties: { author: { type: 'string' }, year: { type: 'number' } } } }); return typeof r.author === 'string' && r.author.length > 3 && `${r.author} / ${r.year}`; });
await t('integração não configurada dá mensagem clara', async () => { try { await base44.integrations.Core.SendEmail({ to: 'x@x', subject: 'a', body: 'b' }); return false; } catch (e) { return e.status === 501 && e.message; } });
console.log(`\nResultado: ${ok} ok, ${falhas} falha(s)`);
await supabase.auth.signOut(); await server.close(); process.exit(0);
