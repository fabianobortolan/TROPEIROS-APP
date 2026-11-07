import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, Music, TrendingUp, Users, Key, Music4, 
  ChevronRight, Lightbulb, Star, Target, X 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PersonalizedRecommendations({ 
  songs = [], 
  progressions = [], 
  onSelectSong,
  onClose 
}) {
  // Análise do histórico do usuário
  const userAnalysis = useMemo(() => {
    if (!songs || songs.length === 0) return null;

    // Ordenar por data de criação (mais recentes primeiro)
    const sortedSongs = [...songs].sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );
    
    // Últimas 10 músicas analisadas
    const recentSongs = sortedSongs.slice(0, 10);

    // Contagem de gêneros
    const genreCounts = {};
    songs.forEach(song => {
      if (song.genre_style) {
        genreCounts[song.genre_style] = (genreCounts[song.genre_style] || 0) + 1;
      }
    });

    // Contagem de artistas
    const artistCounts = {};
    songs.forEach(song => {
      if (song.artist) {
        const normalizedArtist = song.artist.trim().toLowerCase();
        artistCounts[normalizedArtist] = {
          count: (artistCounts[normalizedArtist]?.count || 0) + 1,
          original: song.artist
        };
      }
    });

    // Contagem de progressões
    const progressionCounts = {};
    songs.forEach(song => {
      if (song.predominant_progression) {
        progressionCounts[song.predominant_progression] = 
          (progressionCounts[song.predominant_progression] || 0) + 1;
      }
    });

    // Contagem de tonalidades
    const keyCounts = {};
    songs.forEach(song => {
      if (song.main_key) {
        keyCounts[song.main_key] = (keyCounts[song.main_key] || 0) + 1;
      }
    });

    // Contagem de ritmos
    const rhythmCounts = {};
    songs.forEach(song => {
      if (song.rhythm_name) {
        rhythmCounts[song.rhythm_name] = (rhythmCounts[song.rhythm_name] || 0) + 1;
      }
    });

    // Top itens
    const topGenre = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([key, data]) => ({ name: data.original, count: data.count }));

    const topProgressions = Object.entries(progressionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topKeys = Object.entries(keyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({ key, count }));

    const topRhythms = Object.entries(rhythmCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      totalSongs: songs.length,
      recentSongs,
      topGenre: topGenre ? { name: topGenre[0], count: topGenre[1] } : null,
      topArtists,
      topProgressions,
      topKeys,
      topRhythms,
      genreCounts,
      progressionCounts
    };
  }, [songs]);

  // Gerar recomendações de músicas similares
  const songRecommendations = useMemo(() => {
    if (!userAnalysis || songs.length < 3) return [];

    const recommendations = [];
    const recentSongIds = new Set(userAnalysis.recentSongs.map(s => s.id));

    // Encontrar músicas similares baseadas em progressão predominante
    if (userAnalysis.topProgressions.length > 0) {
      const topProgName = userAnalysis.topProgressions[0].name;
      
      songs.forEach(song => {
        if (recentSongIds.has(song.id)) return;
        
        if (song.predominant_progression === topProgName) {
          recommendations.push({
            song,
            reason: `Mesma progressão: ${topProgName}`,
            score: 3,
            type: 'progression'
          });
        }
      });
    }

    // Encontrar músicas do mesmo artista favorito
    if (userAnalysis.topArtists.length > 0) {
      const topArtist = userAnalysis.topArtists[0].name.toLowerCase();
      
      songs.forEach(song => {
        if (recentSongIds.has(song.id)) return;
        if (recommendations.find(r => r.song.id === song.id)) return;
        
        if (song.artist?.toLowerCase() === topArtist) {
          recommendations.push({
            song,
            reason: `Artista favorito: ${userAnalysis.topArtists[0].name}`,
            score: 2,
            type: 'artist'
          });
        }
      });
    }

    // Encontrar músicas com mesma tonalidade
    if (userAnalysis.topKeys.length > 0) {
      const topKey = userAnalysis.topKeys[0].key;
      
      songs.forEach(song => {
        if (recentSongIds.has(song.id)) return;
        if (recommendations.find(r => r.song.id === song.id)) return;
        
        if (song.main_key === topKey) {
          recommendations.push({
            song,
            reason: `Tonalidade favorita: ${topKey}`,
            score: 1,
            type: 'key'
          });
        }
      });
    }

    // Ordenar por score e limitar
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [songs, userAnalysis]);

  // Sugestões de progressões relacionadas
  const progressionSuggestions = useMemo(() => {
    if (!userAnalysis || !progressions || progressions.length === 0) return [];

    const suggestions = [];
    const usedProgressions = new Set(Object.keys(userAnalysis.progressionCounts));

    // Mapa de progressões relacionadas
    const relatedProgressions = {
      'I-IV-V-I': ['I-V-vi-IV', 'I-IV-I-V', 'I-V-I-IV'],
      'I-V-vi-IV': ['I-IV-V-I', 'vi-IV-I-V', 'I-V-IV-I'],
      'I-vi-IV-V': ['I-V-vi-IV', 'I-IV-V-I', 'vi-IV-V-I'],
      'ii-V-I': ['I-IV-V-I', 'I-vi-ii-V', 'iii-vi-ii-V'],
    };

    // Para cada progressão usada, sugere relacionadas
    userAnalysis.topProgressions.forEach(({ name }) => {
      const prog = progressions.find(p => p.name === name);
      if (!prog) return;

      const pattern = prog.pattern;
      const related = relatedProgressions[pattern] || [];

      related.forEach(relatedPattern => {
        const relatedProg = progressions.find(p => p.pattern === relatedPattern);
        if (relatedProg && !usedProgressions.has(relatedProg.name)) {
          suggestions.push({
            progression: relatedProg,
            reason: `Relacionada com ${name}`,
            basedOn: name
          });
        }
      });
    });

    // Progressões populares não usadas
    progressions.forEach(prog => {
      if (usedProgressions.has(prog.name)) return;
      if (suggestions.find(s => s.progression.name === prog.name)) return;

      // Prioriza progressões com mais exemplos
      if (prog.examples && prog.examples.length > 2) {
        suggestions.push({
          progression: prog,
          reason: 'Popular no sertanejo',
          basedOn: null
        });
      }
    });

    return suggestions.slice(0, 4);
  }, [progressions, userAnalysis]);

  // Sugestões de escalas/tonalidades
  const scaleSuggestions = useMemo(() => {
    if (!userAnalysis) return [];

    const suggestions = [];
    const usedKeys = new Set(userAnalysis.topKeys.map(k => k.key));

    // Mapa de tonalidades relacionadas
    const relatedKeys = {
      'C': ['G', 'F', 'Am', 'D'],
      'G': ['D', 'C', 'Em', 'A'],
      'D': ['A', 'G', 'Bm', 'E'],
      'A': ['E', 'D', 'F#m', 'B'],
      'E': ['B', 'A', 'C#m', 'F#'],
      'F': ['C', 'Bb', 'Dm', 'G'],
    };

    // Para cada tonalidade usada, sugere relacionadas
    userAnalysis.topKeys.forEach(({ key }) => {
      const related = relatedKeys[key] || [];
      
      related.forEach(relatedKey => {
        if (!usedKeys.has(relatedKey) && !suggestions.find(s => s.key === relatedKey)) {
          suggestions.push({
            key: relatedKey,
            reason: `Relacionada com ${key}`,
            relationship: key.includes('m') ? 'relativo' : 'vizinha'
          });
        }
      });
    });

    return suggestions.slice(0, 4);
  }, [userAnalysis]);

  if (!userAnalysis) {
    return (
      <Card className="border-[#D4C5B0] bg-white/60">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#8B6F47] mb-2">
            Recomendações Personalizadas
          </h3>
          <p className="text-[#A68A64]">
            Adicione mais músicas para receber recomendações baseadas no seu perfil musical.
          </p>
        </CardContent>
      </Card>
    );
  }

  const genreLabels = {
    sertanejo_raiz: "Raiz",
    sertanejo_universitario: "Universitário",
    sertanejo_romantico: "Romântico",
    sertanejo_moderno: "Moderno",
    sertanejo_modao: "Modão",
    outro: "Outro"
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#F5F1E8] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Recomendações Personalizadas
              </h2>
              <p className="text-white/90 text-sm mt-1">
                Baseado em {userAnalysis.totalSongs} músicas analisadas
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Perfil Musical */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                <Star className="w-5 h-5 text-[#D4AF37]" />
                Seu Perfil Musical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {userAnalysis.topGenre && (
                  <div className="text-center p-3 bg-[#9CAF88]/10 rounded-xl">
                    <p className="text-xs text-[#A68A64] uppercase tracking-wider">Gênero Favorito</p>
                    <p className="text-lg font-bold text-[#8B6F47]">
                      {genreLabels[userAnalysis.topGenre.name] || userAnalysis.topGenre.name}
                    </p>
                    <p className="text-xs text-[#A68A64]">{userAnalysis.topGenre.count} músicas</p>
                  </div>
                )}

                {userAnalysis.topArtists[0] && (
                  <div className="text-center p-3 bg-[#D4AF37]/10 rounded-xl">
                    <p className="text-xs text-[#A68A64] uppercase tracking-wider">Artista Favorito</p>
                    <p className="text-lg font-bold text-[#8B6F47] truncate">
                      {userAnalysis.topArtists[0].name}
                    </p>
                    <p className="text-xs text-[#A68A64]">{userAnalysis.topArtists[0].count} músicas</p>
                  </div>
                )}

                {userAnalysis.topKeys[0] && (
                  <div className="text-center p-3 bg-[#8B6F47]/10 rounded-xl">
                    <p className="text-xs text-[#A68A64] uppercase tracking-wider">Tonalidade Favorita</p>
                    <p className="text-lg font-bold text-[#8B6F47]">
                      {userAnalysis.topKeys[0].key}
                    </p>
                    <p className="text-xs text-[#A68A64]">{userAnalysis.topKeys[0].count} músicas</p>
                  </div>
                )}

                {userAnalysis.topProgressions[0] && (
                  <div className="text-center p-3 bg-[#9CAF88]/10 rounded-xl">
                    <p className="text-xs text-[#A68A64] uppercase tracking-wider">Progressão Favorita</p>
                    <p className="text-lg font-bold text-[#8B6F47] truncate">
                      {userAnalysis.topProgressions[0].name}
                    </p>
                    <p className="text-xs text-[#A68A64]">{userAnalysis.topProgressions[0].count} músicas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Músicas Recomendadas */}
          {songRecommendations.length > 0 && (
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                  <Music className="w-5 h-5 text-[#9CAF88]" />
                  Músicas Para Você Revisitar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {songRecommendations.map((rec, idx) => (
                    <motion.div
                      key={rec.song.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-[#F5F1E8] rounded-xl border border-[#D4C5B0] hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        onSelectSong(rec.song);
                        onClose();
                      }}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#8B6F47] truncate text-sm">
                          {rec.song.title}
                        </p>
                        <p className="text-xs text-[#A68A64] truncate">{rec.song.artist}</p>
                        <Badge 
                          className={`mt-1 text-[10px] ${
                            rec.type === 'progression' ? 'bg-[#9CAF88]/20 text-[#9CAF88]' :
                            rec.type === 'artist' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' :
                            'bg-[#8B6F47]/20 text-[#8B6F47]'
                          }`}
                        >
                          {rec.reason}
                        </Badge>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#A68A64] flex-shrink-0" />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progressões Sugeridas */}
          {progressionSuggestions.length > 0 && (
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                  Progressões Para Explorar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {progressionSuggestions.map((sug, idx) => (
                    <motion.div
                      key={sug.progression.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-gradient-to-r from-[#D4AF37]/10 to-[#9CAF88]/10 rounded-xl border border-[#D4C5B0]"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-[#8B6F47]">{sug.progression.name}</p>
                          <p className="text-sm font-mono text-[#A68A64]">{sug.progression.pattern}</p>
                        </div>
                        <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] text-[10px]">
                          Nova
                        </Badge>
                      </div>
                      <p className="text-xs text-[#A68A64] mt-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        {sug.reason}
                      </p>
                      {sug.progression.description && (
                        <p className="text-xs text-[#8B6F47] mt-1 line-clamp-2">
                          {sug.progression.description}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tonalidades Sugeridas */}
          {scaleSuggestions.length > 0 && (
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                  <Key className="w-5 h-5 text-[#8B6F47]" />
                  Tonalidades Para Explorar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {scaleSuggestions.map((sug, idx) => (
                    <motion.div
                      key={sug.key}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-2 px-4 py-3 bg-[#8B6F47]/10 rounded-xl border border-[#8B6F47]/30"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-[#8B6F47] to-[#A68A64] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{sug.key}</span>
                      </div>
                      <div>
                        <p className="font-bold text-[#8B6F47] text-sm">{sug.key}</p>
                        <p className="text-[10px] text-[#A68A64]">{sug.reason}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Artistas Mais Analisados */}
          {userAnalysis.topArtists.length > 1 && (
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-[#9CAF88]" />
                  Seus Artistas Favoritos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {userAnalysis.topArtists.map((artist, idx) => (
                    <Badge 
                      key={artist.name}
                      className={`px-3 py-1.5 text-sm ${
                        idx === 0 
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white' 
                          : 'bg-[#8B6F47]/10 text-[#8B6F47] border border-[#8B6F47]/30'
                      }`}
                    >
                      {idx === 0 && <Star className="w-3 h-3 mr-1" />}
                      {artist.name} ({artist.count})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dicas Personalizadas */}
          <Card className="border-[#9CAF88] bg-gradient-to-r from-[#9CAF88]/10 to-white">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Target className="w-6 h-6 text-[#9CAF88] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-[#8B6F47] mb-2">Dica Para Você</h3>
                  <p className="text-sm text-[#A68A64]">
                    {userAnalysis.topProgressions[0] ? (
                      <>
                        Você usa muito a progressão <strong>{userAnalysis.topProgressions[0].name}</strong>. 
                        Experimente variações como adicionar acordes de passagem ou substituições harmônicas 
                        para criar mais interesse nas suas análises.
                      </>
                    ) : (
                      <>
                        Continue analisando músicas para descobrir padrões no seu repertório. 
                        Quanto mais músicas você analisar, melhores serão as recomendações!
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}