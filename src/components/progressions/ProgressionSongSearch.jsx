import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, Music2, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const WILDCARD = "X";

/**
 * Normaliza um único grau PRESERVANDO maiúscula/minúscula:
 *   I = acorde maior, i = acorde menor, IV = maior, iv = menor.
 * Só a extensão/qualidade é removida: "V7/iv" -> "V", "Imaj7" -> "I", "ii°" -> "ii".
 * O token "X" é curinga (qualquer grau).
 */
const normalizeDegree = (token) => {
  if (!token) return "";
  const base = token.toString().trim().split("/")[0]; // dominante secundária: V7/IV -> V7
  if (!base) return "";
  const cleaned = base
    .replace(/(maj|min|dim|aug|sus|add|º|°|ø|\+|Δ)/gi, "")
    .replace(/[0-9]/g, "") // extensões: V7 -> V
    .trim();
  const m = cleaned.match(/^([#b]?)([IVXivx]+)(.*)$/);
  if (!m) return cleaned;
  if (m[2].toLowerCase() === "x") return WILDCARD;
  // A primeira letra define a qualidade; o restante acompanha (Vii -> vii, iV -> IV)
  const isMinor = m[2] !== m[2].toUpperCase();
  return m[1] + (isMinor ? m[2].toLowerCase() : m[2].toUpperCase()) + m[3];
};

/** "I – V7 – I" -> ["I", "V", "I"] */
const parseDegrees = (pattern) => {
  if (!pattern) return [];
  return pattern
    .toString()
    .replace(/[–—_]/g, "-")
    .split(/[-,\s;.]+/)
    .map(normalizeDegree)
    .filter(Boolean);
};

/** Graus de uma seção: usa o motor (degrees) e, na falta dele, o padrão em texto. */
const sectionDegrees = (section) => {
  const fromEngine = Array.isArray(section?.degrees) ? section.degrees : [];
  const list = fromEngine.length ? fromEngine : parseDegrees(section?.pattern);
  return list.map(normalizeDegree).filter(Boolean);
};

/** Índice onde a sequência aparece dentro da seção (-1 se não aparecer). */
const findSequence = (degrees, sequence) => {
  if (!sequence.length || sequence.length > degrees.length) return -1;
  for (let i = 0; i <= degrees.length - sequence.length; i++) {
    let all = true;
    for (let j = 0; j < sequence.length; j++) {
      const want = sequence[j];
      if (want !== WILDCARD && want !== degrees[i + j]) {
        all = false;
        break;
      }
    }
    if (all) return i;
  }
  return -1;
};

/** Todas as rotações (para progressões do tipo ciclo: qualquer rotação vale). */
const rotationsOf = (sequence) => sequence.map((_, k) => [...sequence.slice(k), ...sequence.slice(0, k)]);

export default function ProgressionSongSearch({ progression, songs: songsProp = [], onClose }) {
  const [localFilter, setLocalFilter] = useState("");

  // Busca TODAS as músicas da biblioteca (autossuficiente — não depende da prop)
  const { data: fetchedSongs = [], isLoading: loadingSongs, refetch, isFetching } = useQuery({
    queryKey: ['songs-for-progression-search'],
    queryFn: async () => {
      const list = await base44.fetchAllSongs();
      return Array.isArray(list) ? list : (list?.data || []);
    },
    initialData: [],
  });

  const songs = songsProp.length ? songsProp : fetchedSongs;

  // Regras candidatas: padrão principal + variações, já convertidos em graus
  const candidateRules = useMemo(() => {
    const rules = [];
    const add = (pattern) => {
      const degrees = parseDegrees(pattern);
      if (!degrees.length) return;
      const text = degrees.join(" - ");
      if (rules.some((r) => r.text === text)) return;
      rules.push({ text, degrees });
    };
    add(progression?.pattern);
    (progression?.variations || []).forEach((v) => add(v?.pattern));
    return rules;
  }, [progression]);

  // Varredura na biblioteca de músicas (comparação por graus, não por texto)
  const matches = useMemo(() => {
    if (!candidateRules.length || !songs.length) return [];
    const tipo = progression?.tipo || "linear";
    const results = [];
    for (const song of songs) {
      const matchingSections = [];
      for (const sp of song.progressions || []) {
        const degrees = sectionDegrees(sp);
        if (!degrees.length) continue;

        let matched = null;
        for (const rule of candidateRules) {
          if (tipo === "vocabulario") {
            // vocabulário: usa os graus do padrão (em qualquer ordem) e não foge dele.
            // Vocabulários de 2 graus (TERRA/CHÃO e versões menores) exigem pureza;
            // os de 3+ graus toleram até 15% de graus de passagem (mesma regra do motor).
            const required = new Set(rule.degrees.filter((d) => d !== WILDCARD));
            if ([...required].every((d) => degrees.includes(d))) {
              const outside = degrees.filter((d) => !required.has(d));
              if (
                outside.length === 0 ||
                (required.size >= 3 && outside.length / degrees.length <= 0.15 && new Set(outside).size <= 2)
              ) {
                matched = rule.text;
              }
            }
          } else if (tipo === "ciclo") {
            // ciclo: ordem obrigatória, qualquer rotação vale
            if (rotationsOf(rule.degrees).some((seq) => findSequence(degrees, seq) >= 0)) matched = rule.text;
          } else {
            // linear / linha: ordem fixa, trecho contíguo
            if (findSequence(degrees, rule.degrees) >= 0) matched = rule.text;
          }
          if (matched) break;
        }

        if (matched) {
          matchingSections.push({
            section: sp.section || "—",
            chords: Array.isArray(sp.chords) ? sp.chords.join(" - ") : (sp.chords || "—"),
            key: sp.key || song.main_key || "—",
            pattern: sp.pattern,
            progression_name: sp.progression_name,
            matched,
          });
        }
      }
      if (matchingSections.length) {
        results.push({
          id: song.id,
          title: song.title,
          artist: song.artist,
          main_key: song.main_key,
          rhythm_name: song.rhythm_name,
          sections: matchingSections,
        });
      }
    }
    return results;
  }, [candidateRules, songs, progression]);

  const filtered = useMemo(() => {
    const q = localFilter.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter(
      (m) =>
        m.title?.toLowerCase().includes(q) ||
        m.artist?.toLowerCase().includes(q)
    );
  }, [matches, localFilter]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-amber-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-[#D4C5B0]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B6F47] via-[#A68A64] to-[#D4AF37] p-5 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-white/80 text-xs uppercase tracking-wide mb-1">
              <Search className="w-3.5 h-3.5" />
              Buscar músicas com esta progressão
            </div>
            <h2 className="text-xl font-bold text-white truncate">{progression?.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className="bg-white/20 text-white border-white/30 font-mono">
                {progression?.pattern}
              </Badge>
              {progression?.modo && (
                <Badge className="bg-white/15 text-white border-white/30">
                  {progression.modo}
                </Badge>
              )}
              {candidateRules.length > 1 && (
                <Badge className="bg-white/15 text-white border-white/30">
                  +{candidateRules.length - 1} variação(ões)
                </Badge>
              )}
              <Badge className="bg-white/20 text-white border-white/30">
                {matches.length} música(s) encontrada(s)
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 flex-shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Busca local */}
        <div className="p-4 border-b border-[#D4C5B0] bg-white/40">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A68A64]" />
              <Input
                placeholder="Filtrar resultados por título ou artista..."
                value={localFilter}
                onChange={(e) => setLocalFilter(e.target.value)}
                className="pl-9 bg-white border-[#D4C5B0] focus:border-[#8B6F47]"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Atualizar biblioteca"
              className="border-[#D4C5B0] text-[#8B6F47] hover:bg-[#F5F1E8] flex-shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-[11px] text-[#A68A64] mt-2">
            Maiúscula = acorde maior (I, IV, V) • minúscula = acorde menor (i, iv). A busca respeita essa diferença.
          </p>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingSongs ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-[#8B6F47] animate-spin" />
              <p className="text-[#8B6F47] font-medium">Varrendo a biblioteca...</p>
              <p className="text-xs text-[#A68A64] mt-1">Comparando os padrões com as progressões de cada música.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Music2 className="w-12 h-12 mx-auto mb-3 text-[#A68A64] opacity-40" />
              <p className="text-[#8B6F47] font-medium mb-1">
                {matches.length === 0
                  ? "Nenhuma música cadastrada usa esta progressão"
                  : "Nenhum resultado para o filtro"}
              </p>
              <p className="text-xs text-[#A68A64]">
                {matches.length === 0
                  ? "A varredura comparou os graus do padrão (e das variações) com os graus das progressões de cada música da biblioteca."
                  : "Ajuste o termo de busca acima."}
              </p>
            </div>
          ) : (
            filtered.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-xl border border-[#D4C5B0] p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#8B6F47] truncate">{m.title}</p>
                    <p className="text-xs text-[#A68A64] truncate">{m.artist || "—"}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {m.main_key && (
                        <Badge variant="outline" className="bg-[#F5F1E8] text-[#8B6F47] border-[#D4C5B0] text-[10px]">
                          <KeyRound className="w-2.5 h-2.5 mr-1" /> {m.main_key}
                        </Badge>
                      )}
                      {m.rhythm_name && (
                        <Badge variant="outline" className="bg-[#F5F1E8] text-[#9CAF88] border-[#9CAF88]/30 text-[10px]">
                          {m.rhythm_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Link
                    to={createPageUrl("Library")}
                    className="text-xs text-[#8B6F47] hover:text-[#A68A64] underline flex-shrink-0 mt-1"
                    onClick={onClose}
                  >
                    Abrir na Biblioteca
                  </Link>
                </div>
                {/* Seções que contêm a progressão */}
                <div className="mt-2 pt-2 border-t border-[#D4C5B0]/60 space-y-1">
                  {m.sections.slice(0, 4).map((s, i) => (
                    <div key={i} className="text-xs flex flex-wrap items-center gap-2">
                      <Badge className="bg-[#9CAF88]/15 text-[#9CAF88] border-[#9CAF88]/30 text-[10px]">
                        {s.section}
                      </Badge>
                      <span className="font-mono text-[#8B6F47]">{s.chords}</span>
                      <span className="text-[10px] text-[#A68A64] font-mono">({s.matched})</span>
                      {s.key && s.key !== m.main_key && (
                        <span className="text-[10px] text-[#A68A64]">({s.key})</span>
                      )}
                    </div>
                  ))}
                  {m.sections.length > 4 && (
                    <p className="text-[10px] text-[#A68A64]">+{m.sections.length - 4} outras seções</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#D4C5B0] bg-white/40 flex items-center justify-between text-xs text-[#A68A64]">
          <span>
            {loadingSongs
              ? "Carregando biblioteca..."
              : `Varredura em ${songs.length} música(s) da biblioteca • ${filtered.length} resultado(s)`}
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="border-[#D4C5B0] text-[#8B6F47]">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}