// src/utils/safeLogout.js
const keyify = (nome) =>
  (nome || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

export function safeLogout() {
  // pega usuário atual (se existir)
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
  const empresaKey = usuario?.empresa ? keyify(usuario.empresa) : null;

  // 🔒 Lista BRANCA do que pode apagar no logout (apenas “compras/seleções”)
  const keysToRemove = [
    "usuarioLogado",                         // sessão
    "itens_cotacao_temp",                    // seleção do carrinho/cotação
    "resumo_cotacao_working_v1",             // snapshot de trabalho do resumo
    "cotacao_nova_rascunho_v1",              // rascunho da cotação do comprador
    empresaKey ? `meus_pedidos_${empresaKey}` : null, // pedidos do comprador local
  ].filter(Boolean);

  keysToRemove.forEach((k) => localStorage.removeItem(k));

  // ⚠️ Importante: NÃO MEXA nos catálogos/estoque!
  //  - NADA de remover `catalogo_comprador_${empresa}`
  //  - NADA de remover `precos_fornecedor_${empresa}`
  //  - NADA de remover `estoque_${empresa}`
  //  - NADA de localStorage.clear()

  // Redireciona para login (ou homepage pública)
  window.location.href = "/login";
}