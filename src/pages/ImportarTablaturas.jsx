import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import GpImporter from "@/components/GpImporter";

export default function ImportarTablaturas() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/AdminPanel" className="text-[#8B6F47] hover:text-[#6B5437]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-[#8B6F47]">Importar Tablaturas</h1>
      </div>
      <GpImporter />
    </div>
  );
}