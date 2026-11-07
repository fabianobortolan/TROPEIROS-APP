// Interpola o relógio de áudio entre blocos, sem suavizar ou atrasar os tempos musicais.
export default function createSmoothAudioClock(getContext) {
  let time = null, lastFrame = 0, lastState = '';
  return function readTime(frameTime = performance.now()) {
    const ctx = getContext();
    if (!ctx) { time = null; return 0; }
    const audioTime = ctx.currentTime;
    const dt = (frameTime - lastFrame) / 1000;
    if (time === null || ctx.state !== 'running' || lastState !== 'running' || dt < 0 || dt > 0.25) {
      time = audioTime;
    } else {
      const predicted = time + dt;
      const error = audioTime - predicted;
      time = Math.abs(error) > 0.08 ? audioTime : predicted + error * (1 - Math.exp(-dt / 2));
    }
    lastFrame = frameTime;
    lastState = ctx.state;
    return time;
  };
}