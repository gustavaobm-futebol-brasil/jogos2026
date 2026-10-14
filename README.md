# Jogos 2026 — público e financeiro do futebol brasileiro

Dados de público e financeiros (borderôs) dos jogos de 24 federações estaduais e da CBF, extraídos de súmulas e
borderôs publicados pelas próprias federações. Cada jogo aponta para o documento original.

- `data/jogos.csv` — um jogo por linha
- `data/competicoes.csv` — competições coletadas e o link de cada página
- `data/meta.json` — data da última atualização e contagens

Os PDFs não ficam neste repositório. Os dados são gerados automaticamente; erros podem existir (leituras de documentos escaneados são conferidas por amostragem).

## Escudos dos clubes

- Imagens em `public/escudos/<slug>.webp` (128×128) e índice `data/escudos.json` (`{nome canônico: [slug, escuro]}`), gerados no projeto de coleta por
  `python publicar_escudos.py` (a partir de `escudos.csv`). Clube novo sem escudo aparece com as iniciais num círculo.
- **Interruptor:** `src/config.js` → `ESCUDOS = false` volta ao layout anterior (sem escudos, sem o cartão do clube, sem iniciais); nem o índice
  chega às páginas e aos JSON. Para desfazer de vez: `git revert` do commit "Escudos dos clubes".
- Onde aparecem: ranking de Clubes, lista de Jogos (espelhado: escudo do mandante à esquerda, do visitante à direita), sugestões do campo Clube,
  cartão do clube no topo de /jogos (quando um clube está filtrado), maiores públicos/arrecadações da Início e a dica dos gráficos jogo a jogo.
- Escudos "escuros" (`escuro = 1`) ganham um círculo claro por trás só no tema escuro.
