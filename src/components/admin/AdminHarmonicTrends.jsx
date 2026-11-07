import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Waves, Music, TrendingUp, Star, BookOpen, Guitar } from "lucide-react";

const COLORS = ["#8B6F47", "#A68A64", "#D4AF37", "#9CAF88", "#C4956A", "#7A5C3A", "#E8C87A", "#6B8F71", "#D4926A", "#5A7A8F"];

export default function AdminHarmonicTrends() {
  const { data: songs = [], isLoading: loadingSongs } = useQuery({
    queryKey: ["songs-trends"],
    queryFn: () => base44.fetchAllSongs(),
  });

  const { data: progressions = [], isLoading: loadingProgressions } = useQuery({
    queryKey: ["progressions-trends"],
    queryFn: () => base44.entities.Progression.list(),
  });

  const stats = useMemo(() => {
    // Contagem de progressões por nome (predominant_progression)
    const progCount = {};
    const patternCount = {};
    const keyCount = {};
    const genreCount = {};
    const chordCountDist = {};

    songs.forEach(song => {
      // Progressão predominante
      if (song.predominant_progression) {
        progCount[song.predominant_progression] = (progCount[song.predominant_progression] || 0) + 1;
      }

      // Padrão predominante
      if (song.predominant_progression_pattern) {
        patternCount[song.predominant_progression_pattern] = (patternCount[song.predominant_progression_pattern] || 0) + 1;
      }

      // Tonalidade
      if (song.main_key) {
        keyCount[song.main_key] = (keyCount[song.main_key] || 0) + 1;
      }

      // Gênero
      if (song.genre_style) {
        genreCount[song.genre_style] = (genreCount[song.genre_style] || 0) + 1;
      }

      // Progressões por seção
      if (song.progressions) {
        song.progressions.forEach(p => {
          if (p.progression_name) {
            progCount[p.progression_name] = (progCount[p.progression_name] || 0) + 1;
          }
          if (p.pattern) {
            patternCount[p.pattern] = (patternCount[p.pattern] || 0) + 1;
          }
        });
      }
    });

    const topProgressions = Object.entries(progCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const topPatterns = Object.entries(patternCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const topKeys = Object.entries(keyCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const genreData = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name: name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        value
      }));

    return { topProgressions, topPatterns, topKeys, genreData };
  }, [songs]);

  // Progressões sem exemplos de músicas no repertório
  const progressionsWithoutSongs = useMemo(() => {
    const usedNames = new Set(
      songs.flatMap(s => [
        s.predominant_progression,
        ...(s.progressions || []).map(p => p.progression_name)
      ].filter(Boolean))
    );
    return progressions.filter(p => !usedNames.has(p.name));
  }, [songs, progressions]);

  const genreLabel = {
    sertanejo_raiz: "Sertanejo Raiz",
    sertanejo_universitario: "Sertanejo Universitário",
    sertanejo_romantico: "Sertanejo Romântico",
    sertanejo_moderno: "Sertanejo Moderno",
    sertanejo_modao: "Sertanejo Modão",
    pop_rock: "Pop/Rock",
  };

  if (loadingSongs || loadingProgressions) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-[#8B6F47] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <Music className="w-7 h-7 mx-auto mb-1 text-[#8B6F47]" />
            <p className="text-2xl font-bold text-[#8B6F47]">{songs.length}</p>
            <p className="text-xs text-[#A68A64]">Músicas no repertório</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <Waves className="w-7 h-7 mx-auto mb-1 text-[#8B6F47]" />
            <p className="text-2xl font-bold text-[#8B6F47]">{progressions.length}</p>
            <p className="text-xs text-[#A68A64]">Progressões cadastradas</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-7 h-7 mx-auto mb-1 text-[#8B6F47]" />
            <p className="text-2xl font-bold text-[#8B6F47]">{stats.topProgressions[0]?.name || "—"}</p>
            <p className="text-xs text-[#A68A64]">Progressão mais comum</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <Guitar className="w-7 h-7 mx-auto mb-1 text-[#8B6F47]" />
            <p className="text-2xl font-bold text-[#8B6F47]">{stats.topKeys[0]?.name || "—"}</p>
            <p className="text-xs text-[#A68A64]">Tonalidade mais comum</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Progressões */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-base">
            <Waves className="w-5 h-5" />
            Progressões Mais Usadas no Repertório
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topProgressions.length === 0 ? (
            <p className="text-[#A68A64] text-sm text-center py-6">Nenhuma progressão mapeada ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.topProgressions} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} />
                <Tooltip
                  formatter={(v) => [`${v} música(s)`, "Ocorrências"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #D4C5B0" }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {stats.topProgressions.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Padrões */}
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5" />
              Padrões Harmônicos Mais Frequentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topPatterns.length === 0 ? (
              <p className="text-[#A68A64] text-sm text-center py-6">Sem dados de padrões.</p>
            ) : (
              <div className="space-y-2">
                {stats.topPatterns.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white bg-[#8B6F47] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="font-mono text-sm text-[#8B6F47] flex-1 truncate">{p.name}</span>
                    <div className="flex-1 bg-amber-100 rounded-full h-2 mx-2">
                      <div
                        className="bg-[#8B6F47] h-2 rounded-full"
                        style={{ width: `${(p.count / stats.topPatterns[0].count) * 100}%` }}
                      />
                    </div>
                    <Badge className="bg-amber-100 text-[#8B6F47] border-0 text-xs">{p.count}x</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tonalidades */}
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-base">
              <Star className="w-5 h-5" />
              Tonalidades Mais Usadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topKeys.length === 0 ? (
              <p className="text-[#A68A64] text-sm text-center py-6">Sem dados de tonalidade.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.topKeys}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {stats.topKeys.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} música(s)`, "Quantidade"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Gênero */}
      {stats.genreData.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-base">
              <Music className="w-5 h-5" />
              Distribuição por Estilo Musical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.genreData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v} música(s)`, "Quantidade"]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stats.genreData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Progressões não usadas no repertório */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5" />
            Progressões Cadastradas Sem Uso no Repertório ({progressionsWithoutSongs.length})
          </CardTitle>
          <p className="text-xs text-[#A68A64] mt-1">
            Considere incluir músicas que exemplifiquem estas progressões no repertório de aulas.
          </p>
        </CardHeader>
        <CardContent>
          {progressionsWithoutSongs.length === 0 ? (
            <p className="text-green-700 text-sm text-center py-4 font-semibold">✅ Todas as progressões têm exemplos no repertório!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {progressionsWithoutSongs.map(p => (
                <Badge key={p.id} variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-xs">
                  {p.name} <span className="font-mono ml-1 opacity-70">{p.pattern}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}