// src/services/api.js
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";


// ========================================================
// 🧾 PEDIDOS
// ========================================================

// 🔹 Listar todos os pedidos
export async function listarPedidos(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/pedidos${q ? `?${q}` : ""}`);
  if (!res.ok) throw new Error("Erro ao listar pedidos");
  return res.json();
}

// 🔹 Criar novo pedido
export async function criarPedido(pedido) {
  const res = await fetch(`${API_URL}/api/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedido),
  });
  if (!res.ok) throw new Error("Erro ao criar pedido");
  return res.json();
}

// 🔹 Atualizar pedido existente
export async function atualizarPedido(id, dados) {
  const res = await fetch(`${API_URL}/api/pedidos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) throw new Error("Erro ao atualizar pedido");
  return res.json();
}

// 🔹 Deletar pedido
export async function deletarPedido(id) {
  const res = await fetch(`${API_URL}/api/pedidos/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erro ao deletar pedido");
  return res.json();
}


// ========================================================
// 🎯 FUNÇÕES ADICIONAIS DE PEDIDOS
// ========================================================

export async function removerItemPedido(pedidoId, itemId) {
  const res = await fetch(`${API_URL}/api/pedidos/${pedidoId}/itens/${itemId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Erro ao remover item do pedido");
  return res.json();
}

export async function avaliarPedido(pedidoId, dados) {
  const res = await fetch(`${API_URL}/api/pedidos/${pedidoId}/avaliar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) throw new Error("Erro ao enviar avaliação do pedido");
  return res.json();
}



// ========================================================
// 🏪 CATÁLOGOS DE FORNECEDORES
// ========================================================

export async function criarCatalogo(dados) {
  const res = await fetch(`${API_URL}/api/catalogos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) throw new Error("Erro ao criar catálogo");
  return res.json();
}



// ========================================================
// 📦 ITENS DA COTAÇÃO
// ========================================================

export async function salvarItensCotacao(comprador, itens) {
  const res = await fetch(`${API_URL}/api/itens-cotacao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comprador, itens }),
  });
  if (!res.ok) throw new Error("Erro ao salvar itens da cotação");
  return res.json();
}

export async function listarItensCotacao() {
  const res = await fetch(`${API_URL}/api/itens-cotacao`);
  if (!res.ok) throw new Error("Erro ao buscar itens da cotação");
  return res.json();
}



// ========================================================
// 👤 USUÁRIOS
// ========================================================

export async function cadastrarUsuario(dados) {
  const res = await fetch(`${API_URL}/api/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erro ao cadastrar usuário");
  return data;
}

export async function loginUsuario(email, senha) {
  const res = await fetch(`${API_URL}/api/usuarios/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  if (!res.ok) throw new Error("Usuário ou senha inválidos");
  return res.json();
}

export async function atualizarUsuario(id, dados) {
  const res = await fetch(`${API_URL}/api/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return res.json();
}



// ========================================================
// 🏭 CATÁLOGOS DE FORNECEDORES (com preços)
// ========================================================

export async function listarCatalogosFornecedores() {
  const res = await fetch(`${API_URL}/api/catalogos-fornecedores`);
  if (!res.ok) throw new Error("Erro ao listar catálogos de fornecedores");
  return res.json();
}

export async function salvarCatalogoFornecedor(dados) {
  const res = await fetch(`${API_URL}/api/catalogos-fornecedores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) throw new Error("Erro ao salvar catálogo de fornecedor");
  return res.json();
}



// ========================================================
// 📊 ESTOQUE (TOTALMENTE CORRIGIDO)
// ========================================================

// 🔹 Listar estoque
export async function listarEstoque(empresaId) {
  const res = await fetch(`${API_URL}/api/estoque/${empresaId}`);
  if (!res.ok) throw new Error("Erro ao listar estoque");
  return res.json();
}

// 🔹 Registrar entrada no estoque
export async function registrarEntradaEstoque(empresaId, entrada) {
  const res = await fetch(`${API_URL}/api/estoque/entrada/${empresaId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  if (!res.ok) throw new Error("Erro ao registrar entrada no estoque");
  return res.json();
}

// 🔹 Salvar estoque COMPLETO (novo padrão do backend)
export async function salvarEstoqueCompleto(empresaId, itens) {
  const res = await fetch(`${API_URL}/api/estoque/${empresaId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itens }),
  });
  if (!res.ok) throw new Error("Erro ao salvar estoque completo");
  return res.json();
}

// 🔹 Salvar contagem real (painel do estoquista)
export async function salvarContagemReal(empresaId, itens) {
  const res = await fetch(`${API_URL}/api/estoque/contagem/${empresaId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itens }),
  });
  if (!res.ok) throw new Error("Erro ao salvar contagem real");
  return res.json();
}
export async function atualizarItemEstoque(idItem, dados) {
  const res = await fetch(`${API_URL}/api/estoque/item/${idItem}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) throw new Error("Erro ao atualizar item do estoque");
  return res.json();
}