// Seção Base: contas usadas no build e no navegador (mesma função nos dois lados, para a tabela inicial e a filtrada baterem).

/** Ranking dos clubes somando as gerações escolhidas.
 *  linhas: [{ ger, clube, jogadores, comPro, pts, top20 }]; melhor: { "ger|clube": [nome, pts, tm] }; medida: 'todos' | 'top20'. */
export function rankingClubes(linhas, melhor, gers, medida) {
  const sel = new Set(gers);
  const por = new Map();
  for (const l of linhas) {
    if (!sel.has(l.ger)) continue;
    const a = por.get(l.clube) || { clube: l.clube, pts: 0, jogadores: 0, comPro: 0, melhor: null };
    a.pts += medida === 'top20' ? l.top20 : l.pts;
    a.jogadores += l.jogadores;
    a.comPro += l.comPro;
    const m = melhor[`${l.ger}|${l.clube}`];
    if (m && (!a.melhor || m[1] > a.melhor.pts)) a.melhor = { nome: m[0], pts: m[1], tm: m[2], ger: l.ger };
    por.set(l.clube, a);
  }
  const r = [...por.values()].sort((a, b) => b.pts - a.pts || a.clube.localeCompare(b.clube, 'pt-BR'));
  r.forEach((x, i) => { x.pos = i + 1; });
  return r;
}

/** Séries por idade: d = { idade: [pontos, jogos] } -> [{ idade, valor, jogos }], acumulado ou não, dividido por n (por jogador). */
export function serieIdade(d, { acumulado, divisor = 1, idadeMin = 15, idadeMax }) {
  const out = [];
  let acc = 0;
  for (let i = idadeMin; i <= idadeMax; i++) {
    const [p, j] = d?.[i] || [0, 0];
    acc += p;
    out.push({ idade: i, valor: (acumulado ? acc : p) / divisor, jogos: j });
  }
  return out;
}
