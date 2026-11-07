/**
 * Hook para pré-cachear músicas no Service Worker antes do modo palco.
 * Cacheia: cifra (via texto), áudio, playback e imagem de solo.
 *
 * Uso:
 *   const { cacheStatus, cacheSongs } = useOfflineSongCache();
 *   await cacheSongs(songs); // passa array de objetos Song
 */
import { useState, useCallback } from 'react';

export default function useOfflineSongCache() {
  const [cacheStatus, setCacheStatus] = useState('idle'); // idle | caching | done | error | unsupported

  const cacheSongs = useCallback(async (songs = []) => {
    if (!('serviceWorker' in navigator)) {
      setCacheStatus('unsupported');
      return;
    }

    const sw = await navigator.serviceWorker.ready;
    if (!sw.active) {
      setCacheStatus('unsupported');
      return;
    }

    // Coleta todas as URLs válidas das músicas
    const urls = [];
    for (const song of songs) {
      if (song.audio_url) urls.push(song.audio_url);
      if (song.playback_url) urls.push(song.playback_url);
      if (song.solo_image_url) urls.push(song.solo_image_url);
      if (song.solo_pdf_url) urls.push(song.solo_pdf_url);
    }

    if (urls.length === 0) {
      setCacheStatus('done');
      return;
    }

    setCacheStatus('caching');

    return new Promise((resolve) => {
      // Ouve a confirmação do SW
      const onMessage = (event) => {
        if (event.data?.type === 'CACHE_SONG_DONE') {
          navigator.serviceWorker.removeEventListener('message', onMessage);
          setCacheStatus('done');
          resolve();
        }
      };
      navigator.serviceWorker.addEventListener('message', onMessage);

      // Envia URLs para o SW cachear
      sw.active.postMessage({ type: 'CACHE_SONG', urls });

      // Timeout de segurança (30s)
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', onMessage);
        setCacheStatus('done');
        resolve();
      }, 30000);
    });
  }, []);

  return { cacheStatus, cacheSongs };
}