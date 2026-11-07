import React, { useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Music, Filter, Key, Award, TrendingUp, RefreshCw, BookMarked, Upload, Zap, Radio, Headphones, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { parseSoloTab } from "@/lib/soloTabUtils";

import SongDetails from "../components/songs/SongDetails";
import ApostilaPDF from "../components/songs/ApostilaPDF";
import CompareAnalyses from "../components/analysis/CompareAnalyses";
import SimilarityAnalysis from "../components/analysis/SimilarityAnalysis";
import StageModeView from "../components/songs/StageModeView";
import CadernosManager from "../components/cadernos/CadernosManager";
import SongInfoModal from "../components/songs/SongInfoModal";
import LibraryApostila from "../components/songs/LibraryApostila";

const POP_ROCK_GENRES = [
  "pop", "rock", "pop_rock", "hard_rock", "metal", "punk", "blues_rock",
  "indie", "alternativo", "classico_rock", "pop_internacional"
];

const genreColors = {
  pop: "bg-pink-100 text-pink-800 border-pink-200",
  rock: "bg-red-100 text-red-800 border-red-200",
  pop_rock: "bg-purple-100 text-purple-800 border-purple-200",
  hard_rock: "bg-orange-100 text-orange-800 border-orange-200",
  metal: "bg-gray-100 text-gray-800 border-gray-200",
  punk: "bg-yellow-100 text-yellow-800 border-yellow-200",
  blues_rock: "bg-blue-100 text-blue-800 border-blue-200",
  indie: "bg-teal-100 text-teal-800 border-teal-200",
  alternativo: "bg-violet-100 text-violet-800 border-violet-200",
  classico_rock: "bg-amber-100 text-amber-800 border-amber-200",
  pop_internacional: "bg-cyan-100 text-cyan-800 border-cyan-200",
  outro: "bg-gray-100 text-gray-800 border-gray-200"
};

const genreLabels = {
  pop: "🎤 Pop",
  rock: "🎸 Rock",
  pop_rock: "🎵 Pop/Rock",
  hard_rock: "🔥 Hard Rock",
  metal: "⚡ Metal",
  punk: "💥 Punk",
  blues_rock: "🎷 Blues Rock",
  indie: "🌀 Indie",
  alternativo: "🎭 Alternativo",
  classico_rock: "🏛️ Clássico Rock",
  pop_internacional: "🌍 Pop Internacional",
  outro: "🎵 Outro"
};

export default function LibraryPopRock() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') === 'cadernos' ? 'cadernos' : 'biblioteca';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [genreFilter, setGenreFilter] = useState("all");
  const [rhythmFilter, setRhythmFilter] = useState("all");
  const [progressionFilter, setProgressionFilter] = useState("all");
  const [keyFilter, setKeyFilter] = useState("all");
  const [chordCountFilter, setChordCountFilter] = useState("all");
  const [selectedSong, setSelectedSong] = useState(null);
  const [songInitialTab, setSongInitialTab] = useState("cifra");
  const [recalculating, setRecalculating] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showSimilarity, setShowSimilarity] = useState(false);
  const [apostilaSong, setApostilaSong] = useState(null);
  const [comparisonSongs, setComparisonSongs] = useState({ song1: null, song2: null });
  const [stageSong, setStageSong] = useState(null);
  const [infoSong, setInfoSong] = useState(null);
  const [showLibraryApostila, setShowLibraryApostila] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allSongs = [], isLoading: isLoadingSongs, refetch: refetchSongs } = useQuery({
    queryKey: ['all_songs_poprock'],
    queryFn: () => base44.fetchAllSongs(),
  });

  const isOffline = false;
  const isSyncing = false;

  // Filtra apenas músicas Pop/Rock
  const songs = (allSongs || []).filter(song => POP_ROCK_GENRES.includes(song.genre_style));

  const isLoading = isLoadingSongs;

  const { data: rhythms } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: []
  });

  const { data: progressions } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  const recalculatePredominant = async () => {
    if (!confirm("Recalcular progressão predominante de TODAS as músicas Pop/Rock?\n\nIsso pode demorar alguns segundos.")) return;
    setRecalculating(true);
    try {
      let updated = 0;
      const sectionWeights = { 'refrão': 3, 'refrao': 3, 'chorus': 3, 'verso': 2, 'verse': 2, 'ponte': 1.5, 'bridge': 1.5, 'intro': 1, 'outro': 1, 'solo': 1 };
      for (const song of songs) {
        if (!song.progressions || song.progressions.length === 0) continue;
        const progressionScores = {};
        song.progressions.forEach((prog) => {
          if (!prog.progression_name) return;
          const section = prog.section.toLowerCase();
          let weight = 1;
          for (const [key, value] of Object.entries(sectionWeights)) {
            if (section.includes(key)) { weight = value; break; }
          }
          if (!progressionScores[prog.progression_name]) progressionScores[prog.progression_name] = { score: 0, pattern: prog.pattern };
          progressionScores[prog.progression_name].score += weight;
        });
        let predominant = null, maxScore = 0;
        for (const [name, data] of Object.entries(progressionScores)) {
          if (data.score > maxScore) { maxScore = data.score; predominant = { name, pattern: data.pattern }; }
        }
        if (predominant && predominant.name !== song.predominant_progression) {
          await base44.entities.Song.update(song.id, { predominant_progression: predominant.name, predominant_progression_pattern: predominant.pattern });
          updated++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      alert(`✅ ${updated} músicas atualizadas!`);
    } catch (err) {
      alert("❌ Erro ao recalcular.");
    } finally {
      setRecalculating(false);
    }
  };

  const getUniqueChordCount = (song) => {
    if (!song.progressions || song.progressions.length === 0) return 0;
    const allChords = new Set();
    song.progressions.forEach(prog => { (prog.chords || []).forEach(chord => allChords.add(chord.replace(/[0-9]/g, '').trim())); });
    return allChords.size;
  };

  // Ordem dos estilos na listagem (segue a ordem de POP_ROCK_GENRES)
  const genreOrder = (genre) => {
    const i = POP_ROCK_GENRES.indexOf(genre);
    return i === -1 ? POP_ROCK_GENRES.length : i;
  };

  const filteredSongs = songs.filter((song) => {
    const norm = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const q = norm(searchQuery);
    const matchesSearch = !q || norm(song.title).includes(q) || norm(song.artist).includes(q);
    const matchesGenre = genreFilter === "all" || song.genre_style === genreFilter;
    const matchesRhythm = rhythmFilter === "all" || song.rhythm_name === rhythmFilter;
    const matchesProgression = progressionFilter === "all" || (song.progressions && song.progressions.some((prog) => prog.progression_name === progressionFilter)) || song.predominant_progression === progressionFilter;
    const matchesKey = keyFilter === "all" || song.main_key === keyFilter;
    const chordCount = getUniqueChordCount(song);
    const matchesChordCount = chordCountFilter === "all" || (chordCountFilter === "2" && chordCount === 2) || (chordCountFilter === "3" && chordCount === 3) || (chordCountFilter === "4" && chordCount === 4) || (chordCountFilter === "5+" && chordCount >= 5);
    return matchesSearch && matchesGenre && matchesRhythm && matchesProgression && matchesKey && matchesChordCount;
  }).sort((a, b) => {
    const byGenre = genreOrder(a.genre_style) - genreOrder(b.genre_style);
    if (byGenre !== 0) return byGenre;
    return (a.title?.toLowerCase() || '').localeCompare(b.title?.toLowerCase() || '', 'pt-BR');
  });

  // Lista já agrupada por estilo, com um cabeçalho para cada grupo
  const groupedSongs = (() => {
    const rows = [];
    let currentGenre = null;
    filteredSongs.forEach((song) => {
      if (song.genre_style !== currentGenre) {
        currentGenre = song.genre_style;
        rows.push({ type: 'header', genre: currentGenre });
      }
      rows.push({ type: 'song', song });
    });
    const counts = filteredSongs.reduce((acc, song) => {
      acc[song.genre_style] = (acc[song.genre_style] || 0) + 1;
      return acc;
    }, {});
    return rows.map((row) => (row.type === 'header' ? { ...row, count: counts[row.genre] || 0 } : row));
  })();

  const handleImportFromCaderno = (cifra) => {
    navigate(createPageUrl("Analyze"), { state: { prefilledData: { title: cifra.titulo, artist: cifra.artista, main_key: cifra.tom, cifra_text: cifra.cifra_completa } } });
  };

  useEffect(() => {
    const handleFocus = () => refetchSongs();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchSongs]);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0f00 30%, #0f0800 60%, #1a1200 100%)' }}>
      <div className="w-full">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 md:mb-8">

          <div className="flex flex-col gap-2 md:gap-4 mb-4 md:mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-8 h-8 text-orange-400" />
                  <h1 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(90deg, #f97316, #f59e0b, #d97706)' }}>
                    Biblioteca Pop/Rock
                  </h1>
                </div>
                <Badge className="text-white text-sm px-3 py-1" style={{ background: 'linear-gradient(90deg, #f97316, #d97706)' }}>
                  {songs.length} {songs.length === 1 ? 'música' : 'músicas'}
                </Badge>
              </div>
              <p className="text-orange-300/70 text-xs md:text-sm hidden md:block">Pop, Rock, Metal, Indie e mais — análise harmônica completa</p>
            </div>



            <div className="flex gap-2 w-full">
              {currentUser?.role === 'admin' && (
                <Link to={createPageUrl("Analyze")} className="flex-1">
                  <button className="h-10 w-full text-xs md:text-sm font-bold rounded-xl flex items-center justify-center gap-1 text-white shadow-lg transition-all"
                    style={{ background: 'linear-gradient(90deg, #f97316, #d97706)' }}>
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <span>Adicionar</span>
                  </button>
                </Link>
              )}
              {currentUser?.role === 'admin' && (
                <button onClick={recalculatePredominant} disabled={recalculating}
                  className="flex-1 h-10 text-xs md:text-sm font-bold rounded-xl flex items-center justify-center gap-1 border border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-white transition-all bg-transparent disabled:opacity-50">
                  <TrendingUp className={`w-4 h-4 flex-shrink-0 ${recalculating ? 'animate-spin' : ''}`} />
                  <span>Recalcular</span>
                </button>
              )}
              {/* Ferramentas só para quem entrou no app (visitante vê só a lista de músicas) */}
              {currentUser && (<>
              <button onClick={() => setShowLibraryApostila(true)}
                className="flex-1 h-10 text-xs md:text-sm font-bold rounded-xl flex items-center justify-center gap-1 text-white shadow-lg transition-all"
                style={{ background: 'linear-gradient(90deg, #8B6F47, #D4AF37)' }}>
                <BookMarked className="w-4 h-4 flex-shrink-0" />
                <span>Apostila</span>
              </button>
              <button onClick={() => setActiveTab('biblioteca')}
                className={`flex-1 h-10 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'biblioteca' ? 'text-white shadow' : 'bg-white/10 text-orange-300 hover:text-white'}`}
                style={activeTab === 'biblioteca' ? { background: 'linear-gradient(90deg, #f97316, #d97706)' } : {}}>
                Minhas Músicas
              </button>
              <button onClick={() => setActiveTab('cadernos')}
                className={`flex-1 h-10 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'cadernos' ? 'text-white shadow' : 'bg-white/10 text-orange-300 hover:text-white'}`}
                style={activeTab === 'cadernos' ? { background: 'linear-gradient(90deg, #f97316, #d97706)' } : {}}>
                Cadernos
              </button>
              </>)}
            </div>
          </div>
        </motion.div>

        {activeTab === 'cadernos' ? (
          <CadernosManager onImportSong={handleImportFromCaderno} />
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl md:rounded-2xl p-3 md:p-6 mb-4 md:mb-8 border border-orange-500/30 shadow-xl"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>

              <div className="flex flex-col gap-2 md:gap-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-400" />
                    <Input placeholder="Buscar título ou artista..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 md:h-10 text-sm text-white placeholder-orange-300/50 border-orange-500/40 focus:border-orange-400"
                      style={{ background: 'rgba(255,255,255,0.07)' }} />
                  </div>
                  <Button variant="outline" onClick={() => setShowFilters(f => !f)}
                    className={`h-9 md:h-10 px-3 flex items-center gap-1.5 text-sm font-medium flex-shrink-0 border-orange-500/40 ${showFilters || genreFilter !== 'all' || rhythmFilter !== 'all' || progressionFilter !== 'all' || keyFilter !== 'all' || chordCountFilter !== 'all' ? 'bg-orange-600 text-white border-orange-600' : 'text-orange-300 hover:bg-orange-600 hover:text-white'}`}>
                    <Filter className="w-4 h-4" />
                    Filtrar
                    {(genreFilter !== 'all' || rhythmFilter !== 'all' || progressionFilter !== 'all' || keyFilter !== 'all' || chordCountFilter !== 'all') && (
                      <span className="bg-white text-orange-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {[genreFilter, rhythmFilter, progressionFilter, keyFilter, chordCountFilter].filter(f => f !== 'all').length}
                      </span>
                    )}
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: genreFilter, onChange: setGenreFilter, icon: <Radio className="w-3 h-3 mr-1" />, placeholder: "Estilo", options: Object.entries(genreLabels).map(([v, l]) => ({ value: v, label: l })), allLabel: "Todos os Estilos" },
                      { value: rhythmFilter, onChange: setRhythmFilter, icon: <Music className="w-3 h-3 mr-1" />, placeholder: "Ritmo", options: rhythms.map(r => ({ value: r.name, label: r.name })), allLabel: "Todos os Ritmos" },
                      { value: progressionFilter, onChange: setProgressionFilter, icon: <TrendingUp className="w-3 h-3 mr-1" />, placeholder: "Progressão", options: progressions.map(p => ({ value: p.name, label: p.name })), allLabel: "Todas as Progressões" },
                      { value: keyFilter, onChange: setKeyFilter, icon: <Key className="w-3 h-3 mr-1" />, placeholder: "Tonalidade", options: ["C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B"].map(k => ({ value: k, label: k })), allLabel: "Todas as Tonalidades" },
                    ].map((filter, idx) => (
                      <Select key={idx} value={filter.value} onValueChange={filter.onChange}>
                        <SelectTrigger className="h-9 text-xs text-white border-orange-500/40" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          {filter.icon}<SelectValue placeholder={filter.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{filter.allLabel}</SelectItem>
                          {filter.options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ))}
                    <Select value={chordCountFilter} onValueChange={setChordCountFilter}>
                      <SelectTrigger className="h-9 text-xs text-white border-orange-500/40 col-span-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <Award className="w-3 h-3 mr-1" /><SelectValue placeholder="Qtd. Acordes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer Qtd. de Acordes</SelectItem>
                        <SelectItem value="2">2 acordes</SelectItem>
                        <SelectItem value="3">3 acordes</SelectItem>
                        <SelectItem value="4">4 acordes</SelectItem>
                        <SelectItem value="5+">5 ou mais acordes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </motion.div>

            {isLoading ? (
              <div className="space-y-4">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl opacity-20" />)}
              </div>
            ) : filteredSongs.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(249,115,22,0.2)' }}>
                <Headphones className="w-12 h-12 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-orange-200 mb-2">Nenhuma música encontrada</h3>
                <p className="text-orange-400 mb-6">
                  {searchQuery || genreFilter !== "all" ? "Tente ajustar seus filtros" : "Adicione músicas Pop/Rock selecionando um estilo Pop/Rock ao analisar"}
                </p>
                <Link to={createPageUrl("Analyze")}>
                  <Button className="text-white font-bold shadow-lg" style={{ background: 'linear-gradient(90deg, #f97316, #d97706)' }}>
                    <Music className="w-4 h-4 mr-2" />
                    Analisar Primeira Música
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {groupedSongs.map((row, index) => {
                  if (row.type === 'header') {
                    return (
                      <div key={`header-${row.genre}`} className="flex items-center gap-3 pt-3 pb-1">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${genreColors[row.genre] || genreColors.outro}`}>
                          {genreLabels[row.genre] || row.genre}
                        </span>
                        <div className="flex-1 h-px" style={{ background: 'rgba(249,115,22,0.25)' }} />
                        <span className="text-[10px] text-orange-300/70 font-semibold">
                          {row.count} {row.count === 1 ? 'música' : 'músicas'}
                        </span>
                      </div>
                    );
                  }
                  const song = row.song;
                  return (
                  <motion.div key={song.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}>
                    <Card className="cursor-pointer transition-all duration-300 overflow-hidden group relative border-orange-500/20 hover:border-orange-400/60 hover:shadow-orange-500/20 hover:shadow-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}
                      onClick={() => setSelectedSong(song)}>

                      {/* Linha neon no topo */}
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #f97316, #f59e0b, #d97706)' }} />

                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(217,119,6,0.05))' }} />

                      <CardContent className="p-4 pt-5 pb-5 relative">
                        <div className="flex flex-col gap-2">
                          {/* Linha do título com Tom no canto superior direito */}
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedSong(song)}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                              style={{ background: 'linear-gradient(135deg, #f97316, #d97706)' }}
                              onClick={(e) => { e.stopPropagation(); setStageSong(song); }}
                              title="🎸 Modo de Palco">
                              <Music className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {song.is_fully_revised && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                                <h3 className="font-bold text-base text-white truncate uppercase" style={{ letterSpacing: '0.5px' }}>
                                  {song.title}
                                </h3>
                                {song.genre_style && genreLabels[song.genre_style] && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${genreColors[song.genre_style] || genreColors.outro}`}>
                                    {genreLabels[song.genre_style]}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-orange-300 truncate">{song.artist}</p>
                            </div>
                            {/* Tom */}
                            <div className="flex-shrink-0 flex flex-col items-center justify-center px-2 py-1 rounded-lg border border-purple-500/30 text-center min-w-[40px]"
                              style={{ background: 'rgba(249,115,22,0.15)' }}
                              onClick={(e) => { e.stopPropagation(); setSelectedSong(song); }}>
                              <p className="text-[9px] text-orange-300/70 leading-none">Tom</p>
                              <p className="text-xs font-bold text-orange-200 flex items-center gap-0.5">
                                {song.main_key || "N/A"}
                                {song.progressions?.some((p) => p.modulated_key) && <RefreshCw className="w-2 h-2 text-yellow-400" />}
                              </p>
                            </div>
                          </div>

                          {/* 6 botões em linha: Prog, Ritmo, Acordes, Info, Apostila, Tocar */}
                          <div className="grid grid-cols-6 gap-1">
                            <div className={`flex flex-col items-center justify-center px-1 py-1 rounded-lg border text-center cursor-pointer ${song.predominant_progression ? 'border-yellow-500/30' : 'border-white/10'}`}
                              style={{ background: song.predominant_progression ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)' }}
                              onClick={() => setSelectedSong(song)}>
                              <p className={`text-[9px] leading-none ${song.predominant_progression ? 'text-yellow-300/70' : 'text-white/30'}`}>Prog.</p>
                              <p className={`text-[10px] font-bold truncate w-full text-center ${song.predominant_progression ? 'text-yellow-200' : 'text-white/30'}`}>
                                {song.predominant_progression || "N/A"}
                              </p>
                            </div>
                            <div className={`flex flex-col items-center justify-center px-1 py-1 rounded-lg border text-center cursor-pointer ${song.rhythm_name ? 'border-orange-500/30' : 'border-white/10'}`}
                              style={{ background: song.rhythm_name ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)' }}
                              onClick={() => setSelectedSong(song)}>
                              <p className={`text-[9px] leading-none ${song.rhythm_name ? 'text-orange-300/70' : 'text-white/30'}`}>Ritmo</p>
                              <p className={`text-[10px] font-bold truncate w-full text-center ${song.rhythm_name ? 'text-orange-200' : 'text-white/30'}`}>
                                {song.rhythm_name || "N/A"}
                              </p>
                            </div>
                            <div className={`flex flex-col items-center justify-center px-1 py-1 rounded-lg border text-center cursor-pointer ${song.predominant_progression_pattern && song.main_key ? 'border-amber-500/30' : 'border-white/10'}`}
                              style={{ background: song.predominant_progression_pattern && song.main_key ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)' }}
                              onClick={() => setSelectedSong(song)}>
                              <p className={`text-[9px] leading-none ${song.predominant_progression_pattern && song.main_key ? 'text-cyan-300/70' : 'text-white/30'}`}>Acordes</p>
                              <p className={`text-[10px] font-bold truncate w-full text-center ${song.predominant_progression_pattern && song.main_key ? 'text-cyan-200' : 'text-white/30'}`}>
                                {(() => {
                                  const pattern = song.predominant_progression_pattern;
                                  const key = song.main_key;
                                  if (!pattern || !key) return "N/A";
                                  const keyMap = { 'C': ['C','Dm','Em','F','G','Am','Bdim'], 'G': ['G','Am','Bm','C','D','Em','F#dim'], 'D': ['D','Em','F#m','G','A','Bm','C#dim'], 'A': ['A','Bm','C#m','D','E','F#m','G#dim'], 'E': ['E','F#m','G#m','A','B','C#m','D#dim'], 'F': ['F','Gm','Am','Bb','C','Dm','Edim'], 'B': ['B','C#m','D#m','E','F#','G#m','A#dim'] };
                                  const chords = keyMap[key];
                                  if (!chords) return "N/A";
                                  const romanToIndex = { 'I': 0, 'i': 0, 'II': 1, 'ii': 1, 'III': 2, 'iii': 2, 'IV': 3, 'iv': 3, 'V': 4, 'v': 4, 'VI': 5, 'vi': 5, 'VII': 6, 'vii': 6 };
                                  const degrees = pattern.split('-').filter(d => d);
                                  const uniqueChords = []; const seen = new Set();
                                  degrees.forEach(degree => {
                                    const cleanDegree = degree.replace(/7|°|\+|m/g, '');
                                    if (!seen.has(cleanDegree)) { seen.add(cleanDegree); const index = romanToIndex[cleanDegree]; if (index !== undefined) { let chord = chords[index]; if (degree.includes('7')) chord += '7'; uniqueChords.push(chord); } else { uniqueChords.push(degree); } }
                                  });
                                  return uniqueChords.join('-');
                                })()}
                              </p>
                            </div>
                            {/* Info */}
                            <div className="flex flex-col items-center justify-center px-1 py-1 rounded-lg border border-green-400/50 text-center cursor-pointer hover:bg-green-500 transition-colors group/info"
                              style={{ background: 'rgba(34,197,94,0.1)' }}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInfoSong(song); }}>
                              <p className="text-[9px] leading-none text-green-400 group-hover/info:text-white">Info</p>
                              <p className="text-[10px] font-bold text-green-300 group-hover/info:text-white">ℹ️</p>
                            </div>
                            {/* Apostila */}
                            <div className="flex flex-col items-center justify-center px-1 py-1 rounded-lg border border-pink-400/50 text-center cursor-pointer hover:bg-pink-500 transition-colors group/ap"
                              style={{ background: 'rgba(236,72,153,0.1)' }}
                              onClick={(e) => { e.stopPropagation(); setApostilaSong(song); }}>
                              <p className="text-[9px] leading-none text-pink-300 group-hover/ap:text-white">Apostila</p>
                              <p className="text-[10px] font-bold text-pink-200 group-hover/ap:text-white">📄</p>
                            </div>
                            {/* Tocar junto */}
                            {(() => {
                              const hasSoloTab = !!parseSoloTab(song.solo_tab);
                              return (
                                <div
                                  className={`flex flex-col items-center justify-center px-1 py-1 rounded-lg border text-center transition-colors group/tj ${hasSoloTab ? "border-indigo-400/60 bg-indigo-500/20 hover:bg-indigo-500 cursor-pointer" : "border-white/10 bg-white/5 cursor-not-allowed"}`}
                                  title={hasSoloTab ? "🎸 Tocar junto — abre a tablatura do solo" : "Esta música ainda não possui tablatura de solo"}
                                  onClick={(e) => { e.stopPropagation(); if (hasSoloTab) { setSongInitialTab("tocarjunto"); setSelectedSong(song); } }}>
                                  <p className={`text-[9px] leading-none ${hasSoloTab ? "text-indigo-300 group-hover/tj:text-white" : "text-white/30"}`}>Tocar</p>
                                  <p className={`text-[10px] font-bold ${hasSoloTab ? "text-indigo-200 group-hover/tj:text-white" : "text-white/30"}`}>🎸</p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  );
                })}
              </div>
            )}

            {selectedSong && <SongDetails song={selectedSong} initialTab={songInitialTab} onClose={() => { setSelectedSong(null); setSongInitialTab("cifra"); refetchSongs(); queryClient.invalidateQueries({ queryKey: ['songs'] }); }} />}
            {showComparison && <CompareAnalyses onClose={() => { setShowComparison(false); setComparisonSongs({ song1: null, song2: null }); }} initialSong1={comparisonSongs.song1} initialSong2={comparisonSongs.song2} />}
            {showSimilarity && <SimilarityAnalysis onClose={() => setShowSimilarity(false)} onSelectSongs={(song1, song2) => { setComparisonSongs({ song1: song1.id, song2: song2.id }); setShowComparison(true); }} />}
            {stageSong && <StageModeView song={stageSong} onClose={() => setStageSong(null)} />}
            {apostilaSong && <ApostilaPDF song={apostilaSong} onClose={() => setApostilaSong(null)} />}
            <SongInfoModal song={infoSong} open={!!infoSong} onClose={() => setInfoSong(null)} />
          </>
        )}

        {/* Modal da apostila fora do ternary de loading: recarregamentos
            de dados nunca podem fechar a edição da apostila */}
        {showLibraryApostila && <LibraryApostila onClose={() => setShowLibraryApostila(false)} />}
      </div>
    </div>
  );
}