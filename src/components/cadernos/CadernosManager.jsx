import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, Search, BookOpen, FileText, Loader2, 
  Download, Music2, Plus, CheckCircle, AlertCircle,
  Trash2, Eye, Library
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PDFPreprocessor from "./PDFPreprocessor";
import CifraPreview from "./CifraPreview";

export default function CadernosManager({ onImportSong }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedCaderno, setSelectedCaderno] = useState(null);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [processingPDF, setProcessingPDF] = useState(false);
  const [showPreprocessor, setShowPreprocessor] = useState(null);
  const [previewCifra, setPreviewCifra] = useState(null);

  const [uploadForm, setUploadForm] = useState({
    nome_caderno: "",
    descricao: "",
    tags: "",
    pdf_files: [], // Múltiplos arquivos PDF
    txt_files: []  // Múltiplos arquivos TXT
  });

  const { data: cadernos, isLoading } = useQuery({
    queryKey: ['cadernos'],
    queryFn: () => base44.entities.CadernosCifras.list('-data_upload'),
  });

  const createCadernoMutation = useMutation({
    mutationFn: (data) => base44.entities.CadernosCifras.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadernos'] });
      setShowUploadForm(false);
      setUploadForm({ nome_caderno: "", descricao: "", tags: "", pdf_files: [], txt_files: [] });
    }
  });

  const updateCadernoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CadernosCifras.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadernos'] });
    }
  });

  const deleteCadernoMutation = useMutation({
    mutationFn: (id) => base44.entities.CadernosCifras.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadernos'] });
      setSelectedCaderno(null);
    }
  });

  const handlePDFUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Valida todos os arquivos
    for (const file of files) {
      if (file.type !== 'application/pdf') {
        alert(`⚠️ "${file.name}" não é um PDF. Selecione apenas arquivos PDF.`);
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        alert(`⚠️ "${file.name}" é muito grande. Máximo 100MB por arquivo.`);
        return;
      }
    }

    setUploadingPDF(true);
    try {
      const uploadedFiles = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Enviando arquivo ${i + 1} de ${files.length}: ${file.name}`);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedFiles.push({
          url: file_url,
          nome: file.name,
          ordem: i + 1
        });
      }
      
      setUploadForm({ ...uploadForm, pdf_files: uploadedFiles });
      alert(`✅ ${uploadedFiles.length} arquivo(s) carregado(s) com sucesso!`);
    } catch (err) {
      console.error("Erro ao fazer upload:", err);
      alert("❌ Erro ao fazer upload dos PDFs");
    } finally {
      setUploadingPDF(false);
    }
  };

  const handleTXTUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Valida todos os arquivos
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.txt')) {
        alert(`⚠️ "${file.name}" não é um arquivo TXT. Selecione apenas arquivos .txt`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`⚠️ "${file.name}" é muito grande. Máximo 10MB por arquivo.`);
        return;
      }
    }

    setUploadingPDF(true);
    try {
      console.log(`📚 Processando ${files.length} arquivos TXT...`);
      const cifrasExtraidas = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📖 Lendo arquivo ${i + 1} de ${files.length}: ${file.name}`);
        
        // Lê o conteúdo do arquivo diretamente
        const conteudo = await file.text();
        
        // Extrai informações do nome do arquivo
        const nomeArquivo = file.name.replace('.txt', '').replace('.TXT', '');
        
        // Busca por título e artista no conteúdo
        const linhas = conteudo.split('\n');
        let titulo = nomeArquivo;
        let artista = '';
        let tom = '';
        
        // Tenta detectar título, artista e tom nas primeiras linhas
        for (let j = 0; j < Math.min(5, linhas.length); j++) {
          const linha = linhas[j].trim();
          if (linha.toLowerCase().startsWith('título:') || linha.toLowerCase().startsWith('titulo:')) {
            titulo = linha.split(':')[1]?.trim() || titulo;
          } else if (linha.toLowerCase().startsWith('artista:')) {
            artista = linha.split(':')[1]?.trim() || '';
          } else if (linha.toLowerCase().startsWith('tom:')) {
            tom = linha.split(':')[1]?.trim() || '';
          }
        }
        
        cifrasExtraidas.push({
          titulo: titulo,
          artista: artista,
          tom: tom,
          cifra_completa: conteudo,
          pagina: i + 1
        });
      }
      
      setUploadForm({ 
        ...uploadForm, 
        txt_files: cifrasExtraidas
      });
      
      alert(`✅ ${cifrasExtraidas.length} arquivo(s) TXT lido(s) com sucesso!`);
    } catch (err) {
      console.error("Erro ao processar TXT:", err);
      alert("❌ Erro ao processar arquivos TXT");
    } finally {
      setUploadingPDF(false);
    }
  };

  const handleSubmitCaderno = async (e) => {
    e.preventDefault();
    if (uploadForm.pdf_files.length === 0 && uploadForm.txt_files.length === 0) {
      alert("⚠️ Faça upload de pelo menos um arquivo (PDF ou TXT)");
      return;
    }

    // Verifica se há tanto PDFs quanto TXTs (não permitido)
    if (uploadForm.pdf_files.length > 0 && uploadForm.txt_files.length > 0) {
      alert("⚠️ Escolha apenas um tipo de arquivo: PDFs OU arquivos TXT");
      return;
    }

    // Processa arquivos TXT diretamente (já foram lidos localmente)
    if (uploadForm.txt_files.length > 0) {
      const cifrasExtraidas = uploadForm.txt_files;
      
      const cadernoData = {
        nome_caderno: uploadForm.nome_caderno,
        pdf_url: "txt-import", // Placeholder obrigatório para o schema
        descricao: uploadForm.descricao || "",
        tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()) : [],
        data_upload: new Date().toISOString(),
        processado: true, // TXT já vem processado
        total_musicas: cifrasExtraidas.length,
        cifras_extraidas: cifrasExtraidas
      };

      await createCadernoMutation.mutateAsync(cadernoData);
      alert(`✅ ${cifrasExtraidas.length} música(s) importada(s) de arquivos TXT!`);
      setUploadForm({ nome_caderno: "", descricao: "", tags: "", pdf_files: [], txt_files: [] });
      return;
    }

    // Se for PDF, cria sem processar (processamento manual depois)
    const cadernoData = {
      nome_caderno: uploadForm.nome_caderno,
      pdf_url: uploadForm.pdf_files[0].url,
      pdf_urls_adicionais: uploadForm.pdf_files.slice(1).map(f => f.url),
      lista_pdfs: uploadForm.pdf_files,
      descricao: uploadForm.descricao || "",
      tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()) : [],
      data_upload: new Date().toISOString(),
      processado: false,
      total_musicas: 0,
      cifras_extraidas: []
    };

    await createCadernoMutation.mutateAsync(cadernoData);
    setUploadForm({ nome_caderno: "", descricao: "", tags: "", pdf_files: [], txt_files: [] });
  };

  const processarCaderno = async (caderno, preprocessInstructions = null) => {
    // Se não tem instruções de pré-processamento, mostra o preprocessador
    if (!preprocessInstructions) {
      setShowPreprocessor(caderno);
      return;
    }

    setProcessingPDF(true);
    try {
      console.log("🔄 Iniciando processamento do caderno:", caderno.nome_caderno);
      console.log("📄 PDF URL:", caderno.pdf_url);
      console.log("⚙️ Instruções de pré-processamento:", preprocessInstructions);

      // Determina o nível de rigor baseado no modo de extração
      const extractionSettings = {
        precise: {
          priority: "MÁXIMA PRESERVAÇÃO DE ESPAÇAMENTO",
          tolerance: "ZERO tolerância para mudanças de espaçamento",
          approach: "Copie EXATAMENTE cada caractere e espaço como está no PDF"
        },
        balanced: {
          priority: "PRESERVAR ALINHAMENTO PRINCIPAL",
          tolerance: "Pode ajustar espaços extras mas mantenha alinhamento funcional",
          approach: "Mantenha o alinhamento entre acordes e palavras, corrija apenas espaços claramente errados"
        },
        aggressive: {
          priority: "EXTRAÇÃO MÁXIMA DE CONTEÚDO",
          tolerance: "Foque em extrair TODO o texto, mesmo com formatação irregular",
          approach: "Extraia todo conteúdo textual possível, ignorando elementos visuais complexos"
        }
      };

      const mode = preprocessInstructions.extractionMode || "precise";
      const settings = extractionSettings[mode];

      // Prompt focado em preservação de whitespace
      let extractionPrompt = `🔴 MODO DE EXTRAÇÃO: ${mode.toUpperCase()} 🔴

CONFIGURAÇÃO ATUAL:
✓ Prioridade: ${settings.priority}
✓ Tolerância: ${settings.tolerance}
✓ Abordagem: ${settings.approach}

═══════════════════════════════════════════════════════════════

🔴 ATENÇÃO CRÍTICA: CIFRAS MUSICAIS USAM ESPAÇAMENTO PARA ALINHAR ACORDES COM PALAVRAS

VOCÊ ESTÁ EXTRAINDO CIFRAS MUSICAIS. Neste formato:
- Os ESPAÇOS entre caracteres são FUNCIONAIS, não decorativos
- Cada espaço alinha um acorde com a sílaba da palavra correspondente
- Remover ou alterar espaços DESTRÓI a cifra completamente

═══════════════════════════════════════════════════════════════
EXEMPLO DO PDF (copie EXATAMENTE assim):

 C        G       Am      F
Era uma vez um menino chamado João
 C        G           Am
Que vivia sonhando com seu violão

═══════════════════════════════════════════════════════════════

NO CAMPO letra_cifra VOCÊ DEVE RETORNAR EXATAMENTE:
" C        G       Am      F\\nEra uma vez um menino chamado João\\n C        G           Am\\nQue vivia sonhando com seu violão"

❌ NUNCA FAÇA ASSIM (ERRADO):
"C G Am F Era uma vez um menino chamado João C G Am Que vivia sonhando com seu violão"

❌ NUNCA REMOVA ESPAÇOS:
"C G Am F\\nEra uma vez um menino chamado João" ← ERRADO!

✅ PRESERVE QUANTIDADE EXATA DE ESPAÇOS:
Se tem 8 espaços entre C e G no PDF → coloque 8 espaços
Se tem 3 espaços entre G e Am no PDF → coloque 3 espaços

═══════════════════════════════════════════════════════════════
INSTRUÇÕES TÉCNICAS:

1. Cada linha visual do PDF = adicione \\n
2. Conte os espaços entre caracteres e reproduza a quantidade exata
3. Linhas de acordes ficam SEPARADAS das linhas de letra
4. NÃO normalize, NÃO compacte, NÃO reformate texto

Pense como um programa de OCR puro: COPIE pixel por pixel o espaçamento.

${mode === "aggressive" ? `
🔶 MODO AGRESSIVO ATIVO:
- IGNORE completamente: diagramas de acordes visuais, tablaturas, pentagramas, imagens
- EXTRAIA TODO texto legível, mesmo que misturado com elementos visuais
- Foque APENAS em: título, artista, tom, letra com acordes em formato texto
- Se houver dúvida entre texto e imagem, sempre escolha extrair o texto
` : ''}

${!preprocessInstructions.preserveWhitespace ? `
⚠️ PRESERVAÇÃO DE ESPAÇAMENTO DESATIVADA:
Você pode normalizar espaços, mas mantenha alinhamento básico entre acordes e letras.
` : ''}`;
      
      // Adiciona filtro de páginas
      if (preprocessInstructions.pagesToProcess) {
        extractionPrompt += `PROCESSE APENAS as páginas: ${preprocessInstructions.pagesToProcess}. `;
      }
      if (preprocessInstructions.pagesToIgnore) {
        extractionPrompt += `IGNORE COMPLETAMENTE as páginas: ${preprocessInstructions.pagesToIgnore} (são capas, índices, textos teóricos ou ilustrações). `;
      }

      extractionPrompt += "\nIGNORE totalmente: figuras, diagramas visuais, fotos, gráficos, ilustrações, elementos decorativos. ";
      extractionPrompt += "\nExtraia APENAS conteúdo TEXTUAL: título da música, artista, tom e a cifra (letra com acordes). ";

      // Adiciona instruções customizadas do usuário
      if (preprocessInstructions.customInstructions) {
        extractionPrompt += `\n\nINSTRUÇÕES ESPECÍFICAS DESTE CADERNO: ${preprocessInstructions.customInstructions}`;
      }

      extractionPrompt += "\n\nRetorne SOMENTE músicas com título e cifra em texto, PRESERVANDO a formatação linha por linha.";

      // Instruções específicas por modo
      if (mode === "precise") {
        extractionPrompt += "\n\n🎯 MODO PRECISO: Copie EXATAMENTE o espaçamento. Conte os espaços entre cada caractere e reproduza fielmente.";
      } else if (mode === "balanced") {
        extractionPrompt += "\n\n⚖️ MODO EQUILIBRADO: Mantenha o alinhamento funcional entre acordes e palavras. Corrija apenas espaços claramente excessivos.";
      } else if (mode === "aggressive") {
        extractionPrompt += "\n\n⚡ MODO AGRESSIVO: Extraia TODO o conteúdo textual possível. Ignore completamente elementos visuais, diagramas e imagens. Foque APENAS em texto legível.";
      }

      console.log("📝 Prompt de extração:", extractionPrompt);

      // Prepara URLs de todos os PDFs do caderno
      const allPdfUrls = [caderno.pdf_url];
      if (caderno.pdf_urls_adicionais && caderno.pdf_urls_adicionais.length > 0) {
        allPdfUrls.push(...caderno.pdf_urls_adicionais);
      }

      console.log(`📚 Processando ${allPdfUrls.length} PDF(s) do caderno`);

      // Usa InvokeLLM para ter mais controle sobre a extração
      const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: `${extractionPrompt}

${allPdfUrls.length > 1 ? `🔴 IMPORTANTE: Este caderno contém ${allPdfUrls.length} arquivos PDF. Extraia músicas de TODOS os arquivos.` : ''}

${preprocessInstructions.pagesToProcess ? `Processe APENAS páginas: ${preprocessInstructions.pagesToProcess}` : ''}
${preprocessInstructions.pagesToIgnore ? `IGNORE páginas: ${preprocessInstructions.pagesToIgnore}` : ''}
${preprocessInstructions.customInstructions ? `Instruções extras: ${preprocessInstructions.customInstructions}` : ''}

🔴🔴🔴 REPETINDO A REGRA MAIS IMPORTANTE 🔴🔴🔴

O campo "letra_cifra" DEVE conter o texto CÓPIA EXATA do PDF:
- Conta quantos espaços tem entre cada caractere e repete o mesmo número
- Se no PDF a linha de acordes tem "C        G" (8 espaços), você coloca "C        G" (8 espaços)
- NÃO compacte para "C G" ← isso está ERRADO
- Use \\n para cada quebra de linha
- Linhas de acordes ficam em linhas separadas das linhas de letra

Extraia todas as músicas do PDF como um SCANNER preciso de texto.`,
        file_urls: allPdfUrls,
        response_json_schema: {
          type: "object",
          properties: {
            musicas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  artista: { type: "string" },
                  tom: { type: "string" },
                  letra_cifra: { type: "string" }
                },
                required: ["titulo", "letra_cifra"]
              }
            }
          }
        }
      });

      const result = { status: "success", output: llmResult };

      console.log("✅ Resposta recebida:", result);

      // Valida e processa o resultado
      let cifrasExtraidas = [];
      
      if (result && result.status === "success" && result.output) {
        // Tenta extrair do output
        const dados = result.output;
        
        if (dados.musicas && Array.isArray(dados.musicas)) {
          cifrasExtraidas = dados.musicas;
        } else if (Array.isArray(dados)) {
          cifrasExtraidas = dados;
        }
      } else if (result && Array.isArray(result)) {
        cifrasExtraidas = result;
      } else if (result && result.musicas && Array.isArray(result.musicas)) {
        cifrasExtraidas = result.musicas;
      }

      console.log("📊 Cifras extraídas (bruto):", cifrasExtraidas);

      // Filtra e formata as cifras válidas
      const cifrasValidas = cifrasExtraidas
        .filter(m => m && m.titulo && m.titulo.trim() !== "")
        .map(m => ({
          titulo: m.titulo.trim(),
          artista: m.artista ? m.artista.trim() : "",
          tom: m.tom ? m.tom.trim() : "",
          cifra_completa: m.letra_cifra || m.cifra_completa || m.cifra || "",
          pagina: m.pagina || 0
        }))
        .filter(m => m.cifra_completa.trim() !== "");

      if (cifrasValidas.length === 0) {
        throw new Error(`Nenhuma música válida foi extraída do PDF.\n\nO PDF pode estar:\n• Muito complexo ou com muitas imagens\n• Com cifras manuscritas\n• Com formatação não padrão\n\nTente dividir o PDF em arquivos menores ou verifique a qualidade.\n\nDados recebidos: ${JSON.stringify(result).substring(0, 300)}`);
      }

      console.log(`✅ ${cifrasValidas.length} cifras válidas processadas`);

      // SEMPRE combina com cifras existentes (permite processar em lotes)
      let cifrasFinais = cifrasValidas;
      if (caderno.cifras_extraidas && caderno.cifras_extraidas.length > 0) {
        console.log(`📎 Combinando com ${caderno.cifras_extraidas.length} cifras existentes`);
        cifrasFinais = [...caderno.cifras_extraidas, ...cifrasValidas];
      }

      // Atualiza histórico de lotes processados se for processamento em lote
      let lotesProcessados = caderno.lotes_processados || [];
      if (preprocessInstructions.batchInfo) {
        lotesProcessados = [...lotesProcessados, preprocessInstructions.batchInfo];
      }

      // Salva no banco de dados
      await updateCadernoMutation.mutateAsync({
        id: caderno.id,
        data: {
          cifras_extraidas: cifrasFinais,
          total_musicas: cifrasFinais.length,
          processado: true,
          lotes_processados: lotesProcessados
        }
      });

      // Mensagem de sucesso detalhada
      let mensagem = `✅ PROCESSAMENTO CONCLUÍDO COM SUCESSO!\n\n`;
      mensagem += `📊 Novas músicas extraídas: ${cifrasValidas.length}\n`;
      mensagem += `📚 Total acumulado no caderno: ${cifrasFinais.length} músicas\n\n`;
      mensagem += `📝 Músicas encontradas neste lote:\n\n`;
      
      cifrasValidas.slice(0, 10).forEach((c, idx) => {
        mensagem += `${idx + 1}. ${c.titulo}`;
        if (c.artista) mensagem += ` - ${c.artista}`;
        if (c.tom) mensagem += ` (${c.tom})`;
        mensagem += `\n`;
      });
      
      if (cifrasValidas.length > 10) {
        mensagem += `\n... e mais ${cifrasValidas.length - 10} músicas\n`;
      }

      mensagem += `\n✅ Caderno pronto para busca!`;

      alert(mensagem);
      setShowPreprocessor(null); // Fecha o preprocessador após sucesso

    } catch (err) {
      console.error("❌ ERRO DETALHADO:", err);
      console.error("Stack:", err.stack);
      
      let mensagemErro = `❌ FALHA NO PROCESSAMENTO\n\n`;
      mensagemErro += `Erro: ${err.message}\n\n`;
      mensagemErro += `POSSÍVEIS CAUSAS:\n`;
      mensagemErro += `1. PDF muito complexo ou com formatação irregular\n`;
      mensagemErro += `2. Cifras escritas à mão ou com qualidade ruim\n`;
      mensagemErro += `3. Timeout (PDF muito grande)\n`;
      mensagemErro += `4. Cifras em formato não padrão\n\n`;
      mensagemErro += `SUGESTÕES:\n`;
      mensagemErro += `• Tente dividir o PDF em arquivos menores (20-30 páginas)\n`;
      mensagemErro += `• Certifique-se de que o PDF é legível e de boa qualidade\n`;
      mensagemErro += `• Se persistir, adicione as músicas manualmente uma por vez\n\n`;
      mensagemErro += `Detalhes técnicos foram salvos no console (F12)`;
      
      alert(mensagemErro);
    } finally {
      setProcessingPDF(false);
      setShowPreprocessor(null); // Fecha o preprocessador após erro
    }
  };

  // Busca em todas as cifras de todos os cadernos
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results = [];

    (cadernos || []).forEach(caderno => {
      if (!caderno.cifras_extraidas) return;

      caderno.cifras_extraidas.forEach(cifra => {
        const tituloMatch = cifra.titulo?.toLowerCase().includes(query);
        const artistaMatch = cifra.artista?.toLowerCase().includes(query);

        if (tituloMatch || artistaMatch) {
          results.push({
            ...cifra,
            caderno_nome: caderno.nome_caderno,
            caderno_id: caderno.id
          });
        }
      });
    });

    return results;
  }, [searchQuery, cadernos]);

  const handleImportClick = (cifra) => {
    setPreviewCifra(cifra);
  };

  const handleConfirmImport = (editedCifra) => {
    if (onImportSong) {
      onImportSong(editedCifra);
    }
    setPreviewCifra(null);
  };

  // Calcula total de músicas em todos os cadernos
  const totalMusicasGeral = React.useMemo(() => {
    return (cadernos || []).reduce((total, caderno) => {
      return total + (caderno.total_musicas || 0);
    }, 0);
  }, [cadernos]);

  return (
    <div className="space-y-6">
      {/* Contador Total */}
      <Card className="border-[#D4AF37] bg-gradient-to-r from-[#F5F1E8] to-[#E8DCC4]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#8B6F47] rounded-full">
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#A68A64] font-medium">Total de Músicas Processadas</p>
                {isLoading ? (
                  <p className="text-3xl font-bold text-[#A68A64] animate-pulse">...</p>
                ) : (
                  <p className="text-3xl font-bold text-[#8B6F47]">{totalMusicasGeral}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#A68A64]">
                {isLoading ? 'Carregando...' : `em ${(cadernos || []).length} caderno${(cadernos || []).length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview de cifra antes da importação */}
      {previewCifra && (
        <CifraPreview
          cifra={previewCifra}
          onConfirm={handleConfirmImport}
          onCancel={() => setPreviewCifra(null)}
        />
      )}

      {/* Preprocessador (se ativo) */}
      {showPreprocessor && (
        <div className="space-y-3">
          <Card className="border-blue-300 bg-blue-50">
            <CardContent className="pt-4">
              <p className="text-blue-800 font-semibold">
                💡 Dica: Processar em Lotes
              </p>
              <p className="text-blue-700 text-sm mt-1">
                Você pode processar o caderno em partes (ex: pág 1-20, depois 21-40...). As cifras serão automaticamente somadas.
                {showPreprocessor.total_musicas > 0 && ` Já existem ${showPreprocessor.total_musicas} músicas neste caderno.`}
              </p>
            </CardContent>
          </Card>
          <PDFPreprocessor
            pdfUrl={showPreprocessor.pdf_url}
            caderno={showPreprocessor}
            isProcessing={processingPDF}
            onProcessWithInstructions={(instructions) => {
              processarCaderno(showPreprocessor, instructions);
            }}
            onSaveBatchConfig={async (config) => {
              await updateCadernoMutation.mutateAsync({
                id: showPreprocessor.id,
                data: { config_lotes: config }
              });
            }}
          />
          <Button
            onClick={() => setShowPreprocessor(null)}
            variant="outline"
          >
            Cancelar Processamento
          </Button>
        </div>
      )}

      {/* Busca rápida */}
      <Card className="border-[#D4AF37]">
        <CardHeader>
          <CardTitle className="text-[#8B6F47] flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Música nos Cadernos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A68A64]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome da música ou artista..."
              className="pl-10 text-lg border-[#D4C5B0] focus:border-[#8B6F47]"
            />
          </div>

          <AnimatePresence>
            {searchQuery && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2 max-h-96 overflow-y-auto"
              >
                {searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0] hover:border-[#8B6F47] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-[#8B6F47]">{result.titulo}</h4>
                        <p className="text-sm text-[#A68A64]">{result.artista}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {result.caderno_nome}
                          </Badge>
                          {result.tom && (
                            <Badge variant="outline" className="text-xs">
                              Tom: {result.tom}
                            </Badge>
                          )}
                          {result.pagina && (
                            <Badge variant="outline" className="text-xs">
                              Pág. {result.pagina}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleImportClick(result)}
                        className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Pré-visualizar
                      </Button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-4 text-[#A68A64]">
                Nenhuma música encontrada com "{searchQuery}"
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Gerenciar cadernos */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[#8B6F47]">Meus Cadernos de Cifras</h3>
        <Button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Caderno
        </Button>
      </div>

      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-[#8B6F47]">
              <CardHeader>
                <CardTitle className="text-[#8B6F47]">Novo Caderno</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitCaderno} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[#8B6F47]">Nome do Caderno *</Label>
                    <Input
                      value={uploadForm.nome_caderno}
                      onChange={(e) => setUploadForm({ ...uploadForm, nome_caderno: e.target.value })}
                      placeholder="Ex: Caderno Sertanejo Vol. 1"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#8B6F47]">Descrição</Label>
                    <Textarea
                      value={uploadForm.descricao}
                      onChange={(e) => setUploadForm({ ...uploadForm, descricao: e.target.value })}
                      placeholder="Breve descrição do conteúdo..."
                      className="h-20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#8B6F47]">Tags (separadas por vírgula)</Label>
                    <Input
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                      placeholder="Ex: sertanejo, modão, raiz"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#8B6F47]">Arquivos do Caderno *</Label>
                    <p className="text-sm text-[#A68A64]">
                      📚 Escolha PDFs OU arquivos TXT (não misture os dois tipos)
                    </p>
                    
                    {/* Área de PDFs */}
                    {uploadForm.pdf_files.length > 0 ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-green-800 font-semibold">
                              ✓ {uploadForm.pdf_files.length} PDF(s) carregado(s)
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setUploadForm({ ...uploadForm, pdf_files: [] })}
                            >
                              Remover Todos
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {uploadForm.pdf_files.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm text-green-700">
                                <FileText className="w-4 h-4" />
                                <span>{idx + 1}. {file.nome}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : uploadForm.txt_files.length > 0 ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-800 font-semibold">
                              ✓ {uploadForm.txt_files.length} música(s) TXT carregada(s)
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setUploadForm({ ...uploadForm, txt_files: [] })}
                            >
                              Remover Todos
                            </Button>
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {uploadForm.txt_files.map((cifra, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm text-blue-700">
                                <Music2 className="w-4 h-4" />
                                <span>{idx + 1}. {cifra.titulo}{cifra.artista ? ` - ${cifra.artista}` : ''}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-blue-600 mt-2 font-medium">
                            ⚡ Prontas para importação instantânea!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Upload de PDFs */}
                          <div>
                            <input
                              type="file"
                              accept="application/pdf"
                              multiple
                              onChange={handlePDFUpload}
                              disabled={uploadingPDF}
                              className="hidden"
                              id="pdf-upload"
                            />
                            <label
                              htmlFor="pdf-upload"
                              className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                                uploadingPDF 
                                  ? 'border-[#8B6F47] bg-[#8B6F47]/5 cursor-wait' 
                                  : 'border-[#D4C5B0] hover:border-[#8B6F47] hover:bg-[#8B6F47]/5'
                              }`}
                            >
                              {uploadingPDF ? (
                                <>
                                  <Loader2 className="w-5 h-5 text-[#8B6F47] animate-spin" />
                                  <span className="text-[#8B6F47] text-sm">Enviando...</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-6 h-6 text-[#A68A64]" />
                                  <span className="text-[#A68A64] font-medium text-sm">PDFs</span>
                                  <span className="text-xs text-[#A68A64] text-center">Cifras em PDF</span>
                                </>
                              )}
                            </label>
                          </div>

                          {/* Upload de TXTs */}
                          <div>
                            <input
                              type="file"
                              accept=".txt"
                              multiple
                              onChange={handleTXTUpload}
                              disabled={uploadingPDF}
                              className="hidden"
                              id="txt-upload"
                            />
                            <label
                              htmlFor="txt-upload"
                              className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                                uploadingPDF 
                                  ? 'border-blue-400 bg-blue-400/5 cursor-wait' 
                                  : 'border-[#D4C5B0] hover:border-blue-400 hover:bg-blue-50'
                              }`}
                            >
                              {uploadingPDF ? (
                                <>
                                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                  <span className="text-blue-600 text-sm">Enviando...</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-6 h-6 text-blue-500" />
                                  <span className="text-blue-600 font-medium text-sm">Arquivos TXT</span>
                                  <span className="text-xs text-blue-500 text-center">Cifras já formatadas</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                        <p className="text-xs text-[#A68A64] text-center mt-2">
                          💡 TXTs são processados instantaneamente, PDFs precisam ser processados depois
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowUploadForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createCadernoMutation.isPending || uploadingPDF}
                      className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                    >
                      {createCadernoMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de cadernos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(cadernos || []).map((caderno) => (
          <Card key={caderno.id} className="border-[#D4C5B0] hover:border-[#8B6F47] transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-[#8B6F47] text-lg">{caderno.nome_caderno}</CardTitle>
                  {caderno.descricao && (
                    <p className="text-sm text-[#A68A64] mt-1">{caderno.descricao}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Excluir "${caderno.nome_caderno}"?`)) {
                      deleteCadernoMutation.mutate(caderno.id);
                    }
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {caderno.processado ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Processado
                  </Badge>
                ) : (
                  <Badge className="bg-orange-100 text-orange-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Não processado
                  </Badge>
                )}
                <Badge variant="outline">
                  <Music2 className="w-3 h-3 mr-1" />
                  {caderno.total_musicas || 0} músicas
                </Badge>
              </div>

              {caderno.tags && caderno.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {caderno.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {caderno.lista_pdfs && caderno.lista_pdfs.length > 1 ? (
                  <div className="flex-1">
                    <details className="group">
                      <summary className="flex items-center justify-center gap-2 px-3 py-2 border border-[#8B6F47] rounded-md cursor-pointer hover:bg-[#8B6F47]/5 text-sm">
                        <BookOpen className="w-4 h-4" />
                        Ver PDFs ({caderno.lista_pdfs.length})
                      </summary>
                      <div className="mt-2 space-y-1 p-2 bg-[#F5F1E8] rounded border border-[#D4C5B0]">
                        {caderno.lista_pdfs.map((pdf, idx) => (
                          <button
                            key={idx}
                            onClick={() => window.open(pdf.url, '_blank')}
                            className="w-full text-left px-2 py-1 text-xs hover:bg-white rounded flex items-center gap-2"
                          >
                            <FileText className="w-3 h-3" />
                            {idx + 1}. {pdf.nome}
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : (
                  <Button
                    onClick={() => window.open(caderno.pdf_url, '_blank')}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver PDF
                  </Button>
                )}
                <Button
                  onClick={() => processarCaderno(caderno)}
                  disabled={processingPDF}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-[#9CAF88] to-[#8B6F47] text-white"
                >
                  {processingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Processar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && (cadernos || []).length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-[#A68A64] mx-auto mb-4" />
          <p className="text-[#A68A64]">Nenhum caderno adicionado ainda</p>
        </div>
      )}
    </div>
  );
}