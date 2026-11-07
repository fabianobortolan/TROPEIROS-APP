import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  X, Brain, Sparkles, Save, Trash2, Plus, 
  Music, Palette, User, BarChart3, CheckCircle, 
  AlertCircle, Loader2, Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Armazenamento local para preferências de treinamento
const STORAGE_KEY = 'ai_training_preferences';

const DEFAULT_PREFERENCES = {
  styles: {},      // Estilos preferidos com peso
  artists: {},     // Artistas de referência com características
  patterns: {},    // Padrões harmônicos preferidos
  rhythms: {},     // Ritmos preferidos
  corrections: []  // Correções feitas pelo usuário
};

export default function AITraining({ onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('styles');
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [newArtist, setNewArtist] = useState({ name: '', characteristics: '' });
  const [newPattern, setNewPattern] = useState({ name: '', pattern: '', weight: 50 });

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: progressions } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  const { data: rhythms } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: []
  });

  const { data: styles } = useQuery({
    queryKey: ['styles'],
    queryFn: () => base44.entities.Style.list(),
    initialData: []
  });

  // Carregar preferências salvas
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar preferências:', e);
      }
    }
  }, []);

  // Salvar preferências
  const savePreferences = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      setTimeout(() => {
        setIsSaving(false);
        alert('✅ Preferências salvas com sucesso!');
      }, 500);
    } catch (e) {
      console.error('Erro ao salvar:', e);
      setIsSaving(false);
      alert('❌ Erro ao salvar preferências');
    }
  };

  // Atualizar peso de estilo
  const updateStyleWeight = (styleName, weight) => {
    setPreferences(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        [styleName]: weight
      }
    }));
  };

  // Adicionar artista de referência
  const addArtist = () => {
    if (!newArtist.name.trim()) return;
    
    setPreferences(prev => ({
      ...prev,
      artists: {
        ...prev.artists,
        [newArtist.name]: {
          characteristics: newArtist.characteristics,
          addedAt: new Date().toISOString()
        }
      }
    }));
    setNewArtist({ name: '', characteristics: '' });
  };

  // Remover artista
  const removeArtist = (artistName) => {
    setPreferences(prev => {
      const newArtists = { ...prev.artists };
      delete newArtists[artistName];
      return { ...prev, artists: newArtists };
    });
  };

  // Adicionar padrão harmônico
  const addPattern = () => {
    if (!newPattern.name.trim() || !newPattern.pattern.trim()) return;
    
    setPreferences(prev => ({
      ...prev,
      patterns: {
        ...prev.patterns,
        [newPattern.name]: {
          pattern: newPattern.pattern,
          weight: newPattern.weight,
          addedAt: new Date().toISOString()
        }
      }
    }));
    setNewPattern({ name: '', pattern: '', weight: 50 });
  };

  // Atualizar peso de ritmo
  const updateRhythmWeight = (rhythmName, weight) => {
    setPreferences(prev => ({
      ...prev,
      rhythms: {
        ...prev.rhythms,
        [rhythmName]: weight
      }
    }));
  };

  // Adicionar correção
  const addCorrection = (original, corrected, context) => {
    setPreferences(prev => ({
      ...prev,
      corrections: [
        ...prev.corrections,
        { original, corrected, context, timestamp: new Date().toISOString() }
      ].slice(-50) // Manter apenas as últimas 50 correções
    }));
  };

  // Estatísticas de treinamento
  const trainingStats = {
    stylesConfigured: Object.keys(preferences.styles).length,
    artistsAdded: Object.keys(preferences.artists).length,
    patternsCustom: Object.keys(preferences.patterns).length,
    rhythmsWeighted: Object.keys(preferences.rhythms).length,
    corrections: preferences.corrections.length
  };

  const totalProgress = Math.min(
    ((trainingStats.stylesConfigured > 0 ? 20 : 0) +
    (trainingStats.artistsAdded > 0 ? 25 : 0) +
    (trainingStats.patternsCustom > 0 ? 25 : 0) +
    (trainingStats.rhythmsWeighted > 0 ? 15 : 0) +
    (trainingStats.corrections > 0 ? 15 : 0)),
    100
  );

  // Gerar prompt de contexto para IA
  const generateAIContext = () => {
    const context = [];
    
    if (Object.keys(preferences.styles).length > 0) {
      const topStyles = Object.entries(preferences.styles)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
      context.push(`Estilos preferidos: ${topStyles.join(', ')}`);
    }

    if (Object.keys(preferences.artists).length > 0) {
      const artists = Object.entries(preferences.artists)
        .map(([name, data]) => `${name} (${data.characteristics})`)
        .join('; ');
      context.push(`Artistas de referência: ${artists}`);
    }

    if (Object.keys(preferences.patterns).length > 0) {
      const patterns = Object.entries(preferences.patterns)
        .sort((a, b) => b[1].weight - a[1].weight)
        .slice(0, 5)
        .map(([name, data]) => `${name}: ${data.pattern}`)
        .join('; ');
      context.push(`Progressões favoritas: ${patterns}`);
    }

    return context.join('\n');
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
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#8B6F47] via-[#A68A64] to-[#9CAF88] text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Treinamento da IA</h2>
                <p className="text-white/90 text-sm">Personalize a análise musical com suas preferências</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={savePreferences}
                disabled={isSaving}
                className="bg-white/20 hover:bg-white/30 border border-white/40">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
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

        {/* Progresso */}
        <div className="p-6 bg-[#F5F1E8] border-b border-[#D4C5B0]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#8B6F47]">Progresso do Treinamento</span>
            <span className="text-sm font-bold text-[#8B6F47]">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-3" />
        </div>

        {/* Tabs de Configuração */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
          <TabsList className="mb-6 bg-[#E8DCC4] flex-wrap h-auto gap-1 w-full justify-start">
            <TabsTrigger value="styles" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
              <Palette className="w-4 h-4 mr-2" />
              Estilos
            </TabsTrigger>
            <TabsTrigger value="artists" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              Artistas
            </TabsTrigger>
            <TabsTrigger value="patterns" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
              <Music className="w-4 h-4 mr-2" />
              Padrões
            </TabsTrigger>
            <TabsTrigger value="rhythms" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Ritmos
            </TabsTrigger>
            <TabsTrigger value="context" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Contexto
            </TabsTrigger>
          </TabsList>

          {/* Tab: Estilos */}
          <TabsContent value="styles">
            <div className="space-y-4">
              <Card className="border-[#D4C5B0]">
                <CardHeader className="py-3">
                  <CardTitle className="text-lg text-[#8B6F47]">
                    Defina o peso de cada estilo na análise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { id: 'sertanejo_raiz', name: 'Sertanejo Raiz', color: 'bg-amber-500' },
                      { id: 'sertanejo_universitario', name: 'Sertanejo Universitário', color: 'bg-blue-500' },
                      { id: 'sertanejo_romantico', name: 'Sertanejo Romântico', color: 'bg-rose-500' },
                      { id: 'sertanejo_moderno', name: 'Sertanejo Moderno', color: 'bg-purple-500' },
                      { id: 'sertanejo_modao', name: 'Modão', color: 'bg-orange-500' }
                    ].map(style => (
                      <div key={style.id} className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full ${style.color}`} />
                        <span className="flex-1 font-medium text-[#8B6F47]">{style.name}</span>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={preferences.styles[style.id] || 50}
                          onChange={(e) => updateStyleWeight(style.id, parseInt(e.target.value))}
                          className="w-32"
                        />
                        <Badge className="w-12 justify-center bg-[#8B6F47]">
                          {preferences.styles[style.id] || 50}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Artistas */}
          <TabsContent value="artists">
            <div className="space-y-4">
              <Card className="border-[#D4C5B0]">
                <CardHeader className="py-3">
                  <CardTitle className="text-lg text-[#8B6F47]">
                    Artistas de Referência
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Nome do artista/dupla"
                      value={newArtist.name}
                      onChange={(e) => setNewArtist(prev => ({ ...prev, name: e.target.value }))}
                      className="border-[#D4C5B0]"
                    />
                    <Input
                      placeholder="Características (ex: viola, modão, romântico)"
                      value={newArtist.characteristics}
                      onChange={(e) => setNewArtist(prev => ({ ...prev, characteristics: e.target.value }))}
                      className="flex-1 border-[#D4C5B0]"
                    />
                    <Button onClick={addArtist} className="bg-[#8B6F47] hover:bg-[#A68A64]">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {Object.entries(preferences.artists).map(([name, data]) => (
                      <div key={name} className="flex items-center justify-between p-3 bg-[#F5F1E8] rounded-lg">
                        <div>
                          <p className="font-bold text-[#8B6F47]">{name}</p>
                          <p className="text-sm text-[#A68A64]">{data.characteristics}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArtist(name)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {Object.keys(preferences.artists).length === 0 && (
                      <p className="text-center text-[#A68A64] py-4">
                        Nenhum artista adicionado. Adicione artistas para refinar a análise.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Padrões Harmônicos */}
          <TabsContent value="patterns">
            <div className="space-y-4">
              <Card className="border-[#D4C5B0]">
                <CardHeader className="py-3">
                  <CardTitle className="text-lg text-[#8B6F47]">
                    Progressões Harmônicas Favoritas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                    <Input
                      placeholder="Nome (ex: Terra Sertaneja)"
                      value={newPattern.name}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, name: e.target.value }))}
                      className="border-[#D4C5B0]"
                    />
                    <Input
                      placeholder="Padrão (ex: I-IV-V-I)"
                      value={newPattern.pattern}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, pattern: e.target.value }))}
                      className="border-[#D4C5B0]"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="Peso"
                        value={newPattern.weight}
                        onChange={(e) => setNewPattern(prev => ({ ...prev, weight: parseInt(e.target.value) || 50 }))}
                        className="w-20 border-[#D4C5B0]"
                      />
                      <Button onClick={addPattern} className="bg-[#8B6F47] hover:bg-[#A68A64] flex-1">
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(preferences.patterns).map(([name, data]) => (
                      <div key={name} className="flex items-center justify-between p-3 bg-[#F5F1E8] rounded-lg">
                        <div className="flex-1">
                          <p className="font-bold text-[#8B6F47]">{name}</p>
                          <p className="text-sm font-mono text-[#A68A64]">{data.pattern}</p>
                        </div>
                        <Badge className="mx-2 bg-[#D4AF37]">{data.weight}%</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newPatterns = { ...preferences.patterns };
                            delete newPatterns[name];
                            setPreferences(prev => ({ ...prev, patterns: newPatterns }));
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Progressões do banco com variações */}
                    <div className="mt-6 pt-4 border-t border-[#D4C5B0]">
                      <p className="text-sm font-bold text-[#8B6F47] mb-3">
                        📚 Progressões Cadastradas no Sistema ({progressions.length})
                      </p>
                      <p className="text-xs text-[#A68A64] mb-3">
                        Clique em uma progressão para adicionar aos seus favoritos
                      </p>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {progressions.map(prog => (
                          <div key={prog.id} className="bg-white rounded border border-[#D4C5B0]">
                            <div 
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#F5F1E8] transition-colors"
                              onClick={() => setNewPattern({ name: prog.name, pattern: prog.pattern, weight: 50 })}>
                              <div className="flex-1">
                                <p className="font-bold text-[#8B6F47]">{prog.name}</p>
                                <p className="text-sm font-mono text-[#A68A64]">{prog.pattern}</p>
                              </div>
                              <Plus className="w-4 h-4 text-[#8B6F47]" />
                            </div>
                            
                            {/* Variações */}
                            {prog.variations && prog.variations.length > 0 && (
                              <div className="px-3 pb-2 pt-1 border-t border-[#D4C5B0]/50 bg-[#F5F1E8]/30">
                                <p className="text-xs font-bold text-[#A68A64] mb-1">Variações:</p>
                                <div className="space-y-1">
                                  {prog.variations.map((variation, idx) => (
                                    <div 
                                      key={idx}
                                      className="flex items-center justify-between p-2 bg-white/80 rounded cursor-pointer hover:bg-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNewPattern({ 
                                          name: variation.name || `${prog.name} - Variação ${idx + 1}`, 
                                          pattern: variation.pattern, 
                                          weight: 50 
                                        });
                                      }}>
                                      <div className="flex-1">
                                        {variation.name && (
                                          <p className="text-xs font-medium text-[#8B6F47]">{variation.name}</p>
                                        )}
                                        <p className="text-xs font-mono text-[#A68A64]">{variation.pattern}</p>
                                      </div>
                                      <Plus className="w-3 h-3 text-[#9CAF88]" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Ritmos */}
          <TabsContent value="rhythms">
            <div className="space-y-4">
              <Card className="border-[#D4C5B0]">
                <CardHeader className="py-3">
                  <CardTitle className="text-lg text-[#8B6F47]">
                    Peso dos Ritmos na Análise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#8B6F47] mb-4">
                    Defina a importância de cada ritmo nas análises e sugestões da IA
                  </p>
                  <div className="space-y-3">
                    {rhythms.map(rhythm => (
                      <div key={rhythm.id} className="p-3 bg-white rounded border border-[#D4C5B0]">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="flex-1 font-bold text-[#8B6F47]">{rhythm.name}</span>
                          <Input
                            type="range"
                            min="0"
                            max="100"
                            value={preferences.rhythms[rhythm.name] || 50}
                            onChange={(e) => updateRhythmWeight(rhythm.name, parseInt(e.target.value))}
                            className="w-32"
                          />
                          <Badge className="w-12 justify-center bg-[#9CAF88]">
                            {preferences.rhythms[rhythm.name] || 50}%
                          </Badge>
                        </div>
                        {rhythm.description && (
                          <p className="text-xs text-[#A68A64] ml-1">{rhythm.description}</p>
                        )}
                        {rhythm.time_signature && (
                          <p className="text-xs text-[#A68A64] ml-1">
                            Compasso: {rhythm.time_signature}
                            {rhythm.sound && ` • ${rhythm.sound}`}
                          </p>
                        )}
                      </div>
                    ))}
                    {rhythms.length === 0 && (
                      <p className="text-center text-[#A68A64] py-4">
                        Nenhum ritmo cadastrado. Cadastre ritmos na página de Ritmos para treinar a IA.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Contexto Gerado */}
          <TabsContent value="context">
            <div className="space-y-4">
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="py-3">
                  <CardTitle className="text-lg text-purple-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Contexto para IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-purple-700 mb-4">
                    Este contexto será usado para refinar as análises da IA com base em suas preferências:
                  </p>
                  <Textarea
                    value={generateAIContext()}
                    readOnly
                    className="min-h-[150px] font-mono text-sm bg-white"
                  />
                  <p className="text-xs text-purple-600 mt-2">
                    * O contexto é gerado automaticamente baseado nas suas configurações
                  </p>
                </CardContent>
              </Card>

              <Card className="border-[#D4C5B0]">
                <CardHeader className="py-3">
                  <CardTitle className="text-lg text-[#8B6F47]">
                    Estatísticas de Treinamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-[#F5F1E8] rounded-lg">
                      <p className="text-2xl font-bold text-[#8B6F47]">{trainingStats.stylesConfigured}</p>
                      <p className="text-xs text-[#A68A64]">Estilos</p>
                    </div>
                    <div className="text-center p-3 bg-[#F5F1E8] rounded-lg">
                      <p className="text-2xl font-bold text-[#8B6F47]">{trainingStats.artistsAdded}</p>
                      <p className="text-xs text-[#A68A64]">Artistas</p>
                    </div>
                    <div className="text-center p-3 bg-[#F5F1E8] rounded-lg">
                      <p className="text-2xl font-bold text-[#8B6F47]">{trainingStats.patternsCustom}</p>
                      <p className="text-xs text-[#A68A64]">Padrões</p>
                    </div>
                    <div className="text-center p-3 bg-[#F5F1E8] rounded-lg">
                      <p className="text-2xl font-bold text-[#8B6F47]">{trainingStats.rhythmsWeighted}</p>
                      <p className="text-xs text-[#A68A64]">Ritmos</p>
                    </div>
                    <div className="text-center p-3 bg-[#F5F1E8] rounded-lg">
                      <p className="text-2xl font-bold text-[#8B6F47]">{songs.length}</p>
                      <p className="text-xs text-[#A68A64]">Músicas Base</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}