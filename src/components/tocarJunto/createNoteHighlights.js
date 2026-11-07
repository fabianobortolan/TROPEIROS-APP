// Destaques pequenos na mesma faixa móvel, sem repintar a tablatura inteira.
export default function createNoteHighlights(svg, strip) {
  const copies = new Map();
  svg.querySelectorAll('.n[data-i]').forEach(el => {
    const rect = el.querySelector('rect');
    const x = Number(rect.getAttribute('x')) - 1, y = Number(rect.getAttribute('y')) - 1;
    const width = Number(rect.getAttribute('width')) + 2, height = Number(rect.getAttribute('height')) + 2;
    const note = document.createElementNS(svg.namespaceURI, 'svg');
    note.setAttribute('class', 'tj-note-highlight');
    note.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    note.setAttribute('width', width); note.setAttribute('height', height);
    note.setAttribute('aria-hidden', 'true');
    note.style.left = `${x}px`; note.style.top = `${y}px`;
    const copy = el.cloneNode(true);
    copy.classList.add('on'); note.appendChild(copy);
    copies.set(Number(el.dataset.i), note);
  });
  const visible = new Set();
  return {
    draw(active) {
      for (const i of visible) if (!active.has(i)) { copies.get(i).remove(); visible.delete(i); }
      for (const i of active) if (!visible.has(i) && copies.has(i)) {
        strip.appendChild(copies.get(i)); visible.add(i);
      }
    },
    destroy() { visible.forEach(i => copies.get(i).remove()); visible.clear(); copies.clear(); },
  };
}