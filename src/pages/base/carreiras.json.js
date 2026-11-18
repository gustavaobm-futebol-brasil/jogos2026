import { BASE } from '../../config.js';
import { carreirasPorClube } from '../../lib/coortes.js';

// Alimenta /base/jogador: pontos de cada jogador em cada ano, divididos por clube (ver carreirasPorClube).
export function GET() {
  const dados = BASE ? carreirasPorClube() : { clubes: [], j: {} };
  return new Response(JSON.stringify(dados), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
