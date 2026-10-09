// Tabelas ordenáveis (clique no cabeçalho) e filtráveis (campo de busca) sem dependências.
// Uso: <table class="ordenavel"> com <th data-tipo="num|txt"> e <td data-v="valor de ordenação"> nas células numéricas.
document.querySelectorAll('table.ordenavel').forEach((tabela) => {
  const corpo = tabela.tBodies[0];
  const ths = [...tabela.tHead.rows[0].cells];
  ths.forEach((th, i) => {
    th.setAttribute('data-ord', '');
    th.addEventListener('click', () => {
      const dir = th.classList.contains('desc') ? 1 : -1;
      ths.forEach((x) => x.classList.remove('asc', 'desc'));
      th.classList.add(dir === 1 ? 'asc' : 'desc');
      const num = th.dataset.tipo === 'num';
      const valor = (tr) => {
        const c = tr.cells[i];
        const v = c.dataset.v ?? c.textContent.trim();
        return num ? (v === '' ? null : Number(v)) : v.toLowerCase();
      };
      const linhas = [...corpo.rows].sort((a, b) => {
        const x = valor(a), y = valor(b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x < y ? -1 : x > y ? 1 : 0) * dir;
      });
      linhas.forEach((tr) => corpo.appendChild(tr));
    });
  });
});

const busca = document.getElementById('busca-tabela');
if (busca) {
  const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const alvo = document.querySelector('table.ordenavel tbody');
  const contagem = document.getElementById('contagem-tabela');
  busca.addEventListener('input', () => {
    const t = semAcento(busca.value.trim());
    let visiveis = 0;
    [...alvo.rows].forEach((tr) => {
      const ok = !t || semAcento(tr.textContent).includes(t);
      tr.hidden = !ok;
      if (ok) visiveis++;
    });
    if (contagem) contagem.textContent = `${visiveis} linha${visiveis === 1 ? '' : 's'}`;
  });
}
