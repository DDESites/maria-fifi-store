/* ============================================================
   MARIA FIFI STORE — Catálogo (filtros, busca, ordenação)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const ordemInicial = params.get("ordem") || "novidades";
  const catsIniciais = params.getAll("cat");

  const TAMANHOS_ORDEM = ["PP", "P", "M", "G", "GG", "36", "38", "40", "42", "44", "Único"];
  const tamanhos = [...new Set(PRODUTOS.flatMap((p) => p.tamanhos))]
    .sort((a, b) => TAMANHOS_ORDEM.indexOf(a) - TAMANHOS_ORDEM.indexOf(b));
  const categorias = [...new Set(PRODUTOS.map((p) => p.categoria))];
  const cores = [...new Set(PRODUTOS.flatMap((p) => p.cores))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const estado = {
    q: (params.get("q") || "").trim().toLowerCase(),
    categorias: new Set(catsIniciais),
    tamanhos: new Set(),
    cores: new Set(),
    faixa: "",
    soEstoque: false,
    ordem: ordemInicial,
    visiveis: 8,
  };

  const grade = $("#grade-catalogo");
  const contagem = $("#catalogo-contagem");
  const vazio = $("#catalogo-vazio");
  const chips = $("#chips-ativos");
  const caixaMais = $("#carregar-mais-caixa");
  const btnMais = $("#carregar-mais");

  /* ---------- montagem dos filtros ---------- */
  $("#filtros-corpo").innerHTML = `
    <div class="filtro-grupo">
      <strong>Categoria</strong>
      ${categorias.map((c) => `
        <label class="filtro-opcao">
          <input type="checkbox" name="categoria" value="${esc(c)}" ${estado.categorias.has(c) ? "checked" : ""}>
          ${esc(c)} <small>(${PRODUTOS.filter((p) => p.categoria === c).length})</small>
        </label>`).join("")}
    </div>

    <div class="filtro-grupo">
      <strong>Tamanho</strong>
      <div class="tamanhos-grade">
        ${tamanhos.map((t) => `
          <button type="button" class="tamanho-chip" data-tamanho="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join("")}
      </div>
    </div>

    <div class="filtro-grupo">
      <strong>Cor</strong>
      ${cores.map((c) => `
        <label class="filtro-opcao">
          <input type="checkbox" name="cor" value="${esc(c)}">
          ${esc(c)}
        </label>`).join("")}
    </div>

    <div class="filtro-grupo">
      <strong>Faixa de preço</strong>
      ${FAIXAS_PRECO.map((f) => `
        <label class="filtro-opcao">
          <input type="radio" name="faixa" value="${esc(f.rotulo)}">
          ${esc(f.rotulo)}
        </label>`).join("")}
      <label class="filtro-opcao">
        <input type="radio" name="faixa" value="" checked> Qualquer preço
      </label>
    </div>

    <div class="filtro-grupo">
      <strong>Disponibilidade</strong>
      <label class="filtro-opcao">
        <input type="checkbox" name="estoque"> Somente peças em estoque
      </label>
    </div>`;

  /* ---------- leitura dos controles ---------- */
  $$('input[name="categoria"]').forEach((el) =>
    el.addEventListener("change", () => {
      el.checked ? estado.categorias.add(el.value) : estado.categorias.delete(el.value);
      aplicar();
    })
  );

  $$(".tamanho-chip").forEach((btn) =>
    btn.addEventListener("click", () => {
      const t = btn.dataset.tamanho;
      const ativo = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!ativo));
      ativo ? estado.tamanhos.delete(t) : estado.tamanhos.add(t);
      aplicar();
    })
  );

  $$('input[name="cor"]').forEach((el) =>
    el.addEventListener("change", () => {
      el.checked ? estado.cores.add(el.value) : estado.cores.delete(el.value);
      aplicar();
    })
  );

  $$('input[name="faixa"]').forEach((el) =>
    el.addEventListener("change", () => { estado.faixa = el.value; aplicar(); })
  );

  $('input[name="estoque"]')?.addEventListener("change", (e) => {
    estado.soEstoque = e.target.checked;
    aplicar();
  });

  $("#ordenar").addEventListener("change", (e) => { estado.ordem = e.target.value; aplicar(); });

  const limparTudo = () => {
    estado.q = "";
    estado.categorias.clear();
    estado.tamanhos.clear();
    estado.cores.clear();
    estado.faixa = "";
    estado.soEstoque = false;
    estado.visiveis = 8;
    $$('#filtros-corpo input[type="checkbox"]').forEach((i) => (i.checked = false));
    $$('#filtros-corpo input[type="radio"]').forEach((i) => (i.checked = i.value === ""));
    $$(".tamanho-chip").forEach((b) => b.setAttribute("aria-pressed", "false"));
    aplicar();
  };
  $("#limpar-filtros").addEventListener("click", limparTudo);
  $("#vazio-limpar").addEventListener("click", limparTudo);

  btnMais.addEventListener("click", () => { estado.visiveis += 8; aplicar(false); });

  // painel de filtros no celular
  $("#abrir-filtros")?.addEventListener("click", () => {
    $("#filtros").classList.add("aberto");
    $("#overlay").classList.add("aberto");
  });

  /* ---------- filtragem e ordenação ---------- */
  function filtrar() {
    let lista = PRODUTOS.filter((p) => {
      if (estado.q) {
        const alvo = [p.nome, p.categoria, p.resumo, ...p.cores, ...p.tags].join(" ").toLowerCase();
        if (!alvo.includes(estado.q)) return false;
      }
      if (estado.categorias.size && !estado.categorias.has(p.categoria)) return false;
      if (estado.tamanhos.size && !p.tamanhos.some((t) => estado.tamanhos.has(t))) return false;
      if (estado.cores.size && !p.cores.some((c) => estado.cores.has(c))) return false;
      if (estado.faixa) {
        const f = FAIXAS_PRECO.find((x) => x.rotulo === estado.faixa);
        if (f && (p.preco < f.min || p.preco > f.max)) return false;
      }
      if (estado.soEstoque && p.estoque === false) return false;
      return true;
    });

    const ordenadores = {
      novidades: (a, b) => Number(b.novidade) - Number(a.novidade),
      destaque: (a, b) => Number(b.destaque) - Number(a.destaque),
      "menor-preco": (a, b) => a.preco - b.preco,
      "maior-preco": (a, b) => b.preco - a.preco,
      promocao: (a, b) => Number(b.promo) - Number(a.promo) || b.preco - a.preco,
    };
    return lista.sort(ordenadores[estado.ordem] || ordenadores.novidades);
  }

  function renderizarChips() {
    const itens = [];
    if (estado.q) itens.push({ rotulo: `Busca: “${estado.q}”`, limpar: () => (estado.q = "") });
    estado.categorias.forEach((c) =>
      itens.push({ rotulo: c, limpar: () => { estado.categorias.delete(c); $$('input[name="categoria"]').forEach((i) => { if (i.value === c) i.checked = false; }); } })
    );
    estado.tamanhos.forEach((t) =>
      itens.push({ rotulo: `Tam ${t}`, limpar: () => { estado.tamanhos.delete(t); $$(".tamanho-chip").forEach((b) => { if (b.dataset.tamanho === t) b.setAttribute("aria-pressed", "false"); }); } })
    );
    estado.cores.forEach((c) =>
      itens.push({ rotulo: c, limpar: () => { estado.cores.delete(c); $$('input[name="cor"]').forEach((i) => { if (i.value === c) i.checked = false; }); } })
    );
    if (estado.faixa) itens.push({ rotulo: estado.faixa, limpar: () => { estado.faixa = ""; $$('input[name="faixa"]').forEach((i) => (i.checked = i.value === "")); } });
    if (estado.soEstoque) itens.push({ rotulo: "Em estoque", limpar: () => { estado.soEstoque = false; $('input[name="estoque"]').checked = false; } });

    chips.innerHTML = itens
      .map((it, i) => `<span class="chip-filtro">${esc(it.rotulo)}<button data-chip="${i}" aria-label="Remover filtro ${esc(it.rotulo)}">×</button></span>`)
      .join("");
    $$("[data-chip]", chips).forEach((b) =>
      b.addEventListener("click", () => { itens[Number(b.dataset.chip)].limpar(); aplicar(); })
    );
  }

  function sincronizarURL() {
    const p = new URLSearchParams();
    if (estado.q) p.set("q", estado.q);
    estado.categorias.forEach((c) => p.append("cat", c));
    if (estado.ordem !== "novidades") p.set("ordem", estado.ordem);
    history.replaceState(null, "", `${location.pathname}${p.toString() ? "?" + p.toString() : ""}`);
  }

  function aplicar(reiniciarContagem = true) {
    if (reiniciarContagem) estado.visiveis = 8;
    const lista = filtrar();
    const mostrados = lista.slice(0, estado.visiveis);

    renderizarGrade(grade, mostrados);
    renderizarChips();
    sincronizarURL();

    vazio.hidden = lista.length !== 0;
    grade.hidden = lista.length === 0;
    caixaMais.hidden = lista.length <= estado.visiveis;

    contagem.textContent = lista.length === 0
      ? "Nenhuma peça encontrada."
      : `${lista.length} ${lista.length === 1 ? "peça encontrada" : "peças encontradas"}${mostrados.length < lista.length ? ` — exibindo ${mostrados.length}` : ""}`;

    // legenda do topo
    const sub = $("#catalogo-subtitulo");
    if (estado.q) sub.textContent = `Resultados para “${estado.q}”.`;
    else if (estado.categorias.size === 1) sub.textContent = `Peças de ${[...estado.categorias][0]} com a curadoria Maria Fifi.`;
    else sub.textContent = "Todas as peças da curadoria Maria Fifi, do tamanho P ao GG.";
  }

  // busca vinda do cabeçalho
  if (estado.q) $("#campo-busca").value = estado.q;
  $("#ordenar").value = estado.ordem in { novidades: 1, destaque: 1, "menor-preco": 1, "maior-preco": 1, promocao: 1 } ? estado.ordem : "novidades";

  aplicar();
});
