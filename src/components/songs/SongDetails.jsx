import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music2, Key, Clock, Activity, X, ExternalLink, FileText, Printer, Trash2, Edit, Save, Plus, Music4, FileX, Guitar, Upload, Loader2, RotateCcw, Share2, Copy, Mail, Sparkles, Zap, TrendingUp, Play, Pause, Volume2, RefreshCw, MessageSquare, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProgressionView from "./ProgressionView";
import { calculatePatternFromChords, getAnalysisNotes, findProgressionMatch as findProgressionMatchUtil } from "../../utils/progressionUtils";
import { mergeIdenticalSections } from "../../utils/batchReanalysis";
import SongEditForm from "./SongEditForm";
import ManualNotes from "../analysis/ManualNotes";
import TheoryAnalysisExport from "../analysis/TheoryAnalysisExport";
import AdvancedHarmonicAnalysis from "../analysis/AdvancedHarmonicAnalysis";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import ClickableChordsCifra from "./ClickableChordsCifra";
import CifraWithComments from "./CifraWithComments";
import ProgressionEditCard from "./ProgressionEditCard";
import SoloUploadCard from "./SoloUploadCard";
import CifraTab from "./CifraTab";
import AIFeedbackPanel from "./AIFeedbackPanel";
import CifraAlertBadge from "./CifraAlertBadge";
import AuditPanel from "./AuditPanel";
import TocarJuntoPlayer from "@/components/TocarJuntoPlayer";
import GpImporter from "@/components/GpImporter";
import { parseSoloTab } from "@/lib/soloTabUtils";

import {
  transposeKey,
  transposeChord,
  transposeChords,
  transposeChordToKey,
  transposeCifraText,
  semitonesBetween,
  preferFlatsForKey,
  parseKey,
} from "@/utils/transposition";

export default function SongDetails({ song: initialSong, onClose, initialTab = "cifra" }) {
  const [song, setSong] = React.useState(initialSong);

  // Sincroniza se o prop externo mudar (ex: outro componente atualiza)
  React.useEffect(() => {
    setSong(initialSong);
  }, [initialSong.id]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(() => {
    const hasTab = !!parseSoloTab(initialSong.solo_tab);
    if (initialTab === 'tocarjunto' && !hasTab) return 'cifra';
    return initialTab || 'cifra';
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingProgressions, setIsEditingProgressions] = useState(false);
  const [progressions, setProgressions] = useState([]);
  const [semitones, setSemitones] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [uploadingSolo, setUploadingSolo] = useState(false);
  const [soloError, setSoloError] = useState(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalysisSuccess, setReanalysisSuccess] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifySuccess, setIdentifySuccess] = useState(false);
  const [showGpImporter, setShowGpImporter] = useState(false);
  const soloFileInputRef = useRef(null);
  const audioFileInputRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const { data: knownProgressions = [] } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    staleTime: 0,
  });

  const updateSongMutation = useMutation({
    mutationFn: (data) => base44.entities.Song.update(song.id, data),
    onSuccess: async (_, variables) => {
      // Revalida a auditoria com o conteúdo recém-salvo (ex: marcador de
      // seção corrigido na cifra) e grava o novo resultado nos alertas.
      let revalidated = null;
      try {
        const { revalidateAndPersist } = await import("@/utils/revalidateAudit");
        revalidated = await revalidateAndPersist(song.id);
      } catch (e) {
        console.warn('Erro ao revalidar auditoria:', e);
      }
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      // Atualiza o estado local do song imediatamente com os campos salvos
      setSong(prev => ({ ...prev, ...variables, ...(revalidated || {}) }));
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: () => base44.entities.Song.delete(song.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      onClose();
    },
  });

  const removeAudioMutation = useMutation({
    mutationFn: () => base44.entities.Song.update(song.id, { audio_url: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    },
  });

  const progressionsInitialized = useRef(false);

  useEffect(() => {
    // Só inicializa UMA vez quando o modal abre (ou se song.id mudar)
    if (!progressionsInitialized.current || song.id !== progressionsInitialized.current) {
      progressionsInitialized.current = song.id;
      setProgressions(
        (song.progressions || []).map((p, i) => ({ ...p, _tempId: `prog_${i}_${Date.now()}` }))
      );
    }
  }, [song.id]);

  // Calcula a progressão predominante SEMPRE em tempo real a partir das progressões locais
  // Isso garante que o modal e o card mostrem o valor correto, independente do que está salvo no banco
  const computedPredominant = useMemo(() => {
    const progs = progressions.filter(p => p.progression_name);
    if (progs.length === 0) return { name: song.predominant_progression, pattern: song.predominant_progression_pattern };

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
      if (!scores[prog.progression_name]) {
        scores[prog.progression_name] = { score: 0, pattern: prog.pattern || '' };
      }
      scores[prog.progression_name].score += weight;
    });
    let best = null, maxScore = 0;
    for (const [name, data] of Object.entries(scores)) {
      if (data.score > maxScore) { maxScore = data.score; best = { name, pattern: data.pattern }; }
    }
    return best || { name: song.predominant_progression, pattern: song.predominant_progression_pattern };
  }, [progressions, song.predominant_progression, song.predominant_progression_pattern]);

  const useFlats = song.main_key ? preferFlatsForKey(song.main_key) : false;

  const transposedData = useMemo(() => {
    if (semitones === 0) return song;
    return {
      ...song,
      main_key: transposeKey(song.main_key, semitones, useFlats),
      progressions: (song.progressions || []).map((prog) => ({
        ...prog,
        key: transposeKey(prog.key, semitones, useFlats),
        modulated_key: prog.modulated_key ? transposeKey(prog.modulated_key, semitones, useFlats) : prog.modulated_key,
        chords: Array.isArray(prog.chords)
          ? transposeChords(prog.chords, semitones, useFlats)
          : prog.chords,
      })),
      cifra_text: song.cifra_text ? transposeCifraText(song.cifra_text, semitones, useFlats) : song.cifra_text,
    };
  }, [song, semitones, useFlats]);

  const handleUpdateProgression = (index, field, value) => {
    setProgressions((prev) => {
      const updated = prev.map((p, i) => (i === index ? { ...p, [field]: value } : p));
      return updated;
    });
  };

  const handleUpdateChords = (index, value) => {
    setProgressions((prev) => {
      const updated = prev.map((p, i) =>
        i === index
          ? { ...p, chords: value.split(',').map((c) => c.trim()).filter(Boolean) }
          : p
      );
      return updated;
    });
  };

  const handleDeleteProgression = (index) => {
    setProgressions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddProgression = () => {
    setProgressions((prev) => [
      ...prev,
      {
        _tempId: `prog_new_${Date.now()}`,
        section: '',
        chords: [],
        pattern: '',
        key: song.main_key || '',
        progression_name: null,
        variation_name: null,
        notes: '',
      },
    ]);
  };

  // Edição rápida de acordes/padrão de uma progressão (via modal inline no ProgressionView)
  const handleQuickEditProgression = async (index, { chords, pattern }) => {
    const updatedProgressions = progressions.map((p, i) => {
      if (i !== index) return p;
      return { ...p, chords, pattern };
    });

    // Calcula dados da progressão editada para registrar no LearningPattern
    const edited = updatedProgressions[index];

    // Salva no banco
    const cleaned = updatedProgressions.map(({ _tempId, ...rest }) => rest);
    await updateSongMutation.mutateAsync({ progressions: cleaned });
    setProgressions(updatedProgressions);
    setSong(prev => ({ ...prev, progressions: cleaned }));

    // Registra no LearningPattern como aprendizado
    if (edited.progression_name && chords.length > 0) {
      try {
        const existingPatterns = await base44.entities.LearningPattern.filter({
          pattern: pattern || edited.pattern,
          progression_name: edited.progression_name,
        });

        if (existingPatterns.length > 0) {
          const ep = existingPatterns[0];
          await base44.entities.LearningPattern.update(ep.id, {
            times_seen: (ep.times_seen || 1) + 1,
            times_corrected: (ep.times_corrected || 0) + 1,
            confidence: Math.max(0, (ep.confidence || 100) - 5),
            chords: chords,
            last_used: new Date().toISOString().split('T')[0],
            source_songs: [...new Set([...(ep.source_songs || []), song.id])],
          });
        } else {
          await base44.entities.LearningPattern.create({
            chords,
            key: edited.key || song.main_key || '',
            pattern: pattern || edited.pattern || '',
            progression_name: edited.progression_name,
            variation_name: edited.variation_name || null,
            section_type: edited.section || '',
            times_seen: 1,
            times_corrected: 1,
            confidence: 90,
            source_songs: [song.id],
            last_used: new Date().toISOString().split('T')[0],
            observations: `Correção manual em "${song.title}" (${song.artist})`,
          });
        }
      } catch (e) {
        // silencia erro de aprendizado — não bloqueia a edição
        console.warn('Erro ao registrar aprendizado:', e);
      }
    }
  };

  const handleSaveProgressions = async () => {
    setIsSaving(true);
    try {
      const cleaned = progressions.map(({ _tempId, ...rest }) => rest);

      // Recalcula predominante
      const sectionWeightsForSave = {
        'refrão': 3, 'refrao': 3, 'chorus': 3,
        'verso': 2, 'verse': 2,
        'pré-refrão': 1.5, 'pre-refrão': 1.5, 'ponte': 1.5, 'bridge': 1.5,
        'intro': 1, 'outro': 1, 'solo': 1
      };
      const scoresForSave = {};
      cleaned.forEach((prog) => {
        if (!prog.progression_name) return;
        const section = (prog.section || '').toLowerCase();
        let weight = 1;
        for (const [key, value] of Object.entries(sectionWeightsForSave)) {
          if (section.includes(key)) { weight = value; break; }
        }
        if (!scoresForSave[prog.progression_name]) {
          scoresForSave[prog.progression_name] = { score: 0, pattern: prog.pattern || '' };
        }
        scoresForSave[prog.progression_name].score += weight;
      });
      let predominantForSave = null, maxScoreForSave = 0;
      for (const [name, data] of Object.entries(scoresForSave)) {
        if (data.score > maxScoreForSave) { maxScoreForSave = data.score; predominantForSave = { name, pattern: data.pattern }; }
      }

      const updatePayload = {
        progressions: cleaned,
        predominant_progression: predominantForSave?.name || null,
        predominant_progression_pattern: predominantForSave?.pattern || null,
      };

      await updateSongMutation.mutateAsync(updatePayload);
      setSong(prev => ({
        ...prev,
        progressions: cleaned,
        predominant_progression: predominantForSave?.name || null,
        predominant_progression_pattern: predominantForSave?.pattern || null,
      }));

      // ──────────────────────────────────────────────────
      // CICLO DE FEEDBACK: detecta correções e atualiza LearningPattern
      // Compara a versão original (song.progressions) com a editada (cleaned)
      // ──────────────────────────────────────────────────
      const originalProgressions = song.progressions || [];
      const feedbackPromises = cleaned.map(async (newProg, idx) => {
        if (!newProg.progression_name || !newProg.pattern) return;

        const origProg = originalProgressions[idx];
        const wasCorrection = origProg && (
          origProg.progression_name !== newProg.progression_name ||
          origProg.variation_name !== newProg.variation_name
        );
        // Também inclui progressões novas que ainda não tinham nome
        const isNewlyNamed = !origProg || (!origProg.progression_name && newProg.progression_name);

        if (!wasCorrection && !isNewlyNamed) return; // sem mudança relevante

        const chords = Array.isArray(newProg.chords) ? newProg.chords : [];
        const key = newProg.key || song.main_key || '';
        const sectionType = newProg.section || '';
        const correctionNote = newProg.notes
          ? `${newProg.notes} | Corrigido manualmente em "${song.title}" (${song.artist})`
          : `Corrigido manualmente em "${song.title}" (${song.artist})`;

        console.log(`🎓 Feedback: "${newProg.pattern}" → "${newProg.progression_name}"${wasCorrection ? ' [CORREÇÃO]' : ' [NOVO]'}`);

        try {
          // Busca LearningPattern existente com mesmo padrão+nome
          const existing = await base44.entities.LearningPattern.filter({
            pattern: newProg.pattern,
            progression_name: newProg.progression_name,
          });

          if (existing.length > 0) {
            const ep = existing[0];
            const newConfidence = wasCorrection
              ? Math.min(100, (ep.confidence || 70) + 15)  // correção aumenta confiança
              : Math.min(100, (ep.confidence || 70) + 5);  // confirmação sobe levemente
            await base44.entities.LearningPattern.update(ep.id, {
              times_seen: (ep.times_seen || 1) + 1,
              times_corrected: wasCorrection ? (ep.times_corrected || 0) + 1 : ep.times_corrected,
              confidence: newConfidence,
              chords: chords.length > 0 ? chords : ep.chords,
              last_used: new Date().toISOString().split('T')[0],
              source_songs: [...new Set([...(ep.source_songs || []), song.id])],
              observations: correctionNote,
            });
            console.log(`  ✅ LearningPattern atualizado (id=${ep.id}, confiança=${newConfidence})`);
          } else {
            // Cria novo com alta confiança por ser correção manual
            await base44.entities.LearningPattern.create({
              chords,
              key,
              pattern: newProg.pattern,
              progression_name: newProg.progression_name,
              variation_name: newProg.variation_name || null,
              section_type: sectionType,
              times_seen: 1,
              times_corrected: wasCorrection ? 1 : 0,
              confidence: wasCorrection ? 95 : 85,
              source_songs: [song.id],
              last_used: new Date().toISOString().split('T')[0],
              observations: correctionNote,
            });
            console.log(`  ✅ Novo LearningPattern criado (confiança=${wasCorrection ? 95 : 85})`);
          }
        } catch (e) {
          console.warn('Aviso: erro ao registrar feedback de aprendizado:', e);
        }
      });

      await Promise.allSettled(feedbackPromises);
      // ──────────────────────────────────────────────────

      setProgressions(cleaned.map((p, i) => ({ ...p, _tempId: `prog_${i}_${Date.now()}` })));
      setSaveSuccess(true);
      setIsEditingProgressions(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSong = async () => {
    if (!confirm(`Deletar "${song.title}"? Esta ação não pode ser desfeita.`)) return;
    deleteSongMutation.mutate();
  };

  const handleRemoveAudio = async () => {
    if (!confirm('Remover o áudio desta música?')) return;
    removeAudioMutation.mutate();
  };

  const handleSoloFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSolo(true);
    setSoloError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updateData = {};
      const ext = file.name.toLowerCase();
      if (file.type === 'application/pdf' || ext.endsWith('.pdf')) {
        updateData.solo_pdf_url = file_url;
      } else if (file.type.startsWith('image/') || ext.match(/\.(png|jpg|jpeg|webp|gif)$/)) {
        updateData.solo_pdf_url = file_url; // salva em solo_pdf_url para exibição unificada
        updateData.solo_image_url = file_url;
      } else if (ext.endsWith('.mid') || ext.endsWith('.midi')) {
        updateData.solo_midi_url = file_url;
      } else {
        updateData.solo_pdf_url = file_url; // fallback
      }
      await updateSongMutation.mutateAsync(updateData);
      setSong(prev => ({ ...prev, ...updateData }));
    } catch (err) {
      setSoloError(err.message || 'Erro ao fazer upload');
    } finally {
      setUploadingSolo(false);
      e.target.value = '';
    }
  };

  const handleReanalizeProgressions = async () => {
    if (!song.cifra_text) {
      alert('Esta música não possui cifra para reanalisar. Adicione uma cifra na aba Cifra primeiro.');
      return;
    }
    if (!confirm(`Reanalisar as progressões de "${song.title}" usando a cifra atual? As progressões existentes serão substituídas.`)) return;

    // Prepara contexto das progressões conhecidas
    const knownProgressionsContext = knownProgressions.length > 0
      ? knownProgressions.map(p => `- "${p.name}": padrão ${p.pattern}${p.variations ? `, variações: ${p.variations.map(v => v.pattern).join(', ')}` : ''}`).join('\n')
      : `- "Progressão Terra": I-IV-V-I
- "Progressão Raiz": I-V7-I ou I-V-I  
- "Progressão do Amor": I-vi-IV-V
- "Progressão Romântica": I-IV-ii-V
- "Progressão Universitária": I-V-vi-IV
- "Progressão Dois Acordes": I-V
- "Progressão Três Acordes": I-IV-V`;

    setIsReanalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em harmonia musical sertaneja. Analise esta cifra e identifique a ESTRUTURA COMPLETA da música: quais são TODAS as seções e quais acordes aparecem em cada uma.

Música: ${song.title}
Artista: ${song.artist}
Tom: ${song.main_key || 'Desconhecido'}

REGRAS IMPORTANTES:
1. Liste TODAS as seções que aparecem na cifra (intro, verso, pré-refrão, refrão, ponte, solo, final, etc). NÃO omita nenhuma seção.
2. Se a cifra tiver "Verso 1", "Verso 2", etc com acordes IDÊNTICOS, liste apenas UMA seção, rotulada apenas "Verso". Liste separadamente somente se os acordes forem diferentes.
3. Para cada seção, liste os acordes que aparecem nela, na ordem em que tocam, SEM repetir acordes consecutivos iguais.
4. Calcule o padrão em graus romanos (ex: I-IV-V-I) baseado no tom informado (${song.main_key || 'C'}).
5. NÃO nomeie progressões — deixe progression_name como null ou vazio.
6. Se uma seção não tiver rótulo explícito na cifra, identifique-a pelo contexto (ex: bloco de acordes antes do refrão = "Pré-Refrão").

CIFRA:
${song.cifra_text}

Retorne TODAS as seções encontradas com seus acordes e padrão em graus romanos.`,
        response_json_schema: {
          type: "object",
          properties: {
            progressions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section: { type: "string" },
                  chords: { type: "array", items: { type: "string" } },
                  pattern: { type: "string" },
                  key: { type: "string" },
                  progression_name: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result?.progressions?.length > 0) {
        // Remove progression_name e variation_name — esta etapa é só estrutura + acordes
        const structureOnly = mergeIdenticalSections(result.progressions).map(p => ({
          ...p,
          progression_name: null,
          variation_name: null,
        }));
        await updateSongMutation.mutateAsync({ progressions: structureOnly, predominant_progression: null, predominant_progression_pattern: null });
        setProgressions(structureOnly.map((p, i) => ({ ...p, _tempId: `prog_${i}_${Date.now()}` })));
        setReanalysisSuccess(true);
        setTimeout(() => setReanalysisSuccess(false), 4000);
      } else {
        alert('Não foi possível identificar a estrutura na cifra. Verifique se a cifra está formatada corretamente.');
      }
    } catch (err) {
      alert('Erro ao reanalisar: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Identifica progressões usando o algoritmo determinístico (calculatePatternFromChords + findProgressionMatch)
  // SEM IA - usa apenas o banco de progressões cadastradas para máxima precisão
  const handleIdentifyProgressions = async () => {
    const currentProgressions = song.progressions || [];
    if (currentProgressions.length === 0) {
      alert('Esta música não possui progressões para identificar. Use "Analisar Progressões" primeiro.');
      return;
    }
    if (knownProgressions.length === 0) {
      alert('Banco de progressões vazio. Cadastre progressões primeiro em Progressões.');
      return;
    }

    setIsIdentifying(true);
    try {
      const songKey = song.main_key || 'C';

      const updatedProgressions = currentProgressions.map((prog) => {
        const chords = Array.isArray(prog.chords) ? prog.chords : [];
        const progKey = prog.key || songKey;

        // 1) Tenta calcular o pattern a partir dos acordes reais
        let pattern = prog.pattern || null;
        if (chords.length > 0) {
          const calculated = calculatePatternFromChords(chords, progKey);
          if (calculated) pattern = calculated;
        }

        if (!pattern) return prog; // sem pattern, não altera

        // Anotações de análise (queda melódica / subida cromática)
        const descentNotes = getAnalysisNotes(chords, progKey) || (prog.notes || null);

        // 2) Busca o nome no banco usando o algoritmo determinístico
        const matchResult = findProgressionMatchUtil(pattern, knownProgressions, [], prog.section || '');

        if (matchResult) {
          return {
            ...prog,
            pattern,
            notes: descentNotes,
            progression_name: matchResult.progression_name,
            variation_name: matchResult.variation_name || null,
          };
        }

        // 3) Sem match: mantém o pattern calculado mas limpa o nome para não exibir nome errado
        return { ...prog, pattern, notes: descentNotes, progression_name: null };
      });

      await updateSongMutation.mutateAsync({ progressions: updatedProgressions });
      setProgressions(updatedProgressions.map((p, i) => ({ ...p, _tempId: `prog_${i}_${Date.now()}` })));
      setIdentifySuccess(true);
      setTimeout(() => setIdentifySuccess(false), 4000);
    } catch (err) {
      alert('Erro ao identificar: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleRemoveSolo = async (type) => {
    const updateData = {};
    if (type === 'image') {
      updateData.solo_pdf_url = null;
      updateData.solo_image_url = null;
    } else if (type === 'pdf') {
      updateData.solo_pdf_url = null;
    } else {
      updateData.solo_midi_url = null;
    }
    await updateSongMutation.mutateAsync(updateData);
    setSong(prev => ({ ...prev, ...updateData }));
  };

  const genreLabels = {
    sertanejo_raiz: '🌾 Raiz',
    sertanejo_universitario: '🎓 Universitário',
    sertanejo_romantico: '💕 Romântico',
    sertanejo_moderno: '🎸 Moderno',
    sertanejo_modao: '🪗 Modão',
    pop_rock: '🎸 Pop/Rock',
    mpb: '🎶 MPB',
    samba: '🥁 Samba',
    forro: '🪗 Forró',
    religioso: '🙏 Religioso',
    outro: '🎵 Outro',
  };

  const [cifraHighlight, setCifraHighlight] = useState(null);

  // Vai para a aba Cifra, destaca a linha e rola até ela
  const goToCifraLine = (line) => {
    setActiveTab('cifra');
    setCifraHighlight(line);
    setTimeout(() => {
      document.getElementById(`cifra-line-${line - 1}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
  };

  const hasSoloTab = !!parseSoloTab(song.solo_tab);
  const tabs = [
    { id: 'progressions', label: '🎵 Progressões' },
    { id: 'cifra', label: '📄 Cifra' },
    { id: 'auditoria', label: '🛡️ Auditoria' },
    { id: 'theory', label: '🎓 Teoria' },
    { id: 'notes', label: '🎼 Análise Harmônica' },
    ...(hasSoloTab || currentUser?.role === 'admin' ? [{ id: 'tocarjunto', label: '🎼 Tocar junto' }] : []),
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-stretch justify-stretch"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-amber-50 shadow-2xl w-full h-full overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#8B6F47] via-[#A68A64] to-[#D4AF37] p-4 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-white truncate">{song.title}</h2>
                <p className="text-white/80 text-sm md:text-base">{song.artist}</p>
                {song.author && <p className="text-white/60 text-xs">Compositor: {song.author}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {song.genre_style && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      {genreLabels[song.genre_style] || song.genre_style}
                    </Badge>
                  )}
                  {song.main_key && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      🎵 Tom: {song.main_key}
                    </Badge>
                  )}
                  {song.rhythm_name && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      🥁 {song.rhythm_name}
                    </Badge>
                  )}
                  {song.tempo && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      ♩ {song.tempo} BPM
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="text-white hover:bg-white/20"
                  title="Editar música"
                >
                  <Edit className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteSong}
                  className="text-white hover:bg-red-500/40"
                  title="Deletar música"
                  disabled={deleteSongMutation.isPending}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#D4C5B0] bg-white/50 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 md:px-5 py-3 text-xs md:text-sm font-medium whitespace-nowrap transition-all border-b-2 inline-flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'border-[#8B6F47] text-[#8B6F47] bg-amber-50'
                    : 'border-transparent text-[#A68A64] hover:text-[#8B6F47]'
                }`}
              >
                {tab.label}
                {(tab.id === 'cifra' || tab.id === 'auditoria') && song.validation_severity && song.validation_severity !== 'ok' && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      song.validation_severity === 'critico' ? 'bg-red-100 text-red-700'
                      : song.validation_severity === 'suspeito' ? 'bg-orange-100 text-orange-700'
                      : 'bg-amber-100 text-amber-700'
                    }`}
                    title="Auditoria de cifra: possível erro detectado — veja os detalhes na aba Cifra"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {(song.validation_issues || []).length > 0 && <span>{(song.validation_issues || []).length}</span>}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto">

            {/* Aba PROGRESSÕES */}
            {activeTab === 'progressions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#8B6F47] text-lg">Progressões por Seção</h3>
                  <div className="flex gap-2">
                    {isEditingProgressions ? (
                      <>
                        <Button
                          onClick={handleSaveProgressions}
                          disabled={isSaving}
                          className="bg-[#8B6F47] text-white hover:bg-[#6B5437] text-sm"
                          size="sm"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                          Salvar
                        </Button>
                        <Button
                          onClick={() => {
                            setIsEditingProgressions(false);
                            setProgressions(
                              (song.progressions || []).map((p, i) => ({ ...p, _tempId: `prog_${i}_${Date.now()}` }))
                            );
                          }}
                          variant="outline"
                          size="sm"
                          className="border-[#D4C5B0] text-[#8B6F47]"
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={handleReanalizeProgressions}
                          disabled={isReanalyzing}
                          variant="outline"
                          size="sm"
                          className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                        >
                          {isReanalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          {isReanalyzing ? 'Analisando...' : 'Analisar a Estrutura'}
                        </Button>
                        <Button
                          onClick={handleIdentifyProgressions}
                          disabled={isIdentifying}
                          variant="outline"
                          size="sm"
                          className="border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white"
                        >
                          {isIdentifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                          {isIdentifying ? 'Identificando...' : 'Identificar Progressões'}
                        </Button>
                        <Button
                          onClick={() => setIsEditingProgressions(true)}
                          variant="outline"
                          size="sm"
                          className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar Progressões
                        </Button>
                        <Button
                          onClick={handleSaveProgressions}
                          disabled={isSaving}
                          variant="outline"
                          size="sm"
                          className="border-green-600 text-green-700 hover:bg-green-600 hover:text-white"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Salvar Progressões
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {saveSuccess && (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-700">✅ Progressões salvas com sucesso!</AlertDescription>
                  </Alert>
                )}

                {reanalysisSuccess && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-blue-700">✅ Progressões reanalisadas e atualizadas com sucesso!</AlertDescription>
                  </Alert>
                )}

                {identifySuccess && (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-700">✅ Progressões identificadas e nomes atualizados com sucesso!</AlertDescription>
                  </Alert>
                )}

                {computedPredominant?.name && (
                  <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#9CAF88]/20 rounded-xl p-3 border border-[#D4AF37]/50">
                    <p className="text-xs text-[#A68A64] mb-1">Progressão Predominante</p>
                    <p className="font-bold text-[#8B6F47]">{computedPredominant.name}</p>
                    {computedPredominant.pattern && (
                      <p className="text-xs font-mono text-[#A68A64] mt-0.5">{computedPredominant.pattern}</p>
                    )}
                  </div>
                )}

                {isEditingProgressions ? (
                  <div className="space-y-4">
                    {progressions.map((prog, index) => (
                      <ProgressionEditCard
                        key={prog._tempId}
                        prog={prog}
                        index={index}
                        knownProgressions={knownProgressions}
                        onUpdate={handleUpdateProgression}
                        onUpdateChords={handleUpdateChords}
                        onDelete={handleDeleteProgression}
                      />
                    ))}

                    <Button
                      onClick={handleAddProgression}
                      variant="outline"
                      className="w-full border-dashed border-2 border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47]/10"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Nova Progressão
                    </Button>
                  </div>
                ) : (
                  <>
                  {/* Painel de feedback da IA */}
                  <AIFeedbackPanel
                    song={song}
                    progressions={progressions.map(({ _tempId, ...rest }) => rest)}
                  />
                  <ProgressionView
                    song={song}
                    progressions={progressions.map(p => {
                      const { _tempId, ...rest } = p;
                      if (semitones === 0) return rest;
                      return {
                        ...rest,
                        key: transposeKey(rest.key, semitones, useFlats),
                        modulated_key: rest.modulated_key ? transposeKey(rest.modulated_key, semitones, useFlats) : rest.modulated_key,
                        chords: Array.isArray(rest.chords) ? transposeChords(rest.chords, semitones, useFlats) : rest.chords,
                      };
                    })}
                    onEditProgression={handleQuickEditProgression}
                  />
                  </>
                )}
              </div>
            )}

            {/* Aba CIFRA */}
            {activeTab === 'cifra' && (
              <>
              {song.validation_severity && song.validation_severity !== 'ok' && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 mb-2">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="font-bold text-red-700 uppercase tracking-wide text-sm">Auditoria de Cifra</p>
                    <CifraAlertBadge severity={song.validation_severity} issues={song.validation_issues} />
                  </div>
                  <p className="text-sm text-red-700 mb-2">O sistema identificou que esta cifra pode estar com erro. Revise as seções abaixo:</p>
                  <ul className="space-y-1.5">
                    {(song.validation_issues || []).map((iss, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                        <span>{iss.message}</span>
                      </li>
                    ))}
                  </ul>
                  {song.validation_date && (
                    <p className="text-xs text-red-500 mt-2">Auditada em {new Date(song.validation_date).toLocaleString('pt-BR')}</p>
                  )}
                </div>
              )}
              <CifraTab
                song={song}
                transposedCifra={transposedData.cifra_text}
                isAdmin={currentUser?.role === 'admin'}
                highlightLine={cifraHighlight}
                onSaveComments={async (updatedComments) => {
                  await updateSongMutation.mutateAsync({ cifra_comments: updatedComments });
                  setSong(prev => ({ ...prev, cifra_comments: updatedComments }));
                }}
                onSaveCifra={async (newText, newKey) => {
                  const payload = { cifra_text: newText };
                  if (newKey) payload.main_key = newKey;

                  // Se está transpondo (newKey diferente do tom atual), transpõe também os acordes das progressões
                  // — MAS somente das progressões cuja tonalidade salva bate com o tom atual (main_key).
                  // Progressões salvas em outro tom (ex.: já analisadas/transpostas em tonalidade diferente)
                  // não devem ser transpostas novamente, senão seus acordes ficariam errados.
                  if (newKey && newKey !== song.main_key && song.progressions?.length > 0) {
                    const semi = semitonesBetween(song.main_key, newKey);
                    // Troca de maior para menor (ou vice-versa) também reescreve os acordes.
                    const modeChanged = parseKey(song.main_key).mode !== parseKey(newKey).mode;
                    if (semi !== 0 || modeChanged) {
                      const useFlatsSave = preferFlatsForKey(newKey);
                      const oldKeyNorm = song.main_key;
                      const updatedProgressions = song.progressions.map(prog => {
                        // Só transpõe progressões cuja tonalidade salva bate com o tom atual (main_key).
                        // Progressões salvas em outro tom não devem ser transpostas novamente.
                        if (!prog.key || prog.key !== oldKeyNorm) {
                          return prog;
                        }
                        return {
                          ...prog,
                          key: newKey,
                          modulated_key: prog.modulated_key && semi !== 0 ? transposeKey(prog.modulated_key, semi, useFlatsSave) : prog.modulated_key,
                          chords: Array.isArray(prog.chords)
                            ? prog.chords.map(c => transposeChordToKey(c, oldKeyNorm, newKey, useFlatsSave))
                            : prog.chords,
                        };
                      });
                      payload.progressions = updatedProgressions;
                      setProgressions(updatedProgressions.map((p, i) => ({ ...p, _tempId: `prog_${i}_${Date.now()}` })));
                    }
                  }

                  try {
                    await updateSongMutation.mutateAsync(payload);
                    setSong(prev => ({ ...prev, cifra_text: newText, ...(newKey ? { main_key: newKey } : {}), ...(payload.progressions ? { progressions: payload.progressions } : {}) }));
                    if (newKey) setSemitones(0);
                  } catch (err) {
                    console.error('Erro ao salvar cifra/tonalidade:', err);
                    alert(`Não foi possível salvar: ${err?.message || err}`);
                    throw err;
                  }
                }}
              />
              </>
            )}

            {/* Aba AUDITORIA */}
            {activeTab === 'auditoria' && (
              <AuditPanel
                song={song}
                onGoToLine={goToCifraLine}
                onUpdated={(fields) => setSong(prev => ({ ...prev, ...fields }))}
              />
            )}

            {/* Aba TEORIA */}
            {activeTab === 'theory' && (
              <div className="space-y-6">
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="UTF-8">
                          <title>${song.title} - Teoria Musical</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
                            h1 { color: #8B6F47; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; }
                            h2 { color: #A68A64; margin-top: 25px; }
                            .info { background: #F5F1E8; padding: 15px; border-radius: 8px; margin: 15px 0; }
                            .progression { margin: 15px 0; padding: 12px; border-left: 4px solid #D4AF37; background: #fafafa; }
                            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                            th, td { border: 1px solid #D4C5B0; padding: 10px; text-align: left; }
                            th { background: #8B6F47; color: white; }
                          </style>
                        </head>
                        <body>
                          <h1>🎓 Análise Teórica: ${song.title}</h1>
                          <p><strong>Artista:</strong> ${song.artist}</p>
                          <div class="info">
                            <p><strong>Tonalidade:</strong> ${transposedData.main_key || 'N/A'}</p>
                            <p><strong>Ritmo:</strong> ${song.rhythm_name || 'N/A'}</p>
                            <p><strong>Tempo:</strong> ${song.tempo || 'N/A'} BPM</p>
                            ${song.predominant_progression ? `<p><strong>Progressão Predominante:</strong> ${song.predominant_progression}</p>` : ''}
                          </div>
                          <h2>📊 Análise por Seção</h2>
                          <table>
                            <tr>
                              <th>Seção</th><th>Acordes</th><th>Padrão</th><th>Progressão</th>
                            </tr>
                            ${(transposedData.progressions || []).map(p => `
                              <tr>
                                <td>${p.section || 'N/A'}</td>
                                <td>${Array.isArray(p.chords) ? p.chords.join(' - ') : p.chords || 'N/A'}</td>
                                <td>${p.pattern || 'N/A'}</td>
                                <td>${p.progression_name || '-'}</td>
                              </tr>
                            `).join('')}
                          </table>
                          <p style="text-align: center; margin-top: 40px; color: #888; border-top: 1px solid #D4C5B0; padding-top: 20px;">
                            Tropeiros do Bebedouro • Análise Teórica • ${new Date().toLocaleDateString('pt-BR')}
                          </p>
                          <script>window.onload = function() { window.print(); };<\/script>
                        </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    variant="outline"
                    size="sm"
                    className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Teoria
                  </Button>
                </div>
                <TheoryAnalysisExport
                  song={song}
                  progressions={transposedData.progressions}
                  mainKey={transposedData.main_key}
                />
                <AdvancedHarmonicAnalysis
                  progressions={transposedData.progressions}
                  mainKey={transposedData.main_key}
                  song={song}
                  cifraText={transposedData.cifra_text}
                  onProgressionsUpdate={() => queryClient.invalidateQueries({ queryKey: ['songs'] })}
                />
              </div>
            )}

            {/* Aba NOTAS */}
            {activeTab === 'notes' && (
              <ManualNotes song={song} />
            )}

            {/* Aba TOCAR JUNTO */}
            {activeTab === 'tocarjunto' && (
              <div className="space-y-4">
                {currentUser?.role === 'admin' && (
                  <Button
                    onClick={() => setShowGpImporter(!showGpImporter)}
                    variant="outline"
                    size="sm"
                    className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {showGpImporter ? 'Fechar importador' : 'Importar .gp'}
                  </Button>
                )}
                {showGpImporter && currentUser?.role === 'admin' && (
                  <GpImporter
                    songId={song.id}
                    onSaved={() => {
                      queryClient.invalidateQueries({ queryKey: ['songs'] });
                      base44.entities.Song.get(song.id).then(updated => setSong(updated));
                    }}
                  />
                )}
                {hasSoloTab && <TocarJuntoPlayer soloTab={parseSoloTab(song.solo_tab)} />}

                {/* Solo Upload */}
                <SoloUploadCard
                  song={song}
                  soloFileInputRef={soloFileInputRef}
                  uploadingSolo={uploadingSolo}
                  soloError={soloError}
                  onUpload={handleSoloFileSelect}
                  onRemove={handleRemoveSolo}
                />

                {/* Playback */}
                {song.playback_url && (
                  <Card className="border-[#9CAF88] bg-gradient-to-r from-[#9CAF88]/10 to-[#D4AF37]/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-[#9CAF88]" />
                        Playback / Base
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-white/60 rounded-xl border border-[#D4C5B0]">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#9CAF88] to-[#8B6F47] rounded-full flex items-center justify-center flex-shrink-0">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-[#8B6F47] mb-2">🎸 Toque junto com a base!</p>
                            <audio controls src={song.playback_url} className="w-full h-10" controlsList="nodownload" preload="metadata" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#A68A64]">Use o playback para praticar no ritmo correto</p>
                          <a href={song.playback_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#8B6F47] hover:text-[#A68A64] flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />Abrir em nova aba
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Áudio */}
            {song.audio_url && (
              <Card className="border-[#D4C5B0] bg-white/60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <a href={song.audio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#8B6F47] hover:text-[#A68A64] transition-colors">
                      <ExternalLink className="w-4 h-4" />Abrir arquivo de áudio
                    </a>
                    <Button variant="outline" size="sm" onClick={handleRemoveAudio} className="border-orange-500 text-orange-600 hover:bg-orange-50" disabled={removeAudioMutation.isPending}>
                      <FileX className="w-4 h-4 mr-2" />Remover Áudio
                    </Button>
                  </div>
                  <p className="text-xs text-[#A68A64] mt-2">💡 Você pode remover o áudio para economizar espaço. A análise será mantida.</p>
                </CardContent>
              </Card>
            )}

          </div>
        </motion.div>
      </motion.div>

      {/* Modal de edição */}
      {isEditing && (
        <SongEditForm
          song={song}
          onClose={() => setIsEditing(false)}
          onSave={() => {
            setIsEditing(false);
            queryClient.invalidateQueries({ queryKey: ['songs'] });
          }}
        />
      )}
    </AnimatePresence>
  );
}