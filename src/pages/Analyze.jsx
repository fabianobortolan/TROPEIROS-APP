import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Music, FileAudio, Loader2, ArrowLeft, CheckCircle, AlertCircle, FileText, Edit3, Filter, Waves, TrendingUp, Sparkles, Brain, Lightbulb, AlertTriangle, ShieldOff, RotateCcw, Globe, Tag } from "lucide-react";
import BuscarCifraModal from "../components/songs/BuscarCifraModal";
import { normalizePattern, findProgressionMatch as findProgressionMatchUtil, calculatePatternFromChords, getAnalysisNotes } from "@/utils/progressionUtils";
import { validarCifra } from "@/utils/cifraValidator";
import CifraAlertBadge from "../components/songs/CifraAlertBadge";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RhythmDiagramMini from "../components/rhythms/RhythmDiagramMini";
import AdvancedSimilarity from "../components/analysis/AdvancedSimilarity";
import AITraining from "../components/analysis/AITraining";
import ManualPassageMarker from "../components/analysis/ManualPassageMarker";
import PersonalizedRecommendations from "../components/recommendations/PersonalizedRecommendations";
import SongSuggestions from "../components/ai/SongSuggestions";
import UnusualProgressionDetector from "../components/ai/UnusualProgressionDetector";

export default function Analyze() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => { setCurrentUser(u); setLoadingUser(false); }).catch(() => setLoadingUser(false));
  }, []);

  const [inputType, setInputType] = useState("cifra");
  const [file, setFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [cifraText, setCifraText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    genre_style: "sertanejo_universitario",
    rhythm_id: null // Changed initial state to null for explicit "Nenhum" option
  });

  // Novos estados para ajustes pós-análise
  const [analysisResult, setAnalysisResult] = useState(null);
  const [manualKey, setManualKey] = useState("");
  const [manualTimeSignature, setManualTimeSignature] = useState("");
  const [showPostAnalysis, setShowPostAnalysis] = useState(false);
  const [harmonicFunctionFilter, setHarmonicFunctionFilter] = useState("all");
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState(null);

  const [showAdvancedSimilarity, setShowAdvancedSimilarity] = useState(false);
  const [showAITraining, setShowAITraining] = useState(false);
  const [showPassageMarker, setShowPassageMarker] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showSongSuggestions, setShowSongSuggestions] = useState(false);
  const [showUnusualDetector, setShowUnusualDetector] = useState(false);
  const [showBuscarCifra, setShowBuscarCifra] = useState(false);
  const [validationAlert, setValidationAlert] = useState(null);

  // Verifica se há cifra preparada no localStorage OU dados vindos de navegação
  useEffect(() => {
    // Verifica dados de navegação primeiro (vindos do CadernosManager)
    const navigationState = window.history.state?.usr;
    if (navigationState?.prefilledData) {
      const data = navigationState.prefilledData;
      console.log("📥 Dados recebidos do Caderno:", data);
      
      if (data.cifra_text) {
        setCifraText(data.cifra_text);
        setInputType("cifra");
      }
      
      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        artist: data.artist || prev.artist,
        ...(data.main_key && { main_key: data.main_key })
      }));
      
      // Limpa os dados de navegação para não reusar
      window.history.replaceState({}, document.title);
      return;
    }
    
    // Se não há dados de navegação, verifica localStorage (cifra preparada)
    const cifraPreparada = localStorage.getItem('cifra_preparada');
    const metadataPreparada = localStorage.getItem('cifra_metadata');
    
    if (cifraPreparada) {
      setCifraText(cifraPreparada);
      setInputType("cifra");
      
      if (metadataPreparada) {
        try {
          const metadata = JSON.parse(metadataPreparada);
          setFormData(prev => ({
            ...prev,
            title: metadata.titulo || prev.title,
            artist: metadata.artista || prev.artist
          }));
        } catch (e) {
          console.error("Failed to parse cifra_metadata from localStorage", e);
        }
      }
      
      // Limpa o localStorage
      localStorage.removeItem('cifra_preparada');
      localStorage.removeItem('cifra_metadata');
    }
  }, []);

  const createSongMutation = useMutation({
    mutationFn: (songData) => base44.entities.Song.create(songData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setSuccess(true);
      setTimeout(() => {
        navigate(createPageUrl("Library"));
      }, 2000);
    }
  });

  const { data: knownProgressions, isLoading: progressionsLoading } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  const { data: rhythms } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: []
  });

  const { data: learningPatterns } = useQuery({
    queryKey: ['learningPatterns'],
    queryFn: () => base44.entities.LearningPattern.list(),
    initialData: []
  });

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);

      if (!formData.title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
        setFormData((prev) => ({ ...prev, title: fileName }));
      }
    }
  };

  const handleDocFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['.pdf', '.doc', '.docx', '.txt'];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

      if (!validTypes.includes(fileExtension)) {
        setError("Tipo de arquivo não suportado. Use PDF, DOC, DOCX ou TXT.");
        return;
      }

      setDocFile(selectedFile);
      setError(null);

      if (!formData.title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
        setFormData((prev) => ({ ...prev, title: fileName }));
      }
    }
  };

  // normalizePattern importada de utils/progressionUtils (fonte única da verdade)

  // findProgressionMatch importada de utils/progressionUtils (fonte única da verdade - 9 passas robustas)
  // Wrapper para manter compatibilidade com chamadas que esperam só o nome (string), não o objeto {progression_name, variation_name}
  const findProgressionMatch = (pattern, knownProgressions, learningPatterns = [], songKey = null, sectionType = null) => {
    const result = findProgressionMatchUtil(pattern, knownProgressions, learningPatterns, sectionType || '');
    return result ? result.progression_name : null;
  };

  const determinePredominantProgression = (progressions) => {
    if (!progressions || progressions.length === 0) return null;

    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║  🎯 DETERMINANDO PROGRESSÃO PREDOMINANTE (APRIMORADO)    ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");

    // Pesos por tipo de seção - baseado em importância estrutural
    const sectionWeights = {
      'refrão': 4,
      'refrao': 4,
      'chorus': 4,
      'verso': 2.5,
      'verse': 2.5,
      'estrofe': 2.5,
      'pré-refrão': 2,
      'pre-refrão': 2,
      'pre-refrao': 2,
      'ponte': 2,
      'bridge': 2,
      'solo': 1.5,
      'intro': 1,
      'introdução': 1,
      'outro': 1,
      'final': 1
    };

    const progressionScores = {};

    progressions.forEach((prog, index) => {
      // Ignora progressões sem nome identificado
      if (!prog.progression_name) {
        console.log(`⚠️ Seção "${prog.section}" ignorada: sem progressão identificada`);
        return;
      }

      const section = prog.section.toLowerCase().trim();
      console.log(`\n📍 Analisando: ${prog.section} → ${prog.progression_name}`);

      // Determina peso da seção
      let weight = 1;
      let sectionType = 'outro';
      
      for (const [key, value] of Object.entries(sectionWeights)) {
        if (section.includes(key)) {
          weight = value;
          sectionType = key;
          break;
        }
      }

      // Bônus: Se é a primeira seção analisada (geralmente verso/refrão principal)
      if (index === 0) {
        weight *= 1.2;
        console.log(`   ✨ Bônus primeira seção: peso ${weight.toFixed(1)}`);
      }

      // Bônus: Se aparece múltiplas vezes (verso 1, verso 2, verso 3)
      const occurrenceBonus = progressions.filter(p => 
        p.progression_name === prog.progression_name && 
        p.section.toLowerCase().includes(sectionType)
      ).length;
      
      if (occurrenceBonus > 1) {
        weight *= (1 + (occurrenceBonus - 1) * 0.3);
        console.log(`   ✨ Bônus repetição (${occurrenceBonus}x): peso ${weight.toFixed(1)}`);
      }

      // Inicializa ou atualiza score
      if (!progressionScores[prog.progression_name]) {
        progressionScores[prog.progression_name] = {
          score: 0,
          rawScore: 0,
          sections: [],
          sectionTypes: [],
          pattern: prog.pattern,
          occurrences: 0
        };
      }
      
      progressionScores[prog.progression_name].score += weight;
      progressionScores[prog.progression_name].rawScore += 1;
      progressionScores[prog.progression_name].sections.push(section);
      progressionScores[prog.progression_name].sectionTypes.push(sectionType);
      progressionScores[prog.progression_name].occurrences += 1;

      console.log(`   📊 Score parcial: ${progressionScores[prog.progression_name].score.toFixed(1)}`);
    });

    // Log de análise completa
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║  📊 SCORES FINAIS POR PROGRESSÃO                         ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");
    
    const sortedScores = Object.entries(progressionScores)
      .sort(([, a], [, b]) => b.score - a.score);

    sortedScores.forEach(([name, data]) => {
      console.log(`\n🎼 ${name}:`);
      console.log(`   • Score ponderado: ${data.score.toFixed(1)} pontos`);
      console.log(`   • Ocorrências: ${data.occurrences}x`);
      console.log(`   • Seções: ${data.sections.join(', ')}`);
      console.log(`   • Tipos: ${[...new Set(data.sectionTypes)].join(', ')}`);
    });

    // Determina predominante com lógica aprimorada
    let predominant = null;

    if (sortedScores.length === 0) {
      console.log("\n❌ Nenhuma progressão identificada");
      return null;
    }

    // Caso 1: Apenas uma progressão identificada
    if (sortedScores.length === 1) {
      const [name, data] = sortedScores[0];
      predominant = {
        name,
        score: data.score,
        sections: data.sections,
        pattern: data.pattern,
        occurrences: data.occurrences
      };
      console.log(`\n✅ Apenas uma progressão: ${name}`);
    }
    // Caso 2: Múltiplas progressões - escolhe a com maior score
    else {
      const [first, second] = sortedScores;
      const [firstName, firstData] = first;
      const [secondName, secondData] = second;

      // Verifica se há empate técnico (diferença < 15%)
      const scoreDiff = (firstData.score - secondData.score) / firstData.score;
      
      if (scoreDiff < 0.15) {
        console.log(`\n⚠️ Empate técnico detectado: ${firstName} (${firstData.score.toFixed(1)}) vs ${secondName} (${secondData.score.toFixed(1)})`);
        
        // Critério de desempate 1: Maior número de ocorrências
        if (firstData.occurrences > secondData.occurrences) {
          console.log(`   → ${firstName} vence por mais ocorrências (${firstData.occurrences} vs ${secondData.occurrences})`);
          predominant = {
            name: firstName,
            score: firstData.score,
            sections: firstData.sections,
            pattern: firstData.pattern,
            occurrences: firstData.occurrences
          };
        }
        // Critério de desempate 2: Presença no refrão
        else if (firstData.sectionTypes.includes('refrão') || firstData.sectionTypes.includes('refrao') || firstData.sectionTypes.includes('chorus')) {
          console.log(`   → ${firstName} vence por presença no refrão`);
          predominant = {
            name: firstName,
            score: firstData.score,
            sections: firstData.sections,
            pattern: firstData.pattern,
            occurrences: firstData.occurrences
          };
        }
        else {
          console.log(`   → ${secondName} vence por critérios de desempate`);
          predominant = {
            name: secondName,
            score: secondData.score,
            sections: secondData.sections,
            pattern: secondData.pattern,
            occurrences: secondData.occurrences
          };
        }
      }
      else {
        predominant = {
          name: firstName,
          score: firstData.score,
          sections: firstData.sections,
          pattern: firstData.pattern,
          occurrences: firstData.occurrences
        };
        console.log(`\n✅ Vencedor claro: ${firstName} (diferença de ${(scoreDiff * 100).toFixed(1)}%)`);
      }
    }

    if (predominant) {
      console.log("\n╔═══════════════════════════════════════════════════════════╗");
      console.log("║  🏆 PROGRESSÃO PREDOMINANTE DETERMINADA                  ║");
      console.log("╚═══════════════════════════════════════════════════════════╝");
      console.log(`\n   Nome: ${predominant.name}`);
      console.log(`   Score: ${predominant.score.toFixed(1)} pontos`);
      console.log(`   Ocorrências: ${predominant.occurrences}x`);
      console.log(`   Presente em: ${predominant.sections.join(', ')}`);
      console.log(`   Pattern: ${predominant.pattern}`);
    }

    return predominant;
  };

  // Função auxiliar para gerar instruções de análise de cifra
  const getCifraAnalysisInstructions = (cifra) => {
    return `
⚠️ CIFRA FORNECIDA (USE COM MÁXIMA PRECISÃO):
${cifra}

IMPORTANTE: Analise a cifra fornecida para identificar:
- Título e artista (se não fornecidos)
- Tonalidade principal
- Acordes de cada seção
- Padrões de progressão harmônica
`;
  };

  const handleAnalyze = async () => {
    // Validação simplificada - título e artista não são mais obrigatórios
    
    if (inputType === "audio" && !file) {
      setError("Por favor, faça upload de um arquivo de áudio");
      return;
    }

    if (inputType === "cifra" && !cifraText.trim()) {
      setError("Por favor, insira a cifra da música");
      return;
    }

    if (inputType === "documento" && !docFile) {
      setError("Por favor, faça upload de um arquivo PDF, DOC, DOCX ou TXT");
      return;
    }

    if (progressionsLoading) {
      setError("Carregando banco de progressões... Tente novamente em alguns segundos.");
      return;
    }

    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║  🎵 ANÁLISE DE MÚSICA - INICIANDO                        ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");

    setIsAnalyzing(true);
    setError(null);
    setProgress(0);

    let audioUrl = null;
    let analysisPrompt = "";
    let extractedCifraForSong = "";
    let analysisResultData = null;
    let fileUrlsForLLM = [];

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 85));
      }, 200);

      const basePrompt = `Você é um especialista em teoria musical e harmonia. Analise a música fornecida com precisão.

${formData.title && formData.artist ? `MÚSICA: "${formData.title}" de ${formData.artist}` : 'Identifique o título e artista da música a partir do conteúdo.'}
${formData.genre_style ? `ESTILO: ${formData.genre_style}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PESQUISA HISTÓRICA (use internet)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Retorne: author (compositor original, não intérprete), year (ano de lançamento original),
original_key (tonalidade original gravada, ex: "G"), general_notes (história em português, 2-5 frases).
Se não encontrar, retorne null.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. TONALIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Determine a tonalidade real pela análise harmônica:
- Use notação inglesa com 'm' para menor: "Am"=Lá menor, "Em"=Mi menor, "Dm"=Ré menor, "C"=Dó maior, "G"=Sol maior
- TONALIDADE MAIOR: tônica é acorde maior — repousam em cadências V→I ou V7→I
- TONALIDADE MENOR: tônica é acorde menor — repousam em cadências V→i ou V7→i (onde V é o acorde maior construído sobre o 5° grau)
- Em Am: E e E7 são a dominante (V) — isso NÃO muda a tônica; a música ainda está em Am
- Confirme por múltiplas cadências antes de decidir

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. BPM E ESTILO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estime o BPM baseado no contexto da música. Referências:
- Sertanejo Raiz/Modão: 80-100 | Romântico: 90-110 | Universitário: 110-130 | Moderno: 120-140
Detecte o genre_style entre: sertanejo_raiz, sertanejo_universitario, sertanejo_romantico, sertanejo_moderno, sertanejo_modao, pop_rock, mpb, samba, forro, religioso

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. ANÁLISE POR SEÇÃO — TAREFA PRINCIPAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para cada seção (Intro, Verso, Pré-Refrão, Refrão, Ponte, Solo):

a) Liste os acordes exatos: ["C", "Am7", "F", "G7"]
   - Inclua todas as extensões (7, maj7, m7, 9, sus4, etc.)
   - Remova símbolos de repetição (%, /, etc.) — inclua apenas acordes reais

b) Converta para graus romanos em relação ao tom da seção:
   - TONALIDADE MAIOR: I=tônica maior, ii=supertônica menor, iii=mediante menor, IV=subdominante maior, V=dominante, vi=relativa menor, vii°=sensível
     Exemplo (tom C): ["C", "Am7", "F", "G7"] → "I-vi7-IV-V7"
   - TONALIDADE MENOR: i=tônica menor, ii°=supertônica dim., III=relativa maior, iv=subdominante menor, V=dominante maior (harmônica), VI=submediante maior, VII=subtônica maior
     Exemplo (tom Am): ["Am", "F", "C", "E7"] → "i-VI-III-V7"
     Exemplo (tom Am): ["Am", "Dm", "E", "Am"] → "i-iv-V-i"
   - Preserve extensões: V7, i7, iv7, IVM7, etc.

c) Indique o tom da seção (pode diferir do tom principal em modulações)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. REGRAS CRÍTICAS DE GRAUS ROMANOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CORRETO: I-IV-V-I | I-vi-IV-V | I-V-vi-IV | ii-V-I | I-IV-I-V
✅ Para extensões: V7 (dominante com sétima), IVM7 (subdominante maior com sétima maior)
❌ NÃO use nomes de progressões no campo pattern — use apenas graus romanos
❌ NÃO repita padrões idênticos — se verso 1 e verso 2 têm os mesmos acordes, retorne só um

EXECUTE A ANÁLISE AGORA.`;

      if (inputType === "audio") {
        setProgress(10);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        audioUrl = file_url;
        setUploadedAudioUrl(file_url);
        fileUrlsForLLM = [file_url];
        setProgress(40);
        
        // Se há cifra no campo opcional, usa ela como fonte principal
        if (cifraText && cifraText.trim()) {
          extractedCifraForSong = cifraText.trim();
          analysisPrompt = basePrompt + `\n\n${getCifraAnalysisInstructions(cifraText)}`;
        } else {
          analysisPrompt = basePrompt;
        }

      } else if (inputType === "documento") {
        setProgress(10);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: docFile });
        fileUrlsForLLM = [file_url];
        setProgress(30);

        const fileExtension = docFile.name.substring(docFile.name.lastIndexOf('.')).toLowerCase();
        let tempExtractedCifra = "";

        if (fileExtension === '.txt') {
          try {
            const response = await fetch(file_url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            tempExtractedCifra = await response.text();
          } catch (fetchError) {
            console.warn("Failed to fetch TXT file directly, falling back to LLM:", fetchError);
            const extractionResult = await base44.integrations.Core.InvokeLLM({
              prompt: `Extraia todo o texto deste arquivo. Retorne o texto completo preservando a formatação.`,
              file_urls: [file_url],
              response_json_schema: {
                type: "object",
                properties: { text: { type: "string" } }
              }
            });
            tempExtractedCifra = extractionResult.text || "";
          }
        } else {
          const extractionResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Extraia todo o texto deste documento. Retorne o texto completo preservando a formatação.`,
            file_urls: [file_url],
            response_json_schema: {
              type: "object",
              properties: { text: { type: "string" } }
            }
          });
          tempExtractedCifra = extractionResult.text || "";
        }
        extractedCifraForSong = tempExtractedCifra;
        setProgress(50);
        analysisPrompt = basePrompt + `\n\n${getCifraAnalysisInstructions(extractedCifraForSong)}`;

      } else { // inputType === "cifra"
        setProgress(20);
        extractedCifraForSong = cifraText.trim();
        analysisPrompt = basePrompt + `\n\n${getCifraAnalysisInstructions(cifraText)}`;
      }

      setProgress(60);

      analysisResultData = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        add_context_from_internet: true,
        file_urls: fileUrlsForLLM.length > 0 ? fileUrlsForLLM : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            artist: { type: "string" },
            author: { type: "string" },
            year: { type: "number" },
            original_key: { type: "string" },
            general_notes: { type: "string" },
            main_key: { type: "string" },
            tempo: { type: "number" },
            duration: { type: "string" },
            progressions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section: { type: "string" },
                  chords: { type: "array", items: { type: "string" } },
                  pattern: { type: "string" },
                  key: { type: "string" }
                },
                required: ["pattern"]
              }
            }
          }
        }
      });

      clearInterval(progressInterval);
      setProgress(90);

      console.log("\n📊 RESULTADO DA IA (SEÇÕES INDIVIDUAIS):", JSON.stringify(analysisResultData, null, 2));

      // FUNÇÃO: Determina tipo de seção
      const getSectionType = (section) => {
        if (!section) return 'outros';
        const s = section.toLowerCase().trim();
        if (s.includes('verso') || s.includes('verse')) return 'verso';
        if (s.includes('refrão') || s.includes('refrao') || s.includes('chorus')) return 'refrão';
        if (s.includes('pré-refrão') || s.includes('pre-refrão') || s.includes('pre-refrao')) return 'pré-refrão';
        if (s.includes('ponte') || s.includes('bridge')) return 'ponte';
        if (s.includes('intro')) return 'intro';
        if (s.includes('solo')) return 'solo';
        if (s.includes('outro') || s.includes('final')) return 'outro';
        return 'outros';
      };

      // FUNÇÃO: Remove acordes repetidos consecutivos de um array
      const removeConsecutiveDuplicateChords = (chords) => {
        if (!chords || !Array.isArray(chords) || chords.length === 0) return chords;
        
        const cleaned = [chords[0]];
        for (let i = 1; i < chords.length; i++) {
          if (chords[i] !== chords[i - 1]) {
            cleaned.push(chords[i]);
          }
        }
        console.log(`🎸 Acordes: [${chords.join(', ')}] → [${cleaned.join(', ')}]`);
        return cleaned;
      };

      // FUNÇÃO: Identifica a progressão cíclica real (padrão que se repete)
      const identifyCyclicPattern = (chords) => {
        if (!chords || !Array.isArray(chords) || chords.length === 0) return chords;
        
        // Remove repetições consecutivas primeiro
        const cleanedChords = removeConsecutiveDuplicateChords(chords);
        
        // Tenta identificar um padrão cíclico (ex: C-F-G-C-F-G → C-F-G)
        for (let patternLength = 2; patternLength <= Math.floor(cleanedChords.length / 2); patternLength++) {
          const pattern = cleanedChords.slice(0, patternLength);
          let isRepeating = true;
          
          for (let i = patternLength; i < cleanedChords.length; i++) {
            if (cleanedChords[i] !== pattern[i % patternLength]) {
              isRepeating = false;
              break;
            }
          }
          
          if (isRepeating && cleanedChords.length >= patternLength * 2) {
            console.log(`🔄 Padrão cíclico detectado: [${pattern.join(', ')}] (repetido ${Math.floor(cleanedChords.length / patternLength)}x)`);
            return pattern;
          }
        }
        
        return cleanedChords;
      };

      // FUNÇÃO: Remove símbolos de repetição (%) que não são acordes reais
      const filterRepetitionSymbols = (chords) => {
        if (!chords || !Array.isArray(chords)) return chords;
        return chords.filter(chord => chord && chord.trim() !== '%');
      };

      // Processa cada progressão: limpa acordes APENAS (sem identificar progressões aqui)
      const rawProgressions = (analysisResultData.progressions || []).map((prog, index) => {
      console.log(`\n━━━ ${prog.section} ━━━`);
      console.log("Acordes originais:", prog.chords);

      // Remove símbolos de repetição (%) primeiro
      const chordsWithoutRepetition = filterRepetitionSymbols(prog.chords);

      // Limpa acordes repetidos e identifica padrão cíclico
      const cleanedChords = identifyCyclicPattern(chordsWithoutRepetition);

      console.log("Acordes limpos:", cleanedChords);
      console.log("Pattern:", prog.pattern);

      // Não identifica a progressão aqui — isso é feito separadamente
      return {
        ...prog,
        chords: cleanedChords,
        progression_name: null  // Será identificado pelo "Identificar Progressões"
      };
      });

      // NOVA LÓGICA: Remove duplicatas baseado em acordes E pattern
      // Mantém apenas a primeira ocorrência de cada combinação única de acordes
      const seenChordsSignatures = new Map(); // Map: sectionType -> Set de assinaturas de acordes
      const progressionsWithNames = rawProgressions.filter((prog, index) => {
        const sectionType = getSectionType(prog.section || "outros");
        
        // Cria uma "assinatura" baseada nos acordes (ignora repetições de ordem)
        const chordsArray = Array.isArray(prog.chords) ? prog.chords : [];
        const chordsSignature = chordsArray.join('-').toUpperCase();
        const pattern = normalizePattern(prog.pattern);
        
        // Combina acordes + pattern para criar assinatura única
        const fullSignature = `${chordsSignature}|${pattern}`;
        
        if (!seenChordsSignatures.has(sectionType)) {
          seenChordsSignatures.set(sectionType, new Set());
        }
        
        const signaturesForSection = seenChordsSignatures.get(sectionType);
        
        // Se já vimos esta combinação de acordes/pattern neste tipo de seção, pula
        if (signaturesForSection.has(fullSignature)) {
          console.log(`🔄 REPETIÇÃO DETECTADA: ${prog.section}`);
          console.log(`   Acordes: ${chordsSignature}`);
          console.log(`   Pattern: ${pattern}`);
          console.log(`   → Ignorando (já existe em ${sectionType})`);
          return false;
        }
        
        // Verifica também se os acordes são idênticos mesmo com pattern diferente
        for (const existingSig of signaturesForSection) {
          const [existingChords] = existingSig.split('|');
          if (existingChords === chordsSignature) {
            console.log(`🔄 ACORDES IDÊNTICOS: ${prog.section} tem mesmos acordes`);
            console.log(`   Acordes: ${chordsSignature}`);
            console.log(`   → Ignorando (acordes já existem em ${sectionType})`);
            return false;
          }
        }
        
        // Marca como visto e mantém
        signaturesForSection.add(fullSignature);
        console.log(`✅ MANTIDO: ${prog.section}`);
        console.log(`   Acordes: ${chordsSignature}`);
        console.log(`   Pattern: ${pattern}`);
        return true;
      });

      console.log(`\n📊 Total original: ${rawProgressions.length} → Após consolidação: ${progressionsWithNames.length}`);

      clearInterval(progressInterval);
      setProgress(95);

      // SALVAMENTO AUTOMÁTICO
      console.log("\n💾 SALVANDO ESTRUTURA...");
      
      const selectedRhythm = (formData.rhythm_id && formData.rhythm_id !== "none") 
        ? rhythms.find((r) => r.id === formData.rhythm_id) 
        : null;

      // Garante que a cifra seja salva (do campo opcional ou extraída do documento)
      const finalCifraText = extractedCifraForSong || cifraText.trim() || null;
      
      const songData = {
        title: formData.title || analysisResultData.title || "Música sem título",
        artist: formData.artist || analysisResultData.artist || "Artista desconhecido",
        author: analysisResultData.author || null,
        year: analysisResultData.year || null,
        original_key: analysisResultData.original_key || null,
        general_notes: analysisResultData.general_notes || null,
        genre_style: formData.genre_style,
        rhythm_id: selectedRhythm?.id || null,
        rhythm_name: selectedRhythm?.name || null,
        audio_url: inputType === "audio" ? uploadedAudioUrl : null,
        cifra_text: finalCifraText,
        input_type: inputType,
        main_key: analysisResultData.main_key || "C",
        tempo: analysisResultData.tempo || null,
        duration: analysisResultData.duration || null,
        progressions: progressionsWithNames,
        predominant_progression: null,
        predominant_progression_pattern: null
      };

      const createdSong = await base44.entities.Song.create(songData);
      
      console.log("✅ ESTRUTURA SALVA! ID:", createdSong.id);

      // ── Auditoria automática: análise comparativa de seções + campo harmônico ──
      let alertResult = null;
      try {
        alertResult = validarCifra(createdSong);
        setValidationAlert(alertResult);
        console.log("🔍 Auditoria de cifra:", alertResult.severity, alertResult.issues);
        await base44.entities.Song.update(createdSong.id, {
          validation_severity: alertResult.severity,
          validation_issues: alertResult.issues || [],
          validation_date: new Date().toISOString(),
          validation_main_key: alertResult.mainKey || null,
          validation_foreign_ratio: alertResult.foreignRatio ?? null
        });
      } catch (e) {
        console.warn("Auditoria de cifra falhou:", e);
      }
      
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setProgress(100);
      setSuccess(true);

      if (!alertResult || !alertResult.hasAlert) {
        setTimeout(() => {
          navigate(createPageUrl("Library"));
        }, 2000);
      }

    } catch (err) {
      setError("Erro ao analisar/salvar a música. Verifique o console (F12) para detalhes.");
      console.error("\n❌ ERRO:", err);
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║  🔘 SALVAMENTO INICIADO               ║");
    console.log("╚════════════════════════════════════════╝");
    
    if (!analysisResult) {
      console.error("❌ analysisResult é null/undefined");
      alert("❌ Nenhum resultado de análise disponível");
      return;
    }

    if (isAnalyzing) {
      console.warn("⚠️ Já está salvando, operação ignorada");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log("\n1️⃣ Processando progressões...");
      const progressions = (analysisResult.progressions || []).map((prog) => {
        const sectionType = getSectionType(prog.section);
        const progKey = manualKey || prog.key || analysisResult.main_key || "C";
        const cleanedChords = Array.isArray(prog.chords) ? prog.chords.filter(c => c && c.trim() !== '%') : [];
        // Fonte única do padrão: recalcula a partir dos acordes + tom (determinístico).
        // Só usa o pattern do LLM se o cálculo falhar (tom não mapeado).
        const recalcPattern = calculatePatternFromChords(cleanedChords, progKey);
        const finalPattern = recalcPattern || prog.pattern || "";
        return {
          section: prog.section || "Sem nome",
          chords: cleanedChords,
          pattern: finalPattern,
          key: progKey,
          notes: getAnalysisNotes(cleanedChords, progKey),
          progression_name: findProgressionMatch(
            finalPattern,
            knownProgressions,
            learningPatterns,
            progKey,
            sectionType
          )
        };
      });
      console.log(`   ✓ ${progressions.length} progressões processadas`);

      console.log("\n2️⃣ Determinando progressão predominante...");
      const predominant = determinePredominantProgression(progressions);
      console.log(`   ✓ Predominante: ${predominant?.name || "Nenhuma"}`);

      console.log("\n3️⃣ Preparando dados para salvar...");
      const selectedRhythm = formData.rhythm_id && formData.rhythm_id !== "none" 
        ? rhythms.find((r) => r.id === formData.rhythm_id)
        : null;

      const songData = {
        title: formData.title || analysisResult.title || "Sem título",
        artist: formData.artist || analysisResult.artist || "Sem artista",
        genre_style: formData.genre_style,
        rhythm_id: selectedRhythm?.id || null,
        rhythm_name: selectedRhythm?.name || null,
        audio_url: inputType === "audio" ? uploadedAudioUrl : null,
        cifra_text: cifraText.trim() || null,
        input_type: inputType,
        main_key: manualKey || analysisResult.main_key || "C",
        tempo: analysisResult.tempo || null,
        duration: analysisResult.duration || null,
        progressions: progressions,
        predominant_progression: predominant?.name || null,
        predominant_progression_pattern: predominant?.pattern || null
      };
      
      console.log("   ✓ Dados preparados:");
      console.log("     - Título:", songData.title);
      console.log("     - Artista:", songData.artist);
      console.log("     - Tom:", songData.main_key);
      console.log("     - Progressões:", songData.progressions.length);

      console.log("\n4️⃣ Chamando API para criar música...");
      const result = await base44.entities.Song.create(songData);
      
      console.log("\n✅ MÚSICA SALVA COM SUCESSO!");
      console.log("   ID:", result.id);

      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setSuccess(true);
      setShowPostAnalysis(false);

      setTimeout(() => {
        navigate(createPageUrl("Library"));
      }, 1500);

    } catch (err) {
      console.error("\n╔════════════════════════════════════════╗");
      console.error("║  ❌ ERRO AO SALVAR                    ║");
      console.error("╚════════════════════════════════════════╝");
      console.error("Erro completo:", err);
      console.error("Mensagem:", err?.message);
      console.error("Stack:", err?.stack);
      
      const errorMsg = err?.message || String(err);
      setError(errorMsg);
      alert(`❌ ERRO AO SALVAR MÚSICA:\n\n${errorMsg}\n\nAbra o Console (F12) para detalhes completos.`);
    } finally {
      setIsAnalyzing(false);
      console.log("\n🔚 Processo de salvamento finalizado\n");
    }
  };

  // Calcula acorde mais comum
  const getMostCommonChord = (progressions) => {
    if (!progressions || progressions.length === 0) return null;
    
    const chordCounts = {};
    progressions.forEach(prog => {
      if (prog.chords && Array.isArray(prog.chords)) {
        prog.chords.forEach(chord => {
          chordCounts[chord] = (chordCounts[chord] || 0) + 1;
        });
      }
    });

    const entries = Object.entries(chordCounts);
    if (entries.length === 0) return null;
    
    entries.sort((a, b) => b[1] - a[1]);
    return { chord: entries[0][0], count: entries[0][1] };
  };

  // Filtra progressões por função harmônica
  const filterByHarmonicFunction = (progressions, filter) => {
    if (filter === "all") return progressions;

    const getHarmonicFunction = (pattern) => {
      if (!pattern) return "other";
      const p = pattern.toUpperCase();
      
      if (/^I[^IVX]|^I$|^I-/.test(p)) return "tonic";
      if (/IV|II/.test(p)) return "subdominant";
      if (/V|VII/.test(p)) return "dominant";
      return "other";
    };

    return progressions.filter(prog => {
      const func = getHarmonicFunction(prog.pattern);
      return func === filter;
    });
  };

  const getSectionType = (section) => {
    if (!section) return 'outros';
    const s = section.toLowerCase().trim();
    if (s.includes('verso') || s.includes('verse')) return 'verso';
    if (s.includes('refrão') || s.includes('refrao') || s.includes('chorus')) return 'refrão';
    if (s.includes('pré-refrão') || s.includes('pre-refrão') || s.includes('pre-refrao')) return 'pré-refrão';
    if (s.includes('ponte') || s.includes('bridge')) return 'ponte';
    if (s.includes('intro')) return 'intro';
    if (s.includes('solo')) return 'solo';
    if (s.includes('outro') || s.includes('final')) return 'outro';
    return 'outros';
  };

  const isFormValid = () => {
    if (inputType === "cifra" && !cifraText.trim()) return false;
    if (inputType === "documento" && !docFile) return false;
    return true;
  };



  // Tela de carregamento
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B6F47]" />
      </div>
    );
  }

  // Tela de sem permissão para não-admins
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-red-200 shadow-xl">
          <CardContent className="p-10 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldOff className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-3">Acesso Restrito</h2>
            <p className="text-gray-600 mb-2">A inserção de novas músicas é restrita a administradores do sistema.</p>
            <p className="text-sm text-gray-400 mb-6">Para solicitar acesso, entre em contato com o administrador.</p>
            <div className="flex flex-col gap-3 mb-6">
              <a
                href="https://wa.me/5517996112328?text=Olá!%20Gostaria%20de%20solicitar%20acesso%20ao%20sistema%20Tropeiros%20do%20Bebedouro."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(90deg, #25D366, #128C7E)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp do Administrador
              </a>
              <a
                href="mailto:tropeirosdobebedouro@gmail.com?subject=Solicitação%20de%20Acesso%20ao%20Sistema&body=Olá!%20Gostaria%20de%20solicitar%20acesso%20para%20inserção%20de%20músicas%20no%20sistema."
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#A68A64] transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                Enviar Email ao Administrador
              </a>
            </div>
            <Button
              onClick={() => navigate(createPageUrl("Library"))}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Biblioteca
            </Button>          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Library"))}
            className="mb-4 text-[#8B6F47] hover:text-[#A68A64] hover:bg-[#8B6F47]/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Biblioteca
          </Button>
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
            Analisar Estrutura
          </h1>
          <p className="text-[#A68A64] mb-4">Identifica seções e acordes de cada parte da música. Use "Identificar Progressões" depois para nomear as progressões.</p>

          {/* Botão de Reanálise em Lote */}
          <div className="mb-4">
            <Button
              onClick={() => navigate("/ReanaliseEmLote")}
              className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white gap-2 font-semibold">
              <RotateCcw className="w-4 h-4" />
              Reanálise em Lote
            </Button>
          </div>

          {/* Botões de ferramentas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <Button onClick={() => setShowAdvancedSimilarity(true)} variant="outline"
              className="border-purple-400 text-purple-600 hover:bg-purple-500 hover:text-white h-10 text-xs md:text-sm font-semibold rounded-xl gap-1">
              <Sparkles className="w-4 h-4 flex-shrink-0" /><span>Similaridade</span>
            </Button>
            <Button onClick={() => setShowAITraining(true)} variant="outline"
              className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white h-10 text-xs md:text-sm font-semibold rounded-xl gap-1">
              <Brain className="w-4 h-4 flex-shrink-0" /><span>IA</span>
            </Button>
            <Button onClick={() => setShowRecommendations(true)} variant="outline"
              className="border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white h-10 text-xs md:text-sm font-semibold rounded-xl gap-1">
              <Lightbulb className="w-4 h-4 flex-shrink-0" /><span>Dicas</span>
            </Button>
            <Button onClick={() => setShowSongSuggestions(true)} variant="outline"
              className="border-blue-400 text-blue-600 hover:bg-blue-500 hover:text-white h-10 text-xs md:text-sm font-semibold rounded-xl gap-1">
              <Sparkles className="w-4 h-4 flex-shrink-0" /><span>Sugestões</span>
            </Button>
            <Button onClick={() => setShowUnusualDetector(true)} variant="outline"
              className="border-orange-400 text-orange-600 hover:bg-orange-500 hover:text-white h-10 text-xs md:text-sm font-semibold rounded-xl gap-1">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>Incomuns</span>
            </Button>
            <Button onClick={() => setShowPassageMarker(true)} variant="outline"
              className="border-teal-500 text-teal-600 hover:bg-teal-500 hover:text-white h-10 text-xs md:text-sm font-semibold rounded-xl gap-1">
              <Tag className="w-4 h-4 flex-shrink-0" /><span>Passagens</span>
            </Button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}>

              <Card className="border-[#9CAF88] bg-white/80 backdrop-blur-sm shadow-2xl">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#9CAF88] to-[#8B6F47] rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#8B6F47] mb-2">Estrutura Salva!</h2>
                  <p className="text-[#A68A64]">Seções e acordes salvos. Use "Reanálise em Lote → Identificar Progressões" para nomear as progressões.</p>

                  {validationAlert && validationAlert.hasAlert && (
                    <div className="mt-6 text-left rounded-xl border-2 border-red-200 bg-red-50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-base font-bold text-red-700 uppercase tracking-wide">Auditoria de Cifra</p>
                        <CifraAlertBadge severity={validationAlert.severity} issues={validationAlert.issues} />
                      </div>
                      <p className="text-sm text-red-700 mb-3">
                        O sistema identificou que a cifra desta música pode estar com erro. Revise antes de finalizar.
                      </p>
                      <ul className="space-y-2">
                        {validationAlert.issues.map((iss, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                            <span>{iss.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validationAlert && !validationAlert.hasAlert && (
                    <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-700 font-medium">Cifra conferida: seções consistentes e acordes dentro do campo harmônico.</p>
                    </div>
                  )}

                  {validationAlert && validationAlert.hasAlert && (
                    <Button
                      onClick={() => navigate(createPageUrl("Library"))}
                      className="mt-6 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white font-semibold">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Ir para a Biblioteca
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}>

              <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-[#D4C5B0]">
                  <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                    <Music className="w-6 h-6" />
                    Escolha o tipo de análise
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Botões de navegação rápida */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => navigate(createPageUrl("Library"))}
                      className="h-10 w-full text-xs md:text-sm font-semibold rounded-xl flex items-center justify-center gap-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white shadow-md transition-all hover:from-[#A68A64] hover:to-[#8B6F47]">
                      <Music className="w-4 h-4 flex-shrink-0" />
                      <span>Biblioteca</span>
                    </button>
                    <button
                      onClick={() => navigate(createPageUrl("Library") + "?tab=cadernos")}
                      className="h-10 w-full text-xs md:text-sm font-semibold rounded-xl flex items-center justify-center gap-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white shadow-md transition-all hover:from-[#A68A64] hover:to-[#8B6F47]">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span>Cadernos</span>
                    </button>
                    <button
                      onClick={() => setShowBuscarCifra(true)}
                      className="h-10 w-full text-xs md:text-sm font-semibold rounded-xl flex items-center justify-center gap-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md transition-all">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span>Buscar na Internet</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[#E8DCC4] rounded-xl">
                      <Button
                        onClick={() => setInputType("documento")}
                        className={`${inputType === "documento" ?
                          "bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white shadow-md" :
                          "bg-transparent text-[#8B6F47] hover:bg-[#8B6F47]/10"}`
                        }>
                        <FileText className="w-4 h-4 mr-2" />
                        PDF/DOC/TXT
                      </Button>
                      <Button
                        onClick={() => navigate(createPageUrl("PrepareCifra"))}
                        className="bg-transparent text-[#8B6F47] hover:bg-[#8B6F47]/10">
                        <Edit3 className="w-4 h-4 mr-2" />
                        📝 Preparar com Template
                      </Button>
                    </div>

                    {inputType === "documento" ? (
                      <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${docFile ?
                          'border-[#9CAF88] bg-[#9CAF88]/5' :
                          'border-[#D4C5B0] hover:border-[#8B6F47] hover:bg-[#8B6F47]/5'}`
                        }
                        onClick={() => docInputRef.current?.click()}>

                        <input
                          ref={docInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleDocFileSelect}
                          className="hidden" />

                        {docFile ? (
                          <div className="flex items-center justify-center gap-3">
                            <FileText className="w-8 h-8 text-[#9CAF88]" />
                            <div className="text-left">
                              <p className="font-medium text-[#8B6F47]">{docFile.name}</p>
                              <p className="text-sm text-[#A68A64]">
                                {(docFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <FileText className="w-12 h-12 text-[#A68A64] mx-auto mb-3" />
                            <p className="text-[#8B6F47] font-medium mb-1">
                              Clique para fazer upload
                            </p>
                            <p className="text-sm text-[#A68A64]">
                              Arquivos PDF, DOC, DOCX ou TXT com cifra da música
                            </p>
                          </>
                        )}
                      </div>
                    ) : inputType === "cifra" ? (
                      <div className="space-y-3">
                        <Alert className="border-[#9CAF88] bg-[#9CAF88]/10">
                          <CheckCircle className="h-5 w-5 text-[#9CAF88]" />
                          <AlertDescription className="text-[#8B6F47]">
                            <strong>✅ Cifra Carregada!</strong> Cifra preparada com sucesso.
                            {formData.title && formData.artist && (
                              <> <strong>{formData.title}</strong> - {formData.artist}</>
                            )}
                          </AlertDescription>
                        </Alert>
                        
                        <div className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-lg font-mono text-sm max-h-64 overflow-auto">
                          <pre className="whitespace-pre-wrap">{cifraText}</pre>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-[#8B6F47] font-medium">
                        Título da Música
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Evidências"
                        className="border-[#D4C5B0] focus:border-[#8B6F47] focus:ring-[#8B6F47]"
                        disabled={isAnalyzing} />

                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="artist" className="text-[#8B6F47] font-medium">
                        Artista/Dupla
                      </Label>
                      <Input
                        id="artist"
                        value={formData.artist}
                        onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                        placeholder="Ex: Chitãozinho & Xororó"
                        className="border-[#D4C5B0] focus:border-[#8B6F47] focus:ring-[#8B6F47]"
                        disabled={isAnalyzing} />

                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="genre" className="text-[#8B6F47] font-medium">
                        Estilo
                      </Label>
                      <Select
                        value={formData.genre_style}
                        onValueChange={(value) => setFormData({ ...formData, genre_style: value })}
                        disabled={isAnalyzing}>

                        <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                         <SelectItem value="sertanejo_raiz">🌾 Sertanejo Raiz</SelectItem>
                         <SelectItem value="sertanejo_universitario">🎓 Sertanejo Universitário</SelectItem>
                         <SelectItem value="sertanejo_romantico">💕 Sertanejo Romântico</SelectItem>
                         <SelectItem value="sertanejo_moderno">🎸 Sertanejo Moderno</SelectItem>
                         <SelectItem value="sertanejo_modao">🪗 Sertanejo Modão</SelectItem>
                         <SelectItem value="pop_rock">🎵 Pop/Rock</SelectItem>
                         <SelectItem value="mpb">🎶 MPB</SelectItem>
                         <SelectItem value="samba">🥁 Samba</SelectItem>
                         <SelectItem value="forro">🪗 Forró</SelectItem>
                         <SelectItem value="religioso">🙏 Religioso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rhythm" className="text-[#8B6F47] font-medium">
                        Ritmo (opcional)
                      </Label>
                      <Select
                        value={formData.rhythm_id || "none"}
                        onValueChange={(value) => setFormData({ ...formData, rhythm_id: value === "none" ? null : value })}
                        disabled={isAnalyzing}>

                        <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                          <SelectValue placeholder="Selecione um ritmo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum ritmo</SelectItem>
                          {rhythms.map((rhythm) => {
                            const selectedRhythm = rhythms.find(r => r.id === rhythm.id);
                            return (
                              <SelectItem key={rhythm.id} value={rhythm.id}>
                                <div className="flex items-center gap-3">
                                  <span>{rhythm.name}</span>
                                  {rhythm.time_signature && (
                                    <span className="text-xs text-[#A68A64]">({rhythm.time_signature})</span>
                                  )}
                                  {selectedRhythm && (
                                    <RhythmDiagramMini rhythm={selectedRhythm} size="xs" />
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {formData.rhythm_id && formData.rhythm_id !== "none" && (() => {
                        const selectedRhythm = rhythms.find(r => r.id === formData.rhythm_id);
                        return selectedRhythm ? (
                          <div className="bg-[#F5F1E8] rounded-lg p-3 border border-[#D4C5B0] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Music className="w-4 h-4 text-[#8B6F47]" />
                              <span className="text-sm font-medium text-[#8B6F47]">{selectedRhythm.name}</span>
                              {selectedRhythm.time_signature && (
                                <Badge variant="outline" className="text-xs">{selectedRhythm.time_signature}</Badge>
                              )}
                            </div>
                            <RhythmDiagramMini rhythm={selectedRhythm} size="sm" />
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {isAnalyzing && (
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#8B6F47] font-medium">Analisando estrutura...</span>
                        <span className="text-[#A68A64]">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-sm text-[#A68A64] text-center">
                        🎵 Identificando seções e acordes de cada parte da música...
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button
                      onClick={handleAnalyze}
                      disabled={!isFormValid() || isAnalyzing}
                      className="w-full bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg h-12 text-base font-semibold">
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analisando estrutura...
                        </>
                      ) : (
                        <>
                          <Music className="w-5 h-5 mr-2" />
                          Analisar Estrutura
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-[#A68A64]">
                      Após salvar, use <strong>Reanálise em Lote → Identificar Progressões</strong> para nomear as progressões de cada seção
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {showAdvancedSimilarity && (
          <AdvancedSimilarity onClose={() => setShowAdvancedSimilarity(false)} onSelectSongs={() => {}} />
        )}
        {showAITraining && (
          <AITraining onClose={() => setShowAITraining(false)} />
        )}
        {showPassageMarker && (
          <ManualPassageMarker onClose={() => setShowPassageMarker(false)} />
        )}
        {showRecommendations && (
          <PersonalizedRecommendations songs={songs} progressions={knownProgressions} onSelectSong={() => {}} onClose={() => setShowRecommendations(false)} />
        )}
        {showSongSuggestions && (
          <SongSuggestions songs={songs} progressions={knownProgressions} onSelectSong={() => {}} onClose={() => setShowSongSuggestions(false)} />
        )}
        {showUnusualDetector && (
          <UnusualProgressionDetector songs={songs} progressions={knownProgressions} onClose={() => setShowUnusualDetector(false)} />
        )}
        {showBuscarCifra && (
          <BuscarCifraModal
            onClose={() => setShowBuscarCifra(false)}
            onSave={() => { setShowBuscarCifra(false); navigate(createPageUrl("Library")); }}
          />
        )}
      </div>
    </div>
  );
}