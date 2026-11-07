import { parseISO, isValid } from "date-fns";

/**
 * Converte datas para o fuso local do dispositivo.
 * Datas só com o dia ("2026-03-01") são lidas como UTC pelo parseISO,
 * o que faz o dia "voltar" um dia em fusos atrasados (ex.: Brasília).
 */
export function parseLocalDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date(value);
}