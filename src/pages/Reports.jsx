import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Music2, Printer, Download, Key, User, Waves, Music4, Filter, Palette, FileText, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const genreLabels = {
  sertanejo_raiz: "Sertanejo Raiz",
  sertanejo_universitario: "Sertanejo Universitário",
  sertanejo_romantico: "Sertanejo Romântico",
  sertanejo_moderno: "Sertanejo Moderno",
  sertanejo_modao: "Sertanejo Modão",
  pop_rock: "Pop/Rock",
  pop: "Pop",
  rock: "Rock",
  hard_rock: "Hard Rock",
  metal: "Metal",
  punk: "Punk",
  blues_rock: "Blues Rock",
  indie: "Indie",
  alternativo: "Alternativo",
  classico_rock: "Rock Clássico",
  pop_internacional: "Pop Internacional",
  mpb: "MPB",
  samba: "Samba",
  forro: "Forró",
  religioso: "Religioso",
  outro: "Outro"
};

export default function Reports() {
  const [filters, setFilters] = useState({
    tonalidade: "all",
    artista: "",
    progressao: "all",
    ritmo: "all",
    estilo: "all",
    genero: "all",
    incompleta: "all",
    solo_tipo: "all",
    revisao: "all"
  });

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: songsData, isLoading: loadingSongs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
  });
  const songs = songsData || [];

  const { data: progressionsData } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
  });
  const progressions = progressionsData || [];

  const { data: rhythmsData } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
  });
  const rhythms = rhythmsData || [];

  const { data: stylesData } = useQuery({
    queryKey: ['styles'],
    queryFn: () => base44.entities.Style.list(),
  });
  const styles = stylesData || [];

  // Extrair tonalidades únicas
  const uniqueKeys = useMemo(() => {
    const keys = new Set();
    songs.forEach((song) => {
      if (song.main_key) keys.add(song.main_key);
    });
    return Array.from(keys).sort();
  }, [songs]);

  // Extrair artistas únicos
  const uniqueArtists = useMemo(() => {
    const artists = new Set();
    songs.forEach((song) => {
      if (song.artist) artists.add(song.artist);
    });
    return Array.from(artists).sort();
  }, [songs]);

  // Filtrar músicas
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      // Filtro de tonalidade
      if (filters.tonalidade !== "all" && song.main_key !== filters.tonalidade) {
        return false;
      }

      // Filtro de artista
      if (filters.artista && !song.artist?.toLowerCase().includes(filters.artista.toLowerCase())) {
        return false;
      }

      // Filtro de progressão
      if (filters.progressao !== "all") {
        const hasProgression = song.progressions?.some((prog) =>
        prog.progression_name === filters.progressao
        );
        if (!hasProgression) return false;
      }

      // Filtro de ritmo
      if (filters.ritmo !== "all" && song.rhythm_name !== filters.ritmo) {
        return false;
      }

      // Filtro de gênero
      if (filters.genero !== "all" && song.genre_style !== filters.genero) {
        return false;
      }

      // Filtro de músicas incompletas
      if (filters.incompleta === "sem_solo" && song.solo_pdf_url) return false;
      if (filters.incompleta === "sem_playback" && song.playback_url) return false;
      if (filters.incompleta === "sem_ambos" && (song.solo_pdf_url || song.playback_url)) return false;

      // Filtro de revisão
      if (filters.revisao === "revisada" && !song.is_fully_revised) return false;
      if (filters.revisao === "nao_revisada" && song.is_fully_revised) return false;

      // Filtro de tipo de solo - detecta pelo conteúdo do campo solo_pdf_url
      const soloUrl = song.solo_pdf_url || song.solo_image_url || "";
      const isPdf = soloUrl.toLowerCase().includes('.pdf');
      const isPng = soloUrl.toLowerCase().includes('.png') || soloUrl.toLowerCase().includes('.jpg') || soloUrl.toLowerCase().includes('.jpeg') || soloUrl.toLowerCase().includes('.webp');
      if (filters.solo_tipo === "tem_pdf" && !isPdf) return false;
      if (filters.solo_tipo === "tem_png" && !isPng) return false;
      if (filters.solo_tipo === "sem_pdf" && isPdf) return false;
      if (filters.solo_tipo === "sem_png" && isPng) return false;

      return true;
    });
  }, [songs, filters]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalSongs = filteredSongs.length;

    const keyCount = {};
    const rhythmCount = {};
    const genreCount = {};
    const progressionCount = {};

    filteredSongs.forEach((song) => {
      if (song.main_key) {
        keyCount[song.main_key] = (keyCount[song.main_key] || 0) + 1;
      }
      if (song.rhythm_name) {
        rhythmCount[song.rhythm_name] = (rhythmCount[song.rhythm_name] || 0) + 1;
      }
      if (song.genre_style) {
        genreCount[song.genre_style] = (genreCount[song.genre_style] || 0) + 1;
      }
      // Contar progressões nomeadas
      if (song.progressions && song.progressions.length > 0) {
        song.progressions.forEach((prog) => {
          if (prog.progression_name) {
            progressionCount[prog.progression_name] = (progressionCount[prog.progression_name] || 0) + 1;
          }
        });
      }
    });

    const mostCommonKey = Object.entries(keyCount).sort((a, b) => b[1] - a[1])[0];
    const mostCommonRhythm = Object.entries(rhythmCount).sort((a, b) => b[1] - a[1])[0];
    const mostCommonGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0];
    const mostCommonProgression = Object.entries(progressionCount).sort((a, b) => b[1] - a[1])[0];

    return {
      totalSongs,
      uniqueKeys: Object.keys(keyCount).length,
      uniqueRhythms: Object.keys(rhythmCount).length,
      uniqueProgressions: Object.keys(progressionCount).length,
      mostCommonKey: mostCommonKey ? `${mostCommonKey[0]} (${mostCommonKey[1]} músicas)` : "N/A",
      mostCommonRhythm: mostCommonRhythm ? `${mostCommonRhythm[0]} (${mostCommonRhythm[1]} músicas)` : "N/A",
      mostCommonGenre: mostCommonGenre ? `${genreLabels[mostCommonGenre[0]]} (${mostCommonGenre[1]} músicas)` : "N/A",
      mostCommonProgression: mostCommonProgression ? `${mostCommonProgression[0]} (${mostCommonProgression[1]} ocorrências)` : "N/A"
    };
  }, [filteredSongs]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const headers = ["Título", "Artista", "Tonalidade", "Ritmo", "Gênero", "Progressões"];
    const rows = filteredSongs.map((song) => [
    song.title,
    song.artist,
    song.main_key || "-",
    song.rhythm_name || "-",
    genreLabels[song.genre_style] || "-",
    song.progressions?.length || 0]
    );

    const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].
    join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-musicas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setFilters({
      tonalidade: "all",
      artista: "",
      progressao: "all",
      ritmo: "all",
      estilo: "all",
      genero: "all",
      incompleta: "all",
      solo_tipo: "all",
      revisao: "all"
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "all" && v !== "");

  const soloTipoLabels = {
    tem_pdf: "Solo em PDF",
    tem_png: "Solo em PNG",
    sem_pdf: "Sem Solo PDF",
    sem_png: "Sem Solo PNG"
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8 print:p-0 print:bg-white">
      <div className="max-w-7xl mx-auto print:max-w-full">
        {/* Cabeçalho - Visível na tela e impressão */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 print:mb-6">

          <div className="flex items-center justify-between mb-2 print:block">
            <div>
              <h1 className="text-4xl font-bold text-[#8B6F47] mb-2 print:text-3xl print:text-black print:mb-1" style={{ letterSpacing: '0.5px' }}>
                Relatórios Musicais
              </h1>
              <p className="text-[#A68A64] print:text-sm print:text-gray-600 print:mb-2">
                Análise e estatísticas do repertório musical
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button
                onClick={handleExport}
                variant="outline"
                className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white">

                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">

                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>

          {/* Resumo dos filtros aplicados - só imprime se houver filtros */}
          {hasActiveFilters &&
          <div className="hidden print:block print:mb-4 print:pb-3 print:border-b-2 print:border-black">
              <p className="text-sm font-bold print:text-base print:text-black print:mb-2">Filtros Aplicados:</p>
              <div className="flex flex-wrap gap-2 print:gap-x-4 print:gap-y-1">
                {filters.tonalidade !== "all" &&
              <span className="print:text-sm print:text-black">
                    <strong>Tonalidade:</strong> {filters.tonalidade}
                  </span>
              }
                {filters.artista &&
              <span className="print:text-sm print:text-black">
                    <strong>Artista:</strong> {filters.artista}
                  </span>
              }
                {filters.progressao !== "all" &&
              <span className="print:text-sm print:text-black">
                    <strong>Progressão:</strong> {filters.progressao}
                  </span>
              }
                {filters.ritmo !== "all" &&
              <span className="print:text-sm print:text-black">
                    <strong>Ritmo:</strong> {filters.ritmo}
                  </span>
              }
                {filters.genero !== "all" &&
              <span className="print:text-sm print:text-black">
                    <strong>Gênero:</strong> {genreLabels[filters.genero]}
                  </span>
              }
              </div>
            </div>
          }
        </motion.div>

        {/* Filtros - apenas na tela */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-[#D4C5B0] shadow-lg print:hidden">

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#8B6F47] flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </h2>
            {hasActiveFilters &&
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="text-[#8B6F47] hover:bg-[#8B6F47]/10">

                Limpar Filtros
              </Button>
            }
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-medium flex items-center gap-2">
                <Key className="w-4 h-4" />
                Tonalidade
              </Label>
              <Select
                value={filters.tonalidade}
                onValueChange={(value) => setFilters({ ...filters, tonalidade: value })}>

                <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Tonalidades</SelectItem>
                  {uniqueKeys.map((key) =>
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Artista
              </Label>
              <Input
                value={filters.artista}
                onChange={(e) => setFilters({ ...filters, artista: e.target.value })}
                placeholder="Digite o nome do artista..."
                className="border-[#D4C5B0] focus:border-[#8B6F47]" />

            </div>

            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-medium flex items-center gap-2">
                <Waves className="w-4 h-4" />
                Progressão
              </Label>
              <Select
                value={filters.progressao}
                onValueChange={(value) => setFilters({ ...filters, progressao: value })}>

                <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Progressões</SelectItem>
                  {progressions.map((prog) =>
                  <SelectItem key={prog.id} value={prog.name}>{prog.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-medium flex items-center gap-2">
                <Music4 className="w-4 h-4" />
                Ritmo
              </Label>
              <Select
                value={filters.ritmo}
                onValueChange={(value) => setFilters({ ...filters, ritmo: value })}>

                <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Ritmos</SelectItem>
                  {rhythms.map((rhythm) =>
                  <SelectItem key={rhythm.id} value={rhythm.name}>{rhythm.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Gênero/Estilo
              </Label>
              <Select
                value={filters.genero}
                onValueChange={(value) => setFilters({ ...filters, genero: value })}>

                <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Gêneros</SelectItem>
                  <SelectItem value="sertanejo_raiz">Sertanejo Raiz</SelectItem>
                  <SelectItem value="sertanejo_universitario">Sertanejo Universitário</SelectItem>
                  <SelectItem value="sertanejo_romantico">Sertanejo Romântico</SelectItem>
                  <SelectItem value="sertanejo_moderno">Sertanejo Moderno</SelectItem>
                  <SelectItem value="sertanejo_modao">Sertanejo Modão</SelectItem>
                  <SelectItem value="pop_rock">Pop/Rock</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="hard_rock">Hard Rock</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                  <SelectItem value="mpb">MPB</SelectItem>
                  <SelectItem value="samba">Samba</SelectItem>
                  <SelectItem value="forro">Forró</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Músicas Incompletas
              </Label>
              <Select
                value={filters.incompleta}
                onValueChange={(value) => setFilters({ ...filters, incompleta: value })}>
                <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Músicas</SelectItem>
                  <SelectItem value="sem_solo">❌ Sem Solo (PDF)</SelectItem>
                  <SelectItem value="sem_playback">❌ Sem Playback</SelectItem>
                  <SelectItem value="sem_ambos">❌ Sem Solo E Sem Playback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Revisão
              </Label>
              <Select
                value={filters.revisao}
                onValueChange={(value) => setFilters({ ...filters, revisao: value })}>
                <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Músicas</SelectItem>
                  <SelectItem value="revisada">✅ Revisadas</SelectItem>
                  <SelectItem value="nao_revisada">⬜ Não Revisadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Filtro de Solo (PDF/PNG)
              </Label>
              <Select
                value={filters.solo_tipo}
                onValueChange={(value) => setFilters({ ...filters, solo_tipo: value })}>
                <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="tem_pdf">📄 Solo em PDF</SelectItem>
                  <SelectItem value="tem_png">🖼️ Solo em PNG</SelectItem>
                  <SelectItem value="sem_pdf">❌ Sem Solo em PDF</SelectItem>
                  <SelectItem value="sem_png">❌ Sem Solo em PNG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilters &&
          <div className="mt-4 pt-4 border-t border-[#D4C5B0]">
              <p className="text-sm text-[#8B6F47] font-medium mb-2">Filtros ativos:</p>
              <div className="flex flex-wrap gap-2">
                {filters.tonalidade !== "all" &&
              <Badge className="bg-[#9CAF88] text-white">
                    Tom: {filters.tonalidade}
                  </Badge>
              }
                {filters.artista &&
              <Badge className="bg-[#8B6F47] text-white">
                    Artista: {filters.artista}
                  </Badge>
              }
                {filters.progressao !== "all" &&
              <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white">
                    Progressão: {filters.progressao}
                  </Badge>
              }
                {filters.ritmo !== "all" &&
              <Badge className="bg-[#D4AF37] text-white">
                    Ritmo: {filters.ritmo}
                  </Badge>
              }
                {filters.genero !== "all" &&
              <Badge className="bg-[#A68A64] text-white">
                    Gênero: {genreLabels[filters.genero]}
                  </Badge>
              }
                {filters.incompleta !== "all" &&
                <Badge className="bg-orange-500 text-white">
                    {filters.incompleta === "sem_solo" ? "Sem Solo" : filters.incompleta === "sem_playback" ? "Sem Playback" : "Sem Solo e Playback"}
                  </Badge>
                }
                {filters.solo_tipo !== "all" &&
                <Badge className="bg-blue-500 text-white">
                    Solo: {soloTipoLabels[filters.solo_tipo]}
                  </Badge>
                }
                {filters.revisao !== "all" &&
                <Badge className="bg-green-600 text-white">
                    {filters.revisao === "revisada" ? "✅ Revisadas" : "⬜ Não Revisadas"}
                  </Badge>
                }
                </div>
                </div>
                }
                </motion.div>

        {/* Estatísticas - apenas na tela */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 print:hidden">

          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#A68A64] flex items-center gap-2">
                <Music2 className="w-4 h-4" />
                Total de Músicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#8B6F47]">{stats.totalSongs}</p>
            </CardContent>
          </Card>

          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#A68A64] flex items-center gap-2">
                <Key className="w-4 h-4" />
                Tom Mais Comum
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-[#8B6F47]">{stats.mostCommonKey}</p>
            </CardContent>
          </Card>

          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#A68A64] flex items-center gap-2">
                <Music4 className="w-4 h-4" />
                Ritmo Mais Comum
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-[#8B6F47] truncate">{stats.mostCommonRhythm}</p>
            </CardContent>
          </Card>

          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#A68A64] flex items-center gap-2">
                <Waves className="w-4 h-4" />
                Progressão Mais Comum
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-[#8B6F47] truncate">{stats.mostCommonProgression}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Resumo de estatísticas - só na impressão */}
        <div className="hidden print:block print:mb-4 print:pb-3 print:border-b print:border-gray-300">
          <p className="text-base font-bold text-black mb-2">Resumo Estatístico:</p>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-semibold">Total de Músicas:</p>
              <p className="text-lg font-bold">{stats.totalSongs}</p>
            </div>
            <div>
              <p className="font-semibold">Tom Mais Comum:</p>
              <p className="text-base">{stats.mostCommonKey}</p>
            </div>
            <div>
              <p className="font-semibold">Ritmo Mais Comum:</p>
              <p className="text-base">{stats.mostCommonRhythm}</p>
            </div>
            <div>
              <p className="font-semibold">Progressão Mais Comum:</p>
              <p className="text-base">{stats.mostCommonProgression}</p>
            </div>
          </div>
        </div>

        {/* Lista de Músicas - Tabela */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="print:mt-0">

          {loadingSongs ?
          <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 space-y-4">
                {Array(5).fill(0).map((_, i) =>
              <Skeleton key={i} className="h-16 w-full" />
              )}
              </CardContent>
            </Card> :
          filteredSongs.length === 0 ?
          <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-16 h-16 text-[#A68A64] mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-[#8B6F47] mb-2">Nenhuma música encontrada</h3>
                <p className="text-[#A68A64]">Ajuste os filtros para ver os resultados</p>
              </CardContent>
            </Card> :

          <>
              <div className="print:hidden">
                <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-[#D4C5B0]">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Músicas Encontradas ({filteredSongs.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#F5F1E8]">
                          <tr>
                            <th className="text-left p-4 text-[#8B6F47] font-semibold">#</th>
                            <th className="text-left p-4 text-[#8B6F47] font-semibold">Título</th>
                            <th className="text-left p-4 text-[#8B6F47] font-semibold">Artista</th>
                            <th className="text-left p-4 text-[#8B6F47] font-semibold">Tom</th>
                            <th className="text-left p-4 text-[#8B6F47] font-semibold">Ritmo</th>
                            <th className="text-left p-4 text-[#8B6F47] font-semibold">Gênero</th>
                            <th className="text-center p-4 text-[#8B6F47] font-semibold">Progressões</th>
                            <th className="text-center p-4 text-[#8B6F47] font-semibold">Solo PDF</th>
                            <th className="text-center p-4 text-[#8B6F47] font-semibold">Solo PNG</th>
                            <th className="text-center p-4 text-[#8B6F47] font-semibold">Playback</th>
                            <th className="text-center p-4 text-[#8B6F47] font-semibold">Revisada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSongs.map((song, index) =>
                        <tr
                          key={song.id}
                          className="border-b border-[#E8DCC4] hover:bg-[#F5F1E8]/50 transition-colors">

                              <td className="p-4 text-[#8B6F47]">{index + 1}</td>
                              <td className="p-4">
                                <p className="font-semibold text-[#8B6F47]">{song.title}</p>
                              </td>
                              <td className="p-4 text-[#8B6F47]">{song.artist}</td>
                              <td className="p-4">
                                {song.main_key ?
                            <Badge className="bg-[#9CAF88] text-white">
                                    {song.main_key}
                                  </Badge> :

                            <span className="text-[#A68A64] text-sm">-</span>
                            }
                              </td>
                              <td className="p-4 text-[#8B6F47]">{song.rhythm_name || "-"}</td>
                              <td className="p-4 text-[#8B6F47]">
                                {song.genre_style ? genreLabels[song.genre_style] : "-"}
                              </td>
                              <td className="p-4 text-center">
                                <Badge variant="outline" className="text-[#8B6F47] border-[#8B6F47]">
                                  {song.progressions?.length || 0}
                                </Badge>
                              </td>
                              <td className="p-4 text-center">
                                {(song.solo_pdf_url || song.solo_image_url || "").toLowerCase().includes('.pdf')
                                  ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                  : <XCircle className="w-5 h-5 text-red-400 mx-auto" />}
                              </td>
                              <td className="p-4 text-center">
                                {/(\.(png|jpg|jpeg|webp))/i.test(song.solo_pdf_url || song.solo_image_url || "")
                                  ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                  : <XCircle className="w-5 h-5 text-red-400 mx-auto" />}
                              </td>
                              <td className="p-4 text-center">
                                {song.playback_url
                                  ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                  : <XCircle className="w-5 h-5 text-red-400 mx-auto" />}
                              </td>
                              <td className="p-4 text-center">
                                {song.is_fully_revised
                                  ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                  : <XCircle className="w-5 h-5 text-red-400 mx-auto" />}
                              </td>
                              </tr>
                              )}
                              </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela para impressão - limpa e direta */}
              <div className="hidden print:block">
                <h2 className="text-xl font-bold text-black mb-3">
                  Relação de Músicas ({filteredSongs.length})
                </h2>
                <table className="w-full border-collapse print-table">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border-2 border-black p-2 text-left font-bold text-sm">#</th>
                      <th className="border-2 border-black p-2 text-left font-bold text-sm">Título</th>
                      <th className="border-2 border-black p-2 text-left font-bold text-sm">Artista</th>
                      <th className="border-2 border-black p-2 text-left font-bold text-sm">Tom</th>
                      <th className="border-2 border-black p-2 text-left font-bold text-sm">Ritmo</th>
                      <th className="border-2 border-black p-2 text-left font-bold text-sm">Gênero</th>
                      <th className="border-2 border-black p-2 text-center font-bold text-sm">Prog.</th>
                      <th className="border-2 border-black p-2 text-center font-bold text-sm">Solo PDF</th>
                      <th className="border-2 border-black p-2 text-center font-bold text-sm">Solo PNG</th>
                      <th className="border-2 border-black p-2 text-center font-bold text-sm">Playback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSongs.map((song, index) =>
                  <tr key={song.id} className="print-row">
                        <td className="border border-black p-2 text-sm">{index + 1}</td>
                        <td className="border border-black p-2 text-sm font-semibold">{song.title}</td>
                        <td className="border border-black p-2 text-sm">{song.artist}</td>
                        <td className="border border-black p-2 text-sm text-center">{song.main_key || "-"}</td>
                        <td className="border border-black p-2 text-sm">{song.rhythm_name || "-"}</td>
                        <td className="border border-black p-2 text-sm">
                          {song.genre_style ? genreLabels[song.genre_style] : "-"}
                        </td>
                        <td className="border border-black p-2 text-sm text-center">
                          {song.progressions?.length || 0}
                        </td>
                        <td className="border border-black p-2 text-sm text-center">
                          {(song.solo_pdf_url || song.solo_image_url || "").toLowerCase().includes('.pdf') ? "✅" : "❌"}
                        </td>
                        <td className="border border-black p-2 text-sm text-center">
                          {/(\.(png|jpg|jpeg|webp))/i.test(song.solo_pdf_url || song.solo_image_url || "") ? "✅" : "❌"}
                        </td>
                        <td className="border border-black p-2 text-sm text-center">
                          {song.playback_url ? "✅" : "❌"}
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            </>
          }
        </motion.div>

        {/* Rodapé para impressão */}
        <div className="hidden print:block print:mt-6 print:pt-4 print:border-t-2 print:border-black text-center">
          <p className="text-sm text-black">
            <strong>Tropeiros do Bebedouro</strong> - Sistema de Gerenciamento Musical
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4 portrait;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
          }

          .print-table thead {
            background-color: #e5e7eb !important;
          }

          .print-table th,
          .print-table td {
            border: 2px solid black !important;
            padding: 6px 8px !important;
            font-size: 12px !important;
          }

          .print-table th {
            font-weight: bold !important;
            text-align: left !important;
          }

          .print-row {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Remove cores de fundo na impressão */
          * {
            background: white !important;
            color: black !important;
          }

          /* Mantém bordas pretas */
          table, th, td {
            border-color: black !important;
          }

          /* Cabeçalho da tabela com fundo cinza */
          .print-table thead tr {
            background-color: #e5e7eb !important;
          }
        }
      `}</style>
    </div>);

}