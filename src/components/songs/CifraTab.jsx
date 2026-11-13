import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, X, FileText, Loader2, Printer, Download, MessageCircle, CaseUpper, ArrowUpDown, MoreVertical, Wand2, Lightbulb } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ClickableChordsCifra from "./ClickableChordsCifra";
import TranspositorCifra from "./TranspositorCifra";
import CifraWithComments from "./CifraWithComments";
import { uppercaseSelection } from "@/utils/textCaseUtils";
import { simplificarCifra, temOQueSimplificar, NIVEIS_SIMPLIFICACAO, lerNivelSimplificacao, gravarNivelSimplificacao } from "@/utils/simplificarAcordes";
import { lerInstrumento, gravarInstrumento } from "@/lib/acordesInstrumento";
import AcordesDaMusica from "./AcordesDaMusica";
import DicaMusica from "./DicaMusica";

export default function CifraTab({ song, transposedCifra, onSaveCifra, onSaveComments, isAdmin = false, highlightLine = null }) {
  const [mostrarTom, setMostrarTom] = React.useState(false);
  // onSaveCifra recebe (newText) ou (newText, newKey) se vindo do transpositor
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(song.cifra_text || "");
  const [displayText, setDisplayText] = useState(song.cifra_text || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showBalloons, setShowBalloons] = useState(false);
  const [nivel, setNivel] = useState(lerNivelSimplificacao);
  const [mostrarSimplificar, setMostrarSimplificar] = useState(false);
  const mudarNivel = (v) => { setNivel(v); gravarNivelSimplificacao(v); };
  const [mostrarDica, setMostrarDica] = useState(false);
  const [instrumento, setInstrumento] = useState(lerInstrumento);
  const mudarInstrumento = (v) => { setInstrumento(v); gravarInstrumento(v); };
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
  const textoBase = (!locallyModified.current && transposedCifra) ? transposedCifra : displayText;
  // Só oferece "Simplificar" se a música tem acordes que mudam
  const podeSimplificar = useMemo(() => temOQueSimplificar(textoBase), [textoBase]);
  const viewText = useMemo(() => (nivel && podeSimplificar ? simplificarCifra(textoBase, nivel) : textoBase), [textoBase, nivel, podeSimplificar]);
  const nomeNivel = NIVEIS_SIMPLIFICACAO.find((x) => x.id === nivel)?.nome;

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
      {/* Barra da cifra */}
      {!isEditing ? (
        <div className="flex flex-wrap items-center gap-2">
          {viewText && (
            <button
              type="button"
              onClick={() => setMostrarTom((v) => !v)}
              aria-expanded={mostrarTom}
              className={`h-10 px-3 rounded-xl border text-sm font-semibold flex items-center gap-1.5 ${mostrarTom ? "bg-[#6B4F2E] text-[#FFFDF8] border-[#6B4F2E]" : "bg-[#FFFDF8] text-[#6B4F2E] border-[#E6DCC8]"}`}
            >
              <ArrowUpDown className="w-4 h-4" /> Mudar tom
            </button>
          )}
          {viewText && (
            <button
              type="button"
              onClick={() => setMostrarSimplificar((v) => !v)}
              aria-expanded={mostrarSimplificar}
              className={`h-10 px-3 rounded-xl border text-sm font-semibold flex items-center gap-1.5 ${nivel ? "bg-[#6B8E4E] text-white border-[#6B8E4E]" : mostrarSimplificar ? "bg-[#6B4F2E] text-[#FFFDF8] border-[#6B4F2E]" : "bg-[#FFFDF8] text-[#6B4F2E] border-[#E6DCC8]"}`}
            >
              <Wand2 className="w-4 h-4" /> {nivel ? nomeNivel : "Simplificar"}
            </button>
          )}
          {viewText && (
            <button
              type="button"
              onClick={() => setMostrarDica((v) => !v)}
              aria-expanded={mostrarDica}
              className={`h-10 px-3 rounded-xl border text-sm font-semibold flex items-center gap-1.5 ${mostrarDica ? "bg-[#6B4F2E] text-[#FFFDF8] border-[#6B4F2E]" : "bg-[#FFF3DC] text-[#8A5A1E] border-[#E8C98F]"}`}
            >
              <Lightbulb className="w-4 h-4" /> Dica
            </button>
          )}
          <div className="flex-1" />
          {isAdmin && (
            <button
              type="button"
              onClick={() => { setEditText(displayText || ""); setIsEditing(true); }}
              className="h-10 px-3 rounded-xl border border-[#E6DCC8] bg-[#FFFDF8] text-[#6B4F2E] text-sm font-semibold flex items-center gap-1.5"
            >
              <Edit className="w-4 h-4" /> Editar
            </button>
          )}
          {viewText && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Imprimir ou exportar a cifra" className="w-10 h-10 rounded-xl border border-[#E6DCC8] bg-[#FFFDF8] text-[#6B4F2E] flex items-center justify-center">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handlePrintCifra}><Printer className="w-4 h-4 mr-2" />Imprimir cifra</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDoc}><Download className="w-4 h-4 mr-2" />Exportar .DOC</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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

      {/* Simplificar acordes (só muda a visualização; a cifra gravada continua igual) */}
      {!isEditing && textoBase && mostrarSimplificar && (
        <div className="rounded-2xl border border-[#E6DCC8] bg-[#FFFDF8] p-3">
          <div className="flex gap-1.5">
            {NIVEIS_SIMPLIFICACAO.map((n) => (
              <button
                key={n.id || "orig"}
                type="button"
                onClick={() => mudarNivel(n.id)}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold border ${nivel === n.id ? "bg-[#6B4F2E] text-[#FFFDF8] border-[#6B4F2E]" : "bg-[#FBF6EA] text-[#6B4F2E] border-[#E6DCC8]"}`}
              >
                {n.nome}
              </button>
            ))}
          </div>
          {!podeSimplificar && (
            <p className="text-sm text-[#3F6B2A] font-medium mt-2">✓ Esta música já usa só acordes básicos — não há o que simplificar.</p>
          )}
          <p className="text-xs text-[#8B7355] mt-2">
            {nivel === "iniciante"
              ? "Só acordes maiores, menores e com 7 (ex.: Am7 vira Am, G7(9) vira G7)."
              : nivel === "simples"
                ? "Tira as notas de enfeite (9, 7M, 6, sus, baixo trocado) e mantém o 7 (ex.: C7M vira C, Am7(9) vira Am7)."
                : "Acordes como estão na cifra."}
            {" "}Vale para todas as músicas neste aparelho; a cifra original não é alterada.
          </p>
        </div>
      )}

      {/* Dica automática (pestana, capotraste, enfeites) para o instrumento escolhido */}
      {!isEditing && viewText && mostrarDica && (
        <DicaMusica
          texto={viewText}
          textoOriginal={textoBase}
          tom={song.main_key || song.original_key}
          instrumento={instrumento}
          onInstrumento={mudarInstrumento}
          onAbrirSimplificar={() => setMostrarSimplificar(true)}
          onAbrirTom={() => setMostrarTom(true)}
        />
      )}

      {/* Transpositor (aberto pelo botão "Mudar tom"; salvar o tom é só do administrador) */}
      {!isEditing && viewText && mostrarTom && (
        <TranspositorCifra
          cifraText={displayText || song.cifra_text || ""}
          originalKey={song.original_key}
          currentKey={song.main_key || song.original_key}
          onApply={isAdmin ? async (newText, newKey) => {
            await onSaveCifra(newText, newKey);
            setDisplayText(newText);
            locallyModified.current = true;
          } : undefined}
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
        <div className="bg-[#FFFDF8] rounded-2xl border border-[#E6DCC8] p-3 md:p-4">
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
      ) : null}

      {/* Acordes desta música, desenhados na viola ou no violão */}
      {!isEditing && viewText ? (
        <AcordesDaMusica texto={viewText} instrumento={instrumento} onInstrumento={mudarInstrumento} />
      ) : null}

      {isEditing || viewText ? null : (
        <div className="text-center py-12 text-[#A68A64]">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="mb-3">Nenhuma cifra cadastrada para esta música.</p>
          {isAdmin && (
          <Button onClick={() => setIsEditing(true)} variant="outline" className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white">
            <Edit className="w-4 h-4 mr-2" />
            Adicionar Cifra
          </Button>
          )}
        </div>
      )}
    </div>
  );
}