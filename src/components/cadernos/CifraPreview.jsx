import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Edit, Eye, Type, Wand2, Split, Maximize2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CifraPreview({ cifra, onConfirm, onCancel }) {
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState("unificado"); // unificado, separado, visual
  const [editedData, setEditedData] = useState({
    titulo: cifra.titulo || "",
    artista: cifra.artista || "",
    tom: cifra.tom || "",
    cifra_completa: cifra.cifra_completa || ""
  });

  const handleConfirm = () => {
    onConfirm(editedData);
  };

  const converterParaMaiusculas = () => {
    setEditedData({
      ...editedData,
      cifra_completa: editedData.cifra_completa.toUpperCase()
    });
  };

  const limparFormatacao = () => {
    if (!confirm("Limpar formatação? Isso irá:\n• Remover espaços extras no final de linhas\n• Normalizar quebras de linha múltiplas\n• Preservar o alinhamento básico dos acordes\n\nDeseja continuar?")) {
      return;
    }

    let texto = editedData.cifra_completa;
    
    // Remove espaços no final de cada linha
    texto = texto.split('\n').map(linha => linha.trimEnd()).join('\n');
    
    // Normaliza múltiplas quebras de linha (máximo 2 seguidas)
    texto = texto.replace(/\n{3,}/g, '\n\n');
    
    // Remove espaços antes e depois do texto completo
    texto = texto.trim();

    setEditedData({
      ...editedData,
      cifra_completa: texto
    });

    alert("✅ Formatação limpa! Espaços extras removidos e quebras de linha normalizadas.");
  };

  const separarAcordesELetras = () => {
    const linhas = editedData.cifra_completa.split('\n');
    const acordes = [];
    const letras = [];
    
    linhas.forEach(linha => {
      // Detecta se é linha de acorde (contém acordes comuns)
      const temAcordes = /\b[A-G](#|b)?(m|M|maj|min|dim|aug|sus|add)?\d?\b/.test(linha);
      const temPoucasLetras = linha.replace(/\s/g, '').length < linha.length * 0.3;
      
      if (temAcordes && temPoucasLetras) {
        acordes.push(linha);
        letras.push(''); // Linha vazia correspondente
      } else {
        acordes.push(''); // Linha vazia para acorde
        letras.push(linha);
      }
    });

    return { acordes: acordes.join('\n'), letras: letras.join('\n') };
  };

  const recombinarAcordesELetras = (acordesText, letrasText) => {
    const acordesLinhas = acordesText.split('\n');
    const letrasLinhas = letrasText.split('\n');
    const maxLinhas = Math.max(acordesLinhas.length, letrasLinhas.length);
    
    const resultado = [];
    for (let i = 0; i < maxLinhas; i++) {
      const acordeLinha = acordesLinhas[i] || '';
      const letraLinha = letrasLinhas[i] || '';
      
      if (acordeLinha.trim()) resultado.push(acordeLinha);
      if (letraLinha.trim()) resultado.push(letraLinha);
    }
    
    return resultado.join('\n');
  };

  const { acordes: acordesSeparados, letras: letrasSeparadas } = separarAcordesELetras();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8 border-[#8B6F47]">
        <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white">
          <CardTitle className="flex items-center justify-between">
            <span>Pré-visualização da Cifra</span>
            <div className="flex gap-2">
              <Button
                onClick={() => setEditMode(!editMode)}
                variant="secondary"
                size="sm"
              >
                {editMode ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {editMode ? (
            // Modo de edição
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#8B6F47]">Título</Label>
                  <Input
                    value={editedData.titulo}
                    onChange={(e) => setEditedData({ ...editedData, titulo: e.target.value })}
                    placeholder="Nome da música"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#8B6F47]">Artista</Label>
                  <Input
                    value={editedData.artista}
                    onChange={(e) => setEditedData({ ...editedData, artista: e.target.value })}
                    placeholder="Nome do artista"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#8B6F47]">Tom</Label>
                <Input
                  value={editedData.tom}
                  onChange={(e) => setEditedData({ ...editedData, tom: e.target.value })}
                  placeholder="Ex: E, G, Am"
                  className="w-32"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-[#8B6F47]">Cifra Completa</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={limparFormatacao}
                      variant="outline"
                      size="sm"
                      className="text-purple-600 border-purple-500 hover:bg-purple-50"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Limpar Formatação
                    </Button>
                    <Button
                      type="button"
                      onClick={converterParaMaiusculas}
                      variant="outline"
                      size="sm"
                      className="text-[#8B6F47] border-[#8B6F47]"
                    >
                      <Type className="w-4 h-4 mr-2" />
                      MAIÚSCULAS
                    </Button>
                  </div>
                </div>

                <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-[#E8DCC4]">
                    <TabsTrigger value="unificado" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Unificado
                    </TabsTrigger>
                    <TabsTrigger value="separado" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                      <Split className="w-4 h-4 mr-2" />
                      Separado
                    </TabsTrigger>
                    <TabsTrigger value="visual" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                      <Eye className="w-4 h-4 mr-2" />
                      Visual
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="unificado" className="mt-4">
                    <Textarea
                      value={editedData.cifra_completa}
                      onChange={(e) => setEditedData({ ...editedData, cifra_completa: e.target.value })}
                      placeholder="Letra e acordes..."
                      className="min-h-[400px] font-mono text-sm"
                      style={{ whiteSpace: 'pre', overflowX: 'auto' }}
                    />
                    <p className="text-xs text-[#A68A64] mt-2">
                      💡 Edição livre: letra e acordes juntos como estão no PDF
                    </p>
                  </TabsContent>

                  <TabsContent value="separado" className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[#8B6F47] flex items-center gap-2">
                        🎸 Acordes (uma linha de cada vez)
                      </Label>
                      <Textarea
                        value={acordesSeparados}
                        onChange={(e) => {
                          const novoTexto = recombinarAcordesELetras(e.target.value, letrasSeparadas);
                          setEditedData({ ...editedData, cifra_completa: novoTexto });
                        }}
                        placeholder="C    G    Am    F"
                        className="min-h-[180px] font-mono text-sm bg-blue-50"
                        style={{ whiteSpace: 'pre', overflowX: 'auto' }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#8B6F47] flex items-center gap-2">
                        📝 Letras (linha por linha)
                      </Label>
                      <Textarea
                        value={letrasSeparadas}
                        onChange={(e) => {
                          const novoTexto = recombinarAcordesELetras(acordesSeparados, e.target.value);
                          setEditedData({ ...editedData, cifra_completa: novoTexto });
                        }}
                        placeholder="Minha letra aqui..."
                        className="min-h-[180px] font-mono text-sm bg-amber-50"
                        style={{ whiteSpace: 'pre', overflowX: 'auto' }}
                      />
                    </div>
                    <p className="text-xs text-[#A68A64]">
                      💡 Edite acordes e letras separadamente. As mudanças são sincronizadas automaticamente.
                    </p>
                  </TabsContent>

                  <TabsContent value="visual" className="mt-4">
                    <div className="bg-[#F5F1E8] rounded-lg p-6 border-2 border-[#D4C5B0] min-h-[400px] overflow-auto">
                      <pre className="font-mono text-sm whitespace-pre text-[#4A4A4A]">
                        {editedData.cifra_completa.split('\n').map((linha, idx) => {
                          // Detecta acordes e destaca
                          const temAcordes = /\b[A-G](#|b)?(m|M|maj|min|dim|aug|sus|add)?\d?\b/.test(linha);
                          const temPoucasLetras = linha.replace(/\s/g, '').length < linha.length * 0.3;
                          
                          if (temAcordes && temPoucasLetras) {
                            return (
                              <div key={idx} className="text-blue-700 font-bold bg-blue-100 px-2 py-1 rounded">
                                {linha || '\u00A0'}
                              </div>
                            );
                          }
                          return <div key={idx}>{linha || '\u00A0'}</div>;
                        })}
                      </pre>
                    </div>
                    <p className="text-xs text-[#A68A64] mt-2">
                      👁️ Visualização com realce: linhas de acordes aparecem destacadas em azul
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            // Modo de visualização
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#8B6F47]">{editedData.titulo}</h2>
                  <p className="text-lg text-[#A68A64]">{editedData.artista}</p>
                </div>
                {editedData.tom && (
                  <Badge className="bg-[#D4AF37] text-white text-lg px-4 py-2">
                    Tom: {editedData.tom}
                  </Badge>
                )}
              </div>

              <div className="bg-[#F5F1E8] rounded-lg p-6 border-2 border-[#D4C5B0]">
                <pre className="font-mono text-sm whitespace-pre overflow-x-auto text-[#4A4A4A]">
                  {editedData.cifra_completa}
                </pre>
              </div>

              {cifra.caderno_nome && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Caderno: {cifra.caderno_nome}</Badge>
                  {cifra.pagina && <Badge variant="outline">Página {cifra.pagina}</Badge>}
                </div>
              )}
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#D4C5B0]">
            <Button
              onClick={onCancel}
              variant="outline"
              size="lg"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
              size="lg"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirmar Importação
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}