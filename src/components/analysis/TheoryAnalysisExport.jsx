import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Music2, Key, Layers, GitBranch, Download, Printer, FileText, 
  Sparkles, TrendingUp, Info, BookOpen, Award, ArrowRight 
} from "lucide-react";
import { motion } from "framer-motion";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALE_FORMULAS = {
  maior: { intervals: [0, 2, 4, 5, 7, 9, 11], name: "Maior (Jônio)", character: "Alegre, brilhante" },
  menor_natural: { intervals: [0, 2, 3, 5, 7, 8, 10], name: "Menor Natural (Eólio)", character: "Melancólico, triste" },
  menor_harmonica: { intervals: [0, 2, 3, 5, 7, 8, 11], name: "Menor Harmônica", character: "Dramático, oriental" },
  dorico: { intervals: [0, 2, 3, 5, 7, 9, 10], name: "Dórico", character: "Menor com brilho, jazzístico" },
  mixolidio: { intervals: [0, 2, 4, 5, 7, 9, 10], name: "Mixolídio", character: "Bluesy, dominante" },
  frigio: { intervals: [0, 1, 3, 5, 7, 8, 10], name: "Frígio", character: "Espanhol, tenso" },
  lidio: { intervals: [0, 2, 4, 6, 7, 9, 11], name: "Lídio", character: "Sonhador, etéreo" }
};

const CHORD_QUALITIES = {
  maior: ["", "m", "m", "", "", "m", "°"],
  menor_natural: ["m", "°", "", "m", "m", "", ""],
  dorico: ["m", "m", "", "", "m", "°", ""],
  mixolidio: ["", "m", "°", "", "m", "m", ""],
};

const HARMONIC_FUNCTIONS = {
  'I': { function: 'Tônica', role: 'Repouso', color: 'bg-green-500' },
  'i': { function: 'Tônica', role: 'Repouso', color: 'bg-green-500' },
  'II': { function: 'Subdominante', role: 'Preparação', color: 'bg-blue-500' },
  'ii': { function: 'Subdominante', role: 'Preparação', color: 'bg-blue-500' },
  'III': { function: 'Tônica/Mediante', role: 'Extensão', color: 'bg-green-400' },
  'iii': { function: 'Tônica/Mediante', role: 'Extensão', color: 'bg-green-400' },
  'IV': { function: 'Subdominante', role: 'Movimento', color: 'bg-blue-500' },
  'iv': { function: 'Subdominante', role: 'Movimento', color: 'bg-blue-500' },
  'V': { function: 'Dominante', role: 'Tensão', color: 'bg-red-500' },
  'V7': { function: 'Dominante', role: 'Tensão máxima', color: 'bg-red-600' },
  'VI': { function: 'Tônica/Relativa', role: 'Variação', color: 'bg-green-400' },
  'vi': { function: 'Tônica/Relativa', role: 'Variação', color: 'bg-green-400' },
  'VII': { function: 'Dominante', role: 'Tensão', color: 'bg-red-400' },
  'vii°': { function: 'Dominante', role: 'Tensão', color: 'bg-red-400' },
};

export default function TheoryAnalysisExport({ song, progressions, mainKey }) {
  const [activeTab, setActiveTab] = useState("overview");

  // Análise de escalas e modos
  const scaleAnalysis = useMemo(() => {
    if (!progressions || progressions.length === 0 || !mainKey) return null;

    // Coleta todos os acordes únicos
    const allChords = new Set();
    progressions.forEach(prog => {
      if (Array.isArray(prog.chords)) {
        prog.chords.forEach(chord => allChords.add(chord));
      }
    });

    // Extrai notas dos acordes
    const extractRoot = (chord) => {
      const match = chord.match(/^([A-G][#b]?)/);
      return match ? match[1] : null;
    };

    const chordRoots = [...allChords].map(extractRoot).filter(Boolean);
    const uniqueRoots = [...new Set(chordRoots)];

    // Detecta escala mais provável
    const keyIndex = NOTES.indexOf(mainKey.replace('m', ''));
    const isMinor = mainKey.includes('m');

    // Verifica compatibilidade com escalas
    const scaleMatches = [];
    Object.entries(SCALE_FORMULAS).forEach(([scaleKey, scaleData]) => {
      const scaleNotes = scaleData.intervals.map(i => NOTES[(keyIndex + i) % 12]);
      const matchCount = uniqueRoots.filter(root => scaleNotes.includes(root)).length;
      const matchPercent = (matchCount / uniqueRoots.length) * 100;
      
      if (matchPercent >= 70) {
        scaleMatches.push({
          key: scaleKey,
          name: scaleData.name,
          character: scaleData.character,
          notes: scaleNotes,
          matchPercent: Math.round(matchPercent)
        });
      }
    });

    // Ordena por compatibilidade
    scaleMatches.sort((a, b) => b.matchPercent - a.matchPercent);

    return {
      detectedKey: mainKey,
      isMinor,
      allChords: [...allChords],
      uniqueRoots,
      possibleScales: scaleMatches,
      primaryScale: scaleMatches[0] || null
    };
  }, [progressions, mainKey]);

  // Análise de funções harmônicas
  const harmonicAnalysis = useMemo(() => {
    if (!progressions || progressions.length === 0) return null;

    const functions = { tonica: 0, subdominante: 0, dominante: 0 };
    const movements = [];
    const patterns = [];

    progressions.forEach(prog => {
      if (!prog.pattern) return;
      
      const degrees = prog.pattern.split('-').filter(d => d);
      patterns.push({
        section: prog.section,
        degrees,
        name: prog.progression_name
      });

      degrees.forEach((degree, idx) => {
        const cleanDegree = degree.replace(/7|°/g, '').toUpperCase();
        const funcInfo = HARMONIC_FUNCTIONS[cleanDegree] || HARMONIC_FUNCTIONS[degree];
        
        if (funcInfo) {
          if (funcInfo.function.includes('Tônica')) functions.tonica++;
          else if (funcInfo.function.includes('Subdominante')) functions.subdominante++;
          else if (funcInfo.function.includes('Dominante')) functions.dominante++;
        }

        // Analisa movimento
        if (idx > 0) {
          movements.push({
            from: degrees[idx - 1],
            to: degree,
            section: prog.section
          });
        }
      });
    });

    // Calcula proporções
    const total = functions.tonica + functions.subdominante + functions.dominante;
    const proportions = total > 0 ? {
      tonica: Math.round((functions.tonica / total) * 100),
      subdominante: Math.round((functions.subdominante / total) * 100),
      dominante: Math.round((functions.dominante / total) * 100)
    } : { tonica: 0, subdominante: 0, dominante: 0 };

    // Identifica cadências COM a seção onde ocorrem
    const cadences = [];
    movements.forEach(mov => {
      if (mov.to === 'I' || mov.to === 'i') {
        if (mov.from === 'V' || mov.from === 'V7') {
          cadences.push({ type: 'Autêntica Perfeita', from: mov.from, to: mov.to, section: mov.section });
        } else if (mov.from === 'IV' || mov.from === 'iv') {
          cadences.push({ type: 'Plagal', from: mov.from, to: mov.to, section: mov.section });
        } else if (mov.from === 'vii°' || mov.from === 'VII') {
          cadences.push({ type: 'Autêntica Imperfeita', from: mov.from, to: mov.to, section: mov.section });
        }
      }
      if ((mov.from === 'I' || mov.from === 'i') && (mov.to === 'V' || mov.to === 'V7')) {
        cadences.push({ type: 'Semi-cadência', from: mov.from, to: mov.to, section: mov.section });
      }
    });

    // Agrupa cadências por tipo mas mantém todas as seções
    const groupedCadences = {};
    cadences.forEach(c => {
      if (!groupedCadences[c.type]) {
        groupedCadences[c.type] = { type: c.type, from: c.from, to: c.to, sections: [] };
      }
      if (c.section && !groupedCadences[c.type].sections.includes(c.section)) {
        groupedCadences[c.type].sections.push(c.section);
      }
    });

    return {
      functions,
      proportions,
      movements,
      cadences: Object.values(groupedCadences),
      patterns
    };
  }, [progressions]);

  // Insights teóricos
  const insights = useMemo(() => {
    const result = [];
    
    if (scaleAnalysis?.primaryScale) {
      result.push({
        title: "Escala Principal",
        content: `A música está predominantemente na escala ${scaleAnalysis.primaryScale.name} em ${mainKey}. ${scaleAnalysis.primaryScale.character}.`,
        type: "scale"
      });
    }

    if (harmonicAnalysis) {
      const dominant = Object.entries(harmonicAnalysis.proportions)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (dominant[0] === 'tonica') {
        result.push({
          title: "Estabilidade Harmônica",
          content: "A música tem alta estabilidade tonal com predominância de função tônica, criando sensação de repouso e resolução frequente.",
          type: "harmony"
        });
      } else if (dominant[0] === 'dominante') {
        result.push({
          title: "Tensão Harmônica",
          content: "A música utiliza bastante tensão através de acordes dominantes, criando expectativa e movimento constante.",
          type: "harmony"
        });
      }

      if (harmonicAnalysis.cadences.length > 0) {
        const cadenceDetails = harmonicAnalysis.cadences.map(c => {
          const sections = c.sections?.length > 0 ? ` (em: ${c.sections.join(', ')})` : '';
          return `${c.type}${sections}`;
        }).join('; ');
        result.push({
          title: "Cadências Identificadas",
          content: `Foram encontradas as seguintes cadências: ${cadenceDetails}. Elas definem os pontos de resolução e estrutura da música.`,
          type: "cadence"
        });
      }
    }

    // Análise de progressões
    if (progressions?.length > 0) {
      const namedProgressions = progressions.filter(p => p.progression_name);
      if (namedProgressions.length > 0) {
        const names = [...new Set(namedProgressions.map(p => p.progression_name))];
        result.push({
          title: "Progressões Reconhecidas",
          content: `A música utiliza progressões conhecidas: ${names.join(', ')}. Isso indica uma estrutura harmônica tradicional e acessível.`,
          type: "progression"
        });
      }
    }

    return result;
  }, [scaleAnalysis, harmonicAnalysis, progressions, mainKey]);

  // Exportar análise como CSV
  const exportAsCSV = () => {
    // CSV com múltiplas seções
    let csvContent = '';
    
    // Seção 1: Informações Gerais
    csvContent += 'INFORMAÇÕES GERAIS\n';
    csvContent += 'Campo,Valor\n';
    csvContent += `Título,"${song?.title || 'N/A'}"\n`;
    csvContent += `Artista,"${song?.artist || 'N/A'}"\n`;
    csvContent += `Tonalidade,"${mainKey || 'N/A'}"\n`;
    csvContent += `Escala Principal,"${scaleAnalysis?.primaryScale?.name || 'N/A'}"\n`;
    csvContent += `Caráter,"${scaleAnalysis?.primaryScale?.character || 'N/A'}"\n`;
    csvContent += `Total de Progressões,${progressions?.length || 0}\n`;
    csvContent += '\n';

    // Seção 2: Funções Harmônicas
    csvContent += 'FUNÇÕES HARMÔNICAS\n';
    csvContent += 'Função,Porcentagem,Ocorrências\n';
    csvContent += `Tônica,${harmonicAnalysis?.proportions?.tonica || 0}%,${harmonicAnalysis?.functions?.tonica || 0}\n`;
    csvContent += `Subdominante,${harmonicAnalysis?.proportions?.subdominante || 0}%,${harmonicAnalysis?.functions?.subdominante || 0}\n`;
    csvContent += `Dominante,${harmonicAnalysis?.proportions?.dominante || 0}%,${harmonicAnalysis?.functions?.dominante || 0}\n`;
    csvContent += '\n';

    // Seção 3: Escalas Compatíveis
    csvContent += 'ESCALAS COMPATÍVEIS\n';
    csvContent += 'Escala,Compatibilidade,Caráter,Notas\n';
    scaleAnalysis?.possibleScales?.forEach(scale => {
      csvContent += `"${scale.name}",${scale.matchPercent}%,"${scale.character}","${scale.notes.join(' ')}"\n`;
    });
    csvContent += '\n';

    // Seção 4: Cadências
    csvContent += 'CADÊNCIAS IDENTIFICADAS\n';
    csvContent += 'Tipo,De,Para,Seções\n';
    harmonicAnalysis?.cadences?.forEach(cad => {
      const sections = cad.sections?.length > 0 ? cad.sections.join('; ') : 'N/A';
      csvContent += `"${cad.type}",${cad.from},${cad.to},"${sections}"\n`;
    });
    csvContent += '\n';

    // Seção 5: Progressões por Seção
    csvContent += 'PROGRESSÕES POR SEÇÃO\n';
    csvContent += 'Seção,Acordes,Pattern,Progressão Identificada,Tonalidade\n';
    progressions?.forEach(prog => {
      const chords = Array.isArray(prog.chords) ? prog.chords.join(' ') : (prog.chords || '');
      csvContent += `"${prog.section || 'N/A'}","${chords}","${prog.pattern || 'N/A'}","${prog.progression_name || 'N/A'}","${prog.key || 'N/A'}"\n`;
    });
    csvContent += '\n';

    // Seção 6: Acordes Utilizados
    csvContent += 'ACORDES UTILIZADOS\n';
    csvContent += 'Acorde\n';
    scaleAnalysis?.allChords?.forEach(chord => {
      csvContent += `${chord}\n`;
    });
    csvContent += '\n';

    // Seção 7: Insights
    csvContent += 'INSIGHTS TEÓRICOS\n';
    csvContent += 'Título,Descrição\n';
    insights?.forEach(insight => {
      csvContent += `"${insight.title}","${insight.content.replace(/"/g, '""')}"\n`;
    });

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-${song?.title?.replace(/\s+/g, '-') || 'musica'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exportar análise como texto
  const exportAsText = () => {
    let content = `
═══════════════════════════════════════════════════════════════
ANÁLISE TEÓRICA MUSICAL
${song?.title || 'Música'} - ${song?.artist || 'Artista'}
═══════════════════════════════════════════════════════════════

📊 RESUMO GERAL
───────────────────────────────────────────────────────────────
Tonalidade: ${mainKey || 'N/A'}
Escala Principal: ${scaleAnalysis?.primaryScale?.name || 'N/A'}
Caráter: ${scaleAnalysis?.primaryScale?.character || 'N/A'}

🎵 ESCALAS E MODOS DETECTADOS
───────────────────────────────────────────────────────────────
${scaleAnalysis?.possibleScales?.map(s => `• ${s.name} (${s.matchPercent}% compatível)`).join('\n') || 'Nenhuma escala identificada'}

🎼 FUNÇÕES HARMÔNICAS
───────────────────────────────────────────────────────────────
Tônica: ${harmonicAnalysis?.proportions?.tonica || 0}%
Subdominante: ${harmonicAnalysis?.proportions?.subdominante || 0}%
Dominante: ${harmonicAnalysis?.proportions?.dominante || 0}%

🔄 CADÊNCIAS IDENTIFICADAS
───────────────────────────────────────────────────────────────
${harmonicAnalysis?.cadences?.map(c => {
  const sections = c.sections?.length > 0 ? ` [Seções: ${c.sections.join(', ')}]` : '';
  return `• ${c.type}: ${c.from} → ${c.to}${sections}`;
}).join('\n') || 'Nenhuma cadência identificada'}

📝 PROGRESSÕES POR SEÇÃO
───────────────────────────────────────────────────────────────
${progressions?.map(p => `${p.section || 'Seção'}: ${p.pattern || 'N/A'} ${p.progression_name ? `(${p.progression_name})` : ''}`).join('\n') || 'Nenhuma progressão'}

💡 INSIGHTS TEÓRICOS
───────────────────────────────────────────────────────────────
${insights?.map(i => `${i.title}: ${i.content}`).join('\n\n') || 'Nenhum insight disponível'}

═══════════════════════════════════════════════════════════════
Gerado por Tropeiros do Bebedouro - ${new Date().toLocaleDateString('pt-BR')}
═══════════════════════════════════════════════════════════════
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-${song?.title?.replace(/\s+/g, '-') || 'musica'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Imprimir análise como PDF visual
  const printAnalysis = () => {
    const printWindow = window.open('', '_blank');
    
    // Gera HTML das escalas compatíveis
    const scalesHtml = scaleAnalysis?.possibleScales?.map((scale, idx) => `
      <div class="scale-card ${idx === 0 ? 'primary' : ''}">
        <div class="scale-header">
          ${idx === 0 ? '<span class="badge gold">★ Principal</span>' : ''}
          <span class="scale-name">${scale.name}</span>
          <span class="badge">${scale.matchPercent}%</span>
        </div>
        <p class="scale-character">${scale.character}</p>
        <div class="notes-row">
          ${scale.notes.map(n => `<span class="note">${n}</span>`).join('')}
        </div>
      </div>
    `).join('') || '<p class="empty">Nenhuma escala identificada</p>';

    // Gera HTML das progressões
    const progressionsHtml = progressions?.map(p => `
      <tr>
        <td><strong>${p.section || 'N/A'}</strong></td>
        <td class="chords">${Array.isArray(p.chords) ? p.chords.join(' - ') : (p.chords || 'N/A')}</td>
        <td class="pattern">${p.pattern || 'N/A'}</td>
        <td>${p.progression_name ? `<span class="badge green">${p.progression_name}</span>` : '-'}</td>
      </tr>
    `).join('') || '<tr><td colspan="4">Nenhuma progressão</td></tr>';

    // Gera HTML dos acordes
    const chordsHtml = scaleAnalysis?.allChords?.map(c => `<span class="chord-badge">${c}</span>`).join('') || '';

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Análise Teórica - ${song?.title || 'Música'}</title>
          <style>
            @page { margin: 1cm; size: A4; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; 
              color: #333; 
              background: #fff; 
              font-size: 11px; 
              line-height: 1.5;
              padding: 20px;
            }
            
            .header {
              background: linear-gradient(135deg, #8B6F47 0%, #A68A64 50%, #D4AF37 100%);
              color: white;
              padding: 25px;
              border-radius: 12px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              gap: 20px;
            }
            .logo { width: 70px; height: 70px; border-radius: 50%; background: white; padding: 5px; }
            .header-text { flex: 1; }
            .title { font-size: 26px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { font-size: 16px; opacity: 0.9; }
            .header-meta { font-size: 12px; opacity: 0.8; margin-top: 10px; }
            
            .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
            .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
            
            .card {
              background: #f8f6f3;
              border-radius: 10px;
              padding: 15px;
              border: 1px solid #e0d6c8;
            }
            .card.highlight { background: linear-gradient(135deg, #D4AF37 0%, #E5C04B 100%); color: white; }
            .card.green { background: linear-gradient(135deg, #9CAF88 0%, #A8BB94 100%); color: white; }
            .card.blue { background: linear-gradient(135deg, #5B8DB8 0%, #7BA3C7 100%); color: white; }
            .card.red { background: linear-gradient(135deg, #C75B5B 0%, #D47A7A 100%); color: white; }
            
            .card-icon { font-size: 24px; margin-bottom: 8px; }
            .card-value { font-size: 32px; font-weight: bold; }
            .card-label { font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
            .card-sublabel { font-size: 10px; opacity: 0.7; margin-top: 3px; }
            
            .section { margin-bottom: 20px; }
            .section-title { 
              font-size: 14px; 
              font-weight: bold; 
              color: #8B6F47; 
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 2px solid #D4AF37;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .scale-card {
              background: white;
              border: 1px solid #e0d6c8;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 10px;
            }
            .scale-card.primary { border: 2px solid #D4AF37; background: #fffbeb; }
            .scale-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
            .scale-name { font-weight: bold; color: #8B6F47; flex: 1; }
            .scale-character { font-size: 10px; color: #666; margin-bottom: 8px; }
            .notes-row { display: flex; gap: 5px; flex-wrap: wrap; }
            .note { 
              background: #8B6F47; 
              color: white; 
              padding: 3px 8px; 
              border-radius: 4px; 
              font-size: 10px;
              font-weight: bold;
            }
            
            .badge { 
              background: #9CAF88; 
              color: white; 
              padding: 2px 8px; 
              border-radius: 10px; 
              font-size: 9px;
              font-weight: bold;
            }
            .badge.gold { background: #D4AF37; }
            .badge.green { background: #9CAF88; }
            
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e0d6c8; }
            th { background: #8B6F47; color: white; font-size: 10px; text-transform: uppercase; }
            td.chords { font-family: monospace; color: #8B6F47; }
            td.pattern { font-family: monospace; font-weight: bold; }
            
            .chord-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
            .chord-badge { 
              background: white; 
              border: 1px solid #8B6F47; 
              color: #8B6F47;
              padding: 4px 10px; 
              border-radius: 15px; 
              font-size: 11px;
              font-weight: bold;
            }
            
            .insight-card {
              background: linear-gradient(135deg, #fffbeb 0%, #fff 100%);
              border: 1px solid #D4AF37;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 10px;
            }
            .insight-title { font-weight: bold; color: #8B6F47; margin-bottom: 5px; }
            .insight-content { font-size: 11px; color: #555; }
            
            .cadence-item {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: white;
              border: 1px solid #e0d6c8;
              padding: 8px 12px;
              border-radius: 20px;
              margin: 5px;
            }
            .cadence-arrow { color: #D4AF37; font-weight: bold; }
            
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #D4AF37;
              text-align: center;
              font-size: 10px;
              color: #888;
            }
            .footer img { width: 30px; height: 30px; margin-bottom: 5px; }
            
            @media print {
              body { padding: 0; }
              .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6900add80614fb22512134a9/522fde112_LOGO-PNG.png" class="logo" alt="Logo" />
            <div class="header-text">
              <div class="title">${song?.title || 'Análise Musical'}</div>
              <div class="subtitle">${song?.artist || 'Artista'}</div>
              <div class="header-meta">
                Tonalidade: <strong>${mainKey || 'N/A'}</strong> • 
                Escala: <strong>${scaleAnalysis?.primaryScale?.name || 'N/A'}</strong> • 
                ${progressions?.length || 0} progressões
              </div>
            </div>
          </div>

          <div class="grid-3">
            <div class="card highlight">
              <div class="card-icon">🎵</div>
              <div class="card-value">${mainKey || 'N/A'}</div>
              <div class="card-label">Tonalidade</div>
            </div>
            <div class="card green">
              <div class="card-icon">🎼</div>
              <div class="card-value">${progressions?.length || 0}</div>
              <div class="card-label">Progressões</div>
            </div>
            <div class="card blue">
              <div class="card-icon">🎸</div>
              <div class="card-value">${scaleAnalysis?.allChords?.length || 0}</div>
              <div class="card-label">Acordes</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🎼 Funções Harmônicas</div>
            <div class="grid-3">
              <div class="card" style="border-left: 4px solid #4CAF50;">
                <div class="card-value" style="color: #4CAF50;">${harmonicAnalysis?.proportions?.tonica || 0}%</div>
                <div class="card-label" style="color: #4CAF50;">Tônica</div>
                <div class="card-sublabel">Repouso e estabilidade</div>
              </div>
              <div class="card" style="border-left: 4px solid #2196F3;">
                <div class="card-value" style="color: #2196F3;">${harmonicAnalysis?.proportions?.subdominante || 0}%</div>
                <div class="card-label" style="color: #2196F3;">Subdominante</div>
                <div class="card-sublabel">Preparação e movimento</div>
              </div>
              <div class="card" style="border-left: 4px solid #f44336;">
                <div class="card-value" style="color: #f44336;">${harmonicAnalysis?.proportions?.dominante || 0}%</div>
                <div class="card-label" style="color: #f44336;">Dominante</div>
                <div class="card-sublabel">Tensão e resolução</div>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="section">
              <div class="section-title">🎵 Escalas Compatíveis</div>
              ${scalesHtml}
            </div>
            
            <div class="section">
              <div class="section-title">🔄 Cadências Identificadas</div>
              <div>
                ${harmonicAnalysis?.cadences?.map(c => `
                  <div style="background: white; border: 1px solid #e0d6c8; border-radius: 8px; padding: 10px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                      <span class="badge">${c.from}</span>
                      <span class="cadence-arrow">→</span>
                      <span class="badge green">${c.to}</span>
                      <span style="font-weight: bold; color: #8B6F47;">${c.type}</span>
                    </div>
                    ${c.sections?.length > 0 ? `
                      <div style="font-size: 10px; color: #666;">
                        📍 Encontrada em: ${c.sections.map(s => `<span style="background: #fffbeb; border: 1px solid #D4AF37; padding: 2px 6px; border-radius: 10px; margin-right: 4px;">${s}</span>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                `).join('') || '<p class="empty">Nenhuma cadência</p>'}
              </div>
              
              <div style="margin-top: 15px;">
                <div class="section-title" style="font-size: 12px;">🎸 Acordes Utilizados</div>
                <div class="chord-badges">${chordsHtml}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📝 Progressões por Seção</div>
            <table>
              <thead>
                <tr>
                  <th>Seção</th>
                  <th>Acordes</th>
                  <th>Pattern</th>
                  <th>Progressão</th>
                </tr>
              </thead>
              <tbody>
                ${progressionsHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">💡 Insights Teóricos</div>
            ${insights?.map(i => `
              <div class="insight-card">
                <div class="insight-title">${i.title}</div>
                <div class="insight-content">${i.content}</div>
              </div>
            `).join('') || '<p>Nenhum insight disponível</p>'}
          </div>

          <div class="footer">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6900add80614fb22512134a9/522fde112_LOGO-PNG.png" alt="Logo" />
            <p><strong>Tropeiros do Bebedouro</strong> • Análise Teórica Musical</p>
            <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>

          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  if (!progressions || progressions.length === 0) {
    return (
      <Card className="border-[#D4C5B0] bg-white/60">
        <CardContent className="p-8 text-center">
          <Music2 className="w-12 h-12 text-[#A68A64] mx-auto mb-4" />
          <p className="text-[#8B6F47]">Nenhuma progressão para analisar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#D4C5B0] bg-white/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#8B6F47] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#D4AF37]" />
            Análise Teórica Completa
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsCSV}
              className="border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsText}
              className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              TXT
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={printAnalysis}
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#F5F1E8] mb-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="scales">Escalas</TabsTrigger>
            <TabsTrigger value="harmony">Harmonia</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-[#8B6F47]/10 to-white rounded-xl border border-[#D4C5B0]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#8B6F47] rounded-full flex items-center justify-center">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[#A68A64]">Tonalidade</p>
                    <p className="text-2xl font-bold text-[#8B6F47]">{mainKey || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-[#9CAF88]/10 to-white rounded-xl border border-[#D4C5B0]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#9CAF88] rounded-full flex items-center justify-center">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[#A68A64]">Escala Principal</p>
                    <p className="text-lg font-bold text-[#8B6F47]">
                      {scaleAnalysis?.primaryScale?.name.split(' ')[0] || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-[#D4AF37]/10 to-white rounded-xl border border-[#D4C5B0]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#D4AF37] rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[#A68A64]">Progressões</p>
                    <p className="text-2xl font-bold text-[#8B6F47]">{progressions?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Acordes usados */}
            <div className="p-4 bg-[#F5F1E8] rounded-xl mb-4">
              <p className="text-sm font-medium text-[#8B6F47] mb-2">Acordes utilizados na música:</p>
              <div className="flex flex-wrap gap-2">
                {scaleAnalysis?.allChords?.map((chord, idx) => (
                  <Badge key={idx} className="bg-white text-[#8B6F47] border border-[#D4C5B0]">
                    {chord}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scales">
            <div className="space-y-4">
              <p className="text-sm text-[#A68A64]">
                Escalas e modos compatíveis com os acordes da música:
              </p>
              
              {scaleAnalysis?.possibleScales?.map((scale, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 rounded-xl border-2 ${
                    idx === 0 
                      ? 'border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/10 to-white' 
                      : 'border-[#D4C5B0] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Award className="w-5 h-5 text-[#D4AF37]" />}
                      <span className="font-bold text-[#8B6F47]">{scale.name}</span>
                    </div>
                    <Badge className={idx === 0 ? 'bg-[#D4AF37] text-white' : 'bg-[#9CAF88]/20 text-[#8B6F47]'}>
                      {scale.matchPercent}% compatível
                    </Badge>
                  </div>
                  <p className="text-sm text-[#A68A64] mb-2">{scale.character}</p>
                  <div className="flex gap-1 flex-wrap">
                    {scale.notes.map((note, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {note}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="harmony">
            <div className="space-y-6">
              {/* Proporção de funções */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {harmonicAnalysis?.proportions?.tonica || 0}%
                  </p>
                  <p className="text-sm text-green-700">Tônica</p>
                  <p className="text-xs text-green-600 mt-1">Repouso</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {harmonicAnalysis?.proportions?.subdominante || 0}%
                  </p>
                  <p className="text-sm text-blue-700">Subdominante</p>
                  <p className="text-xs text-blue-600 mt-1">Preparação</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {harmonicAnalysis?.proportions?.dominante || 0}%
                  </p>
                  <p className="text-sm text-red-700">Dominante</p>
                  <p className="text-xs text-red-600 mt-1">Tensão</p>
                </div>
              </div>

              {/* Cadências */}
              <div className="p-4 bg-[#F5F1E8] rounded-xl">
                <p className="text-sm font-medium text-[#8B6F47] mb-3">Cadências Identificadas:</p>
                {harmonicAnalysis?.cadences?.length > 0 ? (
                  <div className="space-y-3">
                    {harmonicAnalysis.cadences.map((cad, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-[#D4C5B0]">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-[#8B6F47] text-white">{cad.from}</Badge>
                          <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                          <Badge className="bg-[#9CAF88] text-white">{cad.to}</Badge>
                          <span className="font-bold text-[#8B6F47] ml-2">{cad.type}</span>
                        </div>
                        {cad.sections?.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[#A68A64]">📍 Encontrada em:</span>
                            {cad.sections.map((section, sIdx) => (
                              <Badge key={sIdx} variant="outline" className="text-xs bg-[#D4AF37]/10 border-[#D4AF37] text-[#8B6F47]">
                                {section}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#A68A64]">Nenhuma cadência tradicional identificada</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <div className="space-y-4">
              {insights.length > 0 ? (
                insights.map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 bg-gradient-to-r from-[#D4AF37]/10 to-white rounded-xl border border-[#D4AF37]/30"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-[#8B6F47] mb-1">{insight.title}</h4>
                        <p className="text-sm text-[#A68A64]">{insight.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center p-8">
                  <Info className="w-12 h-12 text-[#A68A64] mx-auto mb-4" />
                  <p className="text-[#8B6F47]">Adicione mais progressões para gerar insights</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}