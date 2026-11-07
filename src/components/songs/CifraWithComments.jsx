import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Edit2, MessageCircle, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = {
  yellow: { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E", label: "Amarelo" },
  blue:   { bg: "#DBEAFE", border: "#3B82F6", text: "#1E3A5F", label: "Azul" },
  green:  { bg: "#D1FAE5", border: "#10B981", text: "#065F46", label: "Verde" },
  red:    { bg: "#FEE2E2", border: "#EF4444", text: "#7F1D1D", label: "Vermelho" },
  purple: { bg: "#EDE9FE", border: "#8B5CF6", text: "#4C1D95", label: "Roxo" },
};

function DraggableBalloon({ comment, globalIndex, onEdit, onDelete, onMoveTo, isAdmin, lineRefs, containerRef }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.comment);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragStart = useRef(null);
  const balloonRef = useRef(null);
  const color = COLORS[comment.color || "yellow"];

  // offset horizontal salvo no comentário (padrão: 24px = ml-6)
  const savedOffsetX = comment.offset_x ?? 24;

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(editText); // preserva espaços e quebras de linha do usuário
      setIsEditing(false);
    }
  };

  const findClosestLine = useCallback((clientY) => {
    let closest = 0;
    let minDist = Infinity;
    lineRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const dist = Math.abs(clientY - centerY);
      if (dist < minDist) { minDist = dist; closest = idx; }
    });
    return closest;
  }, [lineRefs]);

  const startDrag = useCallback((clientX, clientY) => {
    if (isEditing) return;
    const rect = balloonRef.current?.getBoundingClientRect();
    dragStart.current = {
      offsetX: clientX - (rect?.left ?? clientX),
      offsetY: clientY - (rect?.top ?? clientY),
    };
    setDragPos({ x: rect?.left ?? 0, y: rect?.top ?? 0 });
    setIsDragging(true);
  }, [isEditing]);

  const onMouseDown = (e) => { if (e.button !== 0) return; e.preventDefault(); startDrag(e.clientX, e.clientY); };
  const onTouchStart = (e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (clientX, clientY) => {
      setDragPos({ x: clientX - dragStart.current.offsetX, y: clientY - dragStart.current.offsetY });
    };

    const onEnd = (clientX, clientY) => {
      setIsDragging(false);
      const newLine = findClosestLine(clientY);

      // Calcula offset X relativo ao container da cifra
      let newOffsetX = savedOffsetX;
      if (containerRef?.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        newOffsetX = Math.max(0, clientX - dragStart.current.offsetX - containerRect.left);
      }

      onMoveTo(globalIndex, newLine, newOffsetX);
    };

    const mm = (e) => onMove(e.clientX, e.clientY);
    const mu = (e) => onEnd(e.clientX, e.clientY);
    const tm = (e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); };
    const te = (e) => { const t = e.changedTouches[0]; onEnd(t.clientX, t.clientY); };

    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    window.addEventListener("touchmove", tm, { passive: true });
    window.addEventListener("touchend", te);
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup", mu);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("touchend", te);
    };
  }, [isDragging, findClosestLine, globalIndex, onMoveTo, savedOffsetX, containerRef]);

  return (
    <>
      {/* Fantasma enquanto arrasta */}
      {isDragging && (
        <div style={{
          position: "fixed", left: dragPos.x, top: dragPos.y,
          zIndex: 9999, pointerEvents: "none", opacity: 0.85,
          transform: "rotate(-2deg) scale(1.04)",
        }}>
          <div className="relative inline-block rounded-2xl px-4 py-2.5 shadow-2xl border-2"
            style={{ backgroundColor: color.bg, borderColor: color.border, minWidth: 120 }}>
            <p className="text-xs font-medium" style={{ color: color.text }}>{comment.comment}</p>
          </div>
        </div>
      )}

      {/* Balão posicionado com offset horizontal */}
      <motion.div
        ref={balloonRef}
        initial={{ opacity: 0, scale: 0.8, y: -5 }}
        animate={{ opacity: isDragging ? 0.3 : 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -5 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative mt-1 mb-2 inline-block"
        style={{
          marginLeft: savedOffsetX,
          cursor: isDragging ? "grabbing" : isAdmin ? "grab" : "default",
        }}
      >
        {/* Rabinho */}
        <div className="absolute" style={{ top: -10, left: 18, width: 0, height: 0,
          borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
          borderBottom: `10px solid ${color.border}` }} />
        <div className="absolute" style={{ top: -7, left: 20, width: 0, height: 0,
          borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
          borderBottom: `8px solid ${color.bg}` }} />

        <div className="relative inline-block rounded-2xl px-4 py-2.5 shadow-md border-2"
          style={{ backgroundColor: color.bg, borderColor: color.border, minWidth: 120, maxWidth: 720 }}>
          <div className="flex items-start gap-2">
            {/* Alça de arrasto */}
            {isAdmin && (
              <div onMouseDown={onMouseDown} onTouchStart={onTouchStart}
                className="flex-shrink-0 mt-0.5 opacity-40 hover:opacity-80 transition-opacity"
                title="Arrastar balão (vertical e horizontal)"
                style={{ cursor: "grab", touchAction: "none" }}>
                <GripVertical className="w-3.5 h-3.5" style={{ color: color.border }} />
              </div>
            )}

            <MessageCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: color.border }} />

            {isEditing ? (
              <div className="flex-1 space-y-1.5">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                  className="text-xs p-1.5 resize-y" style={{ borderColor: color.border, minHeight: 64, fontFamily: "'Courier New', Courier, monospace" }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) handleSaveEdit();
                    if (e.key === "Escape") { setIsEditing(false); setEditText(comment.comment); }
                  }} />
                <div className="flex gap-1 justify-end">
                  <button onClick={() => { setIsEditing(false); setEditText(comment.comment); }}
                    className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: color.border, color: color.text }}>
                    Cancelar
                  </button>
                  <button onClick={handleSaveEdit}
                    className="text-xs px-2 py-0.5 rounded text-white font-medium" style={{ backgroundColor: color.border }}>
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <pre className="flex-1 text-xs leading-relaxed font-medium whitespace-pre-wrap break-words"
                style={{ color: color.text, fontFamily: "'Courier New', Courier, monospace" }}>
                {comment.comment}
              </pre>
            )}

            {isAdmin && !isEditing && (
              <div className="flex gap-1 flex-shrink-0 ml-1">
                <button onClick={() => setIsEditing(true)}
                  className="opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded" title="Editar">
                  <Edit2 className="w-3 h-3" style={{ color: color.text }} />
                </button>
                <button onClick={onDelete}
                  className="opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded" title="Excluir">
                  <X className="w-3 h-3" style={{ color: color.text }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default function CifraWithComments({ cifraText, comments = [], onCommentsChange, isAdmin = false, highlightLine = null }) {
  const [localComments, setLocalComments] = useState(comments || []);
  const [addingToLine, setAddingToLine] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const lineRefs = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => { setLocalComments(comments || []); }, [comments]);

  const lines = (cifraText || "").split("\n");
  lineRefs.current = lineRefs.current.slice(0, lines.length);

  const handleAdd = (lineIndex) => {
    if (!newComment.trim()) return;
    const updated = [
      ...localComments,
      { line_number: lineIndex, comment: newComment, color: selectedColor, offset_x: 24, created_at: new Date().toISOString() },
    ];
    setLocalComments(updated);
    onCommentsChange(updated);
    setNewComment("");
    setAddingToLine(null);
    setSelectedColor("yellow");
  };

  const handleEdit = (globalIndex, newText) => {
    const updated = localComments.map((c, i) => i === globalIndex ? { ...c, comment: newText } : c);
    setLocalComments(updated);
    onCommentsChange(updated);
  };

  const handleDelete = (globalIndex) => {
    const updated = localComments.filter((_, i) => i !== globalIndex);
    setLocalComments(updated);
    onCommentsChange(updated);
  };

  const handleMoveTo = (globalIndex, newLineNumber, newOffsetX) => {
    const updated = localComments.map((c, i) =>
      i === globalIndex ? { ...c, line_number: newLineNumber, offset_x: newOffsetX } : c
    );
    setLocalComments(updated);
    onCommentsChange(updated);
  };

  return (
    <div ref={containerRef} className="space-y-0.5">
      {lines.map((line, lineIndex) => {
        const lineComments = localComments
          .map((c, globalIndex) => ({ ...c, globalIndex }))
          .filter((c) => c.line_number === lineIndex);

        return (
          <div
            key={lineIndex}
            id={`cifra-line-${lineIndex}`}
            className={`group rounded ${highlightLine != null && highlightLine - 1 === lineIndex ? 'bg-[#FFE08A] ring-2 ring-[#D4AF37]' : ''}`}
          >
            {/* Linha da cifra */}
            <div className="flex items-center gap-1" ref={(el) => { lineRefs.current[lineIndex] = el; }}>
              <pre className="flex-1 font-mono text-sm leading-6 px-2 py-0.5 rounded whitespace-pre-wrap break-all"
                style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                {line || "\u00A0"}
              </pre>
              {isAdmin && (
                <button
                  onClick={() => { setAddingToLine(lineIndex); setNewComment(""); setSelectedColor("yellow"); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-6 h-6 rounded-full bg-[#8B6F47] text-white flex items-center justify-center hover:bg-[#A68A64] shadow-md"
                  title="Adicionar balão de observação"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Formulário inline */}
            <AnimatePresence>
              {addingToLine === lineIndex && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-6 mt-1 mb-2 p-3 bg-white rounded-xl border-2 border-[#8B6F47] shadow-lg">
                  <p className="text-xs font-semibold text-[#8B6F47] mb-2">💬 Nova observação</p>
                  <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ex: Fazer hammer-on aqui, Mudar para posição 2ª corda..."
                    className="text-sm h-16 border-[#D4C5B0] resize-none" autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) handleAdd(lineIndex);
                      if (e.key === "Escape") setAddingToLine(null);
                    }} />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-[#8B6F47] font-medium">Cor:</span>
                    {Object.entries(COLORS).map(([key, val]) => (
                      <button key={key} onClick={() => setSelectedColor(key)} title={val.label}
                        className="w-5 h-5 rounded-full border-2 transition-all flex-shrink-0"
                        style={{
                          backgroundColor: val.bg, borderColor: selectedColor === key ? val.border : "#D1D5DB",
                          transform: selectedColor === key ? "scale(1.25)" : "scale(1)",
                          boxShadow: selectedColor === key ? `0 0 0 2px ${val.border}55` : "none",
                        }} />
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setAddingToLine(null)} className="text-xs h-7">Cancelar</Button>
                    <Button size="sm" onClick={() => handleAdd(lineIndex)} disabled={!newComment.trim()}
                      className="bg-[#8B6F47] hover:bg-[#A68A64] text-white text-xs h-7">
                      <Plus className="w-3 h-3 mr-1" />Adicionar
                    </Button>
                  </div>
                  <p className="text-xs text-[#A68A64] mt-1">Ctrl+Enter para adicionar rapidamente</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Balões com posição horizontal livre */}
            <AnimatePresence>
              {lineComments.map(({ globalIndex, ...comment }) => (
                <DraggableBalloon
                  key={globalIndex}
                  comment={comment}
                  globalIndex={globalIndex}
                  isAdmin={isAdmin}
                  lineRefs={lineRefs}
                  containerRef={containerRef}
                  onEdit={(newText) => handleEdit(globalIndex, newText)}
                  onDelete={() => handleDelete(globalIndex)}
                  onMoveTo={handleMoveTo}
                />
              ))}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}