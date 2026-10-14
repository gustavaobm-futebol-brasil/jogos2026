// Utilidades compartilhadas pelo Resumo e pelos Gráficos do explorador: formatação pt-BR, estatística e criação de elementos
// (sempre por DOM/textContent, nunca por concatenação de HTML: nomes de clubes e estádios vêm dos dados).

import { jogoComEscudos } from './escudos.js';

export const fmtInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
export const fmtDec = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
export const fmtPct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });
const fmtBRLInt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const fmtBRL = (v) => (v == null ? '—' : fmtBRLInt.format(v));
export const fmtBRLCompacto = (v) => {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `R$ ${fmtDec.format(v / 1e9)} bi`;
  if (a >= 1e6) return `R$ ${fmtDec.format(v / 1e6)} mi`;
  if (a >= 1e3) return `R$ ${fmtInt.format(v / 1e3)} mil`;
  return fmtBRLInt.format(v);
};
export const fmtData = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
export const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const plural = (n, um, varios) => `${fmtInt.format(n)} ${n === 1 ? um : varios}`;

export const soma = (xs) => xs.reduce((a, b) => a + b, 0);
export const media = (xs) => (xs.length ? soma(xs) / xs.length : null);
export function mediana(xs) {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = o.length >> 1;
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/** Cria um elemento HTML. props: class, text, dataset, onclick..., demais viram atributos. Filhos: nós, textos, arrays. */
export function h(tag, props, ...filhos) {
  const e = document.createElement(tag);
  aplicar(e, props, filhos);
  return e;
}
/** Cria um elemento SVG. */
export function s(tag, props, ...filhos) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  aplicar(e, props, filhos);
  return e;
}
function aplicar(e, props, filhos) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.setAttribute('class', v);
    else if (k === 'text') e.textContent = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false) continue;
    e.append(f.nodeType ? f : document.createTextNode(String(f)));
  }
}

/** Dica flutuante única (tooltip). `linhas` = [valor em destaque, rótulo secundário, ...]; sempre via textContent. */
let dica = null;
export function mostrarDica(clientX, clientY, linhas) {
  if (!dica) {
    dica = h('div', { class: 'dica', role: 'tooltip' });
    document.body.append(dica);
  }
  // uma linha pode ser { jogo: [mandante, visitante] }: com os escudos ligados vira "[escudo] Mandante x Visitante [escudo]"
  dica.replaceChildren(...linhas.map((t, i) => {
    if (t && typeof t === 'object' && t.jogo) {
      const html = jogoComEscudos(t.jogo[0], t.jogo[1]);
      const d = h('div', { class: 'dica-txt', text: html ? null : `${t.jogo[0]} x ${t.jogo[1]}` });
      if (html) d.innerHTML = html;   // html vem de jogoComEscudos, que escapa os nomes
      return d;
    }
    return h('div', { class: i === 0 ? 'dica-valor' : 'dica-txt', text: t });
  }));
  dica.style.display = 'block';
  const w = dica.offsetWidth, hh = dica.offsetHeight;
  const x = Math.min(clientX + 14, window.innerWidth - w - 8);
  const y = clientY + 18 + hh > window.innerHeight ? clientY - hh - 12 : clientY + 18;
  dica.style.left = `${Math.max(8, x) + window.scrollX}px`;
  dica.style.top = `${Math.max(8, y) + window.scrollY}px`;
}
export function esconderDica() { if (dica) dica.style.display = 'none'; }

/** Liga a dica a um elemento: ponteiro e foco do teclado mostram o mesmo conteúdo. */
export function comDica(el, linhas) {
  el.addEventListener('pointermove', (e) => mostrarDica(e.clientX, e.clientY, linhas));
  el.addEventListener('pointerleave', esconderDica);
  el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); mostrarDica(r.left + r.width / 2, r.top, linhas); });
  el.addEventListener('blur', esconderDica);
  return el;
}

/** Números "bonitos" para os eixos: 0, 1.000, 2.000... */
export function escalaBonita(max, alvo = 4) {
  if (!(max > 0)) return { max: 1, passo: 1 };
  const bruto = max / alvo;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / pot;
  const passo = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pot;
  return { max: Math.ceil(max / passo) * passo, passo };
}
