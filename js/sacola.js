/* ============================================================
   MARIA FIFI STORE — Sacola de compras
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const caixaItens = $("#sacola-itens");
  const layout = $("#sacola-layout");
  const vazio = $("#sacola-vazia");

  function render() {
    const itens = lerCarrinho();

    if (!itens.length) {
      layout.hidden = true;
      vazio.hidden = false;
      atualizarBadge();
      return;
    }
    layout.hidden = false;
    vazio.hidden = true;

    caixaItens.innerHTML = itens
      .map((i) => {
        const p = acharProduto(i.id) || { nome: i.id, imagens: ["assets/placeholder.svg"], categoria: "" };
        return `
          <article class="item-sacola">
            <a href="produto.html?id=${encodeURIComponent(i.id)}" aria-label="${esc(p.nome)}">
              <img src="${p.imagens[0]}" alt="${esc(p.nome)}" onerror="mfImgFalha(this)">
            </a>
            <div>
              <h3><a href="produto.html?id=${encodeURIComponent(i.id)}">${esc(p.nome)}</a></h3>
              <p class="variacao">Tam ${esc(i.tamanho)} · ${esc(i.cor)} · ${formatarPreco(i.preco)} cada</p>
              <div class="qtd-controle">
                <button type="button" data-acao="menos" data-id="${esc(i.id)}" data-tamanho="${esc(i.tamanho)}" data-cor="${esc(i.cor)}" aria-label="Diminuir quantidade de ${esc(p.nome)}">−</button>
                <span aria-live="polite">${i.qtd}</span>
                <button type="button" data-acao="mais" data-id="${esc(i.id)}" data-tamanho="${esc(i.tamanho)}" data-cor="${esc(i.cor)}" aria-label="Aumentar quantidade de ${esc(p.nome)}">+</button>
              </div>
              <button class="item-remover" type="button" data-acao="remover" data-id="${esc(i.id)}" data-tamanho="${esc(i.tamanho)}" data-cor="${esc(i.cor)}">Remover</button>
            </div>
            <p class="item-total">${formatarPreco(i.preco * i.qtd)}</p>
          </article>`;
      })
      .join("");

    const subtotal = totalCarrinho(itens);
    $("#resumo-subtotal").textContent = formatarPreco(subtotal);
    $("#resumo-total").textContent = formatarPreco(subtotal);

    const aviso = $("#aviso-frete");
    if (subtotal >= LOJA.freteGratisAcima) {
      aviso.textContent = "🎉 Você ganhou frete grátis nesta compra!";
      $("#resumo-frete").textContent = "Grátis";
    } else {
      const falta = LOJA.freteGratisAcima - subtotal;
      aviso.textContent = `Faltam ${formatarPreco(falta)} para você ganhar frete grátis.`;
      $("#resumo-frete").textContent = "Calculado no próximo passo";
    }

    $("#btn-zap-pedido").href = linkPedidoWhatsApp(itens);
    atualizarBadge();
  }

  caixaItens.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-acao]");
    if (!btn) return;
    const { id, tamanho, cor, acao } = btn.dataset;
    const item = lerCarrinho().find((i) => chaveItem(i.id, i.tamanho, i.cor) === chaveItem(id, tamanho, cor));
    if (!item) return;

    if (acao === "mais") atualizarQuantidade(id, tamanho, cor, item.qtd + 1);
    if (acao === "menos") atualizarQuantidade(id, tamanho, cor, item.qtd - 1);
    if (acao === "remover") removerDoCarrinho(id, tamanho, cor);
    render();
  });

  render();
});
