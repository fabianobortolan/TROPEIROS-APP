import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, FolderOpen, Trash2, Loader2, X, FileText, Pencil } from "lucide-react";

/**
 * Gerencia apostilas salvas: salvar configuração atual, carregar para reedição e excluir.
 *
 * Props:
 * - buildConfig(): retorna objeto config com o estado atual da apostila
 * - onLoad(config): aplica uma config carregada no estado do componente pai
 * - totalSelected: número de músicas selecionadas (para habilitar salvar)
 */
export default function ApostilaSavedManager({ buildConfig, onLoad, totalSelected, loadedApostila, setLoadedApostila, onSaved }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // "salvar" | "carregar"
  const [savedList, setSavedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [error, setError] = useState("");

  // Lista apostilas salvas
  const fetchSaved = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.ApostilaSalva.list('-updated_date', 100);
      setSavedList(list || []);
    } catch (e) {
      console.error("Erro ao listar apostilas salvas:", e);
    } finally {
      setLoading(false);
    }
  };

  // Salvar apostila atual
  const handleSave = async () => {
    const trimmed = nome.trim();
    if (!trimmed) {
      setError("Digite um nome para a apostila.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const config = buildConfig();
      // Se há uma apostila carregada em edição: nome igual atualiza ela;
      // nome ALTERADO cria uma apostila NOVA (a anterior é preservada)
      if (loadedApostila) {
        if (trimmed.toLowerCase() === (loadedApostila.nome || "").toLowerCase()) {
          await base44.entities.ApostilaSalva.update(loadedApostila.id, {
            nome: trimmed,
            config,
            total_musicas: totalSelected
          });
          if (setLoadedApostila) setLoadedApostila({ ...loadedApostila, nome: trimmed, total_musicas: totalSelected });
          if (onSaved) onSaved();
        } else {
          const created = await base44.entities.ApostilaSalva.create({
            nome: trimmed,
            config,
            total_musicas: totalSelected
          });
          if (setLoadedApostila) setLoadedApostila(created);
          if (onSaved) onSaved();
        }
        setNome("");
        setMode(null);
        setOpen(false);
        fetchSaved();
        return;
      }
      // Se já existe apostila com mesmo nome, atualiza
      const existing = savedList.find(a => (a.nome || "").toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        await base44.entities.ApostilaSalva.update(existing.id, {
          nome: trimmed,
          config,
          total_musicas: totalSelected
        });
      } else {
        await base44.entities.ApostilaSalva.create({
          nome: trimmed,
          config,
          total_musicas: totalSelected
        });
      }
      if (onSaved) onSaved();
      setNome("");
      setMode(null);
      setOpen(false);
      fetchSaved();
    } catch (e) {
      console.error("Erro ao salvar apostila:", e);
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Carregar apostila
  const handleLoad = (apostila) => {
    if (onLoad && apostila.config) {
      onLoad(apostila.config, apostila);
    }
    setMode(null);
    setOpen(false);
  };

  // Excluir apostila
  const handleDelete = async (id) => {
    try {
      await base44.entities.ApostilaSalva.delete(id);
      fetchSaved();
    } catch (e) {
      console.error("Erro ao excluir apostila:", e);
    }
  };

  // Abre painel de carregar e busca a lista
  const openCarregar = () => {
    setMode("carregar");
    setOpen(true);
    fetchSaved();
  };

  return (
    <>
      <div className="flex gap-1.5">
        <button
          onClick={() => { setMode("salvar"); setOpen(true); setNome(loadedApostila ? loadedApostila.nome : ""); }}
          disabled={totalSelected === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Salvar apostila para reeditar depois"
        >
          <Save className="w-4 h-4" /> Salvar
        </button>
        <button
          onClick={openCarregar}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors"
          title="Carregar apostila salva"
        >
          <FolderOpen className="w-4 h-4" /> Carregar
        </button>
        {loadedApostila && (
          <div
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded-lg bg-[#D4AF37]/40 text-white border border-white/40"
            title="Apostila carregada — Salvar atualiza esta apostila"
          >
            <Pencil className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="max-w-[120px] truncate">{loadedApostila.nome}</span>
            <button
              type="button"
              onClick={() => setLoadedApostila && setLoadedApostila(null)}
              className="text-white/80 hover:text-white flex-shrink-0"
              title="Desvincular — Salvar criará uma apostila nova"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Modal interno */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-3"
          onClick={() => { setOpen(false); setMode(null); setError(""); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] p-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                {mode === "salvar" ? <Save className="w-5 h-5 text-white" /> : <FolderOpen className="w-5 h-5 text-white" />}
                <h3 className="font-bold text-white">
                  {mode === "salvar" ? "Salvar Apostila" : "Apostilas Salvas"}
                </h3>
              </div>
              <button onClick={() => { setOpen(false); setMode(null); setError(""); }} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {mode === "salvar" ? (
                <div className="space-y-3">
                  <p className="text-sm text-stone-600">
                    {loadedApostila ? (
                      <>Salvando as alterações da apostila <strong>{loadedApostila.nome}</strong>. Altere o nome para salvar como uma <strong>apostila nova</strong> (a original é preservada).</>
                    ) : (
                      "Salve a seleção e ordem atual para reabrir e editar depois."
                    )}
                  </p>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => { setNome(e.target.value); setError(""); }}
                    placeholder="Nome da apostila (ex: Show 15/08)"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D4C5B0] focus:border-[#8B6F47] focus:outline-none"
                    autoFocus
                  />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <div className="text-xs text-stone-500 bg-[#F5F1E8] rounded-lg p-2">
                    {totalSelected} música{totalSelected !== 1 ? "s" : ""} será salva{totalSelected !== 1 ? "s" : ""} com a ordem e ajustes atuais.
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-11 bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] text-white font-bold rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> {loadedApostila ? "Salvar alterações" : "Salvar apostila"}</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#8B6F47]" />
                      <p className="text-sm text-stone-500">Carregando...</p>
                    </div>
                  ) : savedList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                      <FileText className="w-8 h-8 text-stone-300" />
                      <p className="text-sm text-stone-500">Nenhuma apostila salva ainda.</p>
                    </div>
                  ) : (
                    savedList.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 p-3 rounded-xl border border-[#D4C5B0] bg-[#F5F1E8]/50 hover:bg-[#F5F1E8] transition-colors"
                      >
                        <FileText className="w-5 h-5 text-[#8B6F47] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-stone-800 truncate">{a.nome}</p>
                          <p className="text-[10px] text-stone-500">
                            {a.total_musicas || 0} música{(a.total_musicas || 0) !== 1 ? "s" : ""}
                            {a.updated_date ? ` • ${new Date(a.updated_date).toLocaleDateString('pt-BR')}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => handleLoad(a)}
                          className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-[#8B6F47] text-white hover:opacity-90 transition-opacity flex items-center gap-1 flex-shrink-0"
                          title="Carregar para editar"
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> Abrir
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                          title="Excluir apostila salva"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}