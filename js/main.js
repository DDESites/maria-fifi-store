/* ============================================================
   MARIA FIFI STORE — comportamento compartilhado
   Carrinho persistente, busca, cards, favoritos e WhatsApp.
   ============================================================ */

/* ---------- utilidades ---------- */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatarPreco = (v) => BRL.format(v);

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const esc = (texto = "") =>
  String(texto).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

/** Evita imagem quebrada: cai para o placeholder da marca. */
function mfImgFalha(img) {
  if (img.dataset.falhou) return;
  img.dataset.falhou = "1";
  img.src = "assets/placeholder.svg";
}

const acharProduto = (id) => PRODUTOS.find((p) => p.id === id);

/* ---------- WhatsApp ---------- */
function linkWhatsApp(texto) {
  return `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(texto)}`;
}

const TEXTO_PADRAO_ZAP =
  "Oi, Fifi 💜 Vim pelo site Maria Fifi Store e preciso de ajuda para escolher o look perfeito!";

/* ---------- carrinho ---------- */
const CHAVE_CARRINHO = "mf_carrinho";
const CHAVE_FAVORITOS = "mf_favoritos";

const lerCarrinho = () => {
  try { return JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || []; }
  catch { return []; }
};

const salvarCarrinho = (itens) => {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
  atualizarBadge();
};

const chaveItem = (id, tamanho, cor) => `${id}||${tamanho}||${cor}`;

function adicionarAoCarrinho(id, tamanho, cor, quantidade = 1) {
  const produto = acharProduto(id);
  if (!produto) return false;
  const itens = lerCarrinho();
  const chave = chaveItem(id, tamanho, cor);
  const existente = itens.find((i) => chaveItem(i.id, i.tamanho, i.cor) === chave);
  if (existente) existente.qtd += quantidade;
  else itens.push({ id, tamanho, cor, qtd: quantidade, preco: produto.preco });
  salvarCarrinho(itens);
  toast(`${produto.nome} (${tamanho}) adicionado à sacola 💜`);
  return true;
}

function atualizarQuantidade(id, tamanho, cor, novaQtd) {
  let itens = lerCarrinho();
  const chave = chaveItem(id, tamanho, cor);
  itens = itens
    .map((i) => (chaveItem(i.id, i.tamanho, i.cor) === chave ? { ...i, qtd: novaQtd } : i))
    .filter((i) => i.qtd > 0);
  salvarCarrinho(itens);
}

function removerDoCarrinho(id, tamanho, cor) {
  const chave = chaveItem(id, tamanho, cor);
  salvarCarrinho(lerCarrinho().filter((i) => chaveItem(i.id, i.tamanho, i.cor) !== chave));
  toast("Item removido da sacola.");
}

const totalCarrinho = (itens = lerCarrinho()) =>
  itens.reduce((s, i) => s + i.preco * i.qtd, 0);

const totalItens = (itens = lerCarrinho()) => itens.reduce((s, i) => s + i.qtd, 0);

function atualizarBadge() {
  const n = totalItens();
  $$("[data-badge-carrinho]").forEach((el) => {
    el.textContent = n;
    el.style.display = n > 0 ? "grid" : "none";
  });
}

/* ---------- favoritos ---------- */
const lerFavoritos = () => {
  try { return JSON.parse(localStorage.getItem(CHAVE_FAVORITOS)) || []; }
  catch { return []; }
};

function alternarFavorito(id) {
  const favs = lerFavoritos();
  const novo = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
  localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(novo));
  toast(novo.includes(id) ? "Salvo nos favoritos 💜" : "Removido dos favoritos.");
  return novo.includes(id);
}

/* ---------- toast ---------- */
let toastTimer;
function toast(mensagem) {
  let el = $("#mf-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "mf-toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = mensagem;
  el.classList.add("visivel");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visivel"), 3200);
}

/* ---------- card de produto ---------- */
function cartaoProduto(p) {
  const fav = lerFavoritos().includes(p.id);
  const selo = p.estoque === false
    ? '<span class="selo selo-esgotado">Esgotado</span>'
    : p.promo
      ? '<span class="selo selo-promo">Promoção</span>'
      : p.novidade
        ? '<span class="selo selo-novidade">Novidade</span>'
        : "";

  const precoAntigo = p.precoAntigo
    ? `<span class="preco-antigo">${formatarPreco(p.precoAntigo)}</span>`
    : "";

  const corUnica = p.cores.length === 1 ? p.cores[0] : "";
  const tamanhoUnico = p.tamanhos.length === 1 ? p.tamanhos[0] : "";
  const compraDireta = corUnica && tamanhoUnico;

  const acao = p.estoque === false
    ? `<a class="btn btn-contorno btn-mini btn-bloco" href="${linkWhatsApp(
        `Oi, Fifi 💜 Quero saber quando volta o ${p.nome}!`)}" target="_blank" rel="noopener">Avise-me quando chegar</a>`
    : compraDireta
      ? `<button class="btn btn-primario btn-mini btn-bloco" data-add-rapido="${p.id}">Adicionar à sacola</button>`
      : `<a class="btn btn-escuro btn-mini btn-bloco" href="produto.html?id=${encodeURIComponent(p.id)}">Escolher tamanho</a>`;

  return `
    <article class="produto-cartao">
      <a class="produto-foto" href="produto.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(p.nome)} — ver detalhes">
        ${selo}
        <img src="${p.imagens[0]}" alt="${esc(p.nome)} — ${esc(p.resumo)}" loading="lazy" onerror="mfImgFalha(this)">
      </a>
      <button class="btn-favorito" data-favorito="${p.id}" aria-pressed="${fav}"
              aria-label="${fav ? "Remover dos favoritos" : "Adicionar aos favoritos"} ${esc(p.nome)}">
        <svg viewBox="0 0 24 24" fill="${fav ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" width="19" height="19">
          <path d="M12 21s-7.5-4.6-9.5-9A5.3 5.3 0 0 1 12 6.5 5.3 5.3 0 0 1 21.5 12c-2 4.4-9.5 9-9.5 9z"/>
        </svg>
      </button>
      <div class="produto-info">
        <span class="produto-categoria">${esc(p.categoria)}</span>
        <h3 class="produto-nome"><a href="produto.html?id=${encodeURIComponent(p.id)}">${esc(p.nome)}</a></h3>
        <div class="preco-linha"><span class="preco">${formatarPreco(p.preco)}</span>${precoAntigo}</div>
        <div class="bloco-add">${acao}</div>
      </div>
    </article>`;
}

function renderizarGrade(alvo, produtos) {
  const el = typeof alvo === "string" ? $(alvo) : alvo;
  if (!el) return;
  el.innerHTML = produtos.map(cartaoProduto).join("");
}

/* ---------- WhatsApp do carrinho ---------- */
function textoPedidoWhatsApp(itens = lerCarrinho(), obs = "") {
  if (!itens.length) return TEXTO_PADRAO_ZAP;
  const linhas = itens.map((i, n) => {
    const p = acharProduto(i.id);
    const nome = p ? p.nome : i.id;
    return `${n + 1}. ${nome} — Tam ${i.tamanho} — ${i.cor} — ${i.qtd}x ${formatarPreco(i.preco)}`;
  });
  const total = totalCarrinho(itens);
  return [
    "Oi, Fifi 💜 Vim pelo site Maria Fifi Store e quero finalizar este pedido:",
    "",
    ...linhas,
    "",
    `Total dos produtos: ${formatarPreco(total)}`,
    obs ? `\nObservação: ${obs}` : "",
    "\nPode me ajudar com pagamento e entrega, por favor?",
  ].filter(Boolean).join("\n");
}

const linkPedidoWhatsApp = (itens, obs) => linkWhatsApp(textoPedidoWhatsApp(itens, obs));

/* ---------- cabeçalho: busca, menu e atalhos ---------- */
function iniciarCabecalho() {
  atualizarBadge();

  const overlay = $("#overlay");
  const painelBusca = $("#painel-busca");
  const campoBusca = $("#campo-busca");
  const sugestoes = $("#busca-sugestoes");
  const formBusca = $("#form-busca");

  const abrirBusca = () => {
    painelBusca.classList.add("aberto");
    overlay.classList.add("aberto");
    setTimeout(() => campoBusca.focus(), 120);
  };
  const fecharTudo = () => {
    painelBusca.classList.remove("aberto");
    overlay.classList.remove("aberto");
    $("#nav-mobile")?.classList.remove("aberto");
    $("#filtros")?.classList.remove("aberto");
  };

  $$("[data-abrir-busca]").forEach((b) => b.addEventListener("click", abrirBusca));
  $$("[data-abrir-menu]").forEach((b) =>
    b.addEventListener("click", () => {
      $("#nav-mobile")?.classList.toggle("aberto");
      overlay.classList.add("aberto");
    })
  );
  overlay?.addEventListener("click", fecharTudo);
  $$("[data-fechar]").forEach((b) => b.addEventListener("click", fecharTudo));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharTudo(); });

  // sugestões ao digitar
  campoBusca?.addEventListener("input", () => {
    const termo = campoBusca.value.trim().toLowerCase();
    if (termo.length < 2) { sugestoes.innerHTML = ""; return; }
    const achados = PRODUTOS.filter((p) =>
      [p.nome, p.categoria, ...p.cores, ...p.tags].join(" ").toLowerCase().includes(termo)
    ).slice(0, 5);
    sugestoes.innerHTML = achados.length
      ? achados.map((p) => `
          <a href="produto.html?id=${encodeURIComponent(p.id)}">
            <img src="${p.imagens[0]}" alt="" onerror="mfImgFalha(this)">
            <span>${esc(p.nome)}<br><small>${esc(p.categoria)}</small></span>
            <span class="preco">${formatarPreco(p.preco)}</span>
          </a>`).join("")
      : `<p class="sem-margem">Nada encontrado por “${esc(termo)}”. Tente “vestido”, “conjunto” ou “calça”.</p>`;
  });

  formBusca?.addEventListener("submit", (e) => {
    e.preventDefault();
    const termo = campoBusca.value.trim();
    window.location.href = termo ? `catalogo.html?q=${encodeURIComponent(termo)}` : "catalogo.html";
  });

  // rodapé: ano corrente
  $$("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));
}

/* ---------- atalhos globais (adicionar rápido e favoritos) ---------- */
function iniciarAtalhosGlobais() {
  document.addEventListener("click", (e) => {
    const addRapido = e.target.closest("[data-add-rapido]");
    if (addRapido) {
      const p = acharProduto(addRapido.dataset.addRapido);
      if (p) adicionarAoCarrinho(p.id, p.tamanhos[0], p.cores[0]);
      return;
    }
    const fav = e.target.closest("[data-favorito]");
    if (fav) {
      const ativo = alternarFavorito(fav.dataset.favorito);
      fav.setAttribute("aria-pressed", ativo);
      fav.setAttribute("aria-label", ativo ? "Remover dos favoritos" : "Adicionar aos favoritos");
      const svg = fav.querySelector("svg");
      if (svg) svg.setAttribute("fill", ativo ? "currentColor" : "none");
    }
  });
}

/* ---------- montagem de páginas ---------- */
document.addEventListener("DOMContentLoaded", () => {
  iniciarCabecalho();
  iniciarAtalhosGlobais();

  // WhatsApp flutuante
  if (!document.querySelector(".zap-flutuante")) {
    const a = document.createElement("a");
    a.className = "zap-flutuante";
    a.href = linkWhatsApp(TEXTO_PADRAO_ZAP);
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", `Falar com a Maria Fifi Store no WhatsApp ${LOJA.whatsappExibicao}`);
    a.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.4zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"/></svg>`;
    document.body.appendChild(a);
  }
});
