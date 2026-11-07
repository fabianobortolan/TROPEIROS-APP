import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";

const estruturaSchema = {
  type: "object",
  properties: {
    aulas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          numero: { type: "number" },
          titulo: { type: "string" },
          descricao: { type: "string" },
          nivel: { type: "string", enum: ["iniciante", "basico", "intermediario", "avancado"] },
          duracao_minutos: { type: "number" },
          objetivos: { type: "array", items: { type: "string" } }
        },
        required: ["numero", "titulo", "descricao", "nivel", "duracao_minutos", "objetivos"]
      }
    }
  },
  required: ["aulas"]
};

const detalheSchema = {
  type: "object",
  properties: {
    teoria: {
      type: "object",
      properties: {
        topicos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              conteudo: { type: "string" },
              exemplos: { type: "array", items: { type: "string" } }
            },
            required: ["titulo", "conteudo"]
          }
        },
        conceitos_chave: { type: "array", items: { type: "string" } }
      },
      required: ["topicos", "conceitos_chave"]
    },
    exercicios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          instrucoes: { type: "string" },
          dificuldade: { type: "string", enum: ["facil", "medio", "dificil"] },
          tempo_pratica: { type: "number" },
          dicas: { type: "array", items: { type: "string" } }
        },
        required: ["titulo", "instrucoes", "dificuldade", "tempo_pratica", "dicas"]
      }
    },
    musicas_selecionadas: { type: "array", items: { type: "string" } }
  },
  required: ["teoria", "exercicios"]
};

export default function RegenerarPlanoIA({ onFechar, onConcluido }) {
  const queryClient = useQueryClient();
  const [fase, setFase] = useState("confirmar"); // confirmar | gerando | concluido | erro
  const [atual, setAtual] = useState(0);
  const [total, setTotal] = useState(0);
  const [tituloAtual, setTituloAtual] = useState("");
  const [geradas, setGeradas] = useState([]);
  const [falhas, setFalhas] = useState([]);
  const [erroMsg, setErroMsg] = useState("");

  const iniciar = async () => {
    setFase("gerando");
    try {
      // Biblioteca de músicas para associação
      const pagina = await base44.entities.Song.filter(
        {},
        { sort: "title", limit: 1000, fields: ["title", "artist", "main_key", "rhythm_name"] }
      );
      const musicas = pagina.items || [];
      const listaMusicas = musicas
        .map((m) => `${m.id} | ${m.title} | ${m.artist || "-"} | Tom: ${m.main_key || "-"} | Ritmo: ${m.rhythm_name || "-"}`)
        .join("\n");

      // FASE 1 — Estrutura gradual do plano
      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um professor sênior de violão/guitarra com especialização em música sertaneja brasileira. Monte a estrutura completa de um plano de ensino com EXATAMENTE 12 aulas graduais, para alunos de uma escola de música (violão/guitarra), focada em música sertaneja (raiz, moda de viola, vanera, guarânia, rancheira) com abertura para pop/rock quando didaticamente útil.

REQUISITOS DO PLANO:
- Progressão gradual real: comece em iniciante absoluto (postura, afinação, primeiros acordes) e avance até nível avançado (harmonia avançada, improvisação, montagem de repertório).
- Distribua os níveis organicamente (iniciante, basico, intermediario, avancado) — não existe "salto": cada aula deve preparar a próxima.
- Cada aula tem numero (1 a 12), titulo criativo e claro, descricao de 2-3 frases explicando o propósito pedagógico, duracao_minutos realista (60 a 120), e 3 a 5 objetivos concretos e verificáveis ("Ao final o aluno será capaz de...").
- Misture gradualmente: técnica (mão direita/indirecta, palhetada, dedilhado, pestana), teoria (acordes, campo harmônico, ciclos, transposição), leitura de cifra, ritmos sertanejos (batida simples, vanera, guarânia, rancheira, toada), repertório e percepção auditiva.`,
        response_json_schema: estruturaSchema,
      });

      const estrutura = resultado.aulas || [];
      setTotal(estrutura.length);
      if (estrutura.length === 0) throw new Error("A IA não retornou aulas.");

      // Limpa plano e progressos antigos (usuário já confirmou)
      await base44.entities.Aula.deleteMany({});
      await base44.entities.ProgressoAluno.deleteMany({});

      // FASE 2 — Conteúdo rico aula por aula
      const novasFalhas = [];
      for (const aula of estrutura) {
        setAtual(aula.numero);
        setTituloAtual(aula.titulo);
        try {
          const detalhe = await base44.integrations.Core.InvokeLLM({
            prompt: `Você é um professor sênior de violão/guitarra sertaneja. Crie o conteúdo COMPLETO e RICO da Aula ${aula.numero}: "${aula.titulo}" (${aula.nivel}, ${aula.duracao_minutos} min).

Descrição da aula: ${aula.descricao}
Objetivos da aula: ${aula.objetivos.join("; ")}

CONTEÚDO TEÓRICO (3 a 5 tópicos):
- Cada tópico tem título claro e "conteudo" com 300 a 500 palavras de explicação didática, gradual e acessível, em português brasileiro.
- Use linguagem concreta para violão/guitarra: nomeie casas (trastes), dedos (polegar, indicador, médio, anelar, mínimo), cordas (6ª a 1ª) e explicações passo a passo.
- Use analogias do cotidiano caipira/rural quando ajudar (ex: batida como "trotar de cavalo" na vanera).
- Inclua no mínimo 2 exemplos práticos por tópico no campo "exemplos" (sequências de acordes, exercícios concretos, músicas de referência).
- Terminologia harmônica correta: campo harmônico, graus (I, ii, iii, IV, V, vi), tônica, dominante, subdominante.

EXERCÍCIOS (4 a 6 por aula):
- Cada um com instruções passo a passo detalhadas (4 a 10 passos numerados dentro do texto), dificuldade coerente com o nível da aula, tempo_pratica entre 5 e 20 minutos, e 2 a 4 dicas práticas (postura, relaxamento, metrônomo, erros comuns).

MÚSICAS DE APOIO:
- Abaixo está a biblioteca de músicas da escola, uma por linha: id | título | artista | tom | ritmo.
- Escolha de 1 a 3 músicas cujo nível e conteúdo combinem com ESTA aula (use músicas mais simples nas aulas iniciais) e retorne os IDs em musicas_selecionadas. Se nenhuma combina bem, retorne lista vazia.

BIBLIOTECA:
${listaMusicas}

Retorne APENAS o JSON com o formato solicitado.`,
            response_json_schema: detalheSchema,
          });

          await base44.entities.Aula.create({
            numero: aula.numero,
            titulo: aula.titulo,
            descricao: aula.descricao,
            nivel: aula.nivel,
            duracao_minutos: aula.duracao_minutos,
            teoria: detalhe.teoria || { topicos: [], conceitos_chave: [] },
            exercicios: detalhe.exercicios || [],
            objetivos: aula.objetivos || [],
            musicas_exemplo: detalhe.musicas_selecionadas || [],
            material_ids: [],
            prerequisitos: [],
            status: "publicada",
          });
          setGeradas((g) => [...g, aula]);
        } catch (e) {
          novasFalhas.push(`Aula ${aula.numero} - ${aula.titulo}: ${e.message || "erro desconhecido"}`);
          setFalhas([...novasFalhas]);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["aulas"] });
      queryClient.invalidateQueries({ queryKey: ["aulas-associacao"] });
      setFase("concluido");
    } catch (e) {
      setErroMsg(e.message || "Erro desconhecido");
      setFase("erro");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      style={{ zIndex: 90 }}>
      <Card className="w-full max-w-2xl bg-white border-[#D4C5B0] max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Regenerar Plano de Aulas com IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fase === "confirmar" && (
            <div className="space-y-4">
              <p className="text-[#8B6F47]">
                A IA vai criar um plano de ensino novo com <strong>12 aulas graduais</strong>, mantendo o mesmo formato
                (objetivos, teoria detalhada, exercícios práticos e músicas de apoio), mas com conteúdo técnico e
                didático muito mais profundo — do iniciante absoluto ao avançado.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> todas as aulas atuais e o progresso dos alunos serão
                  <strong> apagados e substituídos</strong>. Esta ação não pode ser desfeita.
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-700">
                O processo faz várias chamadas de IA (usa créditos de integração) e leva alguns minutos. Deixe esta
                janela aberta até o fim.
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onFechar} className="border-[#8B6F47] text-[#8B6F47]">
                  Cancelar
                </Button>
                <Button
                  onClick={iniciar}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Novo Plano
                </Button>
              </div>
            </div>
          )}

          {fase === "gerando" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-5 h-5 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                  <span className="text-sm font-bold text-[#8B6F47]">
                    Gerando Aula {atual} de {total}
                  </span>
                </div>
                <span className="text-sm text-[#A68A64]">{Math.round((atual / Math.max(total, 1)) * 100)}%</span>
              </div>
              <Progress value={(atual / Math.max(total, 1)) * 100} className="h-3" />
              <p className="text-sm text-[#8B6F47] font-medium">{tituloAtual}</p>
              {geradas.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 border border-[#D4C5B0] rounded-lg p-3 bg-[#F5F1E8]/50">
                  {geradas.map((g) => (
                    <div key={g.numero} className="flex items-center gap-2 text-sm text-[#8B6F47]">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Aula {g.numero} — {g.titulo}
                    </div>
                  ))}
                </div>
              )}
              {falhas.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {falhas.map((f, i) => (
                    <div key={i}>⚠️ {f}</div>
                  ))}
                </div>
              )}
              <p className="text-xs text-[#A68A64]">
                Não feche esta janela — o processo continua automaticamente aula por aula.
              </p>
            </div>
          )}

          {fase === "concluido" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
                <CheckCircle2 className="w-6 h-6" />
                Plano regenerado com sucesso!
              </div>
              <p className="text-[#8B6F47] text-sm">
                {geradas.length} aulas criadas com conteúdo completo
                {falhas.length > 0 ? ` (${falhas.length} aula(s) falharam e podem ser refeitas individualmente)` : ""}.
                As músicas escolhidas pela IA já estão vinculadas como material de apoio de cada aula.
              </p>
              {falhas.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {falhas.map((f, i) => (
                    <div key={i}>⚠️ {f}</div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={onConcluido || onFechar}
                  className="bg-[#8B6F47] hover:bg-[#A68A64] text-white">
                  Ver Plano de Aulas
                </Button>
              </div>
            </div>
          )}

          {fase === "erro" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-700 font-bold">
                <AlertTriangle className="w-6 h-6" />
                Erro ao gerar o plano
              </div>
              <p className="text-sm text-[#8B6F47]">{erroMsg}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onFechar} className="border-[#8B6F47] text-[#8B6F47]">
                  Fechar
                </Button>
                <Button onClick={iniciar} className="bg-purple-600 hover:bg-purple-700 text-white">
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}