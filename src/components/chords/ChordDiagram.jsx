import React from "react";

export default function ChordDiagram({ chord }) {
  if (!chord || !chord.strings || chord.strings.length === 0) {
    return null;
  }

  const isViola = chord.instrument === "viola";
  
  // Viola tem 10 cordas em 5 pares
  const numDisplayStrings = isViola ? 5 : 6;
  const stringSpacing = 20;
  const fretHeight = 25;
  const numFrets = 5;
  const startX = 25;
  const startY = 35;
  const dotRadius = isViola ? 8 : 6;
  const pairGap = 2;
  
  const width = startX + (numDisplayStrings - 1) * stringSpacing + 25;
  const height = startY + numFrets * fretHeight + 40;

  // Para viola, pega apenas as cordas ímpares (representando os pares)
  const displayStrings = isViola 
    ? chord.strings.filter((_, i) => i % 2 === 0) // Pega 1ª, 3ª, 5ª, 7ª, 9ª corda
    : chord.strings;

  // Usa a casa inicial definida pelo usuário (chord.fret) ou calcula automaticamente
  const displayStartFret = chord.fret !== undefined && chord.fret !== null 
    ? chord.fret 
    : (() => {
        const fretsUsed = displayStrings
          .map(s => s === 'x' || s === '0' ? Infinity : parseInt(s))
          .filter(n => !isNaN(n) && n !== Infinity);
        
        if (chord.barre_fret) {
          fretsUsed.push(chord.barre_fret);
        }
        
        const minFret = fretsUsed.length > 0 ? Math.min(...fretsUsed) : 0;
        return minFret > 3 ? minFret - 1 : 0;
      })();

  const getStringValue = (stringValue) => {
    if (stringValue === 'x' || stringValue === 'X') return 'x';
    if (stringValue === '0' || stringValue === 'o' || stringValue === 'O') return '0';
    return parseInt(stringValue);
  };

  // Nomes dos pares para viola - Cebolão em Mi (de baixo para cima)
  // B, E, G#, B, E
  const violaPairNames = ['B', 'E', 'G#', 'B', 'E'];

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="border border-[#D4C5B0] rounded-lg bg-white/80">
        {/* Título do acorde */}
        <text
          x={width / 2}
          y={20}
          textAnchor="middle"
          className="text-sm font-bold fill-[#8B6F47]"
          style={{ fontFamily: 'system-ui' }}
        >
          {chord.name}
        </text>



        {/* Cordas verticais (pares para viola) */}
        {Array.from({ length: numDisplayStrings }).map((_, i) => {
          const x = startX + i * stringSpacing;
          
          if (isViola) {
            // Para viola, desenha 2 linhas próximas (par de cordas)
            return (
              <g key={`string-pair-${i}`}>
                <line
                  x1={x - pairGap / 2}
                  y1={startY}
                  x2={x - pairGap / 2}
                  y2={startY + numFrets * fretHeight}
                  stroke="#8B6F47"
                  strokeWidth={i === 0 || i === numDisplayStrings - 1 ? 2 : 1.5}
                />
                <line
                  x1={x + pairGap / 2}
                  y1={startY}
                  x2={x + pairGap / 2}
                  y2={startY + numFrets * fretHeight}
                  stroke="#8B6F47"
                  strokeWidth={i === 0 || i === numDisplayStrings - 1 ? 2 : 1.5}
                />
                {/* Nome do par abaixo */}
                <text
                  x={x}
                  y={startY + numFrets * fretHeight + 12}
                  textAnchor="middle"
                  className="text-[8px] font-bold fill-[#9CAF88]"
                >
                  {violaPairNames[i]}
                </text>
              </g>
            );
          } else {
            // Violão: corda simples
            return (
              <line
                key={`string-${i}`}
                x1={x}
                y1={startY}
                x2={x}
                y2={startY + numFrets * fretHeight}
                stroke="#8B6F47"
                strokeWidth={i === 0 || i === numDisplayStrings - 1 ? 2.5 : 1.5}
              />
            );
          }
        })}

        {/* Trastes horizontais */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => (
          <line
            key={`fret-${i}`}
            x1={startX}
            y1={startY + i * fretHeight}
            x2={startX + (numDisplayStrings - 1) * stringSpacing}
            y2={startY + i * fretHeight}
            stroke="#8B6F47"
            strokeWidth={i === 0 && displayStartFret === 0 ? 4 : 2}
          />
        ))}

        {/* Números das casas (trastes) */}
        {Array.from({ length: numFrets }).map((_, i) => {
          const fretNumber = displayStartFret + i + 1;
          return (
            <text
              key={`fret-number-${i}`}
              x={startX - 12}
              y={startY + i * fretHeight + fretHeight / 2 + 3}
              textAnchor="middle"
              className="text-[10px] font-bold fill-[#8B6F47]"
            >
              {fretNumber}
            </text>
          );
        })}

        {/* Pestana (barre) */}
        {(chord.barre_fret || chord.barre_fret === 0) && (() => {
          const barreFret = typeof chord.barre_fret === 'number' ? chord.barre_fret : parseInt(chord.barre_fret);
          const adjustedFret = barreFret - displayStartFret;
          
          if (adjustedFret >= 1 && adjustedFret <= numFrets) {
            const y = startY + (adjustedFret - 0.5) * fretHeight;
            return (
              <g key="barre">
                <rect
                  x={startX - 5}
                  y={y - 6}
                  width={(numDisplayStrings - 1) * stringSpacing + 10}
                  height={12}
                  rx={6}
                  fill="#D4AF37"
                  opacity={0.7}
                  stroke="#8B6F47"
                  strokeWidth={1}
                />
                <text
                  x={startX + ((numDisplayStrings - 1) * stringSpacing) / 2}
                  y={y + 3}
                  textAnchor="middle"
                  className="text-[8px] font-bold fill-[#8B6F47]"
                >
                  P{barreFret}
                </text>
              </g>
            );
          }
          return null;
        })()}

        {/* Símbolos acima das cordas (x ou o) */}
        {displayStrings.map((stringValue, i) => {
          const value = getStringValue(stringValue);
          const x = startX + i * stringSpacing;
          
          if (value === 'x') {
            // X para não tocar
            return (
              <g key={`top-${i}`}>
                <line
                  x1={x - 4}
                  y1={startY - 12 - 4}
                  x2={x + 4}
                  y2={startY - 12 + 4}
                  stroke="#D32F2F"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
                <line
                  x1={x - 4}
                  y1={startY - 12 + 4}
                  x2={x + 4}
                  y2={startY - 12 - 4}
                  stroke="#D32F2F"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </g>
            );
          } else if (value === '0') {
            // O para corda solta
            return (
              <circle
                key={`top-${i}`}
                cx={x}
                cy={startY - 12}
                r={5}
                fill="none"
                stroke="#2E7D32"
                strokeWidth={1.5}
              />
            );
          }
          return null;
        })}

        {/* Dedos nas cordas/pares */}
        {displayStrings.map((stringValue, i) => {
          const value = getStringValue(stringValue);
          
          if (typeof value === 'number' && value > 0) {
            // Calcula a posição relativa ao displayStartFret
            const adjustedFret = value - displayStartFret;
            
            if (adjustedFret >= 1 && adjustedFret <= numFrets) {
              const x = startX + i * stringSpacing;
              const y = startY + (adjustedFret - 0.5) * fretHeight;
              
              return (
                <g key={`finger-${i}`}>
                  {/* Círculo maior para viola (cobre o par) */}
                  <circle
                    cx={x}
                    cy={y}
                    r={dotRadius}
                    fill="#8B6F47"
                    stroke="#A68A64"
                    strokeWidth={1}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={dotRadius - 2}
                    fill="none"
                    stroke="white"
                    strokeWidth={0.5}
                    opacity={0.6}
                  />
                </g>
              );
            }
          }
          return null;
        })}

        {/* Indicador de instrumento */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          className="text-[8px] fill-[#A68A64]"
          style={{ fontFamily: 'system-ui' }}
        >
          {isViola ? "Viola - Cebolão E" : "Violão"}
        </text>
      </svg>


    </div>
  );
}