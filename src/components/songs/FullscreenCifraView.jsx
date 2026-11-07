import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";

export default function FullscreenCifraView({ song, cifraText, mainKey, transpose, rhythmName, tempo, onClose }) {
  let cifraParaImprimir = cifraText || '';
  cifraParaImprimir = cifraParaImprimir.replace(/\[Intro\]\s*\n(Tom:.*\n)?(BPM:.*\n)?(Ritmo:.*\n)?\s*\n?/gi, '');
  cifraParaImprimir = cifraParaImprimir.replace(/^Pattern:.*$/gmi, '');
  cifraParaImprimir = cifraParaImprimir.replace(/^\s+/, '');
  cifraParaImprimir = cifraParaImprimir.replace(/\n\n\n+/g, '\n\n');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 overflow-y-auto"
    >
      <div className="sticky top-0 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] p-4 z-10 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{song.title}</h2>
            <p className="text-sm text-white/90">{song.artist}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 text-white" size="sm">
              <Printer className="w-4 h-4 mr-2" />Imprimir
            </Button>
            <Button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white" size="sm">
              <X className="w-4 h-4 mr-2" />Fechar
            </Button>
          </div>
        </div>
        <div className="text-sm text-white/90 font-bold">
          {mainKey ? `Tom: ${mainKey}${transpose !== 0 ? ` (${transpose > 0 ? '+' : ''}${transpose})` : ''}` : ''}
          {rhythmName ? ` • ${rhythmName}` : ''}
          {tempo ? ` • ${tempo} BPM` : ''}
        </div>
      </div>
      <div className="p-4">
        <pre className="font-mono text-base leading-relaxed whitespace-pre-wrap text-[#2d1810] font-bold">
          {cifraParaImprimir}
        </pre>
      </div>
      <div className="text-center py-4 text-xs text-gray-500 border-t">
        Tropeiros do Bebedouro • {new Date().toLocaleDateString('pt-BR')}
      </div>
      <style>{`@media print { .sticky { position: static !important; } button { display: none !important; } }`}</style>
    </motion.div>
  );
}