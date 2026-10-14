/* ============================================================
   MARIA FIFI STORE — Página de produto
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const id = new URLSearchParams(location.search).get("id");
  const p = acharProduto(id);

  const detalhe = $("#produto-detalhe");
  const naoEncontrado = $("#produto-nao-encontrado");

  if (!p) {
    detalhe.style.display = "none";
    $("#secao-relacionados").style.display = "none";
    naoEncontrado.hidden = false;
    document.title = "Produto não encontrado — Maria Fifi Store";
    return;
  }

  /* ---------- dados básicos ---------- */
  document.title = `${p.nome} — Maria Fifi Store`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", `${p.nome}: ${p.resumo} Tamanhos ${p.tamanhos.join(", ")}. Compre na Maria Fifi Store.`);

  $("#caminho").innerHTML =
    `<a href="index.html">Início</a> › <a href="catalogo.html">Catálogo</a> › <a href="catalogo.html?cat=${encodeURIComponent(p.categoria)}">${esc(p.categoria)}</a> › ${esc(p.nome)}`;

  $("#produto-categoria").textContent = p.categoria;
  $("#produto-nome").textContent = p.nome;
  $("#produto-preco").textContent = formatarPreco(p.preco);
  $("#produto-resumo").textContent = p.resumo;

  if (p.precoAntigo) {
    $("#produto-preco-antigo").textContent = formatarPreco(p.precoAntigo);
    const pct = Math.round((1 - p.preco / p.precoAntigo) * 100);
    const chip = $("#produto-desconto");
    chip.textContent = `${pct}% off`;
    chip.hidden = false;
  }

  if (p.estoque === false) {
    const selo = document.createElement("p");
    selo.innerHTML = `<span class="selo selo-esgotado" style="position:static;display:inline-block">Esgotado no momento</span>`;
    $("#produto-resumo").before(selo);
  }

  /* ---------- galeria ---------- */
  const fotoPrincipal = $("#foto-principal");
  const miniaturas = $("#galeria-miniaturas");
  fotoPrincipal.src = p.imagens[0];
  fotoPrincipal.alt = `${p.nome} — foto principal`;

  miniaturas.innerHTML = p.imagens
    .map(
      (src, i) => `
        <button type="button" data-foto="${i}" aria-pressed="${i === 0}" aria-label="Ver foto ${i + 1} de ${p.nome}">
          <img src="${src}" alt="" loading="lazy" onerror="mfImgFalha(this)">
        </button>`
    )
    .join("");

  miniaturas.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-foto]");
    if (!btn) return;
    const i = Number(btn.dataset.foto);
    fotoPrincipal.src = p.imagens[i];
    $$("[data-foto]", miniaturas).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
  });

  /* ---------- escolhas de cor e tamanho ---------- */
  let corEscolhida = "";
  let tamanhoEscolhido = "";

  const coresAlvo = $("#botoes-cor");
  const tamanhosAlvo = $("#botoes-tamanho");

  const coresComTom = {
    "Rosa malva": "#b76e79", Lilás: "#9b7bb4", Preto: "#221a1d", "Branco quente": "#fdf3ec",
    Areia: "#d8c3a5", Vinho: "#7b2d3b", Mel: "#c98a3e", "Azul médio": "#5b7fa6",
    "Cinza melange": "#a9a3a0", Caramelo: "#a4682f", Dourado: "#c9a24b", Estampado: "#c98fae",
  };

  coresAlvo.innerHTML = p.cores
    .map(
      (c) => `
      <button type="button" class="cor-chip" data-cor="${esc(c)}" aria-pressed="false">
        <i style="background:${coresComTom[c] || "#e0d3cd"}"></i>${esc(c)}
      </button>`
    )
    .join("");

  tamanhosAlvo.innerHTML = p.tamanhos
    .map((t) => `<button type="button" class="tamanho-chip" data-tamanho="${esc(t)}" aria-pressed="false">${esc(t)}</button>`)
    .join("");

  coresAlvo.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cor]");
    if (!btn) return;
    corEscolhida = btn.dataset.cor;
    $$("[data-cor]", coresAlvo).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    $("#legenda-cor").textContent = corEscolhida;
    limparErro();
  });

  tamanhosAlvo.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tamanho]");
    if (!btn) return;
    tamanhoEscolhido = btn.dataset.tamanho;
    $$("[data-tamanho]", tamanhosAlvo).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    $("#legenda-tamanho").textContent = tamanhoEscolhido;
    limparErro();
  });

  /* ---------- adicionar à sacola ---------- */
  const aviso = $("#aviso-erro");
  const mostrarErro = (msg) => { aviso.textContent = msg; aviso.classList.add("visivel"); };
  const limparErro = () => aviso.classList.remove("visivel");

  $("#btn-adicionar").addEventListener("click", () => {
    const faltando = [];
    if (!corEscolhida) faltando.push("a cor");
    if (!tamanhoEscolhido) faltando.push("o tamanho");
    if (faltando.length) {
      mostrarErro(`Escolha ${faltando.join(" e ")} antes de adicionar à sacola.`);
      (corEscolhida ? tamanhosAlvo : coresAlvo).querySelector("button")?.focus();
      return;
    }
    if (p.estoque === false) {
      mostrarErro("Esta peça está esgotada no momento. Chama no WhatsApp que eu aviso quando chegar 💜");
      return;
    }
    adicionarAoCarrinho(p.id, tamanhoEscolhido, corEscolhida);
    limparErro();
  });

  /* ---------- WhatsApp do produto ---------- */
  $("#btn-zap").href = linkWhatsApp(
    `Oi, Fifi 💜 Estou no site, na página do ${p.nome} (${formatarPreco(p.preco)}), e quero saber mais.`
  );

  /* ---------- informações ---------- */
  const detalhes = Object.entries(p.detalhes || {})
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join("");

  $("#produto-info").innerHTML = `
    <details open>
      <summary>Descrição e detalhes</summary>
      <div class="conteudo">
        <p>${esc(p.descricao)}</p>
        <dl>${detalhes}</dl>
      </div>
    </details>
    <details>
      <summary>Tamanho e caimento</summary>
      <div class="conteudo">
        <p>Tamanhos disponíveis: <strong>${p.tamanhos.join(", ")}</strong>. Caimento ${esc((p.detalhes && p.detalhes.Modelagem) || "regular")}.</p>
        <button type="button" class="btn btn-contorno btn-mini" data-abrir-guia>Ver guia de medidas</button>
      </div>
    </details>
    <details>
      <summary>Entrega, troca e pagamento</summary>
      <div class="conteudo">
        <ul style="list-style:disc;padding-left:1.2rem">
          <li>Enviamos para todo o Brasil pelos Correios ou transportadora, com código de rastreio.</li>
          <li>Frete grátis em compras acima de ${formatarPreco(LOJA.freteGratisAcima)}.</li>
          <li>Retirada na loja física em ${esc(LOJA.cidade)}, sem custo.</li>
          <li>Trocas em até 7 dias após o recebimento — veja a <a href="trocas.html" style="text-decoration:underline">política de trocas</a>.</li>
          <li>Pagamento por Pix (5% de desconto), cartão em até 3x sem juros ou boleto.</li>
        </ul>
      </div>
    </details>`;

  $$("[data-abrir-guia], #abrir-guia").forEach((b) =>
    b.addEventListener("click", () => $("#modal-guia").classList.add("aberto"))
  );
  $$("[data-fechar-modal]").forEach((b) =>
    b.addEventListener("click", () => $("#modal-guia").classList.remove("aberto"))
  );
  $("#modal-guia").addEventListener("click", (e) => {
    if (e.target.id === "modal-guia") $("#modal-guia").classList.remove("aberto");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $("#modal-guia").classList.remove("aberto");
  });

  /* ---------- relacionados ---------- */
  const relacionados = PRODUTOS.filter((x) => x.id !== p.id)
    .sort((a, b) => {
      const nota = (x) => (x.categoria === p.categoria ? 2 : 0) + (x.tags?.some((t) => p.tags?.includes(t)) ? 1 : 0);
      return nota(b) - nota(a);
    })
    .slice(0, 4);
  renderizarGrade("#grade-relacionados", relacionados);

  /* ---------- dados estruturados (SEO) ---------- */
  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nome,
    description: p.resumo,
    image: p.imagens,
    brand: { "@type": "Brand", name: "Maria Fifi Store" },
    offers: {
      "@type": "Offer",
      price: p.preco.toFixed(2),
      priceCurrency: "BRL",
      availability: p.estoque === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: `produto.html?id=${encodeURIComponent(p.id)}`,
    },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "128" },
  });
  document.head.appendChild(ld);
});
