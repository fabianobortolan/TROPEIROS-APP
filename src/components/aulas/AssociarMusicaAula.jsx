import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Music2, GraduationCap, Link2, X } from "lucide-react";

const nivelColors = {
  iniciante: "bg-green-500",
  basico: "bg-blue-500",
  intermediario: "bg-yellow-500",
  avancado: "bg-red-500"
};

const nivelLabels = {
  iniciante: "Iniciante",
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado"
};

export default function AssociarMusicaAula({ onVoltar }) {
  const queryClient = useQueryClient();
  const [buscaMusica, setBuscaMusica] = useState("");
  const [buscaAula, setBuscaAula] = useState("");
  const [musicaSel, setMusicaSel] = useState(null);
  const [aulaSel, setAulaSel] = useState(null);

  const { data: musicas = [], isLoading: carregandoMusicas } = useQuery({
    queryKey: ["musicas-biblioteca"],
    queryFn: async () => {
      const pagina = await base44.entities.Song.filter(
        {},
        { sort: "title", limit: 1000, fields: ["title", "artist", "main_key", "rhythm_name"] }
      );
      return pagina.items || [];
    },
  });

  const { data: aulas = [], isLoading: carregandoAulas } = useQuery({
    queryKey: ["aulas-associacao"],
    queryFn: async () => {
      const pagina = await base44.entities.Aula.filter(
        {},
        { sort: "numero", limit: 200, fields: ["numero", "titulo", "nivel", "descricao", "musicas_exemplo"] }
      );
      return pagina.items || [];
    },
  });

  const musicasFiltradas = useMemo(() => {
    const termo = buscaMusica.trim().toLowerCase();
    if (!termo) return musicas;
    return musicas.filter((m) =>
      `${m.title} ${m.artist || ""}`.toLowerCase().includes(termo)
    );
  }, [musicas, buscaMusica]);

  const aulasFiltradas = useMemo(() => {
    const termo = buscaAula.trim().toLowerCase();
    if (!termo) return aulas;
    return aulas.filter((a) =>
      `${a.numero} ${a.titulo} ${a.descricao || ""}`.toLowerCase().includes(termo)
    );
  }, [aulas, buscaAula]);

  const aulaAtual = aulas.find((a) => a.id === aulaSel?.id);
  const musicasDaAula = useMemo(() => {
    const ids = aulaAtual?.musicas_exemplo || [];
    return musicas.filter((m) => ids.includes(m.id));
  }, [aulaAtual, musicas]);

  const associarMutation = useMutation({
    mutationFn: ({ aulaId, ids }) =>
      base44.entities.Aula.update(aulaId, { musicas_exemplo: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aulas"] });
      queryClient.invalidateQueries({ queryKey: ["aulas-associacao"] });
    },
  });

  const associar = () => {
    if (!aulaSel || !musicaSel) return;
    const ids = [...(aulaAtual?.musicas_exemplo || [])];
    if (!ids.includes(musicaSel.id)) ids.push(musicaSel.id);
    associarMutation.mutate({
      aulaId: aulaSel.id,
      ids,
    }, {
      onSuccess: () => {
        alert(`✅ Música "${musicaSel.title}" vinculada à Aula ${aulaSel.numero} - ${aulaSel.titulo}!`);
        setMusicaSel(null);
      },
    });
  };

  const removerMusica = (musica) => {
    if (!aulaSel) return;
    const ids = (aulaAtual?.musicas_exemplo || []).filter((id) => id !== musica.id);
    associarMutation.mutate({ aulaId: aulaSel.id, ids });
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={onVoltar}
            variant="outline"
            className="mb-4 border-[#8B6F47] text-[#8B6F47]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Plano de Aulas
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold text-[#8B6F47] mb-2 flex items-center gap-3">
            <Link2 className="w-8 h-8" />
            Vincular Música à Aula
          </h1>
          <p className="text-[#A68A64] text-lg">
            Selecione uma música da biblioteca e a aula do plano — ela entra como material de apoio integrado da aula.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Músicas da Biblioteca */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <Music2 className="w-5 h-5" />
                1. Biblioteca de Músicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-[#A68A64] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={buscaMusica}
                  onChange={(e) => setBuscaMusica(e.target.value)}
                  placeholder="Buscar por título ou artista..."
                  className="pl-9 border-[#D4C5B0]"
                />
              </div>
              {carregandoMusicas ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-[#8B6F47] border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : musicasFiltradas.length === 0 ? (
                <p className="text-sm text-[#A68A64] text-center py-8">Nenhuma música encontrada.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {musicasFiltradas.map((musica) => {
                    const selecionada = musicaSel?.id === musica.id;
                    const jaAssociada = aulaAtual?.musicas_exemplo?.includes(musica.id);
                    return (
                      <button
                        key={musica.id}
                        type="button"
                        onClick={() => setMusicaSel(selecionada ? null : musica)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                          selecionada
                            ? "border-[#8B6F47] bg-[#F5F1E8]"
                            : "border-[#D4C5B0] bg-white hover:border-[#A68A64]"
                        }`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#8B6F47] text-sm truncate">{musica.title}</p>
                          <p className="text-xs text-[#A68A64] truncate">{musica.artist}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {musica.main_key && (
                            <Badge variant="outline" className="text-xs">{musica.main_key}</Badge>
                          )}
                          {jaAssociada && (
                            <Badge className="bg-[#9CAF88] text-white text-xs">✓ Associada</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aulas do Plano */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                2. Aula do Plano de Ensino
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-[#A68A64] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={buscaAula}
                  onChange={(e) => setBuscaAula(e.target.value)}
                  placeholder="Buscar aula por número ou título..."
                  className="pl-9 border-[#D4C5B0]"
                />
              </div>
              {carregandoAulas ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-[#8B6F47] border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : aulasFiltradas.length === 0 ? (
                <p className="text-sm text-[#A68A64] text-center py-8">Nenhuma aula encontrada.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {aulasFiltradas.map((aula) => {
                    const selecionada = aulaSel?.id === aula.id;
                    const totalMusicas = aula.musicas_exemplo?.length || 0;
                    return (
                      <button
                        key={aula.id}
                        type="button"
                        onClick={() => setAulaSel(selecionada ? null : aula)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                          selecionada
                            ? "border-[#8B6F47] bg-[#F5F1E8]"
                            : "border-[#D4C5B0] bg-white hover:border-[#A68A64]"
                        }`}>
                        <div
                          className={`w-10 h-10 rounded-full ${nivelColors[aula.nivel] || "bg-gray-400"} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {aula.numero}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#8B6F47] text-sm truncate">{aula.titulo}</p>
                          <p className="text-xs text-[#A68A64]">{nivelLabels[aula.nivel] || aula.nivel}</p>
                        </div>
                        {totalMusicas > 0 && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {totalMusicas} {totalMusicas === 1 ? "música" : "músicas"}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Painel de Associação */}
        {aulaSel && (
          <Card className="border-[#8B6F47] bg-white/80 mt-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm text-[#A68A64] mb-1">Aula selecionada</p>
                  <p className="text-lg font-bold text-[#8B6F47]">
                    Aula {aulaSel.numero} — {aulaSel.titulo}
                  </p>
                </div>
                <Button
                  onClick={associar}
                  disabled={!musicaSel || associarMutation.isPending}
                  className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">
                  <Link2 className="w-4 h-4 mr-2" />
                  {musicaSel
                    ? `Vincular "${musicaSel.title}"`
                    : "Selecione uma música"}
                </Button>
              </div>

              {musicasDaAula.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-[#8B6F47] mb-2">Músicas já vinculadas a esta aula:</p>
                  <div className="flex flex-wrap gap-2">
                    {musicasDaAula.map((musica) => (
                      <span
                        key={musica.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F1E8] border border-[#D4C5B0] text-sm text-[#8B6F47]">
                        <Music2 className="w-3 h-3" />
                        {musica.title}
                        <button
                          type="button"
                          onClick={() => removerMusica(musica)}
                          className="text-red-500 hover:text-red-700"
                          title="Remover associação">
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}