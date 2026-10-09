// Leitura dos dados em tempo de build (data/*.csv e data/meta.json, escritos pelo Job B) e agregações usadas pelas páginas.
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'data');
const ler = (nome) => fs.readFileSync(path.join(DIR, nome), 'utf-8').replace(/^﻿/, '');

/** CSV com campos entre aspas, aspas duplicadas e quebras de linha dentro do campo. */
export function parseCsv(texto) {
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas;
  return resto.filter((l) => l.length > 1).map((l) => Object.fromEntries(cab.map((k, i) => [k, l[i] ?? ''])));
}

const num = (x) => {
  if (x === '' || x == null) return null;
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
};

const SIGLAS_UF = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));

/** Estado em que o jogo foi disputado: a sigla no fim do texto do estádio ("Maracanã - Rio de Janeiro - RJ"); se não houver,
 *  o estado da competição estadual. Competições nacionais sempre trazem a sigla no estádio (conferido: 100% dos jogos). */
function estadoDoJogo(estadio, ufCompeticao) {
  const m = /\s-\s([A-Z]{2})\s*$/.exec(estadio || '');
  if (m && SIGLAS_UF.has(m[1])) return m[1];
  return ufCompeticao && ufCompeticao !== 'BR' ? ufCompeticao : '';
}

export const meta = JSON.parse(ler('meta.json'));
export const competicoes = parseCsv(ler('competicoes.csv'));

/** Um jogo por linha, com os nomes já em formato de exibição e os números convertidos. */
export const jogos = parseCsv(ler('jogos.csv')).map((r) => {
  const flags = [];
  if (r.aritmetica_bordero === 'aviso' || r.aritmetica_bordero === 'incompleto') flags.push('A');
  if (r.data_confere === 'NAO') flags.push('D');
  if (r.times_conferem === 'invertido') flags.push('I');
  if (r.documento_faltando) flags.push('F');
  return {
    chave: `${r.fonte}/${r.comp_id}/${r.game_id}`,
    fonte: r.fonte, uf: r.uf, federacao: r.federacao,
    comp: r.competicao_nome, compUrl: r.competicao_url, divisao: r.divisao, nivel: r.nivel, fase: r.fase, rodada: r.rodada,
    data: r.data, horario: r.horario,
    mandante: r.mandante_canonico || r.mandante, visitante: r.visitante_canonico || r.visitante,
    estadio: r.estadio.trim() === '/' ? '' : r.estadio, ufJogo: estadoDoJogo(r.estadio, r.uf), status: r.status,
    pm: num(r.placar_mandante), pv: num(r.placar_visitante),
    pub: num(r.publico_total_num), pag: num(r.publico_pagante_num), nao: num(r.publico_nao_pagante_num),
    bruta: num(r.arrecadacao_bruta_num), desp: num(r.despesas_totais_num), renda: num(r.renda_liquida_num),
    temS: r.tem_sumula === '1', temB: r.tem_bordero === '1', urlS: r.url_sumula, urlB: r.url_bordero,
    falt: r.documento_faltando, flags: flags.join(''),
  };
});

export const realizados = jogos.filter((j) => j.status === 'realizado');

// ── formatação (pt-BR) ──────────────────────────────────────────────────────────────────────────────────────────────
export const fmtInt = (v) => (v == null ? '—' : new Intl.NumberFormat('pt-BR').format(Math.round(v)));
export const fmtBRL = (v) => (v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v));
export const fmtBRLcompacto = (v) => {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `R$ ${(v / 1e9).toFixed(1).replace('.', ',')} bi`;
  if (a >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace('.', ',')} mi`;
  if (a >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${Math.round(v)}`;
};
export const fmtData = (iso) => (iso && iso.length === 10 ? `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
export const soma = (xs) => xs.reduce((a, b) => a + (b ?? 0), 0);

// ── agregações ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Estatísticas por competição (só jogos realizados). */
export function porCompeticao() {
  const mapa = new Map();
  for (const j of realizados) {
    const k = `${j.fonte}/${j.comp}`;
    if (!mapa.has(k)) mapa.set(k, { comp: j.comp, compUrl: j.compUrl, uf: j.uf, federacao: j.federacao, divisao: j.divisao, nivel: j.nivel, jogos: [] });
    mapa.get(k).jogos.push(j);
  }
  return [...mapa.values()].map((c) => {
    const cp = c.jogos.filter((j) => j.pub != null);
    const cb = c.jogos.filter((j) => j.bruta != null);
    return {
      ...c, n: c.jogos.length, comBordero: c.jogos.filter((j) => j.temB).length, nPub: cp.length,
      pubTotal: soma(cp.map((j) => j.pub)), pubMedio: cp.length ? soma(cp.map((j) => j.pub)) / cp.length : null,
      brutaTotal: soma(cb.map((j) => j.bruta)), rendaTotal: soma(c.jogos.filter((j) => j.renda != null).map((j) => j.renda)),
    };
  });
}

/** Estatísticas por clube como MANDANTE (jogos realizados com público). */
export function porClube(minimo = 3) {
  const mapa = new Map();
  for (const j of realizados) {
    if (j.pub == null) continue;
    if (!mapa.has(j.mandante)) mapa.set(j.mandante, []);
    mapa.get(j.mandante).push(j);
  }
  return [...mapa.entries()].filter(([, js]) => js.length >= minimo).map(([clube, js]) => {
    const maior = js.reduce((a, b) => (b.pub > a.pub ? b : a));
    const comRenda = js.filter((j) => j.renda != null);
    // UF do clube = estado da competição estadual em que mais jogou em casa (as nacionais têm UF 'BR')
    const cont = {};
    for (const j of js) if (j.uf && j.uf !== 'BR') cont[j.uf] = (cont[j.uf] || 0) + 1;
    const uf = Object.entries(cont).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'BR';
    return {
      clube, uf, n: js.length, pubMedio: soma(js.map((j) => j.pub)) / js.length,
      pubTotal: soma(js.map((j) => j.pub)), maior: maior.pub, maiorContra: maior.visitante, maiorData: maior.data,
      rendaMedia: comRenda.length ? soma(comRenda.map((j) => j.renda)) / comRenda.length : null, nRenda: comRenda.length,
    };
  });
}

/** Versão compacta para o explorador (/dados/jogos.json): arrays na ordem de CAMPOS_JSON. */
export const CAMPOS_JSON = ['data', 'horario', 'uf', 'comp', 'compUrl', 'mandante', 'visitante', 'pm', 'pv', 'estadio', 'ufJogo', 'pub', 'bruta',
  'desp', 'renda', 'urlS', 'urlB', 'flags', 'status', 'fase', 'rodada', 'falt'];
export function jogosCompactos() {
  const ordenados = [...jogos].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  return { campos: CAMPOS_JSON, gerado_em: meta.gerado_em, linhas: ordenados.map((j) => CAMPOS_JSON.map((c) => j[c] ?? null)) };
}

/** Público/renda dos clubes COMO MANDANTE, por competição (jogos disputados com público). Alimenta /clubes (/dados/clubes.json):
 *  o navegador soma as linhas de todas as competições ou só as da competição escolhida no filtro. */
export function clubesPorCompeticao() {
  const grupos = new Map(); // `${clube}\u0000${comp}` -> jogos
  const doClube = new Map(); // clube -> jogos (todas as competições), para descobrir a UF
  for (const j of realizados) {
    if (j.pub == null) continue;
    const k = `${j.mandante}\u0000${j.comp}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(j);
    if (!doClube.has(j.mandante)) doClube.set(j.mandante, []);
    doClube.get(j.mandante).push(j);
  }
  const nomes = [...doClube.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const comps = [...new Set(realizados.filter((j) => j.pub != null).map((j) => j.comp))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const ufDe = (js) => {
    const cont = {};
    for (const j of js) if (j.uf && j.uf !== 'BR') cont[j.uf] = (cont[j.uf] || 0) + 1;
    return Object.entries(cont).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'BR';
  };
  const iClube = new Map(nomes.map((n, i) => [n, i]));
  const iComp = new Map(comps.map((n, i) => [n, i]));
  const linhas = [...grupos.entries()].map(([k, js]) => {
    const [clube, comp] = k.split('\u0000');
    const maior = js.reduce((a, b) => (b.pub > a.pub ? b : a));
    const comRenda = js.filter((j) => j.renda != null);
    return [iClube.get(clube), iComp.get(comp), js.length, soma(js.map((j) => j.pub)), maior.pub, maior.visitante, maior.data,
      soma(comRenda.map((j) => j.renda)), comRenda.length];
  });
  return { clubes: nomes.map((n) => [n, ufDe(doClube.get(n))]), comps, linhas,
    campos: ['clube', 'comp', 'n', 'pubTotal', 'maior', 'maiorContra', 'maiorData', 'rendaTotal', 'nRenda'] };
}
