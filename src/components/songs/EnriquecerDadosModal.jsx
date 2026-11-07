import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, CheckCircle, AlertCircle, Clock, BookOpen, User, Calendar, FileText, Loader2 } from "lucide-react";

export default function EnriquecerDadosModal({ onClose, onDone }) {
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  // Busca dados FRESCOS do banco ao abrir o modal
  useEffect(() => {
    setLoadingQueue(true);
    base44.fetchAllSongs().then(freshSongs => {
      const incomplete = freshSongs.filter(s => !s.author || !s.year || !s.original_key || !s.general_notes);
      setQueue(incomplete);
      setLoadingQueue(false);
    });
  }, []);

  const total = queue.length;

  const enrichSong = async (song) => {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Pesquise informações sobre a música "${song.title}" gravada por "${song.artist}".

Retorne APENAS um JSON com:
- author: nome(s) do(s) compositor(es) originais da música (não confunda com intérprete/artista)
- year: ano de lançamento original da música (número inteiro)
- original_key: tonalidade original em que a música foi gravada/lançada (ex: "G", "D", "A", "C", "E", "Bb", "F"). Use notação inglesa (A-G), sustenido com # (ex: F#). Se não souber com certeza, retorne null.
- general_notes: um parágrafo rico com história da música, curiosidades, contexto, premiações, versões famosas, importância cultural. Mínimo 2 frases, máximo 5 frases. Em português.

Se não encontrar informações confiáveis sobre algum campo, retorne null para aquele campo.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          author: { type: "string" },
          year: { type: "number" },
          original_key: { type: "string" },
          general_notes: { type: "string" }
        }
      }
    });
    return result;
  };

  const run = async () => {
    setRunning(true);
    setDone(false);
    const newResults = [];

    for (let i = 0; i < queue.length; i++) {
      const song = queue[i];
      setCurrent(song);
      setProgress(Math.round((i / queue.length) * 100));

      try {
        const data = await enrichSong(song);

        // Monta apenas os campos que estavam faltando
        const updates = {};
        if (!song.author && data.author) updates.author = data.author;
        if (!song.year && data.year) updates.year = data.year;
        if (!song.original_key && data.original_key) updates.original_key = data.original_key;
        if (!song.general_notes && data.general_notes) updates.general_notes = data.general_notes;

        if (Object.keys(updates).length > 0) {
          await base44.entities.Song.update(song.id, updates);
        }

        newResults.push({ song, status: 'ok', data, updates });
      } catch (e) {
        newResults.push({ song, status: 'erro', data: null, updates: {} });
      }

      setResults([...newResults]);
    }

    setProgress(100);
    setCurrent(null);
    setRunning(false);
    setDone(true);
    if (onDone) onDone();
  };

  const updatedCount = results.filter(r => r.status === 'ok' && Object.keys(r.updates).length > 0).length;
  const errorCount = results.filter(r => r.status === 'erro').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="font-bold text-[#8B6F47] text-lg">Enriquecer Dados com IA</h2>
          </div>
          {!running && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-200">
              <p className="text-2xl font-black text-[#8B6F47]">{total}</p>
              <p className="text-xs text-[#A68A64]">músicas incompletas</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
              <p className="text-2xl font-black text-green-600">{updatedCount}</p>
              <p className="text-xs text-green-600">atualizadas</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-200">
              <p className="text-2xl font-black text-red-500">{errorCount}</p>
              <p className="text-xs text-red-500">com erro</p>
            </div>
          </div>

          {/* Campos faltantes */}
          {!running && !done && total > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-sm font-semibold text-blue-700 mb-2">Campos que serão preenchidos:</p>
              <div className="flex flex-wrap gap-1.5">
                {queue.filter(s => !s.author).length > 0 && (
                  <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    <User className="w-3 h-3" /> Compositor ({queue.filter(s => !s.author).length})
                  </span>
                )}
                {queue.filter(s => !s.year).length > 0 && (
                  <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    <Calendar className="w-3 h-3" /> Ano ({queue.filter(s => !s.year).length})
                  </span>
                )}
                {queue.filter(s => !s.original_key).length > 0 && (
                  <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    <BookOpen className="w-3 h-3" /> Tom Original ({queue.filter(s => !s.original_key).length})
                  </span>
                )}
                {queue.filter(s => !s.general_notes).length > 0 && (
                  <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    <FileText className="w-3 h-3" /> Observações ({queue.filter(s => !s.general_notes).length})
                  </span>
                )}
              </div>
            </div>
          )}

          {loadingQueue && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-[#8B6F47] animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Verificando músicas no banco...</p>
            </div>
          )}

          {!loadingQueue && total === 0 && !done && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-bold text-green-700">Todas as músicas já estão completas!</p>
              <p className="text-sm text-gray-500">Compositor, ano e observações já foram preenchidos.</p>
            </div>
          )}

          {/* Progresso */}
          {(running || done) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{running ? `Pesquisando: ${current?.title}...` : 'Concluído!'}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Música atual */}
          {running && current && (
            <div className="flex items-center gap-3 bg-[#8B6F47]/5 border border-[#D4C5B0] rounded-xl p-3">
              <Loader2 className="w-5 h-5 text-[#8B6F47] animate-spin flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#8B6F47] text-sm">{current.title}</p>
                <p className="text-xs text-[#A68A64]">{current.artist}</p>
              </div>
            </div>
          )}

          {/* Lista de resultados */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...results].reverse().map((r, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                  r.status === 'ok'
                    ? Object.keys(r.updates).length > 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  {r.status === 'ok' ? (
                    Object.keys(r.updates).length > 0
                      ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      : <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{r.song.title}</p>
                    {r.status === 'ok' && Object.keys(r.updates).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.updates.author && <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">👤 {r.updates.author}</Badge>}
                        {r.updates.year && <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">📅 {r.updates.year}</Badge>}
                        {r.updates.original_key && <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">🎵 Tom: {r.updates.original_key}</Badge>}
                        {r.updates.general_notes && <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">📝 Obs. adicionada</Badge>}
                      </div>
                    )}
                    {r.status === 'ok' && Object.keys(r.updates).length === 0 && (
                      <p className="text-xs text-gray-400">Sem informações novas encontradas</p>
                    )}
                    {r.status === 'erro' && <p className="text-xs text-red-500">Erro ao pesquisar</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          {!loadingQueue && !running && !done && total > 0 && (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button
                onClick={run}
                className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white font-bold gap-2">
                <Sparkles className="w-4 h-4" />
                Iniciar Pesquisa ({total} músicas)
              </Button>
            </>
          )}
          {done && (
            <Button onClick={onClose} className="flex-1 bg-[#9CAF88] text-white font-bold gap-2">
              <CheckCircle className="w-4 h-4" />
              Concluído! Fechar
            </Button>
          )}
          {!loadingQueue && !running && total === 0 && !done && (
            <Button onClick={onClose} className="flex-1">Fechar</Button>
          )}
        </div>
      </div>
    </div>
  );
}