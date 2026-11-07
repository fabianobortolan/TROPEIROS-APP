import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Music2, Loader2, CheckCircle, AlertCircle, Save, X, Globe, ArrowLeftRight } from "lucide-react";

// ─── Converte cifra para caixa alta preservando 'm' minúsculo dos acordes menores ───
const cifraToUpperCase = (text) => {
  if (!text) return text;
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("[")) return line.toUpperCase();
      // Detecta linha de acordes
      const isChordLine =
        trimmed.length > 0 &&
        !/[a-záàâãéêíóôõúç]{4,}/i.test(trimmed) &&
        /[A-G]/.test(trimmed);
      if (isChordLine) return line.toUpperCase().replace(/(?<=[A-G][#B]?)M(?=AJ|$|\s|\/|7|9|6|4|11|13)/g, (m) => m).replace(/([A-G][#B]?)M(?!AJ|IN)/g, (_, root) => root + "m");
      // Linha de letra: caixa alta normalmente
      return line.toUpperCase();
    })
    .join("\n");
};

// ─── Lógica de transposição (módulo compartilhado) ───────────────────────────
import {
  ALL_KEYS,
  semitonesBetween,
  transposeCifraText,
  preferFlatsForKey,
} from "@/utils/transposition";
// ─────────────────────────────────────────────────────────────────────────────

export default function BuscarCifraModal({ onClose, onSave }) {
  const [titulo, setTitulo] = useState("");
  const [artista, setArtista] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [targetKey, setTargetKey] = useState(null); // null = sem transposição
  const [elapsed, setElapsed] = useState(0);

  // Cronômetro de busca para feedback ao usuário
  React.useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(t);
  }, [loading]);

  const handleBuscar = async () => {
    if (!titulo.trim() || !artista.trim()) return;
    setLoading(true);
    setErro(null);
    setResultado(null);
    setSaved(false);
    setTargetKey(null);

    try {
      const data = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em música brasileira. Pesquise na internet a cifra (acordes) mais usada da música "${titulo.trim()}" de ${artista.trim()}.

Retorne exatamente:
- title: título oficial da música
- artist: nome do artista ou dupla
- cifra_text: a cifra COMPLETA com os acordes e a letra, seções marcadas entre colchetes ([Intro], [Verso], [Pré-Refrão], [Refrão], [Ponte], [Solo], [Final]). Use notação de cifras (ex: G, Am7, D7, C#m). Não invente acordes — use a cifra real encontrada.
- main_key: tonalidade da cifra em notação inglesa (ex: "G", "Am")
- tempo: BPM aproximado da gravação original
- capo: casa do capotraste usada na cifra (0 se não usar)
- genre_style: exatamente um destes valores: sertanejo_raiz, sertanejo_universitario, sertanejo_romantico, sertanejo_moderno, sertanejo_modao, pop_rock, mpb, samba, forro, religioso (string vazia se nenhum se aplicar)
- general_notes: observações breves (afinação, observações da cifra, fonte)

Se não encontrar a cifra, retorne cifra_text vazia.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            artist: { type: "string" },
            cifra_text: { type: "string" },
            main_key: { type: "string" },
            tempo: { type: "number" },
            capo: { type: "number" },
            genre_style: { type: "string" },
            general_notes: { type: "string" },
          },
        },
      });
      if (data && data.cifra_text && data.cifra_text.trim()) {
        setResultado({ ...data, capo: data.capo || 0 });
        setTargetKey(data.main_key || null);
      } else {
        setErro("A IA não encontrou uma cifra válida para esta busca. Tente novamente com título/artista mais específicos.");
      }
    } catch (err) {
      setErro(
        err?.message?.includes("timeout") || err?.code === "ECONNABORTED"
          ? "A busca demorou demais e expirou. A IA está pesquisando a internet — tente novamente."
          : `Não foi possível buscar a cifra agora. ${err?.message || ""}`.trim()
      );
    } finally {
      setLoading(false);
    }
  };

  // Calcula semitones e cifra transposta em tempo real
  const { semitones, cifraTransposta } = useMemo(() => {
    if (!resultado) return { semitones: 0, cifraTransposta: "" };
    const orig = resultado.main_key || "C";
    const semi = targetKey ? semitonesBetween(orig, targetKey) : 0;
    return {
      semitones: semi,
      cifraTransposta: transposeCifraText(
        resultado.cifra_text || "",
        semi,
        preferFlatsForKey(targetKey || orig)
      ),
    };
  }, [resultado, targetKey]);

  const handleSalvar = async () => {
    if (!resultado) return;
    setSaving(true);
    try {
      const songData = {
        title: (resultado.title || titulo).toUpperCase(),
        artist: (resultado.artist || artista).toUpperCase(),
        cifra_text: cifraToUpperCase(cifraTransposta || resultado.cifra_text),
        main_key: targetKey || resultado.main_key || null,
        original_key: resultado.main_key || null,
        tempo: resultado.tempo || null,
        genre_style: ["sertanejo_raiz", "sertanejo_universitario", "sertanejo_romantico", "sertanejo_moderno", "sertanejo_modao", "pop_rock", "mpb", "samba", "forro", "religioso"].includes(resultado.genre_style)
          ? resultado.genre_style
          : null,
        general_notes: resultado.capo > 0
          ? `Capotraste na ${resultado.capo}ª casa. ${resultado.general_notes || ""}`.trim()
          : resultado.general_notes || null,
        input_type: "cifra",
      };
      const savedSong = await base44.entities.Song.create(songData);
      setSaved(true);
      if (onSave) onSave(savedSong);
    } catch (err) {
      setErro("Erro ao salvar a música na biblioteca.");
    } finally {
      setSaving(false);
    }
  };

  const originalKey = resultado?.main_key || null;
  const isTransposed = semitones > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-white font-bold text-lg">Buscar Cifra na Internet</h2>
              <p className="text-white/80 text-xs">A IA irá buscar e extrair a cifra automaticamente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-white/70 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Formulário de busca */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Nome da música (ex: É o Amor)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              className="flex-1"
            />
            <Input
              placeholder="Artista (ex: Zezé di Camargo)"
              value={artista}
              onChange={(e) => setArtista(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              className="flex-1"
            />
            <Button
              onClick={handleBuscar}
              disabled={loading || !titulo.trim() || !artista.trim()}
              className="bg-[#8B6F47] hover:bg-[#6B5437] text-white gap-2 whitespace-nowrap"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</>
              ) : (
                <><Search className="w-4 h-4" /> Buscar</>
              )}
            </Button>
          </div>
          {loading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-[#8B6F47]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>A IA está buscando a cifra na internet, aguarde... {elapsed > 0 && `(${elapsed}s)`}</span>
            </div>
          )}
        </div>

        {/* Resultado */}
        <div className="flex-1 overflow-y-auto p-5">
          {erro && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{erro}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5 text-xs border-red-300 text-red-700 hover:bg-red-100"
                  onClick={handleBuscar}
                  disabled={loading || !titulo.trim() || !artista.trim()}
                >
                  <Search className="w-3.5 h-3.5" /> Buscar novamente
                </Button>
              </div>
            </div>
          )}

          {resultado && (
            <div className="space-y-4">
              {/* Info da música */}
              <div className="bg-[#F5F1E8] rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-bold text-[#2d1810] text-lg">{resultado.title}</h3>
                    <p className="text-[#8B6F47] font-medium">{resultado.artist}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {originalKey && (
                        <Badge className="bg-[#8B6F47] text-white text-xs">
                          Tom Original: {originalKey}
                        </Badge>
                      )}
                      {isTransposed && (
                        <Badge className="bg-blue-600 text-white text-xs">
                          ➜ Transposto para: {targetKey} ({semitones > 6 ? semitones - 12 : semitones > 0 ? `+${semitones}` : semitones} semitons)
                        </Badge>
                      )}
                      {resultado.tempo && (
                        <Badge className="bg-[#A68A64] text-white text-xs">
                          {resultado.tempo} BPM
                        </Badge>
                      )}
                      {resultado.capo > 0 && (
                        <Badge className="bg-amber-600 text-white text-xs">
                          Capo {resultado.capo}ª casa
                        </Badge>
                      )}
                      {resultado.genre_style && (
                        <Badge variant="outline" className="text-xs border-[#8B6F47] text-[#8B6F47]">
                          {resultado.genre_style.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    {resultado.general_notes && (
                      <p className="text-xs text-gray-500 mt-2">{resultado.general_notes}</p>
                    )}
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                </div>

                {/* Seletor de Transposição */}
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-[#D4C5B0]">
                  <ArrowLeftRight className="w-4 h-4 text-[#8B6F47] flex-shrink-0" />
                  <span className="text-sm font-semibold text-[#8B6F47] whitespace-nowrap">Transpor para:</span>
                  <Select value={targetKey || originalKey || "C"} onValueChange={setTargetKey}>
                    <SelectTrigger className="flex-1 h-8 text-sm border-[#D4C5B0] focus:border-[#8B6F47]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k} {k === originalKey ? "(original)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isTransposed && (
                    <button
                      onClick={() => setTargetKey(originalKey)}
                      className="text-xs text-gray-400 hover:text-gray-600 underline whitespace-nowrap"
                    >
                      Resetar
                    </button>
                  )}
                </div>
              </div>

              {/* Prévia da cifra (transposta em tempo real) */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Prévia da Cifra {isTransposed ? `(em ${targetKey})` : ""}
                </p>
                <div className="bg-gray-900 rounded-xl p-4 max-h-64 overflow-y-auto">
                  <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {cifraTransposta || resultado.cifra_text}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {!resultado && !loading && !erro && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
              <Music2 className="w-16 h-16 mb-4 opacity-30" />
              <p className="font-medium">Digite o nome da música e o artista</p>
              <p className="text-sm mt-1">A IA irá buscar a cifra automaticamente na internet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {resultado && !saved && (
          <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleSalvar}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-4 h-4" /> Salvar em {targetKey || originalKey || "Tom Original"}</>
              )}
            </Button>
          </div>
        )}

        {saved && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle className="w-5 h-5" />
              Música salva na biblioteca em {targetKey || originalKey}!
            </div>
            <Button onClick={onClose} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white">
              Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}