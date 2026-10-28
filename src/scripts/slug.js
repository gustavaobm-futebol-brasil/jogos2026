// Endereço da página de cada competição: /competicoes/<slug do nome>. O nome da competição é único (88 competições, 88 nomes), então
// serve de chave; o mesmo cálculo roda no build (páginas, links) e no navegador (explorador de jogos), por isso fica aqui.
export const slugComp = (nome) => String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const urlComp = (nome) => `/competicoes/${slugComp(nome)}`;
