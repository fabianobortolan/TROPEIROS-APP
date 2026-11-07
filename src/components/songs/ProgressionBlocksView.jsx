import React from "react";
import { Badge } from "@/components/ui/badge";

const SECTION_COLORS = {
  intro: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', accent: '#9CA3AF' },
  verso: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', accent: '#3B82F6' },
  verse: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', accent: '#3B82F6' },
  'pré-refrão': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', accent: '#8B5CF6' },
  'pre-refrao': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', accent: '#8B5CF6' },
  refrão: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', accent: '#D4AF37' },
  refrao: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', accent: '#D4AF37' },
  chorus: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', accent: '#D4AF37' },
  ponte: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', accent: '#F43F5E' },
  bridge: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', accent: '#F43F5E' },
  solo: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', accent: '#22C55E' },
  final: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', accent: '#F97316' },
  outro: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', accent: '#F97316' },
};

const DEFAULT_COLOR = { bg: 'bg-[#F5F1E8]', border: 'border-[#D4C5B0]', text: 'text-[#8B6F47]', accent: '#8B6F47' };

// Mapeia grau romano para cor de fundo do bloco de acorde
const DEGREE_COLORS = {
  'I': 'bg-green-100 text-green-800 border-green-300',
  'ii': 'bg-blue-100 text-blue-800 border-blue-300',
  'II': 'bg-blue-100 text-blue-800 border-blue-300',
  'iii': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'III': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'IV': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'iv': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'V': 'bg-red-100 text-red-800 border-red-300',
  'v': 'bg-red-100 text-red-800 border-red-300',
  'V7': 'bg-red-200 text-red-900 border-red-400',
  'vi': 'bg-purple-100 text-purple-800 border-purple-300',
  'VI': 'bg-purple-100 text-purple-800 border-purple-300',
  'vii': 'bg-gray-100 text-gray-700 border-gray-300',
  'VII': 'bg-gray-100 text-gray-700 border-gray-300',
};

function getPatternDegrees(pattern) {
  if (!pattern) return [];
  return pattern.split(/[-,\s]+/).filter(Boolean);
}

function getSectionColor(section) {
  if (!section) return DEFAULT_COLOR;
  const s = section.toLowerCase().trim();
  for (const [key, colors] of Object.entries(SECTION_COLORS)) {
    if (s.includes(key)) return colors;
  }
  return DEFAULT_COLOR;
}

function getDegreeColor(degree) {
  // Tenta match exato, depois match do grau base (sem sufixo)
  if (DEGREE_COLORS[degree]) return DEGREE_COLORS[degree];
  const base = degree.replace(/[^IiVv]/g, '');
  return DEGREE_COLORS[base] || 'bg-gray-50 text-gray-600 border-gray-200';
}

export default function ProgressionBlocksView({ progressions }) {
  if (!progressions || progressions.length === 0) return null;

  return (
    <div className="space-y-3">
      {progressions.map((prog, index) => {
        const colorScheme = getSectionColor(prog.section);
        const degrees = getPatternDegrees(prog.pattern);
        const chords = Array.isArray(prog.chords) ? prog.chords : [];

        return (
          <div
            key={index}
            className={`rounded-xl border-2 ${colorScheme.border} ${colorScheme.bg} p-3`}
          >
            {/* Cabeçalho da seção */}
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colorScheme.accent }}
                />
                <span className={`text-xs font-bold uppercase tracking-wide ${colorScheme.text}`}>
                  {prog.section}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {prog.key && (
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${colorScheme.border} ${colorScheme.text}`}>
                    Tom: {prog.key}
                  </Badge>
                )}
                {prog.progression_name && (
                  <Badge className="text-[9px] px-1.5 py-0 bg-white/80 text-[#8B6F47] border border-[#D4C5B0]">
                    {prog.progression_name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Blocos de acordes */}
            {chords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {chords.map((chord, ci) => {
                  const degree = degrees[ci] || '';
                  const degreeColor = getDegreeColor(degree);
                  return (
                    <div key={ci} className="flex flex-col items-center">
                      <div
                        className={`rounded-lg border-2 px-2.5 py-1.5 text-center min-w-[38px] font-bold text-sm shadow-sm ${degreeColor}`}
                      >
                        {chord}
                      </div>
                      {degree && (
                        <span className="text-[9px] text-gray-400 mt-0.5 font-mono">{degree}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pattern romano */}
            {prog.pattern && (
              <p className="text-[10px] font-mono text-[#A68A64] bg-white/50 rounded px-2 py-0.5 inline-block">
                {prog.pattern}
              </p>
            )}
          </div>
        );
      })}

      {/* Legenda de cores */}
      <div className="pt-2 border-t border-[#D4C5B0]">
        <p className="text-[10px] text-[#A68A64] font-medium mb-1.5">Legenda de graus harmônicos:</p>
        <div className="flex flex-wrap gap-1">
          {[
            { label: 'I - Tônica', cls: 'bg-green-100 text-green-800 border-green-300' },
            { label: 'ii/II - Subdominante menor', cls: 'bg-blue-100 text-blue-800 border-blue-300' },
            { label: 'IV - Subdominante', cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
            { label: 'V/V7 - Dominante', cls: 'bg-red-100 text-red-800 border-red-300' },
            { label: 'vi - Relativa menor', cls: 'bg-purple-100 text-purple-800 border-purple-300' },
          ].map(({ label, cls }) => (
            <span key={label} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${cls}`}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}