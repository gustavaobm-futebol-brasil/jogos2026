// Aba "Resumo" do explorador: números-chave, parte financeira e contagem de jogos por competição e por estádio,
// sempre sobre os jogos que passam pelos filtros atuais.
import { h, fmtInt, fmtDec, fmtPct, fmtBRL, fmtBRLCompacto, fmtData, plural, soma, media, mediana } from './util.js';

const POR_ESTADIO_INICIAL = 15;

/** Agrupa jogos por uma chave e calcula contagem e público. */
function agrupar(jogos, chaveDe) {
  const mapa = new Map();
  for (const j of jogos) {
    const k = chaveDe(j);
    if (k == null) continue;
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(j);
  }
  return [...mapa.entries()].map(([k, js]) => {
    const pubs = js.filter((j) => j.pub != null).map((j) => j.pub);
    return { chave: k, n: js.length, nPub: pubs.length, medio: media(pubs), maior: pubs.length ? Math.max(...pubs) : null };
  }).sort((a, b) => b.n - a.n || (b.medio ?? 0) - (a.medio ?? 0));
}

function tile(rotulo, valor, detalhe) {
  return h('div', { class: 'kpi sans' }, h('div', { class: 'l', text: rotulo }), h('div', { class: 'v', text: valor }),
    detalhe ? h('div', { class: 'd', text: detalhe }) : null);
}

function jogoTxt(j) {
  return `${j.mandante} x ${j.visitante}, ${fmtData(j.data)}`;
}

/**
 * @param {HTMLElement} alvo      painel onde desenhar
 * @param {object[]} jogos        jogos filtrados (linhas do explorador)
 * @param {string[][]} estadios   tabela [texto de exibição, nome para busca] indexada por j.estId
 * @param {{competicao:(nome:string)=>void, estadio:(id:number)=>void}} aoFiltrar  cliques nas tabelas aplicam o filtro
 */
export function renderResumo(alvo, jogos, estadios, aoFiltrar) {
  alvo.replaceChildren();
  if (!jogos.length) { alvo.append(h('p', { class: 'muted', text: 'Nenhum jogo com esses filtros.' })); return; }

  const comPub = jogos.filter((j) => j.pub != null);
  const positivos = comPub.filter((j) => j.pub > 0);
  const pubs = comPub.map((j) => j.pub);
  const maior = comPub.reduce((a, b) => (!a || b.pub > a.pub ? b : a), null);
  const menor = positivos.reduce((a, b) => (!a || b.pub < a.pub ? b : a), null);
  const fechados = comPub.length - positivos.length;

  alvo.append(h('p', { class: 'muted' },
    `${plural(jogos.length, 'jogo', 'jogos')} nos filtros atuais; `,
    comPub.length === jogos.length ? 'todos com público registrado.' : `${plural(comPub.length, 'tem', 'têm')} público registrado (o resto não tem borderô publicado).`));

  if (!comPub.length) {
    alvo.append(h('p', { class: 'aviso', text: 'Nenhum desses jogos tem público registrado, então não há números de público para resumir.' }));
  } else {
    alvo.append(
      h('h2', { text: 'Público' }),
      h('div', { class: 'kpis' },
        tile('Público médio', fmtInt.format(media(pubs)), 'soma do público ÷ número de jogos'),
        tile('Público mediano', fmtInt.format(mediana(pubs)), 'metade dos jogos teve público menor, metade maior'),
        tile('Maior público', fmtInt.format(maior.pub), jogoTxt(maior)),
        menor
          ? tile('Menor público', fmtInt.format(menor.pub), `${jogoTxt(menor)}${fechados ? ` · sem contar ${plural(fechados, 'jogo de portões fechados', 'jogos de portões fechados')} (público 0)` : ''}`)
          : tile('Menor público', '0', 'todos os jogos com público foram de portões fechados'),
        tile('Público total', fmtInt.format(soma(pubs)), `em ${plural(comPub.length, 'jogo', 'jogos')}`)));
    if (media(pubs) > 1.5 * mediana(pubs) && comPub.length >= 10) {
      alvo.append(h('p', { class: 'nota', text: 'A média está bem acima da mediana: alguns jogos de muito público puxam a média para cima. A mediana mostra melhor o jogo típico.' }));
    }
  }

  // ── financeiro (só jogos com borderô lido) ──
  const comBordero = jogos.filter((j) => j.bruta != null);
  if (comBordero.length) {
    const comRenda = jogos.filter((j) => j.renda != null);   // não depende de a arrecadação bruta estar lida
    const deficit = comRenda.filter((j) => j.renda < 0);
    alvo.append(
      h('h2', { text: 'Financeiro' }),
      h('p', { class: 'muted small', text: `Considera só os ${plural(comBordero.length, 'jogo', 'jogos')} com borderô lido.` }),
      h('div', { class: 'kpis' },
        tile('Arrecadação bruta total', fmtBRLCompacto(soma(comBordero.map((j) => j.bruta))), fmtBRL(soma(comBordero.map((j) => j.bruta)))),
        tile('Arrecadação média por jogo', fmtBRL(media(comBordero.map((j) => j.bruta))), `mediana ${fmtBRL(mediana(comBordero.map((j) => j.bruta)))}`),
        comRenda.length ? tile('Renda líquida média', fmtBRL(media(comRenda.map((j) => j.renda))), `mediana ${fmtBRL(mediana(comRenda.map((j) => j.renda)))}`) : null,
        comRenda.length ? tile('Despesa maior que a bilheteria', fmtPct.format(deficit.length / comRenda.length),
          `${plural(deficit.length, 'jogo', 'jogos')} de ${fmtInt.format(comRenda.length)} (renda líquida negativa)`) : null));
  }

  // ── contagens ──
  const porComp = agrupar(jogos, (j) => j.comp || null);
  const porEst = agrupar(jogos, (j) => (j.estId != null && j.estId >= 0 ? j.estId : null));
  const semEstadio = jogos.filter((j) => j.estId == null || j.estId < 0).length;

  const tabela = (cabecalho, linhas, aoClicar) => h('div', { class: 'tabela' }, h('table', null,
    h('thead', null, h('tr', null, cabecalho.map(([t, n]) => h('th', { class: n ? 'n' : '', text: t })))),
    h('tbody', null, linhas.map((l) => h('tr', null,
      h('td', null, h('button', { type: 'button', class: 'link-filtro', title: 'Filtrar por este item', onclick: () => aoClicar(l) }, l.nome)),
      h('td', { class: 'n', text: fmtInt.format(l.n) }),
      h('td', { class: 'n', text: l.medio == null ? '—' : fmtInt.format(l.medio) }),
      h('td', { class: 'n', text: l.maior == null ? '—' : fmtInt.format(l.maior) }))))));

  const cab = [['', false], ['Jogos', true], ['Público médio', true], ['Maior público', true]];
  const linhasComp = porComp.map((g) => ({ ...g, nome: g.chave }));
  const secComp = h('section', null,
    h('h2', { text: 'Jogos por competição' }),
    tabela([['Competição', false], ...cab.slice(1)], linhasComp, (l) => aoFiltrar.competicao(l.nome)));

  const linhasEst = porEst.map((g) => ({ ...g, nome: estadios[g.chave][0], busca: estadios[g.chave][1] }));
  const secEst = h('section', null, h('h2', { text: 'Jogos por estádio' }));
  const desenharEst = (tudo) => {
    secEst.querySelectorAll('.tabela, .mais, .muted').forEach((n) => n.remove());
    secEst.append(tabela([['Estádio', false], ...cab.slice(1)], tudo ? linhasEst : linhasEst.slice(0, POR_ESTADIO_INICIAL), (l) => aoFiltrar.estadio(l.chave)));
    if (linhasEst.length > POR_ESTADIO_INICIAL) {
      secEst.append(h('button', { type: 'button', class: 'acao mais', onclick: () => desenharEst(!tudo) },
        tudo ? 'Mostrar só os 15 com mais jogos' : `Ver todos os ${fmtInt.format(linhasEst.length)} estádios`));
    }
    if (semEstadio) secEst.append(h('p', { class: 'muted small', text: `${plural(semEstadio, 'jogo sem', 'jogos sem')} estádio informado ficou de fora desta tabela.` }));
  };
  desenharEst(false);

  alvo.append(h('div', { class: 'duas largas' }, secComp, secEst),
    h('p', { class: 'legenda', text: 'Clique no nome de uma competição ou de um estádio para filtrar os jogos por ele; os filtros ficam no topo da página.' }));
}
