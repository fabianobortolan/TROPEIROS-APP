import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Award, Sparkles, RefreshCw } from "lucide-react";

export default function ProgressionEditCard({ prog, index, knownProgressions, onUpdate, onUpdateChords, onDelete }) {
  return (
    <Card className="border-[#D4C5B0] bg-white/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-[#8B6F47]">
            Progressão {index + 1}
            {prog.section && (
              <span className="ml-2 text-sm font-normal text-[#A68A64]">
                ({prog.section})
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(index)}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs text-[#8B6F47]">Seção</Label>
          <Input
            value={prog.section || ""}
            onChange={(e) => onUpdate(index, "section", e.target.value)}
            placeholder="Ex: Verso 1, Refrão"
            className="border-[#D4C5B0]"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-[#8B6F47]">Acordes (separados por vírgula)</Label>
          <Input
            value={
              typeof prog.chords === 'string'
                ? prog.chords
                : Array.isArray(prog.chords)
                  ? prog.chords.join(", ")
                  : ""
            }
            onChange={(e) => onUpdateChords(index, e.target.value)}
            placeholder="Ex: C, Am, F, G"
            className="border-[#D4C5B0]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-[#8B6F47]">Padrão (algarismos romanos)</Label>
            <Input
              value={prog.pattern || ""}
              onChange={(e) => onUpdate(index, "pattern", e.target.value)}
              placeholder="Ex: I-vi-IV-V"
              className="border-[#D4C5B0]"
            />
            <p className="text-xs text-[#A68A64]">Use hífens: I-IV-V ou I-V-vi-IV</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-[#8B6F47]">Tonalidade</Label>
            <Input
              value={prog.key || ""}
              onChange={(e) => onUpdate(index, "key", e.target.value)}
              placeholder="Ex: C"
              className="border-[#D4C5B0]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-[#8B6F47] flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Modulação Temporária (opcional)
          </Label>
          <Input
            value={prog.modulated_key || ""}
            onChange={(e) => onUpdate(index, "modulated_key", e.target.value)}
            placeholder="Ex: Am (se modula para A menor)"
            className="border-[#D4C5B0]"
          />
          <p className="text-xs text-[#A68A64]">💡 Se esta seção modula para outro tom temporariamente, indique aqui</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-[#8B6F47] flex items-center gap-1">
              <Award className="w-3 h-3" />
              Progressão Reconhecida
              {knownProgressions.length > 0 && (
                <span className="text-green-600 text-[10px]">({knownProgressions.length} disponíveis)</span>
              )}
            </Label>
            <select
              value={knownProgressions.some(kp => kp.name === prog.progression_name) ? prog.progression_name : "__custom__"}
              onChange={(e) => {
                if (e.target.value === "__custom__") return;
                onUpdate(index, "progression_name", e.target.value || null);
              }}
              className="w-full h-9 px-3 rounded-md border border-[#D4C5B0] bg-white text-sm"
            >
              <option value="">-- Selecione do catálogo --</option>
              {knownProgressions.map((kp) => (
                <option key={kp.id} value={kp.name}>
                  {kp.name} ({kp.pattern})
                </option>
              ))}
              {prog.progression_name && !knownProgressions.some(kp => kp.name === prog.progression_name) && (
                <option value="__custom__">✏️ Personalizado: {prog.progression_name}</option>
              )}
            </select>
            <Input
              value={prog.progression_name || ""}
              onChange={(e) => onUpdate(index, "progression_name", e.target.value || null)}
              placeholder="Ou digite o nome manualmente..."
              className="border-[#D4C5B0] text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-[#8B6F47] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Variação da Progressão
            </Label>
            <select
              value={prog.variation_name || ""}
              onChange={(e) => onUpdate(index, "variation_name", e.target.value || null)}
              className="w-full h-9 px-3 rounded-md border border-[#D4C5B0] bg-white text-sm"
              disabled={!prog.progression_name}
            >
              <option value="">Padrão Principal</option>
              {prog.progression_name && knownProgressions
                .find(kp => kp.name === prog.progression_name)
                ?.variations?.map((variation, vIdx) => (
                  <option key={vIdx} value={variation.name || variation.description || variation.pattern}>
                    {variation.name || variation.description || variation.pattern}
                    {variation.pattern ? ` (${variation.pattern})` : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-[#A68A64]">💡 Corrija a progressão e variação para treinar o sistema</p>

        <div className="space-y-2">
          <Label className="text-xs text-[#8B6F47]">Observações (orientação ao sistema)</Label>
          <Textarea
            value={prog.notes || ""}
            onChange={(e) => onUpdate(index, "notes", e.target.value)}
            placeholder="Ex: Progressão similar à Terra mas com variação no IV grau..."
            className="border-[#D4C5B0] min-h-[60px]"
          />
          <p className="text-xs text-[#A68A64]">📝 Suas observações ajudam o sistema a aprender e identificar melhor</p>
        </div>
      </CardContent>
    </Card>
  );
}