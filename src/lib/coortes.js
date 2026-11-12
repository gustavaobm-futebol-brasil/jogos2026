// Seção Base: leitura, em tempo de build, da base de coortes do Sub-20 (data_coortes/, publicada por publicar_coortes.py do
// projeto "Base Sub-20 Coortes"; não é tocada pelo Job B). Geração = ano de nascimento.
import fs from 'node:fs';
import path from 'node:path';
import { ESCUDOS } from '../config.js';

const DIR = path.join(process.cwd(), 'data_coortes');
const ler = (nome) => { try { return fs.readFileSync(path.join(DIR, nome), 'utf-8').replace(/^﻿/, ''); } catch { return ''; } };

/** CSV separado por vírgula, com campos entre aspas (aspas duplicadas dentro do campo). */
function csv(texto) {
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab = [], ...resto] = linhas;
  return resto.filter((l) => l.length > 1).map((l) => Object.fromEntries(cab.map((k, i) => [k, l[i] ?? ''])));
}

// Nome do clube como no resto do site (índice dos escudos): "Atlético-MG" fica, "Palmeiras-SP" vira "Palmeiras".
let escudos = {};
try { escudos = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'escudos.json'), 'utf-8')); } catch { /* sem índice */ }
export const nomeClube = (c) => (escudos[c] ? c : c.replace(/-[A-Z]{2}$/, ''));

export const metaCoortes = JSON.parse(ler('meta.json') || '{"coortes":{},"bases":[]}');
export const temDados = Object.keys(metaCoortes.coortes).length > 0;

/** Gerações: [{ ano, completa, bases, faltam, antes, jogadores, comPro, pontos }], da mais antiga à mais nova. */
export const geracoes = Object.entries(metaCoortes.coortes).map(([ano, m]) => ({
  ano: Number(ano), completa: m.situacao === 'completa', bases: m.bases, faltam: m.bases_que_faltam, antes: m.bases_antes_da_coleta,
  jogadores: m.jogadores, comPro: m.com_jogo_pro, pontos: m.pontos,
})).sort((a, b) => a.ano - b.ano);
export const completas = geracoes.filter((g) => g.completa);

export const jogadores = csv(ler('jogadores.csv')).map((r) => ({
  tm: r.tm_id, nome: r.nome, ger: Number(r.coorte), clube: nomeClube(r.clube), posGer: Number(r.posicao_coorte),
  posClube: Number(r.posicao_clube), pts: Number(r.pontos), jogos: Number(r.jogos_pro), estreia: r.primeiro_jogo_pro,
  principais: r.principais_clubes, bases: textoBases(r.bases),
}));

/** "2016: copinha, sub20 | 2017: serie_a" -> "Copinha e Sub-20 2016 · Série A 2017". */
function textoBases(s) {
  const nomes = { copinha: 'Copinha', sub20: 'Sub-20', serie_a: 'Série A', serie_b: 'Série B' };
  return s.split(' | ').filter(Boolean).map((p) => {
    const [ano, fs] = p.split(': ');
    const ns = (fs || '').split(', ').map((f) => nomes[f] || f);
    return `${ns.length > 1 ? `${ns.slice(0, -1).join(', ')} e ${ns.at(-1)}` : ns[0]} ${ano}`;
  }).join(' · ');
}

export const clubesGeracao = csv(ler('clubes_coortes.csv')).map((r) => ({
  ger: Number(r.coorte), clube: nomeClube(r.clube), jogadores: Number(r.jogadores), comPro: Number(r.com_jogo_pro),
  semTm: Number(r.sem_tm), pts: Number(r.pontos), top20: Number(r.pontos_top20), pos: Number(r.posicao),
}));

export const clubes = [...new Set(clubesGeracao.map((r) => r.clube))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

/** Índice de escudos só dos clubes da seção (para o navegador); vazio com o interruptor ESCUDOS desligado. */
export const escudosDosClubes = ESCUDOS ? Object.fromEntries(clubes.filter((c) => escudos[c]).map((c) => [c, escudos[c]])) : {};

/** JSON para embutir num <script type="application/json"> sem fechar a tag por acidente. */
export const jsonEmbutido = (x) => JSON.stringify(x).replace(/</g, '\\u003c');

/** Melhor jogador de cada (geração, clube): { "1998|Palmeiras": jogador }. */
export const melhorDoClube = Object.fromEntries(jogadores.filter((j) => j.posClube === 1).map((j) => [`${j.ger}|${j.clube}`, j]));

/** Pontos por idade, somados por (geração, clube) e por geração ('' = todos os clubes):
 *  { ger: { clube: { idade: [pontos, jogos] } } }. Idade = ano civil - ano de nascimento. */
export function pontosPorIdade() {
  const quem = new Map(jogadores.map((j) => [j.tm, j]));
  const out = {};
  for (const r of csv(ler('pontos_por_ano.csv'))) {
    const j = quem.get(r.tm_id);
    if (!j) continue;
    for (const cl of ['', j.clube]) {
      const d = ((out[j.ger] ??= {})[cl] ??= {});
      const a = (d[r.idade] ??= [0, 0]);
      a[0] = Math.round((a[0] + Number(r.pontos)) * 10) / 10;
      a[1] += Number(r.jogos_pro);
    }
  }
  return out;
}

export const fmtInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
export const fmtDec = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
export const rotuloGeracao = (g) => `${g.ano}${g.completa ? '' : ' (em andamento)'}`;
