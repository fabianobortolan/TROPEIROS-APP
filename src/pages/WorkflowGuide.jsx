import React, { useState } from "react";
import { 
  BookOpen, Music, Library, Upload, Waves, ListMusic, Timer, 
  Guitar, Piano, GitBranch, GraduationCap, Target, BarChart3,
  Download, FileText, ChevronDown, ChevronRight, Star, Mic,
  Settings, Search, Filter, ZoomIn, WrapText, Palette, Music2,
  RefreshCw, Brain, Lightbulb, Sparkles, TrendingUp, Award,
  Key, Play, Pause, Volume2, SkipForward, SkipBack, Maximize,
  Moon, Sun, Type, AlignLeft, BookMarked, PenLine, Tag, Hash,
  Layers, Clock, User, LogOut, Menu, Bell, Eye, Edit, Trash2,
  Plus, Check, X, ArrowRight, Info, AlertTriangle, HelpCircle, Printer,
  Ear, Zap, LayoutDashboard, Globe
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const sections = [
  {
    id: "visao-geral",
    icon: BookOpen,
    title: "Visão Geral do Sistema",
    color: "from-[#8B6F47] to-[#A68A64]",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    content: [
      {
        subtitle: "O que é o Tropeiros do Bebedouro?",
        text: "O Tropeiros do Bebedouro – Progressões Harmônicas v5.0 é um sistema completo de análise musical sertaneja com inteligência artificial. Foi desenvolvido para músicos, estudantes e entusiastas que desejam compreender, catalogar, praticar e se aprofundar no repertório sertanejo com profundidade técnica e ferramentas inteligentes.",
        items: []
      },
      {
        subtitle: "Módulos do Sistema",
        text: "O sistema é dividido em módulos acessíveis pelo menu lateral (sidebar). Cada módulo tem uma função específica:",
        items: [
          "👤 Meu Perfil – Dados pessoais, acordes favoritos e configurações de usuário",
          "🎙️ Analisar Música – Entrada e análise de músicas via áudio ou cifra, com IA",
          "🎧 Ditado Harmônico – Treino auditivo para identificar progressões harmônicas",
          "📚 Biblioteca – Acervo completo de músicas catalogadas com filtros avançados",
          "📋 Repertórios – Criação e gerenciamento de setlists para shows e ensaios",
          "⏱️ Metrônomo – Ferramenta de tempo com configuração de BPM e tap tempo",
          "🌊 Progressões – Banco de dados de progressões harmônicas reconhecidas",
          "🎼 Escalas – Visualização e estudo de escalas musicais",
          "🎓 Teoria Musical – Submódulos educativos completos (Formação de Acordes, Explorador Harmônico, Dicionário, Exercícios, Referências)",
          "🎵 Ritmos – Biblioteca de ritmos sertanejos com diagramas visuais",
          "🎨 Estilos – Catálogo de estilos musicais sertanejos com características",
          "🎸 Acordes – Dicionário visual de acordes para violão e viola caipira",
          "📊 Relatórios – Análises estatísticas e gráficas do seu repertório",
          "💾 Backup – Exportação e importação de dados em JSON",
          "📄 Documentação PDF – Referência técnica do sistema",
          "📖 Guia de Uso – Este documento (você está aqui!)",
          "📝 Template de Cifra – Modelo padrão para formatação de cifras",
          "🔒 Política de Privacidade – Termos de uso e proteção de dados"
        ]
      },
      {
        subtitle: "Navegação pelo Sistema",
        text: "A navegação é feita pelo sidebar (menu lateral esquerdo). Em dispositivos móveis, clique no ícone de menu (☰) no canto superior esquerdo para abrir o menu. Alguns itens possuem submenus expansíveis (como 'Analisar Música' e 'Teoria Musical'). Clique em qualquer item para acessar a página correspondente. O sistema recarrega ao navegar para garantir dados sempre atualizados.",
        items: []
      },
      {
        subtitle: "Filosofia do Sistema",
        text: "O sistema foi projetado para crescer junto com o músico. Ele aprende com as correções manuais, acumula conhecimento sobre o repertório e oferece ferramentas de análise cada vez mais precisas. Quanto mais você usa e corrige, mais inteligente ele fica.",
        items: [
          "A IA usa os LearningPatterns (padrões aprendidos) para identificar progressões",
          "Cada correção manual aumenta a precisão futura",
          "O índice de confiança (0-100%) de cada padrão é atualizado automaticamente",
          "O sistema prioriza padrões com maior confiança na análise automática"
        ]
      }
    ]
  },
  {
    id: "perfil",
    icon: User,
    title: "Meu Perfil",
    color: "from-blue-500 to-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    content: [
      {
        subtitle: "Informações do Perfil",
        text: "A página de perfil exibe seus dados cadastrados no sistema: nome completo, e-mail e função (admin/user). Esses dados são gerenciados pela plataforma e não podem ser alterados diretamente.",
        items: [
          "Nome Completo – Exibido no cabeçalho do perfil",
          "E-mail – Identificador único do usuário no sistema",
          "Função – Admin tem acesso total ao sistema; User tem acesso limitado",
          "Data de Cadastro – Quando o usuário foi registrado"
        ]
      },
      {
        subtitle: "Acordes Favoritos",
        text: "O sistema permite favoritar acordes por instrumento. Os favoritos aparecem sempre na primeira posição quando você clica em um acorde na cifra.",
        items: [
          "Abra qualquer música com cifra na Biblioteca",
          "Clique sobre um acorde sublinhado na cifra interativa",
          "No popover que abrir, clique no ícone ⭐ para favoritar",
          "O acorde ficará sempre na primeira posição quando clicado novamente",
          "Favoritos são separados por instrumento: 🎸 Violão e 🎻 Viola",
          "Para desfavoritar, clique novamente no ⭐ – ele ficará preenchido quando favoritado"
        ]
      },
      {
        subtitle: "Sair do Sistema",
        text: "No rodapé do menu lateral há o botão 'Sair do Sistema' (vermelho com ícone de saída). Ao clicar, você será desconectado e redirecionado para a tela de login. Todos os dados são salvos na nuvem, então nada se perde ao sair.",
        items: []
      }
    ]
  },
  {
    id: "analisar",
    icon: Upload,
    title: "Analisar Música",
    color: "from-green-500 to-emerald-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    content: [
      {
        subtitle: "Formas de Entrada",
        text: "Existem duas formas de inserir uma música para análise harmônica:",
        items: [
          "🎵 Via Áudio – Faça upload de um arquivo de áudio (MP3, WAV, M4A, etc.) para análise automática com IA. A IA tenta identificar os acordes e progressões a partir do áudio",
          "📝 Via Cifra – Cole o texto completo da cifra no campo dedicado. A IA analisa a cifra e identifica os padrões harmônicos por seção automaticamente"
        ]
      },
      {
        subtitle: "Campos Disponíveis",
        text: "Ao analisar uma música, os seguintes campos estão disponíveis para preenchimento:",
        items: [
          "Título* – Nome da música (obrigatório)",
          "Artista* – Nome do artista ou dupla (obrigatório)",
          "Tom Principal – Tonalidade atual da música (ex: G, A, D). Pode diferir do original por causa de transposições",
          "Tom Original – Tonalidade original antes de quaisquer transposições",
          "Ritmo – Selecionar da biblioteca de ritmos cadastrados (Guarânia, Vanera, Rancheira, etc.)",
          "Estilo Musical – Sertanejo Raiz, Universitário, Romântico, Moderno, Modão ou Outro",
          "BPM – Velocidade em batidas por minuto",
          "Duração – Tempo total da música (ex: 3:45)",
          "Cifra – Texto completo com acordes e letra no formato padrão",
          "URL do Áudio – Link para arquivo de áudio (MP3, WAV, etc.) hospedado externamente",
          "URL do Playback – Link para base instrumental/playback para tocar junto",
          "URL do Solo (PDF) – Link para PDF com tablatura ou partitura do solo da música"
        ]
      },
      {
        subtitle: "Análise Harmônica por Seção",
        text: "Após inserir a cifra, o sistema permite identificar progressões por seção musical individualmente. Isso é fundamental para análises precisas:",
        items: [
          "Clique em '+ Nova Seção' para adicionar uma seção",
          "Nomeie a seção: Intro, Verso, Pré-Refrão, Refrão, Ponte, Solo, Outro",
          "Insira a sequência de acordes da seção (ex: G D Em C)",
          "O sistema identificará automaticamente o padrão em algarismos romanos (I-V-vi-IV)",
          "Selecione o nome da progressão identificada do banco de dados",
          "Informe a tonalidade da seção (pode diferir do tom principal em casos de modulação)",
          "Registre o 'Tom Modulado' se a seção está temporariamente em outro tom",
          "Adicione observações específicas para cada seção (notas técnicas, variações)",
          "Registre a variação específica identificada (ex: 'com passagem cromática')",
          "O timestamp indica em que momento da música essa seção aparece"
        ]
      },
      {
        subtitle: "Análise Automática com Inteligência Artificial",
        text: "O botão 'Analisar com IA' envia a cifra para processamento automático. A IA realiza uma análise completa e retorna resultados estruturados:",
        items: [
          "Identifica automaticamente as seções da música com seus nomes",
          "Reconhece os acordes em cada seção",
          "Mapeia os padrões de progressão harmônica em algarismos romanos",
          "Compara com o banco de progressões e sugere nomes correspondentes",
          "Identifica a tonalidade principal da música",
          "Detecta possíveis modulações entre seções",
          "Gera observações técnicas sobre cada seção",
          "Calcula e sugere a progressão predominante com base nos pesos das seções"
        ]
      },
      {
        subtitle: "Progressão Predominante",
        text: "Após a análise, o sistema calcula a progressão predominante da música usando um sistema de pesos por seção:",
        items: [
          "Refrão = peso 3 (a seção mais importante harmonicamente)",
          "Verso = peso 2",
          "Ponte = peso 1.5",
          "Pré-Refrão = peso 1.5",
          "Intro = peso 1",
          "Solo = peso 1",
          "Outros = peso 1",
          "A progressão que aparece com maior peso acumulado torna-se a 'predominante'",
          "Você pode também usar o botão 'Recalcular' na Biblioteca para atualizar todas as músicas de uma vez"
        ]
      },
      {
        subtitle: "Salvando a Análise",
        text: "Após preencher todos os dados e revisar a análise harmônica, clique em 'Salvar Música'. A música será adicionada à Biblioteca e ficará disponível para consulta, Modo Palco, Ditado Harmônico, Setlists e Relatórios.",
        items: []
      }
    ]
  },
  {
    id: "ditado-harmonico",
    icon: Ear,
    title: "Ditado Harmônico",
    color: "from-purple-500 to-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    content: [
      {
        subtitle: "O que é o Ditado Harmônico?",
        text: "O Ditado Harmônico é um módulo de treino auditivo gamificado. O sistema toca o áudio ou playback de músicas do seu repertório e você deve identificar qual é a progressão harmônica predominante, escolhendo entre 4 opções. É uma das ferramentas mais importantes para desenvolver o ouvido musical.",
        items: []
      },
      {
        subtitle: "Como Funciona",
        text: "O jogo funciona em rodadas de 10 músicas:",
        items: [
          "O sistema seleciona aleatoriamente 10 músicas do seu acervo",
          "Para cada música, você ouve o áudio ou playback disponível",
          "4 opções de progressão são apresentadas: 1 correta + 3 distratoras plausíveis",
          "Escolha a opção que você acredita ser a progressão correta",
          "O sistema revela se você acertou ou errou, mostrando a resposta correta",
          "Ao final das 10 músicas, veja seu placar e porcentagem de acerto",
          "Receba uma medalha baseada no seu desempenho: Ouro (≥90%), Prata (≥70%), Bronze (≥50%)"
        ]
      },
      {
        subtitle: "Fontes de Áudio Aceitas",
        text: "O Ditado Harmônico aceita tanto o áudio principal quanto o playback das músicas:",
        items: [
          "🎵 Áudio Principal – Arquivo de áudio da música completa (voz + instrumentos)",
          "🎸 Playback – Base instrumental para tocar junto (sem voz). Badge 'Playback' é exibido quando esta fonte é usada",
          "Músicas sem nenhum áudio cadastrado não aparecem no ditado",
          "Certifique-se de cadastrar a URL do áudio ou do playback nas músicas para que elas apareçam aqui"
        ]
      },
      {
        subtitle: "Níveis de Dificuldade",
        text: "Escolha o nível de dificuldade antes de iniciar a rodada:",
        items: [
          "🟢 Fácil – Ouça o áudio sem limite de tempo, até 5 plays por música. Ideal para iniciantes no treinamento auditivo",
          "🟡 Médio – 30 segundos por play, até 3 plays por música. Bom para nível intermediário",
          "🔴 Difícil – Apenas 15 segundos por play, máximo 2 plays por música. Desafio para ouvidos treinados",
          "O limite de plays é bloqueado automaticamente após atingido (até que você responda)",
          "Ao responder, você pode ouvir a música novamente livremente"
        ]
      },
      {
        subtitle: "Dicas (Hints) durante o Jogo",
        text: "Se estiver com dificuldade, você pode pedir uma dica antes de responder:",
        items: [
          "Clique em 'Ver dica (tom e estilo)' abaixo do player",
          "A dica revela: Tom da música, Estilo musical (Sertanejo Raiz, Universitário, etc.) e Ritmo",
          "Usar a dica não penaliza a pontuação, mas tente evitar para treinar melhor o ouvido",
          "Após responder, a dica some e a próxima música começa sem dicas visíveis"
        ]
      },
      {
        subtitle: "Pular Músicas",
        text: "Se não reconhecer a música ou quiser pular:",
        items: [
          "Clique em 'Pular esta música' abaixo do card",
          "A música é descartada sem penalidade de pontuação",
          "O contador avança para a próxima música",
          "Músicas puladas não contam como erros"
        ]
      },
      {
        subtitle: "Pontuação e Resultados",
        text: "Ao final de cada rodada, a tela de resultados exibe:",
        items: [
          "Número de respostas corretas",
          "Número de respostas erradas",
          "Porcentagem de acerto",
          "Medalha conquistada: 🏆 Ouro (≥90%), 🥈 Prata (≥70%), 🥉 Bronze (≥50%), ou mensagem de incentivo",
          "Dificuldade usada na rodada",
          "Botões para jogar novamente com as mesmas configurações ou alterar a dificuldade"
        ]
      },
      {
        subtitle: "Como Aproveitar ao Máximo",
        text: "Dicas para extrair o máximo do Ditado Harmônico:",
        items: [
          "Comece no nível Fácil até acertar consistentemente acima de 80%",
          "Suba para Médio quando estiver confortável no Fácil",
          "Pratique regularmente – o ouvido melhora com repetição",
          "Preste atenção especial às músicas que você errar – revise-as na Biblioteca",
          "Quanto mais músicas com áudio/playback cadastradas, mais variado e desafiador fica o treino",
          "Use junto com o Explorador Harmônico para entender as progressões que errar"
        ]
      }
    ]
  },
  {
    id: "biblioteca",
    icon: Library,
    title: "Biblioteca Sertaneja",
    color: "from-[#8B6F47] to-[#A68A64]",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    content: [
      {
        subtitle: "Visão Geral",
        text: "A Biblioteca é o coração do sistema. Aqui estão todas as músicas catalogadas com suas análises harmônicas completas. O contador no topo mostra o total de músicas cadastradas em tempo real.",
        items: []
      },
      {
        subtitle: "Abas: Biblioteca e Cadernos",
        text: "A página possui duas abas principais:",
        items: [
          "🎵 Biblioteca – Lista de músicas individualmente analisadas e catalogadas",
          "📖 Cadernos – Coleções de cifras em PDF para importação em massa via IA"
        ]
      },
      {
        subtitle: "Barra de Ações",
        text: "No topo há botões de ação para funcionalidades especiais:",
        items: [
          "➕ Adicionar – Navega para 'Analisar Música' para cadastrar uma nova música",
          "📈 Recalcular – Recalcula a progressão predominante de TODAS as músicas usando pesos por seção (Refrão=3, Verso=2, Ponte=1.5, Intro=1). Solicita confirmação antes de executar",
          "✨ Similaridade – Abre o módulo de análise avançada de similaridade harmônica entre músicas",
          "🧠 IA – Abre o painel de treinamento e interação com a inteligência artificial",
          "💡 Dicas – Abre o módulo de recomendações personalizadas baseadas no repertório",
          "🎵 Sugestões – Abre o módulo de sugestões de novas músicas baseadas no acervo",
          "🔍 Progressões Incomuns – Detecta progressões raras ou não catalogadas no repertório"
        ]
      },
      {
        subtitle: "Filtros de Busca",
        text: "Quatro filtros combinados para encontrar músicas rapidamente:",
        items: [
          "🔍 Busca por texto – Filtra por título ou nome do artista em tempo real (não precisa apertar Enter)",
          "🎨 Estilo – Filtra por subgênero: Raiz, Universitário, Romântico, Moderno, Modão, Outro",
          "🎵 Ritmo – Filtra pelo ritmo cadastrado (Guarânia, Vanera, Rancheira, Baião, etc.)",
          "📈 Progressão – Filtra por progressão harmônica predominante ou presente em qualquer seção da música"
        ]
      },
      {
        subtitle: "Card de Música",
        text: "Cada música aparece em um cartão com as seguintes informações e funcionalidades:",
        items: [
          "🎵 Ícone musical dourado (canto superior esquerdo) – Clique para abrir o MODO PALCO diretamente",
          "Título em maiúsculas – Clique para abrir os detalhes completos da música",
          "Nome do artista abaixo do título",
          "Badge de Estilo – Colorido por gênero (🌾 Raiz = âmbar, 🎓 Universitário = azul, 💝 Romântico = rosa, etc.)",
          "Badge de Progressão Predominante – Com ícone e nome da progressão. Passe o mouse para ver o pattern em algarismos romanos e os acordes reais na tonalidade atual",
          "Botão 'Solo PDF' – Aparece somente se a música tiver PDF de solo cadastrado. Abre o PDF em nova aba",
          "Tom – Tonalidade atual da música. Ícone 🔄 indica que há modulação em alguma seção",
          "Ritmo – Destacado com gradiente dourado quando cadastrado, cinza quando ausente",
          "Principais Acordes – Calcula e exibe os acordes reais na tonalidade da música baseados na progressão predominante"
        ]
      },
      {
        subtitle: "Ordenação",
        text: "As músicas são exibidas em ordem alfabética pelo título, usando ordenação correta para o português brasileiro (com tratamento de acentuação e caracteres especiais).",
        items: []
      },
      {
        subtitle: "Sugestões de Músicas (IA)",
        text: "O módulo de Sugestões usa a IA para recomendar novas músicas baseadas no seu repertório atual:",
        items: [
          "Analisa as progressões, ritmos, estilos e artistas mais presentes no seu acervo",
          "Sugere músicas de artistas similares que você ainda não tem cadastradas",
          "Identifica lacunas no repertório (progressões sub-representadas)",
          "Exibe sugestões locais (baseadas em similaridade direta) e sugestões da IA (baseadas em análise contextual)",
          "Clique em uma sugestão para ir direto para a análise pré-preenchida",
          "As sugestões se atualizam automaticamente conforme você adiciona músicas"
        ]
      },
      {
        subtitle: "Detector de Progressões Incomuns (IA)",
        text: "Ferramenta para identificar progressões raras ou não catalogadas no repertório:",
        items: [
          "Varre todas as músicas da biblioteca em busca de progressões não presentes no banco de Progressões",
          "Detecta localmente padrões sem correspondência no banco de dados",
          "A IA analisa as progressões detectadas e sugere nomes, descrições e nível de raridade",
          "Permite adicionar as progressões incomuns diretamente ao banco de Progressões com um clique",
          "Indica se a progressão é: comum não catalogada, incomum ou rara",
          "Exibe o pattern em algarismos romanos e exemplos de onde aparece no repertório"
        ]
      }
    ]
  },
  {
    id: "detalhes-musica",
    icon: Eye,
    title: "Detalhes da Música",
    color: "from-purple-500 to-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    content: [
      {
        subtitle: "Abrindo os Detalhes",
        text: "Clique sobre o título de qualquer música na Biblioteca para abrir o painel de detalhes completo em tela cheia.",
        items: []
      },
      {
        subtitle: "Cabeçalho do Painel",
        text: "O cabeçalho exibe as principais informações da música:",
        items: [
          "Título da música em destaque",
          "Nome do artista",
          "Tom principal (Main Key)",
          "Badge de estilo musical com cor temática",
          "Badge de progressão predominante (clicável para ver detalhes)",
          "Botão 'Modo Palco' – Abre a visualização de palco em tela cheia",
          "Botão 'X' (vermelho) – Fecha o painel e retorna à Biblioteca"
        ]
      },
      {
        subtitle: "Abas de Conteúdo",
        text: "Os detalhes são organizados em 6 abas principais:",
        items: [
          "🎵 Cifra – Exibe a cifra completa com acordes clicáveis, zoom e controle de quebra de linha",
          "📊 Progressões – Lista todas as seções analisadas com seus padrões e acordes",
          "🔊 Áudio – Player de áudio integrado para tocar o arquivo de áudio cadastrado",
          "🎸 Playback – Player para a base/playback instrumental",
          "📝 Notas – Campo livre para anotações manuais e observações sobre a música",
          "✏️ Editar – Formulário completo para edição de todos os dados da música"
        ]
      },
      {
        subtitle: "Cifra Interativa com Acordes Clicáveis",
        text: "Na aba Cifra, cada acorde aparece sublinhado e é clicável. Ao clicar, um popover aparece com:",
        items: [
          "Nome do acorde em destaque grande",
          "Botão ⭐ para favoritar o acorde naquele instrumento (ficará dourado quando favoritado)",
          "Badge 'Favorito' quando o acorde já está nos favoritos",
          "Seletor de instrumento: 🎸 Violão / 🎻 Viola (com contador de posições disponíveis)",
          "Seletor de posição/variação quando há mais de uma disponível (os números mostram o traste inicial)",
          "Diagrama visual do acorde: grade de casas e cordas com números de dedos",
          "X = corda não tocada, O = corda solta, número = traste a apertar",
          "Linha grossa horizontal = pestana (dedo indicador cobrindo todas as cordas)"
        ]
      },
      {
        subtitle: "Controles de Zoom na Cifra",
        text: "Acima da cifra há uma barra de controles para personalizar a visualização:",
        items: [
          "🔍- (Zoom Out) – Diminui o tamanho da fonte em 2px por clique (mínimo 8px)",
          "Indicador numérico mostrando o tamanho atual em pixels",
          "🔍+ (Zoom In) – Aumenta o tamanho da fonte em 2px por clique (máximo 32px)",
          "📄 Quebra de Linha – Ativa/desativa quebra automática de texto. Quando ATIVO: linhas longas são quebradas preservando alinhamento acordes-sílabas (usa CSS pre-wrap). Quando DESATIVO: a cifra mantém formato original com scroll horizontal (usa CSS pre)"
        ]
      },
      {
        subtitle: "Progressões por Seção",
        text: "Na aba Progressões, cada seção da música aparece como um card separado exibindo:",
        items: [
          "Nome da seção (Intro, Verso, Refrão, etc.) com ícone colorido",
          "Sequência de acordes reais da seção (ex: G D Em C)",
          "Padrão em algarismos romanos (I-V-vi-IV)",
          "Nome da progressão identificada (ex: 'Progressão Pop Clássica')",
          "Tonalidade da seção",
          "Tom modulado (quando a seção está temporariamente em outro tom)",
          "Nome da variação específica identificada",
          "Observações e notas técnicas da seção"
        ]
      },
      {
        subtitle: "Editando uma Música",
        text: "Na aba Editar, todos os dados podem ser modificados. O formulário é dividido em seções:",
        items: [
          "Informações Básicas: título, artista, estilo, ritmo, BPM, duração",
          "Tonalidades: tom principal (atual) e tom original",
          "Links Multimídia: URLs de áudio, playback e PDF do solo",
          "Cifra: campo de texto completo para edição da cifra",
          "Progressões por Seção: interface para adicionar, editar e remover seções",
          "Configurações de Palco: tempo de countdown e velocidade de scroll calibrada",
          "Após editar, clique em 'Salvar' para persistir as alterações"
        ]
      },
      {
        subtitle: "Comentários e Anotações na Cifra",
        text: "É possível adicionar comentários e anotações em linhas específicas da cifra para marcar partes importantes:",
        items: [
          "Clique no número de linha ou no ícone de comentário ao lado da linha desejada",
          "Escreva o comentário no campo que aparece ao lado",
          "Escolha uma cor para o marcador: 🟡 amarelo, 🔵 azul, 🟢 verde, 🔴 vermelho, 🟣 roxo",
          "Os comentários ficam visíveis como marcações coloridas na margem da cifra",
          "Passe o mouse sobre a marcação colorida para ler o texto do comentário",
          "Clique no X vermelho para remover um comentário específico",
          "Os comentários são salvos automaticamente com a música"
        ]
      }
    ]
  },
  {
    id: "modo-palco",
    icon: Mic,
    title: "Modo Palco",
    color: "from-gray-800 to-gray-950",
    bgColor: "bg-gray-900",
    borderColor: "border-gray-600",
    content: [
      {
        subtitle: "O que é o Modo Palco?",
        text: "O Modo Palco é uma interface de tela cheia otimizada para uso durante shows e apresentações ao vivo. Exibe a cifra em letras grandes com scroll automático, sem elementos de interface desnecessários, focado 100% na música.",
        items: []
      },
      {
        subtitle: "Como Ativar",
        text: "Há três formas de ativar o Modo Palco:",
        items: [
          "Clique no ícone musical dourado (canto superior esquerdo do card) na Biblioteca",
          "Clique no botão 'Modo Palco' no cabeçalho do painel de detalhes da música",
          "No Setlist, clique em 'Iniciar Show' para ativar o modo palco em sequência"
        ]
      },
      {
        subtitle: "Barra de Controles",
        text: "A barra de controles no topo do Modo Palco oferece:",
        items: [
          "▶ / ⏸ Play/Pause – Inicia ou pausa o scroll automático",
          "⏩ Velocidade – Ajusta a velocidade de rolagem: Lento, Médio, Rápido, Muito Rápido",
          "A- / A+ – Diminui ou aumenta o tamanho do texto da cifra",
          "🎨 Tema – Alterna entre temas visuais: 🌑 Escuro, 🔶 Âmbar, 🟢 Verde, 🔵 Azul, ⚡ Alto Contraste",
          "⛶ Tela Cheia – Ativa o modo fullscreen do navegador (F também ativa/desativa)",
          "🔊 Volume – Controle de volume do áudio se houver playback ativo",
          "🖨️ Imprimir – Abre o diálogo de impressão da cifra formatada",
          "✕ Sair – Fecha o modo palco e retorna à biblioteca"
        ]
      },
      {
        subtitle: "Countdown (Contagem Regressiva)",
        text: "Ao iniciar o Modo Palco, uma contagem regressiva é exibida antes de começar o scroll automático:",
        items: [
          "Tempo padrão: 25 segundos (personalizável por música)",
          "Serve para você iniciar a música antes do scroll começar",
          "O número decresce em tempo real, ocupando boa parte da tela",
          "Para personalizar o tempo: edite a música e ajuste o campo 'Tempo de Início (segundos)' na aba Editar",
          "O countdown pode ser pulado clicando em 'Iniciar agora' ou pressionando Espaço"
        ]
      },
      {
        subtitle: "Velocidade de Scroll Calibrada",
        text: "Para shows profissionais, cada música pode ter sua velocidade de scroll calibrada individualmente:",
        items: [
          "O campo 'Velocidade de Rolagem' na edição da música define o valor base da música",
          "Durante o Modo Palco, os ajustes de velocidade são aplicados em cima do valor base",
          "Para calibrar: toque a música ao vivo, ajuste a velocidade no modo palco até ficar sincronizada com o andamento real, depois salve o valor",
          "Isso garante que quando você iniciar a música novamente, a velocidade já estará calibrada"
        ]
      },
      {
        subtitle: "Temas Visuais",
        text: "Escolha o tema que melhor se adequa ao ambiente do show:",
        items: [
          "🌑 Escuro – Fundo preto, texto branco. Ideal para shows com palco escuro e telão",
          "🔶 Âmbar – Fundo escuro com texto âmbar/dourado. Estética vintage e quente",
          "🟢 Verde – Fundo escuro com texto verde. Referência a terminais clássicos",
          "🔵 Azul – Fundo escuro com texto azul claro. Visual moderno",
          "⚡ Alto Contraste – Fundo preto puro, texto branco brilhante. Para ambientes com muita luz"
        ]
      },
      {
        subtitle: "Atalhos de Teclado",
        text: "Durante o Modo Palco, os seguintes atalhos de teclado estão disponíveis:",
        items: [
          "Espaço – Play/Pause do scroll automático",
          "↑ (seta para cima) – Aumentar velocidade de scroll",
          "↓ (seta para baixo) – Diminuir velocidade de scroll",
          "← (seta para esquerda) – Diminuir tamanho da fonte",
          "→ (seta para direita) – Aumentar tamanho da fonte",
          "F – Alternar modo tela cheia (fullscreen)",
          "T – Alternar para o próximo tema visual",
          "Esc – Sair do modo palco",
          "N – Próxima música (somente no modo Setlist)",
          "P – Música anterior (somente no modo Setlist)"
        ]
      }
    ]
  },
  {
    id: "setlists",
    icon: ListMusic,
    title: "Repertórios (Setlists)",
    color: "from-indigo-500 to-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-300",
    content: [
      {
        subtitle: "O que são Setlists?",
        text: "Setlists são listas ordenadas de músicas para shows, ensaios ou eventos. Permitem organizar o repertório na ordem desejada, adicionar notas do evento e ativar o Modo Palco em sequência durante a apresentação.",
        items: []
      },
      {
        subtitle: "Criando um Setlist",
        text: "Clique em 'Novo Repertório' e preencha os dados do evento:",
        items: [
          "Nome do Setlist (ex: 'Show do Sábado 01/03', 'Ensaio Março 2026')",
          "Descrição opcional do evento",
          "Data do evento (para organização cronológica)",
          "Local do evento (ex: 'Rodeio de Barretos', 'Bar do Zé')",
          "Notas gerais do setlist (observações sobre o show, pedidos especiais, etc.)"
        ]
      },
      {
        subtitle: "Gerenciando Músicas no Setlist",
        text: "Dentro do setlist, você pode organizar as músicas da apresentação:",
        items: [
          "Adicionar músicas da Biblioteca ao setlist com um clique",
          "Reordenar músicas arrastando e soltando (drag and drop) para definir a ordem de apresentação",
          "Remover músicas individualmente sem afetar a Biblioteca",
          "Ver o total de músicas no setlist",
          "Ver a duração estimada total do show (se as músicas tiverem duração cadastrada)",
          "Clicar em uma música para ver seus detalhes sem sair do setlist"
        ]
      },
      {
        subtitle: "Modo Palco do Setlist",
        text: "O Modo Palco do Setlist exibe todas as músicas em sequência, simulando a experiência de um show completo:",
        items: [
          "⏮ Botão 'Anterior' – Volta para a música anterior na lista",
          "⏭ Botão 'Próxima' – Avança para a próxima música da lista",
          "Indicador de posição atual (ex: '3 / 8' = terceira música de oito)",
          "Título e artista da música atual exibidos em destaque",
          "Mesmos controles de tema, zoom, velocidade e tela cheia do modo palco individual",
          "Atalho N = próxima música, P = música anterior (no teclado)",
          "Ao terminar o setlist, exibe mensagem de 'Show concluído'"
        ]
      }
    ]
  },
  {
    id: "metronomo",
    icon: Timer,
    title: "Metrônomo",
    color: "from-orange-500 to-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    content: [
      {
        subtitle: "Funcionalidades do Metrônomo Digital",
        text: "O metrônomo digital integrado oferece tudo que um músico precisa para praticar no tempo correto:",
        items: [
          "🔢 BPM – Ajuste de 40 a 240 BPM com campo numérico editável diretamente ou com botões +/- para incrementos de 1 BPM",
          "👆 Tap Tempo – Toque repetidamente no botão TAP para calcular o BPM automaticamente pela média dos intervalos entre toques",
          "▶ Play/Pause – Inicia ou para o metrônomo com clique único",
          "🎵 Compasso – Selecione o número de tempos por compasso: 2/4, 3/4, 4/4, 6/8",
          "🥁 Acento – O primeiro tempo de cada compasso tem som diferenciado (acento forte), facilitando a percepção do início do compasso",
          "🔊 Volume – Controle de volume do clique do metrônomo",
          "⚡ Presets de BPM – Botões de acesso rápido para BPMs comuns: 60, 80, 100, 120, 140, 160"
        ]
      },
      {
        subtitle: "Como Usar o Tap Tempo",
        text: "O Tap Tempo é ideal quando você conhece a música mas não sabe o BPM exato:",
        items: [
          "Clique no botão 'TAP' repetidamente no ritmo da música (pelo menos 4 toques para boa precisão)",
          "O sistema calcula a média dos intervalos entre toques",
          "O BPM é atualizado automaticamente após cada toque",
          "Aguarde alguns segundos sem tocar para resetar e começar novo cálculo",
          "Dica: bata no tempo da música enquanto a ouve para calibrar o BPM automaticamente"
        ]
      }
    ]
  },
  {
    id: "progressoes",
    icon: Waves,
    title: "Banco de Progressões",
    color: "from-teal-500 to-teal-700",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-300",
    content: [
      {
        subtitle: "O que são as Progressões?",
        text: "O banco de progressões é o cadastro central de padrões harmônicos identificados e nomeados. É a base fundamental do sistema de análise automática. A IA compara os acordes encontrados nas músicas com esses padrões para nomear as progressões.",
        items: []
      },
      {
        subtitle: "Estrutura de uma Progressão",
        text: "Cada progressão no banco possui:",
        items: [
          "Nome descritivo (ex: 'Progressão Terra', 'Sertanejo Clássico', 'Pop Romântico')",
          "Padrão principal em algarismos romanos (ex: I-IV-V-I, I-V-vi-IV)",
          "Variações do padrão (versões alternativas com acordes adicionais ou diferentes)",
          "Tonalidades comuns onde essa progressão aparece (ex: G, D, A para sertanejo)",
          "Tags de gênero musical (sertanejo, forró, pop, gospel, etc.)",
          "Exemplos de músicas famosas que usam esta progressão",
          "Descrição técnica das características harmônicas"
        ]
      },
      {
        subtitle: "Adicionando/Editando Progressões",
        text: "Clique em 'Nova Progressão' para cadastrar uma nova ou no ícone de edição para modificar uma existente:",
        items: [
          "Nome – Título descritivo e memorável da progressão",
          "Padrão Principal – Em algarismos romanos separados por hífen (I-IV-V-I)",
          "Variações – Adicione múltiplas variações com seus próprios padrões e descrições",
          "Descrição – Explicação técnica das características e contexto musical",
          "Tonalidades Comuns – Em quais tons esta progressão é mais encontrada",
          "Tags de Gênero – Para filtrar e categorizar (sertanejo, mpb, gospel, etc.)",
          "Exemplos – Músicas famosas que usam esta progressão (artista + título)"
        ]
      },
      {
        subtitle: "Usando o Detector de Progressões Incomuns",
        text: "Na Biblioteca, o botão '🔍 Progressões Incomuns' ajuda a expandir o banco automaticamente:",
        items: [
          "Varre o repertório em busca de progressões não catalogadas",
          "A IA analisa e sugere nomes para as progressões encontradas",
          "Clique em 'Adicionar ao Banco' para inserir diretamente no banco de progressões",
          "Isso mantém o banco sempre atualizado com novos padrões encontrados no repertório real"
        ]
      }
    ]
  },
  {
    id: "escalas",
    icon: Music2,
    title: "Escalas Musicais",
    color: "from-cyan-500 to-cyan-700",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-300",
    content: [
      {
        subtitle: "Explorador de Escalas",
        text: "A página de escalas permite visualizar e estudar escalas musicais em diferentes tonalidades, com aplicação prática no instrumento:",
        items: [
          "Selecione a tônica (nota raiz): C, C#, D, D#, E, F, F#, G, G#, A, A#, B",
          "Selecione o tipo de escala: Maior, Menor Natural, Menor Harmônica, Menor Melódica, Pentatônica Maior, Pentatônica Menor, Blues, Modos (Dórico, Frígio, Lídio, Mixolídio, Lócrio)",
          "Visualização no braço do violão/viola com posições marcadas em pontos coloridos",
          "Lista das notas da escala em ordem com seus graus",
          "Campo harmônico gerado automaticamente (os 7 acordes da tonalidade)",
          "Indicação dos graus: I (tônica), II (supertônica), III (mediante), IV (subdominante), V (dominante), VI (superdominante/relativa menor), VII (sensível)"
        ]
      },
      {
        subtitle: "Aplicação Prática",
        text: "Como usar o Explorador de Escalas no estudo:",
        items: [
          "Identifique a escala da música que está aprendendo",
          "Visualize quais notas estão disponíveis para improviso",
          "Entenda o campo harmônico para identificar as progressões da música",
          "Use a pentatônica para iniciantes em improviso – são apenas 5 notas mas soam muito bem",
          "A escala de blues adiciona a 'nota blue' (b5) à pentatônica menor para um som mais expressivo"
        ]
      }
    ]
  },
  {
    id: "teoria",
    icon: GraduationCap,
    title: "Teoria Musical",
    color: "from-violet-500 to-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-300",
    content: [
      {
        subtitle: "Formação de Acordes (ChordBuilder)",
        text: "Ferramenta educativa para entender como acordes são construídos a partir de intervalos:",
        items: [
          "Selecione uma nota raiz (tônica do acorde)",
          "Escolha o tipo de acorde: maior, menor, sétima, maj7, m7, dim, aug, sus2, sus4, add9",
          "Veja as notas que compõem o acorde com seus respectivos intervalos",
          "Entenda os intervalos: terça maior (4 semitons), terça menor (3 semitons), quinta justa (7 semitons), sétima menor (10 semitons), etc.",
          "Visualize a posição das notas no braço do instrumento",
          "Compare diferentes tipos de acordes construídos a partir da mesma raiz para entender as diferenças"
        ]
      },
      {
        subtitle: "Explorador Harmônico (HarmonicExplorer)",
        text: "Análise profunda das funções harmônicas de sequências de acordes:",
        items: [
          "Digite uma sequência de acordes para análise (ex: G - D - Em - C)",
          "Informe a tonalidade da sequência",
          "O sistema identifica as funções harmônicas: Tônica (I, III, VI), Subdominante (II, IV), Dominante (V, VII)",
          "Mostra o grau de cada acorde na tonalidade (I, II, III, IV, V, VI, VII)",
          "Identifica progressões e padrões conhecidos no banco de dados",
          "Sugere possíveis continuações da progressão",
          "Exibe visualização gráfica das relações entre os acordes",
          "Indica tensão e resolução harmônica entre os acordes"
        ]
      },
      {
        subtitle: "Dicionário Musical",
        text: "Glossário completo e pesquisável de termos musicais:",
        items: [
          "Busca por nome do termo ou por categoria",
          "Definições detalhadas com exemplos práticos e contexto musical",
          "Categorias: acordes, ritmo, harmonia, melodia, forma musical, dinâmica, técnica",
          "Termos em português e inglês para facilitar o uso de materiais internacionais",
          "Links cruzados entre termos relacionados para navegação por tópico"
        ]
      },
      {
        subtitle: "Exercícios Interativos (TheoryExercises)",
        text: "Prática gamificada de teoria musical para desenvolver habilidades auditivas e teóricas:",
        items: [
          "Identificação de intervalos por áudio (uníssono, segunda, terça, quarta, quinta, sexta, sétima, oitava)",
          "Reconhecimento de tipos de acordes (maior, menor, diminuto, aumentado, sétima)",
          "Ditado rítmico e melódico",
          "Quiz de progressões harmônicas",
          "Identificação de graus do campo harmônico",
          "Sistema de pontuação e acompanhamento de progresso por sessão",
          "Níveis de dificuldade ajustáveis: iniciante, intermediário, avançado"
        ]
      },
      {
        subtitle: "Biblioteca de Referências",
        text: "Repositório de documentos e materiais de estudo musical com processamento automático por IA:",
        items: [
          "Upload de PDFs, DOCs, DOCX e arquivos TXT de referência musical",
          "Extração automática de conteúdo textual via IA",
          "Identificação e catalogação de progressões harmônicas mencionadas no documento",
          "Extração de conceitos-chave musicais",
          "Categorização por tema: teoria musical, harmonia, progressões, história, técnica, arranjo",
          "Busca no conteúdo extraído para encontrar informações específicas",
          "Integração com o banco de progressões: progressões mencionadas podem ser adicionadas automaticamente",
          "Status de processamento visível: pendente, processando, concluído, erro",
          "Sistema de tags para organização temática",
          "Indicação se o conteúdo já foi integrado ao sistema"
        ]
      }
    ]
  },
  {
    id: "ritmos",
    icon: Music,
    title: "Biblioteca de Ritmos",
    color: "from-rose-500 to-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-300",
    content: [
      {
        subtitle: "Ritmos Cadastrados",
        text: "A biblioteca de ritmos contém padrões rítmicos sertanejos completos com diagramas visuais e exemplos:",
        items: [
          "Nome do ritmo (Guarânia, Vanera, Rancheira, Baião, Xote, Forró, Pagode de Viola, etc.)",
          "Fórmula de compasso (2/4, 3/4, 4/4, 6/8)",
          "Padrão rítmico descritivo em sílabas (ex: tum-tá-tum-tá, pum-chá-pum-chá)",
          "Diagrama de batida personalizado com símbolos visuais",
          "Descrição detalhada das características e origem do ritmo",
          "Exemplos de músicas famosas que usam o ritmo",
          "Arquivo de áudio demonstrativo (quando disponível)",
          "Mini diagrama exibível nos cards de música da Biblioteca"
        ]
      },
      {
        subtitle: "Diagrama de Batida – Símbolos",
        text: "O diagrama visual usa símbolos e cores para representar cada movimento da mão:",
        items: [
          "⬇ Seta para baixo (laranja) = Batida para baixo nas cordas",
          "⬆ Seta para cima (azul) = Batida para cima nas cordas",
          "B = Baixo – Batida nas cordas graves (1ª, 2ª, 3ª corda do violão)",
          "A = Alto – Batida nas cordas agudas (4ª, 5ª, 6ª corda do violão)",
          "X = Nota abafada/percussiva – Toque sem pressionar as casas",
          "L = Leque – Técnica especial de varredura das cordas com a palma"
        ]
      },
      {
        subtitle: "Cadastrando um Novo Ritmo",
        text: "Para adicionar um ritmo à biblioteca:",
        items: [
          "Nome – Título do ritmo (obrigatório)",
          "Fórmula de compasso – 2/4, 3/4, 4/4, 6/8",
          "Padrão em sílabas – Como o ritmo 'soa' falado (ex: tum-tá-tum-tá)",
          "Diagrama – Sequência de símbolos B, A, X, L separados por espaço (ex: B A B A)",
          "Descrição – Características, origem e contexto musical",
          "Exemplos – Músicas famosas que usam este ritmo",
          "URL do Áudio – Link para demonstração sonora do ritmo"
        ]
      }
    ]
  },
  {
    id: "estilos",
    icon: Palette,
    title: "Estilos Musicais",
    color: "from-pink-500 to-pink-700",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-300",
    content: [
      {
        subtitle: "Catálogo de Estilos",
        text: "Documentação detalhada dos subgêneros e estilos do sertanejo brasileiro, servindo como referência histórica e técnica:",
        items: [
          "Nome e ícone/emoji representativo do estilo",
          "Período histórico e origem geográfica",
          "Características musicais e harmônicas típicas",
          "Instrumentos característicos e suas funções",
          "Ritmos comumente usados no estilo",
          "Artistas representativos com seus contextos",
          "Exemplos de músicas emblemáticas do estilo",
          "Cor temática para identificação visual nos cards da Biblioteca"
        ]
      },
      {
        subtitle: "Estilos Disponíveis",
        text: "Os estilos pré-definidos para categorização das músicas são:",
        items: [
          "🌾 Sertanejo Raiz – Música caipira tradicional, viola caipira, duplas antigas",
          "🎓 Sertanejo Universitário – Surgido nos anos 2000, influências do rock e pop",
          "💝 Sertanejo Romântico – Baladas lentas com temáticas de amor",
          "🔥 Sertanejo Moderno – Produção atual com elementos eletrônicos",
          "🤠 Sertanejo Modão – Sertanejo de raiz mais pesado, letras de sofrência",
          "🎵 Outro – Para músicas que não se encaixam nos estilos acima"
        ]
      }
    ]
  },
  {
    id: "acordes",
    icon: Guitar,
    title: "Dicionário de Acordes",
    color: "from-amber-500 to-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    content: [
      {
        subtitle: "Banco de Acordes",
        text: "Biblioteca visual completa de acordes para violão e viola caipira, com diagramas detalhados e múltiplas posições:",
        items: [
          "Filtro por instrumento: 🎸 Violão (6 cordas, afinação EADGBE) / 🎻 Viola Caipira (10 cordas)",
          "Filtro por categoria: maior, menor, sétima, major com sétima (maj7), menor com sétima (m7), diminuto (dim), aumentado (aug), sus2, sus4, add9",
          "Filtro por dificuldade: fácil (sem pestana, posições abertas), médio (meia pestana), difícil (pestana completa), avançado (posições altas complexas)",
          "Busca por nome do acorde com autocompletar",
          "Múltiplas posições/variações disponíveis por acorde"
        ]
      },
      {
        subtitle: "Leitura do Diagrama de Acorde",
        text: "Como interpretar os diagramas visuais dos acordes:",
        items: [
          "A grade representa o braço do instrumento visto de frente",
          "Linhas verticais = cordas (da esquerda: 6ª/mais grossa até 1ª/mais fina)",
          "Linhas horizontais = trastes/casas do instrumento",
          "Círculos numerados = onde colocar os dedos (1=indicador, 2=médio, 3=anelar, 4=mínimo)",
          "X acima da linha = NÃO tocar esta corda",
          "O acima da linha = Corda solta (tocar sem pressionar nenhuma casa)",
          "Linha grossa horizontal = Pestana (dedo indicador cobrindo todas as cordas)",
          "Número ao lado esquerdo = Casa inicial (para acordes em posições altas do braço)",
          "O número dentro do círculo indica qual dedo usar para aquela nota"
        ]
      },
      {
        subtitle: "Cadastrando Novos Acordes",
        text: "Administradores podem adicionar acordes à biblioteca para violão e viola:",
        items: [
          "Nome – Ex: F#m, Bb7, Csus4, Dmaj7 (notação internacional em inglês)",
          "Instrumento – Violão ou Viola",
          "Posição/Variação – Número sequencial (1, 2, 3...) para múltiplas posições do mesmo acorde",
          "Array de cordas – 6 valores (violão): cada corda como 'x' (muda), '0' (solta) ou número do traste",
          "Traste inicial (fret) – Para acordes em posições altas (ex: 5 = começa na 5ª casa)",
          "Casa da pestana (barre fret) – Se houver pestana, qual casa",
          "Sugestão de dedilhado – Descrição de qual dedo vai em qual corda/casa",
          "Notas musicais – As notas reais que compõem o acorde (ex: C-E-G para C maior)",
          "Nível de dificuldade – Fácil, Médio, Difícil ou Avançado",
          "Descrição e observações técnicas sobre o acorde ou variação"
        ]
      }
    ]
  },
  {
    id: "ia-treinamento",
    icon: Brain,
    title: "Inteligência Artificial e Aprendizado",
    color: "from-fuchsia-500 to-fuchsia-700",
    bgColor: "bg-fuchsia-50",
    borderColor: "border-fuchsia-300",
    content: [
      {
        subtitle: "Como a IA Funciona",
        text: "O sistema usa IA em múltiplos módulos para análise, sugestão e aprendizado contínuo. A IA aprende com o seu repertório e com as correções manuais que você faz:",
        items: [
          "LearningPatterns – Padrões aprendidos a partir das músicas analisadas",
          "Confidence Score – Índice de confiança (0-100%) por padrão, baseado em correções",
          "times_seen – Quantas vezes o padrão foi identificado no repertório",
          "times_corrected – Quantas vezes foi corrigido manualmente",
          "A IA prioriza padrões com maior confiança e mais ocorrências"
        ]
      },
      {
        subtitle: "Painel de Treinamento da IA",
        text: "Acessível pelo botão '🧠 IA' na Biblioteca. Permite visualizar e refinar o aprendizado do sistema:",
        items: [
          "Lista todos os LearningPatterns cadastrados automaticamente",
          "Exibe o índice de confiança de cada padrão",
          "Permite adicionar observações textuais para orientar o sistema",
          "O sistema extrai regras automáticas das observações: preferência de seção, dica de estilo, modulação, frequência de aparecimento",
          "Você pode marcar padrões como incorretos para que o sistema aprenda a evitá-los",
          "Os padrões mais confiáveis são priorizados na análise de novas músicas"
        ]
      },
      {
        subtitle: "Análise de Similaridade Avançada",
        text: "Acessível pelo botão '✨ Similaridade' na Biblioteca. Compara músicas harmonicamente:",
        items: [
          "Selecione duas ou mais músicas para comparar",
          "O sistema calcula a similaridade harmônica percentual entre elas",
          "Identifica progressões em comum entre as músicas selecionadas",
          "Agrupa músicas por 'família harmônica' (mesmo padrão de progressão)",
          "Muito útil para montar setlists com transição suave e natural entre músicas",
          "Pode revelar que músicas aparentemente diferentes têm a mesma estrutura harmônica"
        ]
      },
      {
        subtitle: "Recomendações Personalizadas",
        text: "Acessível pelo botão '💡 Dicas' na Biblioteca. Sistema inteligente de recomendações baseado no perfil do seu repertório:",
        items: [
          "Analisa os padrões de gênero, artista, progressão, tonalidade e ritmo mais frequentes",
          "Sugere músicas com progressões similares às que você mais toca",
          "Identifica lacunas no repertório (progressões sub-representadas ou ausentes)",
          "Recomenda exercícios técnicos baseados nas músicas do acervo",
          "Sugere sequências de estudo por dificuldade progressiva",
          "Identifica 'especialidades' do seu repertório (ex: 'seu repertório é fortemente baseado em I-V-vi-IV')"
        ]
      },
      {
        subtitle: "Sugestões de Novas Músicas",
        text: "Acessível pelo botão '🎵 Sugestões' na Biblioteca. IA sugere músicas para enriquecer o acervo:",
        items: [
          "Analisa o repertório atual e identifica padrões de gosto musical",
          "Sugestões locais: baseadas em similaridade direta com músicas existentes (mesma progressão, ritmo, estilo)",
          "Sugestões da IA: análise contextual mais profunda usando modelos de linguagem",
          "Exibe: título sugerido, artista, motivo da sugestão e similaridade estimada",
          "Clique em uma sugestão para navegar à análise com dados pré-preenchidos",
          "As sugestões se atualizam automaticamente conforme o repertório cresce"
        ]
      },
      {
        subtitle: "Detector de Progressões Incomuns",
        text: "Acessível pelo botão '🔍 Progressões Incomuns' na Biblioteca. Identifica padrões raros:",
        items: [
          "Varre todas as músicas da biblioteca procurando progressões não presentes no banco de Progressões",
          "Detecção local: identifica patterns sem correspondência no banco",
          "Análise da IA: nomeia, descreve e classifica o nível de raridade das progressões encontradas",
          "Classificações de raridade: 'Comum não catalogada', 'Incomum', 'Rara'",
          "Botão 'Adicionar ao Banco' para inserir as novas progressões no banco de dados com um clique",
          "Exibe onde no repertório cada progressão aparece (música e seção)",
          "Fundamental para manter o banco de progressões sempre atualizado e completo"
        ]
      }
    ]
  },
  {
    id: "relatorios",
    icon: BarChart3,
    title: "Relatórios e Estatísticas",
    color: "from-emerald-600 to-emerald-800",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    content: [
      {
        subtitle: "Visão Geral do Repertório",
        text: "Análises estatísticas automáticas e visuais do seu acervo musical completo:",
        items: [
          "Total de músicas cadastradas por estilo musical (gráfico de pizza com porcentagens)",
          "Distribuição por ritmo (gráfico de barras horizontais)",
          "Progressões harmônicas mais frequentes no repertório (ranking com contagem)",
          "Tonalidades mais usadas (em quais tons você mais toca)",
          "Músicas com análise incompleta: sem tom, sem ritmo ou sem progressão definida",
          "Evolução temporal: músicas adicionadas por mês (histórico de crescimento do acervo)",
          "Artistas mais presentes na biblioteca (ranking de artistas com mais músicas)"
        ]
      },
      {
        subtitle: "Análise Harmônica Detalhada",
        text: "Estatísticas específicas sobre as progressões identificadas no repertório:",
        items: [
          "Ranking das progressões predominantes mais comuns (qual progressão domina o repertório)",
          "Gráfico de padrões harmônicos em algarismos romanos (I-IV-V, I-V-vi-IV, etc.)",
          "Comparação entre seções: quais progressões aparecem mais no Refrão vs. Verso vs. Intro",
          "Distribuição de tonalidades por estilo musical (ex: Sertanejo Raiz prefere G e D?)",
          "Músicas sem progressão predominante definida (candidatas para análise)"
        ]
      }
    ]
  },
  {
    id: "backup",
    icon: Download,
    title: "Backup de Dados",
    color: "from-slate-500 to-slate-700",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-300",
    content: [
      {
        subtitle: "Exportação de Dados",
        text: "Faça backup completo dos seus dados para segurança ou migração:",
        items: [
          "Exportar Músicas – Baixa todas as músicas com análises completas em formato JSON",
          "Exportar Progressões – Baixa o banco de progressões harmônicas",
          "Exportar Acordes – Baixa a biblioteca de acordes para violão e viola",
          "Exportar Ritmos – Baixa a biblioteca de ritmos e diagramas",
          "Exportar Tudo – Baixa um arquivo ZIP contendo todos os dados do sistema",
          "Os arquivos JSON são legíveis e podem ser editados manualmente se necessário"
        ]
      },
      {
        subtitle: "Importação de Dados",
        text: "Restaure dados de backups anteriores ou importe dados de outra instância:",
        items: [
          "Selecione o arquivo JSON de backup gerado pelo sistema",
          "O sistema valida o formato e a estrutura antes de importar",
          "Escolha a estratégia: substituir dados existentes ou mesclar com os atuais",
          "Confirme a operação para aplicar as mudanças (irreversível sem novo backup)",
          "Recomendado: faça backup atual antes de importar novos dados"
        ]
      }
    ]
  },
  {
    id: "cadernos",
    icon: BookMarked,
    title: "Cadernos de Cifras (PDF)",
    color: "from-yellow-500 to-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    content: [
      {
        subtitle: "O que são os Cadernos?",
        text: "Os Cadernos são coleções de cifras em formato PDF. Você pode fazer upload de cadernos de cifras completos e o sistema extrai as cifras individuais automaticamente usando IA para importação em massa na Biblioteca.",
        items: []
      },
      {
        subtitle: "Upload de Caderno",
        text: "Para adicionar um novo caderno de cifras:",
        items: [
          "Na aba 'Cadernos' da Biblioteca, clique em 'Novo Caderno'",
          "Faça upload do arquivo PDF do caderno",
          "Informe o nome do caderno (ex: 'Caderno Sertanejo Raiz Vol.1')",
          "Adicione uma descrição do conteúdo",
          "Adicione tags para organização (ex: sertanejo, gospel, MPB, forró)",
          "O sistema processa o PDF automaticamente e exibe as cifras encontradas"
        ]
      },
      {
        subtitle: "Processamento em Lotes",
        text: "PDFs grandes são processados em lotes sequenciais para evitar timeout e garantir processamento completo:",
        items: [
          "Configure o número de páginas por lote (recomendado: 20-30 páginas por vez)",
          "Acompanhe o progresso: quais lotes já foram processados e quantas cifras cada um extraiu",
          "Cada lote processa o intervalo de páginas configurado independentemente",
          "Processos podem ser retomados de onde pararam sem reprocessar lotes já concluídos",
          "Histórico completo de lotes processados fica registrado com data e hora"
        ]
      },
      {
        subtitle: "Importando Cifras para a Biblioteca",
        text: "Após a extração, as cifras ficam listadas dentro do caderno para revisão e importação:",
        items: [
          "Cada cifra extraída exibe: título da música, artista, tom e prévia do conteúdo",
          "Clique em 'Importar' para enviar a cifra para a página de Análise pré-preenchida com os dados",
          "Revise e complemente os dados na página de Análise (adicione seções, progressões, etc.)",
          "Salve para adicionar à Biblioteca oficial e disponibilizar todas as funcionalidades"
        ]
      }
    ]
  },
  {
    id: "dicas-gerais",
    icon: HelpCircle,
    title: "Dicas, Boas Práticas e Fluxo de Trabalho",
    color: "from-lime-500 to-lime-700",
    bgColor: "bg-lime-50",
    borderColor: "border-lime-300",
    content: [
      {
        subtitle: "Fluxo de Trabalho Recomendado",
        text: "Para aproveitar ao máximo o sistema, siga este fluxo de trabalho na sequência correta:",
        items: [
          "1️⃣ CADASTRAR RITMOS (Ritmos → Novo Ritmo) – Configure os ritmos que você usa antes de cadastrar músicas",
          "2️⃣ CADASTRAR ESTILOS (Estilos → Novo Estilo) – Configure os estilos do seu repertório",
          "3️⃣ CADASTRAR PROGRESSÕES (Progressões → Nova Progressão) – Base fundamental da análise harmônica",
          "4️⃣ ANALISAR MÚSICAS (Analisar Música → Análise com IA) – Adicione músicas com áudio ou cifra",
          "5️⃣ VERIFICAR E CORRIGIR (Biblioteca → Detalhes) – Revise as progressões identificadas e corrija se necessário",
          "6️⃣ CALIBRAR PALCO (Detalhes → Modo Palco) – Ajuste countdown e velocidade de scroll por música",
          "7️⃣ CRIAR SETLISTS (Repertórios → Novo) – Monte o repertório do show na ordem desejada",
          "8️⃣ TREINAR OUVIDO (Ditado Harmônico) – Pratique identificação auditiva regularmente",
          "9️⃣ TREINAR IA (Biblioteca → IA) – Corrija identificações incorretas para melhorar a precisão",
          "🔟 GERAR RELATÓRIOS (Relatórios) – Analise o perfil harmônico do repertório periodicamente"
        ]
      },
      {
        subtitle: "Melhores Práticas para Formatação de Cifras",
        text: "Para que o sistema funcione corretamente e a cifra fique legível, siga o formato padrão:",
        items: [
          "Use o formato padrão: linha de acordes alternando com linha de letra",
          "Acordes em notação internacional: C, D, E, F, G, A, B (não use Dó, Ré, Mi...)",
          "Separe seções com colchetes: [Intro], [Verso], [Pré-Refrão], [Refrão], [Ponte], [Solo]",
          "Mantenha os acordes alinhados sobre as sílabas corretas para exibição correta na cifra interativa",
          "Use '#' para sustenidos (F#, C#, G#) e 'b' para bemóis (Bb, Eb)",
          "Para menores use 'm' minúsculo: Am, Dm, Em (não use 'min', 'menor', ou '-')",
          "Para diminutos: 'dim' ou '°': Bdim, C°",
          "Para acordes com baixo alternativo: G/B, C/E (nota/baixo)",
          "Para sétimas: G7, Am7, Cmaj7, Dm7b5",
          "Para sus: Csus4, Gsus2"
        ]
      },
      {
        subtitle: "Gestão de Tonalidades e Transposições",
        text: "Como gerenciar corretamente as tonalidades das músicas no sistema:",
        items: [
          "O 'Tom Principal' (main_key) representa a tonalidade atual depois de transposições – é este que o sistema usa para cálculos",
          "O 'Tom Original' guarda a tonalidade original gravada/publicada antes de transposições",
          "Ao transpor manualmente a cifra, sempre atualize o 'Tom Principal' na edição da música",
          "O sistema usa o Tom Principal para calcular os acordes reais da progressão predominante e exibir no card da Biblioteca",
          "Modulações dentro da música devem ser registradas no campo 'Tom Modulado' de cada seção afetada",
          "O ícone 🔄 no card indica que há pelo menos uma seção com modulação registrada"
        ]
      },
      {
        subtitle: "Maximizando o Ditado Harmônico",
        text: "Dicas para tirar o máximo proveito do treinamento auditivo:",
        items: [
          "Cadastre sempre as URLs de áudio e/ou playback das músicas – sem elas, as músicas não aparecem no ditado",
          "Comece com poucas músicas conhecidas no nível Fácil para se familiarizar com o formato",
          "Suba gradualmente a dificuldade: Fácil → Médio → Difícil",
          "Anote quais progressões você erra com mais frequência e estude essas progressões no Explorador Harmônico",
          "Pratique pelo menos 10 minutos de ditado por dia para resultados consistentes",
          "Use o Ditado junto com o Metrônomo para treinar precisão rítmica e harmônica simultaneamente"
        ]
      },
      {
        subtitle: "Atalhos e Produtividade",
        text: "Recursos para usar o sistema com máxima agilidade:",
        items: [
          "No Modo Palco, use teclado para tudo: Espaço (play/pause), setas (velocidade/fonte), F (fullscreen), T (tema), Esc (sair)",
          "Clique no ícone musical dourado no card da Biblioteca para ir DIRETO ao modo palco sem abrir os detalhes",
          "Use filtros combinados na Biblioteca (texto + estilo + ritmo + progressão) para localização ultra-rápida",
          "A badge da progressão predominante mostra tooltip com acordes reais ao passar o mouse – sem precisar abrir a música",
          "Favorite acordes para que sempre apareçam na primeira posição ao clicar na cifra",
          "Use o zoom na cifra (mínimo 8px, máximo 32px) para ajustar à sua visão ou ao tamanho da tela",
          "Ative quebra de linha em telas menores para não precisar rolar a cifra horizontalmente",
          "No Ditado Harmônico, use a dica (tom e estilo) estrategicamente – ela não penaliza a pontuação"
        ]
      },
      {
        subtitle: "Solução de Problemas Comuns",
        text: "Problemas frequentes e como resolvê-los:",
        items: [
          "Música não aparece no Ditado Harmônico → Certifique-se que a música tem URL de áudio OU URL de playback cadastrada, E progressão predominante definida",
          "Progressão predominante incorreta → Use o botão 'Recalcular' na Biblioteca ou edite manualmente na aba de detalhes",
          "Acordes não aparecem no diagrama → Verifique se o acorde está cadastrado no Dicionário de Acordes para o instrumento correto",
          "Análise com IA retorna resultado vazio → Certifique-se que a cifra está no formato correto com seções identificadas por [colchetes]",
          "Scroll do palco muito rápido ou lento → Edite a música e ajuste o campo 'Velocidade de Rolagem' e 'Tempo de Início'",
          "Caderno PDF não extrai cifras → Certifique-se que o PDF não é escaneado (deve ser PDF com texto selecionável)"
        ]
      }
    ]
  }
];

function SectionCard({ section, isOpen, onToggle }) {
  const Icon = section.icon;
  
  return (
    <div className={`rounded-2xl border-2 ${section.borderColor} overflow-hidden shadow-md transition-all duration-300`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 md:p-5 bg-gradient-to-r ${section.color} text-white hover:opacity-95 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-left">{section.title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 flex-shrink-0" />}
      </button>
      
      {isOpen && (
        <div className={`${section.bgColor} p-4 md:p-6 space-y-5`}>
          {section.content.map((block, idx) => (
            <div key={idx} className="print-block rounded-xl bg-white/60 p-3 md:p-4 border border-white/80">
              <h3 className="font-bold text-gray-800 text-base md:text-lg mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-600 inline-block flex-shrink-0" />
                {block.subtitle}
              </h3>
              {block.text && (
                <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-3">{block.text}</p>
              )}
              {block.items && block.items.length > 0 && (
                <ul className="space-y-1.5">
                  {block.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm md:text-base text-gray-700">
                      <ArrowRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkflowGuide() {
  const [openSections, setOpenSections] = useState({ "visao-geral": true });

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all = {};
    sections.forEach(s => { all[s.id] = true; });
    setOpenSections(all);
  };

  const collapseAll = () => setOpenSections({});

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] to-[#E8DCC4] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#8B6F47] to-[#D4AF37] rounded-2xl flex items-center justify-center shadow-xl">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#8B6F47] mb-2">Guia de Uso Completo</h1>
          <p className="text-[#A68A64] text-lg mb-1">Tropeiros do Bebedouro – Progressões Harmônicas v5.0</p>
          <p className="text-[#A68A64] text-sm">Documentação detalhada de todas as funcionalidades do sistema</p>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            <Badge className="bg-[#8B6F47] text-white px-3 py-1">{sections.length} módulos documentados</Badge>
            <Badge className="bg-[#D4AF37] text-white px-3 py-1">Guia completo v5.0</Badge>
            <Badge className="bg-purple-600 text-white px-3 py-1">Atualizado Fev/2026</Badge>
          </div>
        </div>

        {/* Controles */}
        <div className="flex gap-2 mb-6 justify-end flex-wrap">
          <button
            onClick={() => {
              expandAll();
              setTimeout(() => window.print(), 400);
            }}
            className="text-sm px-4 py-2 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 shadow"
          >
            <Printer className="w-4 h-4" />
            Gerar PDF
          </button>
          <button onClick={expandAll} className="text-sm px-4 py-2 bg-[#D4AF37] text-white rounded-xl hover:bg-[#b8952e] transition-colors">
            Expandir Tudo
          </button>
          <button onClick={collapseAll} className="text-sm px-4 py-2 border border-[#8B6F47] text-[#8B6F47] rounded-xl hover:bg-[#8B6F47] hover:text-white transition-colors">
            Recolher Tudo
          </button>
        </div>

        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 20mm 15mm; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; font-size: 11pt; }
            button { display: none !important; }
            nav, header, aside { display: none !important; }
            .no-print { display: none !important; }
            .print-section { page-break-inside: avoid; break-inside: avoid; }
            .print-block { page-break-inside: avoid; break-inside: avoid; }
            .print-section-wrapper { page-break-before: auto; break-before: auto; }
            h2, h3 { page-break-after: avoid; break-after: avoid; }
            ul, li { page-break-inside: avoid; break-inside: avoid; }
            * { box-shadow: none !important; }
            .bg-gradient-to-r, .bg-gradient-to-br { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>

        {/* Índice */}
        <div className="bg-white/70 rounded-2xl border border-[#D4C5B0] p-4 md:p-6 mb-6 shadow">
          <h2 className="font-bold text-[#8B6F47] text-lg mb-3 flex items-center gap-2">
            <Hash className="w-5 h-5" /> Índice de Módulos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {sections.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setOpenSections(prev => ({ ...prev, [s.id]: true }));
                    setTimeout(() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }}
                  className="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-[#F5F1E8] transition-colors text-sm text-[#6B5437] hover:text-[#8B6F47]"
                >
                  <span className="text-[#A68A64] font-mono text-xs w-5">{String(i + 1).padStart(2, '0')}</span>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Seções */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.id} id={section.id} className="print-section-wrapper">
              <SectionCard
                section={section}
                isOpen={!!openSections[section.id]}
                onToggle={() => toggleSection(section.id)}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-sm text-[#A68A64] pb-8">
          <p>Tropeiros do Bebedouro – Progressões Harmônicas v5.0</p>
          <p className="mt-1">Guia atualizado em fevereiro de 2026 • {sections.length} módulos documentados</p>
        </div>
      </div>
    </div>
  );
}