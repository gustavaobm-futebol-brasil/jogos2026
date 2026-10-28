// Aba "Gráficos" do explorador. Todos os gráficos respondem aos filtros do topo da página e têm uma tabela equivalente
// (botão "Ver como tabela"). Uma série por gráfico: uma só cor, sem legenda; o título diz o que está plotado.
import { h, s, fmtInt, fmtDec, fmtPct, fmtBRL, fmtData, plural, media, mediana, comDica, mostrarDica, esconderDica, escalaBonita } from './util.js';

export const MAX_JOGOS_JOGO_A_JOGO = 160;
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// ── cartão: título, resumo em uma frase, gráfico e a tabela equivalente ──
export function cartao(titulo, frase, corpo, tabela) {
  const area = h('div', { class: 'gr-corpo' }, corpo);
  const vista = h('div', { class: 'gr-tabela', hidden: true }, h('div', { class: 'tabela' }, h('table', null,
    h('thead', null, h('tr', null, tabela.colunas.map((c, i) => h('th', { class: i ? 'n' : '', text: c })))),
    h('tbody', null, tabela.linhas.map((l) => h('tr', null, l.map((v, i) => h('td', { class: i ? 'n' : '', text: v }))))))));
  const botao = h('button', { type: 'button', class: 'acao pequeno', 'aria-pressed': 'false' }, 'Ver como tabela');
  botao.addEventListener('click', () => {
    const ver = vista.hidden;
    vista.hidden = !ver;
    area.hidden = ver;
    botao.textContent = ver ? 'Ver como gráfico' : 'Ver como tabela';
    botao.setAttribute('aria-pressed', String(ver));
    esconderDica();
  });
  return h('figure', { class: 'grafico' },
    h('figcaption', null, h('h3', { text: titulo }), frase ? h('p', { class: 'muted small', text: frase }) : null),
    area, vista, h('div', { class: 'gr-rodape' }, botao));
}

export const vazio = (titulo, motivo) => h('figure', { class: 'grafico vazio' }, h('figcaption', null, h('h3', { text: titulo })), h('p', { class: 'muted small', text: motivo }));

// ── barras horizontais (HTML: o texto quebra linha e funciona em tela estreita) ──
function barrasH(itens, fmtValor) {
  const max = Math.max(...itens.map((i) => i.valor), 1e-9);
  return h('ol', { class: 'barras fina' }, itens.map((i) => comDica(h('li', { tabindex: 0 },
    h('span', { class: 'nome' }, i.nome, i.sub ? h('small', { text: i.sub }) : null),
    h('span', { class: 'trilho' }, h('i', { style: `width:${(100 * i.valor) / max}%` })),
    h('span', { class: 'valor', text: fmtValor(i.valor) })), i.dica)));
}

// ── colunas (SVG): faixas de público e público médio por mês ──
function colunas(itens, largura, fmtValor) {
  const altura = 208, topo = 22, base = 28, pad = 4;
  const plotH = altura - topo - base;
  const max = Math.max(...itens.map((i) => i.valor), 1);
  const slot = (largura - 2 * pad) / itens.length;
  const larg = Math.min(24, slot * 0.7);
  const passoRotulo = Math.max(1, Math.ceil(34 / slot));
  const iMax = itens.reduce((a, i, k) => (i.valor > itens[a].valor ? k : a), 0);
  const svg = s('svg', { class: 'gr-svg', width: largura, height: altura, role: 'img', 'aria-label': 'Gráfico de colunas; os mesmos números estão na tabela' });
  svg.append(s('line', { class: 'gr-eixo', x1: 0, x2: largura, y1: topo + plotH, y2: topo + plotH }));
  itens.forEach((it, k) => {
    const cx = pad + slot * k + slot / 2, x = cx - larg / 2;
    const hh = it.valor > 0 ? Math.max(2, (it.valor / max) * plotH) : 0, yt = topo + plotH - hh, r = Math.min(4, hh);
    const g = s('g', { class: 'col', tabindex: 0, 'aria-label': it.dica.join(', ') });
    if (hh) g.append(s('path', { class: 'gr-barra', d: `M${x},${topo + plotH} L${x},${yt + r} A${r},${r} 0 0 1 ${x + r},${yt} L${x + larg - r},${yt} A${r},${r} 0 0 1 ${x + larg},${yt + r} L${x + larg},${topo + plotH} Z` }));
    g.append(s('rect', { class: 'gr-hit', x: cx - slot / 2, y: 0, width: slot, height: altura }));   // alvo de toque do tamanho do espaço inteiro
    const txt = fmtValor(it.valor);
    if (hh && (k === iMax || slot >= txt.length * 6.6 + 6)) g.append(s('text', { class: 'gr-val', x: cx, y: yt - 6, 'text-anchor': 'middle' }, txt));
    if (k % passoRotulo === 0) g.append(s('text', { class: 'gr-txt', x: cx, y: topo + plotH + 17, 'text-anchor': 'middle' }, it.rot));
    comDica(g, it.dica);
    svg.append(g);
  });
  return svg;
}

// ── dispersão jogo a jogo (SVG): ponto mais próximo ganha a dica ──
// Forma = dia da semana (bolinha: sábado/domingo; quadrado: segunda a sexta). Cor, quando `cor` é dado = sinal do valor.
export const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const diaDaSemana = (iso) => new Date(`${iso}T12:00:00`).getDay();
export const fimDeSemana = (iso) => [0, 6].includes(diaDaSemana(iso));

/** Valor monetário curto para o eixo: "R$ 10 mil", "−R$ 5 mil", "R$ 0". */
export function fmtEixoBRL(v) {
  if (v === 0) return 'R$ 0';
  const a = Math.abs(v), sinal = v < 0 ? '−' : '';
  if (a >= 1e6) return `${sinal}R$ ${fmtDec.format(a / 1e6)} mi`;
  if (a >= 1e3) return `${sinal}R$ ${fmtInt.format(a / 1e3)} mil`;
  return `${sinal}R$ ${fmtInt.format(a)}`;
}

/**
 * @param {object[]} jogos  jogos com data (ordenados ou não)
 * @param {number} largura  largura do SVG em px
 * @param {{valor:(j)=>number, eixo:(v:number)=>string, dica:(j)=>string[], aria:string, ref?:{valor:number, rotulo:string}, cor?:(j)=>string, destacarZero?:boolean}} cfg
 */
export function dispersao(jogos, largura, cfg) {
  const altura = 280, mr = 14, mt = 14, mb = 30;
  const t = (iso) => Date.parse(`${iso}T12:00:00`);
  const valores = jogos.map(cfg.valor);
  const minV = Math.min(0, ...valores), maxV = Math.max(0, ...valores);
  const { passo } = escalaBonita(maxV - minV || 1, 4);
  const yMin = Math.floor(minV / passo) * passo, yMax = Math.max(Math.ceil(maxV / passo) * passo, yMin + passo);
  const ticks = [];
  for (let v = yMin; v <= yMax + passo / 1e6; v += passo) ticks.push(Math.round(v * 1e6) / 1e6);
  const ml = Math.max(...ticks.map((v) => cfg.eixo(v).length)) * 6.3 + 16;
  const tempos = jogos.map((j) => t(j.data));
  let t0 = Math.min(...tempos), t1 = Math.max(...tempos);
  if (t1 === t0) { t0 -= 86400000 * 3; t1 += 86400000 * 3; }
  const X = (v) => ml + ((v - t0) / (t1 - t0)) * (largura - ml - mr);
  const Y = (v) => mt + (1 - (v - yMin) / (yMax - yMin)) * (altura - mt - mb);
  const svg = s('svg', { class: 'gr-svg', width: largura, height: altura, role: 'img', 'aria-label': `${cfg.aria}; os mesmos números estão na tabela` });
  for (const v of ticks) {
    const destaque0 = v === 0 && cfg.destacarZero;   // a linha do zero separa "bilheteria cobriu a despesa" de "não cobriu"
    svg.append(s('line', { class: destaque0 ? 'gr-zero' : v === 0 ? 'gr-eixo' : 'gr-grade', x1: ml, x2: largura - mr, y1: Y(v), y2: Y(v) }),
      s('text', { class: destaque0 ? 'gr-txt zero' : 'gr-txt', x: ml - 8, y: Y(v) + 4, 'text-anchor': 'end' }, cfg.eixo(v)));
  }
  for (let k = 0; k < 5; k++) {
    const tv = t0 + ((t1 - t0) * k) / 4, d = new Date(tv);
    svg.append(s('text', { class: 'gr-txt', x: X(tv), y: altura - 8, 'text-anchor': k === 0 ? 'start' : k === 4 ? 'end' : 'middle' },
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`));
  }
  if (cfg.ref) {
    svg.append(s('line', { class: 'gr-ref', x1: ml, x2: largura - mr, y1: Y(cfg.ref.valor), y2: Y(cfg.ref.valor) }),
      s('text', { class: 'gr-txt', x: largura - mr, y: Y(cfg.ref.valor) - 5, 'text-anchor': 'end' }, cfg.ref.rotulo));
  }
  const pts = jogos.map((j) => ({ j, x: X(t(j.data)), y: Y(cfg.valor(j)) }));
  for (const q of pts) {
    const cls = `gr-ponto ${cfg.cor ? cfg.cor(q.j) : ''}`.trim();
    svg.append(fimDeSemana(q.j.data)
      ? s('circle', { class: cls, cx: q.x, cy: q.y, r: 4 })                                         // fim de semana: bolinha
      : s('rect', { class: cls, x: q.x - 4, y: q.y - 4, width: 8, height: 8, rx: 1 }));            // meio de semana: quadrado
  }
  const destaque = s('circle', { class: 'gr-destaque', r: 9, cx: -20, cy: -20 });
  svg.append(destaque);
  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    let melhor = null, dm = 28 * 28;
    for (const q of pts) { const d = (q.x - px) ** 2 + (q.y - py) ** 2; if (d < dm) { dm = d; melhor = q; } }
    if (!melhor) { destaque.setAttribute('cx', -20); esconderDica(); return; }
    destaque.setAttribute('cx', melhor.x); destaque.setAttribute('cy', melhor.y);
    mostrarDica(e.clientX, e.clientY, cfg.dica(melhor.j));
  });
  svg.addEventListener('pointerleave', () => { destaque.setAttribute('cx', -20); esconderDica(); });
  return svg;
}

/** Legenda: forma = dia da semana; cor = sinal (só no gráfico de renda). Sempre visível: a forma sozinha não se explica. */
function legenda(comSinal) {
  const icone = (forma, classe) => s('svg', { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': 'true' },
    forma === 'bola' ? s('circle', { class: `gr-ponto ${classe}`, cx: 6, cy: 6, r: 4 }) : s('rect', { class: `gr-ponto ${classe}`, x: 2, y: 2, width: 8, height: 8, rx: 1 }));
  const item = (ic, txt) => h('span', { class: 'item' }, ic, txt);
  return h('div', { class: 'gr-legenda', role: 'group', 'aria-label': 'Legenda do gráfico' },
    item(icone('bola', comSinal ? 'neutro' : ''), 'fim de semana (sábado e domingo)'),
    item(icone('quad', comSinal ? 'neutro' : ''), 'meio de semana (segunda a sexta)'),
    comSinal ? item(icone('bola', 'pos'), 'renda positiva') : null,
    comSinal ? item(icone('bola', 'neg'), 'renda negativa (despesa maior que a bilheteria)') : null);
}

// ── os cinco gráficos ──
export const FAIXAS = [0, 500, 1000, 2000, 5000, 10000, 20000, 40000, Infinity];
export const ROTULO_FAIXA = ['0', '500', '1 mil', '2 mil', '5 mil', '10 mil', '20 mil', '40 mil'];
export const textoFaixa = (a, b) => (b === Infinity ? `${fmtInt.format(a)} ou mais` : `de ${fmtInt.format(a)} a ${fmtInt.format(b - 1)}`);

/** opcoes.daCompeticao: para a página de UMA competição. Some com os gráficos que comparam competições e o jogo a jogo passa a mostrar
 *  os MAX_JOGOS_JOGO_A_JOGO jogos mais recentes (em vez de pedir mais filtros), dizendo isso no título. */
export function renderGraficos(alvo, jogos, opcoes = {}, tentativa = 0) {
  const daCompeticao = !!opcoes.daCompeticao;
  const medida = alvo.clientWidth;   // medido ANTES de limpar: sem o conteúdo a página encolhe e a barra de rolagem some
  alvo.replaceChildren();
  const comPub = jogos.filter((j) => j.pub != null);
  if (!jogos.length) { alvo.append(h('p', { class: 'muted', text: 'Nenhum jogo com esses filtros.' })); return; }
  if (comPub.length < 2) { alvo.append(h('p', { class: 'aviso', text: 'Poucos jogos com público registrado nos filtros atuais para desenhar gráficos. Afrouxe os filtros.' })); return; }
  // largura útil do gráfico = largura do cartão menos o espaçamento interno (32px); em telas >= 900px a grade tem duas colunas (vão de 16px)
  const duas = window.matchMedia('(min-width: 900px)').matches;
  const interno = (w) => Math.max(240, Math.floor(w - 34));
  const largura = interno(medida || 640);
  const larguraCard = interno(duas ? ((medida || 900) - 16) / 2 : medida || 640);
  const grade = h('div', { class: 'grade-graficos' });

  // 1. faixas de público
  const contFaixa = ROTULO_FAIXA.map(() => 0);
  for (const j of comPub) contFaixa[FAIXAS.findIndex((a, i) => j.pub >= a && j.pub < FAIXAS[i + 1])]++;
  const iTop = contFaixa.indexOf(Math.max(...contFaixa));
  grade.append(cartao('Jogos por faixa de público',
    `A faixa mais comum é ${textoFaixa(FAIXAS[iTop], FAIXAS[iTop + 1])} pessoas: ${plural(contFaixa[iTop], 'jogo', 'jogos')} (${fmtPct.format(contFaixa[iTop] / comPub.length)}). Cada coluna começa no valor indicado.`,
    colunas(contFaixa.map((n, i) => ({ rot: ROTULO_FAIXA[i], valor: n, dica: [plural(n, 'jogo', 'jogos'), `público ${textoFaixa(FAIXAS[i], FAIXAS[i + 1])}`] })), larguraCard, (v) => fmtInt.format(v)),
    { colunas: ['Faixa de público', 'Jogos'], linhas: contFaixa.map((n, i) => [textoFaixa(FAIXAS[i], FAIXAS[i + 1]), fmtInt.format(n)]) }));

  // 2. público médio por mês
  const porMes = new Map();
  for (const j of comPub) { const m = j.data.slice(0, 7); (porMes.get(m) || porMes.set(m, []).get(m)).push(j.pub); }
  const chaves = [...porMes.keys()].sort();
  if (chaves.length >= 2) {
    const meses = [];
    let [a, m] = chaves[0].split('-').map(Number);
    const [fa, fm] = chaves[chaves.length - 1].split('-').map(Number);
    while (a < fa || (a === fa && m <= fm)) { meses.push(`${a}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; a++; } }
    const doisAnos = chaves[0].slice(0, 4) !== chaves[chaves.length - 1].slice(0, 4);
    const itens = meses.map((k) => {
      const v = porMes.get(k) || [], mm = Number(k.slice(5)) - 1;
      return { rot: doisAnos ? `${MESES[mm]}/${k.slice(2, 4)}` : MESES[mm], valor: v.length ? media(v) : 0, n: v.length, mes: `${MESES[mm]} de ${k.slice(0, 4)}`,
        dica: v.length ? [`${fmtInt.format(media(v))} de público médio`, `${MESES[mm]} de ${k.slice(0, 4)} · ${plural(v.length, 'jogo', 'jogos')}`] : [`${MESES[mm]} de ${k.slice(0, 4)}`, 'sem jogos com público'] };
    });
    const melhor = itens.reduce((x, i) => (i.valor > x.valor ? i : x), itens[0]);
    grade.append(cartao('Público médio por mês', `O mês de maior público médio é ${melhor.mes}: ${fmtInt.format(melhor.valor)} pessoas por jogo.`,
      colunas(itens, larguraCard, (v) => fmtInt.format(v)),
      { colunas: ['Mês', 'Público médio', 'Jogos'], linhas: itens.map((i) => [i.mes, i.n ? fmtInt.format(i.valor) : '—', fmtInt.format(i.n)]) }));
  } else {
    grade.append(vazio('Público médio por mês', 'Os jogos filtrados cabem num único mês; amplie o período para ver a evolução.'));
  }

  // 3. público médio por competição
  const porComp = new Map();
  if (!daCompeticao) {
  for (const j of comPub) (porComp.get(j.comp) || porComp.set(j.comp, []).get(j.comp)).push(j.pub);
  const comps = [...porComp.entries()].filter(([, v]) => v.length >= 3).map(([nome, v]) => ({ nome, valor: media(v), n: v.length }))
    .sort((x, y) => y.valor - x.valor).slice(0, 12);
  if (comps.length >= 2) {
    grade.append(cartao('Público médio por competição', `Competições com pelo menos 3 jogos com público registrado${porComp.size > comps.length ? '; as 12 de maior público médio' : ''}.`,
      barrasH(comps.map((c) => ({ nome: c.nome, sub: plural(c.n, 'jogo', 'jogos'), valor: c.valor, dica: [`${fmtInt.format(c.valor)} de público médio`, `${c.nome} · ${plural(c.n, 'jogo', 'jogos')}`] })), (v) => fmtInt.format(v)),
      { colunas: ['Competição', 'Público médio', 'Jogos'], linhas: comps.map((c) => [c.nome, fmtInt.format(c.valor), fmtInt.format(c.n)]) }));
  } else {
    grade.append(vazio('Público médio por competição', 'Só há uma competição (ou poucas com 3 jogos) nos filtros atuais. Tire o filtro de competição para comparar.'));
  }
  }

  // 4. despesa maior que a bilheteria, por competição
  const rend = new Map();
  if (!daCompeticao) {
  for (const j of jogos) if (j.renda != null) (rend.get(j.comp) || rend.set(j.comp, []).get(j.comp)).push(j.renda);
  const deficit = [...rend.entries()].filter(([, v]) => v.length >= 8).map(([nome, v]) => ({ nome, n: v.length, neg: v.filter((x) => x < 0).length }))
    .map((c) => ({ ...c, valor: c.neg / c.n })).sort((x, y) => y.valor - x.valor).slice(0, 12);
  if (deficit.length >= 2) {
    grade.append(cartao('Jogos em que a despesa superou a bilheteria',
      'Parcela dos jogos com renda líquida negativa, por competição (pelo menos 8 borderôs lidos). O valor é do jogo, não do clube.',
      barrasH(deficit.map((c) => ({ nome: c.nome, sub: `${fmtInt.format(c.neg)} de ${plural(c.n, 'borderô', 'borderôs')}`, valor: c.valor,
        dica: [fmtPct.format(c.valor), `${c.nome} · ${fmtInt.format(c.neg)} de ${plural(c.n, 'jogo', 'jogos')} com renda líquida negativa`] })), (v) => fmtPct.format(v)),
      { colunas: ['Competição', 'Jogos com despesa > bilheteria', 'Borderôs lidos', 'Parcela'], linhas: deficit.map((c) => [c.nome, fmtInt.format(c.neg), fmtInt.format(c.n), fmtPct.format(c.valor)]) }));
  } else {
    grade.append(vazio('Jogos em que a despesa superou a bilheteria', 'Há poucas competições com 8 ou mais borderôs lidos nos filtros atuais.'));
  }
  }

  // 5. público jogo a jogo (só com poucos jogos, para cada ponto ser legível)
  const semDia = (j) => DIAS[diaDaSemana(j.data)];
  const nJogoAJogo = (n, quem) => `Disponível quando os filtros deixam até ${MAX_JOGOS_JOGO_A_JOGO} jogos ${quem} (agora há ${fmtInt.format(n)}). Filtre por um clube ou uma competição.`;
  const larga = (el) => { el.classList.add('larga'); grade.append(el); };
  const recortar = (js) => (daCompeticao && js.length > MAX_JOGOS_JOGO_A_JOGO ? [...js].sort((x, y) => y.data.localeCompare(x.data)).slice(0, MAX_JOGOS_JOGO_A_JOGO) : js);
  if ((daCompeticao || comPub.length <= MAX_JOGOS_JOGO_A_JOGO) && comPub.length >= 3) {
    const recorte = daCompeticao && comPub.length > MAX_JOGOS_JOGO_A_JOGO;
    const ordenados = [...recortar(comPub)].sort((x, y) => x.data.localeCompare(y.data));
    const med = mediana(ordenados.map((j) => j.pub));
    const card = cartao(recorte ? `Público jogo a jogo: os ${MAX_JOGOS_JOGO_A_JOGO} jogos mais recentes` : 'Público jogo a jogo',
      recorte ? `Cada ponto é um jogo: os ${MAX_JOGOS_JOGO_A_JOGO} mais recentes, de ${fmtInt.format(comPub.length)} com público registrado (de ${fmtData(ordenados[0].data)} a ${fmtData(ordenados[ordenados.length - 1].data)}). A linha marca a mediana desses jogos; passe o mouse para ver o jogo.`
        : `Cada ponto é um jogo (${plural(comPub.length, 'jogo', 'jogos')}). A linha marca a mediana; passe o mouse para ver o jogo.`,
      h('div', null, legenda(false), dispersao(ordenados, largura, {
        valor: (j) => j.pub, eixo: (v) => fmtInt.format(v), aria: 'Dispersão do público de cada jogo ao longo do tempo',
        ref: { valor: med, rotulo: `mediana ${fmtInt.format(med)}` },
        dica: (j) => [`${fmtInt.format(j.pub)} pessoas`, { jogo: [j.mandante, j.visitante] }, `${semDia(j)}, ${fmtData(j.data)} · ${j.comp}`],
      })),
      { colunas: ['Data', 'Dia', 'Jogo', 'Competição', 'Público'], linhas: ordenados.map((j) => [fmtData(j.data), semDia(j), `${j.mandante} x ${j.visitante}`, j.comp, fmtInt.format(j.pub)]) });
    larga(card);
  } else {
    larga(vazio('Público jogo a jogo', comPub.length < 3 ? 'Poucos jogos com público registrado nos filtros atuais para desenhar este gráfico.' : nJogoAJogo(comPub.length, 'com público')));
  }

  // 6. renda líquida jogo a jogo (mesmos filtros; só jogos com borderô lido)
  const comRenda = jogos.filter((j) => j.renda != null);
  if ((daCompeticao || comRenda.length <= MAX_JOGOS_JOGO_A_JOGO) && comRenda.length >= 3) {
    const recorteR = daCompeticao && comRenda.length > MAX_JOGOS_JOGO_A_JOGO;
    const ordenados = [...recortar(comRenda)].sort((x, y) => x.data.localeCompare(y.data));
    const neg = ordenados.filter((j) => j.renda < 0).length;
    const card = cartao(recorteR ? `Renda líquida jogo a jogo: os ${MAX_JOGOS_JOGO_A_JOGO} jogos mais recentes` : 'Renda líquida jogo a jogo',
      `${recorteR ? `Os ${MAX_JOGOS_JOGO_A_JOGO} jogos com borderô mais recentes, de ${fmtInt.format(comRenda.length)} (de ${fmtData(ordenados[0].data)} a ${fmtData(ordenados[ordenados.length - 1].data)})` : plural(comRenda.length, 'jogo com borderô', 'jogos com borderô')}: ${fmtInt.format(neg)} com despesa maior que a bilheteria (abaixo da linha do zero). Renda líquida = arrecadação − despesas.`,
      h('div', null, legenda(true), dispersao(ordenados, largura, {
        valor: (j) => j.renda, eixo: fmtEixoBRL, destacarZero: true, aria: 'Dispersão da renda líquida de cada jogo ao longo do tempo', cor: (j) => (j.renda < 0 ? 'neg' : 'pos'),
        dica: (j) => [`${fmtBRL(j.renda)} de renda líquida`, { jogo: [j.mandante, j.visitante] }, `${semDia(j)}, ${fmtData(j.data)} · ${j.comp}`,
          `arrecadação ${fmtBRL(j.bruta)} · despesas ${fmtBRL(j.desp)}`],
      })),
      { colunas: ['Data', 'Dia', 'Jogo', 'Competição', 'Arrecadação', 'Despesas', 'Renda líquida'],
        linhas: ordenados.map((j) => [fmtData(j.data), semDia(j), `${j.mandante} x ${j.visitante}`, j.comp, fmtBRL(j.bruta), fmtBRL(j.desp), fmtBRL(j.renda)]) });
    larga(card);
  } else {
    larga(vazio('Renda líquida jogo a jogo', comRenda.length < 3 ? 'Poucos jogos com borderô lido nos filtros atuais para desenhar este gráfico.' : nJogoAJogo(comRenda.length, 'com borderô')));
  }
  alvo.append(grade);
  // a barra de rolagem da página pode aparecer só depois do primeiro desenho e mudar a largura útil: mede de novo uma vez
  if (tentativa < 2) requestAnimationFrame(() => { if (!alvo.hidden && Math.abs(alvo.clientWidth - medida) > 2) renderGraficos(alvo, jogos, opcoes, tentativa + 1); });
}
