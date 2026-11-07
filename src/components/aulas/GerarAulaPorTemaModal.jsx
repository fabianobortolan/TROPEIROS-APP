import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, BookOpen, Lightbulb } from "lucide-react";

const TEMAS_SUGERIDOS = [
  "Formação de Acordes",
  "Escalas Pentatônicas",
  "Ritmo Guarânia",
  "Progressões do Sertanejo Raiz",
  "Pestana — Técnica e Exercícios",
  "Campo Harmônico Maior",
  "Dedilhado para Viola",
  "Leitura de Cifras",
  "Improvisação em Tonalidade Maior",
  "Modulação entre Tonalidades",
  "Ritmo Rancheira",
  "Introdução à Harmonia Funcional",
];

export default function GerarAulaPorTemaModal({ onClose, onSaved }) {
  const [tema, setTema] = useState("");
  const [nivel, setNivel] = useState("intermediario");
  const [duracao, setDuracao] = useState(75);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);

  const handleGerar = async () => {
    if (!tema.trim() || tema.trim().length < 3) {
      setErro("Digite um tema com pelo menos 3 caracteres.");
      return;
    }
    setErro(null);
    setGerando(true);
    try {
      const response = await base44.functions.invoke('gerarAulaPorTema', {
        tema: tema.trim(),
        nivel,
        duracao_minutos: duracao
      });
      if (response.data?.success) {
        onSaved(response.data.aula);
      } else {
        setErro(response.data?.error || "Erro ao gerar aula.");
      }
    } catch (err) {
      setErro(err.message || "Erro desconhecido.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-[#D4C5B0] bg-white shadow-2xl">
        <CardHeader className="border-b border-[#D4C5B0]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#8B6F47] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Gerar Aula por Tema com IA
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={gerando}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {/* Tema */}
          <div className="space-y-2">
            <Label className="text-[#8B6F47] font-semibold">Tema da Aula *</Label>
            <Input
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ex: Formação de Acordes"
              className="border-[#D4C5B0] text-base"
              disabled={gerando}
              onKeyDown={(e) => e.key === 'Enter' && handleGerar()}
            />
          </div>

          {/* Temas sugeridos */}
          <div>
            <p className="text-xs text-[#A68A64] font-medium mb-2 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              Sugestões rápidas:
            </p>
            <div className="flex flex-wrap gap-2">
              {TEMAS_SUGERIDOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTema(t)}
                  disabled={gerando}
                  className={`px-3 py-1 rounded-full text-xs border transition-all cursor-pointer ${
                    tema === t
                      ? 'bg-[#8B6F47] text-white border-[#8B6F47]'
                      : 'bg-amber-50 text-[#8B6F47] border-[#D4C5B0] hover:border-[#8B6F47] hover:bg-[#8B6F47]/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Nível e Duração */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-semibold">Nível</Label>
              <Select value={nivel} onValueChange={setNivel} disabled={gerando}>
                <SelectTrigger className="border-[#D4C5B0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-semibold">Duração (min)</Label>
              <Select value={String(duracao)} onValueChange={(v) => setDuracao(Number(v))} disabled={gerando}>
                <SelectTrigger className="border-[#D4C5B0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="75">75 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex gap-2">
            <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-purple-700">
              A IA usará os materiais de referência, acordes, progressões, ritmos e cadernos de cifras cadastrados no sistema para criar uma aula personalizada e detalhada.
            </p>
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{erro}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={gerando}
              className="flex-1 border-[#8B6F47] text-[#8B6F47]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGerar}
              disabled={gerando || !tema.trim()}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              {gerando ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Aula
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}