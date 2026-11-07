// src/utils/revalidateAudit.js
// Revalida a auditoria de UMA música usando o conteúdo salvo no banco e
// persiste o novo resultado (validation_severity, validation_issues,
// validation_score, ...). Usada sempre que a cifra ou as progressões de uma
// música são editadas — a reauditoria é automática e nunca altera a cifra.
import { base44 } from "@/api/base44Client";
import { validarCifra, computeValidationScore } from "@/utils/cifraValidator";

// Um alerta está ignorado se existe entrada em validation_ignored com o mesmo
// tipo e mesma linha (ou ambos sem linha).
export function isIssueIgnored(issue, ignoredList) {
  return (ignoredList || []).some(
    (ig) =>
      ig.type === issue.type &&
      ((ig.line == null && issue.line == null) || ig.line === issue.line)
  );
}

export async function revalidateAndPersist(songId) {
  const song = await base44.entities.Song.get(songId);
  if (!song) return null;

  const result = validarCifra(song);
  const ignoredList = song.validation_ignored || [];
  const visibleIssues = (result.issues || []).filter((i) => !isIssueIgnored(i, ignoredList));
  const score = computeValidationScore(visibleIssues);

  const validationFields = {
    validation_severity: result.severity,
    validation_issues: visibleIssues.length ? visibleIssues : null,
    validation_score: score,
    validation_date: new Date().toISOString(),
    validation_main_key: result.mainKey || null,
    validation_foreign_ratio: result.foreignRatio || 0,
  };

  await base44.entities.Song.update(songId, validationFields);
  return { ...result, ...validationFields };
}