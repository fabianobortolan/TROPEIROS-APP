import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Circle, Clock, Target, BookOpen, Music2, Star, FileText, Printer, FolderOpen, Video, Headphones, Link2, Image as ImageIcon, Play } from "lucide-react";
import { motion } from "framer-motion";

const tipoIcone = {
  pdf: <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />,
  video: <Video className="w-5 h-5 text-blue-500 flex-shrink-0" />,
  audio: <Headphones className="w-5 h-5 text-purple-500 flex-shrink-0" />,
  link: <Link2 className="w-5 h-5 text-green-500 flex-shrink-0" />,
  imagem: <ImageIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />,
  outro: <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />,
};

export default function AulaDetalhes({ aula, progresso, onVoltar, onUpdateProgresso, isAdmin }) {
  const [notasAluno, setNotasAluno] = useState(progresso?.notas_aluno || "");
  const [exerciciosCompletos, setExerciciosCompletos] = useState(progresso?.exercicios_completados || []);
  const [avaliacao, setAvaliacao] = useState(progresso?.avaliacao || 0);

  const materialIds = aula.material_ids || [];
  const { data: materiais = [] } = useQuery({
    queryKey: ["materiais-aula", materialIds.join(",")],
    queryFn: async () => {
      const pagina = await base44.entities.MaterialDidatico.filter({ id: { $in: materialIds } }, { limit: 50 });
      return pagina.items || [];
    },
    enabled: materialIds.length > 0,
  });

  const musicaIds = aula.musicas_exemplo || [];
  const { data: musicasAula = [] } = useQuery({
    queryKey: ["musicas-aula", musicaIds.join(",")],
    queryFn: async () => {
      const pagina = await base44.entities.Song.filter({ id: { $in: musicaIds } }, { limit: 50 });
      return pagina.items || [];
    },
    enabled: musicaIds.length > 0,
  });

  const toggleExercicio = (index) => {
    const novosExercicios = exerciciosCompletos.includes(index)
      ? exerciciosCompletos.filter(i => i !== index)
      : [...exerciciosCompletos, index];
    
    setExerciciosCompletos(novosExercicios);
    onUpdateProgresso({ exercicios_completados: novosExercicios });
  };

  const concluirAula = () => {
    onUpdateProgresso({
      status: "concluida",
      data_conclusao: new Date().toISOString(),
      exercicios_completados: exerciciosCompletos,
      notas_aluno: notasAluno,
      avaliacao
    });
    setTimeout(onVoltar, 500);
  };

  const salvarNotas = () => {
    onUpdateProgresso({ notas_aluno: notasAluno });
  };

  const salvarAvaliacao = (nota) => {
    setAvaliacao(nota);
    onUpdateProgresso({ avaliacao: nota });
  };

  const progressoExercicios = aula.exercicios?.length 
    ? (exerciciosCompletos.length / aula.exercicios.length) * 100 
    : 0;

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <div className="flex gap-2 mb-4">
            <Button
              onClick={onVoltar}
              variant="outline"
              className="border-[#8B6F47] text-[#8B6F47]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>

          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl font-bold text-[#8B6F47]">Aula {aula.numero}</span>
                <Badge className="bg-[#8B6F47] text-white text-lg px-4 py-1">
                  {aula.nivel}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-[#8B6F47] mb-2">{aula.titulo}</h1>
              <p className="text-[#A68A64] text-lg">{aula.descricao}</p>
            </div>

            {progresso?.status !== "concluida" && (
              <Button
                onClick={concluirAula}
                disabled={progressoExercicios < 100}
                className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Concluir Aula
              </Button>
            )}
          </div>

          {/* Progresso */}
          {aula.exercicios?.length > 0 && (
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#8B6F47]">Progresso dos Exercícios</span>
                  <span className="text-sm font-bold text-[#8B6F47]">{Math.round(progressoExercicios)}%</span>
                </div>
                <Progress value={progressoExercicios} className="h-2" />
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Objetivos */}
        {aula.objetivos && aula.objetivos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6">
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader>
                <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Objetivos da Aula
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {aula.objetivos.map((objetivo, index) => (
                    <li key={index} className="flex items-start gap-2 text-[#8B6F47]">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{objetivo}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Teoria */}
        {aula.teoria?.topicos && aula.teoria.topicos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6">
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader>
                <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Conteúdo Teórico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {aula.teoria.topicos.map((topico, index) => (
                  <div key={index} className="pb-6 border-b border-[#E8DCC4] last:border-0 last:pb-0">
                    <h3 className="text-xl font-bold text-[#8B6F47] mb-3">{topico.titulo}</h3>
                    <div className="prose prose-lg max-w-none text-[#8B6F47] whitespace-pre-line mb-4">
                      {topico.conteudo}
                    </div>
                    {topico.exemplos && topico.exemplos.length > 0 && (
                      <div className="bg-[#F5F1E8] p-4 rounded-lg">
                        <p className="font-semibold text-[#8B6F47] mb-2">Exemplos:</p>
                        <ul className="space-y-1">
                          {topico.exemplos.map((exemplo, i) => (
                            <li key={i} className="text-[#8B6F47]">• {exemplo}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {aula.teoria.conceitos_chave && aula.teoria.conceitos_chave.length > 0 && (
                  <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#9CAF88]/20 p-4 rounded-lg">
                    <p className="font-bold text-[#8B6F47] mb-2">💡 Conceitos-Chave:</p>
                    <div className="flex flex-wrap gap-2">
                      {aula.teoria.conceitos_chave.map((conceito, i) => (
                        <Badge key={i} className="bg-[#8B6F47] text-white">
                          {conceito}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Exercícios */}
        {aula.exercicios && aula.exercicios.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6">
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader>
                <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                  <Music2 className="w-5 h-5" />
                  Exercícios Práticos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aula.exercicios.map((exercicio, index) => {
                  const completo = exerciciosCompletos.includes(index);
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        completo 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-[#D4C5B0] bg-white'
                      }`}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            onClick={() => toggleExercicio(index)}
                            className="mt-1">
                            {completo ? (
                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                            ) : (
                              <Circle className="w-6 h-6 text-[#A68A64]" />
                            )}
                          </button>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-[#8B6F47] mb-1">
                              {exercicio.titulo}
                            </h4>
                            <div className="flex items-center gap-3 mb-2 text-sm text-[#A68A64]">
                              <Badge className="bg-[#A68A64] text-white">
                                {exercicio.dificuldade}
                              </Badge>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {exercicio.tempo_pratica} min
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-[#8B6F47] mb-3 whitespace-pre-line">
                        {exercicio.instrucoes}
                      </p>

                      {exercicio.dicas && exercicio.dicas.length > 0 && (
                        <div className="bg-[#F5F1E8] p-3 rounded-lg">
                          <p className="font-semibold text-[#8B6F47] text-sm mb-2">💡 Dicas:</p>
                          <ul className="space-y-1">
                            {exercicio.dicas.map((dica, i) => (
                              <li key={i} className="text-sm text-[#8B6F47]">• {dica}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Músicas de Apoio (vinculadas ao plano) */}
        {musicasAula.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mb-6">
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader>
                <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                  <Music2 className="w-5 h-5" />
                  Músicas de Apoio
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {musicasAula.map((musica) => (
                  <div
                    key={musica.id}
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-[#D4C5B0] bg-white">
                    <Music2 className="w-5 h-5 text-[#8B6F47] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#8B6F47] text-sm truncate">{musica.title}</p>
                      <p className="text-xs text-[#A68A64] truncate">
                        {musica.artist}
                        {musica.main_key ? ` • Tom: ${musica.main_key}` : ""}
                        {musica.rhythm_name ? ` • ${musica.rhythm_name}` : ""}
                      </p>
                    </div>
                    {(musica.audio_url || musica.playback_url) && (
                      <a
                        href={musica.audio_url || musica.playback_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8B6F47] hover:bg-[#A68A64] text-white text-xs font-medium flex-shrink-0">
                        <Play className="w-3 h-3" />
                        Tocar
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Materiais de Apoio */}
        {materiais.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-6">
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader>
                <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  Materiais de Apoio
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {materiais.map((mat) => (
                  <a
                    key={mat.id}
                    href={mat.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-lg border-2 border-[#D4C5B0] bg-white hover:border-[#8B6F47] hover:bg-[#F5F1E8] transition-all">
                    {tipoIcone[mat.tipo] || tipoIcone.outro}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#8B6F47] text-sm">{mat.titulo}</p>
                      {mat.descricao && <p className="text-xs text-[#A68A64] line-clamp-2">{mat.descricao}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{mat.tipo}</Badge>
                  </a>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Notas do Aluno */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6">
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Suas Anotações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notasAluno}
                onChange={(e) => setNotasAluno(e.target.value)}
                placeholder="Anote suas dúvidas, observações e aprendizados..."
                className="min-h-32 border-[#D4C5B0]"
              />
              <Button
                onClick={salvarNotas}
                className="mt-3 bg-[#8B6F47] hover:bg-[#A68A64]">
                Salvar Anotações
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avaliação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6">
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <Star className="w-5 h-5" />
                Avalie esta Aula
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((nota) => (
                  <button
                    key={nota}
                    onClick={() => salvarAvaliacao(nota)}
                    className="transition-transform hover:scale-110">
                    <Star
                      className={`w-8 h-8 ${
                        nota <= avaliacao 
                          ? 'fill-[#D4AF37] text-[#D4AF37]' 
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}