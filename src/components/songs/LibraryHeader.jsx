import React from "react";
import { Link } from "react-router-dom";
import { Plus, BookMarked, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createPageUrl } from "@/utils";

export const BIBLIOTECAS = [
  { id: "sertaneja", nome: "Sertaneja", url: "/Library" },
  { id: "poprock", nome: "Pop/Rock", url: "/LibraryPopRock" },
  { id: "samba", nome: "Samba · MPB · Forró", url: "/LibrarySambaMPB" },
  { id: "instrumental", nome: "Instrumental", url: "/LibraryInstrumental" },
];

const TEMAS = {
  claro: {
    titulo: "text-[#4A3520]", contagem: "text-[#7A6A55]",
    chipOn: "bg-[#6B4F2E] text-[#FFFDF8] border-[#6B4F2E]", chipOff: "bg-[#FFFDF8] text-[#6B4F2E] border-[#E6DCC8] hover:border-[#C9B48E]",
    primario: "bg-[#6B4F2E] text-[#FFFDF8] hover:bg-[#5A4226]", secundario: "bg-[#FFFDF8] text-[#6B4F2E] border border-[#E6DCC8] hover:bg-[#F8F1E2]",
    segFundo: "bg-[#F3EAD6]", segOn: "bg-[#FFFDF8] text-[#4A3520] shadow-sm", segOff: "text-[#7A6A55]",
  },
  laranja: {
    titulo: "text-orange-50", contagem: "text-orange-300/80",
    chipOn: "bg-orange-500 text-white border-orange-500", chipOff: "bg-white/5 text-orange-200 border-orange-500/30 hover:border-orange-400/60",
    primario: "bg-orange-500 text-white hover:bg-orange-600", secundario: "bg-white/5 text-orange-100 border border-orange-500/30 hover:bg-white/10",
    segFundo: "bg-white/10", segOn: "bg-orange-500 text-white", segOff: "text-orange-200/80",
  },
  azul: {
    titulo: "text-blue-50", contagem: "text-blue-300/80",
    chipOn: "bg-blue-500 text-white border-blue-500", chipOff: "bg-white/5 text-blue-200 border-blue-500/30 hover:border-blue-400/60",
    primario: "bg-blue-500 text-white hover:bg-blue-600", secundario: "bg-white/5 text-blue-100 border border-blue-500/30 hover:bg-white/10",
    segFundo: "bg-white/10", segOn: "bg-blue-500 text-white", segOff: "text-blue-200/80",
  },
};

/**
 * Cabeçalho comum das bibliotecas: título, troca de biblioteca, ações.
 * ferramentas = [{ label, icon, onClick, adminOnly }] (menu "Ferramentas")
 * abas = { atual, mudar } para "Músicas" / "Cadernos" (só logado)
 */
export default function LibraryHeader({ atual, contagem, tema = "claro", logado, isAdmin, onApostila, ferramentas = [], abas }) {
  const t = TEMAS[tema] || TEMAS.claro;
  const minhasFerramentas = ferramentas.filter((f) => !f.adminOnly || isAdmin);
  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className={`text-2xl md:text-3xl font-bold ${t.titulo}`} style={{ fontFamily: "Bitter, Georgia, serif" }}>
          Biblioteca
        </h1>
        {contagem != null && (
          <span className={`text-sm ${t.contagem}`}>{contagem} {contagem === 1 ? "música" : "músicas"}</span>
        )}
      </div>

      <nav aria-label="Bibliotecas" className="flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1" style={{ scrollbarWidth: "none" }}>
        {BIBLIOTECAS.map((b) => (
          <Link
            key={b.id}
            to={b.url}
            aria-current={b.id === atual ? "page" : undefined}
            className={`flex-shrink-0 h-9 px-4 flex items-center rounded-full border text-sm whitespace-nowrap transition-colors ${b.id === atual ? `${t.chipOn} font-semibold` : t.chipOff}`}
          >
            {b.nome}
          </Link>
        ))}
      </nav>

      {logado && (
        <div className="flex flex-wrap items-center gap-2">
          {abas && (
            <div className={`flex p-1 rounded-xl ${t.segFundo}`} role="tablist" aria-label="Ver">
              {[["biblioteca", "Músicas"], ["cadernos", "Cadernos"]].map(([id, nome]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={abas.atual === id}
                  onClick={() => abas.mudar(id)}
                  className={`h-8 px-3 rounded-lg text-sm font-medium transition-colors ${abas.atual === id ? t.segOn : t.segOff}`}
                >
                  {nome}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {onApostila && (
              <button type="button" onClick={onApostila} className={`h-9 px-3 flex items-center gap-1.5 rounded-xl text-sm font-medium ${t.secundario}`}>
                <BookMarked className="w-4 h-4" /> Apostila
              </button>
            )}
            {minhasFerramentas.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={`h-9 px-3 flex items-center gap-1 rounded-xl text-sm font-medium ${t.secundario}`}>
                    Ferramentas <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {minhasFerramentas.map((f) => (
                    <DropdownMenuItem key={f.label} onClick={f.onClick} disabled={f.disabled}>
                      {f.icon && <f.icon className="w-4 h-4 mr-2" />}{f.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isAdmin && (
              <Link to={createPageUrl("Analyze")} className={`h-9 px-3 flex items-center gap-1 rounded-xl text-sm font-semibold ${t.primario}`}>
                <Plus className="w-4 h-4" /> Adicionar
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
