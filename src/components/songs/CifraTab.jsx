import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, X, FileText, Loader2, Printer, Download, MessageCircle, CaseUpper } from "lucide-react";
import ClickableChordsCifra from "./ClickableChordsCifra";
import TranspositorCifra from "./TranspositorCifra";
import CifraWithComments from "./CifraWithComments";
import { uppercaseSelection } from "@/utils/textCaseUtils";

export default function CifraTab({ song, transposedCifra, onSaveCifra, onSaveComments, isAdmin = false, highlightLine = null }) {
  // onSaveCifra recebe (newText) ou (newText, newKey) se vindo do transpositor
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(song.cifra_text || "");
  const [displayText, setDisplayText] = useState(song.cifra_text || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showBalloons, setShowBalloons] = useState(false);
  // Controla se o displayText foi modificado localmente (após um save)
  const locallyModified = useRef(false);
  const textareaRef = useRef(null);

  // Sincroniza com prop externo APENAS se não houver edição local salva
  useEffect(() => {
    if (!locallyModified.current) {
      setDisplayText(song.cifra_text || "");
      setEditText(song.cifra_text || "");
    }
  }, [song.cifra_text]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveCifra(editText);
      // Atualiza display imediatamente com o texto salvo
      setDisplayText(editText);
      locallyModified.current = true;
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditText(displayText);
    setIsEditing(false);
  };

  // O texto a exibir: se transposto e não há edição local, usa transposedCifra; senão usa displayText
  const viewText = (!locallyModified.current && transposedCifra) ? transposedCifra : displayText;

  const handleExportDoc = () => {
    const text = viewText || "";
    const meta = [
      song.main_key ? `Tom: ${song.main_key}` : "",
      song.rhythm_name ? `Ritmo: ${song.rhythm_name}` : "",
      song.tempo ? `BPM: ${song.tempo}` : "",
    ].filter(Boolean).join(" • ");

    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // HTML com charset UTF-8 — Word, LibreOffice e Google Docs abrem nativamente sem problemas de acentuação
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${song.title} - ${song.artist}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0.5cm 2cm 2cm 2cm; color: #1a1a1a; }
    h1 { font-size: 18pt; color: #5a3e28; margin-bottom: 4px; }
    h2 { font-size: 13pt; color: #8B6F47; font-weight: normal; margin-bottom: 4px; }
    .meta { font-size: 10pt; color: #666; margin-bottom: 20px; }
    pre { font-family: "Courier New", Courier, monospace; font-size: 11pt; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <h1>${song.title}</h1>
  <h2>${song.artist}</h2>
  ${meta ? `<div class="meta">${meta}</div>` : ""}
  <pre>${escaped}</pre>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${song.title} - ${song.artist}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handlePrintCifra = () => {
    const text = viewText || "";
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Cifra – ${song.title} – ${song.artist}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 12pt; color: #1a1a1a; background: #fff; line-height: 1.5; }
    .header { border-bottom: 2px solid #8B6F47; padding-bottom: 8px; margin-bottom: 14px; }
    .title { font-size: 16pt; font-weight: 900; color: #5a3e28; font-family: Arial, sans-serif; }
    .artist { font-size: 11pt; color: #8B6F47; font-family: Arial, sans-serif; margin-top: 2px; }
    .meta { font-size: 9pt; color: #666; font-family: Arial, sans-serif; margin-top: 3px; }
    pre { white-space: pre-wrap; word-break: break-word; font-size: 11pt; line-height: 1.55; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${song.title}</div>
    <div class="artist">${song.artist}</div>
    <div class="meta">${song.main_key ? `Tom: ${song.main_key}` : ""}${song.rhythm_name ? ` • Ritmo: ${song.rhythm_name}` : ""}${song.tempo ? ` • BPM: ${song.tempo}` : ""}</div>
  </div>
  <pre>${text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.onload = () => { win.print(); };
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#8B6F47]">Cifra</h3>
        {!isEditing ? (
          <div className="flex gap-2">
            {viewText && (
              <>
                <Button
                  onClick={handlePrintCifra}
                  variant="outline"
                  size="sm"
                  className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir Cifra
                </Button>
                <Button
                  onClick={handleExportDoc}
                  variant="outline"
                  size="sm"
                  className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar .DOC
                </Button>
              </>
            )}
            <Button
              onClick={() => { setEditText(displayText || ""); setIsEditing(true); }}
              variant="outline"
              size="sm"
              className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar Cifra
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => uppercaseSelection(textareaRef.current, editText, setEditText)}
              size="sm"
              variant="outline"
              className="border-[#D4AF37] text-[#8B6F47] hover:bg-[#D4AF37] hover:text-white"
              title="Selecione um trecho para colocar em caixa alta (ou clique para converter tudo)"
            >
              <CaseUpper className="w-4 h-4 mr-1" />
              Caixa Alta
            </Button>
            <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-[#8B6F47] text-white hover:bg-[#6B5437]">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
            <Button onClick={handleCancel} variant="outline" size="sm" className="border-[#D4C5B0] text-[#8B6F47]">
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Transpositor */}
      {!isEditing && viewText && (
        <TranspositorCifra
          cifraText={displayText || song.cifra_text || ""}
          originalKey={song.original_key}
          currentKey={song.main_key || song.original_key}
          onApply={async (newText, newKey) => {
            await onSaveCifra(newText, newKey);
            setDisplayText(newText);
            locallyModified.current = true;
          }}
        />
      )}

      {/* Conteúdo */}
      {isEditing ? (
        <div className="space-y-2">
          <p className="text-xs text-[#A68A64]">💡 Use espaços para alinhar acordes com a letra.</p>
          <Textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="font-mono text-sm min-h-[500px] border-[#8B6F47] bg-white leading-6"
            spellCheck={false}
          />
        </div>
      ) : viewText ? (
        <div className="bg-white/60 rounded-xl border border-[#D4C5B0] p-4">
          {/* Toggle balões */}
          {onSaveComments && (
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowBalloons(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                  showBalloons
                    ? "bg-[#8B6F47] text-white border-[#8B6F47]"
                    : "bg-white text-[#8B6F47] border-[#D4C5B0] hover:border-[#8B6F47]"
                }`}
                title={showBalloons ? "Ocultar observações" : "Mostrar observações"}
              >
                <MessageCircle className="w-3 h-3" />
                {showBalloons ? "Ocultar Balões" : "Ver Balões"}
                {(song.cifra_comments || []).length > 0 && (
                  <span className={`rounded-full w-4 h-4 flex items-center justify-center font-bold ${showBalloons ? "bg-white text-[#8B6F47]" : "bg-[#8B6F47] text-white"}`} style={{ fontSize: "10px" }}>
                    {(song.cifra_comments || []).length}
                  </span>
                )}
              </button>
            </div>
          )}

          {onSaveComments && showBalloons ? (
            <CifraWithComments
              cifraText={viewText}
              comments={song.cifra_comments || []}
              isAdmin={isAdmin}
              highlightLine={highlightLine}
              onCommentsChange={(updated) => onSaveComments(updated)}
            />
          ) : (
            <ClickableChordsCifra cifraText={viewText} highlightLine={highlightLine} />
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-[#A68A64]">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="mb-3">Nenhuma cifra cadastrada para esta música.</p>
          <Button onClick={() => setIsEditing(true)} variant="outline" className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white">
            <Edit className="w-4 h-4 mr-2" />
            Adicionar Cifra
          </Button>
        </div>
      )}
    </div>
  );
}