import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Music, TrendingUp, Clock, Waves, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

export default function CompareAnalyses({ onClose, initialSong1 = null, initialSong2 = null }) {
  const [song1Id, setSong1Id] = useState(initialSong1);
  const [song2Id, setSong2Id] = useState(initialSong2);

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const song1 = songs.find(s => s.id === song1Id);
  const song2 = songs.find(s => s.id === song2Id);

  // Calcula similaridade harmônica entre duas músicas
  const calculateSimilarity = (s1, s2) => {
    if (!s1 || !s2) return 0;
    
    let score = 0;
    
    // 1. Progressão predominante (40 pontos)
    if (s1.predominant_progression && s2.predominant_progression) {
      if (s1.predominant_progression === s2.predominant_progression) {
        score += 40;
      }
    }
    
    // 2. Progressões em comum (30 pontos)
    const prog1 = new Set((s1.progressions || []).map(p => p.progression_name).filter(Boolean));
    const prog2 = new Set((s2.progressions || []).map(p => p.progression_name).filter(Boolean));
    const common = [...prog1].filter(p => prog2.has(p));
    if (prog1.size > 0 && prog2.size > 0) {
      const commonRatio = common.length / Math.max(prog1.size, prog2.size);
      score += Math.round(commonRatio * 30);
    }
    
    // 3. Mesmo tom (15 pontos)
    if (s1.main_key && s2.main_key && s1.main_key === s2.main_key) {
      score += 15;
    }
    
    // 4. Mesmo ritmo (15 pontos)
    if (s1.rhythm_name && s2.rhythm_name && s1.rhythm_name === s2.rhythm_name) {
      score += 15;
    }
    
    return score;
  };

  // Sugere músicas similares baseado na primeira selecionada
  const suggestedSongs = useMemo(() => {
    if (!song1Id || !songs || songs.length === 0) return [];
    
    return songs
      .filter(s => s.id !== song1Id)
      .map(s => ({
        ...s,
        similarity: calculateSimilarity(song1, s)
      }))
      .filter(s => s.similarity > 20) // Mínimo 20% de similaridade
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5
  }, [song1Id, songs, song1]);

  const currentSimilarity = useMemo(() => {
    return calculateSimilarity(song1, song2);
  }, [song1, song2]);

  const ComparisonCard = ({ song, label }) => {
    if (!song) {
      return (
        <Card className="border-[#D4C5B0] h-full flex items-center justify-center">
          <CardContent className="text-center p-8">
            <Music className="w-12 h-12 text-[#A68A64] mx-auto mb-3" />
            <p className="text-[#A68A64]">Selecione uma música</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm h-full">
        <CardHeader className="border-b border-[#D4C5B0]">
          <div className="flex items-start justify-between">
            <div>
              <Badge className="mb-2">{label}</Badge>
              <CardTitle className="text-xl text-[#8B6F47]">{song.title}</CardTitle>
              <p className="text-sm text-[#A68A64]">{song.artist}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Informações gerais */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F5F1E8] p-3 rounded-lg">
              <p className="text-xs text-[#A68A64] mb-1">Tom Principal</p>
              <p className="font-bold text-[#8B6F47] text-lg">{song.main_key || "N/A"}</p>
            </div>
            <div className="bg-[#F5F1E8] p-3 rounded-lg">
              <p className="text-xs text-[#A68A64] mb-1">BPM</p>
              <p className="font-bold text-[#8B6F47] text-lg">{song.tempo || "N/A"}</p>
            </div>
          </div>

          {/* Progressão Predominante */}
          {song.predominant_progression && (
            <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#9CAF88]/20 p-3 rounded-lg border border-[#D4AF37]/30">
              <p className="text-xs text-[#A68A64] mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Progressão Predominante
              </p>
              <p className="font-bold text-[#8B6F47]">{song.predominant_progression}</p>
              <p className="text-xs font-mono text-[#A68A64] mt-1">{song.predominant_progression_pattern}</p>
            </div>
          )}

          {/* Progressões por seção */}
          <div>
            <p className="text-sm font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
              <Waves className="w-4 h-4" />
              Progressões por Seção
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {song.progressions && song.progressions.length > 0 ? (
                song.progressions.map((prog, idx) => (
                  <div key={idx} className="bg-[#F5F1E8] p-2 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#8B6F47]">{prog.section}</span>
                      {prog.progression_name && (
                        <Badge variant="outline" className="text-xs">{prog.progression_name}</Badge>
                      )}
                    </div>
                    <p className="font-mono text-[#A68A64]">{prog.pattern || "N/A"}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#A68A64] text-center py-4">Nenhuma progressão analisada</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#D4C5B0] p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#8B6F47]">Comparar Análises</h2>
            <p className="text-sm text-[#A68A64]">Compare progressões harmônicas lado a lado</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          {/* Seletores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8B6F47]">Música 1</label>
              <Select value={song1Id || ""} onValueChange={setSong1Id}>
                <SelectTrigger className="border-[#D4C5B0]">
                  <SelectValue placeholder="Selecione a primeira música..." />
                </SelectTrigger>
                <SelectContent>
                  {songs.map((song) => (
                    <SelectItem key={song.id} value={song.id}>
                      {song.title} - {song.artist}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8B6F47] flex items-center gap-2">
                <span>Música 2</span>
                {suggestedSongs.length > 0 && (
                  <Badge variant="outline" className="text-xs bg-[#9CAF88]/10 border-[#9CAF88]">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {suggestedSongs.length} similares
                  </Badge>
                )}
              </label>
              <Select value={song2Id || ""} onValueChange={setSong2Id}>
                <SelectTrigger className="border-[#D4C5B0]">
                  <SelectValue placeholder="Selecione a segunda música..." />
                </SelectTrigger>
                <SelectContent>
                  {suggestedSongs.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-bold text-[#9CAF88] bg-[#9CAF88]/10">
                        ✨ SUGESTÕES SIMILARES
                      </div>
                      {suggestedSongs.map((song) => (
                        <SelectItem key={song.id} value={song.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{song.title} - {song.artist}</span>
                            <Badge className="ml-2 bg-[#9CAF88] text-white text-xs">
                              {song.similarity}%
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1.5 text-xs font-bold text-[#A68A64] bg-gray-50">
                        TODAS AS MÚSICAS
                      </div>
                    </>
                  )}
                  {songs
                    .filter(s => s.id !== song1Id)
                    .filter(s => !suggestedSongs.find(sg => sg.id === s.id))
                    .map((song) => (
                      <SelectItem key={song.id} value={song.id}>
                        {song.title} - {song.artist}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparação lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComparisonCard song={song1} label="Música 1" />
            <ComparisonCard song={song2} label="Música 2" />
          </div>

          {/* Resumo da comparação */}
          {song1 && song2 && (
            <Card className="mt-6 border-[#9CAF88] bg-[#9CAF88]/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[#8B6F47]">Análise de Similaridade Harmônica</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`text-base px-3 py-1 ${
                        currentSimilarity >= 70 ? 'bg-green-600' :
                        currentSimilarity >= 40 ? 'bg-yellow-600' :
                        'bg-red-600'
                      } text-white`}
                    >
                      {currentSimilarity >= 70 ? <CheckCircle2 className="w-4 h-4 mr-1" /> :
                       currentSimilarity >= 40 ? <AlertCircle className="w-4 h-4 mr-1" /> :
                       <X className="w-4 h-4 mr-1" />}
                      {currentSimilarity}% similar
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-[#A68A64] mt-2">
                  {currentSimilarity >= 70 ? '🎵 Alta similaridade - Músicas muito parecidas harmonicamente!' :
                   currentSimilarity >= 40 ? '🎸 Similaridade média - Algumas progressões em comum' :
                   '⚠️ Baixa similaridade - Músicas harmonicamente diferentes'}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-[#A68A64] font-semibold">Progressão Predominante:</span>
                  <span className="font-bold text-[#8B6F47]">
                    {song1.predominant_progression === song2.predominant_progression 
                      ? `✓ Mesma progressão (${song1.predominant_progression})` 
                      : `${song1.predominant_progression || "N/A"} vs ${song2.predominant_progression || "N/A"}`}
                  </span>
                </div>
                
                {(() => {
                  const prog1 = new Set((song1.progressions || []).map(p => p.progression_name).filter(Boolean));
                  const prog2 = new Set((song2.progressions || []).map(p => p.progression_name).filter(Boolean));
                  const common = [...prog1].filter(p => prog2.has(p));
                  
                  if (common.length > 0) {
                    return (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="font-semibold text-green-800 mb-2">✓ {common.length} progressão/ões em comum:</p>
                        <div className="flex flex-wrap gap-2">
                          {common.map(prog => (
                            <Badge key={prog} className="bg-green-600 text-white">{prog}</Badge>
                          ))}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-orange-800">⚠️ Nenhuma progressão harmônica em comum</p>
                      </div>
                    );
                  }
                })()}

                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-[#A68A64] font-semibold">Ritmo/Marcha:</span>
                  <span className="font-bold text-[#8B6F47]">
                    {song1.rhythm_name && song2.rhythm_name && song1.rhythm_name === song2.rhythm_name
                      ? `✓ Mesmo ritmo (${song1.rhythm_name})`
                      : `${song1.rhythm_name || "N/A"} vs ${song2.rhythm_name || "N/A"}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}