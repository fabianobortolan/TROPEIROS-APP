import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle, Download, FileText, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function TemplateGuide() {
  const [copied, setCopied] = useState(false);

  const templateText = `[Intro]
Tom: C
BPM: 120
Ritmo: Guarânia

C  G  Am  F

[Verso 1]
    C              G
Primeira linha da letra aqui
    Am             F
Segunda linha da letra aqui
    C              G
Terceira linha da letra
    Am             F
Quarta linha da letra

[Pré-Refrão]
    F              G
Linha de transição aqui
    Am             G
Preparando pro refrão

[Refrão]
    C              G
Refrão primeira linha
    Am             F
Refrão segunda linha
    C              G
Refrão terceira linha
    Am             F
Refrão quarta linha

[Verso 2]
    C              G
Verso 2 primeira linha
    Am             F
Verso 2 segunda linha
    C              G
Verso 2 terceira linha
    Am             F
Verso 2 quarta linha

[Solo]
C  G  Am  F  (2x)

[Ponte]
    F              Em
Mudança de clima aqui
    Dm             G
Preparando o final

[Refrão Final]
    C              G
Refrão primeira linha
    Am             F
Refrão segunda linha
    C              G
Refrão terceira linha
    Am             F
Refrão quarta linha`;

  const handleCopy = () => {
    navigator.clipboard.writeText(templateText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([templateText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-cifra-tropeiros.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
            📝 Template de Cifra
          </h1>
          <p className="text-[#A68A64]">
            Formato otimizado para análise perfeita da IA - 100+ músicas? Use este modelo!
          </p>
        </motion.div>

        {/* Alerta Importante */}
        <Alert className="mb-6 border-[#D4AF37] bg-[#D4AF37]/10">
          <AlertCircle className="h-5 w-5 text-[#D4AF37]" />
          <AlertDescription className="text-[#8B6F47]">
            <strong>🎯 FORMATAÇÃO = SUCESSO!</strong> Seguindo este template, a IA conseguirá identificar 
            <strong> CADA SEÇÃO INDIVIDUALMENTE</strong> (Intro, Verso 1, Verso 2, Refrão) e calcular a 
            <strong> progressão predominante</strong> com precisão máxima!
          </AlertDescription>
        </Alert>

        {/* Regras de Ouro */}
        <Card className="mb-6 border-[#8B6F47] bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              ⭐ 7 REGRAS DE OURO
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-block bg-[#9CAF88]/10 p-4 rounded-lg border-l-4 border-[#9CAF88]">
                <h3 className="font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                  <span className="text-[#9CAF88]">1.</span> Identifique TODAS as Seções
                </h3>
                <p className="text-sm text-gray-700">
                  Use <code className="bg-white px-2 py-0.5 rounded">[Intro]</code>, 
                  <code className="bg-white px-2 py-0.5 rounded ml-1">[Verso 1]</code>, 
                  <code className="bg-white px-2 py-0.5 rounded ml-1">[Verso 2]</code>, 
                  <code className="bg-white px-2 py-0.5 rounded ml-1">[Pré-Refrão]</code>, 
                  <code className="bg-white px-2 py-0.5 rounded ml-1">[Refrão]</code>, 
                  <code className="bg-white px-2 py-0.5 rounded ml-1">[Solo]</code>, 
                  <code className="bg-white px-2 py-0.5 rounded ml-1">[Ponte]</code>, 
                  <code className="bg-white px-2 py-0.5 rounded ml-1">[Outro]</code>
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  ❌ Errado: <code className="bg-red-50 px-1">[Versos]</code> (agrupa tudo)<br/>
                  ✅ Certo: <code className="bg-green-50 px-1">[Verso 1]</code>, <code className="bg-green-50 px-1">[Verso 2]</code>
                </p>
              </div>

              <div className="card-block bg-[#D4AF37]/10 p-4 rounded-lg border-l-4 border-[#D4AF37]">
                <h3 className="font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                  <span className="text-[#D4AF37]">2.</span> Acordes ACIMA da Letra
                </h3>
                <p className="text-sm text-gray-700">
                  Coloque os acordes na linha de cima, alinhados com as sílabas
                </p>
                <div className="bg-white p-2 rounded mt-2 font-mono text-xs">
                  <div className="text-[#8B6F47]">    C              G</div>
                  <div className="text-gray-700">Sentado aqui na beira</div>
                  <div className="text-[#8B6F47] mt-1">    Am             F</div>
                  <div className="text-gray-700">Vendo o sol se pôr</div>
                </div>
              </div>

              <div className="card-block bg-[#8B6F47]/10 p-4 rounded-lg border-l-4 border-[#8B6F47]">
                <h3 className="font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                  <span className="text-[#8B6F47]">3.</span> Use Espaços para Alinhar
                </h3>
                <p className="text-sm text-gray-700">
                  4 espaços antes dos acordes mantém tudo organizado
                </p>
                <div className="bg-white p-2 rounded mt-2">
                  <p className="text-xs text-green-700">✅ BOM: Espaçamento consistente</p>
                  <p className="text-xs text-red-700 mt-1">❌ RUIM: Acordes desalinhados</p>
                </div>
              </div>

              <div className="card-block bg-[#9CAF88]/10 p-4 rounded-lg border-l-4 border-[#9CAF88]">
                <h3 className="font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                  <span className="text-[#9CAF88]">4.</span> Tom, BPM e Ritmo no Início
                </h3>
                <p className="text-sm text-gray-700">
                  Logo após <code className="bg-white px-1">[Intro]</code>, adicione:
                </p>
                <div className="bg-white p-2 rounded mt-2 font-mono text-xs">
                  <div>Tom: C</div>
                  <div>BPM: 120</div>
                  <div>Ritmo: Guarânia</div>
                </div>
              </div>

              <div className="card-block bg-[#D4AF37]/10 p-4 rounded-lg border-l-4 border-[#D4AF37]">
                <h3 className="font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                  <span className="text-[#D4AF37]">5.</span> Separe as Seções com Linha
                </h3>
                <p className="text-sm text-gray-700">
                  Deixe uma linha em branco entre cada seção
                </p>
                <div className="bg-white p-2 rounded mt-2 font-mono text-xs">
                  <div>[Verso 1]</div>
                  <div>C  G  Am  F</div>
                  <div className="text-gray-400 my-1">← linha vazia</div>
                  <div>[Refrão]</div>
                  <div>F  G  C  Am</div>
                </div>
              </div>

              <div className="card-block bg-[#8B6F47]/10 p-4 rounded-lg border-l-4 border-[#8B6F47]">
                <h3 className="font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                  <span className="text-[#8B6F47]">6.</span> Use Nomes Padrão de Acordes
                </h3>
                <p className="text-sm text-gray-700">
                  C, D, E, F, G, A, B + m (menor), 7 (sétima)
                </p>
                <div className="grid grid-cols-3 gap-1 mt-2 text-xs">
                  <div className="bg-green-50 p-1 rounded text-center">✅ C</div>
                  <div className="bg-green-50 p-1 rounded text-center">✅ Am</div>
                  <div className="bg-green-50 p-1 rounded text-center">✅ G7</div>
                  <div className="bg-red-50 p-1 rounded text-center">❌ Dó</div>
                  <div className="bg-red-50 p-1 rounded text-center">❌ Lam</div>
                  <div className="bg-red-50 p-1 rounded text-center">❌ Sol7</div>
                </div>
              </div>

              <div className="card-block bg-[#9CAF88]/10 p-4 rounded-lg border-l-4 border-[#9CAF88]">
                <h3 className="font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                  <span className="text-[#9CAF88]">7.</span> Repita Refrão se Necessário
                </h3>
                <p className="text-sm text-gray-700">
                  Não use "repete refrão 2x" - escreva tudo
                </p>
                <div className="bg-white p-2 rounded mt-2 text-xs">
                  <p className="text-red-700">❌ "Repete Refrão 2x"</p>
                  <p className="text-green-700 mt-1">✅ Escrever o Refrão 2 vezes completo</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Interativo */}
        <Card className="mb-6 border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-[#D4C5B0]">
            <CardTitle className="text-[#8B6F47] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Template Pronto para Copiar
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar .TXT
                </Button>
                <Button
                  onClick={handleCopy}
                  className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Template
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-[#1e1e1e] text-[#d4d4d4] p-6 rounded-lg font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap">{templateText}</pre>
            </div>
          </CardContent>
        </Card>

        {/* Passo a Passo para 100+ Músicas */}
        <Card className="mb-6 border-[#D4AF37] bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white">
            <CardTitle>🚀 Workflow para 100+ Músicas</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#8B6F47] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <h3 className="font-bold text-[#8B6F47] mb-1">Organize seus arquivos</h3>
                  <p className="text-sm text-gray-700">
                    Crie uma pasta "Cifras Original" e outra "Cifras Formatadas"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#8B6F47] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <h3 className="font-bold text-[#8B6F47] mb-1">Pegue 5 músicas por vez</h3>
                  <p className="text-sm text-gray-700">
                    Não tente fazer 100 de uma vez! Faça lotes de 5-10 músicas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#8B6F47] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <h3 className="font-bold text-[#8B6F47] mb-1">Abra o template em um editor de texto</h3>
                  <p className="text-sm text-gray-700">
                    Use Notepad, VSCode, Sublime ou qualquer editor
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#8B6F47] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                <div>
                  <h3 className="font-bold text-[#8B6F47] mb-1">Cole sua cifra e ajuste o formato</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    Siga as 7 regras de ouro acima
                  </p>
                  <Alert className="border-[#9CAF88] bg-[#9CAF88]/10">
                    <AlertDescription className="text-xs">
                      <strong>💡 DICA RÁPIDA:</strong> Atalho Ctrl+H (Find & Replace) ajuda muito!<br/>
                      Exemplo: Trocar "Dó" por "C", "Lá" por "A", etc.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#8B6F47] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">5</div>
                <div>
                  <h3 className="font-bold text-[#8B6F47] mb-1">Salve como .TXT</h3>
                  <p className="text-sm text-gray-700">
                    Nome do arquivo: "NomeDaMusica - Artista.txt"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#9CAF88] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">6</div>
                <div>
                  <h3 className="font-bold text-[#8B6F47] mb-1">Analise no sistema</h3>
                  <p className="text-sm text-gray-700">
                    Vá em "Analisar Música" → Cole a cifra formatada → Clique "Analisar"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#D4AF37] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">7</div>
                <div>
                  <h3 className="font-bold text-[#8B6F47] mb-1">Revise na Biblioteca</h3>
                  <p className="text-sm text-gray-700">
                    Verifique se a progressão predominante foi calculada e se as seções estão corretas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#D4AF37] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">🔁</div>
                <div>
                  <h3 className="font-bold text-[#8B6F47] mb-1">Repita para os próximos lotes</h3>
                  <p className="text-sm text-gray-700">
                    Em 2-3 horas você consegue processar 50-70 músicas!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exemplos Comparativos */}
        <Card className="mb-6 border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="border-b border-[#D4C5B0]">
            <CardTitle className="text-[#8B6F47]">❌ vs ✅ Comparação</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Errado */}
              <div>
                <h3 className="font-bold text-red-600 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  ❌ FORMATO ERRADO
                </h3>
                <div className="bg-red-50 p-4 rounded-lg font-mono text-xs border-2 border-red-200">
                  <div className="text-red-800">Evidências - Chitãozinho e Xororó</div>
                  <div className="mt-2 text-gray-700">Verso:</div>
                  <div className="text-gray-700">C G Am F</div>
                  <div className="text-gray-700 mt-1">Quando eu digo que deixei de te amar</div>
                  <div className="text-gray-700">É porque eu te amo</div>
                  <div className="mt-2 text-gray-700">Repete Refrão 2x</div>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <p className="text-red-600">❌ Não identifica seções individuais</p>
                  <p className="text-red-600">❌ Acordes não alinhados com letra</p>
                  <p className="text-red-600">❌ "Repete" não funciona</p>
                  <p className="text-red-600">❌ Sem Tom, BPM, Ritmo</p>
                </div>
              </div>

              {/* Certo */}
              <div>
                <h3 className="font-bold text-green-600 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  ✅ FORMATO CORRETO
                </h3>
                <div className="bg-green-50 p-4 rounded-lg font-mono text-xs border-2 border-green-200">
                  <div className="text-green-800">[Intro]</div>
                  <div className="text-gray-700">Tom: C</div>
                  <div className="text-gray-700">BPM: 90</div>
                  <div className="text-gray-700">Ritmo: Balada</div>
                  <div className="mt-2 text-green-800">[Verso 1]</div>
                  <div className="text-[#8B6F47]">    C              G</div>
                  <div className="text-gray-700">Quando eu digo que deixei</div>
                  <div className="text-[#8B6F47]">    Am             F</div>
                  <div className="text-gray-700">É porque eu te amo</div>
                  <div className="mt-2 text-green-800">[Refrão]</div>
                  <div className="text-[#8B6F47]">    F              G</div>
                  <div className="text-gray-700">São só evidências...</div>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <p className="text-green-600">✅ Seções claramente identificadas</p>
                  <p className="text-green-600">✅ Acordes alinhados perfeitos</p>
                  <p className="text-green-600">✅ Tom, BPM, Ritmo definidos</p>
                  <p className="text-green-600">✅ IA analisa PERFEITAMENTE</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dicas Finais */}
        <Card className="border-[#9CAF88] bg-gradient-to-r from-[#9CAF88]/10 to-white shadow-xl">
          <CardContent className="p-6">
            <h3 className="font-bold text-[#8B6F47] text-xl mb-4">💡 Dicas Finais</h3>
            <div className="space-y-2 text-sm">
              <p>✅ Use um editor com <strong>Find & Replace</strong> (Ctrl+H) para acelerar</p>
              <p>✅ Trabalhe em <strong>lotes de 5-10 músicas</strong> para não cansar</p>
              <p>✅ Sempre <strong>revise na Biblioteca</strong> depois de analisar</p>
              <p>✅ Se a IA errar uma seção, você pode <strong>editar manualmente</strong></p>
              <p>✅ Cadastre suas <strong>progressões no banco</strong> antes de analisar</p>
              <p>✅ Use o botão <strong>"Recalcular Todas"</strong> se cadastrar novas progressões</p>
              <p>✅ Salve os arquivos .TXT formatados - <strong>você pode reusar!</strong></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}