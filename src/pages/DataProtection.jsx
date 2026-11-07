import React from "react";
import { motion } from "framer-motion";
import DataProtectionDashboard from "../components/protection/DataProtectionDashboard.jsx";

export default function DataProtection() {
  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
            🛡️ Proteção de Dados
          </h1>
          <p className="text-[#A68A64]">Sistema completo de auditoria, backup e recuperação</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}>

          <DataProtectionDashboard />
        </motion.div>
      </div>
    </div>
  );
}