import React from "react";

export default function RhythmDiagramMini({ rhythm, size = "sm" }) {
  if ((!rhythm.pattern || rhythm.pattern.trim() === "") && (!rhythm.diagram_pattern || rhythm.diagram_pattern.trim() === "")) {
    return null;
  }

  const parsePattern = (pattern, customDiagram) => {
    if (customDiagram && customDiagram.trim()) {
      const custom = customDiagram.trim().toUpperCase();
      const parsed = [];
      const tokens = custom.split(/\s+/);
      
      tokens.forEach((token) => {
        if (token === 'B' || token === '↓' || token === 'BAIXO' || token === 'DOWN' || token === 'D') {
          parsed.push({ direction: "down", accent: parsed.length === 0 });
        } else if (token === 'A' || token === '↑' || token === 'ALTO' || token === 'UP' || token === 'CIMA' || token === 'U') {
          parsed.push({ direction: "up", accent: false });
        } else if (token === 'X' || token === 'ABAFADO' || token === 'MUTED' || token === 'M') {
          parsed.push({ direction: "muted", accent: false });
        } else if (token === 'L' || token === 'LEQUE' || token === 'FAN') {
          parsed.push({ direction: "fan", accent: false });
        }
      });
      
      if (parsed.length > 0) {
        return parsed;
      }
    }
    
    const lower = pattern.toLowerCase();
    
    if (lower.includes("guarânia")) {
      return [
        { direction: "down", accent: true },
        { direction: "up", accent: false },
        { direction: "down", accent: false }
      ];
    }
    
    if (lower.includes("vanera")) {
      return [
        { direction: "down", accent: true },
        { direction: "up", accent: false },
        { direction: "down", accent: false },
        { direction: "up", accent: false }
      ];
    }
    
    return [
      { direction: "down", accent: true },
      { direction: "up", accent: false }
    ];
  };

  const pattern = parsePattern(rhythm.pattern, rhythm.diagram_pattern);
  
  if (!pattern || pattern.length === 0) return null;

  const symbolSize = size === "xs" ? "text-base" : size === "sm" ? "text-xl" : "text-2xl";
  const maxSymbols = size === "xs" ? 4 : size === "sm" ? 5 : 8;
  const displayPattern = pattern.slice(0, maxSymbols);

  return (
    <div className="flex items-center gap-1">
      {displayPattern.map((hit, index) => {
        const isDown = hit.direction === "down";
        const isUp = hit.direction === "up";
        const isMuted = hit.direction === "muted";
        const isFan = hit.direction === "fan";
        
        const symbolColor = hit.accent ? "text-[#D4AF37]" : isMuted ? "text-red-500" : isFan ? "text-[#9CAF88]" : "text-[#8B6F47]";
        
        let symbol = "";
        if (isDown) symbol = "↓";
        else if (isUp) symbol = "↑";
        else if (isMuted) symbol = "✕";
        else if (isFan) symbol = "⋰";
        
        return (
          <span key={`hit-${index}`} className={`${symbolColor} ${symbolSize} font-bold leading-none`}>
            {symbol}
          </span>
        );
      })}
    </div>
  );
}