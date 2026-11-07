// Utilitário para converter texto selecionado (ou todo o conteúdo) de um textarea em CAIXA ALTA.
// Resolve o fluxo de colar cifras externas e padronizá-las em maiúsculas sem precisar do Word.

/**
 * Aplica caixa alta no trecho selecionado de um textarea.
 * Se não houver seleção, aplica em todo o texto.
 *
 * @param {HTMLTextAreaElement|null} textarea - elemento do textarea (com ref)
 * @param {string} value - valor atual controlado pelo React
 * @param {(v: string) => void} setValue - setter do estado
 */
export function uppercaseSelection(textarea, value, setValue) {
  if (!textarea) return;
  const { selectionStart: start, selectionEnd: end } = textarea;

  if (start === end) {
    // Sem seleção: caixa alta em tudo
    const newValue = (value || "").toUpperCase();
    setValue(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start);
    });
  } else {
    // Com seleção: caixa alta apenas no trecho selecionado
    const newValue =
      value.slice(0, start) +
      value.slice(start, end).toUpperCase() +
      value.slice(end);
    setValue(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  }
}