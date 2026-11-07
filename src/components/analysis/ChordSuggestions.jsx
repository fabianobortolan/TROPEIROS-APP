import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, Lightbulb, Music2, RefreshCw, Sparkles, 
  ArrowRight, Copy, Check, Zap, BookOpen
} from "lucide-react";
import { motion } from "framer-motion";

// Base de conhecimento de substituições harmônicas
const CHORD_SUBSTITUTIONS = {
  // Substituições por função harmônica
  major: {
    substitutes: ['maj7', 'add9', '6', 'sus4→maj'],
    relative: 'minor',  // vi substitui I
    parallel: 'minor',  // i substitui I
    tritone: false
  },
  minor: {
    substitutes: ['m7', 'm9', 'm6', 'sus4→m'],
    relative: 'major',  // III substitui vi
    parallel: 'major',
    tritone: false
  },
  dominant7: {
    substitutes: ['9', '13', '7sus4', '7#9', '7b9'],
    relative: 'dim7',   // vii° substitui V7
    parallel: false,
    tritone: true       // Substituição por trítono
  },
  diminished: {
    substitutes: ['m7b5', 'dim7'],
    relative: 'dominant7',
    parallel: false,
    tritone: false
  }
};

// Mapa de notas para cálculo de trítono
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Progressões comuns para sugestão
const COMMON_PROGRESSIONS = {
  'I-IV-V-I': { name: 'Clássica', style: 'sertanejo_raiz', alternatives: ['I-IV-ii-V', 'I-vi-IV-V'] },
  'I-V-vi-IV': { name: 'Pop', style: 'sertanejo_universitario', alternatives: ['I-V-ii-IV', 'vi-IV-I-V'] },
  'I-vi-IV-V': { name: 'Anos 50', style: 'sertanejo_romantico', alternatives: ['I-vi-ii-V', 'I-iii-IV-V'] },
  'ii-V-I': { name: 'Jazz', style: 'mpb', alternatives: ['ii-bVII-I', 'iv-bVII-I'] },
  'I-IV-I-V': { name: 'Country', style: 'sertanejo_raiz', alternatives: ['I-IV-V-IV', 'I-ii-IV-V'] },
  'I-bVII-IV-I': { name: 'Rock', style: 'sertanejo_moderno', alternatives: ['I-bVII-bVI-V', 'I-bIII-bVII-IV'] }
};

export default function ChordSuggestions({ onClose, initialChords = '', initialKey = 'C' }) {
  const [inputChords, setInputChords] = useState(initialChords);
  const [selectedKey, setSelectedKey] = useState(initialKey);
  const [copiedChord, setCopiedChord] = useState(null);
  const [activeTab, setActiveTab] = useState('substitutes');

  const { data: progressions } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  // Identificar tipo do acorde
  const getChordType = (chord) => {
    const c = chord.toLowerCase();
    if (c.includes('dim') || c.includes('°')) return 'diminished';
    if (c.includes('7') && !c.includes('m7') && !c.includes('maj7')) return 'dominant7';
    if (c.includes('m') || c.includes('min')) return 'minor';
    return 'major';
  };

  // Extrair nota raiz do acorde
  const getRootNote = (chord) => {
    const match = chord.match(/^([A-G][#b]?)/i);
    return match ? match[1].toUpperCase() : null;
  };

  // Calcular substituição por trítono
  const getTritoneSubstitute = (chord) => {
    const root = getRootNote(chord);
    if (!root) return null;
    
    let noteIndex = NOTES.indexOf(root);
    if (noteIndex === -1) noteIndex = NOTES_FLAT.indexOf(root);
    if (noteIndex === -1) return null;
    
    const tritoneIndex = (noteIndex + 6) % 12;
    const newRoot = NOTES[tritoneIndex];
    
    // Manter a qualidade do acorde
    const suffix = chord.replace(/^[A-G][#b]?/i, '');
    return newRoot + suffix;
  };

  // Gerar substituições para um acorde
  const generateSubstitutions = (chord) => {
    const root = getRootNote(chord);
    const type = getChordType(chord);
    const subs = CHORD_SUBSTITUTIONS[type];
    
    if (!root || !subs) return [];

    const suggestions = [];

    // Extensões e alterações
    subs.substitutes.forEach(sub => {
      if (sub.includes('→')) {
        const [from, to] = sub.split('→');
        suggestions.push({
          chord: root + to,
          type: 'extensão',
          reason: `Adicionar tensão com ${from} resolvendo para ${to}`,
          color: 'bg-blue-100 text-blue-800'
        });
      } else {
        suggestions.push({
          chord: root + sub,
          type: 'extensão',
          reason: `Enriquecer com ${sub}`,
          color: 'bg-blue-100 text-blue-800'
        });
      }
    });

    // Substituição por trítono (apenas dominantes)
    if (subs.tritone) {
      const tritone = getTritoneSubstitute(chord);
      if (tritone) {
        suggestions.push({
          chord: tritone,
          type: 'trítono',
          reason: 'Substituição cromática por trítono - mesma tensão, baixo diferente',
          color: 'bg-purple-100 text-purple-800'
        });
      }
    }

    // Relativo
    if (subs.relative) {
      let noteIndex = NOTES.indexOf(root);
      if (noteIndex === -1) noteIndex = NOTES_FLAT.indexOf(root);
      
      if (type === 'major') {
        // vi para I
        const relIndex = (noteIndex + 9) % 12;
        suggestions.push({
          chord: NOTES[relIndex] + 'm',
          type: 'relativo',
          reason: 'Relativo menor - mesmas notas, centro tonal diferente',
          color: 'bg-green-100 text-green-800'
        });
      } else if (type === 'minor') {
        // III para vi
        const relIndex = (noteIndex + 3) % 12;
        suggestions.push({
          chord: NOTES[relIndex],
          type: 'relativo',
          reason: 'Relativo maior - abre para ambiente mais luminoso',
          color: 'bg-green-100 text-green-800'
        });
      }
    }

    return suggestions;
  };

  // Analisar progressão de entrada
  const parsedChords = useMemo(() => {
    if (!inputChords.trim()) return [];
    
    return inputChords
      .split(/[\s,\-→|]+/)
      .filter(c => c.trim())
      .map(chord => ({
        original: chord.trim(),
        substitutions: generateSubstitutions(chord.trim())
      }));
  }, [inputChords]);

  // Sugerir progressões alternativas
  const suggestAlternativeProgressions = useMemo(() => {
    if (parsedChords.length < 3) return [];
    
    const suggestions = [];
    
    // Verificar se a progressão atual corresponde a alguma comum
    const currentPattern = parsedChords.map(p => p.original).join('-');
    
    Object.entries(COMMON_PROGRESSIONS).forEach(([pattern, info]) => {
      // Sugerir alternativas de progressões conhecidas
      info.alternatives.forEach(alt => {
        suggestions.push({
          name: `Variação de ${info.name}`,
          pattern: alt,
          style: info.style,
          reason: `Baseado em ${pattern}`
        });
      });
    });

    // Adicionar progressões do banco
    progressions.slice(0, 5).forEach(prog => {
      if (prog.variations && prog.variations.length > 0) {
        prog.variations.forEach(variation => {
          suggestions.push({
            name: variation.name || prog.name,
            pattern: variation.pattern,
            style: 'database',
            reason: `Do banco: ${prog.name}`
          });
        });
      }
    });

    return suggestions.slice(0, 8);
  }, [parsedChords, progressions]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedChord(text);
    setTimeout(() => setCopiedChord(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto"
      onClick={onClose}>
      
      <Button
        onClick={onClose}
        size="lg"
        className="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white shadow-2xl">
        <X className="w-5 h-5 mr-2" />
        Fechar
      </Button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Sugestões de Acordes</h2>
              <p className="text-white/90 text-sm">Substitutos, extensões e variações harmônicas</p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-6 bg-[#F5F1E8] border-b border-[#D4C5B0]">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#8B6F47] mb-2">
                Digite os acordes (separados por espaço, vírgula ou hífen)
              </label>
              <Input
                placeholder="Ex: C G Am F ou C - G - Am - F"
                value={inputChords}
                onChange={(e) => setInputChords(e.target.value)}
                className="text-lg border-[#D4C5B0]"
              />
            </div>
            <div className="w-full md:w-32">
              <label className="block text-sm font-medium text-[#8B6F47] mb-2">Tom</label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger className="border-[#D4C5B0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTES.map(note => (
                    <SelectItem key={note} value={note}>{note}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
          <TabsList className="mb-6 bg-[#E8DCC4]">
            <TabsTrigger 
              value="substitutes"
              className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
              <Zap className="w-4 h-4 mr-2" />
              Substitutos
            </TabsTrigger>
            <TabsTrigger 
              value="progressions"
              className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Progressões
            </TabsTrigger>
            <TabsTrigger 
              value="theory"
              className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
              <BookOpen className="w-4 h-4 mr-2" />
              Teoria
            </TabsTrigger>
          </TabsList>

          {/* Tab: Substitutos */}
          <TabsContent value="substitutes">
            {parsedChords.length === 0 ? (
              <div className="text-center py-12">
                <Music2 className="w-16 h-16 text-[#D4C5B0] mx-auto mb-4" />
                <p className="text-[#A68A64]">Digite acordes acima para ver sugestões</p>
              </div>
            ) : (
              <div className="space-y-6">
                {parsedChords.map((item, idx) => (
                  <Card key={idx} className="border-[#D4C5B0]">
                    <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white py-3">
                      <CardTitle className="flex items-center gap-3">
                        <span className="text-2xl font-black">{item.original}</span>
                        <ArrowRight className="w-5 h-5" />
                        <span className="text-sm font-normal">Substituições disponíveis</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {item.substitutions.length === 0 ? (
                        <p className="text-[#A68A64] text-sm">Nenhuma sugestão encontrada</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {item.substitutions.map((sub, subIdx) => (
                            <div 
                              key={subIdx}
                              className="p-3 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0] hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xl font-bold text-[#8B6F47]">{sub.chord}</span>
                                <div className="flex items-center gap-2">
                                  <Badge className={sub.color}>{sub.type}</Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(sub.chord)}
                                    className="h-8 w-8 p-0">
                                    {copiedChord === sub.chord ? (
                                      <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Copy className="w-4 h-4 text-[#A68A64]" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-[#A68A64]">{sub.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Progressões Alternativas */}
          <TabsContent value="progressions">
            <div className="space-y-4">
              <div className="p-4 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/30">
                <h3 className="font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                  Progressões Alternativas Sugeridas
                </h3>
                <p className="text-sm text-[#A68A64]">
                  Baseado nos acordes informados e no banco de progressões
                </p>
              </div>

              {suggestAlternativeProgressions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#A68A64]">Digite pelo menos 3 acordes para ver sugestões</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestAlternativeProgressions.map((prog, idx) => (
                    <Card key={idx} className="border-[#D4C5B0] hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-[#8B6F47]">{prog.name}</h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(prog.pattern)}
                            className="h-8 w-8 p-0">
                            {copiedChord === prog.pattern ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-[#A68A64]" />
                            )}
                          </Button>
                        </div>
                        <div className="text-lg font-mono text-[#8B6F47] bg-[#F5F1E8] p-2 rounded mb-2">
                          {prog.pattern}
                        </div>
                        <p className="text-xs text-[#A68A64]">{prog.reason}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Teoria */}
          <TabsContent value="theory">
            <div className="space-y-4">
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-purple-800 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Substituição por Trítono
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-purple-700 mb-3">
                    Acordes dominantes (7) podem ser substituídos por outro dominante a 6 semitons de distância.
                    Ambos compartilham as mesmas notas de tensão (3ª e 7ª invertidas).
                  </p>
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="font-mono text-sm">G7 → Db7 (ambos resolvem para C)</p>
                    <p className="font-mono text-sm">D7 → Ab7 (ambos resolvem para G)</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Acordes Relativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-700 mb-3">
                    Cada acorde maior tem um relativo menor (e vice-versa) que compartilha as mesmas notas.
                  </p>
                  <div className="bg-white p-3 rounded border border-green-200 space-y-1">
                    <p className="font-mono text-sm">C → Am (relativo menor)</p>
                    <p className="font-mono text-sm">G → Em (relativo menor)</p>
                    <p className="font-mono text-sm">Am → C (relativo maior)</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Extensões e Tensões
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-blue-700 mb-3">
                    Adicionar notas ao acorde básico cria cor e sofisticação harmônica.
                  </p>
                  <div className="bg-white p-3 rounded border border-blue-200 space-y-1">
                    <p className="font-mono text-sm">C → Cmaj7 (7ª maior = cor suave)</p>
                    <p className="font-mono text-sm">Am → Am9 (9ª = abertura)</p>
                    <p className="font-mono text-sm">G7 → G13 (13ª = tensão rica)</p>
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