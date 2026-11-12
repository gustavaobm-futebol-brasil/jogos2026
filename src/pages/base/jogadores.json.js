import { BASE } from '../../config.js';
import { jogadores } from '../../lib/coortes.js';

// Alimenta /base/jogadores (filtros no navegador). Uma linha por jogador com jogo profissional:
// [tm_id, nome, geração, clube, posição na geração, posição no clube, pontos, jogos pro, ano da estreia, principais clubes, bases]
export function GET() {
  const linhas = BASE ? jogadores.map((j) => [j.tm, j.nome, j.ger, j.clube, j.posGer, j.posClube, j.pts, j.jogos,
    j.estreia ? Number(j.estreia.slice(0, 4)) : null, j.principais, j.bases]) : [];
  return new Response(JSON.stringify(linhas), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
