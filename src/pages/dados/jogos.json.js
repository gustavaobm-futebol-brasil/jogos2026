import { jogosCompactos } from '../../lib/dados.js';

// Alimenta o explorador de jogos no navegador; gerado no build a partir de data/jogos.csv.
export function GET() {
  return new Response(JSON.stringify(jogosCompactos()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
