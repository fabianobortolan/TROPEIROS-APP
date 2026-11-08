import React, { useState, useEffect } from "react";
import LibraryHeader from "../components/songs/LibraryHeader";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Upload, Music, Filter, FileText } from "lucide-react";
import { motion } from "framer-motion";
import PartituraCard from "@/components/instrumental/PartituraCard";
import PartituraForm from "@/components/instrumental/PartituraForm";

export default function LibraryInstrumental() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPartitura, setEditingPartitura] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === "admin";

  const { data: partituras = [], isLoading } = useQuery({
    queryKey: ["partituras"],
    queryFn: () => base44.entities.Partitura.list("-created_date", 200),
  });

  const uniqueInstruments = React.useMemo(() => {
    const instruments = partituras
      .map(p => p.instrument)
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
    return instruments;
  }, [partituras]);

  const filteredPartituras = React.useMemo(() => {
    return partituras.filter((p) => {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch = !normalizedSearch ||
        p.title?.toLowerCase().includes(normalizedSearch) ||
        p.composer?.toLowerCase().includes(normalizedSearch) ||
        p.genre?.toLowerCase().includes(normalizedSearch);
      const matchesInstrument = instrumentFilter === "all" || p.instrument === instrumentFilter;
      return matchesSearch && matchesInstrument;
    });
  }, [partituras, searchQuery, instrumentFilter]);

  const handleSave = async (formData) => {
    if (editingPartitura) {
      await base44.entities.Partitura.update(editingPartitura.id, formData);
    } else {
      await base44.entities.Partitura.create(formData);
    }
    queryClient.invalidateQueries({ queryKey: ["partituras"] });
    setEditingPartitura(null);
  };

  const handleEdit = (partitura) => {
    setEditingPartitura(partitura);
    setShowForm(true);
  };

  const handleDelete = async (partitura) => {
    if (!window.confirm(`Excluir "${partitura.title}"?`)) return;
    await base44.entities.Partitura.delete(partitura.id);
    queryClient.invalidateQueries({ queryKey: ["partituras"] });
  };

  const openNewForm = () => {
    setEditingPartitura(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <div className="max-w-7xl mx-auto px-4 pt-4 md:px-8 md:pt-8">
        <LibraryHeader atual="instrumental" tema="claro" logado={false} />
        <div className="flex items-center justify-between gap-3 -mt-1">
          <p className="text-sm text-[#7A6A55]">Partituras em PDF</p>
          {isAdmin && (
            <Button onClick={openNewForm} className="h-9 bg-[#6B4F2E] hover:bg-[#5A4226] text-[#FFFDF8] font-semibold rounded-xl">
              <Upload className="w-4 h-4 mr-1.5" />
              Adicionar partitura
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              placeholder="Buscar por título, compositor ou gênero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-[#D4C5B0]"
            />
          </div>
          <Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
            <SelectTrigger className="w-full sm:w-56 bg-white border-[#D4C5B0]">
              <Filter className="w-4 h-4 mr-2 text-stone-400" />
              <SelectValue placeholder="Instrumento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os instrumentos</SelectItem>
              {uniqueInstruments.map((inst) => (
                <SelectItem key={inst} value={inst}>{inst}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 mb-4 text-sm text-stone-600">
          <Music className="w-4 h-4" />
          <span>{filteredPartituras.length} partitura(s) encontrada(s)</span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : filteredPartituras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="w-16 h-16 text-stone-300 mb-4" />
            <h3 className="text-lg font-semibold text-stone-600 mb-1">
              {partituras.length === 0 ? "Nenhuma partitura cadastrada" : "Nenhuma partitura encontrada"}
            </h3>
            <p className="text-sm text-stone-400">
              {partituras.length === 0
                ? "Adicione a primeira partitura instrumental à biblioteca."
                : "Tente ajustar a busca ou os filtros."}
            </p>
            {isAdmin && partituras.length === 0 && (
              <Button onClick={openNewForm} className="mt-4 bg-[#8B6F47] hover:bg-[#6B5437]">
                <Upload className="w-4 h-4 mr-2" />
                Adicionar Partitura
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPartituras.map((partitura) => (
              <PartituraCard
                key={partitura.id}
                partitura={partitura}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <PartituraForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditingPartitura(null); }}
          onSave={handleSave}
          partitura={editingPartitura}
        />
      )}
    </div>
  );
}