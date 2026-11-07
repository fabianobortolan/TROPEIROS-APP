import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Loader2, Upload, Trash2, Maximize, Minimize, Music4, Download, CaseUpper } from "lucide-react";
import { motion } from "framer-motion";
import { uppercaseSelection } from "@/utils/textCaseUtils";
import { revalidateAndPersist } from "@/utils/revalidateAudit";

export default function SongEditForm({ song, onClose }) {
  const queryClient = useQueryClient();
  const cifraTextareaRef = useRef(null);

  // Autocompletar de artistas (valores já usados na biblioteca)
  const [artistOptions, setArtistOptions] = useState([]);
  useEffect(() => {
    base44.entities.Song.list({ distinct: "artist" })
      .then((res) => setArtistOptions((res.items || []).sort((a, b) => a.localeCompare(b, "pt-BR"))))
      .catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    title: song.title || "",
    artist: song.artist || "",
    author: song.author || "",
    year: song.year || "",
    general_notes: song.general_notes || "",
    genre_style: song.genre_style || "sertanejo_universitario",
    rhythm_id: song.rhythm_id && song.rhythm_id !== "" ? song.rhythm_id : "none",
    main_key: song.main_key || "",
    original_key: song.original_key || "",
    tempo: song.tempo || "",
    duration: song.duration || "",
    cifra_text: song.cifra_text || "",
    playback_url: song.playback_url || "",
    is_fully_revised: song.is_fully_revised || false,
    chord_count: song.chord_count || ""
  });
  
  const [uploadingPlayback, setUploadingPlayback] = useState(false);
  const [isFullscreenCifra, setIsFullscreenCifra] = useState(false);

  const { data: rhythmsData } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    staleTime: 0,
    refetchOnMount: true,
  });
  const rhythms = rhythmsData || [];

  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.entities.Song.update(id, data);
      return result;
    },
    onSuccess: async (savedData) => {
      // Revalida a auditoria com o conteúdo recém-salvo para que os alertas
      // refletiam a versão corrigida (ex: marcador de seção consertado).
      try {
        await revalidateAndPersist(song.id);
      } catch (e) {
        console.warn('Erro ao revalidar auditoria:', e);
      }
      await queryClient.invalidateQueries({ queryKey: ['songs'] });
      setSaveSuccess(true);
      setTimeout(() => {
        if (!isFullscreenCifra) {
          onClose();
          window.location.reload();
        } else {
          setSaveSuccess(false);
        }
      }, 800);
    },
    onError: (error) => {
      console.error("Erro ao salvar:", error);
      alert(`Erro ao salvar: ${error.message}`);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (updateMutation.isPending) return;

    const selectedRhythm = formData.rhythm_id && formData.rhythm_id !== "none"
      ? rhythms.find(r => r.id === formData.rhythm_id)
      : null;

    const dataToSave = {
      title: formData.title?.trim() || song.title,
      artist: formData.artist?.trim() || song.artist,
      author: formData.author?.trim() || null,
      year: formData.year ? Number(formData.year) : null,
      general_notes: formData.general_notes?.trim() || null,
      genre_style: formData.genre_style || song.genre_style,
      main_key: formData.main_key?.trim() || null,
      original_key: formData.original_key?.trim() || null,
      tempo: formData.tempo ? Number(formData.tempo) : null,
      duration: formData.duration?.trim() || null,
      cifra_text: formData.cifra_text || null,
      playback_url: formData.playback_url?.trim() || null,
      rhythm_id: selectedRhythm ? selectedRhythm.id : null,
      rhythm_name: selectedRhythm ? selectedRhythm.name : null,
      is_fully_revised: Boolean(formData.is_fully_revised),
      chord_count: formData.chord_count ? Number(formData.chord_count) : null
    };

    await updateMutation.mutateAsync({ id: song.id, data: dataToSave });
  };

  const handlePlaybackUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida tipo de arquivo de áudio
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      alert('Por favor, selecione um arquivo de áudio válido (MP3, WAV, OGG, M4A)');
      return;
    }

    // Limite de 50MB
    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande. O tamanho máximo é 50MB');
      return;
    }

    // 🎵 RECONHECE BPM AUTOMATICAMENTE DO NOME DO ARQUIVO
    const extractBPMFromFilename = (filename) => {
      // Padrões possíveis: "120bpm", "120 bpm", "bpm120", "BPM 120", "[120]", "(120bpm)", etc.
      const patterns = [
        /(\d{2,3})\s*bpm/i,        // 120bpm, 120 bpm
        /bpm\s*(\d{2,3})/i,        // bpm120, bpm 120
        /\[(\d{2,3})\]/,           // [120]
        /\((\d{2,3})\s*bpm\)/i,    // (120bpm)
        /_(\d{2,3})_/,             // _120_
        /-(\d{2,3})-/,             // -120-
      ];

      for (const pattern of patterns) {
        const match = filename.match(pattern);
        if (match) {
          const bpm = parseInt(match[1]);
          // Valida se o BPM está em um range razoável (40-240)
          if (bpm >= 40 && bpm <= 240) {
            console.log(`🎵 BPM detectado no arquivo: ${bpm}`);
            return bpm;
          }
        }
      }
      return null;
    };

    const detectedBPM = extractBPMFromFilename(file.name);

    setUploadingPlayback(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Detecta a duração do áudio automaticamente
      const audio = new Audio(file_url);
      audio.addEventListener('loadedmetadata', () => {
        const durationInSeconds = Math.floor(audio.duration);
        const minutes = Math.floor(durationInSeconds / 60);
        const seconds = durationInSeconds % 60;
        const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        console.log("⏱️ Duração detectada:", formattedDuration, `(${durationInSeconds}s)`);
        
        const updatedData = { 
          ...formData, 
          playback_url: file_url,
          duration: formattedDuration
        };

        // Se detectou BPM no nome do arquivo, atualiza automaticamente
        if (detectedBPM && !formData.tempo) {
          updatedData.tempo = detectedBPM;
          console.log(`✅ BPM atualizado automaticamente: ${detectedBPM}`);
        }
        
        setFormData(updatedData);
      });
      audio.load();
      
      // Timeout para fallback caso não consiga detectar duração
      setTimeout(() => {
        if (!formData.duration) {
          const updatedData = { ...formData, playback_url: file_url };
          
          // Aplica BPM mesmo se duração não foi detectada
          if (detectedBPM && !formData.tempo) {
            updatedData.tempo = detectedBPM;
            console.log(`✅ BPM atualizado automaticamente (fallback): ${detectedBPM}`);
          }
          
          setFormData(updatedData);
        }
      }, 3000);
      
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      alert('Erro ao fazer upload do playback');
    } finally {
      setUploadingPlayback(false);
      e.target.value = '';
    }
  };

  // Modo tela cheia apenas para a cifra
  if (isFullscreenCifra) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#F5F1E8] z-[60] flex flex-col"
        style={{
          margin: 0,
          padding: 0,
          width: '100vw',
          height: '100vh'
        }}
      >
        {/* Header fixo */}
        <div className="sticky top-0 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white p-4 z-10 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{formData.title || 'Editar Cifra'}</h2>
              <p className="text-sm text-white/90">{formData.artist || 'Artista'}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // Escapar HTML para preservar caracteres especiais
                  const escapeHtml = (text) => {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                  };

                  // Criar conteúdo HTML para o documento com formatação preservada
                  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(formData.title || 'Cifra')} - ${escapeHtml(formData.artist || 'Artista')}</title>
  <style>
    * { margin: 0; padding: 0; }
    @page { margin: 2cm; }
    body { 
      font-family: 'Courier New', 'Courier', monospace; 
      font-size: 15pt;
      line-height: 1.4;
      margin: 0;
      padding: 20pt;
    }
    h1 { 
      color: #000000; 
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 2pt;
      text-align: center;
    }
    h2 { 
      color: #000000; 
      font-size: 14pt; 
      font-weight: normal;
      margin-bottom: 2pt;
      margin-top: 2pt;
      text-align: center;
    }
    .info { 
      margin-bottom: 10pt; 
      color: #666; 
      font-size: 11pt;
      text-align: center;
    }
    .info p { margin: 3pt 0; }
    .cifra { 
      white-space: pre;
      font-family: 'Courier New', 'Courier', monospace;
      font-size: 15pt;
      line-height: 1.4;
      overflow-x: auto;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(formData.title || 'Sem título')}</h1>
  <h2>${escapeHtml(formData.artist || 'Sem artista')}</h2>
  <div class="info">
${formData.main_key ? `    <p style="margin: 2pt 0;"><strong>Tom:</strong> ${escapeHtml(formData.main_key)}</p>` : ''}
  </div>
  <div class="cifra">${escapeHtml(formData.cifra_text || 'Sem cifra')}</div>
</body>
</html>`;
                  
                  // Criar blob e download
                  const blob = new Blob([htmlContent], { type: 'application/msword' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${formData.title || 'cifra'} - ${formData.artist || 'artista'}.doc`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button
                onClick={async () => {
                  const selectedRhythm = formData.rhythm_id && formData.rhythm_id !== "none"
                    ? rhythms.find(r => r.id === formData.rhythm_id)
                    : null;
                  const dataToSave = {
                    title: formData.title?.trim() || song.title,
                    artist: formData.artist?.trim() || song.artist,
                    author: formData.author?.trim() || null,
                    year: formData.year ? Number(formData.year) : null,
                    general_notes: formData.general_notes?.trim() || null,
                    genre_style: formData.genre_style || null,
                    main_key: formData.main_key?.trim() || null,
                    original_key: formData.original_key?.trim() || null,
                    tempo: formData.tempo ? Number(formData.tempo) : null,
                    duration: formData.duration?.trim() || null,
                    cifra_text: formData.cifra_text || null,
                    playback_url: formData.playback_url?.trim() || null,
                    rhythm_id: selectedRhythm ? selectedRhythm.id : null,
                    rhythm_name: selectedRhythm ? selectedRhythm.name : null,
                    is_fully_revised: Boolean(formData.is_fully_revised),
                    chord_count: formData.chord_count ? Number(formData.chord_count) : null
                  };
                  await updateMutation.mutateAsync({ id: song.id, data: dataToSave });
                }}
                disabled={updateMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
              <Button
               onClick={() => setIsFullscreenCifra(false)}
               className="bg-white/20 hover:bg-white/30 text-white min-w-[100px] min-h-[44px] touch-manipulation"
               size="sm"
              >
               <Minimize className="w-5 h-5 mr-2" />
               Fechar
              </Button>
            </div>
          </div>
        </div>

        {/* Editor de cifra em tela cheia */}
        <div className="flex-1 overflow-hidden p-4">
          <Textarea
            value={formData.cifra_text}
            onChange={(e) => setFormData({ ...formData, cifra_text: e.target.value })}
            placeholder="Cole a cifra da música aqui..."
            className="w-full h-full font-mono text-base border-[#D4C5B0] focus:border-[#8B6F47] resize-none"
            style={{
              minHeight: 'calc(100vh - 120px)'
            }}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#F5F1E8] z-50 overflow-y-auto"
    >
      <div className="sticky top-0 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white p-4 z-10 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Editar Música</h2>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-10 w-10 p-0 flex items-center justify-center rounded-full"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Card className="border-[#D4C5B0] bg-white shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[#8B6F47] font-medium">
                    Título *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Nome da música"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist" className="text-[#8B6F47] font-medium">
                    Artista *
                  </Label>
                  <Input
                    id="artist"
                    list="artist-options"
                    value={formData.artist}
                    onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                    placeholder="Nome do artista"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                    required
                  />
                  <datalist id="artist-options">
                    {artistOptions.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Autor, Ano e Observações Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="author" className="text-[#8B6F47] font-medium">
                    Compositor / Autor
                  </Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Nome do compositor"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year" className="text-[#8B6F47] font-medium">
                    Ano de Lançamento
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="Ex: 1995"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                    min="1900"
                    max="2099"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="general_notes" className="text-[#8B6F47] font-medium">
                  Observações Gerais
                </Label>
                <Textarea
                  id="general_notes"
                  value={formData.general_notes}
                  onChange={(e) => setFormData({ ...formData, general_notes: e.target.value })}
                  placeholder="Informações adicionais sobre a música, história, contexto, etc."
                  className="h-24 text-sm border-[#D4C5B0] focus:border-[#8B6F47]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="main_key" className="text-[#8B6F47] font-medium">
                    Tom Atual
                  </Label>
                  <Input
                    id="main_key"
                    value={formData.main_key}
                    onChange={(e) => setFormData({ ...formData, main_key: e.target.value })}
                    placeholder="Ex: C, G, D"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="original_key" className="text-[#8B6F47] font-medium">
                    Tom Original
                  </Label>
                  <Input
                    id="original_key"
                    value={formData.original_key}
                    onChange={(e) => setFormData({ ...formData, original_key: e.target.value })}
                    placeholder="Ex: C, G, D"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tempo" className="text-[#8B6F47] font-medium">
                    BPM
                  </Label>
                  <Input
                    id="tempo"
                    type="number"
                    value={formData.tempo}
                    onChange={(e) => setFormData({ ...formData, tempo: e.target.value })}
                    placeholder="Ex: 120"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-[#8B6F47] font-medium">
                    Duração
                  </Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="Ex: 3:45"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chord_count" className="text-[#8B6F47] font-medium">
                    Qtd. Acordes (excl. intro)
                  </Label>
                  <Input
                    id="chord_count"
                    type="number"
                    value={formData.chord_count}
                    onChange={(e) => setFormData({ ...formData, chord_count: e.target.value })}
                    placeholder="Ex: 4"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                    min="1"
                    max="50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="genre_style" className="text-[#8B6F47] font-medium">
                    Estilo
                  </Label>
                  <Select
                    value={formData.genre_style}
                    onValueChange={(value) => setFormData({ ...formData, genre_style: value })}
                  >
                    <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sertanejo_raiz">Sertanejo Raiz</SelectItem>
                      <SelectItem value="sertanejo_universitario">Sertanejo Universitário</SelectItem>
                      <SelectItem value="sertanejo_romantico">Sertanejo Romântico</SelectItem>
                      <SelectItem value="sertanejo_moderno">Sertanejo Moderno</SelectItem>
                      <SelectItem value="sertanejo_modao">🪗 Sertanejo Modão</SelectItem>
                      <SelectItem value="pop_rock">🎵 Pop/Rock</SelectItem>
                      <SelectItem value="mpb">🎵 MPB</SelectItem>
                      <SelectItem value="samba">🥁 Samba</SelectItem>
                      <SelectItem value="forro">🪗 Forró</SelectItem>
                      <SelectItem value="religioso">🙏 Religioso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rhythm" className="text-[#8B6F47] font-medium">
                    Ritmo
                  </Label>
                  <Select
                    value={formData.rhythm_id}
                    onValueChange={(value) => setFormData({ ...formData, rhythm_id: value })}
                  >
                    <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                      <SelectValue placeholder="Selecione um ritmo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {rhythms.map((rhythm) => (
                        <SelectItem key={rhythm.id} value={rhythm.id}>
                          {rhythm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Playback Upload */}
              <div className="space-y-2">
                <Label className="text-[#8B6F47] font-medium">
                  Playback / Base (para tocar junto)
                </Label>
                
                {formData.playback_url ? (
                  <div className="flex items-center gap-3 p-3 bg-[#9CAF88]/10 rounded-lg border border-[#9CAF88]/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#8B6F47]">✅ Playback anexado</p>
                      <audio controls src={formData.playback_url} className="w-full mt-2 h-10" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, playback_url: "" })}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a"
                      onChange={handlePlaybackUpload}
                      disabled={uploadingPlayback}
                      className="hidden"
                      id="playback-upload"
                    />
                    <label
                      htmlFor="playback-upload"
                      className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                        uploadingPlayback 
                          ? 'border-[#8B6F47] bg-[#8B6F47]/5 cursor-wait' 
                          : 'border-[#D4C5B0] hover:border-[#8B6F47] hover:bg-[#8B6F47]/5'
                      }`}
                    >
                      {uploadingPlayback ? (
                        <>
                          <Loader2 className="w-5 h-5 text-[#8B6F47] animate-spin" />
                          <span className="text-[#8B6F47]">Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-[#A68A64]" />
                          <span className="text-[#A68A64]">Clique para enviar o playback (MP3, WAV, OGG, M4A)</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
                <p className="text-xs text-[#A68A64]">
                  💡 Adicione uma base/playback para facilitar o estudo e prática da música
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cifra_text" className="text-[#8B6F47] font-medium">
                    Cifra
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => uppercaseSelection(cifraTextareaRef.current, formData.cifra_text || "", (v) => setFormData({ ...formData, cifra_text: v }))}
                      className="border-[#D4AF37] text-[#8B6F47] hover:bg-[#D4AF37] hover:text-white"
                      title="Selecione um trecho para colocar em caixa alta (ou clique para converter tudo)"
                    >
                      <CaseUpper className="w-4 h-4 mr-2" />
                      Caixa Alta
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullscreenCifra(true)}
                      className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                    >
                      <Maximize className="w-4 h-4 mr-2" />
                      Tela Cheia
                    </Button>
                  </div>
                </div>
                <Textarea
                  ref={cifraTextareaRef}
                  id="cifra_text"
                  value={formData.cifra_text}
                  onChange={(e) => setFormData({ ...formData, cifra_text: e.target.value })}
                  placeholder="Cole a cifra da música aqui..."
                  className="h-48 font-mono text-sm border-[#D4C5B0] focus:border-[#8B6F47]"
                />
              </div>

              {/* Checkbox de revisão completa */}
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <input
                  type="checkbox"
                  id="is_fully_revised"
                  checked={formData.is_fully_revised}
                  onChange={(e) => setFormData({ ...formData, is_fully_revised: e.target.checked })}
                  className="w-5 h-5 accent-green-600 cursor-pointer"
                />
                <Label htmlFor="is_fully_revised" className="text-green-800 font-semibold cursor-pointer flex items-center gap-2 text-base">
                  ✅ Música totalmente revisada e corrigida
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-[#D4C5B0] text-[#8B6F47]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || saveSuccess}
                  className={`${saveSuccess ? 'bg-green-600' : 'bg-gradient-to-r from-[#8B6F47] to-[#A68A64]'} text-white`}
                >
                  {saveSuccess ? (
                    <>
                      ✓ Salvo!
                    </>
                  ) : updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}