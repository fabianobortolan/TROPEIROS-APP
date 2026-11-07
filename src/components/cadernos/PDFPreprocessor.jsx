import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Scissors, FileText, Trash2, CheckCircle2, AlertCircle, Sparkles, Loader2, Play, Settings, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

export default function PDFPreprocessor({ pdfUrl, onProcessWithInstructions, isProcessing, caderno, onSaveBatchConfig }) {
  const [pagesToProcess, setPagesToProcess] = useState("");
  const [pagesToIgnore, setPagesToIgnore] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [splitInto, setSplitInto] = useState("");
  const [useBatchMode, setUseBatchMode] = useState(caderno?.config_lotes?.ativado || false);
  const [totalPages, setTotalPages] = useState(caderno?.config_lotes?.total_paginas?.toString() || "");
  const [batchesProcessed, setBatchesProcessed] = useState(caderno?.lotes_processados || []);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [preserveWhitespace, setPreserveWhitespace] = useState(true);
  const [extractionMode, setExtractionMode] = useState("precise"); // precise | balanced | aggressive

  const handlePreprocess = () => {
    const instructions = {
      pagesToProcess: pagesToProcess.trim(),
      pagesToIgnore: pagesToIgnore.trim(),
      customInstructions: customInstructions.trim(),
      splitInto: splitInto.trim(),
      preserveWhitespace,
      extractionMode
    };

    onProcessWithInstructions(instructions);
  };

  // Gera lotes automaticamente ou usa os salvos
  const batches = useMemo(() => {
    // Se já tem lotes salvos, usa eles
    if (caderno?.config_lotes?.lotes_gerados?.length > 0) {
      return caderno.config_lotes.lotes_gerados;
    }
    
    if (!useBatchMode || !totalPages) return [];
    
    const total = parseInt(totalPages);
    if (isNaN(total) || total <= 0) return [];
    
    const batchSize = 20;
    const generatedBatches = [];
    
    for (let i = 1; i <= total; i += batchSize) {
      const end = Math.min(i + batchSize - 1, total);
      generatedBatches.push({
        id: Math.ceil(i / batchSize),
        range: `${i}-${end}`
      });
    }
    
    return generatedBatches;
  }, [useBatchMode, totalPages, caderno?.config_lotes]);

  // Salva configuração quando lotes são gerados
  useEffect(() => {
    if (useBatchMode && batches.length > 0 && onSaveBatchConfig) {
      onSaveBatchConfig({
        ativado: true,
        total_paginas: parseInt(totalPages),
        lotes_gerados: batches
      });
    } else if (!useBatchMode && onSaveBatchConfig && caderno?.config_lotes?.ativado) {
      onSaveBatchConfig({
        ativado: false,
        total_paginas: null,
        lotes_gerados: []
      });
    }
  }, [useBatchMode, batches.length, totalPages]);

  const handleProcessBatch = (batch) => {
    const instructions = {
      pagesToProcess: batch.range,
      pagesToIgnore: pagesToIgnore.trim(),
      customInstructions: customInstructions.trim(),
      preserveWhitespace,
      extractionMode,
      batchInfo: {
        lote_id: batch.id,
        range: batch.range,
        data_processamento: new Date().toISOString()
      }
    };
    
    onProcessWithInstructions(instructions);
  };

  return (
    <Card className="border-2 border-[#8B6F47]/30 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#D4AF37]" />
          <CardTitle className="text-[#8B6F47]">Preparação Inteligente do PDF</CardTitle>
        </div>
        <CardDescription className="text-base">
          Configure a extração para melhorar a precisão e evitar erros de processamento
          {caderno?.lista_pdfs?.length > 1 && (
            <span className="block mt-1 text-sm font-semibold text-blue-700">
              📚 Este caderno contém {caderno.lista_pdfs.length} arquivos PDF que serão processados juntos
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Dica:</strong> PDFs grandes ou com muitas ilustrações podem falhar. 
            Use o modo de processamento em lotes para maior eficiência.
          </AlertDescription>
        </Alert>

        {/* Toggle para modo em lote */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h4 className="font-bold text-purple-900">Modo Processamento em Lotes</h4>
            </div>
            <Button
              onClick={() => setUseBatchMode(!useBatchMode)}
              variant={useBatchMode ? "default" : "outline"}
              className={useBatchMode ? "bg-purple-600" : ""}
            >
              {useBatchMode ? "Ativado" : "Ativar"}
            </Button>
          </div>
          <p className="text-sm text-purple-700">
            {useBatchMode 
              ? "✅ Sistema dividirá automaticamente em lotes de 20 páginas cada" 
              : "Divide automaticamente o PDF em lotes otimizados de 20 páginas"}
          </p>
        </div>

        {/* Modo em lote ativado */}
        {useBatchMode ? (
          <>
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Total de Páginas do PDF *
              </Label>
              <Input
                type="number"
                placeholder="Ex: 100"
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                className="text-base"
              />
              <p className="text-sm text-gray-600">
                Informe quantas páginas tem o PDF completo
              </p>
            </div>

            {totalPages && batches.length > 0 && (
              <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
                <h4 className="font-bold text-purple-900 mb-3">
                  📦 Lotes Gerados ({batches.length} lotes)
                </h4>
                <p className="text-sm text-purple-700 mb-3">
                  Processe cada lote individualmente clicando em "Processar" ou use o botão abaixo para instruções gerais
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {batches.map((batch) => {
                    const isProcessed = batchesProcessed.some(b => b.lote_id === batch.id);
                    return (
                      <div
                        key={batch.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          isProcessed 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-gray-50 border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={isProcessed ? "default" : "outline"} className={isProcessed ? "bg-green-600" : ""}>
                            Lote {batch.id}
                          </Badge>
                          <span className="font-medium">Páginas {batch.range}</span>
                          {isProcessed && (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <Button
                          onClick={() => handleProcessBatch(batch)}
                          disabled={isProcessing || isProcessed}
                          size="sm"
                          className={isProcessed ? "bg-green-600" : "bg-purple-600"}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isProcessed ? (
                            "Processado"
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Processar
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    ℹ️ Processados: {batchesProcessed.length} de {batches.length} lotes
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Páginas Específicas para Processar (opcional)
            </Label>
            <Input
              placeholder="Ex: 1-10, 15, 20-30"
              value={pagesToProcess}
              onChange={(e) => setPagesToProcess(e.target.value)}
              className="text-base"
            />
            <p className="text-sm text-gray-600">
              Deixe em branco para processar todas as páginas, ou especifique intervalos
            </p>
          </div>
        )}

        {/* Páginas a ignorar */}
        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Páginas para Ignorar (opcional)
          </Label>
          <Input
            placeholder="Ex: 1, 5-8, 25 (capas, índices, teorias)"
            value={pagesToIgnore}
            onChange={(e) => setPagesToIgnore(e.target.value)}
            className="text-base"
          />
          <p className="text-sm text-gray-600">
            Páginas com capas, índices, textos teóricos, ilustrações, etc
          </p>
        </div>

        {!useBatchMode && (
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              Dividir em Partes (opcional)
            </Label>
            <Input
              type="number"
              placeholder="Ex: 20 (processar 20 páginas por vez)"
              value={splitInto}
              onChange={(e) => setSplitInto(e.target.value)}
              className="text-base"
            />
            <p className="text-sm text-gray-600">
              Processa o PDF em lotes menores para evitar timeout (recomendado: 15-25 páginas)
            </p>
          </div>
        )}

        {/* Configurações Avançadas */}
        <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border-2 border-slate-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              <h4 className="font-bold text-slate-900">Configurações Avançadas</h4>
            </div>
            <Button
              onClick={() => setAdvancedMode(!advancedMode)}
              variant="outline"
              size="sm"
            >
              {advancedMode ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
          
          {advancedMode && (
            <div className="space-y-4 mt-4">
              {/* Modo de Extração */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Modo de Extração</Label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setExtractionMode("precise")}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      extractionMode === "precise"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      <strong className="text-sm">Preciso (Recomendado)</strong>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Máxima preservação de espaçamento. Ideal para cifras bem formatadas.
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setExtractionMode("balanced")}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      extractionMode === "balanced"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <strong className="text-sm">Equilibrado</strong>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Tenta corrigir pequenas inconsistências mantendo alinhamento.
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setExtractionMode("aggressive")}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      extractionMode === "aggressive"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <strong className="text-sm">Agressivo</strong>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Extração máxima. Use quando houver muitas imagens/diagramas misturados.
                    </p>
                  </button>
                </div>
              </div>

              {/* Preservar Espaçamento */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <Label className="text-sm font-semibold">Preservar Espaçamento Original</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Mantém alinhamento exato entre acordes e letras (recomendado: ativado)
                  </p>
                </div>
                <Switch
                  checked={preserveWhitespace}
                  onCheckedChange={setPreserveWhitespace}
                />
              </div>
            </div>
          )}
        </div>

        {/* Instruções customizadas */}
        <div className="space-y-2">
          <Label className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Instruções Específicas deste Caderno
          </Label>
          <Textarea
            placeholder="Ex: 'Este caderno tem diagramas de acordes em todas as páginas, ignore-os. As cifras estão em fonte pequena no rodapé. O formato é: título em negrito, artista em itálico, seguido da letra com acordes.'"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            className="h-32 text-base"
          />
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-xs text-blue-800 font-semibold mb-2">💡 Exemplos de Instruções Úteis:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• "As cifras usam nomenclatura em inglês (C, D, E em vez de Dó, Ré, Mi)"</li>
              <li>• "Ignorar cabeçalhos e rodapés com números de página"</li>
              <li>• "O tom está sempre após o título entre parênteses"</li>
              <li>• "Cifras manuscritas ou com letra irregular"</li>
              <li>• "Formato de duas colunas, processar coluna por coluna"</li>
            </ul>
          </div>
        </div>

        {/* Sugestões rápidas */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Sugestões de Uso:
          </h4>
          <ul className="space-y-1 text-sm text-amber-800">
            <li>• <strong>Caderno grande (100+ pág):</strong> Divida em 20 páginas</li>
            <li>• <strong>Tem capa/índice:</strong> Ignore as páginas iniciais (ex: 1-3)</li>
            <li>• <strong>Tem teoria/explicações:</strong> Ignore essas páginas</li>
            <li>• <strong>Muitos diagramas:</strong> Descreva nas instruções customizadas</li>
            <li>• <strong>Formato específico:</strong> Explique a estrutura nas instruções</li>
          </ul>
        </div>

        {/* Botão de processar */}
        <Button
          onClick={handlePreprocess}
          disabled={isProcessing || (useBatchMode && !totalPages)}
          className="w-full bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#6B5437] hover:to-[#8B6F47] text-white text-lg py-6"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Processando... Aguarde
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              {useBatchMode ? "Aplicar Instruções aos Lotes" : "Processar com Preparação Inteligente"}
            </>
          )}
        </Button>
        
        {useBatchMode && !totalPages && (
          <Alert className="bg-purple-50 border-purple-200">
            <AlertCircle className="w-4 h-4 text-purple-600" />
            <AlertDescription className="text-purple-800">
              <strong>Informe o total de páginas acima</strong> para gerar os lotes automaticamente
            </AlertDescription>
          </Alert>
        )}

        {isProcessing && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Aguarde:</strong> O processamento pode levar de 5 a 15 minutos dependendo do tamanho. 
              Não feche esta página!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}