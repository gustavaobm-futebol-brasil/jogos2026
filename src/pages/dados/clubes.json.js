import { clubesPorCompeticao } from '../../lib/dados.js';

// Alimenta a página de clubes (filtro por competição); gerado no build a partir de data/jogos.csv.
export function GET() {
  return new Response(JSON.stringify(clubesPorCompeticao()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
