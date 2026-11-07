import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Music, CheckCircle, AlertCircle, Search, RotateCcw, ShieldOff, CheckSquare, Square, Minus, Zap, Clock, Wand2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { identifySongProgressions, reanalyzeSongWithIA } from "@/utils/batchReanalysis";
import { analisarComMotor, isSertaneja, MOTOR_VERSION, salvarComRetry, pausa } from "@/utils/motorReanalysis";
import { queryClientInstance } from "@/lib/query-client";

const GENRE_LABELS = {
  sertanejo_raiz: "🌾 Raiz",
  sertanejo_universitario: "🎓 Universitário",
  sertanejo_romantico: "💕 Romântico",
  sertanejo_moderno: "🎸 Moderno",
  sertanejo_modao: "🪗 Modão",
  pop_rock: "🎵 Pop/Rock",
  mpb: "🎶 MPB",
  samba: "🥁 Samba",
  forro: "🪗 Forró",
};

const BATCH_SIZE = 3; // músicas por lote (para não sobrecarregar a API)
const BATCH_SIZE_IDENTIFY = 10; // identificação rápida pode processar mais de uma vez
const BATCH_SIZE_MOTOR = 10; // motor harmônico: determinístico, só gravação no banco
const MOTOR_PAUSA_MS = 400; // pausa entre gravações para não estourar o limite de taxa do Base44

export default function ReanaliseEmLote() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [search, setSearch] = useState("");
  const [recentOnly, setRecentOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [currentBatch, setCurrentBatch] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => { setCurrentUser(u); setLoadingUser(false); }).catch(() => setLoadingUser(false));
  }, []);

  const { data: songs = [], isLoading: songsLoading, refetch: refetchSongs } = useQuery({
    queryKey: ['songs', 'reanalise-lote'],
    queryFn: () => base44.fetchAllSongs(),
    enabled: !!currentUser && currentUser.role === 'admin',
    staleTime: 0,
  });

  const sertanejas = songs.filter(isSertaneja);
  const pendentes = sertanejas.filter(s => s.analysis_engine !== MOTOR_VERSION && s.cifra_text && s.cifra_text.trim());

  const filteredSongs = songs.filter(s => {
    if (recentOnly) {
      const created = s.created_date ? new Date(s.created_date) : null;
      if (!created) return false;
      const diff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (diff > 30) return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.title?.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q);
  });

  const allFilteredSelected = filteredSongs.length > 0 && filteredSongs.every(s => selectedIds.has(s.id));
  const someFilteredSelected = filteredSongs.some(s => selectedIds.has(s.id)) && !allFilteredSelected;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredSongs.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredSongs.forEach(s => next.add(s.id));
        return next;
      });
    }
  };

  const toggleSong = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // mode: 'motor' (Motor Harmônico) | 'identify' (rápido antigo) | 'ia' (LLM)
  const runBatch = async (ids, mode) => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);

    const batchSize = mode === 'motor' ? BATCH_SIZE_MOTOR : mode === 'identify' ? BATCH_SIZE_IDENTIFY : BATCH_SIZE;
    const allResults = { success: [], skipped: [], errors: [], warnings: [], mode };
    const totalBatches = Math.ceil(ids.length / batchSize);

    let knownProgressions = [], learningPatterns = [];
    try {
      [knownProgressions, learningPatterns] = await Promise.all([
        base44.entities.Progression.list(),
        base44.entities.LearningPattern.list(),
      ]);
    } catch (err) {
      allResults.errors.push({ id: '-', reason: 'Falha ao carregar progressões cadastradas: ' + err.message });
      setResults(allResults);
      setCurrentBatch(null);
      setIsRunning(false);
      return;
    }

    const songById = new Map(songs.map(s => [s.id, s]));

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      setCurrentBatch(`Lote ${batchNum} de ${totalBatches} (${i + 1}–${Math.min(i + batch.length, ids.length)} de ${ids.length})`);

      for (const songId of batch) {
        const song = songById.get(songId);
        if (!song) {
          allResults.errors.push({ id: songId, reason: 'Música não encontrada' });
          continue;
        }
        try {
          const result = mode === 'motor'
            ? analisarComMotor(song, knownProgressions)
            : mode === 'identify'
              ? identifySongProgressions(song, knownProgressions, learningPatterns)
              : await reanalyzeSongWithIA(
                  song,
                  knownProgressions,
                  learningPatterns,
                  (payload) => base44.integrations.Core.InvokeLLM(payload)
                );

          if (result.skipped) {
            allResults.skipped.push({ id: songId, title: song.title, reason: result.reason });
          } else {
            if (mode === 'motor') {
              await salvarComRetry(() => base44.entities.Song.update(songId, result.updates));
              await pausa(MOTOR_PAUSA_MS);
            } else {
              await base44.entities.Song.update(songId, result.updates);
            }
            allResults.success.push({ id: songId, title: song.title, predominant: result.updates.predominant_progression });
            if (result.warnings && result.warnings.length) {
              allResults.warnings.push({ id: songId, title: song.title, text: result.warnings.join(' | ') });
            }
          }
        } catch (err) {
          allResults.errors.push({ id: songId, reason: `${song.title}: ${err.message}` });
        }
      }

      setProgress(Math.round(((i + batch.length) / ids.length) * 100));
    }

    queryClientInstance.invalidateQueries({ queryKey: ['songs'] });
    refetchSongs();
    setResults(allResults);
    setCurrentBatch(null);
    setIsRunning(false);
  };

  const handleMotorPendentes = async () => {
    const ids = pendentes.map(s => s.id);
    if (ids.length === 0) return;
    setSelectedIds(new Set(ids));
    await runBatch(ids, 'motor');
  };

  const handleMotorTodas = async () => {
    if (!confirm(`Refazer a análise das ${sertanejas.length} sertanejas, inclusive as já processadas?`)) return;
    const ids = sertanejas.map(s => s.id);
    setSelectedIds(new Set(ids));
    await runBatch(ids, 'motor');
  };

  const handleIdentifyAll = async () => {
    const allIds = songs.map(s => s.id);
    setSelectedIds(new Set(allIds));
    await runBatch(allIds, 'identify');
  };

  const handleReanalizeAll = async () => {
    const allIds = songs.map(s => s.id);
    setSelectedIds(new Set(allIds));
    await runBatch(allIds, 'ia');
  };

  const handleStart = async (mode) => {
    if (selectedIds.size === 0) return;
    await runBatch(Array.from(selectedIds), mode);
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B6F47]" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-red-200 shadow-xl">
          <CardContent className="p-10 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldOff className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-3">Acesso Restrito</h2>
            <p className="text-gray-600 mb-6">Esta funcionalidade é exclusiva para administradores.</p>
            <Button onClick={() => navigate(createPageUrl("Library"))} className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Biblioteca
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Button variant="ghost" onClick={() => navigate(createPageUrl("Analyze"))}
            className="mb-4 text-[#8B6F47] hover:text-[#A68A64] hover:bg-[#8B6F47]/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Analisar Música
          </Button>
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2">Reanálise em Lote</h1>
          <p className="text-[#A68A64] mb-4">Reanalise as progressões harmônicas de várias músicas de uma vez</p>

          {!isRunning && !results && songs.length > 0 && (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] rounded-xl p-4 text-white shadow-md space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  Motor Harmônico — sertanejas: {sertanejas.length - pendentes.length} processadas, {pendentes.length} pendentes
                </p>
                <p className="text-xs text-white/85">
                  Lê a cifra em ordem e grava, por seção: graus, acordes de preparação (V7/x, ii–V, SubV, diminutos), caídas/subidas cromáticas e diatônicas, empréstimos, cadências e a progressão do catálogo com a variação. Não usa IA nem créditos. A análise antiga fica guardada em backup. Grava devagar e repete automaticamente se o servidor recusar — deixe a página aberta até o fim.
                </p>
                <Button
                  onClick={handleMotorPendentes}
                  disabled={isRunning || songsLoading || pendentes.length === 0}
                  className="w-full bg-white text-[#8B6F47] hover:bg-amber-50 font-bold gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  {pendentes.length > 0 ? `Processar as ${pendentes.length} sertanejas pendentes` : 'Todas as sertanejas já foram processadas'}
                </Button>
                <button onClick={handleMotorTodas} disabled={isRunning || songsLoading} className="text-xs underline text-white/80 hover:text-white">
                  Refazer todas as {sertanejas.length} sertanejas
                </button>
              </div>

              <div className="bg-gradient-to-r from-[#8B6F47]/10 to-[#D4AF37]/10 border border-[#D4AF37]/40 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-[#8B6F47] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#D4AF37]" />
                  Métodos antigos — toda a biblioteca ({songs.length} músicas)
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleIdentifyAll}
                    disabled={isRunning || songsLoading}
                    variant="outline"
                    className="flex-1 border-[#9CAF88] text-[#8B6F47] hover:bg-[#9CAF88]/10 font-semibold gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Identificar Progressões (antigo)
                  </Button>
                  <Button
                    onClick={handleReanalizeAll}
                    disabled={isRunning || songsLoading}
                    variant="outline"
                    className="flex-1 border-[#D4AF37] text-[#8B6F47] hover:bg-[#D4AF37]/10 font-semibold gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reanalisar com IA (completo)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {results && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6">
              <Card className="border-[#9CAF88] bg-white shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Reanálise Concluída{results.mode === 'motor' ? ' — Motor Harmônico' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-green-700">{results.success.length}</p>
                      <p className="text-xs text-green-600 font-medium">Atualizadas</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-amber-700">{results.warnings.length}</p>
                      <p className="text-xs text-amber-600 font-medium">Com aviso de tom</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-yellow-700">{results.skipped.length}</p>
                      <p className="text-xs text-yellow-600 font-medium">Puladas (sem cifra)</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-red-700">{results.errors.length}</p>
                      <p className="text-xs text-red-600 font-medium">Erros</p>
                    </div>
                  </div>

                  {results.errors.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-red-600 mb-2">❌ Erros (clique de novo em "Processar pendentes" para tentar só estas):</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {results.errors.map((e, i) => (
                          <div key={e.id + '-' + i} className="text-sm bg-red-50 px-3 py-1.5 rounded-lg text-red-700">
                            {e.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.warnings.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Conferir tom cadastrado:</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {results.warnings.map(w => (
                          <div key={w.id} className="text-sm bg-amber-50 px-3 py-1.5 rounded-lg text-amber-800">
                            <strong>{w.title}</strong> — {w.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.success.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-[#8B6F47] mb-2">✅ Músicas atualizadas:</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {results.success.map(s => (
                          <div key={s.id} className="flex items-center justify-between text-sm bg-green-50 px-3 py-1.5 rounded-lg">
                            <span className="text-gray-700 font-medium truncate">{s.title}</span>
                            {s.predominant && <Badge className="bg-green-600 text-white text-xs ml-2 shrink-0">{s.predominant}</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.skipped.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-yellow-700 mb-2">⏭️ Puladas:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {results.skipped.map(s => (
                          <div key={s.id} className="text-sm bg-yellow-50 px-3 py-1.5 rounded-lg text-yellow-800">
                            {s.title}: {s.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={() => { setResults(null); setSelectedIds(new Set()); }}
                    className="w-full bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Nova Reanálise
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {isRunning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <Card className="border-[#D4AF37] bg-white shadow-md">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#8B6F47]" />
                  <div>
                    <p className="font-semibold text-[#8B6F47]">Reanálise em andamento... não feche esta página</p>
                    <p className="text-sm text-[#A68A64]">{currentBatch}</p>
                  </div>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-[#A68A64] text-right">{progress}% concluído</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!isRunning && !results && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-[#D4C5B0] bg-white shadow-xl">
              <CardHeader className="border-b border-[#D4C5B0]">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Selecionar Músicas
                    <Badge className="bg-[#8B6F47] text-white">{selectedIds.size} selecionadas</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={recentOnly ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRecentOnly(v => !v)}
                      className={recentOnly
                        ? "bg-[#D4AF37] text-white hover:bg-[#D4AF37]/90 text-xs gap-1"
                        : "border-[#D4AF37] text-[#A68A64] hover:bg-[#D4AF37]/10 text-xs gap-1"}
                      title="Mostrar apenas músicas adicionadas nos últimos 30 dias"
                    >
                      <Clock className="w-4 h-4" />
                      Recentes (30 dias)
                    </Button>
                    <Button variant="outline" size="sm" onClick={toggleSelectAll}
                      className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white text-xs gap-1">
                      {allFilteredSelected ? <CheckSquare className="w-4 h-4" /> : someFilteredSelected ? <Minus className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      {allFilteredSelected ? "Desmarcar todas" : "Selecionar todas"}
                    </Button>
                  </div>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A68A64]" />
                  <Input
                    placeholder="Buscar por título ou artista..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 border-[#D4C5B0] focus:border-[#8B6F47]"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {songsLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#8B6F47]" />
                  </div>
                ) : filteredSongs.length === 0 ? (
                  <div className="text-center p-12 text-[#A68A64]">
                    <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma música encontrada</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E8DCC4] max-h-[50vh] overflow-y-auto">
                    {filteredSongs.map(song => {
                      const isSelected = selectedIds.has(song.id);
                      return (
                        <div
                          key={song.id}
                          onClick={() => toggleSong(song.id)}
                          className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-[#8B6F47]/10' : 'hover:bg-[#F5F1E8]'}`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${isSelected ? 'bg-[#8B6F47] border-[#8B6F47]' : 'border-[#D4C5B0]'}`}>
                            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{song.title}</p>
                            <p className="text-sm text-[#A68A64] truncate">{song.artist}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {song.main_key && <Badge variant="outline" className="text-xs">{song.main_key}</Badge>}
                            {song.genre_style && <Badge className="bg-[#E8DCC4] text-[#8B6F47] text-xs">{GENRE_LABELS[song.genre_style] || song.genre_style}</Badge>}
                            {song.analysis_engine && <Badge className="bg-[#8B6F47] text-white text-[10px] hidden sm:inline-flex">motor</Badge>}
                            {song.predominant_progression && (
                              <Badge className="bg-[#8B6F47]/20 text-[#8B6F47] text-xs hidden sm:inline-flex">{song.predominant_progression}</Badge>
                            )}
                            {!song.cifra_text && (
                              <Badge className="bg-red-100 text-red-600 text-xs">Sem cifra</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="p-4 border-t border-[#D4C5B0] bg-[#F5F1E8]">
                  {selectedIds.size > 0 && (
                    <Alert className="mb-3 border-amber-300 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 text-sm">
                        <strong>{selectedIds.size} música(s)</strong> selecionadas. <strong>Motor Harmônico</strong> lê a cifra e analisa preparos, caídas/subidas e progressões em ordem (recomendado, sem IA). <strong>Identificar</strong> usa o método antigo. <strong>Reanalisar com IA</strong> re-processa com IA (lento, usa créditos).
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleStart('motor')}
                      disabled={selectedIds.size === 0 || isRunning}
                      className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white h-12 text-base font-semibold gap-2">
                      <Wand2 className="w-5 h-5" />
                      Motor Harmônico ({selectedIds.size})
                    </Button>
                    <Button
                      onClick={() => handleStart('identify')}
                      disabled={selectedIds.size === 0 || isRunning}
                      variant="outline"
                      className="flex-1 border-[#9CAF88] text-[#8B6F47] hover:bg-[#9CAF88]/10 h-12 text-base font-semibold gap-2">
                      <Zap className="w-5 h-5" />
                      Identificar ({selectedIds.size})
                    </Button>
                    <Button
                      onClick={() => handleStart('ia')}
                      disabled={selectedIds.size === 0 || isRunning}
                      variant="outline"
                      className="flex-1 border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47]/10 h-12 text-base font-semibold gap-2">
                      <RotateCcw className="w-5 h-5" />
                      Reanalisar com IA ({selectedIds.size})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
