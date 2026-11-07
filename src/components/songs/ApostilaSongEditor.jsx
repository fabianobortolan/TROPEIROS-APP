import React, { useState, useMemo } from "react";
import { X, Printer, Plus, Trash2, Eye, Type, Columns, Maximize, Sparkles, FileText, Pencil, Save, RefreshCw } from "lucide-react";

function escapeHtml(text) {
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const cleanCifra = (raw) => {
  let c = raw || "";
  c = c.replace(/\[Intro\]\s*\n(Tom:.*\n)?(BPM:.*\n)?(Ritmo:.*\n)?\s*\n?/gi, "");
  c = c.replace(/^Pattern:.*$/gim, "");
  c = c.replace(/^\s+/, "").replace(/\n{3,}/g, "\n\n");
  return c;
};

// Altura útil da página A4 em px (297mm - 28mm de margens verticais)
const PAGE_CONTENT_PX = (297 - 28) * 3.7795;
const HEADER_PX = 90;

// Regex para detectar marcadores de seção na cifra
const SECTION_RE = /^\s*\[(Intro|Refr[ãa]o|Verso|Ponte|Solo|Final|Fim|Coda|Estrofe|Parte|Dobrado|Base)[^\]]*\]/i;

/**
 * Editor visual de quebras de página para uma música da apostila.
 * Oferece ajuste fino completo (fonte, colunas, espaçamento, auto-ajuste)
 * com visualização imediata, detecção automática de quebras em seções e
 * estimativa de páginas para impressão facilitada.
 *
 * Props:
 *  - song: entidade Song
 *  - settings: { fontSize, columns, lineHeight, breakLines, autoFit, pageBreak }
 *  - onSetOverride: (field, value) => void  (atualiza ajustes ao vivo)
 *  - onSave: (breakLines) => void
 *  - onClose: () => void
 *  - onPreview: () => void
 */
export default function ApostilaSongEditor({ song, settings, onSetOverride, onSave, onSaveCifra, onClose, onPreview, initialEditMode }) {
  const [breakLines, setBreakLines] = useState(settings.breakLines || []);
  const [editMode, setEditMode] = useState(!!initialEditMode);
  const [editedCifra, setEditedCifra] = useState(settings.customCifra || cleanCifra(song.cifra_text));

  const lines = editedCifra.split("\n");

  const fontSizeMap = { pequeno: "8pt", medio: "10pt", grande: "12pt", extra: "14pt", gigante: "16pt", xxg: "18pt" };
  const fontPx = fontSizeMap[settings.fontSize] || "10pt";
  const fontPxNum = parseFloat(fontPx) * (96 / 72);
  const lineHeightPx = fontPxNum * (settings.lineHeight || 1.5);

  // Estimativa de páginas (considerando colunas)
  const estimatedPages = useMemo(() => {
    const totalLines = lines.length;
    if (totalLines === 0) return 1;
    const cols = settings.columns === 2 ? 2 : 1;
    const linesPerPageN = Math.max(1, Math.floor(PAGE_CONTENT_PX / lineHeightPx) * cols);
    const linesPerPage1 = Math.max(1, Math.floor((PAGE_CONTENT_PX - HEADER_PX) / lineHeightPx) * cols);
    if (totalLines <= linesPerPage1) return 1;
    const remaining = totalLines - linesPerPage1;
    return 1 + Math.ceil(remaining / linesPerPageN);
  }, [lines.length, lineHeightPx, settings.columns]);

  // Índices das linhas que iniciam uma seção (para auto-quebra)
  const sectionIndices = useMemo(() => {
    const idxs = [];
    lines.forEach((line, i) => {
      if (i > 0 && SECTION_RE.test(line)) idxs.push(i);
    });
    return idxs;
  }, [lines]);

  const toggleBreak = (lineIndex) => {
    setBreakLines(prev => {
      if (prev.includes(lineIndex)) {
        return prev.filter(l => l !== lineIndex);
      }
      return [...prev, lineIndex].sort((a, b) => a - b);
    });
  };

  const clearAll = () => setBreakLines([]);

  // Quebra automática antes de cada seção detectada (Refrão, Verso, etc.)
  const autoBreakSections = () => {
    const next = new Set(breakLines);
    sectionIndices.forEach(i => next.add(i));
    setBreakLines(Array.from(next).sort((a, b) => a - b));
  };

  const originalCifra = settings.customCifra || cleanCifra(song.cifra_text);
  const currentOriginal = cleanCifra(song.cifra_text);
  // Compara o conteúdo ignorando tags de seção e espaçamento: mudanças
  // apenas cosméticas na original não invalidam a edição salva.
  const normalizeForSync = (c) => (c || "").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  // Sem base (edição salva antes do controle de sincronização) ou base desatualizada
  const hasBase = !!settings.customCifraBase;
  const staleCifra = !!(settings.customCifra && (!hasBase || normalizeForSync(settings.customCifraBase) !== normalizeForSync(currentOriginal)));
  const staleMsg = hasBase
    ? "A cifra original foi atualizada desde seu último ajuste da apostila."
    : "Esta edição foi salva antes do controle de sincronização e pode estar desatualizada em relação à cifra original.";

  const handleSave = () => {
    // Sempre persiste para registrar a "base" (snapshot da original), mesmo
    // sem alterar o texto — assim correções futuras na original propagam.
    if (onSaveCifra) onSaveCifra(editedCifra, currentOriginal);
    onSave(breakLines);
    onClose();
  };

  const handlePreview = () => {
    if (onSaveCifra) onSaveCifra(editedCifra, currentOriginal);
    onSave(breakLines);
    onPreview(editedCifra !== originalCifra ? editedCifra : undefined);
  };

  const updateSetting = (field, value) => {
    if (onSetOverride) onSetOverride(field, value);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-2 sm:p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm sm:text-base truncate">Editor de Quebras — {song.title}</h3>
            <p className="text-white/80 text-xs truncate flex items-center gap-1.5">
              {song.artist}
              <span className="text-white/40">•</span>
              <FileText className="w-3 h-3" />
              ~{estimatedPages} pág.
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar de ajustes finos ao vivo */}
        <div className="bg-amber-50 border-b border-[#D4C5B0] px-4 py-2.5 flex flex-col gap-2 flex-shrink-0">
          {/* Linha 1: quebras info + ações de quebra */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <span className="font-bold text-[#8B6F47]">{breakLines.length}</span> quebra(s)
              <span className="text-stone-400">•</span>
              <span className="hidden sm:inline">Clique <Plus className="w-3 h-3 inline" /> entre as linhas</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${
                  editMode
                    ? 'bg-[#8B6F47] text-white'
                    : 'bg-[#D4AF37]/15 text-[#8B6F47] border border-[#D4AF37]/50 hover:bg-[#D4AF37]/25'
                }`}
                title="Editar o texto da cifra para cortar partes ou ajustar"
              >
                <Pencil className="w-3 h-3" /> {editMode ? "Editando cifra" : "Editar cifra"}
              </button>
              {settings.customCifra && (
                <button
                  onClick={() => setEditedCifra(currentOriginal)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  title="Descartar a edição da apostila e usar a cifra original atualizada"
                >
                  <RefreshCw className="w-3 h-3" /> Restaurar original
                </button>
              )}
              {sectionIndices.length > 0 && (
                <button
                  onClick={autoBreakSections}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md bg-[#D4AF37]/15 text-[#8B6F47] border border-[#D4AF37]/50 hover:bg-[#D4AF37]/25 transition-colors"
                  title={`Quebrar antes de ${sectionIndices.length} seção(ões) detectada(s)`}
                >
                  <Sparkles className="w-3 h-3" /> Quebrar nas seções
                </button>
              )}
              {breakLines.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Limpar
                </button>
              )}
            </div>
          </div>

          {/* Linha 2: controles de fonte/colunas/autopage */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Fonte */}
            <div className="flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-stone-500" />
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
                  onClick={() => updateSetting("fontSize", opt.v)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                    settings.fontSize === opt.v
                      ? "bg-[#8B6F47] text-white"
                      : "bg-white text-[#8B6F47] border border-[#D4C5B0]"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            {/* Colunas */}
            <div className="flex items-center gap-1">
              <Columns className="w-3.5 h-3.5 text-stone-500" />
              {[1, 2].map(n => (
                <button
                  key={n}
                  onClick={() => updateSetting("columns", n)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                    settings.columns === n
                      ? "bg-[#8B6F47] text-white"
                      : "bg-white text-[#8B6F47] border border-[#D4C5B0]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {/* Auto-fit */}
            <label className="flex items-center gap-1 cursor-pointer bg-[#D4AF37]/10 rounded-md px-1.5 py-1">
              <input
                type="checkbox"
                checked={settings.autoFit}
                onChange={e => updateSetting("autoFit", e.target.checked)}
                className="w-3 h-3 accent-[#D4AF37]"
              />
              <span className="text-[10px] font-bold text-[#8B6F47] flex items-center gap-1">
                <Maximize className="w-3 h-3" /> Caber em 1 pág.
              </span>
            </label>
          </div>

          {/* Linha 3: espaçamento slider compacto */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-600 w-24">Espaçamento linhas:</span>
            <input
              type="range"
              min="0.7"
              max="2.5"
              step="0.1"
              value={settings.lineHeight}
              onChange={e => updateSetting("lineHeight", parseFloat(e.target.value))}
              className="flex-1 accent-[#8B6F47] h-3"
            />
            <span className="text-[10px] font-bold text-[#8B6F47] w-8 text-right">{(settings.lineHeight || 1.5).toFixed(1)}</span>
          </div>

          {/* Linha 4: ações finais */}
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={handlePreview}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-md bg-white text-[#8B6F47] border border-[#8B6F47] hover:bg-[#F5F1E8] transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> Prévia da impressão
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-md bg-[#8B6F47] text-white hover:opacity-90 transition-opacity"
            >
              <Printer className="w-3.5 h-3.5" /> Concluir
            </button>
          </div>
        </div>

        {/* Cifra editor area */}
        <div className="overflow-y-auto flex-1 bg-[#fdf8f2] p-4">
          {/* Aviso: cifra original foi atualizada após a edição da apostila */}
          {staleCifra && (
            <div className="mb-3 rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-700 leading-snug">
                  {staleMsg}
                </p>
                <p className="text-[10px] text-amber-600 leading-snug mt-0.5">
                  {hasBase ? "Ao gerar, esta música usará a cifra original corrigida. Para editar novamente a partir da versão atualizada:" : "Sincronize para usar a cifra original atualizada como base de edição:"}
                </p>
                <button
                  onClick={() => setEditedCifra(currentOriginal)}
                  className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Sincronizar com a cifra original
                </button>
              </div>
            </div>
          )}
          {/* Song header (igual ao print) */}
          <div className="flex items-center gap-3 border-b-[3px] border-[#8B6F47] pb-2.5 mb-3">
            <div className="bg-[#8B6F47] text-white font-black rounded-lg flex items-center justify-center flex-shrink-0" style={{ minWidth: 42, height: 42, fontSize: "16pt" }}>
              1
            </div>
            <div className="min-w-0">
              <div className="font-black text-[#5a3e28] uppercase tracking-wide truncate" style={{ fontSize: "18pt" }}>{song.title}</div>
              <div className="font-bold text-[#8B6F47] truncate" style={{ fontSize: "12pt" }}>{song.artist}</div>
              <div className="text-stone-500" style={{ fontSize: "10pt" }}>
                {song.main_key && <><strong>Tom:</strong> {song.main_key} </>}
                {song.rhythm_name && <>&nbsp;•&nbsp; <strong>Ritmo:</strong> {song.rhythm_name} </>}
                {song.tempo && <>&nbsp;•&nbsp; <strong>BPM:</strong> {song.tempo}</>}
              </div>
            </div>
          </div>

          {/* Indicador de colunas (visual) */}
          {settings.columns === 2 && (
            <div className="mb-2 text-[10px] text-violet-600 font-bold bg-violet-50 rounded px-2 py-1 border border-violet-200 flex items-center gap-1">
              <Columns className="w-3 h-3" /> 2 colunas — as quebras manuais dividem entre colunas
            </div>
          )}

          {/* Modo de edição da cifra */}
          {editMode && (
            <div className="mb-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] text-stone-600 bg-amber-50 rounded px-2 py-1.5 border border-[#D4AF37]/40">
                <Save className="w-3 h-3 text-[#8B6F47] flex-shrink-0" />
                Edite o texto para cortar partes ou ajustar. Ao concluir, esta versão será usada na apostila (a original é preservada).
              </div>
              <textarea
                value={editedCifra}
                onChange={e => setEditedCifra(e.target.value)}
                className="w-full font-mono text-xs rounded-lg border-2 border-[#D4AF37] focus:border-[#8B6F47] focus:outline-none p-3 bg-white resize-y"
                style={{ minHeight: "320px", lineHeight: settings.lineHeight, fontSize: fontPx }}
                placeholder="Digite a cifra..."
              />
            </div>
          )}

          {/* Linhas com zonas de inserção de quebra */}
          {!editMode && (
          <div className={`font-mono font-semibold ${settings.columns === 2 ? 'columns-2 gap-4' : ''}`} style={{ fontSize: fontPx, lineHeight: settings.lineHeight, columnRule: settings.columns === 2 ? "1px dashed #D4AF37" : undefined }}>
            {lines.map((line, i) => {
              const isSection = SECTION_RE.test(line);
              return (
                <React.Fragment key={i}>
                  {/* Zona de inserção de quebra antes desta linha (página ou coluna conforme o layout) */}
                  <button
                    onClick={() => toggleBreak(i)}
                    className={`w-full flex items-center gap-2 py-0.5 px-1 -mx-1 rounded transition-all group ${
                      breakLines.includes(i)
                        ? "bg-amber-100"
                        : "hover:bg-[#8B6F47]/10 opacity-30 hover:opacity-100"
                    }`}
                    style={{ minHeight: 6, breakInside: "avoid" }}
                  >
                    {breakLines.includes(i) ? (
                      <div className="w-full flex items-center justify-center gap-2 py-1" style={{ breakAfter: settings.columns === 2 ? "column" : "page" }}>
                        <div className="flex-1 border-t-[3px] border-dashed border-[#D4AF37]"></div>
                        <span className="text-[10px] font-bold text-[#D4AF37] flex items-center gap-1 flex-shrink-0" style={{ fontFamily: "sans-serif" }}>
                          ✂ {settings.columns === 2 ? "QUEBRA DE COLUNA" : "QUEBRA DE PÁGINA"}
                          <Trash2 className="w-3 h-3" />
                        </span>
                        <div className="flex-1 border-t-[3px] border-dashed border-[#D4AF37]"></div>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-center gap-2 py-0.5">
                        <div className="flex-1 border-t border-dashed border-stone-300"></div>
                        <span className="text-[9px] text-stone-400 font-bold flex items-center gap-0.5 group-hover:text-[#8B6F47]" style={{ fontFamily: "sans-serif" }}>
                          <Plus className="w-3 h-3" /> {settings.columns === 2 ? "quebra coluna" : "quebra"}
                        </span>
                        <div className="flex-1 border-t border-dashed border-stone-300"></div>
                      </div>
                    )}
                  </button>
                  {/* A linha da cifra */}
                  <div
                    className={`px-1 whitespace-pre-wrap break-words ${isSection ? 'bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] -ml-1 pl-2 rounded-sm' : ''}`}
                    style={{ minHeight: "1em", breakInside: "avoid" }}
                  >
                    {line || "\u00A0"}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          )}

          {settings.columns === 2 && breakLines.length > 0 && (
            <div className="mt-3 text-[10px] text-violet-600 bg-violet-50 rounded px-2 py-1.5 border border-violet-200 flex items-center gap-1">
              <Columns className="w-3 h-3 flex-shrink-0" />
              Em 2 colunas, a <strong>primeira quebra</strong> define onde a coluna 1 termina e a coluna 2 começa. Clique na linha que você quer mandar para a coluna 2 (ou remova a quebra para trazê-la de volta).
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="bg-[#F5F1E8] border-t border-[#D4C5B0] px-4 py-2 flex-shrink-0">
          <p className="text-[10px] text-stone-500 text-center leading-snug">
            <strong>Dica:</strong> as seções (Refrão, Verso, Ponte...) ficam destacadas em dourado. Quebre antes delas para evitar cortes no meio de uma parte. Use <strong>Prévia</strong> para conferir a paginação real.
          </p>
        </div>
      </div>
    </div>
  );
}