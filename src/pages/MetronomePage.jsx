import React from "react";
import { motion } from "framer-motion";
import Metronome from "../components/tools/Metronome";

export default function MetronomePage() {
  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2">
            Metrônomo
          </h1>
          <p className="text-[#A68A64]">
            Mantenha o tempo perfeito nos seus estudos
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Metronome />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-white/60 rounded-xl border border-[#D4C5B0]"
        >
          <h3 className="font-bold text-[#8B6F47] mb-2">💡 Dicas de Estudo</h3>
          <ul className="text-sm text-[#A68A64] space-y-1">
            <li>• Comece em um BPM confortável e aumente gradualmente</li>
            <li>• Use o compasso 3/4 para Guarânias e valsas</li>
            <li>• Use 2/4 para Vaneras e ritmos dançantes</li>
            <li>• O primeiro tempo (dourado) marca o início do compasso</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}