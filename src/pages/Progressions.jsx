import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisibleData } from "../components/utils/useVisibleData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Waves, Edit, Trash2, X, Save, Search, Filter, Printer, Sparkles, RefreshCw, Brain, Globe, Upload, Play, Pause, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import ProgressionGeneratorEmbed from "../components/progressions/ProgressionGeneratorEmbed";
import ProgressionSongSearch from "../components/progressions/ProgressionSongSearch";
import LearningDashboard from "../components/learning/LearningDashboard";
import ManualTraining from "../components/learning/ManualTraining";
import CleanOrphanPatterns from "../components/admin/CleanOrphanPatterns";
import EnriquecerProgressoesIA from "../components/progressions/EnriquecerProgressoesIA";
import MidiPlayer from "../components/songs/MidiPlayer";

const isMidi = (url) => url && (url.toLowerCase().includes('.mid') || url.toLowerCase().endsWith('.midi'));

const AudioOrMidi = ({ url, className }) => {
  if (!url) return null;
  if (isMidi(url)) return <MidiPlayer midiUrl={url} />;
  return <audio controls className={className}><source src={url} /></audio>;
};

export default function Progressions() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("library");
  const [showForm, setShowForm] = useState(false);
  const [editingProgression, setEditingProgression] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [updatingKnowledge, setUpdatingKnowledge] = useState(false);
  const [showEnriquecerIA, setShowEnriquecerIA] = useState(false);
  const [searchProgression, setSearchProgression] = useState(null);
  const [uploadingBacking, setUploadingBacking] = useState(false);
  const [uploadingVariationBacking, setUploadingVariationBacking] = useState({});
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const [formData, setFormData] = useState({
    name: "",
    pattern: "",
    description: "",
    common_keys: "",
    genre_tags: "",
    examples: "",
    variations: [],
    backing_track_url: ""
  });

  const { data: progressions, isLoading } = useVisibleData('Progression', { sort: '-created_date' });

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: learningPatterns } = useQuery({
    queryKey: ['learningPatterns'],
    queryFn: () => base44.entities.LearningPattern.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Progression.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progressions'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const MAX_RETRIES = 10;
      const TIMEOUT_MS = 45000;
      let lastError = null;
      
      console.log(`\n${"█".repeat(70)}`);
      console.log("█  SALVANDO PROGRESSÃO");
      console.log(`${"█".repeat(70)}`);
      console.log("ID:", id);
      console.log("DADOS:", JSON.stringify(data, null, 2));
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`\n[TENTATIVA ${attempt}/${MAX_RETRIES}] Salvando...`);
          
          const savePromise = base44.entities.Progression.update(id, data);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
          );
          
          const result = await Promise.race([savePromise, timeoutPromise]);
          console.log(`✅ API respondeu - Tentativa ${attempt}`);
          
          await new Promise(r => setTimeout(r, 2000));
          
          console.log("🔍 Verificando no banco...");
          const allProgressions = await base44.entities.Progression.list();
          const saved = allProgressions.find(p => p.id === id);
          
          if (!saved) {
            throw new Error("Progressão não encontrada após salvamento!");
          }
          
          if (saved.name?.trim() !== data.name?.trim()) {
            console.error(`❌ DIVERGÊNCIA: nome "${data.name}" vs "${saved.name}"`);
            throw new Error("Nome não foi salvo corretamente!");
          }
          
          console.log(`✅ VERIFICADO - Nome: "${saved.name}"`);
          console.log(`${"█".repeat(70)}\n`);
          
          return saved;
          
        } catch (error) {
          lastError = error;
          console.error(`❌ Tentativa ${attempt} falhou:`, error.message);
          
          if (attempt < MAX_RETRIES) {
            const wait = attempt * 3000;
            console.log(`⏳ Aguardando ${wait/1000}s...`);
            await new Promise(r => setTimeout(r, wait));
          }
        }
      }
      
      throw new Error(`FALHA TOTAL após ${MAX_RETRIES} tentativas: ${lastError?.message}`);
    },
    onSuccess: async (savedData) => {
      console.log("🔄 Limpando cache...");
      await queryClient.cancelQueries();
      queryClient.clear();
      
      queryClient.setQueryData(['progressions'], (old) => {
        if (!old) return [savedData];
        return old.map(p => p.id === savedData.id ? savedData : p);
      });
      
      await queryClient.refetchQueries({ queryKey: ['progressions'] });
      
      console.log("✅ Cache atualizado");
      
      resetForm();
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error) => {
      console.error("💀 ERRO CRÍTICO:", error);
      alert(`❌ ERRO AO SALVAR:\n\n${error.message}\n\nAbra o Console (F12) para detalhes.`);
    },
    retry: false
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Progression.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progressions'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      pattern: "",
      description: "",
      common_keys: "",
      genre_tags: "",
      examples: "",
      variations: [],
      backing_track_url: ""
    });
    setShowForm(false);
    setEditingProgression(null);
  };

  const handleEdit = (progression) => {
    setEditingProgression(progression);
    setFormData({
      name: progression.name || "",
      pattern: progression.pattern || "",
      description: progression.description || "",
      common_keys: progression.common_keys?.join(", ") || "",
      genre_tags: progression.genre_tags?.join(", ") || "",
      examples: progression.examples?.join(", ") || "",
      variations: progression.variations || [],
      backing_track_url: progression.backing_track_url || ""
    });
    setShowForm(true);
  };

  const handlePrintProgression = (progressionToPrint = null) => {
    const prog = progressionToPrint || editingProgression || formData;
    if (!prog || !prog.name) return;
    const commonKeys = typeof prog.common_keys === 'string' 
      ? prog.common_keys 
      : prog.common_keys?.join(", ") || "";
    const genreTags = typeof prog.genre_tags === 'string' 
      ? prog.genre_tags 
      : prog.genre_tags?.join(", ") || "";
    const examples = typeof prog.examples === 'string' 
      ? prog.examples 
      : prog.examples?.join(", ") || "";
    const variations = formData.variations || prog.variations || [];

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${prog.name || formData.name} - Progressão Harmônica</title>
          <style>
            @page { margin: 1.5cm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Georgia', serif;
              color: #000;
              background: #fff;
              font-size: 14px;
              line-height: 1.6;
            }
            .card {
              border: 3px solid #8B6F47;
              border-radius: 16px;
              padding: 30px;
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #D4C5B0;
            }
            .logo {
              width: 60px;
              height: 60px;
              margin-bottom: 10px;
            }
            .title {
              font-size: 28px;
              font-weight: bold;
              color: #8B6F47;
              margin-bottom: 5px;
            }
            .pattern {
              font-size: 24px;
              font-weight: bold;
              color: #fff;
              background: linear-gradient(135deg, #D4AF37, #9CAF88);
              padding: 10px 20px;
              border-radius: 8px;
              display: inline-block;
              font-family: 'Courier New', monospace;
              margin-top: 10px;
            }
            .section {
              margin-top: 20px;
            }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              color: #A68A64;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 8px;
            }
            .section-content {
              font-size: 14px;
              color: #333;
            }
            .tags {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .tag {
              background: #F5F1E8;
              border: 1px solid #D4C5B0;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              color: #8B6F47;
            }
            .variation {
              background: #F5F1E8;
              padding: 10px 15px;
              border-radius: 8px;
              margin-bottom: 8px;
              border-left: 3px solid #9CAF88;
            }
            .variation-pattern {
              font-family: 'Courier New', monospace;
              font-weight: bold;
              color: #8B6F47;
            }
            .footer {
              margin-top: 25px;
              padding-top: 15px;
              border-top: 1px solid #D4C5B0;
              text-align: center;
              font-size: 10px;
              color: #A68A64;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6900add80614fb22512134a9/522fde112_LOGO-PNG.png" 
                alt="Logo"
                class="logo"
              />
              <div class="title">${prog.name || formData.name}</div>
              <div class="pattern">${prog.pattern || formData.pattern}</div>
            </div>

            ${prog.description || formData.description ? `
            <div class="section">
              <div class="section-title">Descrição</div>
              <div class="section-content">${prog.description || formData.description}</div>
            </div>
            ` : ''}



            ${genreTags ? `
            <div class="section">
              <div class="section-title">Gêneros</div>
              <div class="tags">
                ${genreTags.split(',').map(g => `<span class="tag">${g.trim()}</span>`).join('')}
              </div>
            </div>
            ` : ''}

            ${variations.length > 0 ? `
            <div class="section">
              <div class="section-title">Variações (${variations.length})</div>
              ${variations.map(v => `
                <div class="variation">
                  <span class="variation-pattern">${v.pattern}</span>
                  ${v.name ? `<span> - ${v.name}</span>` : ''}
                  ${v.description ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${v.description}</div>` : ''}
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${examples ? `
            <div class="section">
              <div class="section-title">Exemplos de Músicas</div>
              <div class="section-content">${examples}</div>
            </div>
            ` : ''}

            <div class="footer">
              Tropeiros do Bebedouro • ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    if (filteredProgressions.length === 0) return;

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Todas as Progressões - Biblioteca</title>
          <style>
            @page { margin: 1.5cm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Georgia', serif;
              color: #000;
              background: #fff;
              font-size: 14px;
              line-height: 1.6;
            }
            .page-break { page-break-after: always; }
            .card {
              border: 3px solid #8B6F47;
              border-radius: 16px;
              padding: 30px;
              max-width: 600px;
              margin: 0 auto 40px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #D4C5B0;
            }
            .logo {
              width: 60px;
              height: 60px;
              margin-bottom: 10px;
            }
            .title {
              font-size: 28px;
              font-weight: bold;
              color: #8B6F47;
              margin-bottom: 5px;
            }
            .pattern {
              font-size: 24px;
              font-weight: bold;
              color: #fff;
              background: linear-gradient(135deg, #D4AF37, #9CAF88);
              padding: 10px 20px;
              border-radius: 8px;
              display: inline-block;
              font-family: 'Courier New', monospace;
              margin-top: 10px;
            }
            .section {
              margin-top: 20px;
            }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              color: #A68A64;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 8px;
            }
            .section-content {
              font-size: 14px;
              color: #333;
            }
            .tags {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .tag {
              background: #F5F1E8;
              border: 1px solid #D4C5B0;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              color: #8B6F47;
            }
            .variation {
              background: #F5F1E8;
              padding: 10px 15px;
              border-radius: 8px;
              margin-bottom: 8px;
              border-left: 3px solid #9CAF88;
            }
            .variation-pattern {
              font-family: 'Courier New', monospace;
              font-weight: bold;
              color: #8B6F47;
            }
            .footer {
              margin-top: 25px;
              padding-top: 15px;
              border-top: 1px solid #D4C5B0;
              text-align: center;
              font-size: 10px;
              color: #A68A64;
            }
            .cover {
              text-align: center;
              padding: 100px 0;
              page-break-after: always;
            }
            .cover-title {
              font-size: 48px;
              font-weight: bold;
              color: #8B6F47;
              margin-bottom: 20px;
            }
            .cover-subtitle {
              font-size: 24px;
              color: #A68A64;
              margin-bottom: 40px;
            }
            .cover-count {
              font-size: 18px;
              color: #8B6F47;
            }
          </style>
        </head>
        <body>
          <div class="cover">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6900add80614fb22512134a9/522fde112_LOGO-PNG.png" 
              alt="Logo"
              style="width: 120px; height: 120px; margin-bottom: 30px;"
            />
            <div class="cover-title">Progressões Harmônicas</div>
            <div class="cover-subtitle">Biblioteca Completa</div>
            <div class="cover-count">${filteredProgressions.length} Progressões</div>
            <div style="margin-top: 40px; color: #A68A64;">
              ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>

          ${filteredProgressions.map((prog, index) => {
            const commonKeys = prog.common_keys?.join(", ") || "";
            const genreTags = prog.genre_tags?.join(", ") || "";
            const examples = prog.examples?.join(", ") || "";
            const variations = prog.variations || [];

            return `
              <div class="card">
                <div class="header">
                  <div class="title">${prog.name}</div>
                  <div class="pattern">${prog.pattern}</div>
                </div>

                ${prog.description ? `
                <div class="section">
                  <div class="section-title">Descrição</div>
                  <div class="section-content">${prog.description}</div>
                </div>
                ` : ''}

                ${genreTags ? `
                <div class="section">
                  <div class="section-title">Gêneros</div>
                  <div class="tags">
                    ${genreTags.split(',').map(g => `<span class="tag">${g.trim()}</span>`).join('')}
                  </div>
                </div>
                ` : ''}

                ${variations.length > 0 ? `
                <div class="section">
                  <div class="section-title">Variações (${variations.length})</div>
                  ${variations.map(v => `
                    <div class="variation">
                      <span class="variation-pattern">${v.pattern}</span>
                      ${v.name ? `<span> - ${v.name}</span>` : ''}
                      ${v.description ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${v.description}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
                ` : ''}

                ${examples ? `
                <div class="section">
                  <div class="section-title">Exemplos de Músicas</div>
                  <div class="section-content">${examples}</div>
                </div>
                ` : ''}

                <div class="footer">
                  Tropeiros do Bebedouro • ${new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>
              ${index < filteredProgressions.length - 1 ? '<div class="page-break"></div>' : ''}
            `;
          }).join('')}

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const dataToSave = {
      name: formData.name,
      pattern: formData.pattern,
      description: formData.description,
      common_keys: formData.common_keys ? formData.common_keys.split(",").map((k) => k.trim()).filter((k) => k) : [],
      genre_tags: formData.genre_tags ? formData.genre_tags.split(",").map((g) => g.trim()).filter((g) => g) : [],
      examples: formData.examples ? formData.examples.split(",").map((e) => e.trim()).filter((e) => e) : [],
      variations: formData.variations,
      backing_track_url: formData.backing_track_url || null
    };

    if (editingProgression) {
      updateMutation.mutate({ id: editingProgression.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const addVariation = () => {
    setFormData({
      ...formData,
      variations: [...formData.variations, { pattern: "", description: "", name: "", backing_track_url: "" }]
    });
  };

  const removeVariation = (index) => {
    const newVariations = formData.variations.filter((_, i) => i !== index);
    setFormData({ ...formData, variations: newVariations });
  };

  const updateVariation = (index, field, value) => {
    const newVariations = [...formData.variations];
    newVariations[index][field] = value;
    setFormData({ ...formData, variations: newVariations });
  };

  const syncProgressionNames = async () => {
    if (!confirm("Sincronizar nomes de progressões?\n\nTodas as músicas serão atualizadas com os nomes atuais das progressões.")) {
      return;
    }

    setUpdatingKnowledge(true);

    try {
      let songsUpdated = 0;

      const normalizePattern = (pattern) => {
        if (!pattern) return "";
        return pattern
          .toString()
          .trim()
          .replace(/\s+/g, '')
          .replace(/[-–—_]/g, '-')
          .replace(/[,;.]/g, '-')
          .replace(/\(/g, '')
          .replace(/\)/g, '')
          .replace(/\//g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .toUpperCase();
      };

      const updatePromises = [];
      
      for (const song of songs) {
        let needsUpdate = false;
        const updatedProgressions = (song.progressions || []).map(prog => {
          if (!prog.pattern) return prog;

          const normalizedPattern = normalizePattern(prog.pattern);
          
          const currentProgression = progressions.find(p => 
            normalizePattern(p.pattern) === normalizedPattern
          );

          if (currentProgression && prog.progression_name !== currentProgression.name) {
            console.log(`🔄 ${song.title}: "${prog.progression_name}" → "${currentProgression.name}" (pattern: ${normalizedPattern})`);
            needsUpdate = true;
            return { ...prog, progression_name: currentProgression.name };
          }

          return prog;
        });

        let newPredominant = song.predominant_progression;
        if (song.predominant_progression_pattern) {
          const normalizedPredPattern = normalizePattern(song.predominant_progression_pattern);
          const currentProgression = progressions.find(p => 
            normalizePattern(p.pattern) === normalizedPredPattern
          );
          if (currentProgression && song.predominant_progression !== currentProgression.name) {
            console.log(`🏆 ${song.title} predominante: "${song.predominant_progression}" → "${currentProgression.name}" (pattern: ${normalizedPredPattern})`);
            newPredominant = currentProgression.name;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          const updateData = {
            progressions: updatedProgressions,
            predominant_progression: newPredominant
          };
          console.log(`💾 Salvando ${song.title}:`, updateData);
          updatePromises.push(
            base44.entities.Song.update(song.id, updateData)
          );
          songsUpdated++;
        }
      }

      // Aguarda TODAS as atualizações terminarem
      await Promise.all(updatePromises);
      
      console.log(`✅ ${songsUpdated} atualizações salvas com sucesso!`);
      
      // Limpa TODO o cache
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries();
      
      alert(`✅ ${songsUpdated} músicas sincronizadas!\n\nRecarregando...`);
      
      // Força reload completo
      window.location.href = window.location.href;

    } catch (err) {
      console.error("Erro ao sincronizar:", err);
      alert("❌ Erro ao sincronizar. Tente novamente.");
    } finally {
      setUpdatingKnowledge(false);
    }
  };

  const handleUpdateKnowledgeBase = async () => {
    if (!confirm("Atualizar a base de conhecimento?\n\nO sistema irá processar todas as orientações das músicas e estruturar os padrões aprendidos.\n\nIsso pode demorar alguns segundos.")) {
      return;
    }

    setUpdatingKnowledge(true);

    try {
      let patternsCreated = 0;
      let patternsUpdated = 0;

      // Processa cada música com suas progressões
      for (const song of songs) {
        if (!song.progressions || song.progressions.length === 0) continue;

        for (const prog of song.progressions) {
          // Só processa se tiver dados mínimos necessários
          if (!prog.chords || !prog.pattern || !prog.progression_name) continue;

          const chordsKey = Array.isArray(prog.chords) ? prog.chords.join('-') : prog.chords;
          
          // Processa observações se houver
          let extracted_rules = [];
          if (prog.notes && prog.notes.trim()) {
            const notes = prog.notes.toLowerCase().trim();
            
            if (notes.includes('refrão') || notes.includes('refrao')) {
              extracted_rules.push({ type: 'section_preference', value: 'refrão', context: notes });
            }
            if (notes.includes('verso')) {
              extracted_rules.push({ type: 'section_preference', value: 'verso', context: notes });
            }
            if (notes.includes('ponte')) {
              extracted_rules.push({ type: 'section_preference', value: 'ponte', context: notes });
            }
            if (notes.includes('romântic') || notes.includes('romantico')) {
              extracted_rules.push({ type: 'style_hint', value: 'romantico', context: notes });
            }
            if (notes.includes('moderno')) {
              extracted_rules.push({ type: 'style_hint', value: 'moderno', context: notes });
            }
            if (notes.includes('raiz')) {
              extracted_rules.push({ type: 'style_hint', value: 'raiz', context: notes });
            }
            if (notes.includes('modulaç') || notes.includes('modula')) {
              extracted_rules.push({ type: 'modulation_hint', context: notes });
            }
            if (notes.includes('sempre') || notes.includes('geralmente')) {
              extracted_rules.push({ type: 'frequency_high', context: notes });
            }
            if (notes.includes('raro') || notes.includes('às vezes')) {
              extracted_rules.push({ type: 'frequency_low', context: notes });
            }
          }

          // Busca padrão existente
          const existingPattern = learningPatterns.find(lp => 
            lp.chords?.join('-') === chordsKey && 
            lp.key === prog.key &&
            lp.progression_name === prog.progression_name &&
            (lp.variation_name || null) === (prog.variation_name || null)
          );

          if (existingPattern) {
            // Atualiza padrão existente
            const updateData = {
              times_seen: (existingPattern.times_seen || 1) + 1,
              last_used: new Date().toISOString().split('T')[0],
              source_songs: [...new Set([...(existingPattern.source_songs || []), song.id])],
              confidence: Math.min(100, (existingPattern.confidence || 80) + 2)
            };

            if (extracted_rules.length > 0) {
              updateData.observations = prog.notes;
              updateData.extracted_rules = extracted_rules;
            }

            await base44.entities.LearningPattern.update(existingPattern.id, updateData);
            patternsUpdated++;
          } else {
            // Cria novo padrão
            const createData = {
              chords: Array.isArray(prog.chords) ? prog.chords : prog.chords.split(',').map(c => c.trim()),
              key: prog.key,
              pattern: prog.pattern,
              progression_name: prog.progression_name,
              variation_name: prog.variation_name || null,
              section_type: prog.section?.toLowerCase().replace(/\d+/g, '').trim() || 'outro',
              times_seen: 1,
              times_corrected: 0,
              confidence: 80,
              source_songs: [song.id],
              last_used: new Date().toISOString().split('T')[0]
            };

            if (extracted_rules.length > 0) {
              createData.observations = prog.notes;
              createData.extracted_rules = extracted_rules;
            }

            await base44.entities.LearningPattern.create(createData);
            patternsCreated++;
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['learningPatterns'] });
      alert(`✅ Base de conhecimento atualizada!\n\n📊 Padrões criados: ${patternsCreated}\n🔄 Padrões atualizados: ${patternsUpdated}\n\nTotal processado: ${patternsCreated + patternsUpdated}`);

    } catch (err) {
      console.error("❌ Erro ao atualizar base de conhecimento:", err);
      alert("❌ Erro ao atualizar base de conhecimento. Tente novamente.");
    } finally {
      setUpdatingKnowledge(false);
    }
  };

  const uniqueGenres = [...new Set(progressions.flatMap(p => p.genre_tags || []))].sort();

  const filteredProgressions = progressions.filter((prog) => {
    const matchesSearch = prog.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prog.pattern?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = genreFilter === "all" || prog.genre_tags?.includes(genreFilter);
    return matchesSearch && matchesGenre;
  });

  return (
    <>
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
            Progressões Harmônicas
          </h1>
          <p className="text-[#A68A64]">Banco de progressões para identificação automática</p>
        </motion.div>

        {/* Tabs de navegação */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between gap-3">
              <TabsList className="bg-[#E8DCC4] p-1 rounded-xl">
                <TabsTrigger 
                  value="library" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#8B6F47] data-[state=active]:to-[#A68A64] data-[state=active]:text-white"
                >
                  <Waves className="w-4 h-4 mr-2" />
                  Biblioteca
                </TabsTrigger>
                <TabsTrigger 
                  value="generator" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#D4AF37] data-[state=active]:to-[#9CAF88] data-[state=active]:text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerador
                </TabsTrigger>
                <TabsTrigger 
                  value="learning" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#9CAF88] data-[state=active]:to-[#8B6F47] data-[state=active]:text-white"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Aprendizado
                </TabsTrigger>
              </TabsList>

              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    onClick={syncProgressionNames}
                    disabled={updatingKnowledge}
                    variant="outline"
                    size="sm"
                    className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                  >
                    {updatingKnowledge ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sincronizar Nomes
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleUpdateKnowledgeBase}
                    disabled={updatingKnowledge}
                    variant="outline"
                    size="sm"
                    className="border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white"
                  >
                    {updatingKnowledge ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Atualizar Base
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowEnriquecerIA(true)}
                    variant="outline"
                    size="sm"
                    className="border-purple-400 text-purple-600 hover:bg-purple-500 hover:text-white"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Enriquecer com IA
                  </Button>
                </div>
              )}
            </div>
          </Tabs>
        </div>

        {activeTab === "generator" ? (
          <ProgressionGeneratorEmbed />
        ) : activeTab === "learning" ? (
          <div className="space-y-6">
            <CleanOrphanPatterns />
            <LearningDashboard />
            <ManualTraining />
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-[#D4C5B0] shadow-lg">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A68A64]" />
                  <Input
                    placeholder="Buscar progressões..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-[#D4C5B0] focus:border-[#8B6F47]"
                  />
                </div>
                <div className="flex gap-3">
                  <Select value={genreFilter} onValueChange={setGenreFilter}>
                    <SelectTrigger className="w-[180px] bg-white border-[#D4C5B0]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os gêneros</SelectItem>
                      {uniqueGenres.map((genre) => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handlePrintAll}
                    disabled={filteredProgressions.length === 0}
                    variant="outline"
                    className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Todas
                  </Button>

                  {isAdmin && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Progressão
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8">
              <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-[#D4C5B0]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                      <Waves className="w-6 h-6" />
                      {editingProgression ? "Editar Progressão" : "Nova Progressão"}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={resetForm}>
                      <X className="w-5 h-5 text-[#A68A64]" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[#8B6F47] font-medium">
                          Nome da Progressão *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Progressão Terra"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pattern" className="text-[#8B6F47] font-medium">
                          Padrão (Algarismos Romanos) *
                        </Label>
                        <Input
                          id="pattern"
                          value={formData.pattern}
                          onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                          placeholder="Ex: I-IV-V-I"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-[#8B6F47] font-medium">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Características, uso típico, sensação harmônica..."
                        className="border-[#D4C5B0] focus:border-[#8B6F47] h-24"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="common_keys" className="text-[#8B6F47] font-medium">
                          Tonalidades Comuns
                        </Label>
                        <Input
                          id="common_keys"
                          value={formData.common_keys}
                          onChange={(e) => setFormData({ ...formData, common_keys: e.target.value })}
                          placeholder="Ex: C, G, D (separar por vírgula)"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="genre_tags" className="text-[#8B6F47] font-medium">
                          Gêneros/Tags
                        </Label>
                        <Input
                          id="genre_tags"
                          value={formData.genre_tags}
                          onChange={(e) => setFormData({ ...formData, genre_tags: e.target.value })}
                          placeholder="Ex: sertanejo, forró (separar por vírgula)"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="examples" className="text-[#8B6F47] font-medium">
                          Exemplos de Músicas
                        </Label>
                        <Input
                          id="examples"
                          value={formData.examples}
                          onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
                          placeholder="Ex: Evidências, Boate Azul (separar por vírgula)"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[#8B6F47] font-medium">Variações</Label>
                        <Button
                          type="button"
                          onClick={addVariation}
                          size="sm"
                          variant="outline"
                          className="border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white">
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar Variação
                        </Button>
                      </div>

                      {formData.variations.map((variation, index) => (
                        <div key={index} className="p-3 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0]">
                          <div className="flex gap-2">
                            <div className="flex-1 space-y-2">
                              <Input
                                value={variation.name || ""}
                                onChange={(e) => updateVariation(index, 'name', e.target.value)}
                                placeholder="Nome da variação (opcional)"
                                className="border-[#D4C5B0] focus:border-[#8B6F47]"
                              />
                              <Input
                                value={variation.pattern}
                                onChange={(e) => updateVariation(index, 'pattern', e.target.value)}
                                placeholder="Padrão (ex: I-IV-I-V)"
                                className="border-[#D4C5B0] focus:border-[#8B6F47]"
                              />
                              <Input
                                value={variation.description || ""}
                                onChange={(e) => updateVariation(index, 'description', e.target.value)}
                                placeholder="Descrição (opcional)"
                                className="border-[#D4C5B0] focus:border-[#8B6F47]"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeVariation(index)}
                              className="text-red-600 hover:bg-red-50 self-start">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {/* Backing track da variação */}
                          <div className="mt-2 pt-2 border-t border-[#D4C5B0]/60">
                            <p className="text-xs text-[#A68A64] font-medium mb-1 flex items-center gap-1">
                              <Music className="w-3 h-3" /> Backing Track desta variação
                            </p>
                            <div className="flex gap-2 items-center">
                              <label className="flex items-center gap-1 cursor-pointer bg-white border border-dashed border-[#8B6F47]/40 hover:border-[#8B6F47] rounded px-3 py-1 text-xs text-[#8B6F47] transition-colors">
                                {uploadingVariationBacking[index] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                {uploadingVariationBacking[index] ? 'Enviando...' : 'Escolher MP3/MIDI'}
                                <input
                                  type="file"
                                  accept="audio/*,.mid,.midi"
                                  className="hidden"
                                  disabled={uploadingVariationBacking[index]}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingVariationBacking(prev => ({ ...prev, [index]: true }));
                                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                    updateVariation(index, 'backing_track_url', file_url);
                                    setUploadingVariationBacking(prev => ({ ...prev, [index]: false }));
                                  }}
                                />
                              </label>
                              {variation.backing_track_url && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 h-7 px-2 text-xs"
                                  onClick={() => updateVariation(index, 'backing_track_url', '')}
                                >
                                  <X className="w-3 h-3 mr-1" /> Remover
                                </Button>
                              )}
                            </div>
                            {variation.backing_track_url && (
                              <div className="mt-1">
                                <AudioOrMidi url={variation.backing_track_url} className="w-full h-9" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Backing Track */}
                    <div className="space-y-2 pt-2 border-t border-[#D4C5B0]">
                      <Label className="text-[#8B6F47] font-medium flex items-center gap-2">
                        🎵 Backing Track da Progressão
                      </Label>
                      <p className="text-xs text-[#A68A64]">Upload de um arquivo MP3 para usar como base de estudo desta progressão.</p>
                      <div className="flex gap-3 items-center">
                        <label className="flex items-center gap-2 cursor-pointer bg-[#F5F1E8] border border-dashed border-[#8B6F47]/40 hover:border-[#8B6F47] rounded-lg px-4 py-2 transition-colors">
                          {uploadingBacking ? <RefreshCw className="w-4 h-4 text-[#8B6F47] animate-spin" /> : <Upload className="w-4 h-4 text-[#8B6F47]" />}
                          <span className="text-sm text-[#8B6F47]">{uploadingBacking ? 'Enviando...' : 'Escolher MP3/MIDI'}</span>
                          <input
                            type="file"
                            accept="audio/*,.mid,.midi"
                            className="hidden"
                            disabled={uploadingBacking}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingBacking(true);
                              const { file_url } = await base44.integrations.Core.UploadFile({ file });
                              setFormData(prev => ({ ...prev, backing_track_url: file_url }));
                              setUploadingBacking(false);
                            }}
                          />
                        </label>
                        {formData.backing_track_url && (
                          <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                            onClick={() => setFormData(prev => ({ ...prev, backing_track_url: "" }))}>
                            <X className="w-4 h-4" /> Remover
                          </Button>
                        )}
                      </div>
                      {formData.backing_track_url && (
                        <div className="mt-2">
                          <AudioOrMidi url={formData.backing_track_url} className="w-full h-10" />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrintProgression}
                        className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                      </Button>
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">
                        <Save className="w-4 h-4 mr-2" />
                        {editingProgression ? "Atualizar" : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="border-[#D4C5B0]">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProgressions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16">
            <div className="w-24 h-24 bg-[#9CAF88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Waves className="w-12 h-12 text-[#9CAF88]" />
            </div>
            <h3 className="text-xl font-bold text-[#8B6F47] mb-2">
              {searchQuery || genreFilter !== "all" ? "Nenhuma progressão encontrada" : "Nenhuma progressão cadastrada"}
            </h3>
            <p className="text-[#A68A64] mb-6">
              {searchQuery || genreFilter !== "all" ? "Tente ajustar os filtros de busca" : "Comece criando sua primeira progressão"}
            </p>
            {!searchQuery && genreFilter === "all" && isAdmin && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Progressão
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProgressions.map((progression, index) => (
              <motion.div
                key={progression.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}>
                <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-xl text-[#8B6F47] mb-2">
                          {progression.name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white font-mono">
                            {progression.pattern}
                          </Badge>
                          {progression.alias_de && (
                            <Badge variant="outline" className="bg-[#8B6F47]/10 text-[#8B6F47] border-[#8B6F47]/40">
                              = {progression.alias_de}
                            </Badge>
                          )}
                          {progression.genre_tags && progression.genre_tags.length > 0 && (
                            progression.genre_tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="bg-[#9CAF88]/10 text-[#9CAF88] border-[#9CAF88]/30">
                                {tag}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrintProgression(progression)}
                          className="text-[#D4AF37] hover:bg-[#D4AF37]/10"
                          title="Imprimir esta progressão">
                          <Printer className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(progression)}
                              className="text-[#8B6F47] hover:bg-[#8B6F47]/10">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir "${progression.name}"?`)) {
                                  deleteMutation.mutate(progression.id);
                                }
                              }}
                              className="text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1">
                    {progression.description && (
                      <p className="text-sm text-[#8B6F47]">{progression.description}</p>
                    )}



                    {progression.variations && progression.variations.length > 0 && (
                      <div>
                        <p className="text-xs text-[#A68A64] font-medium mb-1">
                          Variações ({progression.variations.length}):
                        </p>
                        <div className="space-y-1">
                          {progression.variations.slice(0, 2).map((variation, idx) => (
                            <div key={idx} className="text-xs bg-[#F5F1E8] p-2 rounded">
                              <span className="font-mono text-[#8B6F47] font-semibold">
                                {variation.pattern}
                              </span>
                              {variation.name && (
                                <span className="text-[#A68A64] ml-2">- {variation.name}</span>
                              )}
                            </div>
                          ))}
                          {progression.variations.length > 2 && (
                            <p className="text-xs text-[#A68A64]">
                              + {progression.variations.length - 2} mais...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {progression.examples && progression.examples.length > 0 && (
                      <div>
                        <p className="text-xs text-[#A68A64] font-medium mb-1">Exemplos:</p>
                        <p className="text-xs text-[#8B6F47]">
                          {progression.examples.slice(0, 2).join(", ")}
                          {progression.examples.length > 2 && ` +${progression.examples.length - 2}`}
                        </p>
                      </div>
                    )}

                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchProgression(progression)}
                        className="w-full border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Buscar músicas com esta progressão
                      </Button>
                    </div>

                    {progression.backing_track_url && (
                      <div className="pt-2 border-t border-[#D4C5B0]">
                        <p className="text-xs text-[#A68A64] font-medium mb-1">🎵 Backing Track:</p>
                        <AudioOrMidi url={progression.backing_track_url} className="w-full h-9" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </div>

    {showEnriquecerIA && (
      <EnriquecerProgressoesIA
        onClose={() => setShowEnriquecerIA(false)}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['progressions'] })}
      />
    )}

    {searchProgression && (
      <ProgressionSongSearch
        progression={searchProgression}
        songs={songs}
        onClose={() => setSearchProgression(null)}
      />
    )}
    </>
  );
}