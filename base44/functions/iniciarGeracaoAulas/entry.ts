import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Função leve: apenas registra o job e retorna imediatamente
// A geração real é feita pela automation "executarGeracaoAulas"
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado.' }, { status: 403 });
    }

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

    console.log('✅ Job registrado. Automation irá processar em background.');

    return Response.json({ 
      success: true, 
      message: 'Geração iniciada em background. Aguarde 2-3 minutos e recarregue a página.' 
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});