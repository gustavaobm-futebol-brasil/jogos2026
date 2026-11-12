import { BASE } from '../../config.js';
import { pontosJogadorAno } from '../../lib/coortes.js';

// Alimenta o gráfico empilhado de /base/idade: pontos de cada jogador em cada idade e o clube em que jogou naquele ano.
export function GET() {
  const dados = BASE ? pontosJogadorAno() : { clubes: [], linhas: [] };
  return new Response(JSON.stringify(dados), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
