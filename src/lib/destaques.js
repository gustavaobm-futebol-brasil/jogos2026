// Destaques dos últimos dias (página inicial). Os borderôs chegam com atraso (dias, às vezes semanas), então uma janela curta fica cheia de jogos
// sem público; a janela é de DIAS_JANELA dias corridos, terminando no dia anterior à data em que os dados foram gerados.
import { realizados, meta } from './dados.js';

const DIA = 86400000;
const DIAS_JANELA = 14;
const utc = (iso) => new Date(`${iso}T00:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const dm = (s) => `${s.slice(8)}/${s.slice(5, 7)}`;

/** Os `DIAS_JANELA` dias que terminam na véspera de `refIso` (a data em que os dados foram gerados). */
export function ultimaJanela(refIso) {
  const ref = utc(refIso);
  const ini = iso(new Date(+ref - DIAS_JANELA * DIA)), fim = iso(new Date(+ref - DIA));
  return { dias: DIAS_JANELA, ini, fim, periodo: `${dm(ini)} a ${dm(fim)}` };
}

const serieDoBrasileiro = (j) => (j.fonte === 'cbf' && j.nivel === 'Nacional' && /Brasileiro/.test(j.comp) ? /^S[ée]rie ([ABCD])$/.exec(j.divisao)?.[1] : undefined);

/** Maior e menor público (o menor ignora público 0, que quase sempre é falta de dado). */
function extremos(js) {
  const com = js.filter((j) => j.pub != null && j.pub > 0);
  if (!com.length) return { n: 0 };
  const maior = com.reduce((a, b) => (b.pub > a.pub ? b : a));
  const menor = com.reduce((a, b) => (b.pub < a.pub ? b : a));
  return { n: com.length, maior, menor: menor === maior ? null : menor };
}

// regras do "mais surpreendente" (público do jogo ÷ média do mandante em casa nos OUTROS jogos com público)
const MIN_JOGOS_BASE = 5, MIN_MEDIA = 500, MIN_PUB_ACIMA = 1000, MIN_MEDIA_ABAIXO = 1000;

function surpresas(jogosJanela) {
  const base = new Map();
  for (const j of realizados) {
    if (j.pub == null) continue;
    if (!base.has(j.mandante)) base.set(j.mandante, []);
    base.get(j.mandante).push(j);
  }
  const cand = [];
  for (const j of jogosJanela) {
    if (j.pub == null || j.pub <= 0) continue;
    const outros = (base.get(j.mandante) || []).filter((o) => o.chave !== j.chave);
    if (outros.length < MIN_JOGOS_BASE) continue;
    const media = outros.reduce((s, o) => s + o.pub, 0) / outros.length;
    if (media < MIN_MEDIA) continue;
    cand.push({ jogo: j, media, nBase: outros.length, razao: j.pub / media });
  }
  const acima = cand.filter((c) => c.razao > 1 && c.jogo.pub >= MIN_PUB_ACIMA).sort((a, b) => b.razao - a.razao)[0] ?? null;
  const abaixo = cand.filter((c) => c.razao < 1 && c.media >= MIN_MEDIA_ABAIXO).sort((a, b) => a.razao - b.razao)[0] ?? null;
  return { acima, abaixo };
}

export function destaquesDaRodada() {
  const janela = ultimaJanela(String(meta.gerado_em).slice(0, 10));
  const jogosJanela = realizados.filter((j) => j.data >= janela.ini && j.data <= janela.fim);
  return {
    janela,
    nJogos: jogosJanela.length,
    nComPub: jogosJanela.filter((j) => j.pub != null).length,
    serieA: extremos(jogosJanela.filter((j) => serieDoBrasileiro(j) === 'A')),
    inferiores: extremos(jogosJanela.filter((j) => 'BCD'.includes(serieDoBrasileiro(j) ?? '-'))),
    estaduais: extremos(jogosJanela.filter((j) => j.nivel === 'Estadual')),
    ...surpresas(jogosJanela),
  };
}
