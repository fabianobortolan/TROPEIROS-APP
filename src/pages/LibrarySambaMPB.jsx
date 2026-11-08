import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Music, Filter, Key, Award, TrendingUp, BookMarked, Upload, Waves, Radio, Headphones } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import SongDetails from "../components/songs/SongDetails";
import ApostilaPDF from "../components/songs/ApostilaPDF";
import StageModeView from "../components/songs/StageModeView";
import CadernosManager from "../components/cadernos/CadernosManager";
import SongInfoModal from "../components/songs/SongInfoModal";
import LibraryApostila from "../components/songs/LibraryApostila";
import SongRow from "../components/songs/SongRow";
import LibraryHeader from "../components/songs/LibraryHeader";

// Estilos que pertencem a esta biblioteca
const SAMBA_MPB_GENRES = ["mpb", "samba", "forro"];

const genreLabels = { mpb: "🎶 MPB", samba: "🥁 Samba", forro: "🪗 Forró" };

const BLUE = {
  main: "linear-gradient(90deg, #3b82f6, #1d4ed8)",
  text: "linear-gradient(90deg, #60a5fa, #93c5fd, #3b82f6)",
};

export default function LibrarySambaMPB() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") === "cadernos" ? "cadernos" : "biblioteca";
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
  const [apostilaSong, setApostilaSong] = useState(null);
  const [stageSong, setStageSong] = useState(null);
  const [infoSong, setInfoSong] = useState(null);
  const [showLibraryApostila, setShowLibraryApostila] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: allSongs = [], isLoading: isLoadingSongs, refetch: refetchSongs } = useQuery({
    queryKey: ["all_songs_samba_mpb"],
    queryFn: () => base44.fetchAllSongs(),
  });

  const { data: rhythms = [] } = useQuery({
    queryKey: ["rhythms"],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: [],
  });

  const { data: progressions = [] } = useQuery({
    queryKey: ["progressions"],
    queryFn: () => base44.entities.Progression.list(),
    initialData: [],
  });

  const songs = (allSongs || []).filter((song) => SAMBA_MPB_GENRES.includes(song.genre_style));

  const getUniqueChordCount = (song) => {
    if (!song.progressions || song.progressions.length === 0) return 0;
    const allChords = new Set();
    song.progressions.forEach((prog) => {
      (prog.chords || []).forEach((chord) => allChords.add(chord.replace(/[0-9]/g, "").trim()));
    });
    return allChords.size;
  };

  const genreOrder = (genre) => {
    const i = SAMBA_MPB_GENRES.indexOf(genre);
    return i === -1 ? SAMBA_MPB_GENRES.length : i;
  };

  const filteredSongs = songs
    .filter((song) => {
      const norm = (str) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const q = norm(searchQuery);
      const matchesSearch = !q || norm(song.title).includes(q) || norm(song.artist).includes(q);
      const matchesGenre = genreFilter === "all" || song.genre_style === genreFilter;
      const matchesRhythm = rhythmFilter === "all" || song.rhythm_name === rhythmFilter;
      const matchesProgression =
        progressionFilter === "all" ||
        (song.progressions && song.progressions.some((prog) => prog.progression_name === progressionFilter)) ||
        song.predominant_progression === progressionFilter;
      const matchesKey = keyFilter === "all" || song.main_key === keyFilter;
      const chordCount = getUniqueChordCount(song);
      const matchesChordCount =
        chordCountFilter === "all" ||
        (chordCountFilter === "2" && chordCount === 2) ||
        (chordCountFilter === "3" && chordCount === 3) ||
        (chordCountFilter === "4" && chordCount === 4) ||
        (chordCountFilter === "5+" && chordCount >= 5);
      return matchesSearch && matchesGenre && matchesRhythm && matchesProgression && matchesKey && matchesChordCount;
    })
    .sort((a, b) => {
      const byGenre = genreOrder(a.genre_style) - genreOrder(b.genre_style);
      if (byGenre !== 0) return byGenre;
      return (a.title?.toLowerCase() || "").localeCompare(b.title?.toLowerCase() || "", "pt-BR");
    });

  // Cabeçalho por estilo (MPB, Samba...)
  const groupedSongs = (() => {
    const rows = [];
    let currentGenre = null;
    filteredSongs.forEach((song) => {
      if (song.genre_style !== currentGenre) {
        currentGenre = song.genre_style;
        rows.push({ type: "header", genre: currentGenre });
      }
      rows.push({ type: "song", song });
    });
    const counts = filteredSongs.reduce((acc, song) => {
      acc[song.genre_style] = (acc[song.genre_style] || 0) + 1;
      return acc;
    }, {});
    return rows.map((row) => (row.type === "header" ? { ...row, count: counts[row.genre] || 0 } : row));
  })();

  const activeFilters = [genreFilter, rhythmFilter, progressionFilter, keyFilter, chordCountFilter].filter((f) => f !== "all").length;

  const handleImportFromCaderno = (cifra) => {
    navigate(createPageUrl("Analyze"), {
      state: {
        prefilledData: { title: cifra.titulo, artist: cifra.artista, main_key: cifra.tom, cifra_text: cifra.cifra_completa },
      },
    });
  };

  useEffect(() => {
    const handleFocus = () => refetchSongs();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetchSongs]);

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ background: "linear-gradient(135deg, #06111f 0%, #0a1c33 30%, #071426 60%, #0b1f38 100%)" }}
    >
      <div className="w-full">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 md:mb-8">
          <LibraryHeader
            atual="samba"
            contagem={songs.length}
            tema="azul"
            logado={!!currentUser}
            isAdmin={currentUser?.role === 'admin'}
            onApostila={() => setShowLibraryApostila(true)}
            abas={{ atual: activeTab === 'cadernos' ? 'cadernos' : 'biblioteca', mudar: setActiveTab }}
            ferramentas={[]}
          />
        </motion.div>

        {activeTab === "cadernos" ? (
          <CadernosManager onImportSong={handleImportFromCaderno} />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl md:rounded-2xl p-3 md:p-6 mb-4 md:mb-8 border border-blue-500/30 shadow-xl"
              style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}
            >
              <div className="flex flex-col gap-2 md:gap-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
                    <Input
                      placeholder="Buscar título ou artista..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 md:h-10 text-sm text-white placeholder-blue-300/50 border-blue-500/40 focus:border-blue-400"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters((f) => !f)}
                    className={`h-9 md:h-10 px-3 flex items-center gap-1.5 text-sm font-medium flex-shrink-0 border-blue-500/40 ${showFilters || activeFilters > 0 ? "bg-blue-600 text-white border-blue-600" : "text-blue-300 hover:bg-blue-600 hover:text-white"}`}
                  >
                    <Filter className="w-4 h-4" />
                    Filtrar
                    {activeFilters > 0 && (
                      <span className="bg-white text-blue-700 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {activeFilters}
                      </span>
                    )}
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        value: genreFilter,
                        onChange: setGenreFilter,
                        icon: <Radio className="w-3 h-3 mr-1" />,
                        placeholder: "Estilo",
                        options: SAMBA_MPB_GENRES
                          .filter((g) => songs.some((s) => s.genre_style === g))
                          .map((g) => ({ value: g, label: genreLabels[g] || g })),
                        allLabel: "Todos os Estilos",
                      },
                      {
                        value: rhythmFilter,
                        onChange: setRhythmFilter,
                        icon: <Music className="w-3 h-3 mr-1" />,
                        placeholder: "Ritmo",
                        options: rhythms.map((r) => ({ value: r.name, label: r.name })),
                        allLabel: "Todos os Ritmos",
                      },
                      {
                        value: progressionFilter,
                        onChange: setProgressionFilter,
                        icon: <TrendingUp className="w-3 h-3 mr-1" />,
                        placeholder: "Progressão",
                        options: progressions.map((p) => ({ value: p.name, label: p.name })),
                        allLabel: "Todas as Progressões",
                      },
                      {
                        value: keyFilter,
                        onChange: setKeyFilter,
                        icon: <Key className="w-3 h-3 mr-1" />,
                        placeholder: "Tonalidade",
                        options: ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"].map((k) => ({ value: k, label: k })),
                        allLabel: "Todas as Tonalidades",
                      },
                    ].map((filter, idx) => (
                      <Select key={idx} value={filter.value} onValueChange={filter.onChange}>
                        <SelectTrigger
                          className="h-9 text-xs text-white border-blue-500/40"
                          style={{ background: "rgba(255,255,255,0.07)" }}
                        >
                          {filter.icon}
                          <SelectValue placeholder={filter.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{filter.allLabel}</SelectItem>
                          {filter.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ))}
                    <Select value={chordCountFilter} onValueChange={setChordCountFilter}>
                      <SelectTrigger
                        className="h-9 text-xs text-white border-blue-500/40 col-span-2"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                      >
                        <Award className="w-3 h-3 mr-1" />
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
                  </div>
                )}
              </div>
            </motion.div>

            {isLoadingSongs ? (
              <div className="space-y-4">
                {Array(6).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl opacity-20" />
                ))}
              </div>
            ) : filteredSongs.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(59,130,246,0.2)" }}
                >
                  <Headphones className="w-12 h-12 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-blue-200 mb-2">Nenhuma música encontrada</h3>
                <p className="text-blue-400 mb-6">
                  {searchQuery || activeFilters > 0
                    ? "Tente ajustar seus filtros"
                    : "Adicione músicas de Samba, MPB ou Forró selecionando o estilo ao analisar"}
                </p>
                <Link to={createPageUrl("Analyze")}>
                  <Button className="text-white font-bold shadow-lg" style={{ background: BLUE.main }}>
                    <Music className="w-4 h-4 mr-2" />
                    Analisar Primeira Música
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2">
                {groupedSongs.map((row, index) => {
                  if (row.type === "header") {
                    return (
                      <div key={`header-${row.genre}`} className="flex items-center gap-3 pt-3 pb-1">
                        <span className="text-xs font-bold px-3 py-1 rounded-full border bg-blue-100 text-blue-900 border-blue-200">
                          {genreLabels[row.genre] || row.genre}
                        </span>
                        <div className="flex-1 h-px" style={{ background: "rgba(59,130,246,0.25)" }} />
                        <span className="text-[10px] text-blue-300/70 font-semibold">
                          {row.count} {row.count === 1 ? "música" : "músicas"}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <SongRow
                      key={row.song.id}
                      song={row.song}
                      tema="azul"
                      onOpen={setSelectedSong}
                      onStage={setStageSong}
                      onInfo={setInfoSong}
                      onApostila={setApostilaSong}
                      onTocarJunto={(s2) => { setSongInitialTab("tocarjunto"); setSelectedSong(s2); }}
                    />
                  );
                })}
              </div>
            )}

            {selectedSong && (
              <SongDetails
                song={selectedSong}
                initialTab={songInitialTab}
                onClose={() => {
                  setSelectedSong(null);
                  setSongInitialTab("cifra");
                  refetchSongs();
                  queryClient.invalidateQueries({ queryKey: ["songs"] });
                }}
              />
            )}
            {stageSong && <StageModeView song={stageSong} onClose={() => setStageSong(null)} />}
            {apostilaSong && <ApostilaPDF song={apostilaSong} onClose={() => setApostilaSong(null)} />}
            <SongInfoModal song={infoSong} open={!!infoSong} onClose={() => setInfoSong(null)} />
          </>
        )}

        {showLibraryApostila && <LibraryApostila onClose={() => setShowLibraryApostila(false)} />}
      </div>
    </div>
  );
}