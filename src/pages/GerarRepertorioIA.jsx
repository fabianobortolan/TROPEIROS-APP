import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Music, ListMusic, Save, Filter, Key, Award, Shuffle, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TODAS_TONALIDADES = ["C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B"];

export default function GerarRepertorioIA() {
  const [filtros, setFiltros] = useState({
    tonalidade: "all",
    qtdAcordes: "all",
    ritmo: "all",
    estilo: "all",
    qtdMusicas: 10,
    evento: "",
    observacoes: ""
  });
  const [gerando, setGerando] = useState(false);
  const [repertorio, setRepertorio] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const { data: songs = [] } = useQuery({
    queryKey: ['songs-all'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: rhythms = [] } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: []
  });

  const getChordCount = (song) => {
    if (!song.progressions?.length) return 0;
    const all = new Set();
    song.progressions.forEach(p => (p.chords || []).forEach(c => all.add(c.replace(/[0-9]/g, '').trim())));
    return all.size;
  };

  const musicasFiltradas = songs.filter(song => {
    if (filtros.tonalidade !== "all" && song.main_key !== filtros.tonalidade) return false;
    if (filtros.ritmo !== "all" && song.rhythm_name !== filtros.ritmo) return false;
    if (filtros.estilo !== "all" && song.genre_style !== filtros.estilo) return false;
    const count = getChordCount(song);
    if (filtros.qtdAcordes === "2" && count !== 2) return false;
    if (filtros.qtdAcordes === "3" && count !== 3) return false;
    if (filtros.qtdAcordes === "4" && count !== 4) return false;
    if (filtros.qtdAcordes === "5+" && count < 5) return false;
    return true;
  });

  const gerarRepertorio = async () => {
    if (musicasFiltradas.length === 0) {
      alert("Nenhuma música encontrada com os filtros selecionados.");
      return;
    }
    setGerando(true);
    setRepertorio(null);
    try {
      const listaMusicasContext = musicasFiltradas.slice(0, 80).map(s =>
        `- "${s.title}" por ${s.artist} | Tom: ${s.main_key || 'N/A'} | Ritmo: ${s.rhythm_name || 'N/A'} | Acordes únicos: ${getChordCount(s)} | Progressão: ${s.predominant_progression || 'N/A'}`
      ).join('\n');

      const prompt = `Você é um especialista em curadoria musical sertaneja. Monte um repertório ideal para um evento/show com as músicas disponíveis abaixo.

CRITÉRIOS DO REPERTÓRIO:
- Quantidade de músicas desejada: ${filtros.qtdMusicas}
- Tonalidade preferida: ${filtros.tonalidade === 'all' ? 'Qualquer' : filtros.tonalidade}
- Ritmo preferido: ${filtros.ritmo === 'all' ? 'Qualquer' : filtros.ritmo}
- Estilo: ${filtros.estilo === 'all' ? 'Qualquer' : filtros.estilo}
- Quantidade de acordes: ${filtros.qtdAcordes === 'all' ? 'Qualquer' : filtros.qtdAcordes}
${filtros.evento ? `- Evento/contexto: ${filtros.evento}` : ''}
${filtros.observacoes ? `- Observações: ${filtros.observacoes}` : ''}

MÚSICAS DISPONÍVEIS:
${listaMusicasContext}

INSTRUÇÕES:
1. Selecione exatamente ${Math.min(filtros.qtdMusicas, musicasFiltradas.length)} músicas da lista acima
2. Ordene de forma que o show tenha boa energia e progressão (abertura, meio, clímax, encerramento)
3. Considere transições de tonalidade suaves quando possível
4. Retorne APENAS os títulos exatos das músicas selecionadas, na ordem ideal

Responda em JSON com a estrutura especificada.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            nome_sugerido: { type: "string", description: "Nome sugerido para o repertório" },
            musicas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  artista: { type: "string" },
                  motivo: { type: "string", description: "Por que esta música foi escolhida nesta posição" }
                }
              }
            },
            descricao: { type: "string", description: "Descrição geral do repertório montado" }
          }
        }
      });

      // Mapear músicas sugeridas com os dados reais
      const musicasMapeadas = (result.musicas || []).map(sugerida => {
        const found = musicasFiltradas.find(s =>
          s.title?.toLowerCase().trim() === sugerida.titulo?.toLowerCase().trim()
        );
        return found ? { ...found, motivo: sugerida.motivo } : null;
      }).filter(Boolean);

      setRepertorio({
        nome: result.nome_sugerido || "Repertório Gerado por IA",
        descricao: result.descricao || "",
        musicas: musicasMapeadas
      });
    } catch (err) {
      alert("Erro ao gerar repertório: " + err.message);
    } finally {
      setGerando(false);
    }
  };

  const salvarComoSetlist = async () => {
    if (!repertorio) return;
    setSalvando(true);
    try {
      await base44.entities.Setlist.create({
        name: repertorio.nome,
        description: repertorio.descricao,
        songs: repertorio.musicas.map(m => m.id),
        notes: `Gerado por IA em ${new Date().toLocaleDateString('pt-BR')} | Filtros: Tom: ${filtros.tonalidade}, Ritmo: ${filtros.ritmo}, Estilo: ${filtros.estilo}`
      });
      alert(`✅ Repertório "${repertorio.nome}" salvo com sucesso nos Repertórios!`);
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-amber-50 min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="w-8 h-8 text-[#8B6F47]" />
            <h1 className="text-3xl font-bold text-[#8B6F47]">Repertório por IA</h1>
          </div>
          <p className="text-[#A68A64]">Defina os critérios e a IA monta o repertório ideal para o seu evento</p>
        </motion.div>

        {/* Filtros */}
        <Card className="border-[#D4C5B0] bg-white/80 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#8B6F47] flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Critérios do Repertório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-[#8B6F47] text-xs mb-1 block">Tonalidade</Label>
                <Select value={filtros.tonalidade} onValueChange={v => setFiltros({...filtros, tonalidade: v})}>
                  <SelectTrigger className="border-[#D4C5B0] h-9 text-sm">
                    <SelectValue placeholder="Qualquer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer Tom</SelectItem>
                    {TODAS_TONALIDADES.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#8B6F47] text-xs mb-1 block">Qtd. de Acordes</Label>
                <Select value={filtros.qtdAcordes} onValueChange={v => setFiltros({...filtros, qtdAcordes: v})}>
                  <SelectTrigger className="border-[#D4C5B0] h-9 text-sm">
                    <SelectValue placeholder="Qualquer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer Qtd.</SelectItem>
                    <SelectItem value="2">2 acordes</SelectItem>
                    <SelectItem value="3">3 acordes</SelectItem>
                    <SelectItem value="4">4 acordes</SelectItem>
                    <SelectItem value="5+">5 ou mais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#8B6F47] text-xs mb-1 block">Ritmo</Label>
                <Select value={filtros.ritmo} onValueChange={v => setFiltros({...filtros, ritmo: v})}>
                  <SelectTrigger className="border-[#D4C5B0] h-9 text-sm">
                    <SelectValue placeholder="Qualquer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer Ritmo</SelectItem>
                    {rhythms.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#8B6F47] text-xs mb-1 block">Estilo</Label>
                <Select value={filtros.estilo} onValueChange={v => setFiltros({...filtros, estilo: v})}>
                  <SelectTrigger className="border-[#D4C5B0] h-9 text-sm">
                    <SelectValue placeholder="Qualquer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer Estilo</SelectItem>
                    <SelectItem value="sertanejo_raiz">🌾 Raiz</SelectItem>
                    <SelectItem value="sertanejo_universitario">🎓 Universitário</SelectItem>
                    <SelectItem value="sertanejo_romantico">💕 Romântico</SelectItem>
                    <SelectItem value="sertanejo_moderno">🎸 Moderno</SelectItem>
                    <SelectItem value="sertanejo_modao">🪗 Modão</SelectItem>
                    <SelectItem value="mpb">🎶 MPB</SelectItem>
                    <SelectItem value="samba">🥁 Samba</SelectItem>
                    <SelectItem value="forro">🪗 Forró</SelectItem>
                    <SelectItem value="outro">🎵 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#8B6F47] text-xs mb-1 block">Qtd. de Músicas</Label>
                <Select value={String(filtros.qtdMusicas)} onValueChange={v => setFiltros({...filtros, qtdMusicas: parseInt(v)})}>
                  <SelectTrigger className="border-[#D4C5B0] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5,8,10,12,15,20].map(n => <SelectItem key={n} value={String(n)}>{n} músicas</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#8B6F47] text-xs mb-1 block">Músicas disponíveis</Label>
                <div className="h-9 flex items-center px-3 rounded-md border border-[#D4C5B0] bg-amber-50">
                  <span className="text-sm font-bold text-[#8B6F47]">{musicasFiltradas.length}</span>
                  <span className="text-xs text-[#A68A64] ml-1">encontradas</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-[#8B6F47] text-xs mb-1 block">Tipo de Evento (opcional)</Label>
              <Input
                placeholder="Ex: Show ao vivo, Festa junina, Casamento, Ensaio..."
                value={filtros.evento}
                onChange={e => setFiltros({...filtros, evento: e.target.value})}
                className="border-[#D4C5B0] h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-[#8B6F47] text-xs mb-1 block">Observações para a IA (opcional)</Label>
              <Input
                placeholder="Ex: Começar animado, terminar com balada, evitar músicas lentas..."
                value={filtros.observacoes}
                onChange={e => setFiltros({...filtros, observacoes: e.target.value})}
                className="border-[#D4C5B0] h-9 text-sm"
              />
            </div>

            <Button
              onClick={gerarRepertorio}
              disabled={gerando || musicasFiltradas.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-[#8B6F47] hover:from-purple-700 hover:to-[#6B5437] text-white h-11 text-base font-semibold"
            >
              {gerando ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Gerando repertório...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Repertório com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultado */}
        <AnimatePresence>
          {repertorio && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-purple-300 bg-white/90">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-[#8B6F47] text-xl flex items-center gap-2">
                        <ListMusic className="w-6 h-6 text-purple-600" />
                        {repertorio.nome}
                      </CardTitle>
                      {repertorio.descricao && (
                        <p className="text-sm text-[#A68A64] mt-1">{repertorio.descricao}</p>
                      )}
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 border border-purple-300 whitespace-nowrap">
                      {repertorio.musicas.length} músicas
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {repertorio.musicas.map((musica, index) => (
                    <div key={musica.id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-[#D4C5B0]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-[#8B6F47] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#8B6F47] truncate">{musica.title}</p>
                        <p className="text-xs text-[#A68A64] truncate">{musica.artist}</p>
                        {musica.motivo && (
                          <p className="text-xs text-purple-600 mt-0.5 italic">💡 {musica.motivo}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {musica.main_key && (
                          <Badge className="bg-[#9CAF88]/20 text-[#8B6F47] border border-[#9CAF88]/40 text-xs">{musica.main_key}</Badge>
                        )}
                        {musica.rhythm_name && (
                          <Badge className="bg-[#8B6F47]/10 text-[#8B6F47] border border-[#8B6F47]/20 text-xs hidden md:inline-flex">{musica.rhythm_name}</Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={gerarRepertorio}
                      disabled={gerando}
                      className="flex-1 border-purple-400 text-purple-700 hover:bg-purple-50"
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Gerar Novamente
                    </Button>
                    <Button
                      onClick={salvarComoSetlist}
                      disabled={salvando}
                      className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                    >
                      {salvando ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar como Repertório
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}