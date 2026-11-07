import React, { useState, useRef } from "react";

/**
 * Badge da posição na sequência da apostila. Clicando no número, abre um
 * campo para digitar a nova posição da música (Enter aplica, Esc cancela).
 *
 * Props:
 * - position: posição atual (1-based)
 * - onApply(pos): callback com a nova posição informada
 */
export default function SeqPositionBadge({ position, onApply }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="number"
        min="1"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const n = parseInt(value, 10);
            if (n >= 1 && onApply) onApply(n);
            setEditing(false);
          } else if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
        className="w-9 h-6 text-[10px] font-bold text-center rounded-md border border-[#8B6F47] text-[#8B6F47] tabular-nums flex-shrink-0 px-0"
        title="Digite a posição e pressione Enter"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setValue(String(position)); setEditing(true); }}
      className="text-[10px] font-bold text-stone-400 hover:text-[#8B6F47] hover:bg-black/5 tabular-nums w-6 text-center flex-shrink-0 rounded-md transition-colors"
      title="Clique para informar a posição desta música na apostila"
    >
      {position}º
    </button>
  );
}