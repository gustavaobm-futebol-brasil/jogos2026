// Página "Comparar": os mesmos gráficos do explorador, mas com até 4 times lado a lado. Cada time é uma série com cor própria
// (paleta --s0..--s3 em global.css, distinguível por daltônicos) e legenda com escudo e nome; os gráficos jogo a jogo mantêm a forma do ponto
// para o dia da semana (bolinha = fim de semana, quadrado = meio de semana). Todo gráfico tem a tabela equivalente ("Ver como tabela").
//
// `series`: [{ nome, i, jogos }] — i = 0..3 (índice da cor); jogos = linhas do explorador já filtradas para esse time.
import { h, s, fmtInt, fmtDec, fmtPct, fmtBRL, fmtData, plural, media, mediana, comDica, mostrarDica, esconderDica, escalaBonita } from './util.js';
import { cartao, vazio, dispersao, DIAS, diaDaSemana, fmtEixoBRL, FAIXAS, ROTULO_FAIXA, textoFaixa, MAX_JOGOS_JOGO_A_JOGO, MESES } from './graficos.js';
import { escudoEl } from './escudos.js';

const cl = (sr) => `s${sr.i}`;

// ── legenda dos times (cor + escudo + nome + nº de jogos) e, nos gráficos jogo a jogo, a legenda das formas ──
function legendaTimes(series, comFormas = false, comSinal = false) {
  const icone = (forma) => s('svg', { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': 'true' },
    forma === 'bola' ? s('circle', { class: 'gr-ponto neutro', cx: 6, cy: 6, r: 4 }) : s('rect', { class: 'gr-ponto neutro', x: 2, y: 2, width: 8, height: 8, rx: 1 }));
  const times = series.map((sr) => h('span', { class: 'item' }, h('span', { class: `sw ${cl(sr)}` }), escudoEl(sr.nome, 'p'), `${sr.nome} (${plural(sr.jogos.length, 'jogo', 'jogos')})`));
  const formas = comFormas ? [h('span', { class: 'item' }, icone('bola'), 'fim de semana'), h('span', { class: 'item' }, icone('quad'), 'meio de semana')] : [];
  return h('div', { class: 'gr-legenda', role: 'group', 'aria-label': 'Legenda: um time por cor' }, times, formas, comSinal
    ? h('span', { class: 'item muted' }, 'abaixo da linha do zero: despesa maior que a bilheteria') : null);
}

// ── quadro-resumo: uma coluna por time ──
function metricas(sr) {
  const j = sr.jogos, cp = j.filter((x) => x.pub != null), pubs = cp.map((x) => x.pub);
  const cb = j.filter((x) => x.bruta != null), cr = j.filter((x) => x.renda != null);
  return {
    n: j.length, nPub: cp.length, medio: pubs.length ? media(pubs) : null, med: pubs.length ? mediana(pubs) : null,
    maior: cp.reduce((a, b) => (!a || b.pub > a.pub ? b : a), null),
    bruta: cb.length ? media(cb.map((x) => x.bruta)) : null, renda: cr.length ? media(cr.map((x) => x.renda)) : null, nRenda: cr.length,
    deficit: cr.length ? cr.filter((x) => x.renda < 0).length / cr.length : null,
  };
}

function quadroResumo(series) {
  const m = series.map(metricas);
  const contra = (sr, j) => (j.mandante === sr.nome ? j.visitante : j.mandante);
  const linhas = [
    ['Jogos nos filtros', (x) => fmtInt.format(x.n)],
    ['Com público registrado', (x) => fmtInt.format(x.nPub)],
    ['Público médio', (x) => (x.medio == null ? '—' : fmtInt.format(x.medio))],
    ['Público mediano', (x) => (x.med == null ? '—' : fmtInt.format(x.med))],
    ['Maior público', (x, k) => (x.maior ? [fmtInt.format(x.maior.pub), `contra ${contra(series[k], x.maior)}, ${fmtData(x.maior.data)}`] : '—')],
    ['Arrecadação média', (x) => (x.bruta == null ? '—' : fmtBRL(x.bruta))],
    ['Renda líquida média', (x) => (x.renda == null ? '—' : fmtBRL(x.renda))],
    ['Despesa maior que a bilheteria', (x) => (x.deficit == null ? '—' : [fmtPct.format(x.deficit), `de ${plural(x.nRenda, 'borderô', 'borderôs')}`])],
  ];
  const celula = (v) => (Array.isArray(v) ? [v[0], h('small', { text: v[1] })] : v);
  return h('div', { class: 'tabela' }, h('table', { class: 'comparativo' },
    h('thead', null, h('tr', null, h('th', { text: '' }), series.map((sr) => h('th', { class: 'n' }, h('span', { class: 'cab-time' }, h('span', { class: `sw ${cl(sr)}` }), escudoEl(sr.nome, 'p'), sr.nome))))),
    h('tbody', null, linhas.map(([rot, f]) => h('tr', null, h('th', { scope: 'row', text: rot }), m.map((x, k) => h('td', { class: 'n' }, celula(f(x, k)))))))));
}

// ── faixas de público: colunas agrupadas, em % dos jogos de cada time ──
function faixasAgrupadas(series, largura) {
  const dados = series.map((sr) => {
    const cp = sr.jogos.filter((j) => j.pub != null), cont = ROTULO_FAIXA.map(() => 0);
    for (const j of cp) cont[FAIXAS.findIndex((a, i) => j.pub >= a && j.pub < FAIXAS[i + 1])]++;
    return { sr, total: cp.length, cont, pct: cont.map((n) => (cp.length ? (100 * n) / cp.length : 0)) };
  }).filter((d) => d.total > 0);
  const altura = 236, topo = 14, base = 28, ml = 36, mr = 4;
  const plotH = altura - topo - base;
  const { max, passo } = escalaBonita(Math.max(...dados.flatMap((d) => d.pct), 1), 4);
  const slot = (largura - ml - mr) / ROTULO_FAIXA.length;
  const bw = Math.min(16, (slot * 0.84) / dados.length);
  const svg = s('svg', { class: 'gr-svg', width: largura, height: altura, role: 'img', 'aria-label': 'Colunas agrupadas: parcela dos jogos de cada time por faixa de público; os mesmos números estão na tabela' });
  for (let v = 0; v <= max + 1e-9; v += passo) {
    const y = topo + plotH - (v / max) * plotH;
    svg.append(s('line', { class: v === 0 ? 'gr-eixo' : 'gr-grade', x1: ml, x2: largura - mr, y1: y, y2: y }), s('text', { class: 'gr-txt', x: ml - 6, y: y + 4, 'text-anchor': 'end' }, `${fmtInt.format(v)}%`));
  }
  ROTULO_FAIXA.forEach((rot, g) => {
    const cx = ml + slot * g + slot / 2, x0 = cx - (bw * dados.length) / 2;
    const gr = s('g', { class: 'col', tabindex: 0 });
    dados.forEach((d, k) => {
      const hh = d.pct[g] > 0 ? Math.max(2, (d.pct[g] / max) * plotH) : 0;
      if (hh) gr.append(s('rect', { class: `gr-barra ${cl(d.sr)}`, x: x0 + k * bw, y: topo + plotH - hh, width: bw - 1, height: hh, rx: 2 }));
    });
    gr.append(s('rect', { class: 'gr-hit', x: cx - slot / 2, y: 0, width: slot, height: altura }));
    gr.append(s('text', { class: 'gr-txt', x: cx, y: topo + plotH + 17, 'text-anchor': 'middle' }, rot));
    const dica = [`público ${textoFaixa(FAIXAS[g], FAIXAS[g + 1])}`, ...dados.map((d) => `${d.sr.nome}: ${fmtDec.format(d.pct[g])}% (${plural(d.cont[g], 'jogo', 'jogos')})`)];
    gr.setAttribute('aria-label', dica.join(', '));
    comDica(gr, dica);
    svg.append(gr);
  });
  const tabela = { colunas: ['Faixa de público', ...dados.map((d) => `${d.sr.nome} (%)`)],
    linhas: ROTULO_FAIXA.map((_, g) => [textoFaixa(FAIXAS[g], FAIXAS[g + 1]), ...dados.map((d) => `${fmtDec.format(d.pct[g])}% (${fmtInt.format(d.cont[g])})`)]) };
  return { svg, tabela, dados };
}

// ── público médio por mês: uma linha por time ──
function linhasPorMes(series, largura) {
  const porSerie = series.map((sr) => {
    const m = new Map();
    for (const j of sr.jogos) if (j.pub != null) { const k = j.data.slice(0, 7); (m.get(k) || m.set(k, []).get(k)).push(j.pub); }
    return { sr, m };
  }).filter((x) => x.m.size);
  const chaves = [...new Set(porSerie.flatMap((x) => [...x.m.keys()]))].sort();
  if (chaves.length < 2) return null;
  const meses = [];
  let [a, mm] = chaves[0].split('-').map(Number);
  const [fa, fm] = chaves[chaves.length - 1].split('-').map(Number);
  while (a < fa || (a === fa && mm <= fm)) { meses.push(`${a}-${String(mm).padStart(2, '0')}`); mm++; if (mm > 12) { mm = 1; a++; } }
  const doisAnos = chaves[0].slice(0, 4) !== chaves[chaves.length - 1].slice(0, 4);
  const rot = (k) => (doisAnos ? `${MESES[Number(k.slice(5)) - 1]}/${k.slice(2, 4)}` : MESES[Number(k.slice(5)) - 1]);
  const altura = 236, mt = 14, mb = 28, mr = 14;
  const valores = porSerie.flatMap((x) => [...x.m.values()].map((v) => media(v)));
  const { max, passo } = escalaBonita(Math.max(...valores, 1), 4);
  const ml = String(fmtInt.format(max)).length * 6.5 + 16;
  const X = (i) => ml + (meses.length === 1 ? 0 : (i / (meses.length - 1)) * (largura - ml - mr));
  const Y = (v) => mt + (1 - v / max) * (altura - mt - mb);
  const svg = s('svg', { class: 'gr-svg', width: largura, height: altura, role: 'img', 'aria-label': 'Linhas: público médio por mês de cada time; os mesmos números estão na tabela' });
  for (let v = 0; v <= max + 1e-9; v += passo) svg.append(s('line', { class: v === 0 ? 'gr-eixo' : 'gr-grade', x1: ml, x2: largura - mr, y1: Y(v), y2: Y(v) }),
    s('text', { class: 'gr-txt', x: ml - 8, y: Y(v) + 4, 'text-anchor': 'end' }, fmtInt.format(v)));
  const passoRot = Math.max(1, Math.ceil(40 / ((largura - ml - mr) / Math.max(1, meses.length - 1))));
  meses.forEach((k, i) => { if (i % passoRot === 0) svg.append(s('text', { class: 'gr-txt', x: X(i), y: altura - 8, 'text-anchor': 'middle' }, rot(k))); });
  const pts = [];
  for (const { sr, m } of porSerie) {
    let d = '', caneta = false;                      // 'M' recomeça o traço depois de um mês sem jogos
    meses.forEach((k, i) => {
      const v = m.get(k);
      if (!v) { caneta = false; return; }
      const val = media(v);
      d += `${caneta ? 'L' : 'M'}${X(i)},${Y(val)} `;
      caneta = true;
      pts.push({ sr, k, i, val, n: v.length, x: X(i), y: Y(val) });
    });
    svg.append(s('path', { class: `gr-linha ${cl(sr)}`, d: d.trim() }));
  }
  for (const q of pts) svg.append(s('circle', { class: `gr-ponto ${cl(q.sr)}`, cx: q.x, cy: q.y, r: 4 }));
  const destaque = s('circle', { class: 'gr-destaque', r: 9, cx: -20, cy: -20 });
  svg.append(destaque);
  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    let melhor = null, dm = 30 * 30;
    for (const q of pts) { const dd = (q.x - px) ** 2 + (q.y - py) ** 2; if (dd < dm) { dm = dd; melhor = q; } }
    if (!melhor) { destaque.setAttribute('cx', -20); esconderDica(); return; }
    destaque.setAttribute('cx', melhor.x); destaque.setAttribute('cy', melhor.y);
    mostrarDica(e.clientX, e.clientY, [`${fmtInt.format(melhor.val)} de público médio`, melhor.sr.nome, `${MESES[Number(melhor.k.slice(5)) - 1]} de ${melhor.k.slice(0, 4)} · ${plural(melhor.n, 'jogo', 'jogos')}`]);
  });
  svg.addEventListener('pointerleave', () => { destaque.setAttribute('cx', -20); esconderDica(); });
  const tabela = { colunas: ['Mês', ...porSerie.map((x) => `${x.sr.nome} (médio · jogos)`)],
    linhas: meses.map((k) => [`${MESES[Number(k.slice(5)) - 1]} de ${k.slice(0, 4)}`, ...porSerie.map((x) => { const v = x.m.get(k); return v ? `${fmtInt.format(media(v))} · ${v.length}` : '—'; })]) };
  return { svg, tabela };
}

// ── barras agrupadas por competição: só competições disputadas por pelo menos dois dos times ──
function porCompeticao(series, minimo, valorDe, pegar) {
  const mapa = new Map();
  for (const sr of series) {
    const m = new Map();
    for (const j of sr.jogos) { const v = pegar(j); if (v != null) (m.get(j.comp) || m.set(j.comp, []).get(j.comp)).push(v); }
    for (const [comp, v] of m) if (v.length >= minimo) (mapa.get(comp) || mapa.set(comp, []).get(comp)).push({ sr, valor: valorDe(v), n: v.length });
  }
  return [...mapa.entries()].filter(([, it]) => it.length >= 2)
    .map(([nome, itens]) => ({ nome, itens, ref: Math.max(...itens.map((x) => x.valor)), total: itens.reduce((a, x) => a + x.n, 0) }))
    .sort((x, y) => y.itens.length - x.itens.length || y.total - x.total).slice(0, 10);
}

function barrasAgrupadas(grupos, fmtValor, max, rotuloValor) {
  return h('ol', { class: 'barras fina agrupadas' }, grupos.map((g) => h('li', null,
    h('span', { class: 'nome' }, g.nome),
    h('div', { class: 'grupo' }, g.itens.map((it) => comDica(h('div', { class: 'linha', tabindex: 0 },
      h('span', { class: 'trilho' }, h('i', { class: cl(it.sr), style: `width:${max ? (100 * it.valor) / max : 0}%` })),
      h('span', { class: 'valor', text: fmtValor(it.valor) })), [fmtValor(it.valor) + (rotuloValor ? ` ${rotuloValor}` : ''), `${it.sr.nome} · ${g.nome}`, plural(it.n, 'jogo', 'jogos')]))))));
}

const nJogoAJogo = (maior) => `Disponível quando cada time tem até ${MAX_JOGOS_JOGO_A_JOGO} jogos nos filtros (um deles tem ${fmtInt.format(maior)}). Filtre por uma competição ou um período.`;

/**
 * Desenha o quadro-resumo e os gráficos comparativos dentro de `alvo`.
 * @param {HTMLElement} alvo
 * @param {{nome:string,i:number,jogos:object[]}[]} series  um por time escolhido (cada jogo traz `_s` = índice da série)
 */
export function renderComparacao(alvo, series, tentativa = 0) {
  const medida = alvo.clientWidth;
  alvo.replaceChildren();
  const com = series.filter((sr) => sr.jogos.length);
  if (!com.length) { alvo.append(h('p', { class: 'aviso', text: 'Nenhum dos times escolhidos tem jogos com esses filtros. Afrouxe os filtros.' })); return; }
  const duas = window.matchMedia('(min-width: 900px)').matches;
  const interno = (w) => Math.max(240, Math.floor(w - 34));
  const largura = interno(medida || 640);
  const larguraCard = interno(duas ? ((medida || 900) - 16) / 2 : medida || 640);

  alvo.append(h('h2', { text: 'Resumo' }), legendaTimes(series), quadroResumo(series), h('h2', { class: 'sec-graficos', text: 'Gráficos' }));
  const grade = h('div', { class: 'grade-graficos' });
  const larga = (el) => { el.classList.add('larga'); grade.append(el); };
  const comPubTotal = com.reduce((a, sr) => a + sr.jogos.filter((j) => j.pub != null).length, 0);
  if (comPubTotal < 2) { alvo.append(h('p', { class: 'aviso', text: 'Poucos jogos com público registrado nos filtros atuais para desenhar gráficos.' })); return; }

  // 1. faixas de público
  const f = faixasAgrupadas(series, larguraCard);
  grade.append(cartao('Jogos por faixa de público', 'Parcela dos jogos de cada time em cada faixa (em % dos jogos do próprio time com público registrado, para times com números de jogos diferentes).',
    h('div', null, legendaTimes(series), f.svg), f.tabela));

  // 2. público médio por mês
  const l = linhasPorMes(series, larguraCard);
  grade.append(l ? cartao('Público médio por mês', 'Um ponto por mês em que o time jogou (a linha se interrompe nos meses sem jogos).', h('div', null, legendaTimes(series), l.svg), l.tabela)
    : vazio('Público médio por mês', 'Os jogos filtrados cabem num único mês; amplie o período para ver a evolução.'));

  // 3. público médio por competição
  const pc = porCompeticao(series, 2, (v) => media(v), (j) => j.pub);
  grade.append(pc.length ? cartao('Público médio por competição', 'Só competições disputadas por pelo menos dois dos times, com pelo menos 2 jogos de cada um com público registrado (até 10).',
    h('div', null, legendaTimes(series), barrasAgrupadas(pc, (v) => fmtInt.format(v), Math.max(...pc.map((g) => g.ref)), 'de público médio')),
    { colunas: ['Competição', 'Time', 'Público médio', 'Jogos'], linhas: pc.flatMap((g) => g.itens.map((it) => [g.nome, it.sr.nome, fmtInt.format(it.valor), fmtInt.format(it.n)])) })
    : vazio('Público médio por competição', 'Os times escolhidos não têm uma competição em comum com jogos suficientes nos filtros atuais.'));

  // 4. despesa maior que a bilheteria, por competição
  const dc = porCompeticao(series, 5, (v) => v.filter((x) => x < 0).length / v.length, (j) => j.renda);
  grade.append(dc.length ? cartao('Jogos em que a despesa superou a bilheteria', 'Parcela dos jogos com renda líquida negativa, por competição (competições em comum, com pelo menos 5 borderôs de cada time).',
    h('div', null, legendaTimes(series), barrasAgrupadas(dc, (v) => fmtPct.format(v), 1, 'dos jogos')),
    { colunas: ['Competição', 'Time', 'Parcela', 'Borderôs lidos'], linhas: dc.flatMap((g) => g.itens.map((it) => [g.nome, it.sr.nome, fmtPct.format(it.valor), fmtInt.format(it.n)])) })
    : vazio('Jogos em que a despesa superou a bilheteria', 'Os times não têm uma competição em comum com 5 ou mais borderôs lidos cada um nos filtros atuais.'));

  // 5 e 6. jogo a jogo (até 160 por time)
  const semDia = (j) => DIAS[diaDaSemana(j.data)];
  const todos = (fn) => series.flatMap((sr) => sr.jogos.filter(fn)).sort((x, y) => x.data.localeCompare(y.data));
  const maiorPub = Math.max(...series.map((sr) => sr.jogos.filter((j) => j.pub != null).length));
  const pubs = todos((j) => j.pub != null);
  if (pubs.length >= 3 && maiorPub <= MAX_JOGOS_JOGO_A_JOGO) {
    larga(cartao('Público jogo a jogo', `Cada ponto é um jogo (${plural(pubs.length, 'jogo', 'jogos')} no total); a cor é o time. Passe o mouse para ver o jogo.`,
      h('div', null, legendaTimes(series, true), dispersao(pubs, largura, {
        valor: (j) => j.pub, eixo: (v) => fmtInt.format(v), aria: 'Dispersão do público de cada jogo dos times ao longo do tempo', cor: (j) => `s${j._s}`,
        dica: (j) => [`${fmtInt.format(j.pub)} pessoas`, j._nome, { jogo: [j.mandante, j.visitante] }, `${semDia(j)}, ${fmtData(j.data)} · ${j.comp}`],
      })),
      { colunas: ['Time', 'Data', 'Dia', 'Jogo', 'Competição', 'Público'], linhas: pubs.map((j) => [j._nome, fmtData(j.data), semDia(j), `${j.mandante} x ${j.visitante}`, j.comp, fmtInt.format(j.pub)]) }));
  } else larga(vazio('Público jogo a jogo', pubs.length < 3 ? 'Poucos jogos com público registrado nos filtros atuais.' : nJogoAJogo(maiorPub)));
  const maiorRenda = Math.max(...series.map((sr) => sr.jogos.filter((j) => j.renda != null).length));
  const rendas = todos((j) => j.renda != null);
  if (rendas.length >= 3 && maiorRenda <= MAX_JOGOS_JOGO_A_JOGO) {
    larga(cartao('Renda líquida jogo a jogo', `${plural(rendas.length, 'jogo com borderô', 'jogos com borderô')} no total; a cor é o time e o que está abaixo da linha do zero teve despesa maior que a bilheteria. Renda líquida = arrecadação − despesas.`,
      h('div', null, legendaTimes(series, true), dispersao(rendas, largura, {
        valor: (j) => j.renda, eixo: fmtEixoBRL, destacarZero: true, aria: 'Dispersão da renda líquida de cada jogo dos times ao longo do tempo', cor: (j) => `s${j._s}`,
        dica: (j) => [`${fmtBRL(j.renda)} de renda líquida`, j._nome, { jogo: [j.mandante, j.visitante] }, `${semDia(j)}, ${fmtData(j.data)} · ${j.comp}`, `arrecadação ${fmtBRL(j.bruta)} · despesas ${fmtBRL(j.desp)}`],
      })),
      { colunas: ['Time', 'Data', 'Dia', 'Jogo', 'Competição', 'Arrecadação', 'Despesas', 'Renda líquida'],
        linhas: rendas.map((j) => [j._nome, fmtData(j.data), semDia(j), `${j.mandante} x ${j.visitante}`, j.comp, fmtBRL(j.bruta), fmtBRL(j.desp), fmtBRL(j.renda)]) }));
  } else larga(vazio('Renda líquida jogo a jogo', rendas.length < 3 ? 'Poucos jogos com borderô lido nos filtros atuais para desenhar este gráfico.' : nJogoAJogo(maiorRenda)));

  alvo.append(grade);
  if (tentativa < 2) requestAnimationFrame(() => { if (!alvo.hidden && Math.abs(alvo.clientWidth - medida) > 2) renderComparacao(alvo, series, tentativa + 1); });
}
