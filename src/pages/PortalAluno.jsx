import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, BookOpen, Calendar, Music, FileText, Video, Link2,
  Download, Star, Clock, Users, GraduationCap, Headphones,
  Image, File
} from "lucide-react";
import { format, isSameMonth, parseISO } from "date-fns";
import { parseLocalDate } from "@/utils/dateUtils";
import { ptBR } from "date-fns/locale";

const tipoIcone = {
  pdf: <FileText className="w-5 h-5 text-red-500" />,
  video: <Video className="w-5 h-5 text-blue-500" />,
  audio: <Headphones className="w-5 h-5 text-purple-500" />,
  link: <Link2 className="w-5 h-5 text-green-500" />,
  imagem: <Image className="w-5 h-5 text-yellow-500" />,
  outro: <File className="w-5 h-5 text-gray-500" />,
};

const tipoLabel = {
  pdf: "PDF",
  video: "Vídeo",
  audio: "Áudio",
  link: "Link",
  imagem: "Imagem",
  outro: "Outro",
};

const nivelCor = {
  iniciante: "bg-green-100 text-green-800",
  basico: "bg-blue-100 text-blue-800",
  intermediario: "bg-yellow-100 text-yellow-800",
  avancado: "bg-red-100 text-red-800",
};

const diasSemana = {
  segunda: "Segunda", terca: "Terça", quarta: "Quarta",
  quinta: "Quinta", sexta: "Sexta", sabado: "Sábado", domingo: "Domingo"
};

const eventTipoCor = {
  aula: "bg-blue-500",
  recital: "bg-purple-500",
  workshop: "bg-orange-500",
  avaliacao: "bg-red-500",
  reuniao: "bg-gray-500",
  outro: "bg-teal-500",
};

export default function PortalAluno() {
  const [currentUser, setCurrentUser] = useState(null);
  const [mesAtual, setMesAtual] = useState(new Date());

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Busca o registro do aluno pelo email do usuário logado
  const { data: alunoData } = useQuery({
    queryKey: ["aluno-portal", currentUser?.email],
    queryFn: () => base44.entities.Aluno.filter({ email: currentUser.email }),
    enabled: !!currentUser?.email,
    select: (data) => data?.[0] || null,
  });

  // Busca turma do aluno
  const { data: turmaData } = useQuery({
    queryKey: ["turma-portal", alunoData?.turma_id],
    queryFn: () => base44.entities.Turma.filter({ id: alunoData.turma_id }),
    enabled: !!alunoData?.turma_id,
    select: (data) => data?.[0] || null,
  });

  // Materiais disponíveis para a turma do aluno (ou para todos)
  const { data: materiais = [] } = useQuery({
    queryKey: ["materiais-portal", alunoData?.turma_id],
    queryFn: async () => {
      const todos = await base44.entities.MaterialDidatico.list("-created_date", 100);
      return todos.filter(
        (m) => !m.turma_id || m.turma_id === "" || m.turma_id === alunoData?.turma_id
      );
    },
    enabled: !!currentUser,
  });

  // Eventos do calendário da turma do aluno
  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos-portal", alunoData?.turma_id],
    queryFn: async () => {
      const todos = await base44.entities.EventoEscola.list("-data_inicio", 200);
      if (!alunoData?.turma_id) return todos;
      return todos.filter(
        (e) => !e.turma_id || e.turma_id === "" || e.turma_id === alunoData.turma_id
      );
    },
    enabled: !!currentUser,
  });

  const eventosMes = eventos.filter((e) => {
    try {
      return isSameMonth(parseLocalDate(e.data_inicio), mesAtual);
    } catch {
      return false;
    }
  });

  const proximosEventos = eventos
    .filter((e) => {
      try {
        return parseISO(e.data_inicio) >= new Date();
      } catch {
        return false;
      }
    })
    .sort((a, b) => parseLocalDate(a.data_inicio) - parseLocalDate(b.data_inicio))
    .slice(0, 5);

  const materiaisDestaque = materiais.filter((m) => m.destaque);
  const outrosMateriais = materiais.filter((m) => !m.destaque);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-amber-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {currentUser.full_name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <h1 className="text-2xl font-bold">Olá, {currentUser.full_name?.split(" ")[0]}! 👋</h1>
              <p className="text-white/80 text-sm">Portal do Aluno</p>
              {alunoData?.turma_nome && (
                <Badge className="mt-1 bg-white/20 text-white border-white/30 hover:bg-white/30">
                  {alunoData.turma_nome}
                </Badge>
              )}
            </div>
          </div>

          {/* Stats rápidos */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{materiais.length}</p>
              <p className="text-xs text-white/80">Materiais</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{proximosEventos.length}</p>
              <p className="text-xs text-white/80">Próximos eventos</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{eventosMes.length}</p>
              <p className="text-xs text-white/80">Aulas este mês</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="turma" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-white shadow-sm">
            <TabsTrigger value="turma" className="flex items-center gap-2 text-xs md:text-sm">
              <GraduationCap className="w-4 h-4" /> Minha Turma
            </TabsTrigger>
            <TabsTrigger value="calendario" className="flex items-center gap-2 text-xs md:text-sm">
              <Calendar className="w-4 h-4" /> Calendário
            </TabsTrigger>
            <TabsTrigger value="materiais" className="flex items-center gap-2 text-xs md:text-sm">
              <BookOpen className="w-4 h-4" /> Materiais
            </TabsTrigger>
          </TabsList>

          {/* ABA TURMA */}
          <TabsContent value="turma" className="space-y-4 mt-4">
            {!alunoData ? (
              <Card className="border-orange-200">
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 text-orange-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Seu cadastro de aluno não foi encontrado.</p>
                  <p className="text-sm text-gray-400 mt-1">Entre em contato com o professor para ser cadastrado.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Dados do Aluno */}
                <Card className="border-amber-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                      <User className="w-5 h-5" /> Meus Dados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Nome</p>
                      <p className="font-semibold text-gray-800">{alunoData.nome}</p>
                    </div>
                    {alunoData.instrumento && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Instrumento</p>
                        <p className="font-semibold text-gray-800 flex items-center gap-2">
                          <Music className="w-4 h-4 text-[#8B6F47]" /> {alunoData.instrumento}
                        </p>
                      </div>
                    )}
                    {alunoData.nivel && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Nível</p>
                        <Badge className={nivelCor[alunoData.nivel] || "bg-gray-100 text-gray-700"}>
                          {alunoData.nivel}
                        </Badge>
                      </div>
                    )}
                    {alunoData.data_matricula && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Matriculado em</p>
                        <p className="font-semibold text-gray-800">
                          {format(parseLocalDate(alunoData.data_matricula), "dd/MM/yyyy")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dados da Turma */}
                {turmaData && (
                  <Card className="border-amber-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5" /> Minha Turma
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-gray-800">{turmaData.nome}</p>
                        <Badge className={nivelCor[turmaData.nivel] || "bg-gray-100 text-gray-700"}>
                          {turmaData.nivel}
                        </Badge>
                      </div>
                      {turmaData.professor_nome && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4 text-[#8B6F47]" />
                          <span className="text-sm">Prof. {turmaData.professor_nome}</span>
                        </div>
                      )}
                      {turmaData.dia_semana?.length > 0 && (
                        <div className="flex items-start gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 text-[#8B6F47] mt-0.5 flex-shrink-0" />
                          <span className="text-sm">
                            {turmaData.dia_semana.map((d) => diasSemana[d] || d).join(", ")}
                          </span>
                        </div>
                      )}
                      {(turmaData.hora_inicio || turmaData.hora_fim) && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4 text-[#8B6F47]" />
                          <span className="text-sm">
                            {turmaData.hora_inicio}{turmaData.hora_fim ? ` – ${turmaData.hora_fim}` : ""}
                          </span>
                        </div>
                      )}
                      {turmaData.descricao && (
                        <p className="text-sm text-gray-500 bg-amber-50 rounded-lg p-3 mt-2">
                          {turmaData.descricao}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ABA CALENDÁRIO */}
          <TabsContent value="calendario" className="space-y-4 mt-4">
            {/* Próximos eventos */}
            <Card className="border-amber-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5" /> Próximos Eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {proximosEventos.length === 0 ? (
                  <p className="text-gray-400 text-center py-4 text-sm">Nenhum evento agendado.</p>
                ) : (
                  <div className="space-y-3">
                    {proximosEventos.map((evento) => (
                      <div key={evento.id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${eventTipoCor[evento.tipo] || "bg-gray-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{evento.titulo}</p>
                          <p className="text-xs text-gray-500">
                            {format(parseLocalDate(evento.data_inicio), "dd 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {evento.local && (
                            <p className="text-xs text-gray-400 mt-0.5">{evento.local}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">
                          {evento.tipo}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Eventos deste mês */}
            <Card className="border-amber-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5" />
                    {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1))}
                      className="px-3 py-1 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1))}
                      className="px-3 py-1 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {eventosMes.length === 0 ? (
                  <p className="text-gray-400 text-center py-4 text-sm">Sem eventos neste mês.</p>
                ) : (
                  <div className="space-y-2">
                    {eventosMes
                      .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))
                      .map((evento) => (
                        <div key={evento.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50 transition-colors">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${eventTipoCor[evento.tipo] || "bg-gray-400"}`} />
                          <span className="text-xs text-gray-500 w-12 flex-shrink-0">
                            {format(parseLocalDate(evento.data_inicio), "dd/MM")}
                          </span>
                          <span className="text-sm text-gray-800 font-medium flex-1">{evento.titulo}</span>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                            style={{ borderColor: evento.cor || "#8B6F47", color: evento.cor || "#8B6F47" }}
                          >
                            {evento.tipo}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA MATERIAIS */}
          <TabsContent value="materiais" className="space-y-4 mt-4">
            {/* Destaques */}
            {materiaisDestaque.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#8B6F47] flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" /> Em Destaque
                </h3>
                <div className="grid gap-3">
                  {materiaisDestaque.map((mat) => (
                    <MaterialCard key={mat.id} material={mat} destaque />
                  ))}
                </div>
              </div>
            )}

            {/* Todos os materiais */}
            {outrosMateriais.length === 0 && materiaisDestaque.length === 0 ? (
              <Card className="border-amber-200">
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum material disponível ainda.</p>
                  <p className="text-sm text-gray-400 mt-1">O professor irá compartilhar materiais em breve.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {outrosMateriais.map((mat) => (
                  <MaterialCard key={mat.id} material={mat} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MaterialCard({ material, destaque }) {
  return (
    <Card className={`border-amber-200 shadow-sm hover:shadow-md transition-shadow ${destaque ? "border-[#D4AF37] bg-amber-50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            {tipoIcone[material.tipo] || tipoIcone.outro}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-800 text-sm leading-tight">{material.titulo}</p>
              <div className="flex items-center gap-1 flex-shrink-0">
                {destaque && <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />}
                <Badge variant="outline" className="text-xs capitalize">
                  {tipoLabel[material.tipo] || material.tipo}
                </Badge>
              </div>
            </div>
            {material.descricao && (
              <p className="text-xs text-gray-500 mt-1">{material.descricao}</p>
            )}
            {material.professor_nome && (
              <p className="text-xs text-gray-400 mt-1">Por: {material.professor_nome}</p>
            )}
            {material.turma_nome && (
              <Badge className="mt-2 text-xs bg-amber-100 text-amber-800 border-amber-200">
                {material.turma_nome}
              </Badge>
            )}
          </div>
        </div>
        <a
          href={material.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 w-full py-2 px-4 bg-[#8B6F47] hover:bg-[#6B5437] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          {material.tipo === "link" ? "Acessar Link" : "Abrir Material"}
        </a>
      </CardContent>
    </Card>
  );
}