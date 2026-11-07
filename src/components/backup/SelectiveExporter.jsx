import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SelectiveExporter({ items, label, icon: Icon, exportType, onExport }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const toggleItem = (id) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(item => item.id)));
    }
  };

  const handleExport = () => {
    if (selected.size === 0) return;
    
    const selectedItems = items.filter(item => selected.has(item.id));
    const data = {
      export_date: new Date().toISOString(),
      export_type: exportType,
      data: selectedItems
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TropeirosDoBebedouro_${exportType}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSelected(new Set());
    setExpanded(false);
  };

  return (
    <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#8B6F47] to-[#A68A64] rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <CardTitle className="text-[#8B6F47] text-lg">{label}</CardTitle>
              <p className="text-xs text-[#A68A64]">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-[#A68A64] transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}>

            <CardContent className="space-y-4">
              {items.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 pb-3 border-b border-[#D4C5B0]">
                    <Checkbox
                      checked={selected.size === items.length && items.length > 0}
                      onCheckedChange={toggleAll}
                      id={`select-all-${exportType}`}
                    />
                    <label
                      htmlFor={`select-all-${exportType}`}
                      className="text-sm font-medium text-[#8B6F47] cursor-pointer flex-1">
                      {selected.size === items.length ? 'Desselecionar todos' : 'Selecionar todos'}
                    </label>
                    <span className="text-xs text-[#A68A64]">{selected.size} selecionado(s)</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F1E8]/50 transition-colors">
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                          id={`item-${item.id}`}
                        />
                        <label
                          htmlFor={`item-${item.id}`}
                          className="text-sm text-[#8B6F47] cursor-pointer flex-1 truncate">
                          {item.title || item.name || item.song_title || 'Sem título'}
                          {item.artist && <span className="text-xs text-[#A68A64]"> - {item.artist}</span>}
                          {item.location && <span className="text-xs text-[#A68A64]"> - {item.location}</span>}
                        </label>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleExport}
                    disabled={selected.size === 0}
                    className="w-full bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar {selected.size} {selected.size === 1 ? 'item' : 'items'}
                  </Button>
                </>
              ) : (
                <p className="text-center text-[#A68A64] py-4">Nenhum item disponível</p>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}