const { createServer } = await import('vite');
import { readFileSync } from 'node:fs';
const APP = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const server = await createServer({ root: APP, configFile: APP + '/vite.config.js', server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { base44, supabase } = await server.ssrLoadModule('/src/api/base44Client.js');
await supabase.auth.signInWithPassword({ email: 'teste-migracao@tropeiros.invalid', password: (process.env.SENHA_TESTE || '').trim() });
const props = {}; for (const k of ['titulo','descricao','topico1_titulo','topico1_conteudo','topico1_exemplos','topico2_titulo','topico2_conteudo','topico2_exemplos','exercicio1_titulo','exercicio1_instrucoes','exercicio1_dicas','exercicio2_titulo','exercicio2_instrucoes','exercicio2_dicas','objetivo1','objetivo2','objetivo3','conceitos_chave']) props[k]={type:'string'}; props.duracao_minutos={type:'number'};
for (const model of [process.argv[2]]) {
  const t0 = Date.now();
  try {
    const r = await base44.integrations.Core.InvokeLLM({ prompt: 'Você é professor experiente de viola caipira. Crie a Aula 5 de um curso de viola caipira. Tema: Acorde de D7 e primeira progressão I-IV-V-I. Nível: Básico. Seja detalhado e prático. Campos de lista use valores separados por " | ".', response_json_schema: { type: 'object', properties: props, required: Object.keys(props) }, model });
    console.log(model, ((Date.now()-t0)/1000).toFixed(0)+'s', r.titulo, '| tamanho', JSON.stringify(r).length);
  } catch (e) { console.log(model, ((Date.now()-t0)/1000).toFixed(0)+'s ERRO', e.status, e.message); }
}
await server.close(); process.exit(0);
