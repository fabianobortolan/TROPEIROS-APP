import createCompositorScroll from '@/components/tocarJunto/createCompositorScroll';
import createNoteHighlights from '@/components/tocarJunto/createNoteHighlights';

export default function createTabScrollSurface(viewport, svg, height) {
  const strip = document.createElement('div');
  strip.className = 'tj-strip';
  strip.style.width = `${svg.getAttribute('width')}px`;
  strip.style.height = `${height}px`;
  viewport.appendChild(strip);
  strip.appendChild(svg);
  let cursorX = viewport.clientWidth * 0.28;
  const scroll = createCompositorScroll(strip, () => cursorX);
  const highlights = createNoteHighlights(svg, strip);
  const resize = new ResizeObserver(([entry]) => {
    const x = entry.contentRect.width * 0.28;
    if (x > 0 && x !== cursorX) { cursorX = x; scroll.resize(); }
  });
  resize.observe(viewport);
  return {
    play: scroll.play,
    stop: scroll.stop,
    draw(positionX, active) { scroll.draw(positionX); highlights.draw(active); },
    destroy() { resize.disconnect(); scroll.destroy(); highlights.destroy(); strip.remove(); },
  };
}