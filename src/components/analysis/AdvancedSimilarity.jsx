import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, TrendingUp, Key, Music, Sparkles, GitCompare, 
  Music4, BarChart3, Layers, Zap, Settings 
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

// Fatores de análise com pesos configuráveis
const DEFAULT_WEIGHTS = {
  harmonic: 40,    // Progressão predominante
  rhythmic: 25,    // Ritmo/marcha
  melodic: 20,     // Padrões de progressão por seção
  structural: 15   // Estrutura (quantidade e tipo de seções)
};

export default function AdvancedSimilarity({ onClose, onSelectSongs }) {
  const [selectedSong, setSelectedSong] = useState(null);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [showConfig, setShowConfig] = useState(false);

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: rhythms } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: []
  });

  // Análise de similaridade avançada
  const calculateAdvancedSimilarity = (song1, song2) => {
    if (song1.id === song2.id) return { total: 0, breakdown: {} };
    
    const breakdown = {};
    let totalScore = 0;

    // 1. HARMÔNICO: Progressão predominante e padrões
    breakdown.harmonic = 0;
    if (song1.predominant_progression && song2.predominant_progression) {
      if (song1.predominant_progression === song2.predominant_progression) {
        breakdown.harmonic = 100;
      } else {
        // Verificar se compartilham padrão similar (ex: I-IV-V vs I-V-IV)
        const pattern1 = song1.predominant_progression_pattern || '';
        const pattern2 = song2.predominant_progression_pattern || '';
        if (pattern1 && pattern2) {
          const chords1 = pattern1.split('-');
          const chords2 = pattern2.split('-');
          const common = chords1.filter(c => chords2.includes(c)).length;
          breakdown.harmonic = Math.round((common / Math.max(chords1.length, chords2.length)) * 70);
        }
      }
    }
    totalScore += (breakdown.harmonic * weights.harmonic) / 100;

    // 2. RÍTMICO: Ritmo e tempo
    breakdown.rhythmic = 0;
    if (song1.rhythm_name && song2.rhythm_name) {
      if (song1.rhythm_name === song2.rhythm_name) {
        breakdown.rhythmic = 100;
      } else {
        // Verificar família rítmica similar
        const rhythmFamilies = {
          'Guarânia': ['Guarânia', 'Rasqueado', 'Toada'],
          'Vanera': ['Vanera', 'Vanerão', 'Milonga'],
          'Xote': ['Xote', 'Baião', 'Forró'],
          'Sertanejo': ['Sertanejo', 'Balada', 'Arrocha']
        };
        for (const [family, members] of Object.entries(rhythmFamilies)) {
          if (members.includes(song1.rhythm_name) && members.includes(song2.rhythm_name)) {
            breakdown.rhythmic = 60;
            break;
          }
        }
      }
    }
    // Considerar BPM similar (±20 BPM = 50 pontos)
    if (song1.tempo && song2.tempo) {
      const bpmDiff = Math.abs(song1.tempo - song2.tempo);
      if (bpmDiff <= 20) {
        breakdown.rhythmic = Math.max(breakdown.rhythmic, 50 + (20 - bpmDiff) * 2.5);
      }
    }
    totalScore += (breakdown.rhythmic * weights.rhythmic) / 100;

    // 3. MELÓDICO: Padrões de progressão por seção
    breakdown.melodic = 0;
    const prog1 = (song1.progressions || []).map(p => p.pattern).filter(Boolean);
    const prog2 = (song2.progressions || []).map(p => p.pattern).filter(Boolean);
    if (prog1.length > 0 && prog2.length > 0) {
      // Contar padrões em comum
      const commonPatterns = prog1.filter(p => prog2.includes(p)).length;
      breakdown.melodic = Math.round((commonPatterns / Math.max(prog1.length, prog2.length)) * 100);
    }
    totalScore += (breakdown.melodic * weights.melodic) / 100;

    // 4. ESTRUTURAL: Tipo e quantidade de seções
    breakdown.structural = 0;
    const sections1 = new Set((song1.progressions || []).map(p => p.section?.toLowerCase()));
    const sections2 = new Set((song2.progressions || []).map(p => p.section?.toLowerCase()));
    if (sections1.size > 0 && sections2.size > 0) {
      const commonSections = [...sections1].filter(s => sections2.has(s)).length;
      breakdown.structural = Math.round((commonSections / Math.max(sections1.size, sections2.size)) * 100);
    }
    totalScore += (breakdown.structural * weights.structural) / 100;

    return { 
      total: Math.round(totalScore), 
      breakdown 
    };
  };

  // Mapa de similaridades
  const similarityMap = useMemo(() => {
    const map = new Map();
    
    songs.forEach(song => {
      const similarities = songs
        .map(other => ({
          song: other,
          ...calculateAdvancedSimilarity(song, other)
        }))
        .filter(s => s.total > 25)
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      if (similarities.length > 0) {
        map.set(song.id, similarities);
      }
    });

    return map;
  }, [songs, weights]);

  // Estatísticas
  const stats = useMemo(() => {
    let high = 0, medium = 0, low = 0;
    const analyzed = new Set();

    songs.forEach(song1 => {
      songs.forEach(song2 => {
        if (song1.id >= song2.id) return;
        const key = `${song1.id}-${song2.id}`;
        if (analyzed.has(key)) return;
        analyzed.add(key);

        const { total } = calculateAdvancedSimilarity(song1, song2);
        if (total > 70) high++;
        else if (total > 50) medium++;
        else if (total > 25) low++;
      });
    });

    return { high, medium, low };
  }, [songs, weights]);

  const handleCompare = (song1, song2) => {
    onSelectSongs(song1, song2);
    onClose();
  };

  const updateWeight = (key, value) => {
    const newWeights = { ...weights, [key]: value[0] };
    // Normalizar para somar 100
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      const factor = 100 / total;
      Object.keys(newWeights).forEach(k => {
        newWeights[k] = Math.round(newWeights[k] * factor);
      });
    }
    setWeights(newWeights);
  };

  const getScoreColor = (score) => {
    if (score > 70) return 'text-green-600 bg-green-50 border-green-200';
    if (score > 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score > 25) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
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
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-500 text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Análise de Similaridade Avançada</h2>
                <p className="text-white/90 text-sm">Harmônica • Rítmica • Melódica • Estrutural</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowConfig(!showConfig)}
                variant="outline"
                className="bg-white/20 border-white/40 text-white hover:bg-white/30">
                <Settings className="w-4 h-4 mr-2" />
                Configurar Pesos
              </Button>
              <Button
                onClick={onClose}
                className="bg-red-600 hover:bg-red-700 text-white">
                <X className="w-5 h-5 mr-2" />
                Fechar
              </Button>
            </div>
          </div>
        </div>

        {/* Configuração de Pesos */}
        {showConfig && (
          <div className="p-4 bg-purple-50 border-b border-purple-200">
            <h3 className="font-bold text-purple-800 mb-4">⚙️ Ajustar Pesos de Análise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'harmonic', label: 'Harmônico', icon: TrendingUp, desc: 'Progressão predominante' },
                { key: 'rhythmic', label: 'Rítmico', icon: Music4, desc: 'Ritmo e BPM' },
                { key: 'melodic', label: 'Melódico', icon: Layers, desc: 'Padrões de seção' },
                { key: 'structural', label: 'Estrutural', icon: BarChart3, desc: 'Tipo de seções' }
              ].map(({ key, label, icon: Icon, desc }) => (
                <div key={key} className="bg-white p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-purple-800">{label}</span>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">{weights[key]}%</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{desc}</p>
                  <Slider
                    value={[weights[key]]}
                    onValueChange={(v) => updateWeight(key, v)}
                    max={60}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
            <Button
              onClick={() => setWeights(DEFAULT_WEIGHTS)}
              variant="outline"
              size="sm"
              className="mt-3 text-purple-600 border-purple-300">
              Restaurar Padrões
            </Button>
          </div>
        )}

        {/* Estatísticas */}
        <div className="p-6 bg-[#F5F1E8] border-b border-[#D4C5B0]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-[#D4C5B0]">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-black text-[#8B6F47]">{songs.length}</p>
                <p className="text-xs text-[#A68A64]">Músicas</p>
              </CardContent>
            </Card>
            <Card className="border-green-400 bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-black text-green-700">{stats.high}</p>
                <p className="text-xs text-green-600">Alta (&gt;70%)</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-400 bg-yellow-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-black text-yellow-700">{stats.medium}</p>
                <p className="text-xs text-yellow-600">Média (50-70%)</p>
              </CardContent>
            </Card>
            <Card className="border-orange-400 bg-orange-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-black text-orange-700">{stats.low}</p>
                <p className="text-xs text-orange-600">Baixa (25-50%)</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lista de Similaridades */}
        <div className="p-6 space-y-4">
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
                    <CardHeader className="bg-gradient-to-r from-[#F5F1E8] to-white border-b border-[#D4C5B0] py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg text-[#8B6F47]">{song.title}</CardTitle>
                          <p className="text-sm text-[#A68A64]">{song.artist}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {song.rhythm_name && (
                              <Badge variant="outline" className="text-xs">
                                <Music4 className="w-3 h-3 mr-1" />
                                {song.rhythm_name}
                              </Badge>
                            )}
                            {song.predominant_progression && (
                              <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white text-xs">
                                {song.predominant_progression}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {similars.map(({ song: similar, total, breakdown }) => (
                          <div 
                            key={similar.id}
                            className="p-3 bg-[#F5F1E8] rounded-lg hover:bg-[#E8DCC4] transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#8B6F47] truncate">{similar.title}</p>
                                <p className="text-xs text-[#A68A64]">{similar.artist}</p>
                              </div>
                              <Badge className={`ml-2 ${getScoreColor(total)} border`}>
                                {total}%
                              </Badge>
                            </div>
                            
                            {/* Breakdown visual */}
                            <div className="grid grid-cols-4 gap-1 mt-2">
                              <div className="text-center">
                                <div className={`h-2 rounded ${breakdown.harmonic > 50 ? 'bg-purple-500' : 'bg-purple-200'}`} 
                                     style={{ width: `${breakdown.harmonic}%`, minWidth: '4px' }} />
                                <p className="text-[10px] text-gray-500 mt-1">Harm {breakdown.harmonic}%</p>
                              </div>
                              <div className="text-center">
                                <div className={`h-2 rounded ${breakdown.rhythmic > 50 ? 'bg-blue-500' : 'bg-blue-200'}`}
                                     style={{ width: `${breakdown.rhythmic}%`, minWidth: '4px' }} />
                                <p className="text-[10px] text-gray-500 mt-1">Ritmo {breakdown.rhythmic}%</p>
                              </div>
                              <div className="text-center">
                                <div className={`h-2 rounded ${breakdown.melodic > 50 ? 'bg-green-500' : 'bg-green-200'}`}
                                     style={{ width: `${breakdown.melodic}%`, minWidth: '4px' }} />
                                <p className="text-[10px] text-gray-500 mt-1">Melod {breakdown.melodic}%</p>
                              </div>
                              <div className="text-center">
                                <div className={`h-2 rounded ${breakdown.structural > 50 ? 'bg-orange-500' : 'bg-orange-200'}`}
                                     style={{ width: `${breakdown.structural}%`, minWidth: '4px' }} />
                                <p className="text-[10px] text-gray-500 mt-1">Estrut {breakdown.structural}%</p>
                              </div>
                            </div>

                            <div className="flex justify-end mt-2">
                              <Button
                                onClick={() => handleCompare(song, similar)}
                                size="sm"
                                variant="outline"
                                className="border-purple-400 text-purple-600 hover:bg-purple-500 hover:text-white">
                                <GitCompare className="w-3 h-3 mr-1" />
                                Comparar
                              </Button>
                            </div>
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