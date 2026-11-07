import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Printer, GraduationCap, Clock, Target, BookOpen, Lightbulb, CheckCircle2, List, ChevronRight } from "lucide-react";

const nivelColors = {
  iniciante: "#22c55e",
  basico: "#3b82f6",
  intermediario: "#eab308",
  avancado: "#ef4444",
};

const nivelLabels = {
  iniciante: "Iniciante",
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

const dificuldadeLabel = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };

export default function AulaVisualizacao({ aula, onClose }) {
  const handlePrint = () => {
    const printContent = document.getElementById("aula-print-content").innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8"/>
        <title>Aula ${aula.numero} - ${aula.titulo}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Georgia', serif; color: #1a1a1a; background: #fff; padding: 20px; }
          @page { margin: 15mm 20mm; size: A4; }
          .header { border-bottom: 3px solid #8B6F47; padding-bottom: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; justify-content: space-between; }
          .header-left h1 { font-size: 26px; color: #8B6F47; font-weight: bold; }
          .header-left .subtitle { font-size: 14px; color: #A68A64; margin-top: 4px; }
          .nivel-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; font-size: 12px; font-weight: bold; margin-top: 8px; }
          .meta { display: flex; gap: 20px; margin-bottom: 24px; padding: 12px 16px; background: #F5F1E8; border-radius: 8px; border-left: 4px solid #D4AF37; }
          .meta-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #8B6F47; font-weight: 600; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 16px; font-weight: bold; color: #8B6F47; border-bottom: 1px solid #D4C5B0; padding-bottom: 6px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
          .descricao { font-size: 14px; line-height: 1.7; color: #333; background: #fafaf8; padding: 12px; border-radius: 6px; }
          .list-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 14px; line-height: 1.5; }
          .bullet { width: 20px; height: 20px; border-radius: 50%; background: #8B6F47; color: white; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; font-weight: bold; }
          .exercicio-card { border: 1px solid #D4C5B0; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #fff; }
          .exercicio-titulo { font-weight: bold; font-size: 14px; color: #8B6F47; margin-bottom: 6px; }
          .exercicio-instrucoes { font-size: 13px; color: #444; line-height: 1.6; }
          .exercicio-dica { margin-top: 6px; font-size: 12px; color: #A68A64; font-style: italic; }
          .dificuldade-badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-bottom: 6px; font-weight: bold; }
          .dif-facil { background: #dcfce7; color: #166534; }
          .dif-medio { background: #fef9c3; color: #854d0e; }
          .dif-dificil { background: #fee2e2; color: #991b1b; }
          .topico-card { border-left: 3px solid #D4AF37; padding: 10px 12px; margin-bottom: 10px; background: #fffef5; border-radius: 0 6px 6px 0; }
          .topico-titulo { font-weight: bold; font-size: 14px; color: #8B6F47; margin-bottom: 4px; }
          .topico-conteudo { font-size: 13px; color: #444; line-height: 1.6; }
          .footer { margin-top: 40px; border-top: 1px solid #D4C5B0; padding-top: 12px; text-align: center; font-size: 12px; color: #A68A64; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${printContent}
        <div class="footer">
          Tropeiros do Bebedouro • Plano de Aulas • Aula ${aula.numero} de ${aula.titulo}
        </div>
        <script>window.onload = () => window.print();<\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const nivelColor = nivelColors[aula.nivel] || "#8B6F47";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="font-bold text-[#8B6F47] text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Visualizar Aula
          </h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div id="aula-print-content">
            {/* Header */}
            <div className="header" style={{ borderBottom: `3px solid ${nivelColor}`, paddingBottom: 16, marginBottom: 24 }}>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: nivelColor }}>
                  Aula {aula.numero}: {aula.titulo}
                </h1>
                <p className="text-sm text-gray-500 mt-1">Tropeiros do Bebedouro — Plano de Aulas</p>
                <span className="nivel-badge text-white text-xs px-3 py-1 rounded-full font-bold mt-2 inline-block" style={{ background: nivelColor }}>
                  {nivelLabels[aula.nivel] || aula.nivel}
                </span>
              </div>
              <div className="text-right text-sm text-gray-400 flex flex-col items-end gap-1">
                {aula.duracao_minutos && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {aula.duracao_minutos} min</span>
                )}
                {aula.status && (
                  <span className="text-xs capitalize">{aula.status}</span>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 mb-6 p-3 rounded-xl border border-[#D4C5B0] bg-[#F5F1E8]">
              {aula.duracao_minutos && (
                <div className="flex items-center gap-2 text-sm text-[#8B6F47] font-semibold">
                  <Clock className="w-4 h-4" /> {aula.duracao_minutos} minutos
                </div>
              )}
              {aula.exercicios?.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-[#8B6F47] font-semibold">
                  <BookOpen className="w-4 h-4" /> {aula.exercicios.length} exercício(s)
                </div>
              )}
              {aula.objetivos?.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-[#8B6F47] font-semibold">
                  <Target className="w-4 h-4" /> {aula.objetivos.length} objetivo(s)
                </div>
              )}
            </div>

            {/* Descrição */}
            {aula.descricao && (
              <div className="section mb-6">
                <h3 className="section-title font-bold text-[#8B6F47] border-b border-[#D4C5B0] pb-2 mb-3 flex items-center gap-2">
                  <List className="w-4 h-4" /> Descrição
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed bg-[#fafaf8] p-3 rounded-lg">{aula.descricao}</p>
              </div>
            )}

            {/* Objetivos */}
            {aula.objetivos?.length > 0 && (
              <div className="section mb-6">
                <h3 className="font-bold text-[#8B6F47] border-b border-[#D4C5B0] pb-2 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Objetivos da Aula
                </h3>
                <ul className="space-y-2">
                  {aula.objetivos.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Teoria */}
            {aula.teoria?.topicos?.length > 0 && (
              <div className="section mb-6">
                <h3 className="font-bold text-[#8B6F47] border-b border-[#D4C5B0] pb-2 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Conteúdo Teórico
                </h3>
                <div className="space-y-3">
                  {aula.teoria.topicos.map((topico, i) => (
                    <div key={i} className="border-l-4 border-[#D4AF37] pl-3 py-1 bg-[#fffef5] rounded-r-lg">
                      <p className="font-bold text-sm text-[#8B6F47]">{topico.titulo}</p>
                      {topico.conteudo && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{topico.conteudo}</p>}
                      {topico.exemplos?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-[#A68A64] mb-1">Exemplos:</p>
                          <ul className="space-y-1">
                            {topico.exemplos.map((ex, j) => (
                              <li key={j} className="text-xs text-gray-600 flex items-start gap-1">
                                <ChevronRight className="w-3 h-3 text-[#D4AF37] flex-shrink-0 mt-0.5" />{ex}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {aula.teoria.conceitos_chave?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {aula.teoria.conceitos_chave.map((c, i) => (
                      <span key={i} className="text-xs bg-[#8B6F47]/10 text-[#8B6F47] px-2 py-1 rounded-full font-medium">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Exercícios */}
            {aula.exercicios?.length > 0 && (
              <div className="section mb-6">
                <h3 className="font-bold text-[#8B6F47] border-b border-[#D4C5B0] pb-2 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Exercícios Práticos
                </h3>
                <div className="space-y-4">
                  {aula.exercicios.map((ex, i) => (
                    <div key={i} className="border border-[#D4C5B0] rounded-xl p-4 bg-white">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-bold text-[#8B6F47] text-sm">{i + 1}. {ex.titulo}</p>
                        {ex.dificuldade && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                            ex.dificuldade === 'facil' ? 'bg-green-100 text-green-700' :
                            ex.dificuldade === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {dificuldadeLabel[ex.dificuldade] || ex.dificuldade}
                          </span>
                        )}
                      </div>
                      {ex.tempo_pratica && (
                        <p className="text-xs text-[#A68A64] mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {ex.tempo_pratica} min
                        </p>
                      )}
                      {ex.instrucoes && <p className="text-sm text-gray-700 leading-relaxed">{ex.instrucoes}</p>}
                      {ex.dicas?.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-semibold text-[#A68A64] flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Dicas:</p>
                          {ex.dicas.map((dica, j) => (
                            <p key={j} className="text-xs text-gray-600 pl-4 italic">• {dica}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pré-requisitos */}
            {aula.prerequisitos?.length > 0 && (
              <div className="section mb-4">
                <h3 className="font-bold text-[#8B6F47] border-b border-[#D4C5B0] pb-2 mb-3 text-sm">Pré-requisitos</h3>
                <p className="text-sm text-gray-600">Aulas: {aula.prerequisitos.join(", ")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}