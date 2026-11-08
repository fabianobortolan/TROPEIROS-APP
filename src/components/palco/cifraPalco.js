// Quebra linhas longas sem desalinhar acorde e letra: a linha de acordes e a
// letra logo abaixo são cortadas na MESMA coluna, de preferência num espaço.
export function quebrarCifra(linhas, cols, ehAcorde) {
  if (!cols || cols < 12) return linhas.map((texto) => ({ texto, tipo: null }));
  const saida = [];
  const cortarEm = (base, outra) => {
    let p = base.lastIndexOf(" ", cols);
    if (p < cols * 0.5) p = cols;
    // não corta um acorde ao meio
    while (outra && p > 0 && outra[p - 1] && outra[p - 1] !== " " && outra[p] && outra[p] !== " ") p--;
    return p > 0 ? p : cols;
  };
  const lead = (txt) => (txt.match(/^ */) || [""])[0].length;
  for (let i = 0; i < linhas.length; i++) {
    let a = linhas[i];
    const acorde = ehAcorde(a);
    const prox = linhas[i + 1];
    if (acorde && prox != null && prox.trim() && !ehAcorde(prox) && !/^\s*\[[^\]]*\]\s*$/.test(prox)) {
      let l = prox;
      i++;
      while (Math.max(a.trimEnd().length, l.trimEnd().length) > cols) {
        const p = cortarEm(l.length > cols ? l : a, a);
        saida.push({ texto: a.slice(0, p).trimEnd(), tipo: "acorde" }, { texto: l.slice(0, p).trimEnd(), tipo: "letra" });
        a = a.slice(p); l = l.slice(p);
        const tira = Math.min(a.trim() ? lead(a) : Infinity, l.trim() ? lead(l) : Infinity);
        if (Number.isFinite(tira)) { a = a.slice(tira); l = l.slice(tira); }
      }
      saida.push({ texto: a.trimEnd(), tipo: "acorde" }, { texto: l.trimEnd(), tipo: "letra" });
      continue;
    }
    while (a.trimEnd().length > cols) {
      const p = cortarEm(a, null);
      saida.push({ texto: a.slice(0, p).trimEnd(), tipo: acorde ? "acorde" : null });
      a = a.slice(p).replace(/^ +/, "");
    }
    saida.push({ texto: a, tipo: acorde ? "acorde" : null });
  }
  return saida;
}

