import React from "react";
import { CheckCircle2, AlertTriangle, MoreVertical, Play, MonitorPlay, Info, FileText, Pencil, RefreshCw } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseSoloTab } from "@/lib/soloTabUtils";

// Progressão predominante calculada das progressões da música (peso por seção)
export function progressaoPredominante(song) {
  const progs = (song.progressions || []).filter((p) => p.progression_name);
  if (progs.length === 0) return song.predominant_progression || null;
  const pesos = { "refrão": 3, refrao: 3, chorus: 3, verso: 2, verse: 2, "pré-refrão": 1.5, "pre-refrão": 1.5, ponte: 1.5, bridge: 1.5, intro: 1, outro: 1, solo: 1 };
  const pontos = {};
  progs.forEach((p) => {
    const secao = (p.section || "").toLowerCase();
    let peso = 1;
    for (const [k, v] of Object.entries(pesos)) { if (secao.includes(k)) { peso = v; break; } }
    pontos[p.progression_name] = (pontos[p.progression_name] || 0) + peso;
  });
  let melhor = null, max = 0;
  for (const [nome, v] of Object.entries(pontos)) if (v > max) { max = v; melhor = nome; }
  return melhor;
}

export function primeirosAcordes(song, n = 4) {
  const vistos = new Set();
  const lista = [];
  (song.progressions || []).forEach((p) => (Array.isArray(p.chords) ? p.chords : []).forEach((c) => {
    if (c && !vistos.has(c)) { vistos.add(c); lista.push(c); }
  }));
  return lista.slice(0, n);
}

// "A CANETA E A ENXADA" → "A Caneta e a Enxada" (só para exibir)
const MINUSCULAS = new Set(["a", "e", "o", "as", "os", "da", "de", "do", "das", "dos", "na", "no", "nas", "nos", "em", "um", "uma", "pra", "pro", "com", "por"]);
export function tituloLegivel(t) {
  const s = String(t || "").trim();
  if (!s || s !== s.toUpperCase()) return s; // já está em caixa mista: respeita
  return s.toLowerCase().split(/(\s+)/).map((p, i) => {
    if (/^\s+$/.test(p)) return p;
    if (i > 0 && MINUSCULAS.has(p)) return p;
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join("");
}

const TEMAS = {
  claro: {
    linha: "bg-[#FFFDF8] border-[#E6DCC8] hover:border-[#C9B48E]",
    tom: "bg-[#F3EAD6] text-[#4A3520]", tomRotulo: "text-[#7A6A55]",
    titulo: "text-[#2E2418]", artista: "text-[#7A6A55]", meta: "text-[#6B4F2E]",
    pill: "bg-[#B8860B] text-[#FFFDF8]", botao: "text-[#7A6A55] hover:bg-[#F3EAD6]", palco: "bg-[#6B4F2E] text-[#FFFDF8] hover:bg-[#5A4226]",
  },
  laranja: {
    linha: "bg-white/[0.04] border-orange-500/20 hover:border-orange-400/50",
    tom: "bg-orange-500/15 text-orange-100", tomRotulo: "text-orange-300/80",
    titulo: "text-orange-50", artista: "text-orange-300/90", meta: "text-orange-200/80",
    pill: "bg-orange-500 text-white", botao: "text-orange-200 hover:bg-white/10", palco: "bg-orange-500/20 text-orange-100 border border-orange-400/40 hover:bg-orange-500/30",
  },
  azul: {
    linha: "bg-white/[0.04] border-blue-500/25 hover:border-blue-400/60",
    tom: "bg-blue-500/15 text-blue-50", tomRotulo: "text-blue-300/80",
    titulo: "text-blue-50", artista: "text-blue-200/90", meta: "text-blue-200/80",
    pill: "bg-blue-500 text-white", botao: "text-blue-200 hover:bg-white/10", palco: "bg-blue-500/20 text-blue-100 border border-blue-400/40 hover:bg-blue-500/30",
  },
};

export default function SongRow({ song, tema = "claro", onOpen, onStage, onInfo, onApostila, onEditChords, onTocarJunto }) {
  const t = TEMAS[tema] || TEMAS.claro;
  const temTab = !!parseSoloTab(song.solo_tab);
  const prog = progressaoPredominante(song);
  const acordes = primeirosAcordes(song);
  const meta = [tituloLegivel(song.rhythm_name), tituloLegivel(prog), acordes.length ? acordes.join("–") : null].filter(Boolean).join(" · ");
  const modula = song.progressions?.some((p) => p.modulated_key);
  const sev = song.validation_severity && song.validation_severity !== "ok" ? song.validation_severity : null;
  const corAlerta = sev === "critico" ? "text-red-600" : sev === "suspeito" ? "text-orange-500" : "text-amber-500";

  const abrir = () => onOpen?.(song);
  const pare = (fn) => (e) => { e.stopPropagation(); fn?.(song); };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={abrir}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } }}
      className={`flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-xl border cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8860B] ${t.linha}`}
    >
      <div className="flex-1 min-w-0 py-0.5">
        <div className={`flex items-center gap-1.5 text-[15px] font-semibold leading-snug ${t.titulo}`}>
          {song.is_fully_revised && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" aria-label="Música revisada" />}
          {sev && (
            <button
              type="button"
              onClick={pare(onInfo)}
              className={`flex-shrink-0 ${corAlerta}`}
              aria-label="Ver alertas da cifra"
              title="Ver alertas da cifra"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="truncate">{tituloLegivel(song.title)}</span>
          {song.main_key && (
            <span className={`flex-shrink-0 ml-0.5 px-1.5 rounded-md text-[12px] font-bold leading-5 ${t.tom}`} title={modula ? "Tom (a música modula)" : "Tom"}>
              {song.main_key}{modula ? "*" : ""}
            </span>
          )}
        </div>
        <div className={`text-[13px] leading-snug truncate ${t.artista}`}>{tituloLegivel(song.artist)}</div>
      </div>

      {temTab && (
        <button
          type="button"
          onClick={pare(onTocarJunto)}
          className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full ${t.pill}`}
          aria-label={`Tocar junto: ${tituloLegivel(song.title)}`}
          title="Tocar junto — tablatura do solo"
        >
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        </button>
      )}

      {onStage && (
        <button
          type="button"
          onClick={pare(onStage)}
          className={`flex-shrink-0 h-9 px-2.5 flex items-center gap-1.5 rounded-lg text-[13px] font-semibold ${t.palco}`}
          aria-label={`Modo palco: ${tituloLegivel(song.title)}`}
          title="Modo palco"
        >
          <MonitorPlay className="w-4 h-4" /> Palco
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={`flex-shrink-0 w-8 h-9 flex items-center justify-center rounded-lg ${t.botao}`}
            aria-label={`Mais opções para ${tituloLegivel(song.title)}`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
          {meta && <div className="px-2 py-1.5 text-xs text-muted-foreground">{modula ? "Modula · " : ""}{meta}</div>}
          {temTab && onTocarJunto && <DropdownMenuItem onClick={pare(onTocarJunto)}><Play className="w-4 h-4 mr-2" />Tocar junto</DropdownMenuItem>}
          {onInfo && <DropdownMenuItem onClick={pare(onInfo)}><Info className="w-4 h-4 mr-2" />Informações</DropdownMenuItem>}
          {onApostila && <DropdownMenuItem onClick={pare(onApostila)}><FileText className="w-4 h-4 mr-2" />Apostila desta música</DropdownMenuItem>}
          {onEditChords && <DropdownMenuItem onClick={pare(onEditChords)}><Pencil className="w-4 h-4 mr-2" />Editar acordes</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

