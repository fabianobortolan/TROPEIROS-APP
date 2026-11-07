import React from "react";

export default function RhythmDiagram({ rhythm }) {
  // Se não tem pattern e nem diagram_pattern, não mostra nada
  if ((!rhythm.pattern || rhythm.pattern.trim() === "") && (!rhythm.diagram_pattern || rhythm.diagram_pattern.trim() === "")) {
    return null;
  }

  // Parse do pattern customizado ou automático
  const parsePattern = (pattern, customDiagram) => {
    // Se tem diagrama customizado, usa ele primeiro
    if (customDiagram && customDiagram.trim()) {
      const custom = customDiagram.trim().toUpperCase();
      const parsed = [];
      let beatCount = 1;
      
      // Remove espaços extras e quebra em tokens
      const tokens = custom.split(/\s+/);
      
      tokens.forEach((token) => {
        // B = Baixo (down)
        if (token === 'B' || token === '↓' || token === 'BAIXO' || token === 'DOWN' || token === 'D') {
          parsed.push({ beat: beatCount, direction: "down", accent: beatCount === 1, muted: false });
          beatCount++;
        } 
        // A = Alto (up)
        else if (token === 'A' || token === '↑' || token === 'ALTO' || token === 'UP' || token === 'CIMA' || token === 'U') {
          parsed.push({ beat: beatCount, direction: "up", accent: false, muted: false });
          beatCount++;
        }
        // X = Abafado (muted)
        else if (token === 'X' || token === 'ABAFADO' || token === 'MUTED' || token === 'M') {
          parsed.push({ beat: beatCount, direction: "muted", accent: false, muted: true });
          beatCount++;
        }
        // L = Leque (fan)
        else if (token === 'L' || token === 'LEQUE' || token === 'FAN') {
          parsed.push({ beat: beatCount, direction: "fan", accent: false, muted: false });
          beatCount++;
        }
      });
      
      if (parsed.length > 0) {
        const timeSignature = rhythm.time_signature || "4/4";
        const [beats] = timeSignature.split('/').map(Number);
        return { pattern: parsed, beats: Math.max(beats, parsed.length) };
      }
    }
    
    // Caso contrário, usa o padrão automático
    const lower = pattern.toLowerCase();
    
    // Detecta compasso
    const timeSignature = rhythm.time_signature || "4/4";
    const [beats] = timeSignature.split('/').map(Number);
    
    // Padrões comuns de ritmos sertanejos (batidas no violão/viola)
    const patterns = {
      // Guarânia (3/4) - Baixo Alto Baixo
      "guarânia": [
        { beat: 1, direction: "down", accent: true, muted: false },
        { beat: 2, direction: "up", accent: false, muted: false },
        { beat: 3, direction: "down", accent: false, muted: false }
      ],
      
      // Vanera (3/4) - Baixo Alto Baixo Alto Baixo Alto
      "vanera": [
        { beat: 1, direction: "down", accent: true, muted: false },
        { beat: 1.5, direction: "up", accent: false, muted: false },
        { beat: 2, direction: "down", accent: false, muted: false },
        { beat: 2.5, direction: "up", accent: false, muted: false },
        { beat: 3, direction: "down", accent: false, muted: false },
        { beat: 3.5, direction: "up", accent: false, muted: false }
      ],
      
      // Rancheira (4/4) - Baixo Alto Baixo Alto
      "rancheira": [
        { beat: 1, direction: "down", accent: true, muted: false },
        { beat: 2, direction: "up", accent: false, muted: false },
        { beat: 3, direction: "down", accent: true, muted: false },
        { beat: 4, direction: "up", accent: false, muted: false }
      ],
      
      // Toada (2/4) - Baixo Alto
      "toada": [
        { beat: 1, direction: "down", accent: true, muted: false },
        { beat: 2, direction: "up", accent: false, muted: false }
      ],
      
      // Baião (2/4) - Baixo Alto Baixo Alto
      "baião": [
        { beat: 1, direction: "down", accent: true, muted: false },
        { beat: 1.5, direction: "up", accent: false, muted: false },
        { beat: 2, direction: "down", accent: false, muted: false },
        { beat: 2.5, direction: "up", accent: true, muted: false }
      ],
      
      // Arrasta-pé (2/4) - rápido com muitas batidas
      "arrasta": [
        { beat: 1, direction: "down", accent: true, muted: false },
        { beat: 1.25, direction: "up", accent: false, muted: false },
        { beat: 1.5, direction: "down", accent: false, muted: false },
        { beat: 1.75, direction: "up", accent: false, muted: false },
        { beat: 2, direction: "down", accent: false, muted: false },
        { beat: 2.25, direction: "up", accent: false, muted: false },
        { beat: 2.5, direction: "down", accent: false, muted: false },
        { beat: 2.75, direction: "up", accent: true, muted: false }
      ],
      
      // Polca (2/4) - Baixo Alto Baixo Alto
      "polca": [
        { beat: 1, direction: "down", accent: true, muted: false },
        { beat: 1.5, direction: "up", accent: false, muted: false },
        { beat: 2, direction: "down", accent: false, muted: false },
        { beat: 2.5, direction: "up", accent: false, muted: false }
      ]
    };
    
    // Tenta encontrar pattern conhecido
    for (const [key, value] of Object.entries(patterns)) {
      if (lower.includes(key)) {
        return { pattern: value, beats };
      }
    }
    
    // Se tem palavras como "baixo" e "alto" ou "cima" e "baixo"
    if (lower.includes("baixo") || lower.includes("alto") || lower.includes("cima") || lower.includes("leque")) {
      const parts = pattern.split(/[-–—,]/);
      const parsed = [];
      let currentBeat = 1;
      const increment = beats / parts.length;
      
      parts.forEach((part) => {
        const trimmed = part.trim().toLowerCase();
        if (trimmed.includes("baixo")) {
          parsed.push({ beat: currentBeat, direction: "down", accent: currentBeat === 1, muted: false });
        } else if (trimmed.includes("cima") || trimmed.includes("alto")) {
          parsed.push({ beat: currentBeat, direction: "up", accent: false, muted: false });
        } else if (trimmed.includes("abafado") || trimmed.includes("x")) {
          parsed.push({ beat: currentBeat, direction: "muted", accent: false, muted: true });
        } else if (trimmed.includes("leque")) {
          parsed.push({ beat: currentBeat, direction: "fan", accent: false, muted: false });
        }
        currentBeat += increment;
      });
      
      if (parsed.length > 0) {
        return { pattern: parsed, beats };
      }
    }
    
    // Padrão genérico baseado no compasso
    const genericPattern = [];
    if (beats === 2) {
      genericPattern.push(
        { beat: 1, direction: "down", accent: true, muted: false },
        { beat: 2, direction: "up", accent: false, muted: false }
      );
    } else if (beats === 3) {
      genericPattern.push(
        { beat: 1, direction: "down", accent: true, muted: false },
        { beat: 2, direction: "up", accent: false, muted: false },
        { beat: 3, direction: "down", accent: false, muted: false }
      );
    } else {
      genericPattern.push(
        { beat: 1, direction: "down", accent: true, muted: false },
        { beat: 2, direction: "up", accent: false, muted: false },
        { beat: 3, direction: "down", accent: false, muted: false },
        { beat: 4, direction: "up", accent: false, muted: false }
      );
    }
    
    return { pattern: genericPattern, beats };
  };

  const { pattern, beats } = parsePattern(rhythm.pattern, rhythm.diagram_pattern);
  
  if (!pattern || pattern.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/60 rounded-lg p-4 border border-[#D4C5B0]">
      <p className="text-xs text-[#A68A64] font-medium mb-3 text-center uppercase">
        Diagrama da Batida
      </p>
      
      <div className="flex items-center justify-center gap-2 overflow-x-auto">
        {pattern.map((hit, index) => {
          const isDown = hit.direction === "down";
          const isUp = hit.direction === "up";
          const isMuted = hit.direction === "muted";
          const isFan = hit.direction === "fan";
          
          const symbolColor = hit.accent ? "text-[#8B6F47]" : isMuted ? "text-red-600" : isFan ? "text-[#9CAF88]" : "text-[#A68A64]";
          const symbolSize = hit.accent ? "text-3xl" : "text-2xl";
          
          let symbol = "";
          let label = "";
          if (isDown) {
            symbol = "↓";
            label = "BAIXO";
          } else if (isUp) {
            symbol = "↑";
            label = "CIMA";
          } else if (isMuted) {
            symbol = "✕";
            label = "XIS";
          } else if (isFan) {
            symbol = "⋰";
            label = "LEQUE";
          }
          
          return (
            <div key={`hit-${index}`} className="flex flex-col items-center shrink-0">
              <span className={`${symbolColor} ${symbolSize} font-bold leading-none`}>
                {symbol}
              </span>
              <span className="text-[10px] text-[#8B6F47] mt-0.5 font-semibold">
                {label}
              </span>
            </div>
          );
        })}
      </div>
      
      {rhythm.time_signature && (
        <p className="text-center text-xs text-[#A68A64] mt-3">
          Compasso: <span className="font-bold text-[#8B6F47]">{rhythm.time_signature}</span>
        </p>
      )}
    </div>
  );
}