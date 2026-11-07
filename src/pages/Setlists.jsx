import { useState, useCallback, useEffect } from "react";
import GerarRepertorioIA from './GerarRepertorioIA';
import { base44 } from "@/api/base44Client";
import { Repertorios, lerRepertorioDoLink } from "@/lib/repertorioStore";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, List, WifiOff, Download, CheckCircle, Sparkles } from "lucide-react";
import { useOfflineSync } from "../components/utils/useOfflineSync";
import { saveToLocal } from "../components/utils/useOfflineDB";
import OfflineBanner from "../components/utils/OfflineBanner";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import SetlistForm from "../components/setlists/SetlistForm";
import SetlistCard from "../components/setlists/SetlistCard";
import SetlistDetails from "../components/setlists/SetlistDetails";
import StageView from "../components/setlists/StageView";
import SetlistApostila from "../components/setlists/SetlistApostila";

export default function Setlists() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("setlists");
  const [showForm, setShowForm] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState(null);
  const [selectedSetlist, setSelectedSetlist] = useState(null);
  const [stageViewSetlist, setStageViewSetlist] = useState(null);
  const [apostilaSetlist, setApostilaSetlist] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [caching, setCaching] = useState(false);
  const [cacheOk, setCacheOk] = useState(false);

  const fetchSetlists = useCallback(() => Repertorios.list('-created_date'), []);
  const fetchSongs = useCallback(() => base44.fetchAllSongs(), []);

  const {
    data: setlists,
    isOffline,
    isSyncing,
    isLoading,
    reload: reloadSetlists,
  } = useOfflineSync("setlists", fetchSetlists);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const isAdmin = currentUser?.role === 'admin';

  // Repertório recebido por link (?r=...): oferece guardar nos meus repertórios
  useEffect(() => {
    const recebido = lerRepertorioDoLink();
    if (!recebido) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (confirm(`Você recebeu o repertório "${recebido.name}" (${recebido.songs.length} músicas).\n\nGuardar nos seus repertórios?`)) {
      Repertorios.create(recebido).then(() => reloadSetlists()).catch((e) => alert(e.message || 'Não foi possível guardar o repertório.'));
    }
  }, [reloadSetlists]);

  const { data: songs } = useOfflineSync("songs", fetchSongs);

  // Força cache completo: setlists + songs com cifras
  const handlePrepareOffline = async () => {
    if (!navigator.onLine) {
      alert("Você precisa estar online para preparar o cache offline.");
      return;
    }
    setCaching(true);
    setCacheOk(false);
    try {
      const [freshSetlists, freshSongs] = await Promise.all([
        Repertorios.list('-created_date'),
        base44.fetchAllSongs(),
      ]);
      await Promise.all([
        saveToLocal("setlists", freshSetlists),
        saveToLocal("songs", freshSongs),
      ]);
      setCacheOk(true);
      setTimeout(() => setCacheOk(false), 4000);
    } catch (err) {
      alert("Erro ao preparar cache offline. Tente novamente.");
    } finally {
      setCaching(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => Repertorios.delete(id),
    onSuccess: () => {
      reloadSetlists();
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
    }
  });

  const handleEdit = (setlist) => {
    setEditingSetlist(setlist);
    setShowForm(true);
  };

  const handleDelete = (id, name) => {
    if (confirm(`Tem certeza que deseja excluir o setlist "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseForm = () => {
    reloadSetlists();
    setShowForm(false);
    setEditingSetlist(null);
  };

  const filteredSetlists = setlists.filter((setlist) =>
    setlist.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    setlist.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeTab === "ia") {
    return (
      <div>
        <div className="bg-amber-50 px-4 pt-4 md:px-8 md:pt-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab("setlists")}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#D4C5B0] text-[#8B6F47] bg-white hover:bg-[#8B6F47] hover:text-white transition-all"
              >
                ← Meus Setlists
              </button>
            </div>
          </div>
        </div>
        <GerarRepertorioIA />
      </div>
    );
  }

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
                Setlists
              </h1>
              <p className="text-[#A68A64]">Organize suas apresentações e sequências de músicas</p>
            </div>
            <div className="flex gap-2 mt-1">
              {isAdmin && (
              <Button
                onClick={() => setActiveTab("ia")}
                className="bg-gradient-to-r from-purple-600 to-[#8B6F47] hover:from-purple-700 hover:to-[#6B5437] text-white shadow-lg whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar por IA
              </Button>
              )}
              {!isOffline && (
                <button
                  onClick={handlePrepareOffline}
                  disabled={caching}
                  title="Salvar repertório completo para uso offline no show"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    cacheOk
                      ? "bg-green-100 border-green-400 text-green-700"
                      : "bg-white border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                  } disabled:opacity-60`}
                >
                  {cacheOk ? (
                    <><CheckCircle className="w-4 h-4" /> Pronto para offline!</>
                  ) : caching ? (
                    <><Download className="w-4 h-4 animate-bounce" /> Salvando...</>
                  ) : (
                    <><WifiOff className="w-4 h-4" /> Preparar Offline</>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <OfflineBanner isOffline={isOffline} isSyncing={isSyncing} pendingCount={0} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-[#D4C5B0] shadow-lg">

          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <Input
                placeholder="Buscar setlists por nome ou local..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border-[#D4C5B0] focus:border-[#8B6F47]" />

            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg w-full md:w-auto">

              <Plus className="w-4 h-4 mr-2" />
              Novo Setlist
            </Button>
          </div>
        </motion.div>

        {isLoading ?
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) =>
          <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
          )}
          </div> :
        filteredSetlists.length === 0 ?
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16">

            <div className="w-24 h-24 bg-[#9CAF88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <List className="w-12 h-12 text-[#9CAF88]" />
            </div>
            <h3 className="text-xl font-bold text-[#8B6F47] mb-2">
              {searchQuery ? "Nenhum setlist encontrado" : "Nenhum setlist criado"}
            </h3>
            <p className="text-[#A68A64] mb-6">
              {searchQuery ?
            "Tente ajustar sua busca" :
            "Comece criando seu primeiro setlist para organizar suas apresentações"}
            </p>
            {!searchQuery &&
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg">

                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Setlist
              </Button>
          }
          </motion.div> :

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSetlists.map((setlist, index) =>
          <motion.div
            key={setlist.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}>

                <SetlistCard
              setlist={setlist}
              songs={songs}
              onView={() => setSelectedSetlist(setlist)}
              onEdit={() => handleEdit(setlist)}
              onDelete={() => handleDelete(setlist.id, setlist.name)}
              onStageView={() => setStageViewSetlist(setlist)}
              onApostila={() => setApostilaSetlist(setlist)} />

              </motion.div>
          )}
          </div>
        }

        <AnimatePresence>
          {showForm &&
          <SetlistForm
            setlist={editingSetlist}
            songs={songs}
            onClose={handleCloseForm} />

          }
        </AnimatePresence>

        <AnimatePresence>
          {selectedSetlist &&
          <SetlistDetails
            setlist={selectedSetlist}
            songs={songs}
            onClose={() => setSelectedSetlist(null)}
            onEdit={() => {
              setSelectedSetlist(null);
              handleEdit(selectedSetlist);
            }}
            onApostila={() => {
              setSelectedSetlist(null);
              setApostilaSetlist(selectedSetlist);
            }} />

          }
        </AnimatePresence>

        <AnimatePresence>
          {stageViewSetlist &&
          <StageView
            setlist={stageViewSetlist}
            songs={songs}
            onClose={() => setStageViewSetlist(null)} />
          }
        </AnimatePresence>

        <AnimatePresence>
          {apostilaSetlist &&
          <SetlistApostila
            setlist={apostilaSetlist}
            songs={songs}
            onClose={() => setApostilaSetlist(null)} />
          }
        </AnimatePresence>
      </div>
    </div>);

}