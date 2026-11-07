import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, TrendingUp, Key, Music, Sparkles, GitCompare } from "lucide-react";
import { motion } from "framer-motion";

export default function SimilarityAnalysis({ onClose, onSelectSongs }) {
  const [selectedSong, setSelectedSong] = useState(null);

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  // Calcular similaridade entre duas músicas (FOCO: progressões e marchas)
  const calculateSimilarity = (song1, song2) => {
    if (song1.id === song2.id) return 0;
    
    let score = 0;
    let maxScore = 0;

    // Progressão predominante (peso 50)
    maxScore += 50;
    if (song1.predominant_progression && song2.predominant_progression) {
      if (song1.predominant_progression === song2.predominant_progression) {
        score += 50;
      }
    }

    // Progressões em comum (peso 30)
    maxScore += 30;
    const prog1 = new Set((song1.progressions || []).map(p => p.progression_name).filter(Boolean));
    const prog2 = new Set((song2.progressions || []).map(p => p.progression_name).filter(Boolean));
    const commonProgressions = [...prog1].filter(p => prog2.has(p));
    if (prog1.size > 0 && prog2.size > 0) {
      const ratio = commonProgressions.length / Math.max(prog1.size, prog2.size);
      score += ratio * 30;
    }

    // Ritmo/Marcha (peso 20)
    maxScore += 20;
    if (song1.rhythm_name && song2.rhythm_name && song1.rhythm_name === song2.rhythm_name) {
      score += 20;
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  };

  // Encontrar músicas similares para cada música
  const similarityMap = useMemo(() => {
    const map = new Map();
    
    songs.forEach(song => {
      const similarities = songs
        .map(other => ({
          song: other,
          score: calculateSimilarity(song, other)
        }))
        .filter(s => s.score > 30) // Mostrar apenas similaridade > 30%
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Top 5 similares

      if (similarities.length > 0) {
        map.set(song.id, similarities);
      }
    });

    return map;
  }, [songs]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalComparisons = songs.length * (songs.length - 1) / 2;
    let highSimilarity = 0; // > 70%
    let mediumSimilarity = 0; // 50-70%
    let lowSimilarity = 0; // 30-50%

    songs.forEach(song1 => {
      songs.forEach(song2 => {
        if (song1.id >= song2.id) return;
        const score = calculateSimilarity(song1, song2);
        if (score > 70) highSimilarity++;
        else if (score > 50) mediumSimilarity++;
        else if (score > 30) lowSimilarity++;
      });
    });

    return {
      total: totalComparisons,
      high: highSimilarity,
      medium: mediumSimilarity,
      low: lowSimilarity
    };
  }, [songs]);

  const handleCompare = (song1, song2) => {
    onSelectSongs(song1, song2);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto"
      onClick={onClose}>
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        
        <div className="sticky top-0 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-8 h-8" />
                <h2 className="text-3xl font-bold">Análise de Similaridade Harmônica</h2>
              </div>
              <p className="text-white/90">Descubra músicas com progressões e estruturas harmônicas semelhantes</p>
            </div>
            <Button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white">
              <X className="w-5 h-5 mr-2" />
              Fechar
            </Button>
          </div>
        </div>

        {/* Estatísticas Gerais */}
        <div className="p-6 bg-[#F5F1E8] border-b border-[#D4C5B0]">
          <h3 className="text-lg font-bold text-[#8B6F47] mb-4">📊 Visão Geral do Repertório</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-[#D4C5B0]">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-black text-[#8B6F47]">{songs.length}</p>
                <p className="text-sm text-[#A68A64]">Músicas Analisadas</p>
              </CardContent>
            </Card>
            <Card className="border-green-500 bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-black text-green-700">{stats.high}</p>
                <p className="text-sm text-green-600">Alta Similaridade (&gt;70%)</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-500 bg-yellow-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-black text-yellow-700">{stats.medium}</p>
                <p className="text-sm text-yellow-600">Média Similaridade (50-70%)</p>
              </CardContent>
            </Card>
            <Card className="border-orange-500 bg-orange-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-black text-orange-700">{stats.low}</p>
                <p className="text-sm text-orange-600">Baixa Similaridade (30-50%)</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lista de Músicas com Similares */}
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#8B6F47] flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Músicas e suas Harmonias Semelhantes
          </h3>

          {songs.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-[#A68A64] mx-auto mb-4" />
              <p className="text-[#A68A64]">Nenhuma música encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {songs.map(song => {
                const similars = similarityMap.get(song.id) || [];
                
                if (similars.length === 0) return null;

                return (
                  <Card key={song.id} className="border-[#D4C5B0] hover:shadow-lg transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-[#F5F1E8] to-white border-b border-[#D4C5B0]">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl text-[#8B6F47]">{song.title}</CardTitle>
                          <p className="text-sm text-[#A68A64] mt-1">{song.artist}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {song.main_key && (
                              <Badge variant="outline" className="text-xs">
                                <Key className="w-3 h-3 mr-1" />
                                {song.main_key}
                              </Badge>
                            )}
                            {song.predominant_progression && (
                              <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white text-xs">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {song.predominant_progression}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-[#8B6F47] mb-3">
                        {similars.length} música{similars.length > 1 ? 's' : ''} similar{similars.length > 1 ? 'es' : ''} encontrada{similars.length > 1 ? 's' : ''}:
                      </p>
                      <div className="space-y-2">
                        {similars.map(({ song: similar, score }) => (
                          <div 
                            key={similar.id}
                            className="flex items-center justify-between p-3 bg-[#F5F1E8] rounded-lg hover:bg-[#E8DCC4] transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#8B6F47] truncate">{similar.title}</p>
                              <p className="text-xs text-[#A68A64] truncate">{similar.artist}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Progress value={score} className="h-2 flex-1" />
                                <span className={`text-xs font-bold ${
                                  score > 70 ? 'text-green-600' : 
                                  score > 50 ? 'text-yellow-600' : 'text-orange-600'
                                }`}>
                                  {score}%
                                </span>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleCompare(song, similar)}
                              size="sm"
                              variant="outline"
                              className="ml-3 border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white flex-shrink-0">
                              <GitCompare className="w-3 h-3 mr-1" />
                              Comparar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}