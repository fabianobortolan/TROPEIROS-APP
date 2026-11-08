import React from "react";
import { FileText, Edit, Trash2, Play, Square, Eye, Download, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { tituloLegivel } from "@/components/songs/SongRow";
import PdfViewer from "@/components/instrumental/PdfViewer";

const difficultyConfig = {
  facil: { label: "Fácil", className: "bg-green-100 text-green-800 border border-green-200" },
  intermediario: { label: "Interm.", className: "bg-amber-100 text-amber-800 border border-amber-200" },
  avancado: { label: "Avançado", className: "bg-rose-100 text-rose-800 border border-rose-200" },
};


export default function PartituraCard({ partitura, onEdit, onDelete, isAdmin }) {
  const diff = difficultyConfig[partitura.difficulty_level] || difficultyConfig.intermediario;
  const [playing, setPlaying] = React.useState(false);
  const [showPdf, setShowPdf] = React.useState(false);
  const audioRef = React.useRef(null);

  const togglePlayback = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const titulo = tituloLegivel(partitura.title);
  const meta = [tituloLegivel(partitura.instrument), partitura.key ? `Tom ${partitura.key}` : null, tituloLegivel(partitura.genre), diff.label].filter(Boolean).join(" · ");

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => partitura.pdf_url && setShowPdf(true)}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && partitura.pdf_url) { e.preventDefault(); setShowPdf(true); } }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border bg-[#FFFDF8] border-[#E6DCC8] hover:border-[#C9B48E] cursor-pointer"
      >
        <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-[#F3EAD6] flex items-center justify-center text-[#6B4F2E]">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[#2E2418] truncate">{titulo}</div>
          <div className="text-[13px] text-[#7A6A55] truncate">{tituloLegivel(partitura.composer) || "—"}</div>
          <div className="text-[12px] text-[#6B4F2E] mt-0.5 truncate">{meta}</div>
        </div>
        {partitura.playback_url && (
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playing ? "Parar playback" : "Tocar playback"}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#B8860B] text-[#FFFDF8]"
          >
            {playing ? <Square className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Mais opções para ${titulo}`}
              className="flex-shrink-0 w-10 h-10 -mr-1 flex items-center justify-center rounded-xl text-[#7A6A55] hover:bg-[#F3EAD6]"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            {partitura.pdf_url && <DropdownMenuItem onClick={() => setShowPdf(true)}><Eye className="w-4 h-4 mr-2" />Ver partitura</DropdownMenuItem>}
            {partitura.pdf_url && <DropdownMenuItem asChild><a href={partitura.pdf_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4 mr-2" />Baixar PDF</a></DropdownMenuItem>}
            {isAdmin && <DropdownMenuItem onClick={() => onEdit(partitura)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>}
            {isAdmin && <DropdownMenuItem onClick={() => onDelete(partitura)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        {partitura.playback_url && (
          <audio ref={audioRef} src={partitura.playback_url} onEnded={() => setPlaying(false)} className="hidden" />
        )}
      </div>

      {showPdf && (
        <PdfViewer partitura={partitura} open={showPdf} onClose={() => setShowPdf(false)} />
      )}
    </div>
  );
}
