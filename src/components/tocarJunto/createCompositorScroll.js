// A rolagem roda no compositor do navegador, não no ciclo de quadros do player.
export default function createCompositorScroll(element, getCursorX) {
  let animations = [], position = 0, lastTransform = '';
  const transform = x => `translate3d(${getCursorX() - x}px,0,0)`;
  const keyframes = (from, to) => [{ transform: transform(from) }, { transform: transform(to) }];
  function place() {
    const value = transform(position);
    if (value !== lastTransform) { element.style.transform = value; lastTransform = value; }
  }
  function stop(x = position) {
    animations.forEach(({ animation }) => animation.cancel());
    animations = []; position = x; place();
  }
  function segment(from, to, startAt, duration, iterations, iterationStart) {
    const animation = element.animate(keyframes(from, to), {
      duration, iterations, iterationStart, fill: 'both', easing: 'linear',
    });
    animation.startTime = startAt;
    animations.push({ animation, from, to });
  }
  return {
    play({ from, to, pixelsPerSecond, startAt, repeatFrom = null }) {
      stop(from);
      const origin = repeatFrom === null ? from : repeatFrom;
      const duration = Math.max(1, (to - origin) / pixelsPerSecond * 1000);
      const phase = repeatFrom === null ? 0 : Math.max(0, Math.min(1, (from - origin) / (to - origin)));
      segment(origin, to, startAt, duration, repeatFrom === null ? 1 : Infinity, phase);
    },
    stop,
    draw(x) { position = x; if (!animations.length) place(); },
    resize() {
      place();
      animations.forEach(({ animation, from, to }) => animation.effect.setKeyframes(keyframes(from, to)));
    },
    destroy() { stop(); },
  };
}