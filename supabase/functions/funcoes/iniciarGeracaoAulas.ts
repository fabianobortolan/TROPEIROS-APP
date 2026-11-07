// Portado do Base44 (base44/functions/iniciarGeracaoAulas) — só o cabeçalho e o fim mudaram.
// deno-lint-ignore-file no-explicit-any
import { createClientFromRequest } from './base44.ts';
import executarGeracaoAulas from './executarGeracaoAulas.ts';

// No Base44 a geração rodava num workflow agendado a cada 5 min que procurava o
// marcador "__GERANDO__". Aqui ela começa logo, em segundo plano (EdgeRuntime.waitUntil).
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

// Função leve: apenas registra o job e retorna imediatamente
// A geração real é feita pela automation "executarGeracaoAulas"
export default async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // Teste: { simular: true } gera sem apagar nem gravar nada
    const corpo = await req.json().catch(() => ({}));
    if (corpo?.simular) return await executarGeracaoAulas(req, { simular: true });

    // Salva um registro de status para o frontend consultar
    // Usamos a entidade Aula com um marcador especial temporário
    // Vamos usar localStorage via um campo especial ou simplesmente
    // verificar se as aulas mudaram. A geração é feita pelo automation.

    // Sinaliza para o automation rodar: deleta aulas existentes e cria marcador
    const existentes = await base44.asServiceRole.entities.Aula.list();
    if (existentes.length > 0) {
      await Promise.all(existentes.map(a => base44.asServiceRole.entities.Aula.delete(a.id)));
    }

    // Cria aula marcadora de "em processamento"
    await base44.asServiceRole.entities.Aula.create({
      numero: 0,
      titulo: '__GERANDO__',
      descricao: 'Plano sendo gerado pela IA...',
      nivel: 'iniciante',
      duracao_minutos: 0,
      status: 'rascunho',
      objetivos: []
    });

    console.log('✅ Job registrado. Gerando em segundo plano...');
    EdgeRuntime.waitUntil(executarGeracaoAulas(req).then((r) => r.text()).then((t) => console.log('Geração:', t)));

    return Response.json({ 
      success: true, 
      message: 'Geração iniciada em background. Aguarde 2-3 minutos e recarregue a página.' 
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
