import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

// Registra Service Worker apenas em produção (evita cache obsoleto de chunks Vite em dev)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });
  } else {
    // Em dev: desregististra qualquer SW anterior e limpa caches para evitar JS obsoleto
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if (window.caches) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
    });
  }
}

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}
// ─── Aviso de versão nova ────────────────────────────────────────────────────
// O app fica aberto por horas (celular, modo palco). Quando sai uma versão nova
// no Netlify, mostramos um botão "Atualizar" em vez de deixar a tela antiga.
if (import.meta.env.PROD) {
  const scriptAtual = () =>
    [...document.querySelectorAll('script[src*="/assets/index-"]')].map((s) => new URL(s.src).pathname)[0];
  const meuScript = scriptAtual();
  let avisado = false;
  const verificar = async () => {
    if (avisado || !meuScript || !navigator.onLine) return;
    try {
      const html = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' }).then((r) => r.text());
      const novo = (html.match(/\/assets\/index-[^"']+\.js/) || [])[0];
      if (novo && novo !== meuScript) {
        avisado = true;
        const b = document.createElement('button');
        b.textContent = '🔄 Nova versão do app — toque para atualizar';
        b.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;background:#6B4F2E;color:#FFFDF8;border:0;border-radius:999px;padding:12px 18px;font:600 14px system-ui;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer';
        b.onclick = () => location.reload();
        document.body.appendChild(b);
      }
    } catch { /* sem internet: tenta depois */ }
  };
  setTimeout(verificar, 15000);
  setInterval(verificar, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verificar(); });
}
