/* ============================================================
   MARIA FIFI STORE — Finalização da compra (3 passos)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const itens = lerCarrinho();

  /* ---------- resumo lateral ---------- */
  const caixaResumo = $("#resumo-itens");

  function renderResumo() {
    if (!itens.length) return;
    caixaResumo.innerHTML = itens
      .map((i) => {
        const p = acharProduto(i.id) || { nome: i.id, imagens: ["assets/placeholder.svg"] };
        return `
          <div style="display:flex;gap:0.7rem;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--borda)">
            <img src="${p.imagens[0]}" alt="" style="width:52px;height:66px;object-fit:cover;border-radius:8px" onerror="mfImgFalha(this)">
            <div style="flex:1">
              <strong style="font-size:0.92rem">${esc(p.nome)}</strong><br>
              <small>Tam ${esc(i.tamanho)} · ${esc(i.cor)} · ${i.qtd}x</small>
            </div>
            <span style="font-weight:600;font-size:0.92rem">${formatarPreco(i.preco * i.qtd)}</span>
          </div>`;
      })
      .join("");

    const subtotal = totalCarrinho(itens);
    $("#checkout-subtotal").textContent = formatarPreco(subtotal);
    $("#checkout-total").textContent = formatarPreco(subtotal);

    const aviso = $("#checkout-aviso-frete");
    if (subtotal >= LOJA.freteGratisAcima) {
      aviso.textContent = "🎉 Frete grátis liberado para este pedido!";
    } else {
      aviso.textContent = `Faltam ${formatarPreco(LOJA.freteGratisAcima - subtotal)} para o frete grátis.`;
    }
  }

  /* ---------- carrinho vazio ---------- */
  if (!itens.length) {
    $("#checkout-layout").hidden = true;
    $("#checkout-vazio").hidden = false;
    return;
  }
  renderResumo();

  /* ---------- navegação entre passos ---------- */
  let passoAtual = 1;

  function irPara(n) {
    passoAtual = n;
    $$(".checkout-etapa").forEach((e) => e.classList.toggle("ativa", Number(e.dataset.etapa) === n));
    $$(".passo").forEach((p) => p.classList.toggle("ativo", Number(p.dataset.passo) <= n));
    window.scrollTo({ top: $("#conteudo").offsetTop, behavior: "smooth" });
  }

  $$("[data-proximo]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const destino = Number(btn.dataset.proximo);
      if (destino > passoAtual && !validarPasso(passoAtual)) return;
      irPara(destino);
    })
  );

  /* ---------- validação ---------- */
  const marcar = (campo, valido) => {
    campo.closest(".linha-campo")?.classList.toggle("invalido", !valido);
    return valido;
  };

  function validarPasso(n) {
    const form = $("#form-checkout");
    let ok = true;

    if (n === 1) {
      ok = marcar($("#nome"), $("#nome").value.trim().length >= 3) && ok;
      const tel = $("#whatsapp").value.replace(/\D/g, "");
      ok = marcar($("#whatsapp"), tel.length >= 10) && ok;
      const email = $("#email").value.trim();
      ok = marcar($("#email"), email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && ok;
    }

    if (n === 2) {
      const entrega = form.querySelector('input[name="entrega"]:checked')?.value;
      if (entrega && entrega.startsWith("Entrega")) {
        ok = marcar($("#cep"), $("#cep").value.replace(/\D/g, "").length === 8) && ok;
        ok = marcar($("#cidade"), $("#cidade").value.trim().length >= 2) && ok;
        ok = marcar($("#endereco"), $("#endereco").value.trim().length >= 5) && ok;
      }
    }

    if (!ok) toast("Confira os campos destacados para continuar.");
    return ok;
  }

  /* ---------- endereço aparece só para entrega ---------- */
  $$('input[name="entrega"]').forEach((r) =>
    r.addEventListener("change", () => {
      const entrega = r.value.startsWith("Entrega") && r.checked;
      $("#campos-endereco").style.display = entrega ? "" : "none";
      $("#checkout-entrega").textContent = r.checked
        ? entrega
          ? subtotal >= LOJA.freteGratisAcima ? "Grátis 🎉" : "Calculada no WhatsApp" 
          : "Retirada na loja — grátis"
        : "A definir";
    })
  );
  const subtotal = totalCarrinho(itens);

  /* ---------- máscara de CEP e telefone ---------- */
  $("#cep")?.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
    e.target.value = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
  });

  $("#whatsapp")?.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    else if (v.length) v = `(${v}`;
    e.target.value = v;
  });

  /* ---------- WhatsApp com dados do pedido ---------- */
  $("#btn-zap-finalizar").addEventListener("click", () => {
    const extra = [
      $("#nome").value && `Nome: ${$("#nome").value}`,
      $("#whatsapp").value && `WhatsApp: ${$("#whatsapp").value}`,
      $("#cep").value && `CEP: ${$("#cep").value}`,
      $("#endereco").value && `Endereço: ${$("#endereco").value} - ${$("#cidade").value}`,
      $("#observacao").value && `Obs.: ${$("#observacao").value}`,
    ].filter(Boolean).join("\n");
    $("#btn-zap-finalizar").href = linkPedidoWhatsApp(itens, extra);
  });

  /* ---------- conclusão ---------- */
  $("#form-checkout").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validarPasso(1)) return irPara(1);
    if (!validarPasso(2)) return irPara(2);

    const codigo = `MF-${Date.now().toString().slice(-6)}`;
    const pedido = {
      codigo,
      data: new Date().toLocaleString("pt-BR"),
      nome: $("#nome").value.trim(),
      whatsapp: $("#whatsapp").value.trim(),
      email: $("#email").value.trim(),
      entrega: $('input[name="entrega"]:checked').value,
      endereco: $("#endereco").value.trim(),
      cidade: $("#cidade").value.trim(),
      cep: $("#cep").value.trim(),
      pagamento: $('input[name="pagamento"]:checked').value,
      observacao: $("#observacao").value.trim(),
      itens: lerCarrinho(),
      total: totalCarrinho(itens),
    };

    const pedidos = JSON.parse(localStorage.getItem("mf_pedidos") || "[]");
    pedidos.push(pedido);
    localStorage.setItem("mf_pedidos", JSON.stringify(pedidos));
    localStorage.setItem("mf_ultimo_pedido", codigo);
    localStorage.setItem("mf_cliente_nome", pedido.nome);
    salvarCarrinho([]); // limpa a sacola

    window.location.href = `confirmacao.html?pedido=${encodeURIComponent(codigo)}`;
  });
});
