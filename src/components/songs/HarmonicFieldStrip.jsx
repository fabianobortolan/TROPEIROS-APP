import React from "react";
import { getHarmonicField } from "@/utils/progressionUtils";

// Extrai o "acorde base" para comparação: B7 → B, Bm7 → Bm, F#dim/F#° → F#
const chordBase = (c) => {
  const m = (c || "").trim().match(/^([A-G][#b]?)m?/);
  return m ? m[1] : (c || "").trim();
};

/**
 * Faixa com o campo harmônico da tonalidade identificada na seção.
 * Os acordes usados na progressão da seção ficam destacados.
 */
export default function HarmonicFieldStrip({ keyName, chords = [], note = "", className = "" }) {
  const field = getHarmonicField(keyName);
  if (!field) return null;

  const usedBases = new Set((chords || []).map(chordBase));

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-[10px] font-semibold text-[#A68A64] uppercase tracking-wide mr-0.5">
        Campo harmônico de {keyName}{note ? ` (${note})` : ""}:
      </span>
      {field.map(({ degree, chord }) => {
        const isUsed = usedBases.has(chordBase(chord));
        return (
          <span
            key={degree + chord}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] whitespace-nowrap ${
              isUsed
                ? "bg-[#8B6F47] text-white border-[#8B6F47] font-bold"
                : "bg-white/70 text-[#8B6F47] border-[#D4C5B0] font-semibold"
            }`}
            title={isUsed ? "Usado nesta seção" : undefined}
          >
            {chord}
            <span className={isUsed ? "text-[#E8DCC4] font-normal" : "text-[#A68A64] font-semibold"}>{degree}</span>
          </span>
        );
      })}
    </div>
  );
}