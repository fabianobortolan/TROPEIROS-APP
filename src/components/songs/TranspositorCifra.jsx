import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, RotateCcw, Copy, Check } from "lucide-react";
import {
  ALL_KEYS,
  ALL_MINOR_KEYS,
  parseKey,
  semitonesBetween,
  transposeCifraToKey,
  preferFlatsForKey,
} from "@/utils/transposition";

// Nome da nota em português, para o músico achar o tom pelo nome (Lá, Dó...).
const NOTE_PT = {
  C: 'Dó', 'C#': 'Dó#', Db: 'Réb', D: 'Ré', 'D#': 'Ré#', Eb: 'Mib', E: 'Mi',
  F: 'Fá', 'F#': 'Fá#', Gb: 'Solb', G: 'Sol', 'G#': 'Sol#', Ab: 'Láb',
  A: 'Lá', 'A#': 'Lá#', Bb: 'Sib', B: 'Si',
};

// Fundamentais disponíveis em cada modo (menor usa a grafia habitual: G#m, Bbm...).
// Ordenados a partir de Dó, igual à lista de tons maiores.
const bySemitoneFromC = (keys) =>
  [...keys].sort((a, b) => semitonesBetween('C', a) - semitonesBetween('C', b));

const rootsFor = (mode) =>
  mode === "minor"
    ? bySemitoneFromC(ALL_MINOR_KEYS.map((k) => k.slice(0, -1)))
    : bySemitoneFromC(ALL_KEYS);

/**
 * Transpositor de Cifra.
 *
 * Conceitos separados (bug anterior misturava os dois):
 *  - originalKey: tom original da música (apenas informativo, exibido no selo).
 *  - currentKey:  tom em que a cifra está realmente armazenada hoje (main_key).
 *                 É a BASE da transposição — os semitons são calculados a partir daqui.
 *
 * O cifraText recebido está em currentKey. Ao aplicar, o novo tom (targetKey)
 * passa a ser o main_key da música; originalKey nunca é alterado por aqui.
 */
export default function TranspositorCifra({ cifraText, originalKey, currentKey, onApply }) {
  const baseKey = currentKey || originalKey || 'C';
  const base = parseKey(baseKey);
  const [targetRoot, setTargetRoot] = useState(base.root);
  const [targetMode, setTargetMode] = useState(base.mode);
  const [useFlats, setUseFlats] = useState(preferFlatsForKey(baseKey));
  const [copied, setCopied] = useState(false);

  const targetKey = targetRoot + (targetMode === 'minor' ? 'm' : '');
  const semitones = useMemo(() => semitonesBetween(baseKey, targetKey), [baseKey, targetKey]);
  const modeChanged = base.mode !== targetMode;
  const changed = semitones !== 0 || modeChanged;

  const transposedText = useMemo(
    () => transposeCifraToKey(cifraText || '', baseKey, targetKey, useFlats),
    [cifraText, baseKey, targetKey, useFlats]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(transposedText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setTargetRoot(base.root);
    setTargetMode(base.mode);
  };

  // Troca maior <-> menor mantendo a fundamental (enarmônica, se necessário).
  const changeMode = (mode) => {
    const roots = rootsFor(mode);
    const idx = semitonesBetween('C', targetRoot);
    const root = roots.find((r) => semitonesBetween('C', r) === idx) || roots[0];
    setTargetRoot(root);
    setTargetMode(mode);
    setUseFlats(preferFlatsForKey(root + (mode === 'minor' ? 'm' : '')));
  };

  if (!cifraText) return null;

  const origParsed = originalKey ? parseKey(originalKey) : null;
  const baseIdx = semitonesBetween('C', base.root);
  const showCurrentBadge =
    !!origParsed && (origParsed.mode !== base.mode || semitonesBetween('C', origParsed.root) !== baseIdx);
  const roots = rootsFor(targetMode);

  return (
    <div className="bg-[#F5F1E8] border border-[#D4C5B0] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <ArrowUpDown className="w-4 h-4 text-[#8B6F47]" />
        <span className="text-sm font-bold text-[#8B6F47]">Transpositor de Cifra</span>
        <Badge variant="outline" className="border-[#8B6F47] text-[#8B6F47] text-xs">
          Tom original: {originalKey || baseKey || '?'}
        </Badge>
        {showCurrentBadge && (
          <Badge variant="outline" className="border-[#A68A64] text-[#A68A64] text-xs">
            Tom atual: {baseKey}
          </Badge>
        )}
        {semitones !== 0 && (
          <Badge className="bg-[#D4AF37] text-white text-xs">
            {semitones > 0 ? `+${semitones}` : semitones} semitom
          </Badge>
        )}
        {modeChanged && (
          <Badge className="bg-[#8B6F47] text-white text-xs">
            Modo {targetMode === 'minor' ? 'menor' : 'maior'}
          </Badge>
        )}
        {showCurrentBadge && onApply && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const useFl = preferFlatsForKey(originalKey);
              const restored = transposeCifraToKey(cifraText || '', baseKey, originalKey, useFl);
              onApply(restored, originalKey);
            }}
            className="h-7 text-xs border-[#D4AF37] text-[#8B6F47] hover:bg-[#D4AF37] hover:text-white px-2"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restaurar Tom Original
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[#A68A64] font-medium">Tocar em:</span>
        <Select value={targetRoot} onValueChange={setTargetRoot}>
          <SelectTrigger className="w-36 h-8 text-xs border-[#D4C5B0] bg-white">
            <SelectValue>
              <span className="font-semibold">{targetRoot}</span>
              <span className="text-[#A68A64] ml-1 text-xs">
                {NOTE_PT[targetRoot]}{targetMode === 'minor' ? ' menor' : ''}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {roots.map((k) => {
              const kIdx = semitonesBetween('C', k);
              const isCurrent = kIdx === baseIdx && targetMode === base.mode;
              const isOriginal = !!origParsed && kIdx === semitonesBetween('C', origParsed.root) && targetMode === origParsed.mode && !isCurrent;
              const tag = isCurrent ? '(atual)' : (isOriginal ? '(original)' : '');
              return (
                <SelectItem key={k} value={k}>
                  <span className="font-semibold">{k}</span>
                  <span className="text-[#A68A64] ml-1 text-xs">
                    {NOTE_PT[k]}{targetMode === 'minor' ? ' menor' : ''}
                  </span>
                  {tag && <span className="text-[#A68A64] ml-1 text-xs">{tag}</span>}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <div className="flex rounded-lg overflow-hidden border border-[#D4C5B0]">
          <button
            onClick={() => changeMode('major')}
            className={`text-xs px-3 py-1 transition-all ${
              targetMode === 'major'
                ? 'bg-[#8B6F47] text-white'
                : 'bg-white text-[#8B6F47] hover:bg-[#F5F1E8]'
            }`}
          >
            Maior
          </button>
          <button
            onClick={() => changeMode('minor')}
            className={`text-xs px-3 py-1 transition-all ${
              targetMode === 'minor'
                ? 'bg-[#8B6F47] text-white'
                : 'bg-white text-[#8B6F47] hover:bg-[#F5F1E8]'
            }`}
          >
            Menor
          </button>
        </div>

        <button
          onClick={() => setUseFlats((f) => !f)}
          className={`text-xs px-3 py-1 rounded-lg border transition-all ${
            useFlats
              ? 'bg-[#8B6F47] text-white border-[#8B6F47]'
              : 'bg-white text-[#8B6F47] border-[#D4C5B0] hover:border-[#8B6F47]'
          }`}
        >
          ♭ Bemóis
        </button>

        {changed && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              className="h-8 text-xs text-[#A68A64] hover:text-[#8B6F47] px-2"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-8 text-xs text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white px-2"
            >
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            {onApply && (
              <Button
                size="sm"
                onClick={() => onApply(transposedText, targetKey)}
                className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white px-3"
              >
                Aplicar e Salvar Tom {targetKey}
              </Button>
            )}
          </>
        )}
      </div>

      {changed && (
        <div className="bg-white rounded-lg border border-[#D4C5B0] p-3 max-h-48 overflow-y-auto">
          <pre className="font-mono text-xs text-[#5C3D20] whitespace-pre-wrap leading-5">
            {transposedText}
          </pre>
        </div>
      )}
    </div>
  );
}