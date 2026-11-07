import React, { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, TrendingUp, ArrowRight, Zap, RefreshCw, 
  GitBranch, Target, Gauge, Info, AlertTriangle, Lightbulb, Printer,
  Edit, Save, X, Check, Brain, BookOpen, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Funções harmônicas por grau - CLASSIFICAÇÃO ATUALIZADA
// ii = Subdominante, iii = Tônica, vi = Tônica
const HARMONIC_FUNCTIONS = {
  'I': { function: 'Tônica', tension: 0, color: 'bg-green-500', description: 'Repouso total, centro tonal' },
  'i': { function: 'Tônica', tension: 0, color: 'bg-green-500', description: 'Repouso total (menor)' },
  'II': { function: 'Subdominante', tension: 3, color: 'bg-blue-500', description: 'Preparação, afastamento' },
  'ii': { function: 'Subdominante', tension: 3, color: 'bg-blue-500', description: 'Preparação suave (menor)' },
  'iii': { function: 'Tônica', tension: 1, color: 'bg-green-400', description: 'Repouso relativo, substituto de I' },
  'III': { function: 'Tônica', tension: 2, color: 'bg-green-400', description: 'Mediante (maior)' },
  'IV': { function: 'Subdominante', tension: 4, color: 'bg-blue-500', description: 'Afastamento, preparação forte' },
  'iv': { function: 'Subdominante', tension: 4, color: 'bg-blue-500', description: 'Subdominante menor (empréstimo)' },
  'V': { function: 'Dominante', tension: 7, color: 'bg-red-500', description: 'Tensão, demanda resolução' },
  'V7': { function: 'Dominante', tension: 9, color: 'bg-red-600', description: 'Tensão máxima, resolução forte' },
  'vi': { function: 'Tônica', tension: 1, color: 'bg-green-400', description: 'Repouso relativo, substituto de I' },
  'VI': { function: 'Tônica', tension: 2, color: 'bg-green-400', description: 'Submediante (maior)' },
  'VII': { function: 'Dominante', tension: 8, color: 'bg-red-400', description: 'Sensível, tensão forte' },
  'vii°': { function: 'Dominante', tension: 8, color: 'bg-red-400', description: 'Dominante substituto (diminuto)' },
};

// Acordes de empréstimo modal
const MODAL_INTERCHANGE = {
  'bIII': { mode: 'Menor Natural/Dórico', explanation: 'Empresta o bIII do modo menor, trazendo cor mais escura.' },
  'bVI': { mode: 'Menor Natural', explanation: 'Acorde do tom menor paralelo, cria surpresa harmônica.' },
  'bVII': { mode: 'Mixolídio', explanation: 'Acorde comum no rock e blues, evita a sensível.' },
  'iv': { mode: 'Menor Natural', explanation: 'Subdominante menor empresta melancolia do modo menor.' },
  '#IV°': { mode: 'Lídio', explanation: 'Acorde diminuto sobre #4, característico do modo Lídio.' },
  'bII': { mode: 'Frígio', explanation: 'Acorde napolitano, empresta do modo Frígio.' },
  'II7': { mode: 'Dominante Secundário', explanation: 'V7/V - dominante que resolve no V.' },
};

// Cadências comuns e alternativas
const CADENCE_ALTERNATIVES = {
  'V-I': {
    name: 'Cadência Autêntica',
    description: 'A resolução mais forte e conclusiva.',
    alternatives: [
      { pattern: 'V-vi', name: 'Cadência Deceptiva', description: 'Evita a resolução esperada, vai para o relativo menor.' },
      { pattern: 'V-IV', name: 'Retrogradação', description: 'Volta para subdominante, menos comum mas expressiva.' },
      { pattern: 'V-bVI', name: 'Cadência Deceptiva Modal', description: 'Resolve no bVI emprestado do menor.' },
    ]
  },
  'IV-I': {
    name: 'Cadência Plagal',
    description: 'Resolução suave, conhecida como "Amém".',
    alternatives: [
      { pattern: 'iv-I', name: 'Plagal Menor', description: 'Usa subdominante menor para cor mais dramática.' },
      { pattern: 'IV-V-I', name: 'Plagal Estendida', description: 'Adiciona dominante antes da resolução.' },
    ]
  },
  'ii-V-I': {
    name: 'Cadência II-V-I',
    description: 'A progressão mais importante do jazz.',
    alternatives: [
      { pattern: 'ii-bII7-I', name: 'Substituto de Trítono', description: 'bII7 substitui V7 (mesmo trítono).' },
      { pattern: 'ii-V-vi', name: 'II-V Deceptiva', description: 'Evita a resolução esperada.' },
      { pattern: '#iv°-V-I', name: 'Cromática', description: 'Aproximação cromática ao V.' },
    ]
  }
};

export default function AdvancedHarmonicAnalysis({ progressions, mainKey, song, cifraText, onProgressionsUpdate }) {
  const queryClient = useQueryClient();
  
  // Estados de edição
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // { type: 'cadence'|'modal'|'passing', index, data }
  const [customAnalysis, setCustomAnalysis] = useState({
    cadences: [],
    modalInterchanges: [],
    passingChords: [],
    corrections: [], // Histórico de correções para aprendizado
    sectionAnalyses: {} // Análises salvas por seção
  });
  const [saving, setSaving] = useState(false);
  
  // Estados para análise por seção
  const [selectedSection, setSelectedSection] = useState('all'); // 'all' ou nome da seção
  const [sectionAnalysisMode, setSectionAnalysisMode] = useState(false);
  const [analyzingSection, setAnalyzingSection] = useState(false);

  // Carrega análises customizadas salvas na música
  React.useEffect(() => {
    if (song?.custom_harmonic_analysis) {
      setCustomAnalysis(song.custom_harmonic_analysis);
    }
  }, [song?.id]);

  // Extrai lista de seções disponíveis
  const availableSections = useMemo(() => {
    if (!progressions || progressions.length === 0) return [];
    const sections = [...new Set(progressions.map(p => p.section).filter(Boolean))];
    return sections;
  }, [progressions]);

  // Filtra progressões pela seção selecionada
  const filteredProgressions = useMemo(() => {
    if (!progressions) return [];
    if (selectedSection === 'all') return progressions;
    return progressions.filter(p => p.section === selectedSection);
  }, [progressions, selectedSection]);

  // Salvar correção e registrar aprendizado
  const saveCorrection = async (correctionData) => {
    setSaving(true);
    try {
      const newCorrections = [
        ...(customAnalysis.corrections || []),
        {
          ...correctionData,
          timestamp: new Date().toISOString(),
          song_id: song?.id,
          song_title: song?.title
        }
      ];

      const updatedAnalysis = {
        ...customAnalysis,
        corrections: newCorrections
      };

      // Salva na música
      await base44.entities.Song.update(song.id, {
        custom_harmonic_analysis: updatedAnalysis
      });

      // Registra padrão de aprendizado
      await registerLearningPattern(correctionData);

      setCustomAnalysis(updatedAnalysis);
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      
      setEditingItem(null);
      setIsEditing(false);
      
      alert('✅ Correção salva! O sistema aprendeu com seu ajuste.');
    } catch (err) {
      console.error('Erro ao salvar correção:', err);
      alert('❌ Erro ao salvar correção');
    } finally {
      setSaving(false);
    }
  };

  // Registra padrão de aprendizado para melhorar análises futuras
  const registerLearningPattern = async (correctionData) => {
    try {
      // Busca padrões existentes
      const existingPatterns = await base44.entities.LearningPattern.filter({
        pattern: correctionData.corrected_pattern || correctionData.original_pattern
      });

      if (existingPatterns.length > 0) {
        // Atualiza padrão existente
        const existing = existingPatterns[0];
        await base44.entities.LearningPattern.update(existing.id, {
          times_corrected: (existing.times_corrected || 0) + 1,
          times_seen: (existing.times_seen || 0) + 1,
          confidence: Math.min(100, (existing.confidence || 80) + 5),
          last_used: new Date().toISOString().split('T')[0],
          source_songs: [...new Set([...(existing.source_songs || []), song?.id])],
          correction_notes: correctionData.notes || existing.correction_notes
        });
        console.log('📚 Padrão atualizado com correção');
      } else if (correctionData.corrected_pattern) {
        // Cria novo padrão de aprendizado
        await base44.entities.LearningPattern.create({
          chords: correctionData.chords || [],
          key: mainKey,
          pattern: correctionData.corrected_pattern,
          progression_name: correctionData.corrected_name || correctionData.type,
          section_type: correctionData.section || 'outro',
          times_seen: 1,
          times_corrected: 1,
          confidence: 100, // Correção manual = alta confiança
          source_songs: [song?.id],
          last_used: new Date().toISOString().split('T')[0]
        });
        console.log('📚 Novo padrão criado a partir de correção');
      }

      queryClient.invalidateQueries({ queryKey: ['learningPatterns'] });
    } catch (err) {
      console.error('Erro ao registrar aprendizado:', err);
    }
  };

  // Adicionar análise manual
  const addManualAnalysis = async (type, data) => {
    setSaving(true);
    try {
      const updatedAnalysis = { ...customAnalysis };
      
      if (type === 'cadence') {
        updatedAnalysis.cadences = [...(updatedAnalysis.cadences || []), data];
      } else if (type === 'modal') {
        updatedAnalysis.modalInterchanges = [...(updatedAnalysis.modalInterchanges || []), data];
      } else if (type === 'passing') {
        updatedAnalysis.passingChords = [...(updatedAnalysis.passingChords || []), data];
      }

      await base44.entities.Song.update(song.id, {
        custom_harmonic_analysis: updatedAnalysis
      });

      // Registra como aprendizado
      await registerLearningPattern({
        type,
        ...data,
        is_manual_addition: true
      });

      setCustomAnalysis(updatedAnalysis);
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      
      alert('✅ Análise adicionada e registrada para aprendizado!');
    } catch (err) {
      console.error('Erro ao adicionar análise:', err);
      alert('❌ Erro ao adicionar análise');
    } finally {
      setSaving(false);
    }
  };

  // Remover análise customizada
  const removeCustomAnalysis = async (type, index) => {
    if (!confirm('Remover esta análise?')) return;
    
    setSaving(true);
    try {
      const updatedAnalysis = { ...customAnalysis };
      
      if (type === 'cadence') {
        updatedAnalysis.cadences = updatedAnalysis.cadences.filter((_, i) => i !== index);
      } else if (type === 'modal') {
        updatedAnalysis.modalInterchanges = updatedAnalysis.modalInterchanges.filter((_, i) => i !== index);
      } else if (type === 'passing') {
        updatedAnalysis.passingChords = updatedAnalysis.passingChords.filter((_, i) => i !== index);
      }

      await base44.entities.Song.update(song.id, {
        custom_harmonic_analysis: updatedAnalysis
      });

      setCustomAnalysis(updatedAnalysis);
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    } catch (err) {
      console.error('Erro ao remover:', err);
    } finally {
      setSaving(false);
    }
  };
  // Análise de acordes de passagem e adorno
  const passingChordsAnalysis = useMemo(() => {
    if (!progressions || progressions.length === 0) return null;

    const passingChords = [];
    const ornamentChords = [];
    const chromaticMovements = [];

    try {
      progressions.forEach(prog => {
        if (!prog.pattern || !Array.isArray(prog.chords) || prog.chords.length === 0) return;
        
        const degrees = prog.pattern.split('-').filter(d => d && d.trim());
        const chords = prog.chords.filter(c => c && c.trim());

        if (degrees.length < 3 || chords.length < 3) return;

        for (let i = 1; i < degrees.length - 1; i++) {
          const prev = degrees[i - 1];
          const curr = degrees[i];
          const next = degrees[i + 1];
          
          if (!prev || !curr || !next) continue;
          
          // Detecta acordes de passagem (movimento escalar entre dois acordes)
          const prevNum = romanToNum(prev);
          const currNum = romanToNum(curr);
          const nextNum = romanToNum(next);

          // Acorde de passagem: está entre dois graus e forma movimento escalar
          if (currNum > 0 && prevNum > 0 && nextNum > 0 && i < chords.length) {
            const isScalarMovement = 
              (currNum === prevNum + 1 && currNum === nextNum - 1) ||
              (currNum === prevNum - 1 && currNum === nextNum + 1);
            
            if (isScalarMovement && chords[i]) {
              passingChords.push({
                chord: chords[i],
                degree: curr,
                section: prog.section || 'Desconhecida',
                context: `${prev} → ${curr} → ${next}`,
                explanation: `Conecta ${prev} e ${next} por movimento escalar.`
              });
            }
          }

          // Detecta acordes de adorno (dominantes secundários, diminutos de passagem)
          if (curr.includes('7') && !curr.toUpperCase().includes('I7') && i < chords.length) {
            // Verifica se é dominante secundário
            const targetDegree = degrees[i + 1];
            if (targetDegree && chords[i]) {
              ornamentChords.push({
                chord: chords[i],
                degree: curr,
                section: prog.section || 'Desconhecida',
                type: 'Dominante Secundário',
                target: targetDegree,
                explanation: `V7 de ${targetDegree} - prepara a resolução.`
              });
            }
          }

          // Detecta diminutos de passagem
          if ((curr.includes('°') || curr.includes('dim')) && i < chords.length && chords[i]) {
            ornamentChords.push({
              chord: chords[i],
              degree: curr,
              section: prog.section || 'Desconhecida',
              type: 'Diminuto de Passagem',
              explanation: 'Acorde diminuto cria tensão cromática.'
            });
          }
        }

        // Detecta movimentos cromáticos
        for (let i = 1; i < chords.length; i++) {
          const prevRoot = extractRoot(chords[i - 1]);
          const currRoot = extractRoot(chords[i]);
          
          if (prevRoot && currRoot) {
            const prevIdx = NOTES.indexOf(prevRoot);
            const currIdx = NOTES.indexOf(currRoot);
            
            if (prevIdx !== -1 && currIdx !== -1) {
              const interval = Math.abs(currIdx - prevIdx);
              
              if (interval === 1 || interval === 11) {
                chromaticMovements.push({
                  from: chords[i - 1],
                  to: chords[i],
                  section: prog.section || 'Desconhecida',
                  direction: currIdx > prevIdx ? 'ascendente' : 'descendente'
                });
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erro na análise de acordes de passagem:', error);
      return { passingChords: [], ornamentChords: [], chromaticMovements: [] };
    }

    return { passingChords, ornamentChords, chromaticMovements };
  }, [progressions]);

  // Análise de modulações e empréstimos modais
  const modulationAnalysis = useMemo(() => {
    if (!progressions || progressions.length === 0 || !mainKey) return null;

    try {
      const keyRoot = mainKey.replace('m', '').trim();
      const keyIndex = NOTES.indexOf(keyRoot);
      
      if (keyIndex === -1) {
        console.warn('⚠️ Tonalidade não reconhecida:', mainKey);
        return { modalInterchanges: [], modulations: [], borrowedChords: [] };
      }
      
      const isMinor = mainKey.toLowerCase().includes('m');
    
    // Notas da escala principal
    const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
    const minorIntervals = [0, 2, 3, 5, 7, 8, 10];
    const scaleNotes = (isMinor ? minorIntervals : majorIntervals)
      .map(i => NOTES[(keyIndex + i) % 12]);

      const modalInterchanges = [];
      const modulations = [];
      const borrowedChords = [];

      progressions.forEach(prog => {
        if (!Array.isArray(prog.chords) || prog.chords.length === 0) return;

        prog.chords.forEach((chord, idx) => {
          if (!chord) return;
          const root = extractRoot(chord);
          if (!root) return;

          // Verifica se o acorde está fora da escala principal
          if (!scaleNotes.includes(root)) {
            const quality = extractQuality(chord);
            
            // Identifica o tipo de empréstimo
            const rootIdx = NOTES.indexOf(root);
            if (rootIdx === -1) return;
            
            const relativeToKey = (rootIdx - keyIndex + 12) % 12;
          
          let borrowType = null;
          let explanation = '';

          // bIII - mediante menor
          if (relativeToKey === 3 && !isMinor) {
            borrowType = 'bIII';
            explanation = 'Emprestado do modo menor paralelo. Cria cor mais sombria e dramática.';
          }
          // bVI - submediante menor
          else if (relativeToKey === 8 && !isMinor) {
            borrowType = 'bVI';
            explanation = 'Emprestado do modo menor natural. Comum em cadências deceptivas.';
          }
          // bVII - subtônica
          else if (relativeToKey === 10 && !isMinor) {
            borrowType = 'bVII';
            explanation = 'Emprestado do modo Mixolídio. Evita a sensível, som de rock/blues.';
          }
          // iv - subdominante menor
          else if (relativeToKey === 5 && quality === 'm' && !isMinor) {
            borrowType = 'iv';
            explanation = 'Subdominante menor emprestada. Adiciona melancolia à progressão.';
          }
          // bII - napolitano
          else if (relativeToKey === 1) {
            borrowType = 'bII';
            explanation = 'Acorde napolitano do modo Frígio. Usado antes do V ou I.';
          }

            if (borrowType) {
              modalInterchanges.push({
                chord,
                section: prog.section || 'Desconhecida',
                borrowType,
                mode: MODAL_INTERCHANGE[borrowType]?.mode || 'Modal',
                explanation
              });
            }
          }

          // Detecta possível modulação
          if (chord.includes('7') && idx > 0 && idx < prog.chords.length - 1) {
            const chordRoot = extractRoot(chord);
            if (!chordRoot) return;
            
            // Se este V7 resolve em algo diferente da tônica
            const nextChord = prog.chords[idx + 1];
            if (nextChord) {
              const nextRoot = extractRoot(nextChord);
              if (!nextRoot) return;
              
              const chordIdx = NOTES.indexOf(chordRoot);
              const nextIdx = NOTES.indexOf(nextRoot);
              
              if (chordIdx === -1 || nextIdx === -1) return;
              
              const interval = (nextIdx - chordIdx + 12) % 12;
            
              // V7 → I (quinta justa abaixo / quarta acima)
              if (interval === 5 || interval === 7) {
                const targetKey = nextRoot;
                const mainKeyRoot = mainKey.replace('m', '').trim();
                
                if (targetKey !== mainKeyRoot) {
                  modulations.push({
                    fromKey: mainKey,
                    toKey: targetKey,
                    pivotChord: chord,
                    section: prog.section || 'Desconhecida',
                    type: 'Modulação por Dominante',
                    explanation: `${chord} funciona como V7 de ${targetKey}, sugerindo modulação temporária.`
                  });
                }
              }
            }
          }
        });
      });

      // Remove duplicatas de empréstimos modais
      const uniqueModalInterchanges = modalInterchanges.filter((mi, idx, arr) => 
        arr.findIndex(m => m.chord === mi.chord && m.section === mi.section) === idx
      );

      // Remove duplicatas de modulações
      const uniqueModulations = modulations.filter((mod, idx, arr) => 
        arr.findIndex(m => m.toKey === mod.toKey && m.section === mod.section && m.pivotChord === mod.pivotChord) === idx
      );

      return { modalInterchanges: uniqueModalInterchanges, modulations: uniqueModulations, borrowedChords };
    } catch (error) {
      console.error('❌ Erro na análise de modulações:', error);
      return { modalInterchanges: [], modulations: [], borrowedChords: [] };
    }
  }, [progressions, mainKey]);

  // Função para extrair trecho da cifra com letra onde aparecem os acordes
  const extractCifraExcerpt = (sectionName, chords) => {
    if (!cifraText || !sectionName || !chords || chords.length === 0) return null;
    
    const lines = cifraText.split('\n');
    let inSection = false;
    let excerpt = [];
    let foundChords = 0;
    
    // Encontra a seção na cifra
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detecta início de seção
      if (line.trim().startsWith('[')) {
        const sectionMatch = line.match(/\[([^\]]+)\]/);
        if (sectionMatch) {
          const currentSection = sectionMatch[1].toLowerCase().trim();
          const targetSection = sectionName.toLowerCase().trim();
          
          // Verifica se é a seção que buscamos
          inSection = currentSection.includes(targetSection.replace(/\d+/g, '').trim()) ||
                     targetSection.includes(currentSection.replace(/\d+/g, '').trim());
          
          if (inSection) {
            excerpt = [line]; // Começa com o nome da seção
            continue;
          }
        }
      }
      
      // Se estamos na seção correta
      if (inSection) {
        // Verifica se a linha contém algum dos acordes da cadência
        const hasChord = chords.some(chord => {
          const chordRegex = new RegExp(`\\b${chord.replace(/[#]/g, '\\$&')}\\b`);
          return chordRegex.test(line);
        });
        
        if (hasChord) {
          // Adiciona a linha de acordes e a próxima linha (letra)
          excerpt.push(line);
          if (lines[i + 1] && !lines[i + 1].trim().startsWith('[')) {
            excerpt.push(lines[i + 1]);
          }
          foundChords++;
          
          // Limita a 4 linhas de acordes+letra para não ficar muito grande
          if (foundChords >= 2) break;
        }
        
        // Se encontrou uma nova seção, para
        if (line.trim().startsWith('[') && excerpt.length > 1) {
          break;
        }
      }
    }
    
    // Se não encontrou na seção específica, busca em toda a cifra
    if (excerpt.length <= 1 && chords.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hasChord = chords.some(chord => {
          const chordRegex = new RegExp(`\\b${chord.replace(/[#]/g, '\\$&')}\\b`);
          return chordRegex.test(line);
        });
        
        if (hasChord) {
          // Pega a linha anterior se for marcação de seção
          if (i > 0 && lines[i - 1].trim().startsWith('[')) {
            excerpt.push(lines[i - 1]);
          }
          excerpt.push(line);
          if (lines[i + 1] && !lines[i + 1].trim().startsWith('[')) {
            excerpt.push(lines[i + 1]);
          }
          break;
        }
      }
    }
    
    return excerpt.length > 1 ? excerpt.join('\n') : null;
  };

  // Análise de cadências e alternativas
  const cadenceAnalysis = useMemo(() => {
    if (!progressions || progressions.length === 0) return null;

    const identifiedCadences = [];
    const suggestedAlternatives = [];

    progressions.forEach(prog => {
      if (!prog.pattern) return;
      
      const degrees = prog.pattern.split('-').filter(d => d);
      const chords = Array.isArray(prog.chords) ? prog.chords : [];
      
      for (let i = 0; i < degrees.length - 1; i++) {
        const twoChord = `${degrees[i]}-${degrees[i + 1]}`;
        const threeChord = degrees[i + 2] ? `${degrees[i]}-${degrees[i + 1]}-${degrees[i + 2]}` : null;

        // Verifica cadências conhecidas
        Object.entries(CADENCE_ALTERNATIVES).forEach(([pattern, data]) => {
          const normalizedPattern = pattern.toUpperCase();
          const normalizedTwo = twoChord.toUpperCase();
          const normalizedThree = threeChord?.toUpperCase();

          if (normalizedTwo === normalizedPattern || normalizedThree === normalizedPattern) {
            // Extrai os acordes correspondentes à cadência
            const patternLength = pattern.split('-').length;
            const cadenceChords = chords.slice(i, i + patternLength);
            
            // Extrai trecho da cifra com letra
            const cifraExcerpt = extractCifraExcerpt(prog.section, cadenceChords);
            
            identifiedCadences.push({
              pattern: pattern,
              section: prog.section,
              position: i,
              name: data.name,
              description: data.description,
              degrees: pattern.split('-'),
              chords: cadenceChords,
              fullProgression: chords.join(' - '),
              cifraExcerpt: cifraExcerpt // Trecho da cifra com letra
            });

            // Adiciona alternativas sugeridas
            data.alternatives.forEach(alt => {
              suggestedAlternatives.push({
                original: pattern,
                alternative: alt.pattern,
                name: alt.name,
                description: alt.description,
                section: prog.section
              });
            });
          }
        });
      }
    });

    // Remove duplicatas de cadências
    const uniqueCadences = identifiedCadences.filter((cad, idx, arr) => 
      arr.findIndex(c => c.pattern === cad.pattern && c.section === cad.section) === idx
    );

    // Remove duplicatas de alternativas
    const uniqueAlternatives = suggestedAlternatives.filter((alt, idx, arr) => 
      arr.findIndex(a => a.original === alt.original && a.alternative === alt.alternative) === idx
    );

    return { cadences: uniqueCadences, alternatives: uniqueAlternatives };
  }, [progressions, cifraText]);

  // Análise focada na seção selecionada
  const sectionAnalysis = useMemo(() => {
    if (selectedSection === 'all' || !filteredProgressions.length) return null;

    const sectionProg = filteredProgressions;
    const analysis = {
      section: selectedSection,
      totalChords: sectionProg.reduce((sum, p) => sum + (p.chords?.length || 0), 0),
      uniqueChords: [...new Set(sectionProg.flatMap(p => p.chords || []))],
      patterns: sectionProg.map(p => p.pattern).filter(Boolean),
      passingChords: [],
      ornamentChords: [],
      modalInterchanges: [],
      cadences: [],
      characteristics: []
    };

    // Analisa acordes de passagem na seção
    sectionProg.forEach(prog => {
      if (!prog.pattern || !Array.isArray(prog.chords)) return;
      
      const degrees = prog.pattern.split('-').filter(d => d);
      const chords = prog.chords;

      for (let i = 1; i < degrees.length - 1; i++) {
        const prev = degrees[i - 1];
        const curr = degrees[i];
        const next = degrees[i + 1];
        
        const prevNum = romanToNum(prev);
        const currNum = romanToNum(curr);
        const nextNum = romanToNum(next);

        if (currNum > 0 && prevNum > 0 && nextNum > 0) {
          const isScalarMovement = 
            (currNum === prevNum + 1 && currNum === nextNum - 1) ||
            (currNum === prevNum - 1 && currNum === nextNum + 1);
          
          if (isScalarMovement) {
            analysis.passingChords.push({
              chord: chords[i],
              degree: curr,
              context: `${prev} → ${curr} → ${next}`,
              explanation: `Conecta ${prev} e ${next} por movimento escalar na seção ${selectedSection}.`
            });
          }
        }

        // Detecta dominantes secundários
        if (curr.includes('7') && !curr.includes('I')) {
          const targetDegree = degrees[i + 1];
          if (targetDegree) {
            analysis.ornamentChords.push({
              chord: chords[i],
              degree: curr,
              type: 'Dominante Secundário',
              target: targetDegree,
              explanation: `V7 de ${targetDegree} - prepara a resolução.`
            });
          }
        }

        // Detecta diminutos de passagem
        if (curr.includes('°') || curr.includes('dim')) {
          analysis.ornamentChords.push({
            chord: chords[i],
            degree: curr,
            type: 'Diminuto de Passagem',
            explanation: 'Acorde diminuto cria tensão cromática.'
          });
        }
      }
    });

    // Analisa empréstimos modais na seção
    if (mainKey) {
      const keyIndex = NOTES.indexOf(mainKey.replace('m', ''));
      const isMinor = mainKey.includes('m');
      const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
      const minorIntervals = [0, 2, 3, 5, 7, 8, 10];
      const scaleNotes = (isMinor ? minorIntervals : majorIntervals)
        .map(i => NOTES[(keyIndex + i) % 12]);

      sectionProg.forEach(prog => {
        if (!Array.isArray(prog.chords)) return;

        prog.chords.forEach((chord) => {
          const root = extractRoot(chord);
          if (!root || scaleNotes.includes(root)) return;

          const rootIdx = NOTES.indexOf(root);
          const relativeToKey = (rootIdx - keyIndex + 12) % 12;
          
          let borrowType = null;
          let explanation = '';

          if (relativeToKey === 3 && !isMinor) {
            borrowType = 'bIII';
            explanation = 'Emprestado do modo menor paralelo.';
          } else if (relativeToKey === 8 && !isMinor) {
            borrowType = 'bVI';
            explanation = 'Emprestado do modo menor natural.';
          } else if (relativeToKey === 10 && !isMinor) {
            borrowType = 'bVII';
            explanation = 'Emprestado do modo Mixolídio.';
          } else if (relativeToKey === 5 && extractQuality(chord) === 'm' && !isMinor) {
            borrowType = 'iv';
            explanation = 'Subdominante menor emprestada.';
          }

          if (borrowType) {
            analysis.modalInterchanges.push({
              chord,
              borrowType,
              mode: MODAL_INTERCHANGE[borrowType]?.mode || 'Modal',
              explanation
            });
          }
        });
      });
    }

    // Analisa cadências na seção
    sectionProg.forEach(prog => {
      if (!prog.pattern) return;
      
      const degrees = prog.pattern.split('-').filter(d => d);
      const chords = Array.isArray(prog.chords) ? prog.chords : [];
      
      for (let i = 0; i < degrees.length - 1; i++) {
        const twoChord = `${degrees[i]}-${degrees[i + 1]}`;
        const threeChord = degrees[i + 2] ? `${degrees[i]}-${degrees[i + 1]}-${degrees[i + 2]}` : null;

        Object.entries(CADENCE_ALTERNATIVES).forEach(([pattern, data]) => {
          const normalizedPattern = pattern.toUpperCase();
          const normalizedTwo = twoChord.toUpperCase();
          const normalizedThree = threeChord?.toUpperCase();

          if (normalizedTwo === normalizedPattern || normalizedThree === normalizedPattern) {
            const patternLength = pattern.split('-').length;
            const cadenceChords = chords.slice(i, i + patternLength);
            
            analysis.cadences.push({
              pattern,
              name: data.name,
              description: data.description,
              degrees: pattern.split('-'),
              chords: cadenceChords
            });
          }
        });
      }
    });

    // Gera características da seção
    if (analysis.passingChords.length > 0) {
      analysis.characteristics.push('Movimento harmônico fluido com acordes de passagem');
    }
    if (analysis.modalInterchanges.length > 0) {
      analysis.characteristics.push('Riqueza harmônica com empréstimos modais');
    }
    if (analysis.cadences.length > 0) {
      const cadenceNames = [...new Set(analysis.cadences.map(c => c.name))];
      analysis.characteristics.push(`Estrutura cadencial definida (${cadenceNames.join(', ')})`);
    }
    if (analysis.ornamentChords.length > 0) {
      analysis.characteristics.push('Ornamentação sofisticada com dominantes secundários');
    }

    return analysis;
  }, [selectedSection, filteredProgressions, mainKey]);

  // Salva análise da seção
  const saveSectionAnalysis = async () => {
    if (!sectionAnalysis || selectedSection === 'all') return;
    
    setSaving(true);
    try {
      const updatedAnalysis = {
        ...customAnalysis,
        sectionAnalyses: {
          ...(customAnalysis.sectionAnalyses || {}),
          [selectedSection]: {
            ...sectionAnalysis,
            savedAt: new Date().toISOString(),
            savedBy: 'user'
          }
        }
      };

      await base44.entities.Song.update(song.id, {
        custom_harmonic_analysis: updatedAnalysis
      });

      setCustomAnalysis(updatedAnalysis);
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      
      alert(`✅ Análise da seção "${selectedSection}" salva com sucesso!`);
    } catch (err) {
      console.error('Erro ao salvar análise da seção:', err);
      alert('❌ Erro ao salvar análise');
    } finally {
      setSaving(false);
    }
  };

  // Remove análise salva da seção
  const removeSectionAnalysis = async (sectionName) => {
    if (!confirm(`Remover análise salva da seção "${sectionName}"?`)) return;
    
    setSaving(true);
    try {
      const updatedSectionAnalyses = { ...(customAnalysis.sectionAnalyses || {}) };
      delete updatedSectionAnalyses[sectionName];

      const updatedAnalysis = {
        ...customAnalysis,
        sectionAnalyses: updatedSectionAnalyses
      };

      await base44.entities.Song.update(song.id, {
        custom_harmonic_analysis: updatedAnalysis
      });

      setCustomAnalysis(updatedAnalysis);
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    } catch (err) {
      console.error('Erro ao remover análise:', err);
    } finally {
      setSaving(false);
    }
  };

  // Gera sumário geral da análise
  const analysisSummary = useMemo(() => {
    if (!progressions || progressions.length === 0) return null;

    const summary = {
      totalSections: progressions.length,
      totalChords: progressions.reduce((sum, p) => sum + (p.chords?.length || 0), 0),
      uniqueChords: [...new Set(progressions.flatMap(p => p.chords || []))].length,
      passingChordsCount: passingChordsAnalysis?.passingChords?.length || 0,
      ornamentChordsCount: passingChordsAnalysis?.ornamentChords?.length || 0,
      chromaticMovementsCount: passingChordsAnalysis?.chromaticMovements?.length || 0,
      modalInterchangesCount: modulationAnalysis?.modalInterchanges?.length || 0,
      modulationsCount: modulationAnalysis?.modulations?.length || 0,
      cadencesCount: cadenceAnalysis?.cadences?.length || 0,
      highlights: [],
      aiReasoning: []
    };

    // Gera highlights
    if (summary.modalInterchangesCount > 0) {
      summary.highlights.push({
        type: 'modal',
        title: 'Riqueza Harmônica',
        description: `A música apresenta ${summary.modalInterchangesCount} empréstimo(s) modal(is), adicionando cores harmônicas além da escala principal.`
      });
    }

    if (summary.cadencesCount > 0) {
      const cadenceNames = [...new Set(cadenceAnalysis?.cadences?.map(c => c.name) || [])];
      summary.highlights.push({
        type: 'cadence',
        title: 'Estrutura Cadencial',
        description: `Identificadas ${summary.cadencesCount} cadência(s): ${cadenceNames.join(', ')}.`
      });
    }

    if (summary.ornamentChordsCount > 0) {
      summary.highlights.push({
        type: 'ornament',
        title: 'Ornamentação Sofisticada',
        description: `${summary.ornamentChordsCount} acorde(s) de adorno (dominantes secundários, diminutos) enriquecem a harmonia.`
      });
    }

    if (summary.chromaticMovementsCount > 0) {
      summary.highlights.push({
        type: 'chromatic',
        title: 'Movimentos Cromáticos',
        description: `${summary.chromaticMovementsCount} movimento(s) cromático(s) detectados, criando fluidez entre acordes.`
      });
    }

    if (summary.modulationsCount > 0) {
      summary.highlights.push({
        type: 'modulation',
        title: 'Modulações',
        description: `A música apresenta ${summary.modulationsCount} modulação(ões), variando o centro tonal.`
      });
    }

    // Raciocínio da IA para cada tipo de análise
    summary.aiReasoning = [
      {
        category: 'Acordes de Passagem',
        reasoning: 'Identifico acordes de passagem quando há movimento escalar entre dois graus diatônicos. Por exemplo, se encontro I → ii → iii, o ii pode ser um acorde de passagem conectando I e iii por movimento de segunda.',
        confidence: summary.passingChordsCount > 0 ? 'Alta' : 'N/A'
      },
      {
        category: 'Acordes de Adorno',
        reasoning: 'Dominantes secundários são identificados quando um acorde com 7ª resolve uma quinta abaixo/quarta acima em um acorde que não é a tônica. Diminutos de passagem conectam acordes por semitom.',
        confidence: summary.ornamentChordsCount > 0 ? 'Alta' : 'N/A'
      },
      {
        category: 'Empréstimos Modais',
        reasoning: 'Analiso cada acorde para verificar se pertence à escala principal. Acordes fora da escala são classificados pelo intervalo em relação à tônica: bVI, bVII vêm do modo menor, iv é subdominante menor emprestada.',
        confidence: summary.modalInterchangesCount > 0 ? 'Média-Alta' : 'N/A'
      },
      {
        category: 'Cadências',
        reasoning: 'Busco padrões clássicos como V-I (autêntica), IV-I (plagal), ii-V-I. Cada cadência tem função estrutural específica: conclusiva, suspensiva ou deceptiva.',
        confidence: summary.cadencesCount > 0 ? 'Alta' : 'N/A'
      }
    ];

    // Compara com correções do usuário
    if (customAnalysis.corrections?.length > 0) {
      summary.userCorrections = customAnalysis.corrections.length;
      summary.learningInsight = `O sistema incorporou ${customAnalysis.corrections.length} correção(ões) do usuário, melhorando a precisão para análises futuras.`;
    }

    return summary;
  }, [progressions, passingChordsAnalysis, modulationAnalysis, cadenceAnalysis, customAnalysis]);

  // Análise de Funções Harmônicas (Tônica, Subdominante, Dominante)
  const harmonicFunctionAnalysis = useMemo(() => {
    if (!progressions || progressions.length === 0) return null;

    const functionCounts = {
      Tônica: 0,
      Subdominante: 0,
      Dominante: 0
    };
    
    const functionBySection = {};
    
    progressions.forEach(prog => {
      if (!prog.pattern) return;
      
      const degrees = prog.pattern.split('-').filter(d => d && d.trim());
      const sectionName = prog.section || 'Desconhecida';
      
      if (!functionBySection[sectionName]) {
        functionBySection[sectionName] = { Tônica: 0, Subdominante: 0, Dominante: 0, total: 0 };
      }
      
      degrees.forEach(degree => {
        if (!degree) return;
        
        // Limpa o grau mantendo maiúscula/minúscula para identificar maior/menor
        let cleanDegree = degree.replace(/7|°|\+|ø|dim|aug|sus|maj/g, '');
        
        // Tenta encontrar a função harmônica
        let harmonicFunc = HARMONIC_FUNCTIONS[cleanDegree];
        
        // Se não encontrou, tenta com maiúscula
        if (!harmonicFunc) {
          cleanDegree = cleanDegree.toUpperCase();
          harmonicFunc = HARMONIC_FUNCTIONS[cleanDegree];
        }
        
        if (harmonicFunc && harmonicFunc.function) {
          functionCounts[harmonicFunc.function]++;
          functionBySection[sectionName][harmonicFunc.function]++;
          functionBySection[sectionName].total++;
        }
      });
    });
    
    // Calcula percentuais
    const total = functionCounts.Tônica + functionCounts.Subdominante + functionCounts.Dominante;
    const percentages = {
      Tônica: total > 0 ? ((functionCounts.Tônica / total) * 100).toFixed(1) : 0,
      Subdominante: total > 0 ? ((functionCounts.Subdominante / total) * 100).toFixed(1) : 0,
      Dominante: total > 0 ? ((functionCounts.Dominante / total) * 100).toFixed(1) : 0
    };
    
    // Calcula percentuais por seção
    Object.keys(functionBySection).forEach(section => {
      const sectionTotal = functionBySection[section].total;
      if (sectionTotal > 0) {
        functionBySection[section].percentages = {
          Tônica: ((functionBySection[section].Tônica / sectionTotal) * 100).toFixed(1),
          Subdominante: ((functionBySection[section].Subdominante / sectionTotal) * 100).toFixed(1),
          Dominante: ((functionBySection[section].Dominante / sectionTotal) * 100).toFixed(1)
        };
      }
    });
    
    // Análise de equilíbrio harmônico
    let balance = 'Equilibrada';
    if (parseFloat(percentages.Dominante) > 40) {
      balance = 'Tensão Dominante';
    } else if (parseFloat(percentages.Tônica) > 50) {
      balance = 'Repouso Predominante';
    } else if (parseFloat(percentages.Subdominante) > 40) {
      balance = 'Preparação Constante';
    }
    
    return {
      counts: functionCounts,
      percentages,
      total,
      balance,
      bySection: functionBySection
    };
  }, [progressions]);

  // Análise de tensão e relaxamento
  const tensionAnalysis = useMemo(() => {
    if (!progressions || progressions.length === 0) return null;

    try {
      const tensionCurve = [];
      let maxTension = 0;
      let minTension = 10;

      progressions.forEach(prog => {
        if (!prog.pattern) return;
        
        const degrees = prog.pattern.split('-').filter(d => d && d.trim());
        if (degrees.length === 0) return;
        
        const sectionTensions = [];
        const sectionFunctions = [];

        degrees.forEach((degree, idx) => {
          if (!degree) return;
          
          // Limpa o grau mas preserva maiúscula/minúscula
          let cleanDegree = degree.replace(/7|°|\+|ø|dim|aug|sus|maj/g, '');
          let harmonicFunc = HARMONIC_FUNCTIONS[cleanDegree] || HARMONIC_FUNCTIONS[cleanDegree.toUpperCase()];
          
          let tension = harmonicFunc?.tension || 3;
          let funcName = harmonicFunc?.function || 'Desconhecida';

          // Ajustes de tensão
          if (degree.includes('7')) tension += 1;
          if (degree.includes('°') || degree.includes('ø')) tension += 2;
          if (degree.includes('+')) tension += 2;

          sectionTensions.push({
            degree,
            tension,
            function: funcName,
            position: idx
          });
          
          sectionFunctions.push(funcName);

          maxTension = Math.max(maxTension, tension);
          minTension = Math.min(minTension, tension);
        });

        if (sectionTensions.length === 0) return;

        const avgTension = sectionTensions.reduce((a, b) => a + b.tension, 0) / sectionTensions.length;
        const peakPosition = sectionTensions.reduce((max, t) => t.tension > max.tension ? t : max, sectionTensions[0]);
        const resolvePosition = sectionTensions.reduce((min, t) => t.tension < min.tension ? t : min, sectionTensions[0]);

        tensionCurve.push({
          section: prog.section || 'Desconhecida',
          tensions: sectionTensions,
          functions: sectionFunctions,
          avgTension: avgTension.toFixed(1),
          peak: {
            degree: peakPosition.degree,
            function: peakPosition.function,
            tension: peakPosition.tension,
            position: peakPosition.position
          },
          resolve: {
            degree: resolvePosition.degree,
            function: resolvePosition.function,
            tension: resolvePosition.tension
          },
          profile: avgTension > 5 ? 'Alta Tensão' : avgTension > 3 ? 'Tensão Moderada' : 'Relaxado'
        });
      });

      if (tensionCurve.length === 0) {
        return null;
      }

      const overallTension = tensionCurve.reduce((sum, s) => sum + parseFloat(s.avgTension), 0) / tensionCurve.length;
      
      return {
        sections: tensionCurve,
        overall: {
          average: overallTension.toFixed(1),
          max: maxTension,
          min: minTension,
          profile: overallTension > 5 ? 'Música Intensa' : overallTension > 3 ? 'Equilíbrio Tonal' : 'Música Relaxante'
        }
      };
    } catch (error) {
      console.error('❌ Erro na análise de tensão:', error);
      return null;
    }
  }, [progressions]);

  // Helpers
  function romanToNum(roman) {
    if (!roman || typeof roman !== 'string') return 0;
    const cleanRoman = roman.replace(/7|°|\+|ø/g, '').toUpperCase();
    const map = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7 };
    return map[cleanRoman] || 0;
  }

  function extractRoot(chord) {
    if (!chord || typeof chord !== 'string') return null;
    const match = chord.match(/^([A-G][#b]?)/);
    return match ? match[1] : null;
  }

  function extractQuality(chord) {
    if (!chord || typeof chord !== 'string') return '';
    if (chord.includes('dim') || chord.includes('°')) return 'dim';
    if (chord.includes('aug') || chord.includes('+')) return 'aug';
    if (chord.includes('m') && !chord.includes('maj')) return 'm';
    return '';
  }

  // Função de impressão
  const printAdvancedAnalysis = () => {
    const printWindow = window.open('', '_blank');
    
    // Gera HTML dos acordes de passagem
    const passingHtml = passingChordsAnalysis?.passingChords?.length > 0 
      ? passingChordsAnalysis.passingChords.map(pc => `
          <div class="item">
            <div class="item-header">
              <span class="badge brown">${pc.chord}</span>
              <span class="badge outline">${pc.degree}</span>
              <span class="section-label">em ${pc.section}</span>
            </div>
            <p class="explanation">${pc.explanation}</p>
            <p class="context">Contexto: ${pc.context}</p>
          </div>
        `).join('')
      : '<p class="empty">Nenhum acorde de passagem detectado.</p>';

    // Gera HTML dos acordes de adorno
    const ornamentHtml = passingChordsAnalysis?.ornamentChords?.length > 0
      ? passingChordsAnalysis.ornamentChords.map(oc => `
          <div class="item gold-border">
            <div class="item-header">
              <span class="badge gold">${oc.chord}</span>
              <span class="badge gold-outline">${oc.type}</span>
              <span class="section-label">em ${oc.section}</span>
            </div>
            <p class="explanation">${oc.explanation}</p>
            ${oc.target ? `<p class="context">Resolve em: ${oc.target}</p>` : ''}
          </div>
        `).join('')
      : '<p class="empty">Nenhum acorde de adorno detectado.</p>';

    // Gera HTML dos movimentos cromáticos
    const chromaticHtml = passingChordsAnalysis?.chromaticMovements?.length > 0
      ? passingChordsAnalysis.chromaticMovements.map(cm => 
          `<span class="badge purple">${cm.from} → ${cm.to} (${cm.direction})</span>`
        ).join(' ')
      : '<p class="empty">Nenhum movimento cromático.</p>';

    // Gera HTML dos empréstimos modais
    const modalHtml = modulationAnalysis?.modalInterchanges?.length > 0
      ? modulationAnalysis.modalInterchanges.map(mi => `
          <div class="item purple-border">
            <div class="item-header">
              <span class="badge purple">${mi.chord}</span>
              <span class="badge purple-outline">${mi.borrowType}</span>
              <span class="section-label">de ${mi.mode}</span>
            </div>
            <p class="explanation">${mi.explanation}</p>
            <p class="context">Seção: ${mi.section}</p>
          </div>
        `).join('')
      : '<p class="empty">Nenhum empréstimo modal detectado. A música permanece diatônica.</p>';

    // Gera HTML das modulações
    const modulationHtml = modulationAnalysis?.modulations?.length > 0
      ? modulationAnalysis.modulations.map(mod => `
          <div class="item orange-border">
            <div class="item-header">
              <span class="badge orange">${mod.fromKey}</span>
              <span class="arrow">→</span>
              <span class="badge orange-light">${mod.toKey}</span>
              <span class="badge orange-outline">${mod.type}</span>
            </div>
            <p class="explanation">${mod.explanation}</p>
            <p class="context">Acorde pivô: <strong>${mod.pivotChord}</strong> em ${mod.section}</p>
          </div>
        `).join('')
      : '<p class="empty">Nenhuma modulação detectada. A música mantém a tonalidade original.</p>';

    // Gera HTML das cadências
    const cadencesHtml = cadenceAnalysis?.cadences?.length > 0
      ? cadenceAnalysis.cadences.map(cad => `
          <div class="cadence-card">
            <div class="cadence-degrees">
              ${cad.degrees.map((d, i) => `
                <span class="badge green">${d}</span>
                ${i < cad.degrees.length - 1 ? '<span class="arrow">→</span>' : ''}
              `).join('')}
            </div>
            <p class="cadence-name">${cad.name}</p>
            <p class="cadence-desc">${cad.description}</p>
            <p class="context">Seção: ${cad.section}</p>
            ${cad.cifraExcerpt ? `
              <div class="chord-excerpt">
                <p class="excerpt-label">🎵 Trecho da música:</p>
                <pre class="cifra-pre">${cad.cifraExcerpt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              </div>
            ` : cad.chords && cad.chords.length > 0 ? `
              <div class="chord-excerpt">
                <p class="excerpt-label">🎵 Acordes identificados:</p>
                <div class="chord-sequence">
                  ${cad.chords.map((chord, i) => `
                    <span class="chord-box">${chord}</span>
                    ${i < cad.chords.length - 1 ? '<span class="arrow">→</span>' : ''}
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `).join('')
      : '<p class="empty">Nenhuma cadência tradicional identificada.</p>';

    // Gera HTML das alternativas
    const alternativesHtml = cadenceAnalysis?.alternatives?.length > 0
      ? cadenceAnalysis.alternatives.slice(0, 6).map(alt => `
          <div class="item gold-border">
            <div class="item-header">
              <span class="badge outline">${alt.original}</span>
              <span class="arrow">→</span>
              <span class="badge gold">${alt.alternative}</span>
            </div>
            <p class="alt-name">${alt.name}</p>
            <p class="explanation">${alt.description}</p>
          </div>
        `).join('')
      : '<p class="empty">Nenhuma alternativa disponível.</p>';

    // Gera HTML da tensão
    const tensionHtml = tensionAnalysis?.sections?.map(section => `
      <div class="tension-section">
        <div class="tension-header">
          <span class="badge brown">${section.section}</span>
          <span class="badge ${section.profile === 'Alta Tensão' ? 'red' : section.profile === 'Tensão Moderada' ? 'yellow' : 'green'}">${section.profile}</span>
          <span class="avg">Média: ${section.avgTension}</span>
        </div>
        <div class="tension-details">
          <span>📈 Pico: <strong class="red">${section.peak.degree}</strong> (tensão ${section.peak.tension})</span>
          <span>📉 Relaxa: <strong class="green">${section.resolve.degree}</strong> (tensão ${section.resolve.tension})</span>
        </div>
        <div class="tension-degrees">
          ${section.tensions.map(t => `<span class="tension-degree">${t.degree}: ${t.tension}</span>`).join('')}
        </div>
      </div>
    `).join('') || '';

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Análise Harmônica Avançada - ${song?.title || 'Música'}</title>
          <style>
            @page { margin: 1cm; size: A4; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', sans-serif; 
              color: #333; 
              background: #fff; 
              font-size: 11px; 
              line-height: 1.5;
              padding: 20px;
            }
            
            .header {
              background: linear-gradient(135deg, #8B6F47 0%, #D4AF37 100%);
              color: white;
              padding: 20px;
              border-radius: 12px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo { width: 50px; height: 50px; border-radius: 50%; background: white; padding: 3px; }
            .header-text { flex: 1; }
            .title { font-size: 22px; font-weight: bold; }
            .subtitle { font-size: 14px; opacity: 0.9; }
            
            .section { margin-bottom: 20px; page-break-inside: avoid; }
            .section-title { 
              font-size: 14px; 
              font-weight: bold; 
              color: #8B6F47; 
              margin-bottom: 10px;
              padding-bottom: 5px;
              border-bottom: 2px solid #D4AF37;
            }
            
            .item {
              background: #f8f6f3;
              border: 1px solid #e0d6c8;
              border-radius: 8px;
              padding: 10px;
              margin-bottom: 8px;
            }
            .item.gold-border { border-color: #D4AF37; background: linear-gradient(135deg, #fffbeb, #fff); }
            .item.purple-border { border-color: #9333ea; background: linear-gradient(135deg, #faf5ff, #fff); }
            .item.orange-border { border-color: #ea580c; background: linear-gradient(135deg, #fff7ed, #fff); }
            
            .item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap; }
            .badge { 
              padding: 3px 8px; 
              border-radius: 10px; 
              font-size: 10px; 
              font-weight: bold;
              display: inline-block;
            }
            .badge.brown { background: #8B6F47; color: white; }
            .badge.gold { background: #D4AF37; color: white; }
            .badge.green { background: #9CAF88; color: white; }
            .badge.purple { background: #9333ea; color: white; }
            .badge.orange { background: #ea580c; color: white; }
            .badge.orange-light { background: #fb923c; color: white; }
            .badge.red { background: #dc2626; color: white; }
            .badge.yellow { background: #eab308; color: white; }
            .badge.outline { background: white; border: 1px solid #8B6F47; color: #8B6F47; }
            .badge.gold-outline { background: white; border: 1px solid #D4AF37; color: #D4AF37; }
            .badge.purple-outline { background: white; border: 1px solid #9333ea; color: #9333ea; }
            .badge.orange-outline { background: white; border: 1px solid #ea580c; color: #ea580c; }
            
            .section-label { font-size: 10px; color: #888; }
            .explanation { font-size: 11px; color: #555; margin-bottom: 3px; }
            .context { font-size: 10px; color: #888; }
            .arrow { color: #D4AF37; font-weight: bold; margin: 0 5px; }
            .empty { font-size: 11px; color: #888; font-style: italic; padding: 10px; background: #f5f5f5; border-radius: 8px; }
            
            .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
            .stat-card { 
              text-align: center; 
              padding: 15px; 
              border-radius: 10px; 
              border: 1px solid #e0d6c8;
            }
            .stat-card.green { background: linear-gradient(135deg, #dcfce7, #fff); border-color: #86efac; }
            .stat-card.red { background: linear-gradient(135deg, #fee2e2, #fff); border-color: #fca5a5; }
            .stat-card.blue { background: linear-gradient(135deg, #dbeafe, #fff); border-color: #93c5fd; }
            .stat-value { font-size: 24px; font-weight: bold; }
            .stat-label { font-size: 11px; color: #666; }
            
            .cadence-card {
              background: linear-gradient(135deg, #f0fdf4, #fff);
              border: 1px solid #9CAF88;
              border-radius: 10px;
              padding: 12px;
              margin-bottom: 10px;
            }
            .cadence-degrees { display: flex; align-items: center; gap: 5px; margin-bottom: 8px; flex-wrap: wrap; }
            .cadence-name { font-weight: bold; color: #8B6F47; margin-bottom: 3px; }
            .cadence-desc { font-size: 11px; color: #666; }
            .chord-excerpt { 
              margin-top: 8px; 
              padding: 8px; 
              background: white; 
              border: 1px solid #e0d6c8; 
              border-radius: 6px; 
            }
            .excerpt-label { font-size: 10px; color: #8B6F47; font-weight: bold; margin-bottom: 5px; }
            .chord-sequence { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
            .chord-box { 
              font-family: monospace; 
              font-weight: bold; 
              color: #8B6F47; 
              background: rgba(212, 175, 55, 0.2); 
              padding: 3px 8px; 
              border-radius: 4px; 
            }
            .cifra-pre {
              font-family: 'Courier New', monospace;
              font-size: 10px;
              white-space: pre-wrap;
              background: white;
              padding: 8px;
              border: 1px solid #e0d6c8;
              border-radius: 4px;
              color: #2d1810;
              line-height: 1.4;
              margin: 0;
            }
            .alt-name { font-weight: bold; color: #8B6F47; font-size: 11px; margin-bottom: 3px; }
            
            .tension-section {
              background: #f8f6f3;
              border-radius: 10px;
              padding: 12px;
              margin-bottom: 10px;
            }
            .tension-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
            .avg { font-size: 11px; color: #888; margin-left: auto; }
            .tension-details { display: flex; gap: 20px; font-size: 10px; color: #666; margin-bottom: 8px; }
            .tension-details .red { color: #dc2626; }
            .tension-details .green { color: #16a34a; }
            .tension-degrees { display: flex; flex-wrap: wrap; gap: 5px; }
            .tension-degree { 
              background: white; 
              border: 1px solid #ddd; 
              padding: 2px 6px; 
              border-radius: 4px; 
              font-size: 9px; 
            }
            
            .footer {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 2px solid #D4AF37;
              text-align: center;
              font-size: 10px;
              color: #888;
            }
            
            @media print {
              .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .badge, .stat-card, .item, .cadence-card, .tension-section { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6900add80614fb22512134a9/522fde112_LOGO-PNG.png" class="logo" alt="Logo" />
            <div class="header-text">
              <div class="title">Análise Harmônica Avançada</div>
              <div class="subtitle">${song?.title || 'Música'} - ${song?.artist || 'Artista'} | Tom: ${mainKey || 'N/A'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🎵 Acordes de Passagem</div>
            ${passingHtml}
          </div>

          <div class="section">
            <div class="section-title">✨ Acordes de Adorno (Dominantes Secundários, Diminutos)</div>
            ${ornamentHtml}
          </div>

          <div class="section">
            <div class="section-title">📈 Movimentos Cromáticos</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${chromaticHtml}
            </div>
          </div>

          <div class="section">
            <div class="section-title">🔀 Empréstimos Modais (Modal Interchange)</div>
            ${modalHtml}
          </div>

          <div class="section">
            <div class="section-title">🔄 Modulações Detectadas</div>
            ${modulationHtml}
          </div>

          <div class="section">
            <div class="section-title">🎯 Cadências Identificadas</div>
            ${cadencesHtml}
          </div>

          <div class="section">
            <div class="section-title">💡 Resoluções Alternativas Sugeridas</div>
            ${alternativesHtml}
          </div>

          <div class="section">
            <div class="section-title">📊 Análise de Tensão e Relaxamento</div>
            <div class="grid-3">
              <div class="stat-card green">
                <div class="stat-value" style="color: #16a34a;">${tensionAnalysis?.overall?.average || 0}</div>
                <div class="stat-label">Tensão Média</div>
                <div style="font-size: 10px; color: #16a34a;">${tensionAnalysis?.overall?.profile || ''}</div>
              </div>
              <div class="stat-card red">
                <div class="stat-value" style="color: #dc2626;">${tensionAnalysis?.overall?.max || 0}</div>
                <div class="stat-label">Pico de Tensão</div>
              </div>
              <div class="stat-card blue">
                <div class="stat-value" style="color: #2563eb;">${tensionAnalysis?.overall?.min || 0}</div>
                <div class="stat-label">Ponto de Relaxamento</div>
              </div>
            </div>
            ${tensionHtml}
          </div>

          <div class="footer">
            <p><strong>Tropeiros do Bebedouro</strong> • Análise Harmônica Avançada</p>
            <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>

          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  if (!progressions || progressions.length === 0) {
    return (
      <Card className="border-[#D4C5B0] bg-white/60">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 text-[#A68A64] mx-auto mb-4" />
          <p className="text-[#8B6F47]">Adicione progressões para análise avançada</p>
        </CardContent>
      </Card>
    );
  }

  // Componente de formulário de edição
  const EditForm = ({ item, type, onSave, onCancel }) => {
    const [formData, setFormData] = useState(item || {});

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-white rounded-xl border-2 border-[#D4AF37] shadow-lg space-y-4"
      >
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-[#8B6F47] flex items-center gap-2">
            <Edit className="w-4 h-4" />
            {item ? 'Corrigir Análise' : 'Adicionar Análise Manual'}
          </h4>
          <Button variant="ghost" size="icon" onClick={onCancel} className="min-w-[44px] min-h-[44px] touch-manipulation">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {type === 'cadence' && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-[#8B6F47]">Nome da Cadência</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Cadência Autêntica"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Padrão (graus romanos)</Label>
              <Input
                value={formData.pattern || ''}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                placeholder="Ex: V-I ou ii-V-I"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Acordes (separados por vírgula)</Label>
              <Input
                value={Array.isArray(formData.chords) ? formData.chords.join(', ') : formData.chords || ''}
                onChange={(e) => setFormData({ ...formData, chords: e.target.value.split(',').map(c => c.trim()) })}
                placeholder="Ex: G7, C"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Seção</Label>
              <Input
                value={formData.section || ''}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="Ex: Refrão"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Descrição</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva a cadência..."
                className="border-[#D4C5B0] h-20"
              />
            </div>
          </div>
        )}

        {type === 'modal' && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-[#8B6F47]">Acorde Emprestado</Label>
              <Input
                value={formData.chord || ''}
                onChange={(e) => setFormData({ ...formData, chord: e.target.value })}
                placeholder="Ex: Bb, Eb"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Tipo de Empréstimo</Label>
              <Select
                value={formData.borrowType || ''}
                onValueChange={(v) => setFormData({ ...formData, borrowType: v })}
              >
                <SelectTrigger className="border-[#D4C5B0]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bIII">bIII (Menor Natural/Dórico)</SelectItem>
                  <SelectItem value="bVI">bVI (Menor Natural)</SelectItem>
                  <SelectItem value="bVII">bVII (Mixolídio)</SelectItem>
                  <SelectItem value="iv">iv (Subdominante Menor)</SelectItem>
                  <SelectItem value="bII">bII (Napolitano/Frígio)</SelectItem>
                  <SelectItem value="II7">II7 (Dominante Secundário)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Modo de Origem</Label>
              <Input
                value={formData.mode || ''}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                placeholder="Ex: Menor Natural, Mixolídio"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Seção</Label>
              <Input
                value={formData.section || ''}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="Ex: Verso 2"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Explicação</Label>
              <Textarea
                value={formData.explanation || ''}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="Explique o efeito harmônico..."
                className="border-[#D4C5B0] h-20"
              />
            </div>
          </div>
        )}

        {type === 'passing' && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-[#8B6F47]">Acorde</Label>
              <Input
                value={formData.chord || ''}
                onChange={(e) => setFormData({ ...formData, chord: e.target.value })}
                placeholder="Ex: F#dim"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Grau</Label>
              <Input
                value={formData.degree || ''}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                placeholder="Ex: #iv°"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Tipo</Label>
              <Select
                value={formData.type || 'Acorde de Passagem'}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger className="border-[#D4C5B0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Acorde de Passagem">Acorde de Passagem</SelectItem>
                  <SelectItem value="Dominante Secundário">Dominante Secundário</SelectItem>
                  <SelectItem value="Diminuto de Passagem">Diminuto de Passagem</SelectItem>
                  <SelectItem value="Acorde de Adorno">Acorde de Adorno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Contexto (acordes ao redor)</Label>
              <Input
                value={formData.context || ''}
                onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                placeholder="Ex: G → F#dim → Em"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Seção</Label>
              <Input
                value={formData.section || ''}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="Ex: Intro"
                className="border-[#D4C5B0]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B6F47]">Explicação</Label>
              <Textarea
                value={formData.explanation || ''}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="Função harmônica..."
                className="border-[#D4C5B0] h-20"
              />
            </div>
          </div>
        )}

        <div className="bg-[#9CAF88]/10 p-3 rounded-lg border border-[#9CAF88]/30">
          <p className="text-xs text-[#8B6F47] flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#9CAF88]" />
            <strong>Aprendizado:</strong> Sua correção será salva e o sistema aprenderá para análises futuras.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onSave(formData)}
            disabled={saving}
            className="flex-1 bg-[#9CAF88] hover:bg-[#8B6F47] text-white"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar e Aprender
          </Button>
          <Button variant="outline" onClick={onCancel} className="border-[#D4C5B0]">
            Cancelar
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <Card className="border-[#D4C5B0] bg-white/80">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-[#8B6F47] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#D4AF37]" />
            Análise Harmônica Avançada
            {customAnalysis.corrections?.length > 0 && (
              <Badge className="bg-[#9CAF88] text-white text-xs">
                <Brain className="w-3 h-3 mr-1" />
                {customAnalysis.corrections.length} correções
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className={`border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white ${isEditing ? 'bg-[#9CAF88] text-white' : ''}`}
            >
              <Edit className="w-4 h-4 mr-2" />
              {isEditing ? 'Finalizar Edição' : 'Editar Análise'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={printAdvancedAnalysis}
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
        
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/30"
          >
            <p className="text-sm text-[#8B6F47] flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <strong>Modo de Edição:</strong> Corrija erros ou adicione análises manuais. O sistema aprende com cada correção!
            </p>
          </motion.div>
        )}

        {/* Seletor de Seção */}
        {availableSections.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0]"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#8B6F47]" />
                <span className="text-sm font-medium text-[#8B6F47]">Análise por Seção:</span>
              </div>
              
              <div className="flex flex-wrap gap-2 flex-1">
                <Button
                  variant={selectedSection === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSection('all')}
                  className={selectedSection === 'all' 
                    ? 'bg-[#8B6F47] text-white' 
                    : 'border-[#D4C5B0] text-[#8B6F47]'
                  }
                >
                  Todas as Seções
                </Button>
                {availableSections.map(section => (
                  <Button
                    key={section}
                    variant={selectedSection === section ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSection(section)}
                    className={`relative ${selectedSection === section 
                      ? 'bg-[#9CAF88] text-white' 
                      : 'border-[#D4C5B0] text-[#8B6F47] hover:bg-[#9CAF88]/10'
                    }`}
                  >
                    {section}
                    {customAnalysis.sectionAnalyses?.[section] && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#D4AF37] rounded-full" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {selectedSection !== 'all' && (
              <div className="mt-3 flex items-center gap-2">
                <Badge className="bg-[#9CAF88]/20 text-[#8B6F47] border border-[#9CAF88]">
                  Analisando: {selectedSection}
                </Badge>
                {customAnalysis.sectionAnalyses?.[selectedSection] && (
                  <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]">
                    ✓ Análise salva
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveSectionAnalysis}
                  disabled={saving}
                  className="ml-auto border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white"
                >
                  {saving ? (
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Save className="w-3 h-3 mr-1" />
                  )}
                  Salvar Análise
                </Button>
                {customAnalysis.sectionAnalyses?.[selectedSection] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSectionAnalysis(selectedSection)}
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </CardHeader>
      <CardContent>
        {/* Análise Focada na Seção */}
        {selectedSection !== 'all' && sectionAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-[#9CAF88]/20 via-white to-[#9CAF88]/10 rounded-xl border-2 border-[#9CAF88]"
          >
            <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#9CAF88]" />
              Análise Focada: {selectedSection}
            </h3>

            {/* Estatísticas da seção */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 bg-white rounded-lg border border-[#9CAF88]/30">
                <p className="text-xl font-bold text-[#9CAF88]">{sectionAnalysis.totalChords}</p>
                <p className="text-xs text-[#A68A64]">Acordes</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-[#9CAF88]/30">
                <p className="text-xl font-bold text-[#8B6F47]">{sectionAnalysis.uniqueChords.length}</p>
                <p className="text-xs text-[#A68A64]">Únicos</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-[#9CAF88]/30">
                <p className="text-xl font-bold text-purple-600">{sectionAnalysis.modalInterchanges.length}</p>
                <p className="text-xs text-[#A68A64]">Empréstimos</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-[#9CAF88]/30">
                <p className="text-xl font-bold text-[#D4AF37]">{sectionAnalysis.cadences.length}</p>
                <p className="text-xs text-[#A68A64]">Cadências</p>
              </div>
            </div>

            {/* Acordes da seção */}
            <div className="mb-4 p-3 bg-white rounded-lg border border-[#D4C5B0]">
              <p className="text-xs font-medium text-[#8B6F47] mb-2">Acordes utilizados:</p>
              <div className="flex flex-wrap gap-1">
                {sectionAnalysis.uniqueChords.map((chord, idx) => (
                  <Badge key={idx} variant="outline" className="text-[#8B6F47] border-[#D4C5B0]">
                    {chord}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Características identificadas */}
            {sectionAnalysis.characteristics.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-[#8B6F47] mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-[#D4AF37]" />
                  Características da seção:
                </p>
                <div className="space-y-1">
                  {sectionAnalysis.characteristics.map((char, idx) => (
                    <p key={idx} className="text-sm text-[#A68A64] flex items-center gap-2">
                      <span className="text-[#9CAF88]">•</span>
                      {char}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Detalhes das análises da seção */}
            <div className="space-y-3">
              {/* Acordes de Passagem da Seção */}
              {sectionAnalysis.passingChords.length > 0 && (
                <div className="p-3 bg-[#F5F1E8] rounded-lg">
                  <p className="text-xs font-bold text-[#8B6F47] mb-2 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    Acordes de Passagem ({sectionAnalysis.passingChords.length})
                  </p>
                  <div className="space-y-2">
                    {sectionAnalysis.passingChords.map((pc, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Badge className="bg-[#8B6F47] text-white">{pc.chord}</Badge>
                        <span className="text-xs text-[#A68A64]">{pc.context}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empréstimos Modais da Seção */}
              {sectionAnalysis.modalInterchanges.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    Empréstimos Modais ({sectionAnalysis.modalInterchanges.length})
                  </p>
                  <div className="space-y-2">
                    {sectionAnalysis.modalInterchanges.map((mi, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Badge className="bg-purple-600 text-white">{mi.chord}</Badge>
                        <Badge variant="outline" className="text-purple-600 border-purple-300">{mi.borrowType}</Badge>
                        <span className="text-xs text-purple-600">{mi.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cadências da Seção */}
              {sectionAnalysis.cadences.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Cadências ({sectionAnalysis.cadences.length})
                  </p>
                  <div className="space-y-2">
                    {sectionAnalysis.cadences.map((cad, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm flex-wrap">
                        <div className="flex items-center gap-1">
                          {cad.degrees.map((d, i) => (
                            <React.Fragment key={i}>
                              <Badge className="bg-[#9CAF88] text-white text-xs">{d}</Badge>
                              {i < cad.degrees.length - 1 && <ArrowRight className="w-3 h-3 text-[#9CAF88]" />}
                            </React.Fragment>
                          ))}
                        </div>
                        <span className="text-xs text-green-700 font-medium">{cad.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acordes de Adorno da Seção */}
              {sectionAnalysis.ornamentChords.length > 0 && (
                <div className="p-3 bg-[#D4AF37]/10 rounded-lg">
                  <p className="text-xs font-bold text-[#D4AF37] mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Acordes de Adorno ({sectionAnalysis.ornamentChords.length})
                  </p>
                  <div className="space-y-2">
                    {sectionAnalysis.ornamentChords.map((oc, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Badge className="bg-[#D4AF37] text-white">{oc.chord}</Badge>
                        <Badge variant="outline" className="text-[#D4AF37] border-[#D4AF37]">{oc.type}</Badge>
                        {oc.target && <span className="text-xs text-[#A68A64]">→ {oc.target}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Raciocínio da IA para a seção */}
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-[#8B6F47] hover:text-[#9CAF88]">
                Ver raciocínio da IA para esta seção
              </summary>
              <div className="mt-2 p-3 bg-white rounded-lg text-xs text-[#A68A64] border border-[#D4C5B0]">
                <p className="mb-2">
                  <strong>Análise da seção "{selectedSection}":</strong>
                </p>
                <p className="mb-1">
                  • Analisei {sectionAnalysis.totalChords} acordes, identificando {sectionAnalysis.uniqueChords.length} acordes únicos.
                </p>
                {sectionAnalysis.passingChords.length > 0 && (
                  <p className="mb-1">
                    • Detectei {sectionAnalysis.passingChords.length} acorde(s) de passagem por movimento escalar entre graus adjacentes.
                  </p>
                )}
                {sectionAnalysis.modalInterchanges.length > 0 && (
                  <p className="mb-1">
                    • Encontrei {sectionAnalysis.modalInterchanges.length} empréstimo(s) modal(is) - acordes fora da escala de {mainKey}.
                  </p>
                )}
                {sectionAnalysis.cadences.length > 0 && (
                  <p className="mb-1">
                    • Identifiquei {sectionAnalysis.cadences.length} cadência(s) que definem a estrutura harmônica desta seção.
                  </p>
                )}
                <p className="mt-2 text-[#9CAF88]">
                  Esta análise focada permite entender o papel harmônico específico desta seção dentro da música.
                </p>
              </div>
            </details>
          </motion.div>
        )}

        {/* Análises Salvas por Seção */}
        {Object.keys(customAnalysis.sectionAnalyses || {}).length > 0 && selectedSection === 'all' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-[#D4AF37]/5 rounded-xl border border-[#D4AF37]/30"
          >
            <h4 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
              <Save className="w-4 h-4 text-[#D4AF37]" />
              Análises Salvas por Seção
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(customAnalysis.sectionAnalyses).map(([sectionName, analysis]) => (
                <div key={sectionName} className="p-3 bg-white rounded-lg border border-[#D4C5B0]">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-[#9CAF88] text-white">{sectionName}</Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSection(sectionName)}
                        className="text-[#8B6F47] hover:bg-[#9CAF88]/10 h-7 px-2"
                      >
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSectionAnalysis(sectionName)}
                        className="text-red-500 hover:bg-red-50 h-7 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-[#A68A64]">
                    <span>{analysis.totalChords} acordes</span>
                    <span>{analysis.cadences?.length || 0} cadências</span>
                    <span>{analysis.modalInterchanges?.length || 0} empréstimos</span>
                  </div>
                  <p className="text-xs text-[#A68A64] mt-1">
                    Salvo em {new Date(analysis.savedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sumário Geral - só mostra quando "Todas as Seções" está selecionado */}
        {analysisSummary && selectedSection === 'all' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-[#D4AF37]/10 via-white to-[#9CAF88]/10 rounded-xl border border-[#D4AF37]/30"
          >
            <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              Sumário da Análise Harmônica (Música Completa)
            </h3>
            
            {/* Estatísticas rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 bg-white rounded-lg border border-[#D4C5B0]">
                <p className="text-2xl font-bold text-[#8B6F47]">{analysisSummary.totalSections}</p>
                <p className="text-xs text-[#A68A64]">Seções</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-[#D4C5B0]">
                <p className="text-2xl font-bold text-[#D4AF37]">{analysisSummary.uniqueChords}</p>
                <p className="text-xs text-[#A68A64]">Acordes Únicos</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-[#D4C5B0]">
                <p className="text-2xl font-bold text-purple-600">{analysisSummary.modalInterchangesCount}</p>
                <p className="text-xs text-[#A68A64]">Empréstimos</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-[#D4C5B0]">
                <p className="text-2xl font-bold text-[#9CAF88]">{analysisSummary.cadencesCount}</p>
                <p className="text-xs text-[#A68A64]">Cadências</p>
              </div>
            </div>

            {/* Highlights */}
            {analysisSummary.highlights.length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-bold text-[#8B6F47] flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#D4AF37]" />
                  Pontos de Destaque
                </h4>
                {analysisSummary.highlights.map((highlight, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border-l-4 border-[#D4AF37] text-sm">
                    <p className="font-medium text-[#8B6F47]">{highlight.title}</p>
                    <p className="text-[#A68A64] text-xs">{highlight.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Correções do usuário */}
            {analysisSummary.userCorrections > 0 && (
              <div className="p-3 bg-[#9CAF88]/10 rounded-lg border border-[#9CAF88]/30">
                <p className="text-sm text-[#8B6F47] flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#9CAF88]" />
                  <span>{analysisSummary.learningInsight}</span>
                </p>
              </div>
            )}

            {/* Botão para expandir raciocínio da IA */}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-[#8B6F47] hover:text-[#D4AF37] flex items-center gap-2">
                <Info className="w-4 h-4" />
                Ver raciocínio da IA para cada análise
              </summary>
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-[#D4AF37]/30">
                {analysisSummary.aiReasoning.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-[#8B6F47]">{item.category}</p>
                      {item.confidence !== 'N/A' && (
                        <Badge variant="outline" className="text-xs">
                          Confiança: {item.confidence}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#A68A64] leading-relaxed">{item.reasoning}</p>
                  </div>
                ))}
              </div>
            </details>
          </motion.div>
        )}

        <Tabs defaultValue="functions">
          <TabsList className="bg-[#F5F1E8] mb-6 flex-wrap">
            <TabsTrigger value="functions">Funções Harmônicas</TabsTrigger>
            <TabsTrigger value="passing">Acordes Especiais</TabsTrigger>
            <TabsTrigger value="modal">Empréstimos Modais</TabsTrigger>
            <TabsTrigger value="cadences">Cadências</TabsTrigger>
            <TabsTrigger value="tension">Tensão/Relaxamento</TabsTrigger>
          </TabsList>

          {/* Análise de Funções Harmônicas */}
          <TabsContent value="functions">
            <div className="space-y-6">
              <div className="p-4 bg-gradient-to-r from-[#9CAF88]/10 via-white to-[#D4AF37]/10 rounded-xl border-2 border-[#9CAF88]">
                <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#9CAF88]" />
                  Distribuição das Funções Harmônicas
                </h3>
                
                {harmonicFunctionAnalysis && (
                  <>
                    {/* Percentuais Gerais */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="p-4 bg-gradient-to-br from-green-50 to-white rounded-xl border-2 border-green-300 text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {harmonicFunctionAnalysis.percentages.Tônica}%
                        </div>
                        <div className="text-sm font-medium text-green-700 mb-2">TÔNICA</div>
                        <div className="text-xs text-green-600">
                          {harmonicFunctionAnalysis.counts.Tônica} acordes
                        </div>
                        <div className="mt-2 text-xs text-green-700 leading-tight">
                          I, i, iii, vi (repouso)
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-white rounded-xl border-2 border-blue-300 text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {harmonicFunctionAnalysis.percentages.Subdominante}%
                        </div>
                        <div className="text-sm font-medium text-blue-700 mb-2">SUBDOMINANTE</div>
                        <div className="text-xs text-blue-600">
                          {harmonicFunctionAnalysis.counts.Subdominante} acordes
                        </div>
                        <div className="mt-2 text-xs text-blue-700 leading-tight">
                          ii, II, IV, iv (preparação)
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-br from-red-50 to-white rounded-xl border-2 border-red-300 text-center">
                        <div className="text-3xl font-bold text-red-600 mb-1">
                          {harmonicFunctionAnalysis.percentages.Dominante}%
                        </div>
                        <div className="text-sm font-medium text-red-700 mb-2">DOMINANTE</div>
                        <div className="text-xs text-red-600">
                          {harmonicFunctionAnalysis.counts.Dominante} acordes
                        </div>
                        <div className="mt-2 text-xs text-red-700 leading-tight">
                          V, V7, vii° (tensão)
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progresso Visual */}
                    <div className="mb-4">
                      <div className="flex h-8 rounded-lg overflow-hidden border-2 border-[#D4C5B0]">
                        <div 
                          className="bg-green-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                          style={{ width: `${harmonicFunctionAnalysis.percentages.Tônica}%` }}
                        >
                          {parseFloat(harmonicFunctionAnalysis.percentages.Tônica) > 10 && `${harmonicFunctionAnalysis.percentages.Tônica}%`}
                        </div>
                        <div 
                          className="bg-blue-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                          style={{ width: `${harmonicFunctionAnalysis.percentages.Subdominante}%` }}
                        >
                          {parseFloat(harmonicFunctionAnalysis.percentages.Subdominante) > 10 && `${harmonicFunctionAnalysis.percentages.Subdominante}%`}
                        </div>
                        <div 
                          className="bg-red-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                          style={{ width: `${harmonicFunctionAnalysis.percentages.Dominante}%` }}
                        >
                          {parseFloat(harmonicFunctionAnalysis.percentages.Dominante) > 10 && `${harmonicFunctionAnalysis.percentages.Dominante}%`}
                        </div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-[#A68A64]">
                        <span>Repouso</span>
                        <span>Preparação</span>
                        <span>Tensão</span>
                      </div>
                    </div>

                    {/* Análise de Equilíbrio */}
                    <div className="p-3 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0]">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-[#8B6F47]" />
                        <span className="text-sm font-bold text-[#8B6F47]">Equilíbrio Harmônico:</span>
                        <Badge className="bg-[#9CAF88] text-white">{harmonicFunctionAnalysis.balance}</Badge>
                      </div>
                      <p className="text-xs text-[#A68A64] leading-relaxed">
                        {harmonicFunctionAnalysis.balance === 'Equilibrada' && 
                          'A música apresenta distribuição equilibrada entre repouso (tônica), preparação (subdominante) e tensão (dominante), criando um fluxo harmônico natural.'}
                        {harmonicFunctionAnalysis.balance === 'Tensão Dominante' && 
                          'Alto uso de acordes dominantes indica uma música com muita tensão e energia, comum em estilos mais dinâmicos.'}
                        {harmonicFunctionAnalysis.balance === 'Repouso Predominante' && 
                          'Predominância de acordes de função tônica (I, iii, vi) sugere uma música mais estável e consonante, com menos movimentação harmônica.'}
                        {harmonicFunctionAnalysis.balance === 'Preparação Constante' && 
                          'Alto percentual de subdominantes (ii, IV) indica constante preparação para resoluções, típico de progressões elaboradas.'}
                      </p>
                    </div>

                    {/* Explicação Detalhada */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-[#8B6F47] hover:text-[#9CAF88] flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Como o sistema classifica as funções harmônicas
                      </summary>
                      <div className="mt-3 p-4 bg-white rounded-lg text-xs text-[#A68A64] border border-[#D4C5B0] space-y-2">
                        <p><strong className="text-green-600">• TÔNICA (Repouso):</strong></p>
                        <p className="ml-4">- I, i: Centro tonal, repouso total</p>
                        <p className="ml-4">- iii: Acorde menor de 3º grau, substituto de I (função tônica)</p>
                        <p className="ml-4">- vi: Acorde menor de 6º grau, relativo menor, função tônica</p>
                        
                        <p className="mt-2"><strong className="text-blue-600">• SUBDOMINANTE (Preparação):</strong></p>
                        <p className="ml-4">- ii: Acorde menor de 2º grau, preparação suave</p>
                        <p className="ml-4">- II: Acorde maior de 2º grau</p>
                        <p className="ml-4">- IV, iv: Subdominante maior ou menor, afastamento da tônica</p>
                        
                        <p className="mt-2"><strong className="text-red-600">• DOMINANTE (Tensão):</strong></p>
                        <p className="ml-4">- V, V7: Dominante, cria tensão e demanda resolução</p>
                        <p className="ml-4">- VII, vii°: Sensível, substituto da dominante</p>
                        
                        <p className="mt-3 p-2 bg-[#9CAF88]/10 rounded">
                          <strong>💡 Importante:</strong> A classificação correta dos graus ii, iii e vi como funções de 
                          subdominante e tônica é essencial para análise harmônica precisa, especialmente em música popular brasileira.
                        </p>
                      </div>
                    </details>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Acordes de Passagem e Adorno */}
          <TabsContent value="passing">
            <div className="space-y-6">
              {/* Botão de adicionar acorde especial manual */}
              {isEditing && !editingItem && (
                <Button
                  onClick={() => setEditingItem({ type: 'passing', data: null })}
                  variant="outline"
                  className="w-full border-dashed border-2 border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Adicionar Acorde Especial
                </Button>
              )}

              {/* Formulário de edição */}
              <AnimatePresence>
                {editingItem?.type === 'passing' && (
                  <EditForm
                    item={editingItem.data}
                    type="passing"
                    onSave={(data) => {
                      if (editingItem.data) {
                        saveCorrection({
                          type: 'passing',
                          original_chord: editingItem.data.chord,
                          corrected_chord: data.chord,
                          degree: data.degree,
                          context: data.context,
                          section: data.section,
                          notes: data.explanation
                        });
                      } else {
                        addManualAnalysis('passing', data);
                      }
                    }}
                    onCancel={() => setEditingItem(null)}
                  />
                )}
              </AnimatePresence>

              {/* Acordes Especiais Customizados */}
              {customAnalysis.passingChords?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Acordes Adicionados Manualmente
                  </h4>
                  <div className="space-y-2">
                    {customAnalysis.passingChords.map((pc, idx) => (
                      <motion.div
                        key={`custom-passing-${idx}`}
                        className="p-3 bg-gradient-to-r from-[#D4AF37]/20 to-white rounded-lg border-2 border-[#D4AF37]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#D4AF37] text-white">{pc.chord}</Badge>
                            <Badge variant="outline">{pc.degree}</Badge>
                            <Badge variant="outline" className="border-[#D4AF37] text-[#D4AF37]">{pc.type}</Badge>
                          </div>
                          {isEditing && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-h-[40px] min-w-[40px] touch-manipulation"
                                onClick={() => setEditingItem({ type: 'passing', data: pc, index: idx })}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-h-[40px] min-w-[40px] text-red-500 touch-manipulation"
                                onClick={() => removeCustomAnalysis('passing', idx)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-[#8B6F47]">{pc.explanation}</p>
                        {pc.context && <p className="text-xs text-[#A68A64] mt-1">Contexto: {pc.context}</p>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acordes de Passagem */}
              <div>
                <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Acordes de Passagem Identificados
                </h3>
                {/* Explicação detalhada */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>O que são acordes de passagem?</strong> São acordes que conectam dois acordes principais através de movimento escalar. 
                      Eles "passam" entre os graus principais, criando uma linha de baixo mais fluida. 
                      Exemplo: se a progressão vai de C para Em, um D ou Dm pode ser acorde de passagem.
                    </span>
                  </p>
                </div>

                {passingChordsAnalysis?.passingChords?.length > 0 ? (
                  <div className="space-y-2">
                    {passingChordsAnalysis.passingChords.map((pc, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-3 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0] relative group"
                      >
                        {/* Botão de editar */}
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 min-h-[44px] min-w-[44px] md:h-7 md:w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white shadow touch-manipulation"
                            onClick={() => setEditingItem({ type: 'passing', data: pc, index: idx })}
                            title="Corrigir esta análise"
                          >
                            <Edit className="w-4 h-4 text-[#8B6F47]" />
                          </Button>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-[#8B6F47] text-white">{pc.chord}</Badge>
                          <Badge variant="outline">{pc.degree}</Badge>
                          <span className="text-xs text-[#A68A64]">em {pc.section}</span>
                        </div>
                        <p className="text-sm text-[#8B6F47]">{pc.explanation}</p>
                        <p className="text-xs text-[#A68A64] mt-1">Contexto: {pc.context}</p>
                        
                        {/* Raciocínio da IA */}
                        <div className="mt-2 p-2 bg-white/50 rounded border border-[#D4C5B0]/50">
                          <p className="text-xs text-[#A68A64] flex items-start gap-1">
                            <Brain className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span><strong>Por que identifiquei:</strong> O acorde {pc.chord} ({pc.degree}) está posicionado entre dois graus adjacentes ({pc.context}), formando movimento escalar típico de acordes de passagem.</span>
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-[#F5F1E8] rounded-lg">
                    <p className="text-sm text-[#A68A64] italic flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Nenhum acorde de passagem detectado.
                    </p>
                    <p className="text-xs text-[#A68A64] mt-2">
                      <strong>Possíveis razões:</strong> A progressão pode ser mais direta, sem acordes intermediários, ou os acordes identificados têm funções harmônicas definidas (não são apenas passagem).
                    </p>
                  </div>
                )}
              </div>

              {/* Acordes de Adorno */}
              <div>
                <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Acordes de Adorno
                </h3>
                {passingChordsAnalysis?.ornamentChords?.length > 0 ? (
                  <div className="space-y-2">
                    {passingChordsAnalysis.ornamentChords.map((oc, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-3 bg-gradient-to-r from-[#D4AF37]/10 to-white rounded-lg border border-[#D4AF37]/30"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-[#D4AF37] text-white">{oc.chord}</Badge>
                          <Badge variant="outline" className="border-[#D4AF37] text-[#D4AF37]">{oc.type}</Badge>
                          <span className="text-xs text-[#A68A64]">em {oc.section}</span>
                        </div>
                        <p className="text-sm text-[#8B6F47]">{oc.explanation}</p>
                        {oc.target && <p className="text-xs text-[#A68A64]">Resolve em: {oc.target}</p>}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#A68A64] italic">Nenhum acorde de adorno detectado.</p>
                )}
              </div>

              {/* Movimentos Cromáticos */}
              {passingChordsAnalysis?.chromaticMovements?.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Movimentos Cromáticos
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {passingChordsAnalysis.chromaticMovements.map((cm, idx) => (
                      <Badge key={idx} className="bg-purple-100 text-purple-700 border border-purple-300">
                        {cm.from} → {cm.to} ({cm.direction})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Empréstimos Modais e Modulações */}
          <TabsContent value="modal">
            <div className="space-y-6">
              {/* Botão de adicionar empréstimo modal manual */}
              {isEditing && !editingItem && (
                <Button
                  onClick={() => setEditingItem({ type: 'modal', data: null })}
                  variant="outline"
                  className="w-full border-dashed border-2 border-purple-400 text-purple-600 hover:bg-purple-500 hover:text-white"
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  Adicionar Empréstimo Modal
                </Button>
              )}

              {/* Formulário de edição */}
              <AnimatePresence>
                {editingItem?.type === 'modal' && (
                  <EditForm
                    item={editingItem.data}
                    type="modal"
                    onSave={(data) => {
                      if (editingItem.data) {
                        saveCorrection({
                          type: 'modal',
                          original_chord: editingItem.data.chord,
                          corrected_chord: data.chord,
                          borrowType: data.borrowType,
                          mode: data.mode,
                          section: data.section,
                          notes: data.explanation
                        });
                      } else {
                        addManualAnalysis('modal', data);
                      }
                    }}
                    onCancel={() => setEditingItem(null)}
                  />
                )}
              </AnimatePresence>

              {/* Empréstimos Modais Customizados */}
              {customAnalysis.modalInterchanges?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-purple-600 mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Empréstimos Adicionados Manualmente
                  </h4>
                  <div className="space-y-3">
                    {customAnalysis.modalInterchanges.map((mi, idx) => (
                      <motion.div
                        key={`custom-modal-${idx}`}
                        className="p-4 bg-gradient-to-r from-purple-100 to-white rounded-xl border-2 border-purple-400"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-600 text-white">{mi.chord}</Badge>
                            <Badge variant="outline" className="border-purple-400 text-purple-600">{mi.borrowType}</Badge>
                          </div>
                          {isEditing && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-h-[40px] min-w-[40px] touch-manipulation"
                                onClick={() => setEditingItem({ type: 'modal', data: mi, index: idx })}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-h-[40px] min-w-[40px] text-red-500 touch-manipulation"
                                onClick={() => removeCustomAnalysis('modal', idx)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-[#8B6F47]">{mi.explanation}</p>
                        {mi.section && <p className="text-xs text-[#A68A64] mt-1">Seção: {mi.section}</p>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empréstimos Modais */}
              <div>
                <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Empréstimos Modais Identificados pelo Sistema
                </h3>
                
                {/* Explicação detalhada */}
                <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-800 flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>O que é empréstimo modal?</strong> É quando usamos um acorde de outro modo (escala) com a mesma tônica. 
                      Por exemplo, em C maior, usar Bb (bVII) que vem de C mixolídio, ou Fm (iv) que vem de C menor.
                      Isso adiciona "cores" harmônicas diferentes sem mudar de tonalidade.
                    </span>
                  </p>
                </div>

                {modulationAnalysis?.modalInterchanges?.length > 0 ? (
                  <div className="space-y-3">
                    {modulationAnalysis.modalInterchanges.map((mi, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-200 relative group"
                      >
                        {/* Botão de editar */}
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 min-h-[44px] min-w-[44px] md:h-7 md:w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white shadow touch-manipulation"
                            onClick={() => setEditingItem({ type: 'modal', data: mi, index: idx })}
                            title="Corrigir esta análise"
                          >
                            <Edit className="w-4 h-4 text-purple-600" />
                          </Button>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-purple-600 text-white">{mi.chord}</Badge>
                          <Badge variant="outline" className="border-purple-400 text-purple-600">{mi.borrowType}</Badge>
                          <span className="text-xs text-purple-500">de {mi.mode}</span>
                        </div>
                        <p className="text-sm text-[#8B6F47]">{mi.explanation}</p>
                        <p className="text-xs text-[#A68A64] mt-1">Seção: {mi.section}</p>
                        
                        {/* Raciocínio da IA */}
                        <div className="mt-2 p-2 bg-white/50 rounded border border-purple-200/50">
                          <p className="text-xs text-purple-700 flex items-start gap-1">
                            <Brain className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span><strong>Por que identifiquei:</strong> O acorde {mi.chord} não pertence à escala de {mainKey}. Analisando o intervalo da sua fundamental em relação à tônica, classifiquei como {mi.borrowType} emprestado do modo {mi.mode}.</span>
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-[#F5F1E8] rounded-xl">
                    <p className="text-sm text-[#A68A64] italic flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Nenhum empréstimo modal detectado. A música permanece diatônica.
                    </p>
                  </div>
                )}
              </div>

              {/* Modulações */}
              <div>
                <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Modulações Detectadas
                </h3>
                {modulationAnalysis?.modulations?.length > 0 ? (
                  <div className="space-y-3">
                    {modulationAnalysis.modulations.map((mod, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 bg-gradient-to-r from-orange-50 to-white rounded-xl border border-orange-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-orange-600 text-white">{mod.fromKey}</Badge>
                          <ArrowRight className="w-4 h-4 text-orange-500" />
                          <Badge className="bg-orange-500 text-white">{mod.toKey}</Badge>
                          <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">
                            {mod.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#8B6F47]">{mod.explanation}</p>
                        <p className="text-xs text-[#A68A64] mt-1">
                          Acorde pivô: <strong>{mod.pivotChord}</strong> em {mod.section}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-[#F5F1E8] rounded-xl">
                    <p className="text-sm text-[#A68A64] italic flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Nenhuma modulação detectada. A música mantém a tonalidade original.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Cadências e Alternativas */}
          <TabsContent value="cadences">
            <div className="space-y-6">
              {/* Botão de adicionar cadência manual */}
              {isEditing && !editingItem && (
                <Button
                  onClick={() => setEditingItem({ type: 'cadence', data: null })}
                  variant="outline"
                  className="w-full border-dashed border-2 border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Adicionar Cadência Manual
                </Button>
              )}

              {/* Formulário de edição */}
              <AnimatePresence>
                {editingItem?.type === 'cadence' && (
                  <EditForm
                    item={editingItem.data}
                    type="cadence"
                    onSave={(data) => {
                      if (editingItem.data) {
                        saveCorrection({
                          type: 'cadence',
                          original_pattern: editingItem.data.pattern,
                          corrected_pattern: data.pattern,
                          corrected_name: data.name,
                          chords: data.chords,
                          section: data.section,
                          notes: data.description
                        });
                      } else {
                        addManualAnalysis('cadence', data);
                      }
                    }}
                    onCancel={() => setEditingItem(null)}
                  />
                )}
              </AnimatePresence>

              {/* Cadências Customizadas (adicionadas manualmente) */}
              {customAnalysis.cadences?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-[#9CAF88] mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Cadências Adicionadas Manualmente
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customAnalysis.cadences.map((cad, idx) => (
                      <motion.div
                        key={`custom-${idx}`}
                        className="p-4 bg-gradient-to-r from-[#9CAF88]/20 to-white rounded-xl border-2 border-[#9CAF88]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-[#9CAF88] text-white">{cad.pattern}</Badge>
                          {isEditing && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-h-[40px] min-w-[40px] touch-manipulation"
                                onClick={() => setEditingItem({ type: 'cadence', data: cad, index: idx })}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-h-[40px] min-w-[40px] text-red-500 touch-manipulation"
                                onClick={() => removeCustomAnalysis('cadence', idx)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-[#8B6F47]">{cad.name}</p>
                        <p className="text-sm text-[#A68A64]">{cad.description}</p>
                        {cad.section && <p className="text-xs text-[#A68A64] mt-1">Seção: {cad.section}</p>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cadências Identificadas */}
              <div>
                <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Cadências Identificadas pelo Sistema
                </h3>
                
                {/* Explicação detalhada */}
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-800 flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>O que são cadências?</strong> São padrões de acordes que criam sensação de conclusão ou movimento. 
                      A <strong>autêntica (V-I)</strong> é a mais forte resolução. 
                      A <strong>plagal (IV-I)</strong> é suave, conhecida como "Amém". 
                      A <strong>deceptiva (V-vi)</strong> "engana" o ouvido evitando a resolução esperada.
                      A <strong>ii-V-I</strong> é fundamental no jazz e pop.
                    </span>
                  </p>
                </div>

                {cadenceAnalysis?.cadences?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cadenceAnalysis.cadences.map((cad, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 bg-gradient-to-r from-[#9CAF88]/10 to-white rounded-xl border border-[#9CAF88] relative group"
                      >
                        {/* Botão de editar */}
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 min-h-[44px] min-w-[44px] md:h-7 md:w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white shadow touch-manipulation"
                            onClick={() => setEditingItem({ type: 'cadence', data: cad, index: idx })}
                            title="Corrigir esta análise"
                          >
                            <Edit className="w-4 h-4 text-[#8B6F47]" />
                          </Button>
                        )}
                        
                        <div className="flex items-center gap-2 mb-2">
                          {cad.degrees.map((d, i) => (
                            <React.Fragment key={i}>
                              <Badge className="bg-[#9CAF88] text-white">{d}</Badge>
                              {i < cad.degrees.length - 1 && <ArrowRight className="w-3 h-3 text-[#9CAF88]" />}
                            </React.Fragment>
                          ))}
                        </div>
                        <p className="font-bold text-[#8B6F47]">{cad.name}</p>
                        <p className="text-sm text-[#A68A64]">{cad.description}</p>
                        <p className="text-xs text-[#A68A64] mt-1">Seção: {cad.section}</p>
                        
                        {/* Trecho da música com os acordes e letra */}
                        {cad.cifraExcerpt ? (
                          <div className="mt-3 p-3 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0]">
                            <p className="text-xs text-[#8B6F47] font-medium mb-2">🎵 Trecho da música:</p>
                            <pre className="font-mono text-xs text-[#2d1810] whitespace-pre-wrap leading-relaxed bg-white p-2 rounded border border-[#D4C5B0]">
                              {cad.cifraExcerpt}
                            </pre>
                          </div>
                        ) : cad.chords && cad.chords.length > 0 && (
                          <div className="mt-3 p-2 bg-white rounded-lg border border-[#D4C5B0]">
                            <p className="text-xs text-[#8B6F47] font-medium mb-1">🎵 Acordes identificados:</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {cad.chords.map((chord, i) => (
                                <React.Fragment key={i}>
                                  <span className="font-mono font-bold text-[#8B6F47] bg-[#D4AF37]/20 px-2 py-1 rounded">
                                    {chord}
                                  </span>
                                  {i < cad.chords.length - 1 && <ArrowRight className="w-3 h-3 text-[#D4AF37]" />}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Raciocínio da IA */}
                        <div className="mt-2 p-2 bg-white/50 rounded border border-[#9CAF88]/30">
                          <p className="text-xs text-[#8B6F47] flex items-start gap-1">
                            <Brain className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span><strong>Por que identifiquei:</strong> Encontrei o padrão {cad.pattern} ({cad.degrees.join('-')}) que corresponde à "{cad.name}". Esta cadência {cad.pattern === 'V-I' ? 'resolve fortemente na tônica, criando conclusão definitiva' : cad.pattern === 'IV-I' ? 'resolve suavemente, comum em finais de frases' : cad.pattern.includes('ii-V') ? 'prepara a resolução com movimento de quintas descendentes' : 'cria movimento harmônico característico'}.</span>
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#A68A64] italic">Nenhuma cadência tradicional identificada.</p>
                )}
              </div>

              {/* Alternativas Sugeridas */}
              <div>
                <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#D4AF37]" />
                  Resoluções Alternativas Sugeridas
                </h3>
                {cadenceAnalysis?.alternatives?.length > 0 ? (
                  <div className="space-y-3">
                    {cadenceAnalysis.alternatives.slice(0, 6).map((alt, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 bg-gradient-to-r from-[#D4AF37]/10 to-white rounded-xl border border-[#D4AF37]/30"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[#A68A64]">{alt.original}</Badge>
                            <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                            <Badge className="bg-[#D4AF37] text-white">{alt.alternative}</Badge>
                          </div>
                        </div>
                        <p className="font-bold text-[#8B6F47] text-sm">{alt.name}</p>
                        <p className="text-sm text-[#A68A64]">{alt.description}</p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#A68A64] italic">Nenhuma alternativa disponível.</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tensão e Relaxamento */}
          <TabsContent value="tension">
            <div className="space-y-6">
              {/* Visão Geral */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-200 text-center">
                  <Gauge className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {tensionAnalysis?.overall?.average || 0}
                  </p>
                  <p className="text-sm text-green-700">Tensão Média</p>
                  <p className="text-xs text-green-600 mt-1">{tensionAnalysis?.overall?.profile}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-red-50 to-white rounded-xl border border-red-200 text-center">
                  <TrendingUp className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    {tensionAnalysis?.overall?.max || 0}
                  </p>
                  <p className="text-sm text-red-700">Pico de Tensão</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-200 text-center">
                  <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    {tensionAnalysis?.overall?.min || 0}
                  </p>
                  <p className="text-sm text-blue-700">Ponto de Relaxamento</p>
                </div>
              </div>

              {/* Curva de Tensão por Seção */}
              <div>
                <h3 className="font-bold text-[#8B6F47] mb-3">Perfil de Tensão por Seção</h3>
                <div className="space-y-4">
                  {tensionAnalysis?.sections?.map((section, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-[#F5F1E8] rounded-xl"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#8B6F47] text-white">{section.section}</Badge>
                          <Badge 
                            className={`${
                              section.profile === 'Alta Tensão' ? 'bg-red-500' :
                              section.profile === 'Tensão Moderada' ? 'bg-yellow-500' :
                              'bg-green-500'
                            } text-white`}
                          >
                            {section.profile}
                          </Badge>
                        </div>
                        <span className="text-sm text-[#A68A64]">Média: {section.avgTension}</span>
                      </div>

                      {/* Visualização da curva */}
                      <div className="flex items-end gap-1 h-16 mb-3">
                        {section.tensions.map((t, i) => (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center"
                          >
                            <div
                              className={`w-full rounded-t transition-all ${
                                t.tension >= 7 ? 'bg-red-500' :
                                t.tension >= 5 ? 'bg-yellow-500' :
                                t.tension >= 3 ? 'bg-blue-400' :
                                'bg-green-400'
                              }`}
                              style={{ height: `${(t.tension / 10) * 100}%`, minHeight: '10%' }}
                            />
                            <span className="text-[10px] text-[#A68A64] mt-1">{t.degree}</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-[#A68A64]">
                        <div className="p-2 bg-red-50 rounded border border-red-200">
                          <p className="font-medium text-red-700 mb-1">📈 Pico de Tensão</p>
                          <p><strong className="text-red-600">{section.peak.degree}</strong></p>
                          <p className="text-[10px]">Função: {section.peak.function}</p>
                          <p className="text-[10px]">Tensão: {section.peak.tension}/10</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded border border-green-200">
                          <p className="font-medium text-green-700 mb-1">📉 Ponto de Repouso</p>
                          <p><strong className="text-green-600">{section.resolve.degree}</strong></p>
                          <p className="text-[10px]">Função: {section.resolve.function}</p>
                          <p className="text-[10px]">Tensão: {section.resolve.tension}/10</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Legenda */}
              <div className="p-3 bg-white rounded-lg border border-[#D4C5B0]">
                <p className="text-xs font-medium text-[#8B6F47] mb-2">Escala de Tensão:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-green-400 text-white">0-2: Relaxado (Tônica)</Badge>
                  <Badge className="bg-blue-400 text-white">3-4: Leve (Subdominante)</Badge>
                  <Badge className="bg-yellow-500 text-white">5-6: Moderado</Badge>
                  <Badge className="bg-red-500 text-white">7+: Alto (Dominante)</Badge>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}