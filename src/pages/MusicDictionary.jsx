import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  BookOpen, 
  Music2, 
  Brain, 
  Star, 
  StarOff,
  Clock,
  TrendingUp,
  Filter,
  SortAsc,
  Volume2,
  Share2,
  Copy,
  Check,
  Sparkles,
  GraduationCap,
  ListMusic,
  Hash,
  Dumbbell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MusicTheoryQuiz from "../components/theory/MusicTheoryQuiz";
import InteractiveExercises from "../components/theory/InteractiveExercises";

const DICTIONARY = [
  // Harmonia
  {
    term: "Acorde",
    category: "Harmonia",
    definition: "Conjunto de três ou mais notas tocadas simultaneamente.",
    example: "C (Dó maior) = C + E + G",
    related: ["Tríade", "Tétrade", "Harmonia"],
    difficulty: "iniciante",
    audio: "ah-KOR-deh"
  },
  {
    term: "Arpejo",
    category: "Técnica",
    definition: "Execução das notas de um acorde uma após a outra, em sequência ascendente ou descendente.",
    example: "Arpejo de Am: A → C → E → A (subindo) ou A → E → C → A (descendo)",
    related: ["Acorde", "Dedilhado", "Sweep Picking"],
    difficulty: "intermediario",
    audio: "ar-PE-jo"
  },
  {
    term: "Bemol (♭)",
    category: "Notação",
    definition: "Símbolo que indica que uma nota deve ser abaixada em meio tom (um semitom).",
    example: "Bb é meio tom abaixo de B (Si bemol)",
    related: ["Sustenido", "Semitom", "Enarmonia"],
    difficulty: "iniciante",
    audio: "beh-MOL"
  },
  {
    term: "Cadência",
    category: "Harmonia",
    definition: "Sequência de acordes que cria sensação de conclusão, repouso ou suspensão.",
    example: "Cadência perfeita: V7 → I (G7 → C em Dó maior)",
    related: ["Dominante", "Tônica", "Resolução"],
    difficulty: "intermediario",
    audio: "ka-DÊN-sia"
  },
  {
    term: "Campo Harmônico",
    category: "Harmonia",
    definition: "Conjunto de acordes formados a partir das notas de uma escala, usando apenas notas diatônicas.",
    example: "Campo de C maior: C, Dm, Em, F, G, Am, Bdim",
    related: ["Escala", "Grau", "Função Harmônica"],
    difficulty: "intermediario",
    audio: "KAM-po ar-MÔ-ni-ko"
  },
  {
    term: "Cifra",
    category: "Notação",
    definition: "Sistema de notação que usa letras do alfabeto para representar acordes musicais.",
    example: "A = Lá maior, Am = Lá menor, A7 = Lá com sétima, Am7 = Lá menor com sétima",
    related: ["Acorde", "Notação", "Tablatura"],
    difficulty: "iniciante",
    audio: "SI-fra"
  },
  {
    term: "Compasso",
    category: "Ritmo",
    definition: "Unidade de tempo que organiza os pulsos da música em grupos regulares.",
    example: "4/4 = quatro tempos por compasso, cada tempo vale uma semínima",
    related: ["Tempo", "Fórmula de Compasso", "Pulso", "Métrica"],
    difficulty: "iniciante",
    audio: "kom-PA-so"
  },
  {
    term: "Dominante",
    category: "Função Harmônica",
    definition: "Quinto grau da escala (V), cria tensão harmônica que naturalmente resolve na tônica.",
    example: "Em C maior, G é a dominante. G7 → C cria resolução forte.",
    related: ["Tônica", "Subdominante", "V7", "Cadência"],
    difficulty: "intermediario",
    audio: "do-mi-NAN-te"
  },
  {
    term: "Escala",
    category: "Melodia",
    definition: "Sequência ordenada de notas seguindo um padrão específico de intervalos (tons e semitons).",
    example: "Escala de C maior: C D E F G A B (T T S T T T S)",
    related: ["Intervalo", "Modo", "Tom", "Grau"],
    difficulty: "iniciante",
    audio: "es-KA-la"
  },
  {
    term: "Fundamental",
    category: "Harmonia",
    definition: "Nota que dá nome ao acorde e serve como sua base ou raiz.",
    example: "No acorde de Em, a fundamental é E (Mi)",
    related: ["Acorde", "Inversão", "Baixo"],
    difficulty: "iniciante",
    audio: "fun-da-men-TAL"
  },
  {
    term: "Grau",
    category: "Harmonia",
    definition: "Posição numérica de uma nota ou acorde dentro de uma escala, representado por algarismos romanos.",
    example: "I, II, III, IV, V, VI, VII (maiúsculo = maior, minúsculo = menor)",
    related: ["Escala", "Campo Harmônico", "Função Harmônica"],
    difficulty: "intermediario",
    audio: "GRAU"
  },
  {
    term: "Harmonia",
    category: "Conceito",
    definition: "Estudo da combinação simultânea de sons (acordes) e suas progressões ao longo do tempo.",
    example: "A progressão I-IV-V-I é uma sequência harmônica básica do tonalismo",
    related: ["Acorde", "Progressão", "Melodia", "Contraponto"],
    difficulty: "iniciante",
    audio: "ar-mo-NI-a"
  },
  {
    term: "Intervalo",
    category: "Melodia",
    definition: "Distância entre duas notas, medida em tons e semitons. Pode ser melódico ou harmônico.",
    example: "De C para E = terça maior (4 semitons = 2 tons)",
    related: ["Tom", "Semitom", "Escala", "Consonância"],
    difficulty: "iniciante",
    audio: "in-ter-VA-lo"
  },
  {
    term: "Inversão",
    category: "Harmonia",
    definition: "Reorganização das notas de um acorde, mudando qual nota está no baixo.",
    example: "C/E = C maior com E no baixo (1ª inversão), C/G = 2ª inversão",
    related: ["Acorde", "Baixo", "Fundamental", "Voicing"],
    difficulty: "intermediario",
    audio: "in-ver-SÃO"
  },
  {
    term: "Modo",
    category: "Escala",
    definition: "Variação da escala maior começando em diferentes graus, cada um com caráter sonoro único.",
    example: "Modo Dórico: escala menor com 6ª maior (II grau da maior)",
    related: ["Escala", "Jônio", "Eólio", "Mixolídio"],
    difficulty: "avancado",
    audio: "MO-do"
  },
  {
    term: "Modulação",
    category: "Harmonia",
    definition: "Mudança de tonalidade (centro tonal) durante uma música, criando variedade harmônica.",
    example: "Mudar de C maior para G maior usando D7 como pivô",
    related: ["Tom", "Transposição", "Progressão", "Pivô"],
    difficulty: "avancado",
    audio: "mo-du-la-SÃO"
  },
  {
    term: "Oitava",
    category: "Intervalo",
    definition: "Intervalo de 12 semitons onde a frequência dobra, resultando na mesma nota em altura diferente.",
    example: "C3 para C4 = uma oitava (a frequência de C4 é o dobro de C3)",
    related: ["Intervalo", "Frequência", "Registro", "Uníssono"],
    difficulty: "iniciante",
    audio: "oi-TA-va"
  },
  {
    term: "Pentatônica",
    category: "Escala",
    definition: "Escala de cinco notas, muito usada em solos por sua sonoridade consonante e fácil aplicação.",
    example: "Pentatônica menor de A: A C D E G (remove 2ª e 6ª da menor natural)",
    related: ["Escala", "Blues", "Solo", "Improvisação"],
    difficulty: "iniciante",
    audio: "pen-ta-TÔ-ni-ka"
  },
  {
    term: "Progressão",
    category: "Harmonia",
    definition: "Sequência de acordes que forma a base harmônica de uma música ou trecho musical.",
    example: "I-V-vi-IV é uma das progressões mais populares da música pop",
    related: ["Acorde", "Harmonia", "Cadência", "Ciclo"],
    difficulty: "iniciante",
    audio: "pro-gre-SÃO"
  },
  {
    term: "Relativo",
    category: "Harmonia",
    definition: "Tom maior e menor que compartilham as mesmas notas (armadura de clave).",
    example: "C maior e Am são relativos (ambos sem sustenidos/bemóis)",
    related: ["Tom", "Escala", "Modo", "Armadura"],
    difficulty: "intermediario",
    audio: "re-la-TI-vo"
  },
  {
    term: "Resolução",
    category: "Harmonia",
    definition: "Movimento de um acorde ou nota tensa para um ponto de repouso ou estabilidade.",
    example: "G7 → C (a tensão da dominante resolve na estabilidade da tônica)",
    related: ["Tensão", "Dominante", "Tônica", "Cadência"],
    difficulty: "intermediario",
    audio: "re-so-lu-SÃO"
  },
  {
    term: "Ritmo",
    category: "Conceito",
    definition: "Organização dos sons e silêncios no tempo, criando padrões de durações e acentos.",
    example: "Guarânia, Vanera, Toada são ritmos típicos do sertanejo",
    related: ["Compasso", "Tempo", "Andamento", "Síncope"],
    difficulty: "iniciante",
    audio: "RIT-mo"
  },
  {
    term: "Semitom",
    category: "Intervalo",
    definition: "Menor intervalo na música ocidental (meio tom), distância entre duas teclas adjacentes do piano.",
    example: "De E para F = 1 semitom (não há tecla preta entre elas)",
    related: ["Tom", "Intervalo", "Cromático", "Segunda menor"],
    difficulty: "iniciante",
    audio: "se-mi-TOM"
  },
  {
    term: "Subdominante",
    category: "Função Harmônica",
    definition: "Quarto grau da escala (IV), prepara harmonicamente para a dominante ou cadencia plagal.",
    example: "Em C maior, F é a subdominante. Cadência plagal: IV → I",
    related: ["Tônica", "Dominante", "IV", "Cadência"],
    difficulty: "intermediario",
    audio: "sub-do-mi-NAN-te"
  },
  {
    term: "Sustenido (#)",
    category: "Notação",
    definition: "Símbolo que indica que uma nota deve ser elevada em meio tom (um semitom).",
    example: "F# é meio tom acima de F (Fá sustenido)",
    related: ["Bemol", "Semitom", "Enarmonia", "Alteração"],
    difficulty: "iniciante",
    audio: "sus-te-NI-do"
  },
  {
    term: "Tempo",
    category: "Ritmo",
    definition: "Velocidade da música, medida em BPM (batidas por minuto). Também significa cada pulso do compasso.",
    example: "120 BPM = 120 batidas por minuto (andamento moderato)",
    related: ["BPM", "Andamento", "Metrônomo", "Compasso"],
    difficulty: "iniciante",
    audio: "TEM-po"
  },
  {
    term: "Tensão",
    category: "Harmonia",
    definition: "Sensação de instabilidade harmônica que cria expectativa de resolução.",
    example: "Acorde de sétima dominante (V7) cria tensão que pede resolução",
    related: ["Resolução", "Dominante", "Dissonância", "Suspensão"],
    difficulty: "intermediario",
    audio: "ten-SÃO"
  },
  {
    term: "Tétrade",
    category: "Harmonia",
    definition: "Acorde formado por quatro notas: fundamental, terça, quinta e sétima.",
    example: "C7M = C + E + G + B (Dó com sétima maior)",
    related: ["Tríade", "Sétima", "Acorde", "Extensão"],
    difficulty: "intermediario",
    audio: "TE-tra-de"
  },
  {
    term: "Tom",
    category: "Intervalo",
    definition: "Intervalo de dois semitons. Também usado para indicar a tonalidade de uma música.",
    example: "De C para D = 1 tom (2 semitons). 'A música está no tom de Sol'",
    related: ["Semitom", "Intervalo", "Escala", "Tonalidade"],
    difficulty: "iniciante",
    audio: "TOM"
  },
  {
    term: "Tonalidade",
    category: "Harmonia",
    definition: "Centro tonal de uma música, definido pela escala e acorde principal de repouso.",
    example: "Música em tonalidade de G maior: G é o centro de repouso",
    related: ["Tônica", "Escala", "Campo Harmônico", "Armadura"],
    difficulty: "iniciante",
    audio: "to-na-li-DA-de"
  },
  {
    term: "Tônica",
    category: "Função Harmônica",
    definition: "Primeiro grau da escala (I), centro de repouso e estabilidade harmônica.",
    example: "Em G maior, G é a tônica - ponto de chegada e partida",
    related: ["Dominante", "Subdominante", "I", "Resolução"],
    difficulty: "iniciante",
    audio: "TÔ-ni-ka"
  },
  {
    term: "Transposição",
    category: "Técnica",
    definition: "Mudar todas as notas de uma música para outra tonalidade mantendo as relações intervalares.",
    example: "Transpor de C para G = subir 7 semitons (ou usar capotraste)",
    related: ["Tom", "Modulação", "Capotraste", "Intervalo"],
    difficulty: "iniciante",
    audio: "trans-po-zi-SÃO"
  },
  {
    term: "Tríade",
    category: "Harmonia",
    definition: "Acorde formado por três notas: fundamental, terça e quinta, empilhadas em intervalos de terça.",
    example: "G maior = G + B + D (fundamental + terça maior + quinta justa)",
    related: ["Acorde", "Tétrade", "Fundamental", "Terça"],
    difficulty: "iniciante",
    audio: "TRI-a-de"
  },
  {
    term: "Uníssono",
    category: "Intervalo",
    definition: "Duas ou mais vozes/instrumentos tocando exatamente a mesma nota na mesma altura.",
    example: "Duas guitarras tocando a mesma nota C3 simultaneamente",
    related: ["Intervalo", "Oitava", "Dobramento"],
    difficulty: "iniciante",
    audio: "u-NI-so-no"
  },
  {
    term: "Voicing",
    category: "Harmonia",
    definition: "Disposição específica das notas de um acorde no registro, definindo sua textura sonora.",
    example: "Voicing aberto: notas espaçadas. Voicing fechado: notas próximas.",
    related: ["Acorde", "Inversão", "Arranjo", "Textura"],
    difficulty: "avancado",
    audio: "VOI-sing"
  },
  // Novos termos adicionados
  {
    term: "Anacruse",
    category: "Ritmo",
    definition: "Nota ou grupo de notas que precedem o primeiro tempo forte do compasso, criando impulso.",
    example: "A música 'Parabéns pra Você' começa em anacruse",
    related: ["Compasso", "Tempo", "Levare"],
    difficulty: "intermediario",
    audio: "a-na-KRU-ze"
  },
  {
    term: "Appoggiatura",
    category: "Ornamento",
    definition: "Nota ornamental que antecede uma nota principal, geralmente por grau conjunto.",
    example: "Uma nota de passagem que 'se apoia' na nota real do acorde",
    related: ["Ornamento", "Melodia", "Nota de passagem"],
    difficulty: "avancado",
    audio: "a-po-ja-TU-ra"
  },
  {
    term: "Bordão",
    category: "Técnica",
    definition: "Nota grave sustentada enquanto outras vozes se movem, comum na viola e gaita.",
    example: "Na viola caipira, as cordas graves fazem o bordão",
    related: ["Pedal", "Baixo", "Ostinato"],
    difficulty: "intermediario",
    audio: "bor-DÃO"
  },
  {
    term: "Coda",
    category: "Forma",
    definition: "Seção final de uma música que serve como conclusão, após o desenvolvimento principal.",
    example: "O símbolo 'Coda' indica pular para a seção final",
    related: ["Forma", "Estrutura", "Finale"],
    difficulty: "iniciante",
    audio: "KO-da"
  },
  {
    term: "Contraponto",
    category: "Harmonia",
    definition: "Técnica de combinar duas ou mais linhas melódicas independentes de forma harmoniosa.",
    example: "Fuga de Bach é exemplo clássico de contraponto",
    related: ["Melodia", "Harmonia", "Polifonia"],
    difficulty: "avancado",
    audio: "kon-tra-PON-to"
  },
  {
    term: "Cromatismo",
    category: "Melodia",
    definition: "Uso de notas fora da escala diatônica, movendo-se por semitons.",
    example: "Escala cromática: C C# D D# E F F# G G# A A# B",
    related: ["Semitom", "Alteração", "Escala cromática"],
    difficulty: "intermediario",
    audio: "kro-ma-TIS-mo"
  },
  {
    term: "Dinâmica",
    category: "Expressão",
    definition: "Variação de intensidade sonora (volume) na execução musical.",
    example: "pp (pianissimo) = muito fraco, ff (fortissimo) = muito forte",
    related: ["Piano", "Forte", "Crescendo", "Decrescendo"],
    difficulty: "iniciante",
    audio: "di-NÂ-mi-ka"
  },
  {
    term: "Enarmonia",
    category: "Notação",
    definition: "Notas com o mesmo som mas grafias diferentes, dependendo do contexto harmônico.",
    example: "F# e Gb são enarmônicos (mesmo som, nomes diferentes)",
    related: ["Sustenido", "Bemol", "Notação"],
    difficulty: "intermediario",
    audio: "e-nar-mo-NI-a"
  },
  {
    term: "Fermata",
    category: "Notação",
    definition: "Símbolo que indica prolongar a duração de uma nota além do seu valor normal.",
    example: "O símbolo '𝄐' sobre uma nota indica fermata",
    related: ["Duração", "Pausa", "Expressão"],
    difficulty: "iniciante",
    audio: "fer-MA-ta"
  },
  {
    term: "Glissando",
    category: "Técnica",
    definition: "Deslizar rapidamente entre duas notas, passando por todas as alturas intermediárias.",
    example: "Deslizar o dedo pela corda da guitarra do grave ao agudo",
    related: ["Slide", "Portamento", "Legato"],
    difficulty: "intermediario",
    audio: "gli-SAN-do"
  },
  {
    term: "Hammer-on",
    category: "Técnica",
    definition: "Técnica de guitarra onde se martela uma nota mais aguda sem palhetar novamente.",
    example: "Tocar C e martelar o D na mesma corda sem palhetar",
    related: ["Pull-off", "Legato", "Ligado"],
    difficulty: "intermediario",
    audio: "RÊ-mer-on"
  },
  {
    term: "Legato",
    category: "Articulação",
    definition: "Articulação suave e conectada entre as notas, sem interrupção do som.",
    example: "Tocar uma frase melódica de forma fluida e ligada",
    related: ["Staccato", "Ligadura", "Hammer-on"],
    difficulty: "iniciante",
    audio: "le-GA-to"
  },
  {
    term: "Ostinato",
    category: "Técnica",
    definition: "Padrão melódico, rítmico ou harmônico que se repete persistentemente.",
    example: "O riff de baixo em 'Another One Bites the Dust'",
    related: ["Riff", "Loop", "Pedal"],
    difficulty: "intermediario",
    audio: "os-ti-NA-to"
  },
  {
    term: "Pedal",
    category: "Harmonia",
    definition: "Nota sustentada (geralmente no baixo) enquanto a harmonia muda acima.",
    example: "Pedal de tônica: manter C no baixo enquanto acordes mudam",
    related: ["Bordão", "Ostinato", "Baixo"],
    difficulty: "intermediario",
    audio: "pe-DAL"
  },
  {
    term: "Ponte",
    category: "Forma",
    definition: "Seção contrastante de uma música que conecta partes principais (verso/refrão).",
    example: "A ponte geralmente tem harmonia e melodia diferentes",
    related: ["Forma", "Estrutura", "Bridge"],
    difficulty: "iniciante",
    audio: "PON-te"
  },
  {
    term: "Pull-off",
    category: "Técnica",
    definition: "Técnica de guitarra onde se puxa o dedo para soar uma nota mais grave.",
    example: "Tocar D e puxar para soar C na mesma corda",
    related: ["Hammer-on", "Legato", "Ligado"],
    difficulty: "intermediario",
    audio: "pul-OF"
  },
  {
    term: "Riff",
    category: "Técnica",
    definition: "Frase musical curta e marcante que se repete, típica do rock e blues.",
    example: "O riff de guitarra de 'Smoke on the Water'",
    related: ["Ostinato", "Lick", "Hook"],
    difficulty: "iniciante",
    audio: "RIFF"
  },
  {
    term: "Síncope",
    category: "Ritmo",
    definition: "Deslocamento do acento rítmico para um tempo fraco ou parte fraca do tempo.",
    example: "Acentuar o 'e' do '1 e 2 e' ao invés do '1' e '2'",
    related: ["Ritmo", "Acento", "Tempo"],
    difficulty: "intermediario",
    audio: "SÍN-ko-pe"
  },
  {
    term: "Staccato",
    category: "Articulação",
    definition: "Articulação curta e destacada, com notas separadas e breves.",
    example: "Notas tocadas de forma picada, com espaço entre elas",
    related: ["Legato", "Articulação", "Duração"],
    difficulty: "iniciante",
    audio: "sta-KA-to"
  },
  {
    term: "Tablatura",
    category: "Notação",
    definition: "Sistema de notação que indica a posição dos dedos no braço do instrumento.",
    example: "TAB de guitarra: 6 linhas representando as cordas com números dos trastes",
    related: ["Cifra", "Notação", "Partitura"],
    difficulty: "iniciante",
    audio: "ta-bla-TU-ra"
  },
  {
    term: "Tessitura",
    category: "Melodia",
    definition: "Extensão de notas que uma voz ou instrumento pode executar confortavelmente.",
    example: "A tessitura de um tenor vai aproximadamente de C3 a C5",
    related: ["Registro", "Extensão", "Voz"],
    difficulty: "intermediario",
    audio: "te-si-TU-ra"
  },
  {
    term: "Vibrato",
    category: "Técnica",
    definition: "Oscilação rápida e sutil da altura de uma nota para adicionar expressividade.",
    example: "Balançar o dedo na corda para criar variação de pitch",
    related: ["Expressão", "Ornamento", "Bend"],
    difficulty: "intermediario",
    audio: "vi-BRA-to"
  },
  {
    term: "Acorde Diminuto",
    category: "Harmonia",
    definition: "Acorde formado por tríade diminuta (fundamental, terça menor, quinta diminuta).",
    example: "Bdim = B + D + F (usado como acorde de passagem)",
    related: ["Tríade", "Acorde", "Dissonância"],
    difficulty: "intermediario",
    audio: "a-KOR-de di-mi-NU-to"
  },
  {
    term: "Acorde Aumentado",
    category: "Harmonia",
    definition: "Acorde formado por fundamental, terça maior e quinta aumentada.",
    example: "Caug = C + E + G# (som instável, cria tensão)",
    related: ["Tríade", "Tensão", "Alteração"],
    difficulty: "intermediario",
    audio: "a-KOR-de au-men-TA-do"
  },
  {
    term: "Acorde Suspenso (sus)",
    category: "Harmonia",
    definition: "Acorde que substitui a terça por segunda (sus2) ou quarta (sus4), criando ambiguidade tonal.",
    example: "Dsus4 = D + G + A (sem terça, suspende a definição maior/menor)",
    related: ["Acorde", "Tensão", "Resolução"],
    difficulty: "intermediario",
    audio: "a-KOR-de sus-PEN-so"
  },
  {
    term: "Armadura de Clave",
    category: "Notação",
    definition: "Conjunto de sustenidos ou bemóis no início da pauta que define a tonalidade.",
    example: "1 sustenido (F#) = G maior ou E menor",
    related: ["Tonalidade", "Clave", "Escala"],
    difficulty: "intermediario",
    audio: "ar-ma-DU-ra de KLA-ve"
  },
  {
    term: "Bend",
    category: "Técnica",
    definition: "Técnica de esticar a corda para elevar a altura da nota.",
    example: "Bend de 1 tom: esticar de G para A na mesma casa",
    related: ["Vibrato", "Expressão", "Blues"],
    difficulty: "intermediario",
    audio: "BEND"
  },
  {
    term: "Blue Note",
    category: "Escala",
    definition: "Nota cromática adicionada à escala pentatônica para criar o som característico do blues.",
    example: "Pentatônica menor + quinta diminuta (blue note)",
    related: ["Blues", "Pentatônica", "Cromatismo"],
    difficulty: "intermediario",
    audio: "BLU note"
  },
  {
    term: "BPM",
    category: "Ritmo",
    definition: "Batidas Por Minuto - unidade de medida da velocidade/andamento musical.",
    example: "60 BPM = 1 batida por segundo, 120 BPM = 2 batidas por segundo",
    related: ["Tempo", "Andamento", "Metrônomo"],
    difficulty: "iniciante",
    audio: "BPM (bê-pê-ÊME)"
  },
  {
    term: "Capotraste",
    category: "Técnica",
    definition: "Dispositivo que pressiona todas as cordas em um traste, elevando a afinação do instrumento.",
    example: "Capo na casa 2 transpõe tudo 1 tom acima",
    related: ["Transposição", "Afinação", "Tom"],
    difficulty: "iniciante",
    audio: "ka-po-TRAS-te"
  },
  {
    term: "Ciclo das Quintas",
    category: "Harmonia",
    definition: "Sequência circular das tonalidades organizadas por intervalos de quinta justa.",
    example: "C → G → D → A → E → B... (sentido horário adiciona sustenidos)",
    related: ["Tonalidade", "Quinta", "Armadura"],
    difficulty: "avancado",
    audio: "SI-klo das KIN-tas"
  },
  {
    term: "Dissonância",
    category: "Harmonia",
    definition: "Combinação de notas que soa instável ou tensa, pedindo resolução.",
    example: "Intervalo de segunda menor (C e C#) é muito dissonante",
    related: ["Consonância", "Tensão", "Resolução"],
    difficulty: "intermediario",
    audio: "di-so-NÂN-sia"
  },
  {
    term: "Consonância",
    category: "Harmonia",
    definition: "Combinação de notas que soa estável, agradável e em repouso.",
    example: "Terça maior, quinta justa são intervalos consonantes",
    related: ["Dissonância", "Intervalo", "Harmonia"],
    difficulty: "intermediario",
    audio: "kon-so-NÂN-sia"
  },
  {
    term: "Empréstimo Modal",
    category: "Harmonia",
    definition: "Uso de acordes de um modo paralelo (mesmo centro tonal) para enriquecer a harmonia.",
    example: "Em C maior, usar Fm (de C menor) = empréstimo modal",
    related: ["Modo", "Modulação", "Harmonia"],
    difficulty: "avancado",
    audio: "em-PRÉS-ti-mo mo-DAL"
  },
  {
    term: "Extensão",
    category: "Harmonia",
    definition: "Notas adicionadas além da sétima em acordes: nona (9), décima primeira (11), décima terceira (13).",
    example: "C9 = C7 + D (nona), C13 = C7 + A (décima terceira)",
    related: ["Tétrade", "Tensão", "Jazz"],
    difficulty: "avancado",
    audio: "ex-ten-SÃO"
  },
  {
    term: "Ligadura",
    category: "Notação",
    definition: "Linha curva que une duas ou mais notas, indicando execução legato ou soma de durações.",
    example: "Ligar duas colcheias = uma semínima",
    related: ["Legato", "Duração", "Frase"],
    difficulty: "iniciante",
    audio: "li-ga-DU-ra"
  },
  {
    term: "Métrica",
    category: "Ritmo",
    definition: "Organização dos pulsos em padrões regulares de tempos fortes e fracos.",
    example: "Métrica binária (2/4, 4/4), ternária (3/4, 6/8)",
    related: ["Compasso", "Pulso", "Tempo"],
    difficulty: "iniciante",
    audio: "MÉ-tri-ka"
  },
  {
    term: "Mordente",
    category: "Ornamento",
    definition: "Ornamento que alterna rapidamente entre a nota principal e sua vizinha.",
    example: "C → D → C (mordente superior rápido)",
    related: ["Trinado", "Ornamento", "Floreio"],
    difficulty: "intermediario",
    audio: "mor-DEN-te"
  },
  {
    term: "Nota de Passagem",
    category: "Melodia",
    definition: "Nota não pertencente ao acorde, usada para conectar duas notas do acorde por grau conjunto.",
    example: "C → (D) → E, onde D é nota de passagem entre C e E do acorde de C",
    related: ["Melodia", "Harmonia", "Bordadura"],
    difficulty: "intermediario",
    audio: "NO-ta de pa-SA-jem"
  },
  {
    term: "Pausa",
    category: "Ritmo",
    definition: "Símbolo que representa silêncio musical com duração específica.",
    example: "Pausa de semínima = silêncio de 1 tempo em 4/4",
    related: ["Ritmo", "Duração", "Compasso"],
    difficulty: "iniciante",
    audio: "PAU-za"
  },
  {
    term: "Polifonia",
    category: "Técnica",
    definition: "Textura musical com duas ou mais linhas melódicas independentes tocadas simultaneamente.",
    example: "Contraponto barroco, coral a 4 vozes",
    related: ["Contraponto", "Melodia", "Harmonia"],
    difficulty: "avancado",
    audio: "po-li-fo-NI-a"
  },
  {
    term: "Quiáltera",
    category: "Ritmo",
    definition: "Divisão irregular do tempo, como tercina (3 notas no tempo de 2).",
    example: "Tercina = 3 colcheias no tempo de 2 colcheias",
    related: ["Ritmo", "Compasso", "Subdivisão"],
    difficulty: "intermediario",
    audio: "ki-ÁL-te-ra"
  },
  {
    term: "Rubato",
    category: "Expressão",
    definition: "Liberdade expressiva de acelerar ou desacelerar temporariamente o andamento.",
    example: "Tocar uma frase com tempo mais livre, expressivo",
    related: ["Tempo", "Expressão", "Andamento"],
    difficulty: "intermediario",
    audio: "ru-BA-to"
  },
  {
    term: "Segunda Dominante",
    category: "Função Harmônica",
    definition: "Dominante (V7) de outro grau que não seja a tônica, acorde emprestado.",
    example: "Em C maior, A7 é V7/ii (segunda dominante que resolve em Dm)",
    related: ["Dominante", "Empréstimo Modal", "Tensão"],
    difficulty: "avancado",
    audio: "se-GUN-da do-mi-NAN-te"
  },
  {
    term: "Sétima Maior",
    category: "Harmonia",
    definition: "Intervalo de 11 semitons, ou acorde que contém este intervalo da fundamental.",
    example: "C7M = C + E + G + B (sétima maior, som estável e suave)",
    related: ["Tétrade", "Sétima", "Jazz"],
    difficulty: "intermediario",
    audio: "SÉ-ti-ma mai-OR"
  },
  {
    term: "Sétima Menor",
    category: "Harmonia",
    definition: "Intervalo de 10 semitons, característico do acorde dominante.",
    example: "G7 = G + B + D + F (sétima menor, cria tensão)",
    related: ["Dominante", "Tétrade", "V7"],
    difficulty: "intermediario",
    audio: "SÉ-ti-ma me-NOR"
  },
  {
    term: "Slide",
    category: "Técnica",
    definition: "Deslizar o dedo de uma nota para outra na mesma corda sem levantar.",
    example: "Slide de C (casa 3) para D (casa 5) na corda B",
    related: ["Glissando", "Legato", "Portamento"],
    difficulty: "iniciante",
    audio: "SLAI-de"
  },
  {
    term: "Subdivisão",
    category: "Ritmo",
    definition: "Divisão de cada tempo do compasso em partes menores.",
    example: "Subdividir semínima em 2 colcheias ou 4 semicolcheias",
    related: ["Compasso", "Tempo", "Ritmo"],
    difficulty: "iniciante",
    audio: "sub-di-vi-ZÃO"
  },
  {
    term: "Terça",
    category: "Intervalo",
    definition: "Intervalo que define se o acorde é maior (4 semitons) ou menor (3 semitons).",
    example: "C para E = terça maior (acorde maior), C para Eb = terça menor (acorde menor)",
    related: ["Intervalo", "Acorde", "Tríade"],
    difficulty: "iniciante",
    audio: "TER-sa"
  },
  {
    term: "Quinta",
    category: "Intervalo",
    definition: "Intervalo de 7 semitons (quinta justa), base da construção de acordes.",
    example: "C para G = quinta justa (intervalo muito consonante)",
    related: ["Intervalo", "Tríade", "Dominante"],
    difficulty: "iniciante",
    audio: "KIN-ta"
  },
  {
    term: "Trinado",
    category: "Ornamento",
    definition: "Alternância rápida entre a nota principal e a nota imediatamente acima.",
    example: "Alternar rapidamente entre E e F várias vezes",
    related: ["Ornamento", "Mordente", "Vibrato"],
    difficulty: "intermediario",
    audio: "tri-NA-do"
  },
  {
    term: "Turnaround",
    category: "Harmonia",
    definition: "Sequência de acordes que leva de volta ao início da progressão, comum no blues e jazz.",
    example: "I-VI-ii-V que volta para I (C-Am-Dm-G7-C)",
    related: ["Progressão", "Cadência", "Blues"],
    difficulty: "intermediario",
    audio: "TUR-na-raund"
  },
  {
    term: "Walking Bass",
    category: "Técnica",
    definition: "Linha de baixo que caminha cromaticamente ou diatonicamente conectando acordes.",
    example: "C → C# → D → D# → E (baixo caminhante cromático)",
    related: ["Baixo", "Contraponto", "Jazz"],
    difficulty: "intermediario",
    audio: "UÓ-king BEIS"
  },
  {
    term: "Acorde de Nona",
    category: "Harmonia",
    definition: "Acorde que adiciona a nona nota da escala (segunda oitavada) à tétrade.",
    example: "G9 = G + B + D + F + A (dominante com nona)",
    related: ["Extensão", "Tétrade", "Jazz"],
    difficulty: "avancado",
    audio: "a-KOR-de de NO-na"
  },
  {
    term: "Antecipação",
    category: "Melodia",
    definition: "Nota de um acorde que é tocada antes da mudança harmônica.",
    example: "Tocar a nota E antes do acorde de Am chegar",
    related: ["Melodia", "Sincope", "Ritmo"],
    difficulty: "intermediario",
    audio: "an-te-si-pa-SÃO"
  },
  {
    term: "Baixo Cifrado",
    category: "Notação",
    definition: "Sistema barroco de notação que indica acordes através de números sob a linha do baixo.",
    example: "Número 6 = acorde em primeira inversão",
    related: ["Notação", "Harmonia", "Barroco"],
    difficulty: "avancado",
    audio: "BAI-sho si-FRA-do"
  },
  {
    term: "Breque",
    category: "Técnica",
    definition: "Parada repentina de todos os instrumentos, criando efeito dramático.",
    example: "Silêncio súbito no meio da música antes de retomar",
    related: ["Pausa", "Dinâmica", "Arranjo"],
    difficulty: "iniciante",
    audio: "BRÊ-ke"
  },
  {
    term: "Escala Maior",
    category: "Escala",
    definition: "Escala diatônica com padrão T-T-S-T-T-T-S, base do sistema tonal ocidental.",
    example: "C maior: C D E F G A B (sem sustenidos ou bemóis)",
    related: ["Escala", "Tonalidade", "Campo Harmônico"],
    difficulty: "iniciante",
    audio: "es-KA-la mai-OR"
  },
  {
    term: "Escala Menor",
    category: "Escala",
    definition: "Escala com terça menor, existindo em três formas: natural, harmônica e melódica.",
    example: "A menor natural: A B C D E F G (relativa de C maior)",
    related: ["Escala", "Relativo", "Modo Eólio"],
    difficulty: "iniciante",
    audio: "es-KA-la me-NOR"
  },
  {
    term: "Harmônica Menor",
    category: "Escala",
    definition: "Escala menor com sétima maior, criando tensão característica para resolução.",
    example: "A harmônica: A B C D E F G# (sétima elevada)",
    related: ["Escala Menor", "Tensão", "Dominante"],
    difficulty: "intermediario",
    audio: "ar-MÔ-ni-ka me-NOR"
  },
  {
    term: "Melódica Menor",
    category: "Escala",
    definition: "Escala menor com sexta e sétima maiores ascendentes, voltando à natural descendente.",
    example: "A melódica subindo: A B C D E F# G#, descendo como natural",
    related: ["Escala Menor", "Modo", "Jazz"],
    difficulty: "avancado",
    audio: "me-LÓ-di-ka me-NOR"
  },
  {
    term: "Homofonia",
    category: "Técnica",
    definition: "Textura musical onde uma melodia principal é acompanhada por acordes.",
    example: "Voz cantando melodia com violão fazendo acordes",
    related: ["Textura", "Harmonia", "Melodia"],
    difficulty: "intermediario",
    audio: "o-mo-fo-NI-a"
  },
  {
    term: "Improviso",
    category: "Técnica",
    definition: "Criação musical espontânea, não escrita previamente, baseada em estrutura harmônica.",
    example: "Solo de guitarra improvisado sobre progressão de blues",
    related: ["Solo", "Pentatônica", "Jazz"],
    difficulty: "avancado",
    audio: "im-pro-VI-zo"
  },
  {
    term: "Mixolídio",
    category: "Modo",
    definition: "Quinto modo da escala maior, escala maior com sétima menor.",
    example: "G mixolídio: G A B C D E F (V grau de C maior)",
    related: ["Modo", "Dominante", "Blues"],
    difficulty: "avancado",
    audio: "mi-xo-LÍ-dio"
  },
  {
    term: "Dórico",
    category: "Modo",
    definition: "Segundo modo da escala maior, escala menor com sexta maior.",
    example: "D dórico: D E F G A B C (II grau de C maior)",
    related: ["Modo", "Escala Menor", "Jazz"],
    difficulty: "avancado",
    audio: "DÓ-ri-ko"
  },
  {
    term: "Palm Mute",
    category: "Técnica",
    definition: "Abafar levemente as cordas com a palma da mão para criar som percussivo.",
    example: "Técnica usada em ritmos de rock e metal",
    related: ["Técnica", "Ritmo", "Timbre"],
    difficulty: "iniciante",
    audio: "PALM MIU-te"
  },
  {
    term: "Pestana",
    category: "Técnica",
    definition: "Usar um dedo (geralmente indicador) para pressionar todas as cordas em um traste.",
    example: "Pestana na casa 1 para fazer acorde de F maior",
    related: ["Acorde", "Técnica", "Capotraste"],
    difficulty: "iniciante",
    audio: "pes-TA-na"
  },
  {
    term: "Quinta Justa",
    category: "Intervalo",
    definition: "Intervalo de 7 semitons, altamente consonante e base da harmonia tonal.",
    example: "C para G = quinta justa (3 tons e meio)",
    related: ["Intervalo", "Quinta", "Consonância"],
    difficulty: "iniciante",
    audio: "KIN-ta JUS-ta"
  },
  {
    term: "Rasgueado",
    category: "Técnica",
    definition: "Técnica de rasguear as cordas com movimento rápido dos dedos, típica do flamenco.",
    example: "Movimento explosivo dos dedos pelas cordas",
    related: ["Técnica", "Ritmo", "Flamenco"],
    difficulty: "intermediario",
    audio: "ras-ge-A-do"
  },
  {
    term: "Ritardando",
    category: "Expressão",
    definition: "Diminuir gradualmente a velocidade da música.",
    example: "Desacelerar nos últimos compassos para o final",
    related: ["Andamento", "Rubato", "Expressão"],
    difficulty: "iniciante",
    audio: "ri-tar-DAN-do"
  },
  {
    term: "Acelerando",
    category: "Expressão",
    definition: "Aumentar gradualmente a velocidade da música.",
    example: "Acelerar progressivamente para criar intensidade",
    related: ["Andamento", "Tempo", "Expressão"],
    difficulty: "iniciante",
    audio: "a-se-le-RAN-do"
  },
  {
    term: "Scordatura",
    category: "Técnica",
    definition: "Afinação alternativa do instrumento, diferente da afinação padrão.",
    example: "Afinar violão em Drop D (corda grave em D ao invés de E)",
    related: ["Afinação", "Open Tuning", "Técnica"],
    difficulty: "intermediario",
    audio: "skor-da-TU-ra"
  },
  {
    term: "Sweep Picking",
    category: "Técnica",
    definition: "Técnica de guitarra onde se varre a palheta por várias cordas em um movimento contínuo.",
    example: "Tocar arpejos rápidos varrendo a palheta",
    related: ["Arpejo", "Técnica", "Velocidade"],
    difficulty: "avancado",
    audio: "SUÍP PI-king"
  },
  {
    term: "Tapping",
    category: "Técnica",
    definition: "Técnica de martelar as cordas com dedos de ambas as mãos no braço do instrumento.",
    example: "Usar mão direita para martelar notas agudas",
    related: ["Hammer-on", "Técnica", "Legato"],
    difficulty: "avancado",
    audio: "TÉ-ping"
  },
  {
    term: "Timbre",
    category: "Conceito",
    definition: "Qualidade sonora característica que diferencia instrumentos e vozes.",
    example: "Mesmo tocando a mesma nota, violão e piano têm timbres diferentes",
    related: ["Som", "Harmônicos", "Textura"],
    difficulty: "iniciante",
    audio: "TIM-bre"
  },
  {
    term: "Trinado",
    category: "Ornamento",
    definition: "Alternância rápida e contínua entre duas notas adjacentes.",
    example: "Alternar rapidamente entre C e D por vários tempos",
    related: ["Mordente", "Ornamento", "Vibrato"],
    difficulty: "intermediario",
    audio: "tri-NA-do"
  },
  {
    term: "Acorde Power (Quinta)",
    category: "Harmonia",
    definition: "Acorde de duas notas: fundamental e quinta, sem terça (neutro, nem maior nem menor).",
    example: "C5 = C + G (muito usado em rock e metal)",
    related: ["Acorde", "Rock", "Distorção"],
    difficulty: "iniciante",
    audio: "a-KOR-de PÁ-uer"
  },
  {
    term: "Ciclo",
    category: "Harmonia",
    definition: "Sequência de acordes que se repete de forma cíclica ao longo da música.",
    example: "Ciclo de I-vi-IV-V que se repete infinitamente",
    related: ["Progressão", "Loop", "Ostinato"],
    difficulty: "iniciante",
    audio: "SI-klo"
  },
  {
    term: "Diatonismo",
    category: "Harmonia",
    definition: "Uso exclusivo das notas pertencentes à escala da tonalidade, sem alterações.",
    example: "Música em C maior usando apenas C D E F G A B",
    related: ["Escala", "Tonalidade", "Cromatismo"],
    difficulty: "intermediario",
    audio: "di-a-to-NIS-mo"
  },
  {
    term: "Levare",
    category: "Ritmo",
    definition: "Movimento preparatório do regente ou impulso antes do tempo forte.",
    example: "Gesto de preparação antes do primeiro tempo",
    related: ["Anacruse", "Tempo", "Compasso"],
    difficulty: "intermediario",
    audio: "le-VA-re"
  },
  {
    term: "Melodia",
    category: "Conceito",
    definition: "Sequência linear de notas organizadas no tempo, a 'voz principal' da música.",
    example: "A linha vocal de uma canção é a melodia principal",
    related: ["Harmonia", "Ritmo", "Frase"],
    difficulty: "iniciante",
    audio: "me-lo-DI-a"
  },
  {
    term: "Acorde Meio-Diminuto",
    category: "Harmonia",
    definition: "Acorde menor com quinta diminuta e sétima menor (viiø no campo harmônico maior).",
    example: "Bm7(b5) em C maior = B + D + F + A",
    related: ["Diminuto", "Tétrade", "Sétima"],
    difficulty: "avancado",
    audio: "a-KOR-de MEI-o di-mi-NU-to"
  },
  {
    term: "Anacruse Harmônica",
    category: "Harmonia",
    definition: "Acorde que antecede o início do compasso forte, criando impulso harmônico.",
    example: "Acorde V antes do compasso que começa com I",
    related: ["Anacruse", "Cadência", "Dominante"],
    difficulty: "avancado",
    audio: "a-na-KRU-ze ar-MÔ-ni-ka"
  },
  {
    term: "Bordadura",
    category: "Melodia",
    definition: "Nota ornamental que sai e volta para a nota principal por grau conjunto.",
    example: "C → D → C (bordadura superior) ou C → B → C (bordadura inferior)",
    related: ["Nota de Passagem", "Ornamento", "Melodia"],
    difficulty: "intermediario",
    audio: "bor-da-DU-ra"
  },
  {
    term: "Grau Conjunto",
    category: "Melodia",
    definition: "Movimento melódico por notas adjacentes da escala (segundas).",
    example: "C → D → E (movimento por grau conjunto ascendente)",
    related: ["Intervalo", "Melodia", "Segunda"],
    difficulty: "iniciante",
    audio: "GRAU kon-JUN-to"
  },
  {
    term: "Salto",
    category: "Melodia",
    definition: "Movimento melódico por intervalo maior que segunda (terça ou mais).",
    example: "C → E (terça) ou C → G (quinta) são saltos",
    related: ["Intervalo", "Melodia", "Grau Conjunto"],
    difficulty: "iniciante",
    audio: "SAL-to"
  },
  {
    term: "Cadência Plagal",
    category: "Harmonia",
    definition: "Progressão IV → I, conhecida como 'cadência de amém' pela sonoridade conclusiva suave.",
    example: "F → C em tonalidade de C maior",
    related: ["Cadência", "Subdominante", "Tônica"],
    difficulty: "intermediario",
    audio: "ka-DÊN-sia pla-GAL"
  },
  {
    term: "Cadência Deceptiva",
    category: "Harmonia",
    definition: "Dominante que resolve em acorde diferente da tônica, geralmente vi.",
    example: "V → vi (G → Am em C maior) surpreende a expectativa",
    related: ["Cadência", "Dominante", "Relativo"],
    difficulty: "avancado",
    audio: "ka-DÊN-sia de-sep-TI-va"
  },
  {
    term: "Paralelismo",
    category: "Harmonia",
    definition: "Movimento de acordes mantendo a mesma estrutura/qualidade em alturas diferentes.",
    example: "C → D → E (todos maiores em paralelo)",
    related: ["Voicing", "Harmonia", "Movimento"],
    difficulty: "intermediario",
    audio: "pa-ra-le-LIS-mo"
  },
  {
    term: "Retardo",
    category: "Harmonia",
    definition: "Nota que permanece do acorde anterior criando dissonância antes de resolver.",
    example: "Manter C quando acorde muda para G, depois resolver em B",
    related: ["Suspensão", "Tensão", "Resolução"],
    difficulty: "avancado",
    audio: "re-TAR-do"
  },
  {
    term: "Apogiatura",
    category: "Ornamento",
    definition: "Nota ornamental breve que precede a nota principal, geralmente por grau conjunto.",
    example: "Nota rápida antes da nota real do acorde",
    related: ["Ornamento", "Appoggiatura", "Floreio"],
    difficulty: "intermediario",
    audio: "a-po-ja-TU-ra"
  }
];

const CATEGORIES = [...new Set(DICTIONARY.map(item => item.category))].sort();

const categoryColors = {
  "Harmonia": "bg-purple-100 text-purple-800 border-purple-200",
  "Melodia": "bg-blue-100 text-blue-800 border-blue-200",
  "Ritmo": "bg-green-100 text-green-800 border-green-200",
  "Técnica": "bg-orange-100 text-orange-800 border-orange-200",
  "Notação": "bg-pink-100 text-pink-800 border-pink-200",
  "Conceito": "bg-amber-100 text-amber-800 border-amber-200",
  "Função Harmônica": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Escala": "bg-teal-100 text-teal-800 border-teal-200",
  "Intervalo": "bg-rose-100 text-rose-800 border-rose-200",
  "Forma": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Expressão": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Articulação": "bg-lime-100 text-lime-800 border-lime-200",
  "Ornamento": "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200"
};

const difficultyColors = {
  "iniciante": "bg-green-500",
  "intermediario": "bg-yellow-500",
  "avancado": "bg-red-500"
};

const difficultyLabels = {
  "iniciante": "Iniciante",
  "intermediario": "Intermediário",
  "avancado": "Avançado"
};

export default function MusicDictionary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [sortBy, setSortBy] = useState("alpha");
  const [expandedTerm, setExpandedTerm] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [copiedTerm, setCopiedTerm] = useState(null);
  const [activeTab, setActiveTab] = useState("dictionary");

  // Carregar favoritos e histórico do localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('musicDictFavorites');
    const savedRecent = localStorage.getItem('musicDictRecent');
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedRecent) setRecentSearches(JSON.parse(savedRecent));
  }, []);

  // Salvar favoritos
  useEffect(() => {
    localStorage.setItem('musicDictFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Salvar histórico
  useEffect(() => {
    localStorage.setItem('musicDictRecent', JSON.stringify(recentSearches));
  }, [recentSearches]);

  const toggleFavorite = (term) => {
    if (favorites.includes(term)) {
      setFavorites(favorites.filter(f => f !== term));
    } else {
      setFavorites([...favorites, term]);
    }
  };

  const addToRecent = (term) => {
    const newRecent = [term, ...recentSearches.filter(r => r !== term)].slice(0, 10);
    setRecentSearches(newRecent);
  };

  const copyToClipboard = (item) => {
    const text = `${item.term}: ${item.definition}\n\nExemplo: ${item.example}`;
    navigator.clipboard.writeText(text);
    setCopiedTerm(item.term);
    setTimeout(() => setCopiedTerm(null), 2000);
  };

  const filteredTerms = DICTIONARY.filter(item => {
    const matchesSearch = 
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.example.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || item.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  }).sort((a, b) => {
    if (sortBy === "alpha") return a.term.localeCompare(b.term);
    if (sortBy === "category") return a.category.localeCompare(b.category);
    if (sortBy === "difficulty") {
      const order = { iniciante: 0, intermediario: 1, avancado: 2 };
      return order[a.difficulty] - order[b.difficulty];
    }
    return 0;
  });

  const favoriteTerms = DICTIONARY.filter(item => favorites.includes(item.term));

  const stats = {
    total: DICTIONARY.length,
    categories: CATEGORIES.length,
    favorites: favorites.length,
    byDifficulty: {
      iniciante: DICTIONARY.filter(d => d.difficulty === "iniciante").length,
      intermediario: DICTIONARY.filter(d => d.difficulty === "intermediario").length,
      avancado: DICTIONARY.filter(d => d.difficulty === "avancado").length
    }
  };

  const renderTermCard = (item, index) => (
    <motion.div
      key={item.term}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.02 }}
    >
      <Card 
        className={`border-[#D4C5B0] bg-white/80 cursor-pointer transition-all hover:shadow-lg ${
          expandedTerm === item.term ? 'ring-2 ring-[#8B6F47]' : ''
        }`}
        onClick={() => {
          setExpandedTerm(expandedTerm === item.term ? null : item.term);
          addToRecent(item.term);
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-xl font-bold text-[#8B6F47]">{item.term}</h3>
                <Badge className={categoryColors[item.category] || "bg-gray-100"}>
                  {item.category}
                </Badge>
                <div className={`w-2 h-2 rounded-full ${difficultyColors[item.difficulty]}`} title={difficultyLabels[item.difficulty]} />
              </div>
              <p className="text-[#A68A64]">{item.definition}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item.term);
                }}
              >
                {favorites.includes(item.term) ? (
                  <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                ) : (
                  <StarOff className="w-4 h-4 text-[#A68A64]" />
                )}
              </Button>
              <Music2 className={`w-5 h-5 text-[#D4AF37] transition-transform ${
                expandedTerm === item.term ? 'rotate-180' : ''
              }`} />
            </div>
          </div>

          <AnimatePresence>
            {expandedTerm === item.term && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-[#D4C5B0]">
                  {/* Pronúncia */}
                  {item.audio && (
                    <div className="mb-3 p-2 bg-[#8B6F47]/10 rounded-lg inline-flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-[#8B6F47]" />
                      <span className="text-sm font-mono text-[#8B6F47]">{item.audio}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-[#9CAF88]/10 rounded-lg border border-[#9CAF88]/30">
                      <p className="text-xs text-[#9CAF88] font-medium mb-1">EXEMPLO</p>
                      <p className="text-sm text-[#8B6F47] font-mono">{item.example}</p>
                    </div>
                    
                    <div className="p-3 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/30">
                      <p className="text-xs text-[#D4AF37] font-medium mb-1">TERMOS RELACIONADOS</p>
                      <div className="flex gap-1 flex-wrap">
                        {item.related.map(rel => (
                          <Badge 
                            key={rel} 
                            variant="outline" 
                            className="text-xs cursor-pointer hover:bg-[#8B6F47] hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery(rel);
                              setSelectedCategory("all");
                            }}
                          >
                            {rel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 mt-4">
                    <Badge className={`${difficultyColors[item.difficulty]} text-white`}>
                      {difficultyLabels[item.difficulty]}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item);
                      }}
                    >
                      {copiedTerm === item.term ? (
                        <><Check className="w-3 h-3 mr-1" /> Copiado!</>
                      ) : (
                        <><Copy className="w-3 h-3 mr-1" /> Copiar</>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2 flex items-center gap-3">
            <BookOpen className="w-10 h-10" />
            Dicionário Musical
          </h1>
          <p className="text-[#A68A64]">
            {stats.total} termos musicais com explicações, exemplos e pronúncia
          </p>
        </motion.div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-4 text-center">
              <Hash className="w-6 h-6 text-[#8B6F47] mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#8B6F47]">{stats.total}</p>
              <p className="text-xs text-[#A68A64]">Termos</p>
            </CardContent>
          </Card>
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-4 text-center">
              <ListMusic className="w-6 h-6 text-[#9CAF88] mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#9CAF88]">{stats.categories}</p>
              <p className="text-xs text-[#A68A64]">Categorias</p>
            </CardContent>
          </Card>
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 text-[#D4AF37] mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#D4AF37]">{stats.favorites}</p>
              <p className="text-xs text-[#A68A64]">Favoritos</p>
            </CardContent>
          </Card>
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-4 text-center">
              <GraduationCap className="w-6 h-6 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-purple-500">{stats.byDifficulty.avancado}</p>
              <p className="text-xs text-[#A68A64]">Avançados</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-[#E8DCC4] p-1 rounded-xl flex-wrap h-auto">
            <TabsTrigger 
              value="dictionary" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#8B6F47] data-[state=active]:to-[#A68A64] data-[state=active]:text-white"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Dicionário
            </TabsTrigger>
            <TabsTrigger 
              value="favorites" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#D4AF37] data-[state=active]:to-[#9CAF88] data-[state=active]:text-white"
            >
              <Star className="w-4 h-4 mr-2" />
              Favoritos ({favorites.length})
            </TabsTrigger>
            <TabsTrigger 
              value="recent" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#A68A64] data-[state=active]:to-[#8B6F47] data-[state=active]:text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              Recentes
            </TabsTrigger>
            <TabsTrigger 
              value="quiz" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              <Brain className="w-4 h-4 mr-2" />
              Quiz
            </TabsTrigger>
            <TabsTrigger 
              value="exercises" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <Dumbbell className="w-4 h-4 mr-2" />
              Exercícios
            </TabsTrigger>
          </TabsList>

          {/* Tab Dicionário */}
          <TabsContent value="dictionary">
            {/* Busca e Filtros */}
            <Card className="border-[#D4C5B0] bg-white/80 mb-6">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A68A64]" />
                    <Input
                      placeholder="Buscar termo, definição ou exemplo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-[#D4C5B0]"
                    />
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-3">
                    {/* Filtro de Categoria */}
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full md:w-[200px] border-[#D4C5B0]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Filtro de Dificuldade */}
                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                      <SelectTrigger className="w-full md:w-[180px] border-[#D4C5B0]">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Dificuldade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="iniciante">Iniciante</SelectItem>
                        <SelectItem value="intermediario">Intermediário</SelectItem>
                        <SelectItem value="avancado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Ordenação */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full md:w-[180px] border-[#D4C5B0]">
                        <SortAsc className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alpha">Alfabética</SelectItem>
                        <SelectItem value="category">Por Categoria</SelectItem>
                        <SelectItem value="difficulty">Por Dificuldade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Badges de categoria rápida */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      className={`cursor-pointer transition-all ${
                        selectedCategory === "all"
                          ? "bg-[#8B6F47] text-white"
                          : "bg-white text-[#8B6F47] border border-[#8B6F47] hover:bg-[#8B6F47]/10"
                      }`}
                      onClick={() => setSelectedCategory("all")}
                    >
                      Todos
                    </Badge>
                    {CATEGORIES.slice(0, 6).map(cat => (
                      <Badge
                        key={cat}
                        className={`cursor-pointer transition-all ${
                          selectedCategory === cat
                            ? "bg-[#8B6F47] text-white"
                            : `${categoryColors[cat] || "bg-gray-100 text-gray-800"} hover:opacity-80`
                        }`}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contagem */}
            <p className="text-sm text-[#A68A64] mb-4">
              {filteredTerms.length} {filteredTerms.length === 1 ? 'termo encontrado' : 'termos encontrados'}
            </p>

            {/* Lista de Termos */}
            <div className="space-y-3">
              <AnimatePresence>
                {filteredTerms.map((item, index) => renderTermCard(item, index))}
              </AnimatePresence>
            </div>

            {filteredTerms.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <BookOpen className="w-16 h-16 text-[#D4C5B0] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#8B6F47] mb-2">Nenhum termo encontrado</h3>
                <p className="text-[#A68A64]">Tente outra busca, categoria ou dificuldade</p>
              </motion.div>
            )}
          </TabsContent>

          {/* Tab Favoritos */}
          <TabsContent value="favorites">
            {favoriteTerms.length > 0 ? (
              <div className="space-y-3">
                {favoriteTerms.map((item, index) => renderTermCard(item, index))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Star className="w-16 h-16 text-[#D4C5B0] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#8B6F47] mb-2">Nenhum favorito ainda</h3>
                <p className="text-[#A68A64]">Clique na estrela ⭐ nos termos para salvar seus favoritos</p>
              </motion.div>
            )}
          </TabsContent>

          {/* Tab Recentes */}
          <TabsContent value="recent">
            {recentSearches.length > 0 ? (
              <div className="space-y-3">
                {recentSearches.map((term, index) => {
                  const item = DICTIONARY.find(d => d.term === term);
                  if (!item) return null;
                  return renderTermCard(item, index);
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Clock className="w-16 h-16 text-[#D4C5B0] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#8B6F47] mb-2">Nenhuma consulta recente</h3>
                <p className="text-[#A68A64]">Seus termos consultados aparecerão aqui</p>
              </motion.div>
            )}
          </TabsContent>

          {/* Tab Quiz */}
          <TabsContent value="quiz">
            <MusicTheoryQuiz />
          </TabsContent>

          {/* Tab Exercícios */}
          <TabsContent value="exercises">
            <InteractiveExercises />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}