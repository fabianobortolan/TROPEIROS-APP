import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, Music2, Library, Upload, Waves, Guitar, 
  Music4, ListMusic, BarChart3, Download, GraduationCap,
  Piano, GitBranch, Target, Palette, CalendarDays, Timer,
  ChevronRight, FileText, Sparkles, Brain, Lightbulb,
  TrendingUp, Search, Edit, Play, Share2, Printer,
  Zap, Award, RefreshCw, Volume2
} from "lucide-react";
import { motion } from "framer-motion";

export default function Documentation() {
  const [activeSection, setActiveSection] = useState("intro");

  const sections = [
    { id: "intro", title: "Introdução", icon: BookOpen },
    { id: "getting-started", title: "Primeiros Passos", icon: Play },
    { id: "analyze", title: "Analisar Música", icon: Upload },
    { id: "library", title: "Biblioteca", icon: Library },
    { id: "progressions", title: "Progressões", icon: Waves },
    { id: "chords", title: "Acordes", icon: Guitar },
    { id: "rhythms", title: "Ritmos", icon: Music4 },
    { id: "study-plans", title: "Planos de Estudo", icon: CalendarDays },
    { id: "theory", title: "Teoria Musical", icon: GraduationCap },
    { id: "advanced", title: "Recursos Avançados", icon: Sparkles },
  ];

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-24 h-24 flex items-center justify-center">
              <img 
                src="/img/522fde112_LOGO-PNG.png" 
                alt="Tropeiros do Bebedouro"
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#8B6F47] mb-2">
                Guia Completo de Uso
              </h1>
              <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white text-sm">
                Versão 5.0 - Dezembro 2025
              </Badge>
            </div>
          </div>
          <p className="text-[#A68A64] text-lg">
            Sistema de Análise Harmônica e Gestão de Repertório Musical para Orquestra Tropeiros do Bebedouro
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de Navegação */}
          <div className="lg:col-span-1">
            <Card className="border-[#D4C5B0] bg-white/80 sticky top-4">
              <CardHeader>
                <CardTitle className="text-[#8B6F47] text-lg">Navegação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sections.map((section) => (
                  <Button
                    key={section.id}
                    variant={activeSection === section.id ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      activeSection === section.id
                        ? "bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                        : "text-[#8B6F47] hover:bg-[#8B6F47]/10"
                    }`}
                    onClick={() => scrollToSection(section.id)}
                  >
                    <section.icon className="w-4 h-4 mr-2" />
                    {section.title}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-3 space-y-6">
            {/* INTRODUÇÃO */}
            <Card id="intro" className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  Introdução
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-bold text-[#8B6F47] text-xl mb-3">Bem-vindo ao Sistema de Análise Harmônica!</h3>
                  <p className="text-[#A68A64] leading-relaxed">
                    Este sistema foi desenvolvido especialmente para a <strong>Orquestra Tropeiros do Bebedouro</strong>, 
                    com foco em música sertaneja e caipira. Ele oferece ferramentas completas para análise harmônica, 
                    gestão de repertório, estudo musical e preparação de apresentações.
                  </p>
                </div>

                <div className="bg-[#9CAF88]/10 rounded-xl p-4 border border-[#9CAF88]/30">
                  <h4 className="font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                    Principais Recursos da v5.0
                  </h4>
                  <ul className="space-y-2 text-sm text-[#8B6F47]">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span><strong>Análise Automática com IA:</strong> Identifica progressões harmônicas, tonalidade, ritmo e estrutura</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span><strong>Biblioteca Sertaneja Completa:</strong> Organize músicas com metadados detalhados</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span><strong>Cifras Interativas:</strong> Clique nos acordes para ver diagramas de violão/viola</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span><strong>Transposição de Tom:</strong> Mude a tonalidade instantaneamente</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span><strong>Modo de Palco:</strong> Visualização otimizada para apresentações ao vivo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span><strong>Planos de Estudo Personalizados:</strong> Crie rotinas de prática</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span><strong>Teoria Musical Interativa:</strong> Aprenda enquanto analisa</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-2">Para quem é este sistema?</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#F5F1E8] rounded-lg p-3 border border-[#D4C5B0]">
                      <p className="text-sm text-[#8B6F47]">
                        <strong>✅ Músicos da Orquestra:</strong> Estudar repertório e preparar apresentações
                      </p>
                    </div>
                    <div className="bg-[#F5F1E8] rounded-lg p-3 border border-[#D4C5B0]">
                      <p className="text-sm text-[#8B6F47]">
                        <strong>✅ Arranjadores:</strong> Analisar harmonias e criar arranjos
                      </p>
                    </div>
                    <div className="bg-[#F5F1E8] rounded-lg p-3 border border-[#D4C5B0]">
                      <p className="text-sm text-[#8B6F47]">
                        <strong>✅ Maestros:</strong> Gerenciar repertório e setlists
                      </p>
                    </div>
                    <div className="bg-[#F5F1E8] rounded-lg p-3 border border-[#D4C5B0]">
                      <p className="text-sm text-[#8B6F47]">
                        <strong>✅ Estudantes:</strong> Aprender teoria musical na prática
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PRIMEIROS PASSOS */}
            <Card id="getting-started" className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-6 h-6" />
                  Primeiros Passos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-bold text-[#8B6F47] text-lg mb-3">Como Começar</h3>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-[#8B6F47] mb-2">Faça Login</h4>
                      <p className="text-sm text-[#A68A64]">
                        Acesse o sistema com suas credenciais fornecidas pela orquestra. 
                        Você terá acesso completo a todas as funcionalidades.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-[#8B6F47] mb-2">Explore a Biblioteca</h4>
                      <p className="text-sm text-[#A68A64]">
                        Vá até <strong>Biblioteca</strong> no menu lateral para ver todas as músicas já cadastradas. 
                        Clique em qualquer música para ver análise completa, cifra, progressões e mais.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-[#8B6F47] mb-2">Adicione sua Primeira Música</h4>
                      <p className="text-sm text-[#A68A64]">
                        Use <strong>Analisar Música</strong> para adicionar novas músicas ao repertório. 
                        Você pode enviar arquivos de áudio, links do YouTube ou colar a cifra diretamente.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-full flex items-center justify-center text-white font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-[#8B6F47] mb-2">Crie seu Plano de Estudo</h4>
                      <p className="text-sm text-[#A68A64]">
                        Acesse <strong>Planos de Estudo</strong> para criar rotinas personalizadas de prática 
                        baseadas nas músicas do repertório.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#D4AF37]/10 rounded-xl p-4 border border-[#D4AF37]/30 mt-6">
                  <p className="text-sm text-[#8B6F47]">
                    <strong>💡 Dica Profissional:</strong> Comece explorando músicas já cadastradas antes de adicionar novas. 
                    Isso ajuda a entender como o sistema funciona e quais informações são importantes.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ANALISAR MÚSICA */}
            <Card id="analyze" className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-6 h-6" />
                  Analisar Música
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-[#A68A64]">
                  A funcionalidade de análise é o coração do sistema. Ela usa inteligência artificial para 
                  identificar automaticamente progressões harmônicas, tonalidade, ritmo e estrutura musical.
                </p>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3">Formas de Adicionar Músicas:</h4>
                  
                  <div className="grid gap-4">
                    <div className="bg-[#F5F1E8] rounded-lg p-4 border-l-4 border-[#D4AF37]">
                      <div className="flex items-center gap-2 mb-2">
                        <Music2 className="w-5 h-5 text-[#D4AF37]" />
                        <h5 className="font-bold text-[#8B6F47]">1. Arquivo de Áudio</h5>
                      </div>
                      <p className="text-sm text-[#A68A64] mb-2">
                        Faça upload de arquivos MP3, WAV ou outros formatos de áudio.
                      </p>
                      <ul className="text-xs text-[#8B6F47] space-y-1 ml-4">
                        <li>• Sistema analisa harmonias automaticamente</li>
                        <li>• Identifica tonalidade e progressões</li>
                        <li>• Calcula duração e BPM</li>
                      </ul>
                    </div>

                    <div className="bg-[#F5F1E8] rounded-lg p-4 border-l-4 border-[#9CAF88]">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-[#9CAF88]" />
                        <h5 className="font-bold text-[#8B6F47]">2. Cifra/Letra</h5>
                      </div>
                      <p className="text-sm text-[#A68A64] mb-2">
                        Cole a cifra com acordes e letra da música.
                      </p>
                      <ul className="text-xs text-[#8B6F47] space-y-1 ml-4">
                        <li>• Mais rápido e preciso</li>
                        <li>• Analisa seção por seção (Intro, Verso, Refrão)</li>
                        <li>• Identifica progressões harmônicas</li>
                      </ul>
                    </div>

                    <div className="bg-[#F5F1E8] rounded-lg p-4 border-l-4 border-[#8B6F47]">
                      <div className="flex items-center gap-2 mb-2">
                        <Upload className="w-5 h-5 text-[#8B6F47]" />
                        <h5 className="font-bold text-[#8B6F47]">3. Link do YouTube</h5>
                      </div>
                      <p className="text-sm text-[#A68A64] mb-2">
                        Cole o link de uma música no YouTube.
                      </p>
                      <ul className="text-xs text-[#8B6F47] space-y-1 ml-4">
                        <li>• Sistema baixa e analisa o áudio</li>
                        <li>• Extrai metadados (título, artista)</li>
                        <li>• Análise completa automática</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3">O que a Análise Identifica:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#D4C5B0]">
                      <Award className="w-5 h-5 text-[#D4AF37]" />
                      <span className="text-sm text-[#8B6F47]">Progressões harmônicas por seção</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#D4C5B0]">
                      <Music2 className="w-5 h-5 text-[#9CAF88]" />
                      <span className="text-sm text-[#8B6F47]">Tonalidade (Tom) principal</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#D4C5B0]">
                      <Music4 className="w-5 h-5 text-[#D4AF37]" />
                      <span className="text-sm text-[#8B6F47]">Ritmo característico</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#D4C5B0]">
                      <TrendingUp className="w-5 h-5 text-[#9CAF88]" />
                      <span className="text-sm text-[#8B6F47]">Progressão predominante</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#9CAF88]/10 rounded-xl p-4 border border-[#9CAF88]/30">
                  <p className="text-sm text-[#8B6F47]">
                    <strong>⚡ Recomendação:</strong> Use a opção de cifra sempre que possível. 
                    É mais precisa e rápida que a análise de áudio, permitindo identificação perfeita das progressões.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* BIBLIOTECA */}
            <Card id="library" className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Library className="w-6 h-6" />
                  Biblioteca Sertaneja
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-[#A68A64]">
                  A Biblioteca é onde você visualiza, organiza e gerencia todas as músicas do repertório. 
                  Cada música tem informações detalhadas e ferramentas de análise.
                </p>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3">Recursos da Biblioteca:</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                      <Search className="w-5 h-5 text-[#8B6F47] mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#8B6F47] mb-1">Busca e Filtros</h5>
                        <p className="text-sm text-[#A68A64]">
                          Busque por título ou artista. Filtre por estilo (Raiz, Universitário, Modão), 
                          ritmo (Guarânia, Vanera) ou progressão harmônica específica.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                      <Guitar className="w-5 h-5 text-[#9CAF88] mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#8B6F47] mb-1">Visualização de Músicas</h5>
                        <p className="text-sm text-[#A68A64]">
                          Clique em qualquer música para abrir a visualização completa com cifra interativa, 
                          progressões, análise harmônica, transposição de tom e muito mais.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                      <Play className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#8B6F47] mb-1">Modo de Palco</h5>
                        <p className="text-sm text-[#A68A64]">
                          Clique no ícone de violão 🎸 ao lado do título da música para abrir o Modo de Palco - 
                          ideal para apresentações ao vivo com auto-scroll e temas visuais.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3">Ao Abrir uma Música:</h4>
                  
                  <div className="bg-white rounded-lg border-2 border-[#D4C5B0] overflow-hidden">
                    <div className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white px-4 py-2">
                      <p className="font-bold">Abas Disponíveis:</p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-[#8B6F47]">Cifra</Badge>
                        <p className="text-sm text-[#A68A64]">
                          Letra com acordes clicáveis - clique em qualquer acorde para ver o diagrama
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-[#8B6F47]">Progressões</Badge>
                        <p className="text-sm text-[#A68A64]">
                          Análise seção por seção com identificação de progressões conhecidas
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-[#8B6F47]">Análise Visual</Badge>
                        <p className="text-sm text-[#A68A64]">
                          Gráficos de fluxo, mapa de calor e diagrama de funções harmônicas
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-[#D4AF37]">Teoria Musical</Badge>
                        <p className="text-sm text-[#A68A64]">
                          Análise teórica profunda com exportação para PDF
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-[#8B6F47]">Notas</Badge>
                        <p className="text-sm text-[#A68A64]">
                          Anotações pessoais sobre a música
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3">Ferramentas Úteis:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#D4C5B0]">
                      <RefreshCw className="w-5 h-5 text-[#9CAF88]" />
                      <span className="text-sm text-[#8B6F47]">Transposição de Tom</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#D4C5B0]">
                      <Printer className="w-5 h-5 text-[#8B6F47]" />
                      <span className="text-sm text-[#8B6F47]">Impressão de Cifra</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#D4C5B0]">
                      <Share2 className="w-5 h-5 text-[#D4AF37]" />
                      <span className="text-sm text-[#8B6F47]">Compartilhamento</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#D4C5B0]">
                      <Edit className="w-5 h-5 text-[#9CAF88]" />
                      <span className="text-sm text-[#8B6F47]">Edição de Dados</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PROGRESSÕES */}
            <Card id="progressions" className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Waves className="w-6 h-6" />
                  Progressões Harmônicas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-[#A68A64]">
                  As progressões harmônicas são sequências de acordes que formam a base harmônica das músicas. 
                  O sistema identifica e cataloga progressões comuns na música sertaneja.
                </p>

                <div className="bg-[#D4AF37]/10 rounded-xl p-4 border border-[#D4AF37]/30">
                  <h4 className="font-bold text-[#8B6F47] mb-2">Exemplos de Progressões Clássicas:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Award className="w-4 h-4 text-[#D4AF37] mt-0.5" />
                      <span className="text-[#8B6F47]">
                        <strong>Progressão Terra (I-IV-V-I):</strong> Ex: C-F-G-C - Base do sertanejo raiz
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Award className="w-4 h-4 text-[#D4AF37] mt-0.5" />
                      <span className="text-[#8B6F47]">
                        <strong>Progressão Pop (I-V-vi-IV):</strong> Ex: C-G-Am-F - Comum no universitário
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Award className="w-4 h-4 text-[#D4AF37] mt-0.5" />
                      <span className="text-[#8B6F47]">
                        <strong>Progressão Romântica (I-vi-IV-V):</strong> Ex: C-Am-F-G - Músicas românticas
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3">Funcionalidades:</h4>
                  <ul className="space-y-2 text-sm text-[#8B6F47]">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span>Ver todas as progressões cadastradas no banco</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span>Adicionar novas progressões com padrões e variações</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span>Buscar músicas que usam uma progressão específica</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span>Sistema aprende com correções manuais</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[#9CAF88]/10 rounded-xl p-4 border border-[#9CAF88]/30">
                  <p className="text-sm text-[#8B6F47]">
                    <strong>💡 Progressão Predominante:</strong> O sistema calcula automaticamente qual progressão 
                    aparece mais vezes em cada música, dando peso maior para refrões e versos.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ACORDES */}
            <Card id="chords" className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Guitar className="w-6 h-6" />
                  Biblioteca de Acordes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-[#A68A64]">
                  Catálogo completo de acordes para violão e viola caipira com diagramas visuais, 
                  dedilhados e informações técnicas.
                </p>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3">Recursos:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                      <Guitar className="w-5 h-5 text-[#8B6F47] mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#8B6F47] mb-1">Diagramas Visuais</h5>
                        <p className="text-sm text-[#A68A64]">
                          Visualize diagramas de trastes com dedilhados, pestanas e posições alternativas. 
                          Suporte para violão (6 cordas) e viola caipira (10 cordas em pares - Cebolão em Mi).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                      <Piano className="w-5 h-5 text-[#9CAF88] mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#8B6F47] mb-1">Editor Interativo</h5>
                        <p className="text-sm text-[#A68A64]">
                          Crie e edite acordes visualmente clicando no braço do instrumento. 
                          Perfeito para adicionar variações personalizadas.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                      <Target className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#8B6F47] mb-1">Cifras Clicáveis</h5>
                        <p className="text-sm text-[#A68A64]">
                          <strong>NOVO em v5.0:</strong> Clique em qualquer acorde dentro da cifra de uma música 
                          e veja instantaneamente o diagrama do acorde da biblioteca!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border-2 border-[#D4C5B0] p-4">
                  <h4 className="font-bold text-[#8B6F47] mb-2">Categorias de Acordes:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-[#9CAF88]">Maiores</Badge>
                    <Badge className="bg-[#8B6F47]">Menores</Badge>
                    <Badge className="bg-[#D4AF37]">Sétima</Badge>
                    <Badge className="bg-[#A68A64]">Maior com Sétima</Badge>
                    <Badge variant="outline">Diminutos</Badge>
                    <Badge variant="outline">Aumentados</Badge>
                    <Badge variant="outline">Sus</Badge>
                    <Badge variant="outline">Outros</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RITMOS */}
            <Card id="rhythms" className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Music4 className="w-6 h-6" />
                  Ritmos Musicais
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-[#A68A64]">
                  Catálogo de ritmos típicos da música sertaneja e caipira com diagramas de batida, 
                  compassos e exemplos de músicas.
                </p>

                <div className="bg-[#D4AF37]/10 rounded-xl p-4 border border-[#D4AF37]/30">
                  <h4 className="font-bold text-[#8B6F47] mb-2">Ritmos Principais:</h4>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="text-sm text-[#8B6F47]">• Guarânia (3/4)</div>
                    <div className="text-sm text-[#8B6F47]">• Vanera (2/4)</div>
                    <div className="text-sm text-[#8B6F47]">• Rancheira (4/4)</div>
                    <div className="text-sm text-[#8B6F47]">• Corta Jaca (2/4)</div>
                    <div className="text-sm text-[#8B6F47]">• Chamamé</div>
                    <div className="text-sm text-[#8B6F47]">• Toada</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3">Informações de Cada Ritmo:</h4>
                  <ul className="space-y-2 text-sm text-[#8B6F47]">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span>Compasso (2/4, 3/4, 4/4)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span>Diagrama de batida visual (↓ ↑ ✕ para baixo, cima, abafado)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span>Exemplos de músicas que usam o ritmo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-[#9CAF88]" />
                      <span>Músicas da biblioteca associadas automaticamente</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* PLANOS DE ESTUDO */}
            <Card id="study-plans" className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-6 h-6" />
                  Planos de Estudo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-[#A68A64]">
                  Organize sua rotina de estudos com planos semanais personalizados, 
                  combinando teoria, técnica e repertório.
                </p>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3">Como Criar um Plano:</h4>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        1
                      </div>
                      <div>
                        <p className="text-sm text-[#8B6F47]">
                          Defina o período (semana de estudo) e dê um nome ao plano
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        2
                      </div>
                      <div>
                        <p className="text-sm text-[#8B6F47]">
                          Adicione tópicos de teoria (escalas, campo harmônico, intervalos)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        3
                      </div>
                      <div>
                        <p className="text-sm text-[#8B6F47]">
                          Inclua exercícios técnicos (palhetada, dedilhado, velocidade)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        4
                      </div>
                      <div>
                        <p className="text-sm text-[#8B6F47]">
                          Selecione músicas do repertório para estudar
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        5
                      </div>
                      <div>
                        <p className="text-sm text-[#8B6F47]">
                          Distribua as atividades pelos dias da semana
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#9CAF88]/10 rounded-xl p-4 border border-[#9CAF88]/30">
                  <h4 className="font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-[#9CAF88]" />
                    Geração Automática com IA
                  </h4>
                  <p className="text-sm text-[#A68A64]">
                    Use o botão "Gerar com IA" para criar planos de estudo personalizados automaticamente, 
                    baseados no seu histórico e objetivos. A IA sugere exercícios e músicas adequadas ao seu nível.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* TEORIA MUSICAL */}
            <Card id="theory" className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-6 h-6" />
                  Teoria Musical
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-[#A68A64]">
                  Ferramentas educacionais para aprender teoria musical na prática, 
                  integrando conceitos teóricos com o repertório real da orquestra.
                </p>

                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3">Recursos Disponíveis:</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                      <Piano className="w-5 h-5 text-[#8B6F47] mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#8B6F47] mb-1">Formação de Acordes</h5>
                        <p className="text-sm text-[#A68A64]">
                          Aprenda como os acordes são construídos com intervalos. 
                          Visualize no piano e veja inversões e voicings comuns.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                      <GitBranch className="w-5 h-5 text-[#9CAF88] mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#8B6F47] mb-1">Explorador Harmônico</h5>
                        <p className="text-sm text-[#A68A64]">
                          Explore campos harmônicos de diferentes tonalidades. 
                          Veja acordes diatônicos, dominantes secundários e empréstimo modal.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                      <BookOpen className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#8B6F47] mb-1">Dicionário Musical</h5>
                        <p className="text-sm text-[#A68A64]">
                          Mais de 100 termos musicais explicados com exemplos práticos, 
                          pronúncia e termos relacionados. Sistema de favoritos e busca.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                      <Target className="w-5 h-5 text-[#9CAF88] mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#8B6F47] mb-1">Exercícios Interativos</h5>
                        <p className="text-sm text-[#A68A64]">
                          Pratique identificação de intervalos, acordes, progressões e escalas. 
                          Sistema de pontuação e dificuldade progressiva.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#D4AF37]/10 rounded-xl p-4 border border-[#D4AF37]/30">
                  <p className="text-sm text-[#8B6F47]">
                    <strong>💡 Aprenda Praticando:</strong> Todos os conceitos teóricos estão conectados 
                    com exemplos reais do repertório. Ao estudar uma música, você aprende teoria aplicada!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* RECURSOS AVANÇADOS */}
            <Card id="advanced" className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  Recursos Avançados
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#9CAF88]/20 rounded-xl p-4 border-2 border-[#D4AF37]">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                      <h4 className="font-bold text-[#8B6F47]">Análise de Similaridade</h4>
                    </div>
                    <p className="text-sm text-[#A68A64] mb-2">
                      Encontre músicas similares baseado em progressões harmônicas, ritmo, tonalidade e estrutura. 
                      Útil para criar setlists coesos ou encontrar músicas de dificuldade similar.
                    </p>
                    <Badge className="bg-[#D4AF37] text-white">Na Biblioteca</Badge>
                  </div>

                  <div className="bg-gradient-to-r from-[#8B6F47]/20 to-[#A68A64]/20 rounded-xl p-4 border-2 border-[#8B6F47]">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5 text-[#8B6F47]" />
                      <h4 className="font-bold text-[#8B6F47]">Treinamento da IA</h4>
                    </div>
                    <p className="text-sm text-[#A68A64] mb-2">
                      Configure preferências de análise, adicione artistas e progressões de referência. 
                      O sistema aprende com suas correções e melhora as análises futuras.
                    </p>
                    <Badge className="bg-[#8B6F47] text-white">Na Biblioteca</Badge>
                  </div>

                  <div className="bg-gradient-to-r from-[#9CAF88]/20 to-[#D4AF37]/20 rounded-xl p-4 border-2 border-[#9CAF88]">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5 text-[#9CAF88]" />
                      <h4 className="font-bold text-[#8B6F47]">Recomendações Personalizadas</h4>
                    </div>
                    <p className="text-sm text-[#A68A64] mb-2">
                      Receba sugestões de músicas, progressões e estudos baseadas no seu histórico de análises. 
                      Sistema aprende seus estilos e preferências favoritos.
                    </p>
                    <Badge className="bg-[#9CAF88] text-white">Na Biblioteca</Badge>
                  </div>

                  <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 border-2 border-purple-400">
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="w-5 h-5 text-purple-600" />
                      <h4 className="font-bold text-[#8B6F47]">Modo de Palco</h4>
                    </div>
                    <p className="text-sm text-[#A68A64] mb-2">
                      Visualização otimizada para apresentações ao vivo com auto-scroll ajustável, 
                      temas visuais, controle por teclado e modo fullscreen. Ideal para tocar no palco!
                    </p>
                    <Badge className="bg-purple-500 text-white">Clique no 🎸 ao lado da música</Badge>
                  </div>

                  <div className="bg-white rounded-xl p-4 border-2 border-[#D4C5B0]">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="w-5 h-5 text-[#8B6F47]" />
                      <h4 className="font-bold text-[#8B6F47]">Metrônomo</h4>
                    </div>
                    <p className="text-sm text-[#A68A64] mb-2">
                      Metrônomo integrado com configuração de BPM, compassos (2/4, 3/4, 4/4) e subdivisões. 
                      Essencial para praticar músicas no tempo correto.
                    </p>
                    <Badge variant="outline" className="text-[#8B6F47] border-[#8B6F47]">No Menu Principal</Badge>
                  </div>

                  <div className="bg-white rounded-xl p-4 border-2 border-[#D4C5B0]">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-[#8B6F47]" />
                      <h4 className="font-bold text-[#8B6F47]">Relatórios e Estatísticas</h4>
                    </div>
                    <p className="text-sm text-[#A68A64] mb-2">
                      Visualize estatísticas do repertório: progressões mais usadas, tons predominantes, 
                      ritmos favoritos, distribuição por estilo e muito mais.
                    </p>
                    <Badge variant="outline" className="text-[#8B6F47] border-[#8B6F47]">No Menu Principal</Badge>
                  </div>

                  <div className="bg-white rounded-xl p-4 border-2 border-[#D4C5B0]">
                    <div className="flex items-center gap-2 mb-2">
                      <ListMusic className="w-5 h-5 text-[#8B6F47]" />
                      <h4 className="font-bold text-[#8B6F47]">Repertórios (Setlists)</h4>
                    </div>
                    <p className="text-sm text-[#A68A64] mb-2">
                      Organize setlists para apresentações com ordem de músicas, notas de performance, 
                      transições e visualização de palco integrada.
                    </p>
                    <Badge variant="outline" className="text-[#8B6F47] border-[#8B6F47]">No Menu Principal</Badge>
                  </div>

                  <div className="bg-white rounded-xl p-4 border-2 border-[#D4C5B0]">
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="w-5 h-5 text-[#8B6F47]" />
                      <h4 className="font-bold text-[#8B6F47]">Backup e Exportação</h4>
                    </div>
                    <p className="text-sm text-[#A68A64] mb-2">
                      Exporte todo o banco de dados (músicas, acordes, ritmos) em formato JSON. 
                      Faça backups regulares para segurança dos dados.
                    </p>
                    <Badge variant="outline" className="text-[#8B6F47] border-[#8B6F47]">No Menu Principal</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DICAS FINAIS */}
            <Card className="border-[#D4C5B0] bg-gradient-to-br from-[#D4AF37]/10 to-[#9CAF88]/10">
              <CardHeader>
                <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                  <Lightbulb className="w-6 h-6 text-[#D4AF37]" />
                  Dicas para Aproveitar ao Máximo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-white">
                    1
                  </div>
                  <p className="text-sm text-[#8B6F47] flex-1">
                    <strong>Use cifras sempre que possível:</strong> A análise via cifra é mais precisa e rápida 
                    que análise de áudio, permitindo identificação perfeita das progressões.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#9CAF88] rounded-full flex items-center justify-center text-white">
                    2
                  </div>
                  <p className="text-sm text-[#8B6F47] flex-1">
                    <strong>Corrija e treine a IA:</strong> Se uma progressão for identificada incorretamente, 
                    corrija manualmente. O sistema aprende com suas correções!
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#8B6F47] rounded-full flex items-center justify-center text-white">
                    3
                  </div>
                  <p className="text-sm text-[#8B6F47] flex-1">
                    <strong>Compartilhe com a orquestra:</strong> Use os recursos de impressão e compartilhamento 
                    para distribuir cifras e análises com outros músicos.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center text-white">
                    4
                  </div>
                  <p className="text-sm text-[#8B6F47] flex-1">
                    <strong>Explore a teoria musical:</strong> Use as ferramentas de teoria para entender 
                    POR QUE as progressões funcionam, não apenas identificá-las.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#9CAF88] rounded-full flex items-center justify-center text-white">
                    5
                  </div>
                  <p className="text-sm text-[#8B6F47] flex-1">
                    <strong>Faça backups regulares:</strong> Exporte o banco de dados mensalmente 
                    para garantir que seu trabalho esteja seguro.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* RODAPÉ */}
            <div className="text-center py-6 border-t-2 border-[#D4C5B0]">
              <p className="text-[#A68A64] mb-2">
                Sistema desenvolvido especialmente para a <strong className="text-[#8B6F47]">Orquestra Tropeiros do Bebedouro</strong>
              </p>
              <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white">
                Versão 5.0 - Dezembro 2025
              </Badge>
              <p className="text-xs text-[#A68A64] mt-4">
                🎸 Análise Harmônica • Gestão de Repertório • Teoria Musical
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}