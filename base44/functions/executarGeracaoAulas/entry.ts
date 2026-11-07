import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function truncar(texto, max = 1500) {
  if (!texto || texto.length <= max) return texto || '';
  return texto.substring(0, max) + '...';
}

// Garante que teoria.topicos seja sempre array de objetos válidos
function sanitizarAula(aula) {
  const topicos = [];
  if (aula.teoria?.topicos && Array.isArray(aula.teoria.topicos)) {
    for (const t of aula.teoria.topicos) {
      if (t && typeof t === 'object' && t.titulo) {
        topicos.push({
          titulo: String(t.titulo || ''),
          conteudo: String(t.conteudo || ''),
          exemplos: Array.isArray(t.exemplos) ? t.exemplos.filter(e => typeof e === 'string') : []
        });
      }
    }
  }

  const exercicios = [];
  if (aula.exercicios && Array.isArray(aula.exercicios)) {
    for (const ex of aula.exercicios) {
      if (ex && typeof ex === 'object' && ex.titulo) {
        exercicios.push({
          titulo: String(ex.titulo || ''),
          instrucoes: String(ex.instrucoes || ''),
          dificuldade: ['facil', 'medio', 'dificil'].includes(ex.dificuldade) ? ex.dificuldade : 'facil',
          tempo_pratica: Number(ex.tempo_pratica) || 15,
          dicas: Array.isArray(ex.dicas) ? ex.dicas.filter(d => typeof d === 'string') : []
        });
      }
    }
  }

  return {
    numero: Number(aula.numero) || 1,
    titulo: String(aula.titulo || ''),
    descricao: String(aula.descricao || ''),
    nivel: ['iniciante', 'basico', 'intermediario', 'avancado'].includes(aula.nivel) ? aula.nivel : 'iniciante',
    duracao_minutos: Number(aula.duracao_minutos) || 60,
    teoria: {
      topicos,
      conceitos_chave: Array.isArray(aula.teoria?.conceitos_chave)
        ? aula.teoria.conceitos_chave.filter(c => typeof c === 'string')
        : []
    },
    exercicios,
    objetivos: Array.isArray(aula.objetivos) ? aula.objetivos.filter(o => typeof o === 'string') : [],
    prerequisitos: Array.isArray(aula.prerequisitos) ? aula.prerequisitos.filter(p => typeof p === 'number') : [],
    status: 'publicada'
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verifica se há o marcador de geração pendente
    const todasAulas = await base44.asServiceRole.entities.Aula.list();
    const marcador = todasAulas.find(a => a.titulo === '__GERANDO__');

    if (!marcador) {
      console.log('ℹ️ Nenhum job pendente encontrado.');
      return Response.json({ skipped: true });
    }

    // Remove o marcador IMEDIATAMENTE para evitar execuções duplicadas
    await base44.asServiceRole.entities.Aula.delete(marcador.id);
    console.log('🚀 Marcador removido. Iniciando geração...');

    // Busca dados do sistema em paralelo
    const [progressoes, ritmos, estilos, referencias] = await Promise.all([
      base44.asServiceRole.entities.Progression.list(),
      base44.asServiceRole.entities.Rhythm.list(),
      base44.asServiceRole.entities.Style.list(),
      base44.asServiceRole.entities.ReferenceLibrary.list()
    ]);

    // Materiais pedagógicos disponíveis
    const materiais = referencias.filter(ref =>
      ref.indexed && ref.extracted_content &&
      (ref.category === 'plano_aulas' || ref.tags?.includes('plano_aulas'))
    );

    console.log(`📚 Materiais pedagógicos: ${materiais.length}`);

    const resumoMateriais = materiais.length > 0
      ? materiais.map(ref =>
          `📚 "${ref.title}":\n${truncar(ref.extracted_content, 1500)}`
        ).join('\n\n---\n\n').substring(0, 4000)
      : 'Use metodologia padrão de viola caipira.';

    const contextoSistema =
      `Ritmos disponíveis: ${ritmos.map(r => r.name).join(', ')}\n` +
      `Progressões: ${progressoes.slice(0, 8).map(p => `${p.name}(${p.pattern})`).join(', ')}\n` +
      `Estilos: ${estilos.map(s => s.name).join(', ')}`;

    // Definição do currículo: 12 aulas com níveis
    const curriculoDefinicao = [
      { numero: 2, nivel: 'iniciante', tema: 'Partes do instrumento, como afinar, primeira nota' },
      { numero: 3, nivel: 'iniciante', tema: 'Ritmo básico: aprender o pulso, guarânia simples' },
      { numero: 4, nivel: 'iniciante', tema: 'Primeiros acordes: G e C (ou equivalentes na viola)' },
      { numero: 5, nivel: 'basico', tema: 'Acorde de D7 e primeira progressão I-IV-V-I' },
      { numero: 6, nivel: 'basico', tema: 'Ritmo rancheira, vanera ou sertanejo básico' },
      { numero: 7, nivel: 'basico', tema: 'Introdução a cifras: como lê-las e tocá-las' },
      { numero: 8, nivel: 'intermediario', tema: 'Pestana: técnica e exercícios progressivos' },
      { numero: 9, nivel: 'intermediario', tema: 'Campo harmônico maior: entender e aplicar' },
      { numero: 10, nivel: 'intermediario', tema: 'Progressões típicas do sertanejo raiz' },
      { numero: 11, nivel: 'intermediario', tema: 'Improvisação básica: pentatônica e fraseado' },
      { numero: 12, nivel: 'avancado', tema: 'Modulação e variações harmônicas avançadas' },
      { numero: 13, nivel: 'avancado', tema: 'Arranjo completo de música sertaneja do início ao fim' },
    ];

    // Schema simples por aula individual
    const schemaAula = {
      type: "object",
      properties: {
        titulo: { type: "string" },
        descricao: { type: "string" },
        duracao_minutos: { type: "number" },
        topico1_titulo: { type: "string" },
        topico1_conteudo: { type: "string" },
        topico1_exemplos: { type: "string" },
        topico2_titulo: { type: "string" },
        topico2_conteudo: { type: "string" },
        topico2_exemplos: { type: "string" },
        exercicio1_titulo: { type: "string" },
        exercicio1_instrucoes: { type: "string" },
        exercicio1_dicas: { type: "string" },
        exercicio2_titulo: { type: "string" },
        exercicio2_instrucoes: { type: "string" },
        exercicio2_dicas: { type: "string" },
        objetivo1: { type: "string" },
        objetivo2: { type: "string" },
        objetivo3: { type: "string" },
        conceitos_chave: { type: "string" }
      }
    };

    // Aula 01 estática (fundamentos)
    const aula01 = {
      numero: 1,
      titulo: "Introdução à Música — Os Três Pilares",
      descricao: "Aula inaugural sobre melodia, harmonia e ritmo. Propriedades do som e postura correta para iniciar os estudos na viola caipira.",
      nivel: "iniciante",
      duracao_minutos: 60,
      teoria: {
        topicos: [
          {
            titulo: "Os Três Pilares da Música",
            conteudo: "Melodia é a sequência de notas — o que você assobia. Harmonia são notas simultâneas formando acordes. Ritmo é a organização dos sons no tempo. Esses três elementos juntos formam toda música que você já ouviu.",
            exemplos: ["Melodia: linha vocal de 'Romaria' de Renato Teixeira", "Harmonia: acorde G (Sol) no violão", "Ritmo: padrão guarânia ↓↑↓↑"]
          },
          {
            titulo: "Postura Correta",
            conteudo: "Coluna ereta, pés no chão, instrumento apoiado na coxa direita. Polegar esquerdo atrás do braço do instrumento, sem enrolar. Mão direita relaxada. Faça pausas a cada 20 minutos para evitar lesões.",
            exemplos: ["Polegar nunca deve enrolar no braço", "Ombros relaxados durante toda a prática", "Use um espelho para verificar a postura"]
          }
        ],
        conceitos_chave: ["Melodia", "Harmonia", "Ritmo", "Postura", "Percepção auditiva"]
      },
      exercicios: [
        {
          titulo: "Escuta Ativa com Análise",
          instrucoes: "Escolha uma música sertaneja que você goste. Ouça 3 vezes: na 1ª preste atenção só na melodia (linha vocal), na 2ª tente identificar quando os acordes mudam, na 3ª bata o pé no pulso.",
          dificuldade: "facil",
          tempo_pratica: 20,
          dicas: ["Feche os olhos para se concentrar melhor", "Use fone de ouvido para ouvir detalhes", "Tente contar o compasso: 1-2-3-4"]
        },
        {
          titulo: "Postura sem Instrumento",
          instrucoes: "Sente em uma cadeira sem encosto. Coluna ereta, pés no chão. Simule a posição de segurar o instrumento por 5 minutos verificando todos os pontos de postura. Depois segure o instrumento real sem tocar.",
          dificuldade: "facil",
          tempo_pratica: 10,
          dicas: ["Use um espelho de corpo inteiro se possível", "Se sentir tensão nos ombros, solte", "A postura deve ser confortável, não rígida"]
        }
      ],
      objetivos: [
        "Compreender os três pilares da música: melodia, harmonia e ritmo",
        "Adotar postura correta ao segurar o instrumento",
        "Desenvolver percepção auditiva básica através da escuta ativa"
      ],
      prerequisitos: [],
      status: "publicada"
    };

    const NIVEL_LABELS = {
      'iniciante': 'Iniciante',
      'basico': 'Básico',
      'intermediario': 'Intermediário',
      'avancado': 'Avançado'
    };

    const parseList = (str) => str
      ? str.split('|').map(s => s.trim()).filter(Boolean)
      : [];

    // Gera todas as aulas EM PARALELO para ser muito mais rápido
    console.log(`📝 Gerando ${curriculoDefinicao.length} aulas em paralelo...`);

    const promessas = curriculoDefinicao.map(async (def) => {
      const prompt = `Você é professor experiente de viola caipira e música sertaneja.

MATERIAIS DE REFERÊNCIA:
${resumoMateriais}

CONTEXTO DO SISTEMA:
${contextoSistema}

Crie a Aula ${def.numero} de um curso de viola caipira.
Tema: ${def.tema}
Nível: ${NIVEL_LABELS[def.nivel]}
Duração: ${def.nivel === 'iniciante' || def.nivel === 'basico' ? '60-75' : '75-90'} minutos

Seja detalhado e prático. Campos de lista (exemplos, dicas, conceitos_chave) use valores separados por " | ".`;

      const r = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schemaAula,
        model: 'gpt_5_mini'
      });

      const aula = {
        numero: def.numero,
        nivel: def.nivel,
        titulo: r.titulo || `Aula ${def.numero} — ${def.tema}`,
        descricao: r.descricao || def.tema,
        duracao_minutos: Number(r.duracao_minutos) || 70,
        teoria: {
          topicos: [
            r.topico1_titulo ? {
              titulo: r.topico1_titulo,
              conteudo: r.topico1_conteudo || '',
              exemplos: parseList(r.topico1_exemplos)
            } : null,
            r.topico2_titulo ? {
              titulo: r.topico2_titulo,
              conteudo: r.topico2_conteudo || '',
              exemplos: parseList(r.topico2_exemplos)
            } : null,
          ].filter(Boolean),
          conceitos_chave: parseList(r.conceitos_chave)
        },
        exercicios: [
          r.exercicio1_titulo ? {
            titulo: r.exercicio1_titulo,
            instrucoes: r.exercicio1_instrucoes || '',
            dificuldade: 'facil',
            tempo_pratica: 20,
            dicas: parseList(r.exercicio1_dicas)
          } : null,
          r.exercicio2_titulo ? {
            titulo: r.exercicio2_titulo,
            instrucoes: r.exercicio2_instrucoes || '',
            dificuldade: 'medio',
            tempo_pratica: 20,
            dicas: parseList(r.exercicio2_dicas)
          } : null,
        ].filter(Boolean),
        objetivos: [r.objetivo1, r.objetivo2, r.objetivo3].filter(Boolean),
        prerequisitos: def.numero > 2 ? [def.numero - 1] : [],
        status: 'publicada'
      };

      console.log(`✅ Aula ${def.numero} gerada: ${aula.titulo}`);
      return sanitizarAula(aula);
    });

    const aulasGeradasParalelo = await Promise.all(promessas);

    // Ordena por número
    const aulasGeradas = [aula01, ...aulasGeradasParalelo].sort((a, b) => a.numero - b.numero);

    console.log(`✅ ${aulasGeradas.length} aulas geradas. Salvando no banco...`);

    // Remove aulas antigas e salva novas
    const aulasExistentes = await base44.asServiceRole.entities.Aula.list();
    if (aulasExistentes.length > 0) {
      await Promise.all(aulasExistentes.map(a => base44.asServiceRole.entities.Aula.delete(a.id)));
    }
    await base44.asServiceRole.entities.Aula.bulkCreate(aulasGeradas);

    console.log(`🎉 Plano criado com sucesso: ${aulasGeradas.length} aulas.`);
    return Response.json({ success: true, total_aulas: aulasGeradas.length });

  } catch (error) {
    console.error('Erro na geração:', error.message);
    // Tenta remover o marcador para desbloquear o sistema
    try {
      const base44b = createClientFromRequest(req);
      const aulas = await base44b.asServiceRole.entities.Aula.list();
      const marcador = aulas.find(a => a.titulo === '__GERANDO__');
      if (marcador) await base44b.asServiceRole.entities.Aula.delete(marcador.id);
    } catch (_) {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});