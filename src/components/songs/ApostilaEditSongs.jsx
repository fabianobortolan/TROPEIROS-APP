import React, { useState } from "react";
import { Search, Plus, X, ListPlus, ChevronDown } from "lucide-react";

/**
 * Painel da etapa "organizar" da apostila: busca uma música para inseri-la
 * na sequência (se estiver fora) ou removê-la (se estiver dentro).
 *
 * Props:
 * - allSongs: lista completa de músicas (sertanejas + pop/rock)
 * - excludedIds: Set com os IDs das músicas fora da apostila
 * - onAdd(song): insere a música de volta na sequência
 * - onRemove(song): remove a música da sequência
 */
export default function ApostilaEditSongs({ allSongs, excludedIds, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q
    ? allSongs.filter(s =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.artist || "").toLowerCase().includes(q)
      ).slice(0, 8)
    : [];

  return (
    <div className="bg-[#F5F1E8] rounded-xl border border-[#D4C5B0] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F5F1E8]/60 transition-colors"
      >
        <ListPlus className="w-4 h-4 text-[#8B6F47] flex-shrink-0" />
        <span className="text-xs font-bold text-[#8B6F47] flex-1">
          Inserir ou remover músicas desta apostila
        </span>
        <ChevronDown className={`w-4 h-4 text-[#A68A64] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[10px] text-[#A68A64] leading-snug">
            Busque uma música e insira ou remova da apostila. Depois use as setas ▲▼ para posicioná-la na sequência.
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por título ou artista..."
              className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-[#D4C5B0] bg-white focus:border-[#8B6F47] focus:outline-none"
            />
          </div>
          {q && results.length === 0 && (
            <p className="text-[10px] text-stone-500 text-center py-1">Nenhuma música encontrada.</p>
          )}
          {results.map(s => {
            const isOut = excludedIds.has(s.id);
            return (
              <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-[#D4C5B0]">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-700 truncate">{s.title}</p>
                  <p className="text-[10px] text-stone-500 truncate">
                    {s.artist}{s.main_key ? ` • Tom: ${s.main_key}` : ""}
                  </p>
                </div>
                {isOut ? (
                  <button
                    type="button"
                    onClick={() => onAdd(s)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Inserir
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRemove(s)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3" /> Remover
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}