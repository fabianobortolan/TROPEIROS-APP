// Portado do Base44 (base44/functions/gerarAulaPorTema) — só o cabeçalho e o fim mudaram.
// deno-lint-ignore-file no-explicit-any
import { createClientFromRequest } from './base44.ts';

function truncar(texto, max = 2000) {
  if (!texto || texto.length <= max) return texto || '';
  return texto.substring(0, max) + '...';
}

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
    prerequisitos: [],
    status: 'publicada'
  };
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { tema, nivel = 'intermediario', duracao_minutos = 75 } = body;

    if (!tema || tema.trim().length < 3) {
      return Response.json({ error: 'Tema inválido' }, { status: 400 });
    }

    // Busca contexto do sistema em paralelo
    const [progressoes, ritmos, estilos, acordes, referencias, aulasExistentes] = await Promise.all([
      base44.asServiceRole.entities.Progression.list(),
      base44.asServiceRole.entities.Rhythm.list(),
      base44.asServiceRole.entities.Style.list(),
      base44.asServiceRole.entities.Chord.list(),
      base44.asServiceRole.entities.ReferenceLibrary.list(),
      base44.asServiceRole.entities.Aula.list('numero')
    ]);

    // Materiais pedagógicos indexados
    const materiais = referencias.filter(ref =>
      ref.indexed && ref.extracted_content
    );

    // Cifras e cadernos
    let cadernos = [];
    try {
      const cadResp = await base44.asServiceRole.entities.CadernosCifras.list();
      cadernos = Array.isArray(cadResp) ? cadResp : (cadResp?.results || cadResp?.data || []);
    } catch (_) {}

    const resumoMateriais = materiais.length > 0
      ? materiais.map(ref =>
          `📚 "${ref.title}" (${ref.category}):\n${truncar(ref.extracted_content, 1800)}`
        ).join('\n\n---\n\n').substring(0, 5000)
      : 'Não há materiais de referência indexados. Use boas práticas pedagógicas de viola caipira.';

    const acordesNoSistema = acordes.slice(0, 30).map(a => `${a.name}(${a.instrument})`).join(', ');
    const cadenasNoSistema = cadernos.filter(c => c.processado && c.cifras_extraidas?.length > 0)
      .slice(0, 5)
      .map(c => `"${c.nome_caderno}" (${c.total_musicas || 0} músicas)`)
      .join(', ');

    const contextoSistema =
      `Ritmos cadastrados: ${ritmos.map(r => r.name).join(', ')}\n` +
      `Progressões: ${progressoes.slice(0, 10).map(p => `${p.name}(${p.pattern})`).join(', ')}\n` +
      `Estilos: ${estilos.map(s => s.name).join(', ')}\n` +
      `Acordes no sistema: ${acordesNoSistema}\n` +
      (cadenasNoSistema ? `Cadernos de cifras disponíveis: ${cadenasNoSistema}\n` : '');

    // Determina o próximo número de aula
    const aulasReais = aulasExistentes.filter(a => a.titulo !== '__GERANDO__');
    const proximoNumero = aulasReais.length > 0
      ? Math.max(...aulasReais.map(a => a.numero || 0)) + 1
      : 1;

    const NIVEL_LABELS = {
      'iniciante': 'Iniciante',
      'basico': 'Básico',
      'intermediario': 'Intermediário',
      'avancado': 'Avançado'
    };

    const parseList = (str) => str
      ? str.split('|').map(s => s.trim()).filter(Boolean)
      : [];

    const schemaAula = {
      type: "object",
      properties: {
        titulo: { type: "string" },
        descricao: { type: "string" },
        duracao_minutos: { type: "number" },
        nivel_sugerido: { type: "string" },
        topico1_titulo: { type: "string" },
        topico1_conteudo: { type: "string" },
        topico1_exemplos: { type: "string" },
        topico2_titulo: { type: "string" },
        topico2_conteudo: { type: "string" },
        topico2_exemplos: { type: "string" },
        topico3_titulo: { type: "string" },
        topico3_conteudo: { type: "string" },
        topico3_exemplos: { type: "string" },
        exercicio1_titulo: { type: "string" },
        exercicio1_instrucoes: { type: "string" },
        exercicio1_dicas: { type: "string" },
        exercicio2_titulo: { type: "string" },
        exercicio2_instrucoes: { type: "string" },
        exercicio2_dicas: { type: "string" },
        exercicio3_titulo: { type: "string" },
        exercicio3_instrucoes: { type: "string" },
        exercicio3_dicas: { type: "string" },
        objetivo1: { type: "string" },
        objetivo2: { type: "string" },
        objetivo3: { type: "string" },
        objetivo4: { type: "string" },
        conceitos_chave: { type: "string" }
      }
    };

    console.log(`🎯 Gerando aula sobre: "${tema}" | Nível: ${nivel}`);

    const prompt = `Você é um professor experiente de viola caipira, violão e música sertaneja brasileira.

=== MATERIAIS DE REFERÊNCIA DO SISTEMA ===
${resumoMateriais}

=== CONTEXTO DO SISTEMA ===
${contextoSistema}

=== INSTRUÇÕES ===
Crie uma aula completa, didática e detalhada sobre o tema: "${tema}"

Nível solicitado: ${NIVEL_LABELS[nivel]}
Duração sugerida: ${duracao_minutos} minutos
Número da aula: ${proximoNumero}

A aula deve:
- Se basear nos materiais de referência e cadernos do sistema quando relevante
- Ser progressiva: do conceito à prática
- Incluir exemplos práticos com acordes/progressões DO SISTEMA quando aplicável
- Ter exercícios práticos com instruções claras e passo a passo
- Usar linguagem acessível para o nível informado

Para os campos de lista (exemplos, dicas, conceitos_chave), separe os itens com " | " (pipe).
nivel_sugerido deve ser um de: iniciante, basico, intermediario, avancado`;

    const r = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schemaAula,
      model: 'gpt_5_mini'
    });

    const nivelFinal = ['iniciante', 'basico', 'intermediario', 'avancado'].includes(r.nivel_sugerido)
      ? r.nivel_sugerido
      : nivel;

    const aulaGerada = {
      numero: proximoNumero,
      nivel: nivelFinal,
      titulo: r.titulo || `Aula sobre ${tema}`,
      descricao: r.descricao || tema,
      duracao_minutos: Number(r.duracao_minutos) || duracao_minutos,
      teoria: {
        topicos: [
          r.topico1_titulo ? { titulo: r.topico1_titulo, conteudo: r.topico1_conteudo || '', exemplos: parseList(r.topico1_exemplos) } : null,
          r.topico2_titulo ? { titulo: r.topico2_titulo, conteudo: r.topico2_conteudo || '', exemplos: parseList(r.topico2_exemplos) } : null,
          r.topico3_titulo ? { titulo: r.topico3_titulo, conteudo: r.topico3_conteudo || '', exemplos: parseList(r.topico3_exemplos) } : null,
        ].filter(Boolean),
        conceitos_chave: parseList(r.conceitos_chave)
      },
      exercicios: [
        r.exercicio1_titulo ? { titulo: r.exercicio1_titulo, instrucoes: r.exercicio1_instrucoes || '', dificuldade: 'facil', tempo_pratica: 20, dicas: parseList(r.exercicio1_dicas) } : null,
        r.exercicio2_titulo ? { titulo: r.exercicio2_titulo, instrucoes: r.exercicio2_instrucoes || '', dificuldade: 'medio', tempo_pratica: 25, dicas: parseList(r.exercicio2_dicas) } : null,
        r.exercicio3_titulo ? { titulo: r.exercicio3_titulo, instrucoes: r.exercicio3_instrucoes || '', dificuldade: 'dificil', tempo_pratica: 30, dicas: parseList(r.exercicio3_dicas) } : null,
      ].filter(Boolean),
      objetivos: [r.objetivo1, r.objetivo2, r.objetivo3, r.objetivo4].filter(Boolean),
      prerequisitos: [],
      status: 'publicada'
    };

    const aulaFinal = sanitizarAula(aulaGerada);
    const aulaSalva = await base44.asServiceRole.entities.Aula.create(aulaFinal);

    console.log(`✅ Aula criada: "${aulaFinal.titulo}" (ID: ${aulaSalva.id})`);
    return Response.json({ success: true, aula: aulaSalva });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
