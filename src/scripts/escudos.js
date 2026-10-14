// Escudos dos clubes no navegador. O índice {nome canônico: [slug, escuro]} chega em /dados/jogos.json e /dados/clubes.json
// (vazio quando o interruptor src/config.js está desligado: então nada aqui desenha nada).
// Escudo "escuro" (1) ganha um círculo claro por trás no tema escuro (classe esc-escuro, ver global.css).

let indice = {};
export function definirEscudos(mapa) { indice = mapa || {}; }
export const temEscudos = () => Object.keys(indice).length > 0;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Iniciais para o clube sem escudo: "Santa Cruz-RS" -> "SC", "Flamengo" -> "FL". */
export function iniciais(nome) {
  const limpo = String(nome ?? '').replace(/-[A-Z]{2}$/, '').replace(/[()]/g, '');
  const p = limpo.split(/[\s-]+/).filter((w) => w && !/^(d[aeo]s?|e)$/i.test(w));
  return ((p.length > 1 ? p[0][0] + p[1][0] : (p[0] || '?').slice(0, 2))).toUpperCase();
}

/** HTML do escudo (decorativo: o nome do clube sempre está ao lado). tam: 'p' 20px, 'm' 28px, 'g' 64px. '' se os escudos estão desligados. */
export function escudoHtml(nome, tam = 'p') {
  if (!temEscudos() || !nome) return '';   // sem nome (time ainda indefinido em jogo futuro): nada a desenhar
  const e = indice[nome];
  if (!e) return `<span class="esc esc-${tam} esc-mono" aria-hidden="true">${esc(iniciais(nome))}</span>`;
  return `<img class="esc esc-${tam}${e[1] ? ' esc-escuro' : ''}" src="/escudos/${e[0]}.webp" alt="" loading="lazy" decoding="async">`;
}

/** "[escudo] Nome" (ou só o nome, escapado, com os escudos desligados). */
export function nomeComEscudo(nome, tam = 'm') {
  const e = escudoHtml(nome, tam);
  return e ? `<span class="cl">${e}${esc(nome)}</span>` : esc(nome);
}

/** Jogo espelhado: "[escudo] Mandante x Visitante [escudo]". '' com os escudos desligados (quem chama mantém o texto de antes). */
export function jogoComEscudos(mandante, visitante, tam = 'p') {
  const a = escudoHtml(mandante, tam), b = escudoHtml(visitante, tam);
  return a || b ? `<span class="jg"><span class="eq">${a}<span>${esc(mandante)}</span></span><span>x</span><span class="eq"><span>${esc(visitante)}</span>${b}</span></span>` : '';
}

/** Mesmo escudo como elemento DOM (para quem monta tudo por createElement). null se desligado. */
export function escudoEl(nome, tam = 'p') {
  const html = escudoHtml(nome, tam);
  if (!html) return null;
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content.firstElementChild;
}
