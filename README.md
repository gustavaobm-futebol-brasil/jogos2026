# Jogos 2026 â€” pÃºblico e financeiro do futebol brasileiro

Dados de pÃºblico e financeiros (borderÃ´s) dos jogos de 24 federaÃ§Ãµes estaduais e da CBF, extraÃ­dos de sÃºmulas e
borderÃ´s publicados pelas prÃ³prias federaÃ§Ãµes. Cada jogo aponta para o documento original.

- `data/jogos.csv` â€” um jogo por linha
- `data/competicoes.csv` â€” competiÃ§Ãµes coletadas e o link de cada pÃ¡gina
- `data/meta.json` â€” data da Ãºltima atualizaÃ§Ã£o e contagens

Os PDFs nÃ£o ficam neste repositÃ³rio. Os dados sÃ£o gerados automaticamente; erros podem existir (leituras de documentos escaneados sÃ£o conferidas por amostragem).

## Escudos dos clubes

- Imagens em `public/escudos/<slug>.webp` (128Ã—128) e Ã­ndice `data/escudos.json` (`{nome canÃ´nico: [slug, escuro]}`), gerados no projeto de coleta por
  `python publicar_escudos.py` (a partir de `escudos.csv`). Clube novo sem escudo aparece com as iniciais num cÃ­rculo.
- **Interruptor:** `src/config.js` â†’ `ESCUDOS = false` volta ao layout anterior (sem escudos, sem o cartÃ£o do clube, sem iniciais); nem o Ã­ndice
  chega Ã s pÃ¡ginas e aos JSON. Para desfazer de vez: `git revert` do commit "Escudos dos clubes".
- Onde aparecem: ranking de Clubes, lista de Jogos (espelhado: escudo do mandante Ã  esquerda, do visitante Ã  direita), sugestÃµes do campo Clube,
  cartÃ£o do clube no topo de /jogos (quando um clube estÃ¡ filtrado), maiores pÃºblicos/arrecadaÃ§Ãµes da InÃ­cio e a dica dos grÃ¡ficos jogo a jogo.
- Escudos "escuros" (`escuro = 1`) ganham um cÃ­rculo claro por trÃ¡s sÃ³ no tema escuro.

## Comparar times

- Página `/comparar` (`src/pages/comparar.astro` + `src/scripts/comparar_graficos.js`): até 4 times lado a lado nos mesmos gráficos do explorador, uma cor por time (`--s0..--s3`). Endereço compartilhável: `?t=Time1&t=Time2&papel=mandante|qualquer&comp=&uf=&de=&ate=&bordero=1`. Padrão: só jogos como mandante.
- O cartão do clube em `/jogos` tem o atalho "Comparar com outros times".

## Destaques da última rodada (página inicial)

- `src/lib/destaques.js` calcula, em tempo de build, o maior e o menor público da Série A, das Séries B/C/D, dos estaduais (todas as divisões e copas estaduais) e o jogo mais fora da média do mandante (acima e abaixo). Só leva em conta jogos com público registrado; o menor ignora público 0.
- **Rodada:** aproximada por data, em duas janelas por semana: fim de semana (sexta a segunda) e meio de semana (terça a quinta). Usa a última janela já encerrada na data em que os dados foram gerados (`meta.gerado_em`); o Job A de terça e sexta cai nas fronteiras.
- **Fora do normal:** público ÷ média do mandante nos outros jogos em casa com público (≥ 5 jogos e média ≥ 500; "acima" exige público ≥ 1.000 e "abaixo" exige média ≥ 1.000).
- **Interruptor:** `src/config.js` → `DESTAQUES = false` volta à página inicial anterior.
