import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOfflineSync } from "../components/utils/useOfflineSync";
import OfflineBanner from "../components/utils/OfflineBanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Music, Filter, Key, Award, TrendingUp, RefreshCw, FileText, BookMarked, Upload, ListMusic, CheckCircle2, Info, Sparkles, Globe, AlertTriangle, Target, Guitar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { parseSoloTab } from "@/lib/soloTabUtils";

import { getSongDifficulty } from "@/utils/chordDifficulty";
import SongCardSkeleton from "../components/songs/SongCardSkeleton";
import SongDetails from "../components/songs/SongDetails";
import ApostilaPDF from "../components/songs/ApostilaPDF";
import LibraryApostila from "../components/songs/LibraryApostila";
import SongInfoModal from "../components/songs/SongInfoModal";
import CompareAnalyses from "../components/analysis/CompareAnalyses";
import SimilarityAnalysis from "../components/analysis/SimilarityAnalysis";


import PalcoView from "../components/palco/PalcoView";
import CadernosManager from "../components/cadernos/CadernosManager";
import HarmonicSetlistAnalyzer from "../components/analysis/HarmonicSetlistAnalyzer";
import EditChordsModal from "../components/songs/EditChordsModal";
import SongRow, { SongRowHeader } from "../components/songs/SongRow";
import LibraryHeader from "../components/songs/LibraryHeader";
import EnriquecerDadosModal from "../components/songs/EnriquecerDadosModal";
import BuscarCifraModal from "../components/songs/BuscarCifraModal";


const genreColors = {
  sertanejo_raiz: "bg-amber-100 text-amber-800 border-amber-200",
  sertanejo_universitario: "bg-blue-100 text-blue-800 border-blue-200",
  sertanejo_romantico: "bg-rose-100 text-rose-800 border-rose-200",
  sertanejo_moderno: "bg-purple-100 text-purple-800 border-purple-200",
  sertanejo_modao: "bg-orange-100 text-orange-800 border-orange-200",
  outro: "bg-gray-100 text-gray-800 border-gray-200"
};

const genreLabels = {
  sertanejo_raiz: "🌾 Raiz",
  sertanejo_universitario: "🎓 Universitário",
  sertanejo_romantico: "💕 Romântico",
  sertanejo_moderno: "🎸 Moderno",
  sertanejo_modao: "🪗 Modão",
  outro: "🎵 Outro"
};

export default function Library() {
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
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selectedSong, setSelectedSong] = useState(null);
  const [songInitialTab, setSongInitialTab] = useState("cifra");
  const [recalculating, setRecalculating] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showSimilarity, setShowSimilarity] = useState(false);
  const [apostilaSong, setApostilaSong] = useState(null);
  const [comparisonSongs, setComparisonSongs] = useState({ song1: null, song2: null });
  const [stageSong, setStageSong] = useState(null);
  const [showHarmonicAnalyzer, setShowHarmonicAnalyzer] = useState(false);
  const [infoSong, setInfoSong] = useState(null);
  const [editChordsSong, setEditChordsSong] = useState(null);
  const [showEnriquecer, setShowEnriquecer] = useState(false);
  const [showBuscarCifra, setShowBuscarCifra] = useState(false);
  const [showLibraryApostila, setShowLibraryApostila] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Função para validar se pode deletar uma música
  const canDeleteSong = (songCreatedBy) => {
    return currentUser?.email === songCreatedBy;
  };

  const fetchSongs = useCallback(async () => {
    return await base44.fetchAllSongs();
  }, []);

  const POP_ROCK_GENRES = ["pop", "rock", "pop_rock", "hard_rock", "metal", "punk", "blues_rock", "indie", "alternativo", "classico_rock", "pop_internacional"];
  // Estilos que pertencem a outras bibliotecas (Samba & MPB / Instrumental)
  const OUTRAS_BIBLIOTECAS_GENRES = ["mpb", "samba", "forro"];

  const {
    data: allSongs,
    isOffline,
    isSyncing,
    isLoading: isSongsLoading,
    reload: refetchSongs,
  } = useOfflineSync("songs", fetchSongs);

  // Filtra apenas músicas Sertanejas (exclui Pop/Rock, MPB, Samba e Forró — cada um tem biblioteca própria)
  const songs = (allSongs || []).filter(song =>
    !POP_ROCK_GENRES.includes(song.genre_style) && !OUTRAS_BIBLIOTECAS_GENRES.includes(song.genre_style)
  );

  const isLoading = isSongsLoading && !isOffline;

  const { data: rhythms = [] } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list('name', 200),
  });

  const { data: progressions = [] } = useQuery({
    queryKey: ['progressions-library'],
    queryFn: () => base44.entities.Progression.list('name', 200),
    staleTime: 0,
  });

  const recalculatePredominant = async () => {
    if (!confirm("Recalcular progressão predominante de TODAS as músicas?\n\nIsso pode demorar alguns segundos.")) {
      return;
    }

    setRecalculating(true);

    try {
      let updated = 0;

      for (const song of songs) {
        if (!song.progressions || song.progressions.length === 0) continue;

        // Determinar progressão predominante
        const sectionWeights = {
          'refrão': 3,
          'refrao': 3,
          'chorus': 3,
          'verso': 2,
          'verse': 2,
          'pré-refrão': 1.5,
          'pre-refrão': 1.5,
          'ponte': 1.5,
          'bridge': 1.5,
          'intro': 1,
          'outro': 1,
          'solo': 1
        };

        const progressionScores = {};

        song.progressions.forEach((prog) => {
          if (!prog.progression_name) return;

          const section = (prog.section || '').toLowerCase();
          let weight = 1;

          for (const [key, value] of Object.entries(sectionWeights)) {
            if (section.includes(key)) {
              weight = value;
              break;
            }
          }

          if (!progressionScores[prog.progression_name]) {
            progressionScores[prog.progression_name] = {
              score: 0,
              pattern: prog.pattern || ''
            };
          }

          progressionScores[prog.progression_name].score += weight;
        });

        let predominant = null;
        let maxScore = 0;

        for (const [name, data] of Object.entries(progressionScores)) {
          if (data.score > maxScore) {
            maxScore = data.score;
            predominant = { name, pattern: data.pattern };
          }
        }

        if (predominant && predominant.name !== song.predominant_progression) {
          await base44.entities.Song.update(song.id, {
            predominant_progression: predominant.name,
            predominant_progression_pattern: predominant.pattern
          });
          updated++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['songs'] });
      refetchSongs();
      alert(`✅ ${updated} músicas atualizadas com progressão predominante!`);

    } catch (err) {
      console.error("Erro ao recalcular:", err);
      alert("❌ Erro ao recalcular. Tente novamente.");
    } finally {
      setRecalculating(false);
    }
  };

  // Calcula a progressão predominante em tempo real a partir das progressões da música
  // Garante alinhamento com o modal — não depende do campo salvo no banco
  const getComputedPredominant = (song) => {
    const progs = (song.progressions || []).filter(p => p.progression_name);
    if (progs.length === 0) return song.predominant_progression || null;
    const sectionWeights = {
      'refrão': 3, 'refrao': 3, 'chorus': 3,
      'verso': 2, 'verse': 2,
      'pré-refrão': 1.5, 'pre-refrão': 1.5, 'ponte': 1.5, 'bridge': 1.5,
      'intro': 1, 'outro': 1, 'solo': 1
    };
    const scores = {};
    progs.forEach(prog => {
      const section = (prog.section || '').toLowerCase();
      let weight = 1;
      for (const [key, value] of Object.entries(sectionWeights)) {
        if (section.includes(key)) { weight = value; break; }
      }
      if (!scores[prog.progression_name]) scores[prog.progression_name] = 0;
      scores[prog.progression_name] += weight;
    });
    let best = null, maxScore = 0;
    for (const [name, score] of Object.entries(scores)) {
      if (score > maxScore) { maxScore = score; best = name; }
    }
    return best || song.predominant_progression || null;
  };

  const getUniqueChordCount = (song) => {
    if (!song.progressions || song.progressions.length === 0) return 0;
    const allChords = new Set();
    song.progressions.forEach(prog => {
      (prog.chords || []).forEach(chord => allChords.add(chord.replace(/[0-9]/g, '').trim()));
    });
    return allChords.size;
  };

  const filteredSongs = songs.
  filter((song) => {
    const norm = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const q = norm(searchQuery);
    const matchesSearch = !q ||
      norm(song.title).includes(q) ||
      norm(song.artist).includes(q);

    const matchesGenre = genreFilter === "all" || song.genre_style === genreFilter;
    const selectedRhythmObj = rhythms.find(r => r.name === rhythmFilter);
    const matchesRhythm = rhythmFilter === "all" ||
      (song.rhythm_name && song.rhythm_name.trim().toLowerCase() === rhythmFilter.trim().toLowerCase()) ||
      (song.rhythm_id && selectedRhythmObj && song.rhythm_id === selectedRhythmObj.id);
    const matchesProgression = progressionFilter === "all" || (
      (song.progressions && song.progressions.some((prog) =>
        prog.progression_name && prog.progression_name.trim().toLowerCase() === progressionFilter.trim().toLowerCase()
      )) ||
      (song.predominant_progression && song.predominant_progression.trim().toLowerCase() === progressionFilter.trim().toLowerCase())
    );
    const matchesKey = keyFilter === "all" || song.main_key === keyFilter;
    const chordCount = getUniqueChordCount(song);
    const matchesChordCount = chordCountFilter === "all" ||
      (chordCountFilter === "2" && chordCount === 2) ||
      (chordCountFilter === "3" && chordCount === 3) ||
      (chordCountFilter === "4" && chordCount === 4) ||
      (chordCountFilter === "5+" && chordCount >= 5);
    const songDifficulty = getSongDifficulty(song);
    const matchesDifficulty = difficultyFilter === "all" ||
      (songDifficulty && songDifficulty === difficultyFilter);

    return matchesSearch && matchesGenre && matchesRhythm && matchesProgression && matchesKey && matchesChordCount && matchesDifficulty;
  }).
  sort((a, b) => {
    const titleA = a.title?.toLowerCase() || '';
    const titleB = b.title?.toLowerCase() || '';
    return titleA.localeCompare(titleB, 'pt-BR');
  });

  const handleImportFromCaderno = (cifra) => {
    // Redireciona para análise com dados pré-preenchidos
    navigate(createPageUrl("Analyze"), {
      state: {
        prefilledData: {
          title: cifra.titulo,
          artist: cifra.artista,
          main_key: cifra.tom,
          cifra_text: cifra.cifra_completa
        }
      }
    });
  };

  // Força reload ao voltar para Library
  React.useEffect(() => {
    const handleFocus = () => {
      refetchSongs();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchSongs]);

  return (
    <div className="bg-[#FBF6EA] px-4 py-4 min-h-screen md:p-8">
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 md:mb-8">

          <LibraryHeader
            atual="sertaneja"
            contagem={songs.length}
            tema="claro"
            logado={!!currentUser}
            isAdmin={currentUser?.role === 'admin'}
            onApostila={() => setShowLibraryApostila(true)}
            abas={{ atual: activeTab === 'cadernos' ? 'cadernos' : 'biblioteca', mudar: setActiveTab }}
            ferramentas={[
              { label: 'Compatibilidade de repertório', icon: ListMusic, onClick: () => setShowHarmonicAnalyzer(true) },
              { label: recalculating ? 'Recalculando…' : 'Recalcular progressões', icon: TrendingUp, onClick: recalculatePredominant, disabled: recalculating, adminOnly: true },
              { label: 'Enriquecer dados', icon: Sparkles, onClick: () => setShowEnriquecer(true), adminOnly: true },
            ]}
          />
          <OfflineBanner isOffline={isOffline} isSyncing={isSyncing} pendingCount={0} />
        </motion.div>

        {activeTab === 'cadernos' ? (
          <CadernosManager onImportSong={handleImportFromCaderno} />
        ) : (
          <>

        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-3">

          <div className="flex flex-col gap-2 md:gap-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-[#A68A64]" />
                <Input
                    placeholder="Buscar título ou artista..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 md:pl-10 bg-white border-[#D4C5B0] focus:border-[#8B6F47] focus:ring-[#8B6F47] h-9 md:h-10 text-sm" />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(f => !f)}
                className={`h-9 md:h-10 px-3 border-[#D4C5B0] flex items-center gap-1.5 text-sm font-medium flex-shrink-0 ${
                  showFilters || genreFilter !== 'all' || rhythmFilter !== 'all' || progressionFilter !== 'all' || keyFilter !== 'all' || chordCountFilter !== 'all' || difficultyFilter !== 'all'
                    ? 'bg-[#8B6F47] text-white border-[#8B6F47]'
                    : 'text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white'
                }`}>
                <Filter className="w-4 h-4" />
                Filtrar
                {(genreFilter !== 'all' || rhythmFilter !== 'all' || progressionFilter !== 'all' || keyFilter !== 'all' || chordCountFilter !== 'all' || difficultyFilter !== 'all') && (
                  <span className="bg-white text-[#8B6F47] text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {[genreFilter, rhythmFilter, progressionFilter, keyFilter, chordCountFilter, difficultyFilter].filter(f => f !== 'all').length}
                  </span>
                )}
              </Button>
            </div>

            {showFilters && (
            <div className="grid grid-cols-2 gap-2">
              <Select value={genreFilter} onValueChange={setGenreFilter}>
                <SelectTrigger className="bg-white border-[#D4C5B0] h-9 text-xs md:text-sm">
                  <Filter className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <SelectValue placeholder="Estilo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estilos</SelectItem>
                  <SelectItem value="sertanejo_raiz">Raiz</SelectItem>
                  <SelectItem value="sertanejo_universitario">Universitário</SelectItem>
                  <SelectItem value="sertanejo_romantico">Romântico</SelectItem>
                  <SelectItem value="sertanejo_moderno">Moderno</SelectItem>
                  <SelectItem value="sertanejo_modao">🪗 Modão</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={rhythmFilter} onValueChange={setRhythmFilter}>
                <SelectTrigger className="bg-white border-[#D4C5B0] h-9 text-xs md:text-sm">
                  <Music className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <SelectValue placeholder="Ritmo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Ritmos</SelectItem>
                  {(() => {
                    // Ritmos do banco + ritmos únicos usados nas músicas (fallback)
                    const fromDb = rhythms.map(r => r.name).filter(Boolean);
                    const fromSongs = [...new Set(songs.map(s => s.rhythm_name).filter(Boolean))];
                    const allNames = [...new Set([...fromDb, ...fromSongs])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
                    return allNames.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>

              <Select value={progressionFilter} onValueChange={setProgressionFilter}>
                <SelectTrigger className="bg-white border-[#D4C5B0] h-9 text-xs md:text-sm">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <SelectValue placeholder="Progressão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Progressões</SelectItem>
                  {progressions
                    .map(p => p.name)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                    .map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>

              <Select value={keyFilter} onValueChange={setKeyFilter}>
                <SelectTrigger className="bg-white border-[#D4C5B0] h-9 text-xs md:text-sm">
                  <Key className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <SelectValue placeholder="Tonalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Tonalidades</SelectItem>
                  {[...new Set(songs.map(s => s.main_key).filter(Boolean))]
                    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                    .map(k => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>

              <Select value={chordCountFilter} onValueChange={setChordCountFilter}>
                <SelectTrigger className="bg-white border-[#D4C5B0] h-9 text-xs md:text-sm">
                  <Award className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <SelectValue placeholder="Qtd. Acordes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer Qtd. de Acordes</SelectItem>
                  <SelectItem value="2">2 acordes</SelectItem>
                  <SelectItem value="3">3 acordes</SelectItem>
                  <SelectItem value="4">4 acordes</SelectItem>
                  <SelectItem value="5+">5 ou mais acordes</SelectItem>
                </SelectContent>
              </Select>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="bg-white border-[#D4C5B0] h-9 text-xs md:text-sm">
                  <Target className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <SelectValue placeholder="Dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer Dificuldade</SelectItem>
                  <SelectItem value="facil">Fácil — só acordes abertos</SelectItem>
                  <SelectItem value="medio">Médio — sétimas, pestanas</SelectItem>
                  <SelectItem value="dificil">Difícil — 9as, dim, inversões</SelectItem>
                </SelectContent>
              </Select>
            </div>
            )}
          </div>
        </motion.div>

        {isLoading ?
          <div className="space-y-3">
            {Array(6).fill(0).map((_, i) => <SongCardSkeleton key={i} />)}
          </div> :
          filteredSongs.length === 0 ?
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16">

            <div className="w-24 h-24 bg-[#9CAF88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="w-12 h-12 text-[#9CAF88]" />
            </div>
            <h3 className="text-xl font-bold text-[#8B6F47] mb-2">Nenhuma música encontrada</h3>
            <p className="text-[#A68A64] mb-6">
              {searchQuery || genreFilter !== "all" || rhythmFilter !== "all" || progressionFilter !== "all" ?
              "Tente ajustar seus filtros de busca" :
              "Comece adicionando sua primeira música"}
            </p>
            <Link to={createPageUrl("Analyze")}>
              <Button className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg">
                <Music className="w-4 h-4 mr-2" />
                Analisar Primeira Música
              </Button>
            </Link>
          </motion.div> :

          <div className="flex flex-col gap-2">
            <SongRowHeader tema="claro" />
            {filteredSongs.map((song) => (
              <SongRow
                key={song.id}
                song={song}
                tema="claro"
                onOpen={setSelectedSong}
                onStage={setStageSong}
                onInfo={setInfoSong}
                onApostila={setApostilaSong}
                onEditChords={currentUser ? setEditChordsSong : undefined}
                onTocarJunto={(s2) => { setSongInitialTab("tocarjunto"); setSelectedSong(s2); }}
              />
            ))}
          </div>
          }

        {selectedSong &&
          <SongDetails
            song={selectedSong}
            initialTab={songInitialTab}
            onClose={() => {
              setSelectedSong(null);
              setSongInitialTab("cifra");
              queryClient.invalidateQueries({ queryKey: ['songs'] });
              refetchSongs();
            }} />

          }

        {showComparison &&
          <CompareAnalyses
            onClose={() => {
              setShowComparison(false);
              setComparisonSongs({ song1: null, song2: null });
            }}
            initialSong1={comparisonSongs.song1}
            initialSong2={comparisonSongs.song2} />

          }

        {showSimilarity &&
          <SimilarityAnalysis
            onClose={() => setShowSimilarity(false)}
            onSelectSongs={(song1, song2) => {
              setComparisonSongs({ song1: song1.id, song2: song2.id });
              setShowComparison(true);
            }} />

          }

        {stageSong &&
          <PalcoView songs={[stageSong]} onClose={() => setStageSong(null)} />
          }

        {apostilaSong &&
          <ApostilaPDF
            song={apostilaSong}
            onClose={() => setApostilaSong(null)} />
          }

        {showHarmonicAnalyzer &&
          <HarmonicSetlistAnalyzer
            songs={songs}
            onClose={() => setShowHarmonicAnalyzer(false)} />
          }

        <SongInfoModal song={infoSong} open={!!infoSong} onClose={() => setInfoSong(null)} />

        {editChordsSong && (
          <EditChordsModal
            song={editChordsSong}
            onClose={() => setEditChordsSong(null)}
            onSaved={() => { setEditChordsSong(null); queryClient.invalidateQueries({ queryKey: ['songs'] }); refetchSongs(); }}
          />
        )}

        {showEnriquecer && (
          <EnriquecerDadosModal
            onClose={() => setShowEnriquecer(false)}
            onDone={() => { refetchSongs(); queryClient.invalidateQueries({ queryKey: ['songs'] }); }}
          />
        )}

        {showBuscarCifra && (
          <BuscarCifraModal
            onClose={() => setShowBuscarCifra(false)}
            onSave={() => { setShowBuscarCifra(false); refetchSongs(); queryClient.invalidateQueries({ queryKey: ['songs'] }); }}
          />
        )}

        </>
        )}

        {/* Modal da apostila fora do ternary de loading: um recarregamento
            de dados (ex: oscilação de rede) não pode fechar a edição */}
        {showLibraryApostila && (
          <LibraryApostila onClose={() => setShowLibraryApostila(false)} />
        )}

      </div>
    </div>);

}