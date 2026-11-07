import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const titulo = (body?.titulo || '').toString().trim();
    const artista = (body?.artista || '').toString().trim();

    if (!titulo || !artista) {
      return Response.json({ error: 'Título e artista são obrigatórios' }, { status: 400 });
    }

    const prompt = `Você é um especialista em cifras musicais brasileiras, com amplo conhecimento do repertório sertanejo, MPB, pop e gospel.
Sua tarefa é buscar na internet e fornecer a cifra COMPLETA e CORRETA da música "${titulo}" de "${artista}".

INSTRUÇÕES IMPORTANTES:
1. Busque a cifra em sites confiáveis como cifraclub.com.br, cifras.com.br, ciframania.com.br, letras.mus.br, etc.
2. Retorne a cifra COMPLETA com todos os acordes e todas as estrofes/letras — não resuma, não corte partes.
3. Formato padrão de cifra brasileira: acordes acima das sílabas correspondentes das letras (alinhados).
4. Inclua marcadores de seção entre colchetes: [INTRO], [VERSO 1], [VERSO 2], [PRÉ-REFRÃO], [REFRÃO], [PONTE], [SOLO], [FINAL], etc.
5. Se houver capotraste, informe a casa (ex: "Capo na 2ª casa"). Se não houver, retorne 0.
6. Identifique a tonalidade (tom) principal da música conforme a cifra encontrada.
7. Use sustenidos (#) em vez de bemois (b) nos acordes quando possível (ex: use C# em vez de Db).
8. Se a cifra não for encontrada ou você não tiver certeza, ainda assim retorne o melhor texto possível — nunca retorne vazio.

FORMATO DE RESPOSTA (JSON):
- title: título correto da música
- artist: nome correto do artista
- cifra_text: texto completo da cifra com acordes, letras e marcadores de seção
- main_key: tonalidade principal (ex: "G", "Am", "C#m") — use null se não conseguir identificar
- capo: número da casa do capotraste (0 se não houver, null se desconhecido)
- tempo: BPM aproximado (número) ou null se desconhecido
- genre_style: um destes valores exatos: "sertanejo_raiz", "sertanejo_universitario", "sertanejo_romantico", "sertanejo_moderno", "sertanejo_modao", "pop_rock", ou null
- general_notes: observações gerais (capotraste, afinagem, dicas) ou string vazia`;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          artist: { type: 'string' },
          cifra_text: { type: 'string' },
          main_key: { type: ['string', 'null'] },
          capo: { type: ['number', 'null'] },
          tempo: { type: ['number', 'null'] },
          genre_style: {
            type: ['string', 'null'],
            enum: ['sertanejo_raiz', 'sertanejo_universitario', 'sertanejo_romantico', 'sertanejo_moderno', 'sertanejo_modao', 'pop_rock', null]
          },
          general_notes: { type: 'string' },
        },
        required: ['title', 'artist', 'cifra_text'],
      },
    });

    // Validação mínima do resultado
    if (!resultado || !resultado.cifra_text || resultado.cifra_text.trim().length < 30) {
      return Response.json({
        success: false,
        error: 'A IA não conseguiu encontrar uma cifra válida para esta música. Tente refinar o título/artista ou busque manualmente.',
      });
    }

    return Response.json({ success: true, data: resultado });
  } catch (error) {
    return Response.json({ error: error?.message || 'Erro interno ao buscar a cifra' }, { status: 500 });
  }
}