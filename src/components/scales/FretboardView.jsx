import React from "react";
import { motion } from "framer-motion";

const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FRETS = Array.from({ length: 13 }, (_, i) => i); // 0 (solta) até 12
const MARKERS = { 3: 1, 5: 1, 7: 1, 9: 1, 12: 2 };

// Cordas do violão, da mais grave (6ª) para a mais aguda (1ª)
const STRINGS = [
  { label: "E", openIndex: 4, thickness: 4 },
  { label: "A", openIndex: 9, thickness: 3.5 },
  { label: "D", openIndex: 2, thickness: 3 },
  { label: "G", openIndex: 7, thickness: 2.5 },
  { label: "B", openIndex: 11, thickness: 2 },
  { label: "e", openIndex: 4, thickness: 1.5 },
];

export default function FretboardView({ scale, scaleInfo, leftHanded = false }) {
  const degrees = scaleInfo.degrees;

  // Mapeia cada nota da escala para seu grau (I, II, ♭III...)
  const noteToDegree = {};
  scale.forEach((note, idx) => {
    if (idx < degrees.length && !(note in noteToDegree)) {
      noteToDegree[note] = degrees[idx];
    }
  });

  const rootDegree = degrees[0];
  const rootNote = scale[0];

  // Modo canhoto: espelha casas (pestana à direita) e ordem das cordas
  const fretsToRender = leftHanded ? [...FRETS].reverse() : FRETS;
  const stringsToRender = leftHanded ? [...STRINGS].reverse() : STRINGS;

  const sideClass = leftHanded ? "border-l" : "border-r";
  const nutSideClass = leftHanded ? "border-l-4" : "border-r-4";

  const cellClasses = (fret) =>
    `relative h-12 flex items-center justify-center flex-1 ${
      fret === 0 ? `${nutSideClass} border-[#2b1a0c] bg-[#4a2e15]/50` : `${sideClass} border-[#3a2510]`
    }`;

  const StringRow = ({ string, sIdx }) => (
    <div className="flex items-center">
      <span className="w-7 pr-2 text-right text-xs font-bold text-[#8B6F47]">{string.label}</span>
      <div className="flex flex-1">
        {fretsToRender.map((fret) => {
          const note = CHROMATIC[(string.openIndex + fret) % 12];
          const degree = noteToDegree[note];
          const isRoot = degree === rootDegree && note === rootNote;
          return (
            <div key={fret} className={cellClasses(fret)} style={{ minWidth: 56 }}>
              {/* corda */}
              <div
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full"
                style={{ height: string.thickness, background: "linear-gradient(180deg, #d9c9a8, #b5a17e)" }}
              />
              {degree && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: fret * 0.02 + sIdx * 0.06 }}
                  className={`relative z-10 flex h-9 w-9 flex-col items-center justify-center rounded-full shadow-md ${
                    isRoot
                      ? "bg-gradient-to-br from-[#8B6F47] to-[#A68A64] ring-2 ring-[#D4AF37]"
                      : "bg-[#9CAF88]"
                  }`}
                >
                  <span className="text-xs font-bold leading-none text-white">{note}</span>
                  <span className="mt-0.5 text-[8px] leading-none text-white/80">{degree}</span>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const MarkerRow = () => (
    <div className="flex items-center">
      <span className="w-7" />
      <div className="flex flex-1">
        {fretsToRender.map((fret) => (
          <div key={fret} className={`relative flex h-5 items-center justify-center flex-1 ${fret === 0 ? `${nutSideClass} border-[#2b1a0c]` : `${sideClass} border-[#3a2510]`}`} style={{ minWidth: 56 }}>
            {MARKERS[fret] && (
              <div className={`flex ${MARKERS[fret] === 2 ? "gap-1.5" : ""}`}>
                {Array.from({ length: MARKERS[fret] }).map((_, i) => (
                  <div key={i} className="h-2.5 w-2.5 rounded-full bg-[#d9c9a8]/50" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[820px]">
          <div
            className="rounded-xl border border-[#3a2510] p-2"
            style={{ background: "linear-gradient(180deg, #6B4A2A 0%, #5C3D20 100%)" }}
          >
            {stringsToRender.map((string, sIdx) => (
              <React.Fragment key={string.label}>
                <StringRow string={string} sIdx={sIdx} />
                {sIdx === 2 && <MarkerRow />}
              </React.Fragment>
            ))}
          </div>

          {/* Números das casas */}
          <div className="mt-2 flex items-center">
            <span className="w-7" />
            <div className="flex flex-1">
              {fretsToRender.map((fret) => (
                <div key={fret} className="flex-1 text-center text-xs font-semibold text-[#8B6F47]" style={{ minWidth: 56 }}>
                  {fret === 0 ? "solta" : fret}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#8B6F47]">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full bg-gradient-to-br from-[#8B6F47] to-[#A68A64] ring-2 ring-[#D4AF37]" />
          <span>Tônica ({rootNote})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full bg-[#9CAF88]" />
          <span>Notas da escala</span>
        </div>
        <span className="text-[#A68A64]">
          {leftHanded
            ? "Visualização espelhada para canhotos — a pestana fica à direita."
            : "Cada bolinha mostra a nota e o seu grau na escala."}
        </span>
      </div>
    </div>
  );
}