import React, { useState } from "react";
import { Settings2, Check, RotateCcw, Pencil, Maximize, Scissors, Eye, RefreshCw } from "lucide-react";

/**
 * Painel de ajustes individuais por música (fonte, colunas, quebra de página,
 * auto-fit, espaçamento, edição de cifra, editor de quebras, prévia).
 * Gerencia o estado "aberto/fechado" internamente para poder ser reusado
 * tanto na etapa de seleção quanto na de organização da apostila.
 */
export default function SongAdjustPanel({
  song,
  settings,
  onSetOverride,
  onClearOverride,
  onClearCustomCifra,
  onEditCifra,
  onBreakEditor,
  onPreview,
  hidden = false,
}) {
  const [open, setOpen] = useState(false);

  if (hidden) return null;

  return (
    <div className="mt-1">
      <div className="flex justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
          className={`p-1 rounded-md transition-colors flex items-center justify-center ${
            open ? 'bg-[#8B6F47] text-white' : 'text-stone-400 hover:text-[#8B6F47] hover:bg-black/5'
          }`}
          style={{ minHeight: 0, minWidth: 0, height: 24, width: 24 }}
          title="Ajustes individuais desta música"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Painel de ajustes */}
      {open && (
        <div className="ml-6 mr-2 mb-1.5 p-2.5 bg-amber-50 border border-[#D4AF37]/40 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8B6F47] uppercase tracking-wide">Ajustes desta música</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#9CAF88] font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Salvo automaticamente
              </span>
              {settings.hasOverride && (
                <button
                  onClick={() => onClearOverride(song.id)}
                  className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-red-500 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Padrão
                </button>
              )}
            </div>
          </div>
          {/* Font size */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-stone-600 w-10">Fonte:</span>
            {[
              { v: "pequeno", l: "P" },
              { v: "medio", l: "M" },
              { v: "grande", l: "G" },
              { v: "extra", l: "GG" },
              { v: "gigante", l: "XG" },
              { v: "xxg", l: "XX" },
            ].map(opt => (
              <button
                key={opt.v}
                onClick={() => onSetOverride(song.id, 'fontSize', opt.v)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                  settings.fontSize === opt.v
                    ? 'bg-[#8B6F47] text-white'
                    : 'bg-white text-[#8B6F47] border border-[#D4C5B0]'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
          {/* Columns */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-stone-600 w-10">Colunas:</span>
            {[1, 2].map(n => (
              <button
                key={n}
                onClick={() => onSetOverride(song.id, 'columns', n)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                  settings.columns === n
                    ? 'bg-[#8B6F47] text-white'
                    : 'bg-white text-[#8B6F47] border border-[#D4C5B0]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {/* Page break */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.pageBreak}
              onChange={e => onSetOverride(song.id, 'pageBreak', e.target.checked)}
              className="w-3 h-3 accent-[#8B6F47]"
            />
            <span className="text-[10px] text-stone-600">Iniciar em página nova</span>
          </label>
          {/* Auto-fit */}
          <label className="flex items-center gap-1.5 cursor-pointer bg-[#D4AF37]/10 rounded-md px-1.5 py-1">
            <input
              type="checkbox"
              checked={settings.autoFit}
              onChange={e => onSetOverride(song.id, 'autoFit', e.target.checked)}
              className="w-3 h-3 accent-[#D4AF37]"
            />
            <span className="text-[10px] font-bold text-[#8B6F47] flex items-center gap-1">
              <Maximize className="w-3 h-3" /> Caber em 1 página (auto)
            </span>
          </label>
          {/* Line height */}
          <div>
            <label className="text-[10px] text-stone-600 flex justify-between">
              <span>Espaçamento de linhas:</span>
              <span className="font-bold text-[#8B6F47]">{settings.lineHeight.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0.7"
              max="2.5"
              step="0.1"
              value={settings.lineHeight}
              onChange={e => onSetOverride(song.id, 'lineHeight', parseFloat(e.target.value))}
              className="w-full accent-[#8B6F47] h-3"
            />
          </div>
          {/* Letter spacing (condensar/expandir caracteres) */}
          <div>
            <label className="text-[10px] text-stone-600 flex justify-between">
              <span>Espaçamento entre caracteres:</span>
              <span className="font-bold text-[#8B6F47]">{settings.letterSpacing.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="-1"
              max="3"
              step="0.1"
              value={settings.letterSpacing}
              onChange={e => onSetOverride(song.id, 'letterSpacing', parseFloat(e.target.value))}
              className="w-full accent-[#8B6F47] h-3"
            />
          </div>
          {/* Editar cifra da apostila */}
          {song.cifra_text && (
            <button
              onClick={onEditCifra}
              className="w-full flex items-center justify-between py-1.5 px-2.5 text-[10px] font-bold rounded-lg bg-[#5a3e28] text-white hover:opacity-90 transition-opacity"
            >
              <span className="flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Editar cifra da apostila
              </span>
              {settings.customCifra && (
                <span className="text-[9px] bg-white/25 px-1.5 py-0.5 rounded">editada</span>
              )}
            </button>
          )}
          {/* Sincronizar com cifra original */}
          {settings.customCifra && (
            <button
              onClick={() => {
                if (confirm("Usar a cifra original atualizada para esta música na apostila?\n\nA edição específica da apostila será descartada (ajustes de layout/quebras são mantidos).")) {
                  onClearCustomCifra(song.id);
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sincronizar com cifra original
            </button>
          )}
          {/* Editor visual de quebras */}
          {song.cifra_text && (
            <button
              onClick={onBreakEditor}
              className="w-full flex items-center justify-between py-1.5 px-2.5 text-[10px] font-bold rounded-lg bg-[#D4AF37] text-white hover:opacity-90 transition-opacity"
            >
              <span className="flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" /> Editor de quebras
              </span>
              {settings.breakLines.length > 0 && (
                <span className="text-[9px] bg-white/25 px-1.5 py-0.5 rounded">{settings.breakLines.length} quebra(s)</span>
              )}
            </button>
          )}
          {/* Prévia da impressão */}
          <button
            onClick={onPreview}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold rounded-lg bg-[#8B6F47] text-white hover:opacity-90 transition-opacity"
          >
            <Eye className="w-3.5 h-3.5" /> Ver prévia da impressão
          </button>
        </div>
      )}
    </div>
  );
}