const { createServer } = await import('vite');
import { readFileSync } from 'node:fs';
const APP = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const fase = process.argv[2];
const senha = (process.env.SENHA_TESTE || '').trim();
const server = await createServer({ root: APP, configFile: APP + '/vite.config.js', server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { base44, supabase } = await server.ssrLoadModule('/src/api/base44Client.js');
const F = base44.functions, S = base44.entities;
let ok = 0, falhas = 0;
const t = async (nome, fn) => { const t0 = Date.now();
  try { const r = await fn(); if (r === false) throw new Error('condição falhou'); ok++; console.log('  ✓', nome, `(${((Date.now()-t0)/1000).toFixed(0)}s)`, typeof r === 'string' ? '— ' + r.slice(0, 400) : ''); }
  catch (e) { falhas++; console.log('  ✗', nome, `(${((Date.now()-t0)/1000).toFixed(0)}s)`, '→', e.status || '', e.message); } };
const erro = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
const { error } = await supabase.auth.signInWithPassword({ email: 'teste-migracao@tropeiros.invalid', password: senha });
if (error) { console.log('login falhou', error.message); process.exit(1); }

if (fase === 'comum') {
  await t('comum: gerarAulaPorTema → acesso negado', async () => { const e = await erro(() => F.invoke('gerarAulaPorTema', { tema: 'teste' })); return e && e.status === 403 && e.message; });
  await t('comum: iniciarGeracaoAulas → acesso negado', async () => { const e = await erro(() => F.invoke('iniciarGeracaoAulas', { simular: true })); return e && e.status === 403 && e.message; });
}
if (fase === 'admin') {
  await t('generateExercises → mensagem clara', async () => { const e = await erro(() => F.invoke('generateExercises', {})); return e && e.status === 501 && e.message; });
  // restaurar item apagado
  const lixo = await S.DeletedEntity.create({ entity_type: 'Style', entity_id: 'estilo-antigo-teste', entity_name: 'ZZ Estilo de teste',
    entity_data: { id: 'estilo-antigo-teste', name: 'ZZ Estilo de teste', description: 'criado no teste da migração', created_by: 'x' },
    deleted_by: 'teste', deleted_at: new Date().toISOString(), restore_deadline: new Date(Date.now() + 86400000).toISOString(), can_restore: true });
  let restaurado;
  await t('restoreDeletedEntity restaura o item', async () => { const r = await F.invoke('restoreDeletedEntity', { deletedEntityId: lixo.id }); restaurado = r.data.restored_id; const est = await S.Style.get(restaurado); const d = await S.DeletedEntity.get(lixo.id); const logs = await S.DataChangeLog.filter({ entity_id: 'estilo-antigo-teste' }); return r.data.success && est.name === 'ZZ Estilo de teste' && d.can_restore === false && logs.length === 1 && logs[0].action === 'restore' && r.data.message; });
  await t('restoreDeletedEntity não restaura duas vezes', async () => { const e = await erro(() => F.invoke('restoreDeletedEntity', { deletedEntityId: lixo.id })); return e && e.status === 400 && e.message; });
  // limpeza do teste de restauração
  if (restaurado) await S.Style.delete(restaurado);
  await S.DeletedEntity.delete(lixo.id);
  await S.DataChangeLog.deleteMany({ entity_id: 'estilo-antigo-teste' });
  // aula por tema
  let aulaId;
  await t('gerarAulaPorTema cria uma aula', async () => { const r = await F.invoke('gerarAulaPorTema', { tema: 'Ponteado em terças na viola caipira', nivel: 'basico', duracao_minutos: 60 }); const a = r.data.aula; aulaId = a.id; return r.data.success && a.numero === 17 && a.teoria.topicos.length >= 2 && a.exercicios.length >= 2 && a.created_by === 'teste-migracao@tropeiros.invalid' && `Aula ${a.numero}: "${a.titulo}" (${a.nivel}; ${a.teoria.topicos.length} tópicos, ${a.exercicios.length} exercícios)`; });
  if (aulaId) await S.Aula.delete(aulaId);
  // plano completo em simulação
  await t('iniciarGeracaoAulas (simulação) gera 13 aulas sem gravar', async () => { const antes = (await S.Aula.list()).length; const r = await F.invoke('iniciarGeracaoAulas', { simular: true }); const depois = (await S.Aula.list()).length; const a = r.data.aulas || []; return r.data.simulado && r.data.total_aulas === 13 && antes === depois && a.every(x => x.topicos >= 1 && x.exercicios >= 1) && a.map(x => `${x.numero}. ${x.titulo}`).join(' | '); });
}
console.log(`\nResultado: ${ok} ok, ${falhas} falha(s)`);
await supabase.auth.signOut(); await server.close(); process.exit(0);
