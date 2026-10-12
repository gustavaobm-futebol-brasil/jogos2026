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
  'desp', 'renda', 'urlS', 'urlB', 'flags', 'status', 'fase', 'rodada', 'falt', 'estId'];
const semAcentoBuild = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Palavras que não distinguem um estádio (título, tipo de praça, prenomes comuns): ficam de fora da comparação de nomes.
const PALAVRAS_COMUNS = new Set(`estadio arena municipal parque complexo centro esportivo governador prefeito presidente doutor professor major coronel
  general vereador deputado senador campo gigante estadual jornalista engenheiro comendador capitao tenente
  jose joao luiz luis antonio carlos pedro paulo francisco manoel manuel maria nilton jorge portoes fechados`.split(/\s+/));

const siglaUF = (x) => SIGLAS_UF.has(x.toUpperCase()) && x.length === 2;

/** Nome e cidade de um estádio a partir do texto da federação: "Arena Condá - Chapecó - SC", "Arena Condá / Chapecó" ou
 *  "Kleber Andrade, Cariacica". Observações como "(Portões Fechados)" são descartadas; apelidos entre parênteses ou aspas
 *  ficam no nome (ajudam a reconhecer o mesmo estádio). */
function partesEstadio(texto) {
  let e = (texto || '').replace(/\((?=[^)]*(port[oõ]es|fechad))[^)]*\)/gi, '').replace(/\s+/g, ' ').trim();
  if (!e) return null;
  let nome = e, cidade = '';
  if (e.includes(' / ')) {
    const [n, ...resto] = e.split(' / ');
    nome = n.trim();
    cidade = resto.join(' / ').trim();
  } else if (e.includes(' - ')) {
    const p = e.split(' - ').map((x) => x.trim());
    if (p.length >= 3) { nome = p.slice(0, -2).join(' - '); cidade = p[p.length - 2]; }
    else { nome = p[0]; cidade = siglaUF(p[1]) ? '' : p[1]; }
  } else if (e.includes(', ')) {
    const k = e.lastIndexOf(', ');
    nome = e.slice(0, k).trim();
    cidade = e.slice(k + 2).trim();
  }
  nome = nome.replace(/\s+-\s+([A-Za-z]{2})$/, (m, uf) => (siglaUF(uf) ? '' : m)).trim();   // "JOÃO Saldanha - RJ" -> "JOÃO Saldanha"
  if (!/[a-zA-ZÀ-ÿ]{3}/.test(cidade)) cidade = '';                                           // "....." não é cidade
  return { nome, cidade };
}

const fichaTokens = (nome) => new Set((semAcentoBuild(nome).match(/[a-z]{4,}/g) || []).filter((x) => !PALAVRAS_COMUNS.has(x)));
const contido = (a, b) => a.size > 0 && [...a].every((x) => b.has(x)) && (a.size > 1 || [...a][0].length >= 5);

/** Apelidos/abreviações que nenhuma regra deduz (ex.: "Pv" = Presidente Vargas), em src/lib/estadios_alias.csv:
 *  texto (como a federação escreve), uf (estado do jogo; vazio = qualquer) e estadio (outra grafia que existe nos dados). */
const APELIDOS = (() => {
  try {
    const arq = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'estadios_alias.csv'), 'utf-8').replace(/^\uFEFF/, '');
    return parseCsv(arq).map((r) => ({ texto: semAcentoBuild(r.texto), uf: r.uf.trim().toUpperCase(), estadio: r.estadio.trim() }));
  } catch { return []; }
})();
function textoComApelido(estadio, uf) {
  const n = semAcentoBuild(estadio);
  const a = APELIDOS.find((x) => x.texto === n && (!x.uf || x.uf === uf));
  return a ? a.estadio : estadio;
}

/** Une as grafias do mesmo estádio. 1) mesma grafia normalizada (caixa, acento); 2) nomes contidos um no outro ("Mineirão" e
 *  'Governador Magalhães Pinto "Mineirão"'), desde que a cidade seja a mesma, ou desconhecida de um dos lados e o estado coincida.
 *  Estádios de mesmo nome em cidades diferentes (ex.: "Estádio Municipal") continuam separados, e um nome sem cidade que casaria
 *  com estádios de cidades diferentes não é unido a nenhum (ambíguo). */
function agruparEstadios() {
  const info = jogos.map((j) => {
    const texto = textoComApelido(j.estadio, j.ufJogo);
    const q = partesEstadio(texto);
    return q && { ...q, nomeN: semAcentoBuild(q.nome), cidadeN: semAcentoBuild(q.cidade), texto, uf: j.ufJogo };
  });
  // 1) grupos por nome normalizado (+ cidade quando o mesmo nome existe em cidades diferentes)
  const cidadesDoNome = new Map();
  for (const i of info) if (i && i.cidadeN) (cidadesDoNome.get(i.nomeN) || cidadesDoNome.set(i.nomeN, new Set()).get(i.nomeN)).add(i.cidadeN);
  const grupos = new Map();
  const chaveDoJogo = info.map((i) => {
    if (!i) return null;
    const cidades = cidadesDoNome.get(i.nomeN);
    const chave = cidades && cidades.size > 1 ? `${i.nomeN}|${i.cidadeN}` : i.nomeN;
    const g = grupos.get(chave) || grupos.set(chave, { chave, grafias: new Map(), nomes: new Map(), cidades: new Map(), ufs: new Map(), jogos: 0, tokens: new Set() }).get(chave);
    g.grafias.set(i.texto, (g.grafias.get(i.texto) || 0) + 1);
    g.nomes.set(i.nome, (g.nomes.get(i.nome) || 0) + 1);
    if (i.cidadeN) g.cidades.set(i.cidadeN, (g.cidades.get(i.cidadeN) || 0) + 1);
    if (i.uf) g.ufs.set(i.uf, (g.ufs.get(i.uf) || 0) + 1);
    g.jogos++;
    for (const tk of fichaTokens(i.nome)) g.tokens.add(tk);
    return chave;
  });
  const lista = [...grupos.values()];
  const maisFrequente = (m) => (m.size ? [...m.entries()].sort((a, b) => b[1] - a[1])[0][0] : '');
  for (const g of lista) { g.cidade = maisFrequente(g.cidades); g.uf = maisFrequente(g.ufs); }

  // 2) uniões por nome contido
  const pai = new Map(lista.map((g) => [g.chave, g.chave]));
  const raiz = (k) => { while (pai.get(k) !== k) { pai.set(k, pai.get(pai.get(k))); k = pai.get(k); } return k; };
  const unir = (a, b) => { const ra = raiz(a), rb = raiz(b); if (ra !== rb) pai.set(ra, rb); };
  const parecidos = (a, b) => contido(a.tokens, b.tokens) || contido(b.tokens, a.tokens);
  for (let x = 0; x < lista.length; x++) {
    for (let y = x + 1; y < lista.length; y++) {
      const a = lista[x], b = lista[y];
      if (a.cidade && b.cidade && a.cidade === b.cidade && parecidos(a, b)) unir(a.chave, b.chave);
    }
  }
  for (const g of lista.filter((z) => !z.cidade)) {                      // sem cidade: precisa de destino único
    const alvos = lista.filter((o) => o !== g && o.cidade && o.uf === g.uf && parecidos(g, o));
    if (alvos.length && new Set(alvos.map((o) => o.cidade)).size === 1) alvos.forEach((o) => unir(g.chave, o.chave));
    else if (!alvos.length) for (const o of lista) if (o !== g && !o.cidade && o.uf === g.uf && parecidos(g, o)) unir(g.chave, o.chave);
  }

  // 3) um rótulo por grupo final: prefere a grafia com cidade ("Nome - Cidade - UF") e, entre elas, a mais frequente
  const finais = new Map();
  for (const g of lista) {
    const r = raiz(g.chave);
    const f = finais.get(r) || finais.set(r, { grafias: new Map(), nomes: new Map(), jogos: 0 }).get(r);
    for (const [k, v] of g.grafias) f.grafias.set(k, (f.grafias.get(k) || 0) + v);
    for (const [k, v] of g.nomes) f.nomes.set(k, (f.nomes.get(k) || 0) + v);
    f.jogos += g.jogos;
  }
  const comCidade = (txt) => { const q = partesEstadio(txt); return q && q.cidade ? 1 : 0; };
  const bonito = (s) => (s !== s.toUpperCase() ? s : s.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/ (D[aeo]s?|E) /g, (x) => x.toLowerCase()));
  const ids = new Map(), estadios = [];
  for (const [r, f] of finais) {
    const melhor = [...f.grafias.entries()].sort((a, b) => comCidade(b[0]) - comCidade(a[0]) || b[1] - a[1])[0][0];
    ids.set(r, estadios.length);
    estadios.push([bonito(melhor), bonito(partesEstadio(melhor).nome)]);
  }
  return { estadios, estIdPorJogo: chaveDoJogo.map((c) => (c == null ? -1 : ids.get(raiz(c)))), membros: finais };
}

export function jogosCompactos() {
  const { estadios, estIdPorJogo } = agruparEstadios();
  const comId = jogos.map((j, i) => ({ ...j, estId: estIdPorJogo[i] }));
  const ordenados = comId.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  return { campos: CAMPOS_JSON, gerado_em: meta.gerado_em, estadios, linhas: ordenados.map((j) => CAMPOS_JSON.map((c) => j[c] ?? null)) };
}

/** Público/renda dos clubes COMO MANDANTE, por competição (jogos disputados com público). Alimenta /clubes (/dados/clubes.json):
 *  o navegador soma as linhas de todas as competições, só as da competição escolhida, ou (opção) as de todas as competições dos
 *  clubes que participam da escolhida (`participantes`). `brasileiro` marca os clubes que jogaram alguma série (A–D) do Brasileiro. */
export function clubesPorCompeticao() {
  const grupos = new Map(); // `${clube} ${comp}` -> jogos
  const doClube = new Map(); // clube -> jogos em casa (todas as competições), para descobrir a UF
  const participa = new Map(); // comp -> Set de clubes (mandantes ou visitantes, com ou sem público)
  const brasileiro = new Set();
  const naSerieDoBrasileiro = (j) => j.fonte === 'cbf' && j.nivel === 'Nacional' && /^S[ée]rie [ABCD]$/.test(j.divisao) && /Brasileiro/.test(j.comp);
  for (const j of realizados) {
    for (const c of [j.mandante, j.visitante]) {
      if (!c) continue;
      if (!participa.has(j.comp)) participa.set(j.comp, new Set());
      participa.get(j.comp).add(c);
      if (naSerieDoBrasileiro(j)) brasileiro.add(c);
    }
    if (!doClube.has(j.mandante)) doClube.set(j.mandante, []);
    doClube.get(j.mandante).push(j);
    if (j.pub == null) continue;
    const k = `${j.mandante} ${j.comp}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(j);
  }
  const todos = new Set([...doClube.keys(), ...[...participa.values()].flatMap((s) => [...s])]);
  const nomes = [...todos].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const comps = [...new Set(realizados.filter((j) => j.pub != null).map((j) => j.comp))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  // UF do clube = estado em que mais jogou em casa (pelo estádio; sem sigla no estádio, vale o estado da competição estadual)
  const ufDe = (js) => {
    const cont = {};
    for (const j of js) if (j.ufJogo) cont[j.ufJogo] = (cont[j.ufJogo] || 0) + 1;
    return Object.entries(cont).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  };
  const iClube = new Map(nomes.map((n, i) => [n, i]));
  const iComp = new Map(comps.map((n, i) => [n, i]));
  const linhas = [...grupos.entries()].map(([k, js]) => {
    const [clube, comp] = k.split(' ');
    const maior = js.reduce((a, b) => (b.pub > a.pub ? b : a));
    const comRenda = js.filter((j) => j.renda != null);
    return [iClube.get(clube), iComp.get(comp), js.length, soma(js.map((j) => j.pub)), maior.pub, maior.visitante, maior.data,
      soma(comRenda.map((j) => j.renda)), comRenda.length];
  });
  return { clubes: nomes.map((n) => [n, ufDe(doClube.get(n) || [])]), comps, linhas,
    participantes: comps.map((c) => [...(participa.get(c) || [])].map((n) => iClube.get(n))),
    brasileiro: [...brasileiro].map((n) => iClube.get(n)),
    campos: ['clube', 'comp', 'n', 'pubTotal', 'maior', 'maiorContra', 'maiorData', 'rendaTotal', 'nRenda'] };
}

/** Só para conferência no build: grupos com mais de uma grafia. */
export function estadiosUnidos() {
  const { estadios, membros } = agruparEstadios();
  return [...membros.values()].filter((f) => f.grafias.size > 1).map((f) => ({ jogos: f.jogos, grafias: [...f.grafias.entries()].sort((a, b) => b[1] - a[1]) }))
    .sort((a, b) => b.jogos - a.jogos);
}
