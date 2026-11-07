import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Clock, BookOpen, TrendingDown, Users, CheckCircle2, AlertTriangle, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminRelatorios() {
  const { data: aulas = [] } = useQuery({
    queryKey: ['aulas'],
    queryFn: () => base44.entities.Aula.filter({}, 'numero', 200),
  });

  const { data: progressos = [], isLoading } = useQuery({
    queryKey: ['todos-progressos'],
    queryFn: () => base44.entities.ProgressoAluno.filter({}),
  });

  const stats = useMemo(() => {
    if (!aulas.length || !progressos.length) return null;

    // Tempo médio de dedicação por aula
    const tempoPorAula = aulas.map(aula => {
      const progs = progressos.filter(p => p.aula_id === aula.id);
      const totalTempo = progs.reduce((sum, p) => sum + (p.tempo_gasto_minutos || 0), 0);
      const media = progs.length > 0 ? Math.round(totalTempo / progs.length) : 0;
      const concluidas = progs.filter(p => p.status === 'concluida').length;
      return {
        nome: `Aula ${aula.numero}`,
        titulo: aula.titulo,
        media_minutos: media,
        total_alunos: progs.length,
        concluidas,
        taxa_conclusao: progs.length > 0 ? Math.round((concluidas / progs.length) * 100) : 0,
      };
    }).filter(a => a.total_alunos > 0);

    // Exercícios com maior taxa de dificuldade (não completados)
    const exercicioStats = {};
    aulas.forEach(aula => {
      if (!aula.exercicios) return;
      aula.exercicios.forEach((ex, idx) => {
        const key = `${aula.id}_${idx}`;
        const progs = progressos.filter(p => p.aula_id === aula.id && p.exercicios_completados);
        const total = progs.length;
        const completaram = progs.filter(p => p.exercicios_completados?.includes(idx)).length;
        if (total > 0) {
          exercicioStats[key] = {
            titulo: ex.titulo || `Exercício ${idx + 1}`,
            aula_titulo: aula.titulo,
            aula_numero: aula.numero,
            total_alunos: total,
            completaram,
            taxa_erro: Math.round(((total - completaram) / total) * 100),
          };
        }
      });
    });

    const exerciciosOrdenados = Object.values(exercicioStats)
      .sort((a, b) => b.taxa_erro - a.taxa_erro)
      .slice(0, 10);

    // Resumo geral
    const totalAlunos = new Set(progressos.map(p => p.created_by)).size;
    const totalConcluidas = progressos.filter(p => p.status === 'concluida').length;
    const totalEmAndamento = progressos.filter(p => p.status === 'em_andamento').length;
    const mediaTempoGeral = progressos.length > 0
      ? Math.round(progressos.reduce((s, p) => s + (p.tempo_gasto_minutos || 0), 0) / progressos.length)
      : 0;

    return { tempoPorAula, exerciciosOrdenados, totalAlunos, totalConcluidas, totalEmAndamento, mediaTempoGeral };
  }, [aulas, progressos]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-[#8B6F47] border-t-transparent rounded-full mx-auto"></div>
        <p className="text-[#A68A64] mt-4">Carregando dados...</p>
      </div>
    );
  }

  if (!stats || progressos.length === 0) {
    return (
      <Card className="border-[#D4C5B0] bg-white/80">
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-16 h-16 text-[#A68A64] mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-[#8B6F47] mb-2">Sem dados pedagógicos ainda</h3>
          <p className="text-[#A68A64]">Os relatórios aparecem conforme os alunos interagem com as aulas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-[#8B6F47]" />
              <p className="text-xs text-[#A68A64]">Alunos Ativos</p>
            </div>
            <p className="text-3xl font-bold text-[#8B6F47]">{stats.totalAlunos}</p>
          </CardContent>
        </Card>
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-xs text-[#A68A64]">Aulas Concluídas</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.totalConcluidas}</p>
          </CardContent>
        </Card>
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-[#A68A64]">Em Andamento</p>
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.totalEmAndamento}</p>
          </CardContent>
        </Card>
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              <p className="text-xs text-[#A68A64]">Tempo Médio/Aula</p>
            </div>
            <p className="text-3xl font-bold text-[#D4AF37]">{stats.mediaTempoGeral}min</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de tempo médio por aula */}
      {stats.tempoPorAula.length > 0 && (
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5" />
              Tempo Médio de Dedicação por Aula (minutos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.tempoPorAula} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC4" />
                <XAxis dataKey="nome" tick={{ fontSize: 12, fill: '#8B6F47' }} />
                <YAxis tick={{ fontSize: 12, fill: '#8B6F47' }} />
                <Tooltip
                  formatter={(value, name) => [`${value} min`, 'Tempo médio']}
                  labelFormatter={(label) => {
                    const item = stats.tempoPorAula.find(a => a.nome === label);
                    return item ? item.titulo : label;
                  }}
                  contentStyle={{ background: '#FFF8F0', border: '1px solid #D4C5B0', borderRadius: 8 }}
                />
                <Bar dataKey="media_minutos" fill="#8B6F47" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Taxa de conclusão por aula */}
      <Card className="border-[#D4C5B0] bg-white/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
            <CheckCircle2 className="w-5 h-5" />
            Taxa de Conclusão por Aula
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.tempoPorAula.map((aula, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#8B6F47]">{aula.nome}</span>
                    <span className="text-xs text-[#A68A64] truncate max-w-[200px]">{aula.titulo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#A68A64]">{aula.concluidas}/{aula.total_alunos} alunos</span>
                    <Badge className={aula.taxa_conclusao >= 70 ? "bg-green-500 text-white" : aula.taxa_conclusao >= 40 ? "bg-yellow-500 text-white" : "bg-red-400 text-white"}>
                      {aula.taxa_conclusao}%
                    </Badge>
                  </div>
                </div>
                <Progress value={aula.taxa_conclusao} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exercícios com maior taxa de erro */}
      {stats.exerciciosOrdenados.length > 0 && (
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
              <TrendingDown className="w-5 h-5 text-red-500" />
              Exercícios com Maior Taxa de Não-Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.exerciciosOrdenados.map((ex, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#F5F1E8]">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#8B6F47] text-sm truncate">{ex.titulo}</p>
                    <p className="text-xs text-[#A68A64]">Aula {ex.aula_numero}: {ex.aula_titulo}</p>
                    <p className="text-xs text-[#A68A64]">{ex.total_alunos - ex.completaram} de {ex.total_alunos} alunos não completaram</p>
                  </div>
                  <Badge className={ex.taxa_erro >= 70 ? "bg-red-500 text-white ml-3" : ex.taxa_erro >= 40 ? "bg-yellow-500 text-white ml-3" : "bg-green-500 text-white ml-3"}>
                    {ex.taxa_erro}% não completou
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}